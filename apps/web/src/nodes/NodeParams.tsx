import type { FlowNode } from 'flow-types';
import type { NodeSpec } from 'flow-types';
import { useGraphStore } from '../store/graphStore';

export function NodeParams({ node, spec }: { node: FlowNode; spec: NodeSpec | undefined }) {
  const setParam = useGraphStore((s) => s.setParam);

  if (!spec || spec.params.length === 0) {
    return <div className="node-empty-hint">no parameters</div>;
  }

  return (
    <div className="node-params">
      {spec.params.map((p) => {
        const value = node.params[p.key] ?? p.default;
        if (p.type === 'bool') {
          return (
            <label key={p.key} className="field field-bool">
              <span>{p.label}</span>
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => setParam(node.id, p.key, e.target.checked)}
              />
            </label>
          );
        }
        const num = typeof value === 'number' && isFinite(value) ? value : Number(p.default);
        return (
          <label key={p.key} className="field field-number">
            <span>{p.label}</span>
            <div>
              <input
                type="number"
                value={num}
                step={p.step ?? 1}
                min={p.min}
                max={p.max}
                onChange={(e) => setParam(node.id, p.key, Number(e.target.value))}
              />
              {p.min !== undefined && p.max !== undefined && (
                <input
                  type="range"
                  value={num}
                  min={p.min}
                  max={p.max}
                  step={p.step ?? 0.1}
                  onChange={(e) => setParam(node.id, p.key, Number(e.target.value))}
                />
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}