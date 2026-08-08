import { toWire } from 'flow-types';
import { useGraphStore } from '../store/graphStore';
import { useEngineStore } from '../store/engineStore';

export function Toolbar() {
  const status = useEngineStore((s) => s.status);

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
        useGraphStore.setState({ nodes, edges, selection: null });
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
        <button onClick={() => useGraphStore.getState().clear()}>Clear</button>
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
        <span className={`status status-${status}`}>{status}</span>
      </div>
    </header>
  );
}