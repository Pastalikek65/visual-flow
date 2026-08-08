import { create } from 'zustand';
import type { FlowEdge, FlowNode, ParamValue } from 'flow-types';
import { uid } from 'flow-types';

export interface Selection {
  kind: 'node' | 'edge';
  id: string;
}

export interface GraphSnapshot {
  nodes: Record<string, FlowNode>;
  edges: Record<string, FlowEdge>;
}

export interface ClipboardData {
  nodes: Record<string, FlowNode>;
  edges: Record<string, FlowEdge>;
}

const MAX_HISTORY = 50;

interface GraphState {
  nodes: Record<string, FlowNode>;
  edges: Record<string, FlowEdge>;
  selection: Selection | null;
  past: GraphSnapshot[];
  future: GraphSnapshot[];
  clipboard: ClipboardData | null;
  addNode(kind: string, x: number, y: number): string;
  moveNode(id: string, x: number, y: number): void;
  setParam(id: string, key: string, value: ParamValue): void;
  connect(fromId: string, fromPort: string, toId: string, toPort: string): boolean;
  removeNode(id: string): void;
  removeEdge(id: string): void;
  select(sel: Selection | null): void;
  clear(): void;
  replaceGraph(nodes: Record<string, FlowNode>, edges: Record<string, FlowEdge>): void;
  undo(): void;
  redo(): void;
  copySelection(): void;
  paste(): void;
}

let lastMove: { id: string; ts: number } | null = null;

function demoState(): { nodes: Record<string, FlowNode>; edges: Record<string, FlowEdge> } {
  const node = (id: string, kind: string, x: number, y: number, params: Record<string, ParamValue> = {}): FlowNode => ({
    id,
    kind,
    x,
    y,
    params,
  });
  const edge = (id: string, from: string, fromPort: string, to: string, toPort: string): FlowEdge => ({
    id,
    from,
    fromPort,
    to,
    toPort,
  });
  return {
    nodes: {
      c1: node('c1', 'constant', 60, 140, { value: 10 }),
      c2: node('c2', 'constant', 60, 240, { value: 3 }),
      s1: node('s1', 'slider', 60, 360, { value: 2, min: 0, max: 10, step: 0.5 }),
      add1: node('add1', 'add', 360, 160),
      mul1: node('mul1', 'mul', 640, 240),
      out1: node('out1', 'output', 900, 200),
    },
    edges: {
      e1: edge('e1', 'c1', 'value', 'add1', 'a'),
      e2: edge('e2', 'c2', 'value', 'add1', 'b'),
      e3: edge('e3', 'add1', 'out', 'mul1', 'a'),
      e4: edge('e4', 's1', 'value', 'mul1', 'b'),
      e5: edge('e5', 'mul1', 'out', 'out1', 'in'),
    },
  };
}

const initial = loadGraphFromStorage();

