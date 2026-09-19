import { beforeEach, describe, expect, it } from 'vitest';
import { createMemory, deprecateMemory } from '../../src/domain/memories.js';
import { createNote } from '../../src/domain/notes.js';
import { search } from '../../src/domain/search.js';
import { seedProject, useTestDb } from '../helpers.js';

const db = useTestDb();
const mem = (projectId: string, title: string, body = 'Some context here.', kind: 'rule' | 'fact' = 'rule') =>
  createMemory(db, { projectId, kind, title, body, source: 'agent' });

describe('search', () => {
  beforeEach(async () => {
    await seedProject(db, 'alpha');
    await seedProject(db, 'beta');
  });

  it('searches all projects when project is omitted', async () => {
    await mem('alpha', 'Postgres runs on NAS');
    await mem('beta', 'Postgres backups nightly');
    const hits = await search(db, { query: 'postgres' });
    expect(hits.map((h) => h.project).sort()).toEqual(['alpha', 'beta']);
    expect(hits[0]).toMatchObject({ type: 'memory', kind: 'rule', status: 'active' });
    expect(typeof hits[0]!.updated_at).toBe('string');
  });

  it('with project searches that project plus global only', async () => {
    await mem('alpha', 'Postgres alpha');
    await mem('beta', 'Postgres beta');
    await mem('global', 'Postgres global');
    const hits = await search(db, { query: 'postgres', project: 'alpha' });
    expect(hits.map((h) => h.project).sort()).toEqual(['alpha', 'global']);
  });

  it('includes notes unless kind is given', async () => {
    await mem('alpha', 'Drizzle decision');
    await createNote(db, { projectId: 'alpha', title: 'Drizzle notes', body: 'long text' });
    expect((await search(db, { query: 'drizzle' })).map((h) => h.type).sort()).toEqual(['memory', 'note']);
    expect((await search(db, { query: 'drizzle', kind: 'rule' })).map((h) => h.type)).toEqual(['memory']);
  });

  it('hides deprecated unless asked', async () => {
    const m = await mem('alpha', 'Old vitest rule');
    await deprecateMemory(db, m.id, 'changed');
    expect(await search(db, { query: 'vitest' })).toEqual([]);
    expect((await search(db, { query: 'vitest', includeDeprecated: true }))[0]).toMatchObject({ status: 'deprecated' });
  });

  it('ranks title matches above body matches and highlights the snippet', async () => {
    await mem('alpha', 'Unrelated title', 'mentions migrations in body');
    await mem('alpha', 'Migrations run from CI', 'only from CI');
    const hits = await search(db, { query: 'migrations' });
    expect(hits[0]!.title).toBe('Migrations run from CI');
    expect(hits[1]!.snippet).toContain('**migrations**');
  });

  it('respects limit and validates input', async () => {
    for (let i = 0; i < 3; i++) await mem('alpha', `Cache rule ${i}`);
    expect(await search(db, { query: 'cache', limit: 2 })).toHaveLength(2);
    await expect(search(db, { query: '  ' })).rejects.toMatchObject({ code: 'bad_request' });
    await expect(search(db, { query: 'x', project: 'nope' })).rejects.toMatchObject({ code: 'not_found' });
  });
});
