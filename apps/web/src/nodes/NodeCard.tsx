import { useCallback } from 'react';
import type { FlowNode } from 'flow-types';
import { specFor } from 'flow-types';
import { useGraphStore } from '../store/graphStore';
import { useEngineStore } from '../store/engineStore';
import { Port } from './Port';
import { NodeParams } from './NodeParams';
import { formatValue } from '../ui/values';

export const NodeCard = ({ node }: { node: FlowNode }) => {
  const spec = specFor(node.kind);
  const select = useGraphStore((s) => s.select);
  const moveNode = useGraphStore((s) => s.moveNode);
  const nodeSelected = useGraphStore((s) => s.selection?.kind === 'node' && s.selection.id === node.id);
  const value = useEngineStore((s) => s.values[node.id]);

  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      select({ kind: 'node', id: node.id });
      const startX = e.clientX - node.x;
      const startY = e.clientY - node.y;
      const move = (ev: PointerEvent) => moveNode(node.id, ev.clientX - startX, ev.clientY - startY);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [node, select, moveNode],
  );

  return (
    <div
      className={`node-card ${nodeSelected ? 'node-selected' : ''}`}
      style={{ left: node.x, top: node.y, borderColor: spec?.color }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.port')) return;
        select({ kind: 'node', id: node.id });
      }}
    >
      <div className="node-header" onPointerDown={onHeaderPointerDown}>
        <span className="node-dot" style={{ background: spec?.color }} />
        <span className="node-kind">{spec?.label ?? node.kind}</span>
        <span className="node-id">{node.id}</span>
      </div>
      <div className="node-body">
        <NodeParams node={node} spec={spec} />
      </div>
      {value && <div className="node-value">{formatValue(value)}</div>}
      <div className="node-ports">
        <div className="ports-in">
          {spec?.inputs.map((p, i) => (
            <Port key={p.name} nodeId={node.id} side="in" port={p} index={i} />
          ))}
        </div>
        <div className="ports-out">
          {spec?.outputs.map((p, i) => (
            <Port key={p.name} nodeId={node.id} side="out" port={p} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};