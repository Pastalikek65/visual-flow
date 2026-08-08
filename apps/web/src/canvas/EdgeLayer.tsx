import { useMemo } from 'react';
import type { FlowEdge, FlowNode } from 'flow-types';
import type { NodeSpec } from 'flow-types';
import { NODE_W, PORT_STEP, PORT_Y0 } from './geometry';

function edgePath(
  e: FlowEdge,
  nodes: Record<string, FlowNode>,
  specs: Record<string, NodeSpec | undefined>,
): string | null {
  const from = nodes[e.from];
  const to = nodes[e.to];
  if (!from || !to) return null;
  const fromSpec = specs[e.from];
  const toSpec = specs[e.to];
  const fi = fromSpec ? fromSpec.outputs.findIndex((o) => o.name === e.fromPort) : -1;
  const ti = toSpec ? toSpec.inputs.findIndex((i) => i.name === e.toPort) : -1;
  const fx = from.x + NODE_W;
  const fy = from.y + PORT_Y0 + Math.max(0, fi) * PORT_STEP;
  const tx = to.x;
  const ty = to.y + PORT_Y0 + Math.max(0, ti) * PORT_STEP;
  const dx = Math.max(24, Math.abs(tx - fx) / 2);
  return `M ${fx} ${fy} C ${fx + dx} ${fy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}

export function EdgeLayer({
  nodes,
  edges,
  specs,
  selected,
  onSelectEdge,
}: {
  nodes: Record<string, FlowNode>;
  edges: Record<string, FlowEdge>;
  specs: Record<string, NodeSpec | undefined>;
  selected: string | null;
  onSelectEdge: (id: string) => void;
}) {
  const paths = useMemo(() => {
    const list: { e: FlowEdge; d: string }[] = [];
    for (const e of Object.values(edges)) {
      const d = edgePath(e, nodes, specs);
      if (d) list.push({ e, d });
    }
    return list;
  }, [edges, nodes, specs]);

  return (
    <svg className="edge-layer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {paths.map(({ e, d }) => {
        const sel = selected === e.id;
        return (
          <path
            key={e.id}
            d={d}
            fill="none"
            stroke={sel ? '#ef8354' : '#4a5568'}
            strokeWidth={sel ? 3 : 2}
            style={{ pointerEvents: 'visibleStroke' }}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              onSelectEdge(e.id);
            }}
          />
        );
      })}
    </svg>
  );
}