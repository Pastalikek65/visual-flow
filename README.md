# visual-flow

A node-based dataflow graph editor built with **React + TypeScript**, executing its compute engine as **Rust compiled to WebAssembly** inside a dedicated Web Worker.

> **Live demo:** <https://USERNAME.github.io/REPO/>  <!-- replace with your repository URL after first deploy -->

Create nodes by clicking or dragging them from the palette onto the canvas, connect output ports to input ports, and watch the Wasm engine recompute only the affected subgraph — the main thread never blocks.

---

## Demo

The live build (GitHub Pages) automatically publishes from the `main` branch via `.github/workflows/deploy.yml` (and can be triggered manually with "Run workflow").

1. Push to `main`.
2. In your repo settings → Pages → Source → **GitHub Actions**.
3. Demo URL: `https://<owner>.github.io/<repo>/`

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (apps/web · React + Vite)                               │
│                                                                  │
│  Canvas UI ──► zustand stores ──► debounced diff ──┐             │
│  (SVG edges,                                          │          │
│   DOM node cards)                                    v           │
│                                               WirePatchData      │
│  Inspector ◄── results ──┐                    (added/removed/    │
│  Palette   ◄── values    │                    changed)            │
└──────────────────────────┼───────────────────────────────────────┘
                           │ postMessage (transferables, no copies)
┌──────────────────────────▼───────────────────────────────────────┐
│  packages/flow-engine · EngineBridge (Promise RPC over worker)   │
└──────────────────────────┬───────────────────────────────────────┘
                           v
┌──────────────────────────▼───────────────────────────────────────┐
│  Web Worker (apps/web/src/worker.ts)                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ packages/flow-core · Rust → wasm32-unknown-unknown         │  │
│  │                                                            │  │
│  │  graph.rs      wire types, adjacency, cycle checks         │  │
│  │  topo.rs       Kahn topological sort                       │  │
│  │  compile.rs    graph → execution plan                      │  │
│  │  incremental.rs dirty-closure propagation                  │  │
│  │  eval.rs       plan executor (version-stamped memos)       │  │
│  │  nodes/        trait + registry: math, logic, io           │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

Key design decisions:

- **Worker isolation** — the Wasm module runs inside `Worker`; all RPC crosses `postMessage` with plain JSON payloads. The React main thread stays responsive at all times.
- **Incremental evaluation** — the engine keeps per-node version stamps and a dirty set. Edits mark only the downstream closure; `run()` recomputes just that slice in topological order and memoizes everything else.
- **Cycle proof by construction** — the UI rejects back-edges synchronously (`validation.ts`); the Rust engine also refuses cyclic patches and rolls them back; `topo.rs` fails loudly if one ever sneaks through.
- **Modular nodes** — adding a node takes one Rust `NodeImpl` (a few lines in `nodes/io.rs` style) plus one registry entry; the TS palette and inspector read everything from the same `REGISTRY` schema in `flow-types`.

## Repository layout

```
visual-flow/
├── packages/
│   ├── flow-types/     # shared TS: node schema, wire format, graph diffs
│   ├── flow-core/       # Rust Wasm engine (the real compute)
│   └── flow-engine/     # TS bridge: EngineBridge + RPC protocol types
├── apps/web/            # React/Vite canvas UI
├── scripts/             # wasm build, dev, checks
└── .github/workflows/   # ci.yml (tests), deploy.yml (Pages)
```

## Node registry

| family | kinds |
| --- | --- |
| io | `constant`, `slider`, `output` |
| math | `add`, `sub`, `mul`, `div`, `pow`, `sin`, `cos`, `min`, `max` |
| logic | `and`, `or`, `not`, `equal`, `greater`, `less`, `ge`, `ifelse` |

## Add a custom node

1. **Rust** — implement `NodeImpl` in `packages/flow-core/src/nodes/` (inputs, outputs, `compute`), then register it in `Registry::builtin()` in `nodes/mod.rs`.
2. **TS** — add a `NodeSpec` entry in `packages/flow-types/src/registry.ts` (id, label, color, ports, params).
3. Rebuild the Wasm module; the palette + inspector pick it up automatically.

```bash
npm run wasm:build      # rebuild wasm + bindings
```

## Development

Prerequisites: Node 20+, Rust stable + `wasm32-unknown-unknown`, `wasm-bindgen-cli` (installer script runs it).

```bash
npm install
npm run wasm:build      # or: wasm:build:dev for a faster dev binary
npm run dev             # vite dev at localhost:5173
```

Verification:

```bash
npm test                # cargo test + vitest
npm run typecheck       # strict TS across all packages
npm run check           # fmt + clippy + typecheck + vitest
```

## Performance notes

- GitHub Pages serves no `COOP`/`COEP` headers, so `SharedArrayBuffer` + threads are unavailable; the app deliberately substitutes a single Wasm worker + transferable messaging, which needs no special headers.
- Layout decoupled from compute: node position changes never hit the engine (the diff in `flow-types` ignores pure movement), so dragging large graphs does not trigger recompute storms.

## License

MIT — see [LICENSE](./LICENSE).