import { describe, expect, it } from 'vitest';
import { parseIdRef, shortIds } from '../../src/domain/ids.js';

const A = 'a1f3c2d4-0000-4000-8000-000000000001';
const B = 'a1f3ffff-0000-4000-8000-000000000002';
const C = 'b7c01234-0000-4000-8000-000000000003';

describe('parseIdRef', () => {
  it('parses a full uuid', () => expect(parseIdRef(A.toUpperCase())).toEqual({ kind: 'full', id: A }));
  it('parses a #prefix', () => expect(parseIdRef('#a1f3')).toEqual({ kind: 'prefix', prefix: 'a1f3' }));
  it('parses a bare prefix with dashes', () => expect(parseIdRef('a1f3c2d4-00')).toEqual({ kind: 'prefix', prefix: 'a1f3c2d4-00' }));
  it('rejects too short or non-hex', () => {
    expect(() => parseIdRef('a1f')).toThrow(/first 4\+ hex characters/);
    expect(() => parseIdRef('zzzz')).toThrow(/first 4\+ hex characters/);
  });
});

describe('shortIds', () => {
  it('uses 4 chars when unique', () => {
    expect(shortIds([A, C])).toEqual(new Map([[A, 'a1f3'], [C, 'b7c0']]));
  });
  it('extends length until all are unique', () => {
    const m = shortIds([A, B, C]);
    expect(m.get(A)).toBe('a1f3c');
    expect(m.get(B)).toBe('a1f3f');
    expect(m.get(C)).toBe('b7c01');
  });
});
