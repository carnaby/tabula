import { describe, expect, it } from 'vitest';
import { memories, notes } from '../../src/db/schema.js';
import { createProject, listProjects, requireProject, updateProject } from '../../src/domain/projects.js';
import { seedProject, useTestDb } from '../helpers.js';

const db = useTestDb();

describe('projects', () => {
  it('lists global first with active-only memory counts', async () => {
    await seedProject(db, 'alpha');
    await db.insert(memories).values([
      { projectId: 'alpha', kind: 'rule', title: 'a', body: 'b', source: 'human' },
      { projectId: 'alpha', kind: 'rule', title: 'c', body: 'd', source: 'human', status: 'deprecated' },
    ]);
    await db.insert(notes).values({ projectId: 'alpha', title: 'n' });
    expect(await listProjects(db)).toEqual([
      { id: 'global', name: 'Global', description: 'Rules and notes that apply to every project.', memory_count: 0, note_count: 0 },
      { id: 'alpha', name: 'alpha', description: 'alpha project', memory_count: 1, note_count: 1 },
    ]);
  });

  it('requireProject lists known projects on miss', async () => {
    await seedProject(db, 'alpha');
    await expect(requireProject(db, 'nope')).rejects.toThrow(/project "nope" does not exist\. Known projects: global, alpha/);
  });

  it('creates and updates a project, rejecting duplicates', async () => {
    await createProject(db, { id: 'limen', name: 'Limen' });
    await expect(createProject(db, { id: 'limen', name: 'X' })).rejects.toMatchObject({ code: 'conflict' });
    const p = await updateProject(db, 'limen', { description: 'Gate' });
    expect(p.description).toBe('Gate');
  });
});
