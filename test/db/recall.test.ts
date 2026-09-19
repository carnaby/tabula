import { describe, expect, it } from 'vitest';
import { createMemory, deprecateMemory } from '../../src/domain/memories.js';
import { createNote } from '../../src/domain/notes.js';
import { recall } from '../../src/domain/recall.js';
import { seedProject, useTestDb } from '../helpers.js';

const db = useTestDb();
const rule = (projectId: string, title: string) =>
  createMemory(db, { projectId, kind: 'rule', title, body: 'Because.', source: 'human' });

describe('recall', () => {
  it('includes the project and global, excludes other projects and deprecated records', async () => {
    await seedProject(db, 'alpha');
    await seedProject(db, 'beta');
    await rule('alpha', 'Alpha rule');
    await rule('global', 'Global rule');
    await rule('beta', 'Beta rule');
    const old = await rule('alpha', 'Deprecated rule');
    await deprecateMemory(db, old.id, 'obsolete');
    await createNote(db, { projectId: 'global', title: 'Protocol', body: 'Verify.', pinned: true });

    const d = await recall(db, 'alpha', new Date('2026-09-19T10:00:00Z'));
    expect(d.text).toContain('# Tabula · alpha (+ global) · 2026-09-19');
    expect(d.text).toContain('Alpha rule');
    expect(d.text).toContain('[g] Global rule');
    expect(d.text).toContain('## Pinned note: [g] Protocol');
    expect(d.text).not.toContain('Beta rule');
    expect(d.text).not.toContain('Deprecated rule');
  });

  it('fails for an unknown project', async () => {
    await expect(recall(db, 'nope')).rejects.toMatchObject({ code: 'not_found' });
  });
});
