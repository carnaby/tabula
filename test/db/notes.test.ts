import { describe, expect, it } from 'vitest';
import { createNote, deleteNote, getNote, listNotes, updateNote } from '../../src/domain/notes.js';
import { seedProject, useTestDb } from '../helpers.js';

const db = useTestDb();

describe('notes', () => {
  it('creates with defaults and validates', async () => {
    await seedProject(db, 'demo');
    const n = await createNote(db, { projectId: 'demo', title: 'Architecture', tags: ['Arch'] });
    expect(n).toMatchObject({ summary: '', body: '', pinned: false, tags: ['arch'] });
    await expect(createNote(db, { projectId: 'demo', title: 't', summary: 'x'.repeat(201) })).rejects.toMatchObject({ code: 'bad_request' });
    await expect(createNote(db, { projectId: 'nope', title: 't' })).rejects.toMatchObject({ code: 'not_found' });
  });

  it('updates, pins and lists pinned first', async () => {
    await seedProject(db, 'demo');
    const a = await createNote(db, { projectId: 'demo', title: 'A' });
    const b = await createNote(db, { projectId: 'demo', title: 'B' });
    await updateNote(db, a.id, { pinned: true, body: '# Protocol' });
    expect((await listNotes(db, { projectId: 'demo' })).map((n) => n.id)).toEqual([a.id, b.id]);
    expect((await getNote(db, a.id))?.body).toBe('# Protocol');
  });

  it('filters by fulltext and deletes', async () => {
    await seedProject(db, 'demo');
    const a = await createNote(db, { projectId: 'demo', title: 'Coding standards', body: 'naming rules' });
    await createNote(db, { projectId: 'demo', title: 'Other' });
    expect((await listNotes(db, { q: 'naming' })).map((n) => n.id)).toEqual([a.id]);
    await deleteNote(db, a.id);
    await expect(deleteNote(db, a.id)).rejects.toMatchObject({ code: 'not_found' });
  });
});
