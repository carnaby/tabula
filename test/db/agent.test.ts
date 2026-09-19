import { beforeEach, describe, expect, it } from 'vitest';
import { agentDeprecate, agentGet, agentRemember, type AgentContext } from '../../src/agent/operations.js';
import { memories } from '../../src/db/schema.js';
import { AGENT_READ_ONLY } from '../../src/domain/errors.js';
import { createMemory, getMemory, listMemories } from '../../src/domain/memories.js';
import { createNote } from '../../src/domain/notes.js';
import { seedProject, useTestDb } from '../helpers.js';

const db = useTestDb();
const ctx: AgentContext = { db, agentLabel: 'claude-code' };
const input = { project: 'demo', kind: 'rule' as const, title: 'Run tests via pnpm', body: 'Setup lives there.' };
const human = () => createMemory(db, { projectId: 'demo', kind: 'rule', title: 'Human rule', body: 'By hand.', source: 'human' });

describe('agent operations', () => {
  beforeEach(() => seedProject(db, 'demo'));

  it('remember writes source=agent with the agent label', async () => {
    const { id } = await agentRemember(ctx, input);
    expect(await getMemory(db, id)).toMatchObject({ source: 'agent', agentLabel: 'claude-code', status: 'active' });
  });

  it('remember on an unknown project lists known projects', async () => {
    await expect(agentRemember(ctx, { ...input, project: 'nope' })).rejects.toThrow(/Known projects: global, demo/);
  });

  it('remember accepts a short supersedes id', async () => {
    const { id: oldId } = await agentRemember(ctx, input);
    const { id: newId } = await agentRemember(ctx, { ...input, supersedes_id: `#${oldId.slice(0, 8)}` });
    expect(await getMemory(db, oldId)).toMatchObject({ status: 'deprecated', deprecatedReason: `superseded by ${newId}` });
  });

  it('remember cannot supersede human records or notes', async () => {
    const h = await human();
    await expect(agentRemember(ctx, { ...input, supersedes_id: h.id })).rejects.toMatchObject({
      code: 'forbidden', message: AGENT_READ_ONLY,
    });
    const n = await createNote(db, { projectId: 'demo', title: 'Note' });
    await expect(agentRemember(ctx, { ...input, supersedes_id: n.id })).rejects.toMatchObject({ code: 'forbidden' });
    expect(await listMemories(db, { status: 'all' })).toHaveLength(1);
  });

  it('deprecate enforces read-only human records and notes, and is idempotent', async () => {
    const h = await human();
    await expect(agentDeprecate(ctx, { id: h.id, reason: 'x' })).rejects.toMatchObject({ code: 'forbidden', status: 403 });
    const n = await createNote(db, { projectId: 'demo', title: 'Note' });
    await expect(agentDeprecate(ctx, { id: n.id, reason: 'x' })).rejects.toMatchObject({ code: 'forbidden' });
    const { id } = await agentRemember(ctx, input);
    expect(await agentDeprecate(ctx, { id, reason: 'changed' })).toEqual({ ok: true });
    expect(await agentDeprecate(ctx, { id, reason: 'again' })).toEqual({ ok: true });
  });

  it('get returns full memory and note views by prefix', async () => {
    const { id } = await agentRemember(ctx, { ...input, tags: ['ci'] });
    expect(await agentGet(ctx, `#${id.slice(0, 6)}`)).toMatchObject({
      type: 'memory', id, project: 'demo', body: 'Setup lives there.', tags: ['ci'], agent_label: 'claude-code',
    });
    const n = await createNote(db, { projectId: 'demo', title: 'Arch', body: 'Long body' });
    expect(await agentGet(ctx, n.id)).toMatchObject({ type: 'note', body: 'Long body', pinned: false });
  });

  it('get reports ambiguous prefixes and misses', async () => {
    const row = { projectId: 'demo', kind: 'fact' as const, body: 'b', source: 'agent' as const };
    await db.insert(memories).values([
      { ...row, id: 'abcd1000-0000-4000-8000-000000000000', title: 'First' },
      { ...row, id: 'abcd2000-0000-4000-8000-000000000000', title: 'Second' },
    ]);
    await expect(agentGet(ctx, '#abcd')).rejects.toThrow(/ambiguous.*First.*Second|ambiguous.*Second.*First/s);
    await expect(agentGet(ctx, '#ffff')).rejects.toMatchObject({ code: 'not_found' });
  });
});
