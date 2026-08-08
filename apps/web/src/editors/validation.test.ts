import { describe, it, expect } from 'vitest';
import { cycleCheck } from './validation';
import type { FlowGraph, FlowEdge, FlowNode } from 'flow-types';

function node(id: string): FlowNode {
  return { id, kind: 'add', x: 0, y: 0, params: {} };
}

function edge(id: string, from: string, to: string): FlowEdge {
  return { id, from, fromPort: 'out', to, toPort: 'a' };
}

const graph = (edges: [string, string][]): FlowGraph => {
  const nodes: Record<string, FlowNode> = {};
  const eids = new Set<string>();
  for (const [f, t] of edges) {
    nodes[f] ??= node(f);
    nodes[t] ??= node(t);
    eids.add(`${f}->${t}`);
  }
  const e: Record<string, FlowEdge> = {};
  for (const [f, t] of edges) e[`${f}->${t}`] = edge(`${f}->${t}`, f, t);
  return { nodes, edges: e };
};

describe('cycleCheck', () => {
  it('allows a forward edge', () => {
    const g = graph([['a', 'b']]);
    expect(cycleCheck(g, 'a', 'b')).toBe(false);
  });

  it('rejects a direct back-edge', () => {
    const g = graph([['a', 'b']]);
    expect(cycleCheck(g, 'b', 'a')).toBe(true);
  });

  it('rejects an indirect back-edge', () => {
    const g = graph([
      ['a', 'b'],
      ['b', 'c'],
    ]);
    expect(cycleCheck(g, 'c', 'a')).toBe(true);
  });

  it('accepts diamonds', () => {
    const g = graph([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'd'],
      ['c', 'd'],
    ]);
    expect(cycleCheck(g, 'b', 'c')).toBe(false);
    expect(cycleCheck(g, 'c', 'b')).toBe(false);
  });

  it('rejects self-loops', () => {
    const g = graph([['a', 'b']]);
    expect(cycleCheck(g, 'a', 'a')).toBe(true);
  });

  it('rejects connecting a node into its own ancestry chain', () => {
    const g = graph([
      ['s', 'm'],
      ['m', 'x'],
    ]);
    expect(cycleCheck(g, 'x', 's')).toBe(true);
    expect(cycleCheck(g, 'm', 's')).toBe(true);
  });
});