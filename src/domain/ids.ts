import { badRequest } from './errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PREFIX = /^[0-9a-f][0-9a-f-]{3,35}$/;

export type IdRef = { kind: 'full'; id: string } | { kind: 'prefix'; prefix: string };

export function parseIdRef(raw: string): IdRef {
  const v = raw.trim().replace(/^#/, '').toLowerCase();
  if (UUID.test(v)) return { kind: 'full', id: v };
  if (PREFIX.test(v) && v.replace(/-/g, '').length >= 4) return { kind: 'prefix', prefix: v };
  throw badRequest(`id "${raw}" must be a uuid or its first 4+ hex characters (e.g. #a1f3)`);
}

/** Najkratšia spoločná dĺžka prefixu (>= min), pri ktorej sú všetky id jedinečné. */
export function shortIds(ids: readonly string[], min = 4): Map<string, string> {
  const unique = [...new Set(ids)];
  for (let len = min; len <= 36; len++) {
    const prefixes = new Set(unique.map((id) => id.slice(0, len)));
    if (prefixes.size === unique.length) return new Map(unique.map((id) => [id, id.slice(0, len)]));
  }
  return new Map(unique.map((id) => [id, id]));
}
