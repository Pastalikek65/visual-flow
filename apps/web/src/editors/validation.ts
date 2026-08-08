import type { FlowGraph } from 'flow-types';

export function cycleCheck(g: FlowGraph, fromId: string, toId: string): boolean {
  if (fromId === toId) return true;
  const adj: Record<string, string[]> = {};
  for (const n of Object.keys(g.nodes)) adj[n] = [];
  for (const e of Object.values(g.edges)) adj[e.from].push(e.to);
  const seen = new Set<string>();
  const stack = [toId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === fromId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj[id] ?? []) stack.push(next);
  }
  return false;
}