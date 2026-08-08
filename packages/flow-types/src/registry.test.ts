import { describe, it, expect } from 'vitest';
import { REGISTRY, specFor } from './registry';
import { portCompatible } from './node';

describe('registry', () => {
  it('contains the full builtin node set', () => {
    const ids = REGISTRY.map((s) => s.id);
    for (const expected of ['add', 'sub', 'mul', 'div', 'pow', 'sin', 'cos', 'tan', 'abs', 'sqrt', 'log', 'floor', 'ceil', 'round', 'mod', 'clamp', 'lerp', 'atan2', 'exp', 'gcd', 'min', 'max', 'and', 'or', 'not', 'equal', 'greater', 'less', 'ge', 'ifelse', 'constant', 'slider', 'output', 'text', 'concat', 'uppercase', 'lowercase', 'length', 'stringify', 'substring', 'trim', 'replace', 'includes', 'startswith', 'parsenum']) {
      expect(ids).toContain(expected);
    }
  });

  it('has unique ids', () => {
    const ids = REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('specFor resolves', () => {
    expect(specFor('add')?.label).toBe('Add');
    expect(specFor('nope')).toBeUndefined();
  });

  it('port compatibility rules', () => {
    expect(portCompatible('number', 'number')).toBe(true);
    expect(portCompatible('bool', 'bool')).toBe(true);
    expect(portCompatible('string', 'string')).toBe(true);
    expect(portCompatible('string', 'number')).toBe(false);
    expect(portCompatible('number', 'bool')).toBe(false);
    expect(portCompatible('any', 'number')).toBe(true);
    expect(portCompatible('number', 'any')).toBe(true);
  });

  it('text category specs have expected ports', () => {
    expect(specFor('concat')?.inputs.map((p) => p.kind)).toEqual(['string', 'string']);
    expect(specFor('length')?.outputs[0].kind).toBe('number');
    expect(specFor('text')?.params[0]).toMatchObject({ key: 'text', type: 'text' });
  });
});