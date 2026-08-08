import { useState } from 'react';
import { toWire } from 'flow-types';
import { useGraphStore } from '../store/graphStore';
import { useEngineStore } from '../store/engineStore';
import { useUiStore, type Theme } from '../store/uiStore';
import { EXAMPLES } from '../examples';

const THEME_LABEL: Record<Theme, string> = { dark: '🌙', light: '☀️' };

export function Toolbar() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const status = useEngineStore((s) => s.status);
  const canUndo = useGraphStore((s) => s.past.length > 0);
  const canRedo = useGraphStore((s) => s.future.length > 0);
  const hasClipboard = useGraphStore((s) => s.clipboard !== null);
  const canCopy = useGraphStore((s) => s.selection?.kind === 'node');
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  const exportGraph = () => {
    const g = useGraphStore.getState();
    const blob = new Blob([JSON.stringify(toWire({ nodes: g.nodes, edges: g.edges }), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow-graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importGraph = (file: File) => {
    file
      .text()
      .then((text) => {
        const wire = JSON.parse(text);
        const nodes = Object.fromEntries(wire.nodes.map((n: { id: string }) => [n.id, n]));
        const edges = Object.fromEntries(wire.edges.map((e: { id: string }) => [e.id, e]));
        useGraphStore.getState().replaceGraph(nodes, edges);
      })
      .catch((err) => useEngineStore.getState().setError(String(err)));
  };

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">⚡</span>
        <span>visual-flow</span>
        <span className="brand-sub">Rust · Wasm · React</span>
      </div>
      <div className="toolbar-actions">
        <button onClick={() => useGraphStore.getState().undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button onClick={() => useGraphStore.getState().redo()} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          Redo
        </button>
        <button
          onClick={() => useGraphStore.getState().copySelection()}
          disabled={!canCopy}
          title="Copy node (Ctrl+C)"
        >
          Copy
        </button>
        <button
          onClick={() => useGraphStore.getState().paste()}
          disabled={!hasClipboard}
          title="Paste (Ctrl+V)"
        >
          Paste
        </button>
        <button onClick={() => useGraphStore.getState().clear()}>Clear</button>
        <button
          className="gallery-toggle"
          onClick={() => setGalleryOpen((o) => !o)}
          title="Load an example graph"
        >
          Examples
        </button>
        {galleryOpen && (
          <div className="gallery-popover">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                className="gallery-card"
                onClick={() => {
                  useGraphStore
                    .getState()
                    .replaceGraph(
                      Object.fromEntries(ex.nodes.map((nd) => [nd.id, nd])),
                      Object.fromEntries(ex.edges.map((ed) => [ed.id, ed])),
                    );
                  setGalleryOpen(false);
                }}
              >
                <span className="gallery-card-name">{ex.name}</span>
                <span className="gallery-card-desc">{ex.description}</span>
                <span className="gallery-card-meta">
                  {ex.nodes.length} nodes · {ex.edges.length} edges
                </span>
              </button>
            ))}
          </div>
        )}
        <button onClick={() => document.getElementById('file-import')?.click()}>Import</button>
        <button onClick={exportGraph}>Export</button>
        <input
          id="file-import"
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importGraph(f);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Theme: ${theme}`}
          className="theme-toggle"
        >
          {THEME_LABEL[theme]}
        </button>
        <span className={`status status-${status}`}>{status}</span>
      </div>
    </header>
  );
}