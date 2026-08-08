const { performance } = require('perf_hooks');
const { FlowEngine } = require('../tmp-wasm/flow_core.js');

const engine = new FlowEngine();
console.log('engine created:', !!engine);

const demo = {
  nodes: [
    { id: 'c1', kind: 'constant', params: { value: 10 }, x: 0, y: 0 },
    { id: 'c2', kind: 'constant', params: { value: 3 }, x: 0, y: 0 },
    { id: 's1', kind: 'slider', params: { min: 0, max: 10, value: 2 }, x: 0, y: 0 },
    { id: 'add', kind: 'add', params: {}, x: 0, y: 0 },
    { id: 'mul', kind: 'mul', params: {}, x: 0, y: 0 },
    { id: 'out', kind: 'output', params: {}, x: 0, y: 0 },
  ],
  edges: [
    { id: 'e1', from: 'c1', fromPort: 'out', to: 'add', toPort: 'a' },
    { id: 'e2', from: 'c2', fromPort: 'out', to: 'add', toPort: 'b' },
    { id: 'e3', from: 's1', fromPort: 'out', to: 'mul', toPort: 'a' },
    { id: 'e4', from: 'add', fromPort: 'out', to: 'mul', toPort: 'b' },
    { id: 'e5', from: 'mul', fromPort: 'out', to: 'out', toPort: 'in' },
  ],
};

engine.set_graph(JSON.stringify(demo));
const values1 = JSON.parse(engine.run());
console.log('run#1 add=', values1['add']?.value, '(beklenen 13) | mul=', values1['mul']?.value, '(26) | out=', values1['out']?.value, '(26)');
const ok1 = values1['add']?.value === 13 && values1['mul']?.value === 26 && values1['out']?.value === 26;
console.log(ok1 ? 'PASS: zincir hesaplama doğru' : 'FAIL');

const dirty = Array.from(engine.patch_graph(JSON.stringify({
  nodesChanged: [{ id: 's1', kind: 'slider', params: { min: 0, max: 10, value: 5 }, x: 0, y: 0 }],
})));
console.log('dirty after slider->5:', JSON.stringify(dirty));

const values2 = JSON.parse(engine.run());
console.log('run#2 mul=', values2['mul']?.value, '(beklenen 65) | out=', values2['out']?.value, '(65)');
console.log(values2['mul']?.value === 65 ? 'PASS: incremental güncelleme doğru' : 'FAIL');

console.log('can_connect(add->out):', engine.can_connect('add', 'out'));
console.log('can_connect(out->add):', engine.can_connect('out', 'add'));
console.log('query(s1):', engine.query('s1'));
const g = JSON.parse(engine.graph_json());
console.log('graph_json node sayısı:', g.nodes.length, '| edge sayısı:', g.edges.length);