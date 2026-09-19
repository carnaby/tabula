import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { memories, projects } from '../../src/db/schema.js';
import { seedProject, useTestDb } from '../helpers.js';

const db = useTestDb();

describe('schema', () => {
  it('has the global project seeded', async () => {
    const rows = await db.select().from(projects);
    expect(rows.map((r) => r.id)).toEqual(['global']);
  });

  it('refuses to delete the global project', async () => {
    // drizzle-orm wraps driver errors in DrizzleQueryError; the Postgres message lives on `.cause`.
    await expect(db.execute(sql`DELETE FROM projects WHERE id = 'global'`)).rejects.toMatchObject({
      cause: { message: expect.stringMatching(/cannot be deleted/) },
    });
  });

  it('builds a weighted simple-config search vector', async () => {
    await seedProject(db, 'demo');
    await db.insert(memories).values({
      projectId: 'demo', kind: 'decision', title: 'Drizzle over Prisma',
      body: 'Migrácie sú v repe.', tags: ['orm'], source: 'human',
    });
    const [row] = await db.execute<{ search: string }>(sql`SELECT search::text AS search FROM memories`);
    expect(row!.search).toContain("'drizzle':1A");
    expect(row!.search).toMatch(/'orm':\d+B/);
    expect(row!.search).toContain("'migrácie'"); // simple config: bez stemmingu, diakritika ostáva
  });

  it('enforces the title length limit', async () => {
    await seedProject(db, 'demo');
    await expect(
      db.insert(memories).values({ projectId: 'demo', kind: 'fact', title: 'x'.repeat(121), body: 'b', source: 'human' }),
    ).rejects.toMatchObject({ cause: { message: expect.stringMatching(/memories_title_len/) } });
  });
});
