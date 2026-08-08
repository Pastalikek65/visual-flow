import { specFor } from 'flow-types';
import { useGraphStore } from '../store/graphStore';
import { useEngineStore } from '../store/engineStore';
import { NodeParams } from '../nodes/NodeParams';
import { formatValue } from './values';

export function InspectorPanel() {
  const selection = useGraphStore((s) => s.selection);
  const node = useGraphStore((s) => (s.selection?.kind === 'node' ? s.nodes[s.selection.id] : undefined));
  const edge = useGraphStore((s) => (s.selection?.kind === 'edge' ? s.edges[s.selection.id] : undefined));
  const removeEdge = useGraphStore((s) => s.removeEdge);
  const values = useEngineStore((s) => s.values);
  const error = useEngineStore((s) => s.error);
  const lastRunMs = useEngineStore((s) => s.runMs);
  const spec = node ? specFor(node.kind) : undefined;

  if (error) {
    return (
      <aside className="inspector">
        <div className="inspector-error">{error}</div>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      {!selection && (
        <div className="inspector-empty">
          <p>Select a node to inspect its parameters and live values.</p>
          <p className="dim">Run is automatic on every edit.</p>
        </div>
      )}

      {selection?.kind === 'edge' && edge && (
        <div className="inspector-body">
          <h3 className="inspector-title">Edge</h3>
          <div className="kv">
            <span>id</span>
            <code>{edge.id}</code>
          </div>
          <div className="kv">
            <span>from</span>
            <code>{edge.from}.{edge.fromPort}</code>
          </div>
          <div className="kv">
            <span>to</span>
            <code>{edge.to}.{edge.toPort}</code>
          </div>
          <button
            className="danger-btn"
            onClick={() => removeEdge(edge.id)}
            title="Remove this edge (undo with Ctrl+Z)"
          >
            Remove edge
          </button>
        </div>
      )}

      {node && spec && (
        <div className="inspector-body">
          <h3 className="inspector-title" style={{ color: spec.color }}>
            {spec.label}
          </h3>
          <div className="kv">
            <span>id</span>
            <code>{node.id}</code>
          </div>
          <div className="kv">
            <span>pos</span>
            <code>
              {Math.round(node.x)}, {Math.round(node.y)}
            </code>
          </div>

          <div className="inspector-section">Parameters</div>
          <NodeParams node={node} spec={spec} />

          <div className="inspector-section">Outputs</div>
          {spec.outputs.map((o) => {
            const v = values[node.id];
            return (
              <div key={o.name} className="kv">
                <span>{o.name}</span>
                <code className="value-chip">{v ? formatValue(v) : '—'}</code>
              </div>
            );
          })}

          <div className="inspector-section">Runtime</div>
          <div className="kv">
            <span>last run</span>
            <code>{lastRunMs > 0 ? `${lastRunMs.toFixed(2)} ms` : '—'}</code>
          </div>
        </div>
      )}
    </aside>
  );
}