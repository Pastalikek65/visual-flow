import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from './graphStore';
import { cycleCheck } from '../editors/validation';

describe('graphStore', () => {
  beforeEach(() => {
    useGraphStore.setState({ nodes: {}, edges: {}, selection: null, past: [], future: [], clipboard: null });
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

  it('undo/redo restores graph snapshots', () => {
    const s = useGraphStore.getState();
    const id = s.addNode('add', 10, 20);
    s.setParam(id, 'foo', 1);
    useGraphStore.getState().undo();
    const afterUndo = useGraphStore.getState();
    expect(afterUndo.nodes[id].params).toEqual({});
    expect(afterUndo.future).toHaveLength(1);
    useGraphStore.getState().redo();
    const afterRedo = useGraphStore.getState();
    expect(afterRedo.nodes[id].params).toEqual({ foo: 1 });
  });

  it('copy/paste duplicates node and rewires edges', () => {
    const s = useGraphStore.getState();
    const a = s.addNode('constant', 100, 100);
    const bId = s.addNode('add', 300, 100);
    s.connect(a, 'value', bId, 'a');
    const g = useGraphStore.getState();
    const edgeCount = Object.keys(g.edges).length;
    g.select({ kind: 'node', id: a });
    useGraphStore.getState().copySelection();
    useGraphStore.getState().paste();
    const after = useGraphStore.getState();
    expect(Object.keys(after.nodes)).toHaveLength(3);
    expect(Object.keys(after.edges)).toHaveLength(edgeCount + 1);
    const pasted = Object.values(after.nodes).find((n) => n.id !== a && n.kind === 'constant')!;
    expect(pasted).toBeDefined();
    const newEdge = Object.values(after.edges).find((e) => e.from === pasted.id)!;
    expect(newEdge).toBeDefined();
    expect(newEdge.to).toBe(bId);
  });

  it('redo is cleared after a new mutation', () => {
    const s = useGraphStore.getState();
    const id = s.addNode('add', 10, 0);
    s.removeNode(id);
    s.undo();
    expect(useGraphStore.getState().future).toHaveLength(1);
    useGraphStore.getState().addNode('mul', 99, 99);
    expect(useGraphStore.getState().future).toHaveLength(0);
  });

  it('limits history size', () => {
    let s = useGraphStore.getState();
    for (let i = 0; i < 60; i++) s = useGraphStore.getState();
    for (let i = 0; i < 60; i++) useGraphStore.getState().addNode('add', i, 0);
    expect(useGraphStore.getState().past.length).toBeLessThanOrEqual(50);
  });
});