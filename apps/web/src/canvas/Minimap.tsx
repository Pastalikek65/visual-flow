import { useCallback, useMemo, useRef } from 'react';
import type { FlowEdge, FlowNode } from 'flow-types';
import type { NodeSpec } from 'flow-types';
import { NODE_W } from './geometry';

const MINI_W = 180;
const MINI_H = 132;
const PAD = 8;
const NODE_H = 46;

export function Minimap({
  nodes,
  edges,
  specs,
  view,
  canvasW,
  canvasH,
  onJump,
}: {
  nodes: Record<string, FlowNode>;
  edges: Record<string, FlowEdge>;
  specs: Record<string, NodeSpec | undefined>;
  view: { x: number; y: number; k: number };
  canvasW: number;
  canvasH: number;
  onJump: (worldX: number, worldY: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const world = useMemo(() => {
    const entries = Object.values(nodes);
    if (entries.length === 0) return null;
    const minX = Math.min(...entries.map((n) => n.x));
    const maxX = Math.max(...entries.map((n) => n.x + NODE_W));
    const minY = Math.min(...entries.map((n) => n.y));
    const maxY = Math.max(...entries.map((n) => n.y + NODE_H));
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [nodes]);

  const scale = world ? Math.min((MINI_W - 2 * PAD) / world.w, (MINI_H - 2 * PAD) / world.h) : 1;
  const offX = world ? PAD + ((MINI_W - 2 * PAD) - world.w * scale) / 2 : 0;
  const offY = world ? PAD + ((MINI_H - 2 * PAD) - world.h * scale) / 2 : 0;

  const tx = useCallback((x: number) => (world ? (x - world.minX) * scale + offX : 0), [world, scale, offX]);
  const ty = useCallback((y: number) => (world ? (y - world.minY) * scale + offY : 0), [world, scale, offY]);

  const jump = useCallback(
    (clientX: number, clientY: number) => {
      if (!world || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const px = clientX - r.left;
      const py = clientY - r.top;
      const wx = world.minX + (px - offX) / scale;
      const wy = world.minY + (py - offY) / scale;
      onJump(wx, wy);
    },
    [world, scale, offX, offY, onJump],
  );

  const viewport = useMemo(() => {
    if (!world) return null;
    const vx = -view.x / view.k;
    const vy = -view.y / view.k;
    const vw = canvasW / view.k;
    const vh = canvasH / view.k;
    return {
      x: Math.max(tx(vx), -4),
      y: Math.max(ty(vy), -4),
      w: vw * scale,
      h: vh * scale,
    };
  }, [world, view, canvasW, canvasH, tx, ty, scale]);

  return (
    <div
      className="minimap"
      ref={ref}
      onPointerDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        ref.current?.setPointerCapture(e.pointerId);
        jump(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (dragging.current) jump(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        ref.current?.releasePointerCapture(e.pointerId);
      }}
    >
      <svg width={MINI_W} height={MINI_H} className="minimap-svg">
        {Object.values(edges).map((e) => {
          const from = nodes[e.from];
          const to = nodes[e.to];
          if (!from || !to) return null;
          const fx = tx(from.x + NODE_W);
          const fy = ty(from.y + 8);
          const tx2 = tx(to.x);
          const ty2 = ty(to.y + 8);
          return <line key={e.id} x1={fx} y1={fy} x2={tx2} y2={ty2} className="minimap-edge" />;
        })}
        {Object.values(nodes).map((n) => (
          <g key={n.id}>
            <rect
              x={tx(n.x)}
              y={ty(n.y)}
              width={Math.max(2, NODE_W * scale)}
              height={Math.max(2, NODE_H * scale)}
              rx={1.5}
              fill={specs[n.id]?.color ?? '#64748b'}
              className="minimap-node"
              data-id={n.id}
            />
          </g>
        ))}
        {viewport && (
          <rect
            className="minimap-viewport"
            x={viewport.x}
            y={viewport.y}
            width={Math.max(viewport.w, 6)}
            height={Math.max(viewport.h, 6)}
          />
        )}
      </svg>
    </div>
  );
}