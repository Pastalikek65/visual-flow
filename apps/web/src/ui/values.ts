import type { NodeValue } from 'flow-types';

export function formatValue(v: NodeValue | undefined): string {
  if (!v) return '∅';
  switch (v.type) {
    case 'number':
      return String(v.value ?? 0);
    case 'bool':
      return String(v.value);
    default:
      return '∅';
  }
}

export function isFiniteNumber(v: NodeValue | undefined): v is { type: 'number'; value: number } {
  return !!v && v.type === 'number' && typeof v.value === 'number' && Number.isFinite(v.value);
}