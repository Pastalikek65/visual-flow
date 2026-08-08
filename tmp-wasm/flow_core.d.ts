/* tslint:disable */
/* eslint-disable */

export class FlowEngine {
    free(): void;
    [Symbol.dispose](): void;
    can_connect(from: string, to: string): boolean;
    dirty_len(): number;
    graph_json(): string;
    constructor();
    patch_graph(json: string): any[];
    query(node_id: string): string;
    run(): string;
    set_graph(json: string): void;
}
