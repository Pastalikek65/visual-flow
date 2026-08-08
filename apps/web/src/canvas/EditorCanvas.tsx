import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { specFor, portCompatible, type NodeSpec } from 'flow-types';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { cycleCheck } from '../editors/validation';
import { EdgeLayer } from './EdgeLayer';
import { NodeCard } from '../nodes/NodeCard';
import { portWorldPos } from './geometry';
import { Minimap } from './Minimap';

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
    (cx: number, cy: number, v: { x: number; y: number; k: number } = view) => ({
      x: (cx - v.x) / v.k,
      y: (cy - v.y) / v.k,
    }),
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

  const zoomBy = (factor: number) => {
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.2, v.k * factor));
      const w = screenToWorld(window.innerWidth / 2, window.innerHeight / 2, v);
      return { k, x: window.innerWidth / 2 - w.x * k, y: window.innerHeight / 2 - w.y * k };
    });
  };

  const fitAll = () => {
    const g = useGraphStore.getState();
    const entries = Object.values(g.nodes);
    if (entries.length === 0) {
      setView({ x: 40, y: 40, k: 1 });
      return;
    }
    const minX = Math.min(...entries.map((n) => n.x));
    const maxX = Math.max(...entries.map((n) => n.x + 220));
    const minY = Math.min(...entries.map((n) => n.y));
    const maxY = Math.max(...entries.map((n) => n.y + 140));
    const w = viewRef.current?.clientWidth ?? 800;
    const h = viewRef.current?.clientHeight ?? 600;
    const k = Math.min(1.5, Math.max(0.3, Math.min(w / Math.max(1, maxX - minX), h / Math.max(1, maxY - minY))));
    setView({ x: (w - (maxX - minX) * k) / 2 - minX * k, y: (h - (maxY - minY) * k) / 2 - minY * k, k });
  };

  const jumpTo = useCallback((wx: number, wy: number) => {
    setView((v) => ({
      ...v,
      x: (viewRef.current?.clientWidth ?? 800) / 2 - wx * v.k,
      y: (viewRef.current?.clientHeight ?? 600) / 2 - wy * v.k,
    }));
  }, []);

  const commitConnection = useCallback(() => {
    if (!drag) return;
    setDrag(null);
    setHover(null);
    if (!hover) return;
    if (drag.nodeId === hover.nodeId) return;
    const dragNode = useGraphStore.getState().nodes[drag.nodeId];
    const hoverNode = useGraphStore.getState().nodes[hover.nodeId];
    const fromPort = specFor(dragNode?.kind)?.outputs.find((o) => o.name === drag.port);
    const toPort = specFor(hoverNode?.kind)?.inputs.find((i) => i.name === hover.port);
    if (!fromPort || !toPort) return;
    if (!portCompatible(fromPort.kind, toPort.kind)) return;
    const graph = useGraphStore.getState();
    if (cycleCheck({ nodes: graph.nodes, edges: graph.edges }, drag.nodeId, hover.nodeId)) return;
    connect(dragNode.id, drag.port, hoverNode.id, hover.port);
  }, [drag, hover, connect, setDrag, setHover]);

  const ghostColor = useMemo(() => {
    if (!drag || !cursor) return null;
    if (hover) {
      const dragNode = nodes[drag.nodeId];
      const hoverNode = nodes[hover.nodeId];
      const fromPort = specFor(dragNode?.kind)?.outputs.find((o) => o.name === drag.port);
      const toPort = specFor(hoverNode?.kind)?.inputs.find((i) => i.name === hover.port);
      if (!dragNode || !hoverNode || !fromPort || !toPort) return '#ef8354';
      if (drag.nodeId === hover.nodeId) return '#ef4444';
      if (!portCompatible(fromPort.kind, toPort.kind)) return '#ef4444';
      if (cycleCheck({ nodes, edges }, dragNode.id, hoverNode.id)) return '#ef4444';
    }
    return '#ef8354';
  }, [drag, hover, cursor, nodes, edges]);

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
        {ghostD && ghostColor && (
          <svg className="ghost-line" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <path d={ghostD} fill="none" stroke={ghostColor} strokeWidth={2} strokeDasharray="6 4" opacity={0.9} />
          </svg>
        )}
        {Object.values(nodes).map((n) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </div>
      <div className="canvas-hud">
        <button onClick={() => zoomBy(1 / 1.2)} title="Zoom out" aria-label="zoom-out">
          −
        </button>
        <button className="hud-zoom-pct" onClick={() => setView({ x: 40, y: 40, k: 1 })} title="Reset zoom (100%)">
          {Math.round(view.k * 100)}%
        </button>
        <button onClick={() => zoomBy(1.2)} title="Zoom in" aria-label="zoom-in">
          +
        </button>
        <button onClick={fitAll} title="Fit all nodes" aria-label="fit">
          ⤢
        </button>
      </div>
      <Minimap
        nodes={nodes}
        edges={edges}
        specs={specs}
        view={view}
        canvasW={viewRef.current?.clientWidth ?? 800}
        canvasH={viewRef.current?.clientHeight ?? 600}
        onJump={jumpTo}
      />
    </div>
  );
}

function edgePath(fx: number, fy: number, tx: number, ty: number): string {
  const dx = Math.max(24, Math.abs(tx - fx) / 2);
  return `M ${fx} ${fy} C ${fx + dx} ${fy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}