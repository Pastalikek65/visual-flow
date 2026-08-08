import { REGISTRY } from 'flow-types';
import { useGraphStore } from '../store/graphStore';
import { useEngineStore } from '../store/engineStore';

export function NodePalette() {
  const nodeCount = useGraphStore((s) => Object.keys(s.nodes).length);
  const edgeCount = useGraphStore((s) => Object.keys(s.edges).length);
  const status = useEngineStore((s) => s.status);
  const runMs = useEngineStore((s) => s.runMs);

  return (
    <aside className="palette">
      <h2 className="palette-title">Nodes</h2>
      <div className="palette-list">
        {REGISTRY.map((spec) => (
          <div
            key={spec.id}
            className="palette-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('node-kind', spec.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => useGraphStore.getState().addNode(spec.id, 80 + Math.random() * 120, 80 + Math.random() * 120)}
          >
            <span className="palette-dot" style={{ background: spec.color }} />
            <span>{spec.label}</span>
          </div>
        ))}
      </div>
      <div className="palette-stats">
        <div>nodes {nodeCount}</div>
        <div>edges {edgeCount}</div>
        <div className={`status status-${status}`}>{status}</div>
        {runMs > 0 && <div className="run-ms">last run {runMs.toFixed(2)} ms</div>}
      </div>
    </aside>
  );
}