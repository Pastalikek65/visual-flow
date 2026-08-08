import { describe, expect, it } from 'vitest';
import { specFor } from 'flow-types';
import { EXAMPLES } from './examples';

describe('example gallery', () => {
  it('every example has unique ids', () => {
    const ids = new Set<string>();
    for (const ex of EXAMPLES) {
      expect(ids.has(ex.id)).toBe(false);
      ids.add(ex.id);
    }
  });

  it('every node kind exists in the registry and node ids are unique', () => {
    for (const ex of EXAMPLES) {
      const nodeIds = new Set<string>();
      for (const node of ex.nodes) {
        expect(specFor(node.kind), `${ex.id}: unknown kind "${node.kind}"`).toBeDefined();
        expect(nodeIds.has(node.id)).toBe(false);
        nodeIds.add(node.id);
      }
    }
  });

  it('every edge references valid nodes and ports', () => {
    for (const ex of EXAMPLES) {
      const byId = Object.fromEntries(ex.nodes.map((nd) => [nd.id, nd]));
      for (const edge of ex.edges) {
        const from = byId[edge.from];
        const to = byId[edge.to];
        expect(from, `${ex.id}: ${edge.id} from-nokta ${edge.from}`).toBeDefined();
        expect(to, `${ex.id}: ${edge.id} to-node ${edge.to}`).toBeDefined();
        const fromOuts = specFor(from.kind)?.outputs.map((o) => o.name) ?? [];
        const toIns = specFor(to.kind)?.inputs.map((i) => i.name) ?? [];
        expect(fromOuts, `${ex.id}: ${edge.from} has no "${edge.fromPort}" out`).toContain(edge.fromPort);
        expect(toIns, `${ex.id}: ${edge.to} has no "${edge.toPort}" in`).toContain(edge.toPort);
      }
    }
  });

  it('edge ids are unique within each example', () => {
    for (const ex of EXAMPLES) {
      const ids = ex.edges.map((ed) => ed.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});