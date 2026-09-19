import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { memories, notes } from '../db/schema.js';
import { buildDigest, type Digest } from './digest.js';
import { requireProject } from './projects.js';

export async function recall(db: Db, projectId: string, now: Date = new Date()): Promise<Digest> {
  await requireProject(db, projectId);
  const scope = [...new Set([projectId, 'global'])];
  const [mems, nts] = await Promise.all([
    db
      .select({
        id: memories.id, projectId: memories.projectId, kind: memories.kind,
        title: memories.title, body: memories.body, updatedAt: memories.updatedAt,
      })
      .from(memories)
      .where(and(inArray(memories.projectId, scope), eq(memories.status, 'active'))),
    db
      .select({
        id: notes.id, projectId: notes.projectId, title: notes.title, summary: notes.summary,
        body: notes.body, pinned: notes.pinned, updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(inArray(notes.projectId, scope)),
  ]);
  return buildDigest({ project: projectId, date: now.toISOString().slice(0, 10), memories: mems, notes: nts });
}