export const useGraphStore = create<GraphState>()((set, get) => ({
  nodes: initial?.nodes ?? demoGraph().nodes,
  edges: initial?.edges ?? demoGraph().edges,
  selection: null,
  past: [],
  future: [],
  clipboard: null,

  addNode(kind, x, y) {
    const id = uid('n');
    pushHistory(set, get);
    set((s) => ({
      nodes: { ...s.nodes, [id]: { id, kind, x, y, params: {} } },
      selection: { kind: 'node', id },
    }));
    return id;
  },

  moveNode(id, x, y) {
    const now = Date.now();
    const coalesce = lastMove && lastMove.id === id && now - lastMove.ts < 200;
    lastMove = { id, ts: now };
    if (!coalesce) pushHistory(set, get);
    set((s) => {
      const node = s.nodes[id];
      if (!node) return s;
      return { nodes: { ...s.nodes, [id]: { ...node, x, y } } };
    });
  },

  setParam(id, key, value) {
    pushHistory(set, get);
    set((s) => {
      const node = s.nodes[id];
      if (!node) return s;
      return { nodes: { ...s.nodes, [id]: { ...node, params: { ...node.params, [key]: value } } } };
    });
  },

  connect(fromId, fromPort, toId, toPort) {
    const existing = Object.values(get().edges).find(
      (e) => e.from === fromId && e.to === toId && e.toPort === toPort,
    );
    if (existing) return false;
    const id = uid('e');
    pushHistory(set, get);
    set((s) => ({
      edges: { ...s.edges, [id]: { id, from: fromId, fromPort, to: toId, toPort } },
    }));
    return true;
  },

  removeNode(id) {
    pushHistory(set, get);
    set((s) => {
      const nodes = { ...s.nodes };
      delete nodes[id];
      const edges: Record<string, FlowEdge> = {};
      for (const [eid, e] of Object.entries(s.edges)) {
        if (e.from !== id && e.to !== id) edges[eid] = e;
      }
      return {
        nodes,
        edges,
        selection: s.selection?.id === id ? null : s.selection,
      };
    });
  },

  removeEdge(id) {
    pushHistory(set, get);
    set((s) => {
      const edges = { ...s.edges };
      delete edges[id];
      return {
        edges,
        selection: s.selection?.kind === 'edge' && s.selection.id === id ? null : s.selection,
      };
    });
  },

  select(sel) {
    set({ selection: sel });
  },

  clear() {
    pushHistory(set, get);
    set({ nodes: {}, edges: {}, selection: null });
  },

  replaceGraph(nodes, edges) {
    pushHistory(set, get);
    set({ nodes, edges, selection: null });
  },

  undo() {
    const s = get();
    const entry = s.past[s.past.length - 1];
    if (!entry) return;
    set({
      nodes: entry.nodes,
      edges: entry.edges,
      selection: null,
      past: s.past.slice(0, -1),
      future: [...s.future, { nodes: s.nodes, edges: s.edges }],
    });
  },

  redo() {
    const s = get();
    const entry = s.future[s.future.length - 1];
    if (!entry) return;
    set({
      nodes: entry.nodes,
      edges: entry.edges,
      selection: null,
      future: s.future.slice(0, -1),
      past: [...s.past, { nodes: s.nodes, edges: s.edges }],
    });
  },

  copySelection() {
    const s = get();
    if (s.selection?.kind !== 'node') return;
    const nodeId = s.selection.id;
    const node = s.nodes[nodeId];
    if (!node) return;
    const nodes: Record<string, FlowNode> = { [nodeId]: node };
    const edges: Record<string, FlowEdge> = {};
    for (const [eid, e] of Object.entries(s.edges)) {
      if (e.from === nodeId || e.to === nodeId) edges[eid] = e;
    }
    set({ clipboard: { nodes, edges } });
  },

  paste() {
    const clipboard = get().clipboard;
    if (!clipboard || !clipboard.nodes) return;
    const s = get();
    const idMap = new Map<string, string>();
    const nodes: Record<string, FlowNode> = {};
    for (const node of Object.values(clipboard.nodes)) {
      const newId = uid('n');
      idMap.set(node.id, newId);
      nodes[newId] = { ...node, id: newId, x: node.x + 30, y: node.y + 30 };
    }
    const edges: Record<string, FlowEdge> = {};
    for (const edge of Object.values(clipboard.edges)) {
      const from = idMap.get(edge.from) ?? edge.from;
      const to = idMap.get(edge.to) ?? edge.to;
      const newId = uid('e');
      edges[newId] = { ...edge, id: newId, from, to };
    }
    pushHistory(set, get);
    set((state) => ({
      nodes: { ...state.nodes, ...nodes },
      edges: { ...state.edges, ...edges },
      selection: { kind: 'node', id: Object.keys(nodes)[0] },
    }));
  },
}));

function pushHistory(
  set: (fn: (s: GraphState) => Partial<GraphState>) => void,
  get: () => GraphState,
) {
  const s = get();
  const entry = { nodes: s.nodes, edges: s.edges };
  const past = [...s.past, entry];
  if (past.length > MAX_HISTORY) past.shift();
  set(() => ({ past, future: [] }));
}

function demoGraph(): ReturnType<typeof demoState> {
  return demoState();
}

const STORAGE_KEY = 'visual-flow:graph:v1';

export function saveGraphToStorage() {
  try {
    const s = useGraphStore.getState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: s.nodes, edges: s.edges }));
  } catch {
    // storage unavailable (private mode, quota)
  }
}

export function loadGraphFromStorage(): { nodes: Record<string, FlowNode>; edges: Record<string, FlowEdge> } | null {
  try {
    const raw = localStorage.getItem('visual-flow:graph:v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.nodes || !parsed.edges) return null;
    return { nodes: parsed.nodes, edges: parsed.edges };
  } catch {
    return null;
  }
}