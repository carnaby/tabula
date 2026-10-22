import { describe, expect, it } from 'vitest';
import { buildDigest, type DigestInput, type DigestMemory, type DigestNote, firstSentence } from '../../src/domain/digest.js';
import { estimateTokens } from '../../src/domain/tokens.js';

const id = (n: number) => `${n.toString(16).padStart(4, '0')}0000-0000-4000-8000-000000000000`;
const day = (d: number) => new Date(Date.UTC(2026, 8, d));
const mem = (n: number, projectId: string, kind: DigestMemory['kind'], title: string, body: string, d: number): DigestMemory =>
  ({ id: id(n), projectId, kind, title, body, updatedAt: day(d) });
const note = (n: number, projectId: string, title: string, summary: string, body: string, pinned: boolean): DigestNote =>
  ({ id: id(n), projectId, title, summary, body, pinned, updatedAt: day(1) });

const fixture: DigestInput = {
  project: 'acme',
  date: '2026-09-19',
  memories: [
    mem(1, 'global', 'rule', 'Never give an agent raw shell access.', 'Expose domain-scoped tools only.', 1),
    mem(2, 'acme', 'rule', 'Run tests via `pnpm test:unit`.', 'Vitest directly skips the DB setup. It also ignores env files.', 10),
    mem(3, 'acme', 'rule', 'Migrations run from CI only.', 'Local runs drifted the schema twice.', 12),
    mem(4, 'acme', 'gotcha', 'Serverless cold start kills long migrations.', 'Anything over ~60 s gets killed.', 5),
    mem(5, 'acme', 'decision', 'Drizzle over Prisma', 'Typed schema, SQL migrations in repo.', 3),
    mem(6, 'acme', 'fact', 'Production DB lives on a managed host', 'Not in the app container.', 3),
  ],
  notes: [
    note(7, 'acme', 'Architecture overview', 'Module boundaries and event contracts', 'one two three', false),
    note(8, 'global', 'Session protocol', '', 'Verify before you claim.', true),
  ],
};

const FULL = [
  '# Tabula · acme (+ global) · 2026-09-19',
  '',
  '## Rules (always follow)',
  '- [g] Never give an agent raw shell access. (#0001)',
  '  Expose domain-scoped tools only.',
  '- Migrations run from CI only. (#0003)',
  '  Local runs drifted the schema twice.',
  '- Run tests via `pnpm test:unit`. (#0002)',
  '  Vitest directly skips the DB setup. It also ignores env files.',
  '',
  '## Gotchas',
  '- Serverless cold start kills long migrations. (#0004)',
  '  Anything over ~60 s gets killed.',
  '',
  '## Decisions (title only — `get` for the why)',
  '- Drizzle over Prisma (#0005)',
  '',
  '## Facts',
  '- Production DB lives on a managed host (#0006)',
  '',
  '## Notes (human-authored, read-only — `get` for full text)',
  '- #0007 Architecture overview — Module boundaries and event contracts (3 words)',
  '',
  '## Pinned note: [g] Session protocol (#0008)',
  'Verify before you claim.',
  '',
].join('\n');

describe('buildDigest', () => {
  it('renders the fixed section order, global first, newest first', () => {
    const d = buildDigest(fixture);
    expect(d.text).toBe(FULL);
    expect(d.tokens).toBe(estimateTokens(FULL));
    expect(d.trimmed).toEqual([]);
    expect(d.overBudget).toBe(false);
  });

  it('omits empty sections and explains an empty digest', () => {
    const d = buildDigest({ project: 'demo', date: '2026-09-19', memories: [], notes: [] });
    expect(d.text).toBe(
      '# Tabula · demo (+ global) · 2026-09-19\n\nNo active memories or notes yet. Call `remember` when you make a decision a future session must know.\n',
    );
  });

  it('uses a plain header and no [g] prefix for the global project itself', () => {
    const d = buildDigest({ project: 'global', date: '2026-09-19', memories: [fixture.memories[0]!], notes: [] });
    expect(d.text).toContain('# Tabula · global · 2026-09-19');
    expect(d.text).toContain('- Never give an agent raw shell access. (#0001)');
    expect(d.text).not.toContain('[g]');
  });

  it('extends short ids when two records share a 4-char prefix', () => {
    const a = { ...fixture.memories[5]!, id: 'abcd1000-0000-4000-8000-000000000000' };
    const b = { ...fixture.memories[5]!, id: 'abcd2000-0000-4000-8000-000000000000', title: 'Other fact' };
    const d = buildDigest({ project: 'acme', date: '2026-09-19', memories: [a, b], notes: [] });
    expect(d.text).toContain('(#abcd1)');
    expect(d.text).toContain('(#abcd2)');
  });

  it('first trims by omitting decisions', () => {
    const full = buildDigest(fixture);
    const d = buildDigest({ ...fixture, budget: full.tokens - 1 });
    expect(d.trimmed).toEqual(['decisions-omitted']);
    expect(d.text).toContain('## Decisions\n- 1 decisions omitted — use search');
    expect(d.text).toContain('It also ignores env files.');
    expect(d.overBudget).toBe(false);
  });

  it('applies every step in order and never trims pinned notes', () => {
    const pinnedBody = 'Verify before you claim. '.repeat(10).trim();
    const input = { ...fixture, budget: 1, notes: [fixture.notes[0]!, { ...fixture.notes[1]!, body: pinnedBody }] };
    const d = buildDigest(input);
    expect(d.trimmed).toEqual([
      'decisions-omitted', 'rules-first-sentence', 'gotchas-first-sentence', 'facts-omitted', 'notes-omitted',
    ]);
    expect(d.text).toContain('  Vitest directly skips the DB setup.\n');
    expect(d.text).not.toContain('It also ignores env files.');
    expect(d.text).toContain('- 1 facts omitted — use search');
    expect(d.text).toContain('- 1 notes omitted — use search');
    expect(d.text).toContain(pinnedBody);
    expect(d.overBudget).toBe(true);
    expect(d.text.split('\n\n')[1]).toMatch(/^\(Over budget: ~\d+ tokens of 1 after all trimming\./);
  });

  it('blames rules/gotchas, not pinned notes, when over budget with no notes at all', () => {
    const longSentence = 'x '.repeat(3000).trim();
    const input: DigestInput = {
      project: 'acme',
      date: '2026-09-19',
      memories: [
        mem(1, 'acme', 'rule', 'Rule one', longSentence, 1),
        mem(2, 'acme', 'rule', 'Rule two', longSentence, 2),
        mem(3, 'acme', 'gotcha', 'Gotcha one', longSentence, 3),
      ],
      notes: [],
    };
    const d = buildDigest(input);
    expect(d.overBudget).toBe(true);
    expect(d.text.split('\n\n')[1]).toMatch(/^\(Over budget: ~\d+ tokens of 1500 after all trimming\./);
    expect(d.text).not.toContain('Pinned note');
  });
});

describe('firstSentence', () => {
  it('cuts at the first sentence end', () => expect(firstSentence('One. Two.')).toBe('One.'));
  it('keeps text without terminator', () => expect(firstSentence('no end here')).toBe('no end here'));
  it('flattens whitespace', () => expect(firstSentence('A\n  b! c')).toBe('A b!'));
});
