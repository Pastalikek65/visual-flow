import type { NodeSpec } from './node';

const math = '#34d399';
const logic = '#a78bfa';
const io = '#fbbf24';
const text = '#60a5fa';

const N = (name: string): NodeSpec['inputs'][number] => ({ name, kind: 'number' });
const B = (name: string): NodeSpec['inputs'][number] => ({ name, kind: 'bool' });
const S = (name: string): NodeSpec['inputs'][number] => ({ name, kind: 'string' });
const A = (name: string): NodeSpec['inputs'][number] => ({ name, kind: 'any' });

export const REGISTRY: NodeSpec[] = [
  { id: 'constant', label: 'Constant', category: 'io', color: io, inputs: [], outputs: [N('value')], params: [{ key: 'value', label: 'Value', type: 'number', default: 0 }] },
  { id: 'slider', label: 'Slider', category: 'io', color: io, inputs: [], outputs: [N('value')], params: [
    { key: 'value', label: 'Value', type: 'number', default: 0, min: 0, max: 10, step: 0.1 },
    { key: 'min', label: 'Min', type: 'number', default: 0 },
    { key: 'max', label: 'Max', type: 'number', default: 10 },
    { key: 'step', label: 'Step', type: 'number', default: 0.1 },
  ] },
  { id: 'output', label: 'Output', category: 'io', color: io, inputs: [A('in')], outputs: [A('out')], params: [] },
  { id: 'add', label: 'Add', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'sub', label: 'Subtract', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'mul', label: 'Multiply', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'div', label: 'Divide', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'pow', label: 'Power', category: 'math', color: math, inputs: [N('base'), N('exp')], outputs: [N('out')], params: [] },
  { id: 'sin', label: 'Sine', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'cos', label: 'Cosine', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'tan', label: 'Tangent', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'abs', label: 'Abs', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'sqrt', label: 'Square Root', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'log', label: 'Log', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'floor', label: 'Floor', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'ceil', label: 'Ceil', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'round', label: 'Round', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'mod', label: 'Modulo', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'clamp', label: 'Clamp', category: 'math', color: math, inputs: [N('a'), N('b'), N('c')], outputs: [N('out')], params: [] },
  { id: 'lerp', label: 'Lerp', category: 'math', color: math, inputs: [N('a'), N('b'), N('c')], outputs: [N('out')], params: [] },
  { id: 'atan2', label: 'Atan2', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'exp', label: 'Exp', category: 'math', color: math, inputs: [N('x')], outputs: [N('out')], params: [] },
  { id: 'gcd', label: 'GCD', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'min', label: 'Min', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'max', label: 'Max', category: 'math', color: math, inputs: [N('a'), N('b')], outputs: [N('out')], params: [] },
  { id: 'and', label: 'AND', category: 'logic', color: logic, inputs: [B('a'), B('b')], outputs: [B('out')], params: [] },
  { id: 'or', label: 'OR', category: 'logic', color: logic, inputs: [B('a'), B('b')], outputs: [B('out')], params: [] },
  { id: 'not', label: 'NOT', category: 'logic', color: logic, inputs: [B('x')], outputs: [B('out')], params: [] },
  { id: 'equal', label: 'Equal', category: 'logic', color: logic, inputs: [N('a'), N('b')], outputs: [B('out')], params: [] },
  { id: 'greater', label: 'Greater Than', category: 'logic', color: logic, inputs: [N('a'), N('b')], outputs: [B('out')], params: [] },
  { id: 'less', label: 'Less Than', category: 'logic', color: logic, inputs: [N('a'), N('b')], outputs: [B('out')], params: [] },
  { id: 'ge', label: 'Greater/Equal', category: 'logic', color: logic, inputs: [N('a'), N('b')], outputs: [B('out')], params: [] },
  {
    id: 'ifelse', label: 'If / Else', category: 'logic', color: logic,
    inputs: [B('cond'), N('then'), N('else')],
    outputs: [N('out')],
    params: [],
  },
  { id: 'text', label: 'Text', category: 'text', color: text, inputs: [], outputs: [S('value')], params: [{ key: 'text', label: 'Text', type: 'text', default: '' }] },
  { id: 'concat', label: 'Concat', category: 'text', color: text, inputs: [S('a'), S('b')], outputs: [S('out')], params: [] },
  { id: 'uppercase', label: 'Uppercase', category: 'text', color: text, inputs: [S('text')], outputs: [S('out')], params: [] },
  { id: 'lowercase', label: 'Lowercase', category: 'text', color: text, inputs: [S('text')], outputs: [S('out')], params: [] },
  { id: 'length', label: 'Length', category: 'text', color: text, inputs: [S('text')], outputs: [N('out')], params: [] },
  { id: 'stringify', label: 'To String', category: 'text', color: text, inputs: [A('in')], outputs: [S('out')], params: [] },
  {
    id: 'substring', label: 'Substring', category: 'text', color: text,
    inputs: [S('text'), N('start'), N('len')],
    outputs: [S('out')],
    params: [],
  },
  { id: 'trim', label: 'Trim', category: 'text', color: text, inputs: [S('text')], outputs: [S('out')], params: [] },
  {
    id: 'replace', label: 'Replace', category: 'text', color: text,
    inputs: [S('text'), S('needle'), S('replacement')],
    outputs: [S('out')],
    params: [],
  },
  { id: 'includes', label: 'Includes', category: 'text', color: text, inputs: [S('text'), S('needle')], outputs: [B('out')], params: [] },
  { id: 'startswith', label: 'Starts With', category: 'text', color: text, inputs: [S('text'), S('prefix')], outputs: [B('out')], params: [] },
  { id: 'parsenum', label: 'Parse Number', category: 'text', color: text, inputs: [S('text')], outputs: [N('out')], params: [] },
];

export function specFor(kind: string): NodeSpec | undefined {
  return REGISTRY.find((s) => s.id === kind);
}