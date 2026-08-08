export type PortKind = 'number' | 'bool' | 'any';

export interface PortDef {
  name: string;
  kind: PortKind;
}

export type ParamType = 'number' | 'bool';

export interface ParamDef {
  key: string;
  label: string;
  type: ParamType;
  default: number | boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface NodeSpec {
  id: string;
  label: string;
  category: 'math' | 'logic' | 'io';
  color: string;
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
}

export function portCompatible(a: PortKind, b: PortKind): boolean {
  if (a === 'any' || b === 'any') return true;
  return a === b;
}