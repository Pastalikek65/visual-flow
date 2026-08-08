import type { NodeValue, WireGraphData, WirePatchData } from 'flow-types';
import type { EngineBus, EngineMethod, EngineResult, EngineStats, WorkerRequest, WorkerResponse } from './types';

const RPC_TIMEOUT_MS = 30_000;

export class EngineBridge {
  private bus: EngineBus;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private ready: Promise<void>;
  private _status: EngineStats = { nodes: 0, edges: 0, dirty: 0 };

  constructor(bus: EngineBus) {
    this.bus = bus;
    this.bus.onmessage = (ev) => {
      const d = ev.data as { id: number; ok?: boolean } | undefined;
      if (d && d.id === -1 && d.ok) {
        this.bus.postMessage({ id: 0, method: 'init' });
        return;
      }
      this.handle(ev.data);
    };
    this.bus.onerror = (ev) => console.error('[engine] worker error', ev);
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('worker init timeout')), 10_000);
      this.pending.set(0, {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
    });
  }

  private handle(res: WorkerResponse) {
    const entry = this.pending.get(res.id);
    if (!entry) return;
    const timer = this.timers.get(res.id);
    if (timer) clearTimeout(timer);
    this.timers.delete(res.id);
    this.pending.delete(res.id);
    if (res.ok) entry.resolve(res.result);
    else entry.reject(new Error(res.error ?? 'engine rpc failed'));
  }

  private invoke(method: EngineMethod, payload?: unknown): Promise<unknown> {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.timers.set(
        id,
        setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`rpc timeout: ${method}`));
        }, RPC_TIMEOUT_MS),
      );
      this.bus.postMessage({ id, method, payload });
    });
  }

  async open(): Promise<void> {
    await this.ready;
  }

  async setGraph(graph: WireGraphData): Promise<EngineStats> {
    return (await this.invoke('setGraph', graph)) as EngineStats;
  }

  async patch(patch: WirePatchData): Promise<string[]> {
    return (await this.invoke('patchGraph', patch)) as string[];
  }

  async run(): Promise<EngineResult> {
    return (await this.invoke('run')) as EngineResult;
  }

  async query(nodeId: string): Promise<NodeValue> {
    return (await this.invoke('query', nodeId)) as NodeValue;
  }

  async canConnect(from: string, to: string): Promise<boolean> {
    return (await this.invoke('canConnect', { from, to })) as boolean;
  }

  async graphJson(): Promise<string> {
    return (await this.invoke('graphJson')) as string;
  }

  dispose() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.pending.clear();
    this.bus.terminate();
  }
}