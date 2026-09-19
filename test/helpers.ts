import { sql } from 'drizzle-orm';
import { afterAll, beforeEach, inject } from 'vitest';
import { createDb, type Db } from '../src/db/client.js';
import { projects } from '../src/db/schema.js';

export function useTestDb(): Db {
  const { db, close } = createDb(inject('databaseUrl'));
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE memories, notes`);
    await db.execute(sql`DELETE FROM projects WHERE id <> 'global'`);
  });
  afterAll(close);
  return db;
}

export async function seedProject(db: Db, id: string): Promise<void> {
  await db.insert(projects).values({ id, name: id, description: `${id} project` });
}
