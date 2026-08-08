import { useCallback, useEffect, useRef, useState } from 'react';
import { specFor, portCompatible, type NodeSpec } from 'flow-types';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { cycleCheck } from '../editors/validation';
import { EdgeLayer } from './EdgeLayer';
import { NodeCard } from '../nodes/NodeCard';
import { portWorldPos } from './geometry';

export function EditorCanvas() {
  const viewRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 40, y: 40, k: 1 });

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const selection = useGraphStore((s) => s.selection);
  const select = useGraphStore((s) => s.select);
  const addNode = useGraphStore((s) => s.addNode);
  const connect = useGraphStore((s) => s.connect);

  const drag = useUiStore((s) => s.drag);
  const hover = useUiStore((s) => s.hover);
  const cursor = useUiStore((s) => s.cursor);
  const setCursor = useUiStore((s) => s.setCursor);
  const setDrag = useUiStore((s) => s.setDrag);
  const setHover = useUiStore((s) => s.setHover);

  const screenToWorld = useCallback(
    (cx: number, cy: number) => ({ x: (cx - view.x) / view.k, y: (cy - view.y) / view.k }),
    [view],
  );

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => setCursor(screenToWorld(e.clientX, e.clientY));
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [drag, screenToWorld, setCursor]);

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (drag) return;
    select(null);
    const start = { x: e.clientX, y: e.clientY };
    const startView = { ...view };
    const move = (ev: PointerEvent) =>
      setView({ ...startView, x: startView.x + (ev.clientX - start.x), y: startView.y + (ev.clientY - start.y) });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onWheel = (e: React.WheelEvent) => {
    const k = Math.min(2.5, Math.max(0.2, view.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    const w = screenToWorld(e.clientX, e.clientY);
    setView({ k, x: e.clientX - w.x * k, y: e.clientY - w.y * k });
  };

  const commitConnection = useCallback(() => {
    if (!drag) return;
    setDrag(null);
    setHover(null);
    if (!hover) return;
    if (drag.nodeId === hover.nodeId) return;
    const fromPort = specFor(drag.nodeId)?.outputs.find((o) => o.name === drag.port);
    const toPort = specFor(hover.nodeId)?.inputs.find((i) => i.name === hover.port);
    if (!fromPort || !toPort) return;
    if (!portCompatible(fromPort.kind, toPort.kind)) return;
    const g = useUiStore.getState();
    const graph = useGraphStore.getState();
    if (cycleCheck({ nodes: graph.nodes, edges: graph.edges }, drag.nodeId, hover.nodeId)) return;
    connect(drag.nodeId, drag.port, hover.nodeId, hover.port);
  }, [drag, hover, connect, setDrag, setHover]);

  useEffect(() => {
    const up = () => commitConnection();
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [commitConnection]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('node-kind');
    if (!kind) return;
    const rect = viewRef.current!.getBoundingClientRect();
    const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    addNode(kind, w.x - 90, w.y - 40);
  };

  const specs: Record<string, NodeSpec | undefined> = {};
  for (const n of Object.values(nodes)) specs[n.id] = specFor(n.kind);

  const ghostStart = drag ? portWorldPos(nodes[drag.nodeId]!, 'out', 0) : null;
  const ghostD =
    ghostStart && cursor
      ? edgePath(ghostStart.x, ghostStart.y, cursor.x, cursor.y)
      : null;

  return (
    <div
      className="editor-canvas"
      ref={viewRef}
      onPointerDown={onCanvasPointerDown}
      onWheel={onWheel}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div
        className="world"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: 'top left' }}
      >
        <EdgeLayer
          nodes={nodes}
          edges={edges}
          specs={specs}
          selected={selection?.kind === 'edge' ? selection.id : null}
          onSelectEdge={(id) => select({ kind: 'edge', id })}
        />
        {ghostD && (
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <path d={ghostD} fill="none" stroke="#ef8354" strokeWidth={2} strokeDasharray="6 4" opacity={0.9} />
          </svg>
        )}
        {Object.values(nodes).map((n) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </div>
    </div>
  );
}

function edgePath(fx: number, fy: number, tx: number, ty: number): string {
  const dx = Math.max(24, Math.abs(tx - fx) / 2);
  return `M ${fx} ${fy} C ${fx + dx} ${fy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}