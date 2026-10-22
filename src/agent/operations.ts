import type { Db } from '../db/client.js';
import { AGENT_READ_ONLY, forbidden } from '../domain/errors.js';
import { createMemory, deprecateMemory, type Memory } from '../domain/memories.js';
import type { Note } from '../domain/notes.js';
import { listProjects, type ProjectSummary } from '../domain/projects.js';
import { recall } from '../domain/recall.js';
import { resolveRecord } from '../domain/records.js';
import { search, type SearchHit, type SearchParams } from '../domain/search.js';
import type { MemoryKind } from '../domain/validation.js';

export type AgentContext = { db: Db; agentLabel: string };

const memoryView = (m: Memory) => ({
  type: 'memory' as const,
  id: m.id,
  project: m.projectId,
  kind: m.kind,
  title: m.title,
  body: m.body,
  tags: m.tags,
  status: m.status,
  source: m.source,
  agent_label: m.agentLabel,
  supersedes_id: m.supersedesId,
  deprecated_reason: m.deprecatedReason,
  created_at: m.createdAt.toISOString(),
  updated_at: m.updatedAt.toISOString(),
});

const noteView = (n: Note) => ({
  type: 'note' as const,
  id: n.id,
  project: n.projectId,
  title: n.title,
  summary: n.summary,
  body: n.body,
  tags: n.tags,
  pinned: n.pinned,
  created_at: n.createdAt.toISOString(),
  updated_at: n.updatedAt.toISOString(),
});

export type MemoryView = ReturnType<typeof memoryView>;
export type NoteView = ReturnType<typeof noteView>;

/** A record the agent may modify: only memories with source=agent. */
async function requireAgentWritable(db: Db, id: string): Promise<Memory> {
  const r = await resolveRecord(db, id);
  if (r.type === 'note' || r.record.source === 'human') throw forbidden(AGENT_READ_ONLY);
  return r.record;
}

export const agentListProjects = (ctx: AgentContext): Promise<ProjectSummary[]> => listProjects(ctx.db);

export async function agentRecall(ctx: AgentContext, project: string): Promise<string> {
  return (await recall(ctx.db, project)).text;
}

export const agentSearch = (ctx: AgentContext, p: SearchParams): Promise<SearchHit[]> => search(ctx.db, p);

export async function agentGet(ctx: AgentContext, id: string): Promise<MemoryView | NoteView> {
  const r = await resolveRecord(ctx.db, id);
  return r.type === 'memory' ? memoryView(r.record) : noteView(r.record);
}

export async function agentRemember(
  ctx: AgentContext,
  input: { project: string; kind: MemoryKind; title: string; body: string; tags?: string[]; supersedes_id?: string },
): Promise<{ id: string }> {
  const supersedesId = input.supersedes_id ? (await requireAgentWritable(ctx.db, input.supersedes_id)).id : null;
  const m = await createMemory(ctx.db, {
    projectId: input.project,
    kind: input.kind,
    title: input.title,
    body: input.body,
    tags: input.tags,
    supersedesId,
    source: 'agent',
    agentLabel: ctx.agentLabel,
  });
  return { id: m.id };
}

export async function agentDeprecate(ctx: AgentContext, input: { id: string; reason: string }): Promise<{ ok: true }> {
  const m = await requireAgentWritable(ctx.db, input.id);
  await deprecateMemory(ctx.db, m.id, input.reason);
  return { ok: true };
}
