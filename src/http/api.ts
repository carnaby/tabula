import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { badRequest, notFound } from '../domain/errors.js';
import {
  createMemory, deleteMemory, deprecateMemory, listMemories, supersedesChain, updateMemory,
} from '../domain/memories.js';
import { createNote, deleteNote, getNote, listNotes, type Note, updateNote } from '../domain/notes.js';
import { createProject, listProjects, updateProject } from '../domain/projects.js';
import { recall } from '../domain/recall.js';
import { DIGEST_BUDGET, estimateTokens, wordCount } from '../domain/tokens.js';
import { MEMORY_KINDS } from '../domain/validation.js';
import { requireBearer } from './auth.js';

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data ?? {});
  if (!r.success) throw badRequest(r.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '));
  return r.data;
}

const kind = z.enum(MEMORY_KINDS);
const tags = z.array(z.string()).optional();
const idParams = z.object({ id: z.uuid() });

const withSize = (n: Note) => ({ ...n, wordCount: wordCount(n.body), tokenEstimate: estimateTokens(n.body) });

export const apiRoutes: FastifyPluginAsync<{ db: Db; config: Config }> = async (app, { db, config }) => {
  app.addHook('preHandler', requireBearer(config.token));

  // Projects
  app.get('/projects', () => listProjects(db));
  app.post('/projects', async (req, reply) => {
    const body = parse(z.object({ id: z.string(), name: z.string(), description: z.string().optional() }), req.body);
    return reply.code(201).send(await createProject(db, body));
  });
  app.patch('/projects/:id', async (req) => {
    const { id } = parse(z.object({ id: z.string() }), req.params);
    return updateProject(db, id, parse(z.object({ name: z.string().optional(), description: z.string().optional() }), req.body));
  });

  // Memories
  app.get('/memories', (req) => {
    const q = parse(
      z.object({
        project: z.string().optional(),
        kind: kind.optional(),
        status: z.enum(['active', 'deprecated', 'all']).optional(),
        q: z.string().optional(),
      }),
      req.query,
    );
    return listMemories(db, { projectId: q.project, kind: q.kind, status: q.status, q: q.q });
  });
  app.post('/memories', async (req, reply) => {
    const b = parse(
      z.object({
        projectId: z.string(), kind, title: z.string(), body: z.string(), tags,
        supersedesId: z.uuid().nullable().optional(),
      }),
      req.body,
    );
    return reply.code(201).send(await createMemory(db, { ...b, source: 'human', agentLabel: null }));
  });
  app.patch('/memories/:id', (req) => {
    const { id } = parse(idParams, req.params);
    const b = parse(z.object({ title: z.string().optional(), body: z.string().optional(), tags, kind: kind.optional() }), req.body);
    return updateMemory(db, id, b);
  });
  app.post('/memories/:id/deprecate', (req) => {
    const { id } = parse(idParams, req.params);
    return deprecateMemory(db, id, parse(z.object({ reason: z.string() }), req.body).reason);
  });
  app.delete('/memories/:id', async (req, reply) => {
    await deleteMemory(db, parse(idParams, req.params).id);
    return reply.code(204).send();
  });
  app.get('/memories/:id/chain', (req) => supersedesChain(db, parse(idParams, req.params).id));

  // Notes
  app.get('/notes', async (req) => {
    const q = parse(z.object({ project: z.string().optional(), q: z.string().optional() }), req.query);
    return (await listNotes(db, { projectId: q.project, q: q.q })).map(withSize);
  });
  app.get('/notes/:id', async (req) => {
    const { id } = parse(idParams, req.params);
    const n = await getNote(db, id);
    if (!n) throw notFound(`note ${id} does not exist`);
    return withSize(n);
  });
  const noteFields = {
    title: z.string(), summary: z.string().optional(), body: z.string().optional(), tags, pinned: z.boolean().optional(),
  };
  app.post('/notes', async (req, reply) => {
    const b = parse(z.object({ projectId: z.string(), ...noteFields }), req.body);
    return reply.code(201).send(withSize(await createNote(db, b)));
  });
  app.patch('/notes/:id', async (req) => {
    const { id } = parse(idParams, req.params);
    const b = parse(z.object({ ...noteFields, title: z.string().optional() }), req.body);
    return withSize(await updateNote(db, id, b));
  });
  app.delete('/notes/:id', async (req, reply) => {
    await deleteNote(db, parse(idParams, req.params).id);
    return reply.code(204).send();
  });

  // Recall preview
  app.get('/recall/:project', async (req) => {
    const { project } = parse(z.object({ project: z.string() }), req.params);
    const d = await recall(db, project);
    return { ...d, budget: DIGEST_BUDGET };
  });
};
