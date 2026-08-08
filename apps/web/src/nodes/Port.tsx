import { memo } from 'react';
import type { PortDef } from 'flow-types';
import { useUiStore } from '../store/uiStore';

const KIND_COLOR: Record<string, string> = {
  number: '#34d399',
  bool: '#a78bfa',
  string: '#60a5fa',
  any: '#f8fafc',
};

export const Port = memo(function Port({
  nodeId,
  side,
  port,
  index,
}: {
  nodeId: string;
  side: 'in' | 'out';
  port: PortDef;
  index: number;
}) {
  const { drag, hover, setDrag, setHover } = useUiStore();
  const active = drag?.side === 'out' && side === 'in';
  const hovering = hover?.nodeId === nodeId && hover.port === port.name && drag?.nodeId !== nodeId;
  const color = KIND_COLOR[port.kind] ?? '#f8fafc';

  const startDrag = (e: React.PointerEvent) => {
    if (side !== 'out') return;
    e.stopPropagation();
    setDrag({ nodeId, port: port.name, side });
  };

  const hoverIn = () => {
    if (drag && drag.side === 'out' && side === 'in') {
      setHover({ nodeId, port: port.name, side });
    }
  };

  const hoverOut = () => {
    if (hover?.nodeId === nodeId && hover.port === port.name) setHover(null);
  };

  const cls = [
    'port',
    `port-${side}`,
    active ? 'port-active' : '',
    hovering ? 'port-hover' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      style={{ color }}
      onPointerDown={startDrag}
      onPointerEnter={hoverIn}
      onPointerLeave={hoverOut}
      title={`${side} · ${port.kind}`}
    >
      <span className="port-dot" style={{ background: color }} />
      <span className="port-name">{port.name}</span>
    </div>
  );
});