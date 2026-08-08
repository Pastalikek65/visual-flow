import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from './graphStore';
import { cycleCheck } from '../editors/validation';

describe('graphStore', () => {
  beforeEach(() => {
    useGraphStore.setState({ nodes: {}, edges: {}, selection: null });
  });

  it('adds and selects nodes', () => {
    const id = useGraphStore.getState().addNode('add', 10, 20);
    const s = useGraphStore.getState();
    expect(s.nodes[id].kind).toBe('add');
    expect(s.selection).toEqual({ kind: 'node', id });
  });

  it('moves nodes', () => {
    const id = useGraphStore.getState().addNode('add', 0, 0);
    useGraphStore.getState().moveNode(id, 55, 66);
    expect(useGraphStore.getState().nodes[id].x).toBe(55);
  });

  it('connects and blocks duplicates on same target port', () => {
    const a = useGraphStore.getState().addNode('constant', 0, 0);
    const b = useGraphStore.getState().addNode('add', 100, 0);
    const ok = useGraphStore.getState().connect(a, 'value', b, 'a');
    const dup = useGraphStore.getState().connect(a, 'value', b, 'a');
    expect(ok).toBe(true);
    expect(dup).toBe(false);
    expect(Object.keys(useGraphStore.getState().edges)).toHaveLength(1);
  });

  it('removes node and its edges', () => {
    const a = useGraphStore.getState().addNode('constant', 0, 0);
    const b = useGraphStore.getState().addNode('add', 100, 0);
    useGraphStore.getState().connect(a, 'value', b, 'a');
    useGraphStore.getState().removeNode(a);
    const s = useGraphStore.getState();
    expect(s.nodes[a]).toBeUndefined();
    expect(Object.keys(s.edges)).toHaveLength(0);
  });

  it('guards cycles at the store via validation', () => {
    const a = useGraphStore.getState().addNode('add', 0, 0);
    const b = useGraphStore.getState().addNode('add', 100, 0);
    useGraphStore.getState().connect(a, 'out', b, 'a');
    const g = useGraphStore.getState();
    expect(cycleCheck({ nodes: g.nodes, edges: g.edges }, b, a)).toBe(true);
  });

  it('clear empties everything', () => {
    const a = useGraphStore.getState().addNode('add', 0, 0);
    useGraphStore.getState().moveNode(a, 5, 5);
    useGraphStore.getState().clear();
    const s = useGraphStore.getState();
    expect(Object.keys(s.nodes)).toHaveLength(0);
    expect(Object.keys(s.edges)).toHaveLength(0);
  });
});