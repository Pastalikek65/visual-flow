import type { FlowEdge, FlowNode, ParamValue } from 'flow-types';

export interface ExampleGraph {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function n(id: string, kind: string, x: number, y: number, params: Record<string, ParamValue> = {}): FlowNode {
  return { id, kind, x, y, params };
}

function e(id: string, from: string, fromPort: string, to: string, toPort: string): FlowEdge {
  return { id, from, fromPort, to, toPort };
}

export const EXAMPLES: ExampleGraph[] = [
{
    id: 'fahrenheit-celsius',
    name: '°F → °C Converter',
    description: 'Converts 77°F and shows 25°C at the output. Uses subtract, divide and multiply.',
    nodes: [
      n('c1', 'constant', 40, 40, { value: 77 }),
      n('c2', 'constant', 40, 160, { value: 32 }),
      n('c3', 'constant', 40, 280, { value: 5 }),
      n('c4', 'constant', 40, 400, { value: 9 }),
      n('s1', 'sub', 240, 100),
      n('d1', 'div', 240, 340),
      n('m1', 'mul', 440, 220),
      n('o1', 'output', 640, 220),
    ],
    edges: [
      e('x1', 'c1', 'value', 's1', 'a'),
      e('x2', 'c2', 'value', 's1', 'b'),
      e('x3', 's1', 'out', 'm1', 'a'),
      e('x4', 'c3', 'value', 'd1', 'a'),
      e('x5', 'c4', 'value', 'd1', 'b'),
      e('x6', 'd1', 'out', 'm1', 'b'),
      e('x7', 'm1', 'out', 'o1', 'in'),
    ],
  },
  {
    id: 'circle-area',
    name: 'Circle Area',
    description: 'Slider controls the radius; area = π · r².',
    nodes: [
      n('r1', 'slider', 40, 40, { value: 3, min: 0, max: 10, step: 0.5 }),
      n('p1', 'pow', 240, 40),
      n('c1', 'constant', 240, 200, { value: 3.14159 }),
      n('m1', 'mul', 440, 120),
      n('o1', 'output', 640, 120),
    ],
    edges: [
      e('x1', 'r1', 'value', 'p1', 'base'),
      e('x2', 'r1', 'value', 'p1', 'exp'),
      e('x3', 'c1', 'value', 'm1', 'b'),
      e('x4', 'p1', 'out', 'm1', 'a'),
      e('x5', 'm1', 'out', 'o1', 'in'),
    ],
  },
  {
    id: 'text-pipeline',
    name: 'Text Pipeline',
    description: 'Trim → replace → uppercase: "  hello world  " becomes "HELLO UNIVERSE".',
    nodes: [
      n('t1', 'text', 40, 40, { text: '  hello world  ' }),
      n('t2', 'text', 40, 180, { text: 'world' }),
      n('t3', 'text', 40, 320, { text: 'universe' }),
      n('tr1', 'trim', 260, 60),
      n('r1', 'replace', 460, 120),
      n('u1', 'uppercase', 660, 120),
      n('o1', 'output', 860, 120),
    ],
    edges: [
      e('x1', 't1', 'value', 'tr1', 'text'),
      e('x2', 'tr1', 'out', 'r1', 'text'),
      e('x3', 't2', 'value', 'r1', 'needle'),
      e('x4', 't3', 'value', 'r1', 'replacement'),
      e('x5', 'r1', 'out', 'u1', 'text'),
      e('x6', 'u1', 'out', 'o1', 'in'),
    ],
  },
{
    id: 'max-of-two',
    name: 'Max With If/Else',
    description: 'Compares 100 and 30 with "greater", and the if/else node forwards the larger one.',
    nodes: [
      n('c1', 'constant', 40, 40, { value: 100 }),
      n('c2', 'constant', 40, 180, { value: 30 }),
      n('g1', 'greater', 240, 100),
      n('i1', 'ifelse', 440, 120),
      n('o1', 'output', 660, 120),
    ],
    edges: [
      e('x1', 'c1', 'value', 'g1', 'a'),
      e('x2', 'c2', 'value', 'g1', 'b'),
      e('x3', 'g1', 'out', 'i1', 'cond'),
      e('x4', 'c1', 'value', 'i1', 'then'),
      e('x5', 'c2', 'value', 'i1', 'else'),
      e('x6', 'i1', 'out', 'o1', 'in'),
    ],
  },
];