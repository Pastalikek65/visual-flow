import { describe, it, expect, vi } from 'vitest';
import { EngineBridge } from './bridge';
import type { EngineBus, WorkerRequest, WorkerResponse } from './types';
import type { FlowGraph, NodeValue } from 'flow-types';

class FakeBus implements EngineBus {
  onmessage: ((ev: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((ev: ErrorEvent) => void) | null = null;
  private handler: ((id: number, method: string, payload: unknown) => Promise<unknown>) | null = null;

  setHandler(h: (id: number, method: string, payload: unknown) => Promise<unknown>) {
    this.handler = h;
  }

  postMessage(msg: WorkerRequest) {
    void this.handler?.(msg.id, msg.method, msg.payload)
      .then((result) => this.onmessage?.({ data: { id: msg.id, ok: true, result } } as MessageEvent<WorkerResponse>))
      .catch((err: Error) =>
        this.onmessage?.({ data: { id: msg.id, ok: false, error: err.message } } as MessageEvent<WorkerResponse>),
      );
  }

  terminate() {}
}

const graph: FlowGraph = { nodes: {}, edges: {} };

describe('EngineBridge rpc', () => {
  it('resolves canConnect through the bus', async () => {
    const bus = new FakeBus();
    bus.setHandler(async (_id, method) => {
      if (method === 'init') return true;
      if (method === 'canConnect') return true;
      throw new Error(`unexpected ${method}`);
    });
    const bridge = new EngineBridge(bus);
    await bridge.open();
    await expect(bridge.canConnect('a', 'b')).resolves.toBe(true);
    bridge.dispose();
  });

  it('propagates worker failures as rejected promises', async () => {
    const bus = new FakeBus();
    bus.setHandler(async (id, method) => {
      if (method === 'init') return true;
      throw new Error('boom');
    });
    const bridge = new EngineBridge(bus);
    await bridge.open();
    await expect(bridge.patch({})).rejects.toThrow('boom');
    bridge.dispose();
  });

  it('round-trips patch + run payloads', async () => {
    const bus = new FakeBus();
    const calls: string[] = [];
    bus.setHandler(async (id, method) => {
      if (method === 'init') return true;
      calls.push(method);
      if (method === 'patchGraph') return ['n1', 'n2'];
      if (method === 'run') return { values: { n1: { type: 'number', value: 3 } }, runMs: 0.4 };
      throw new Error(`unexpected ${method}`);
    });
    const bridge = new EngineBridge(bus);
    await bridge.open();
    const dirty = await bridge.patch({ nodesAdded: [] });
    const result = await bridge.run();
    expect(dirty).toEqual(['n1', 'n2']);
    expect(result.runMs).toBe(0.4);
    expect(calls).toEqual(['patchGraph', 'run']);
    bridge.dispose();
  });

  it('handles simultaneous calls independently', async () => {
    const bus = new FakeBus();
    bus.setHandler(async (id, method) => {
      if (method === 'init') return true;
      if (method === 'query') {
        await new Promise((r) => setTimeout(r, 5));
        return { type: 'number', value: 42 };
      }
      throw new Error(`unexpected ${method}`);
    });
    const bridge = new EngineBridge(bus);
    await bridge.open();
    const [a, b] = await Promise.all([bridge.query('x'), bridge.query('y')]);
    expect((a as { value: number }).value).toBe(42);
    expect((b as { value: number }).value).toBe(42);
    bridge.dispose();
  });
});