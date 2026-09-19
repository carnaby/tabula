import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/http/app.js';
import { TEST_TOKEN, testConfig, useTestDb } from '../helpers.js';

const db = useTestDb();
let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp({ config: testConfig(), db });
});
afterAll(() => app.close());

const auth = { authorization: `Bearer ${TEST_TOKEN}` };
const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  app.inject({ method, url, headers: auth, ...(payload && { payload }) });

describe('REST API', () => {
  it('requires the bearer token', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/projects' })).statusCode).toBe(401);
  });

  it('manages projects', async () => {
    expect((await call('POST', '/api/projects', { id: 'demo', name: 'Demo' })).statusCode).toBe(201);
    expect((await call('POST', '/api/projects', { id: 'Bad Slug', name: 'x' })).statusCode).toBe(400);
    expect((await call('PATCH', '/api/projects/demo', { description: 'd' })).json()).toMatchObject({ description: 'd' });
    expect((await call('GET', '/api/projects')).json().map((p: { id: string }) => p.id)).toEqual(['global', 'demo']);
  });

  it('runs the memory lifecycle as a human', async () => {
    await call('POST', '/api/projects', { id: 'demo', name: 'Demo' });
    const created = await call('POST', '/api/memories', { projectId: 'demo', kind: 'rule', title: 'T', body: 'B' });
    expect(created.statusCode).toBe(201);
    const m = created.json();
    expect(m).toMatchObject({ source: 'human', agentLabel: null });

    expect((await call('PATCH', `/api/memories/${m.id}`, { title: 'T2' })).json()).toMatchObject({ title: 'T2' });
    expect((await call('PATCH', `/api/memories/${m.id}`, { title: 'x'.repeat(121) })).statusCode).toBe(400);

    const v2 = (await call('POST', '/api/memories', { projectId: 'demo', kind: 'rule', title: 'T3', body: 'B', supersedesId: m.id })).json();
    expect((await call('GET', `/api/memories/${v2.id}/chain`)).json().map((x: { id: string }) => x.id)).toEqual([m.id, v2.id]);

    expect((await call('GET', '/api/memories?project=demo')).json()).toHaveLength(1);
    expect((await call('GET', '/api/memories?project=demo&status=all')).json()).toHaveLength(2);
    expect((await call('POST', `/api/memories/${v2.id}/deprecate`, { reason: 'old' })).json()).toEqual({ changed: true });
    expect((await call('DELETE', `/api/memories/${v2.id}`)).statusCode).toBe(204);
    expect((await call('DELETE', `/api/memories/${v2.id}`)).statusCode).toBe(404);
  });

  it('manages notes with size estimates and shows the recall preview', async () => {
    await call('POST', '/api/projects', { id: 'demo', name: 'Demo' });
    const n = (await call('POST', '/api/notes', { projectId: 'demo', title: 'Protocol', body: 'one two three four' })).json();
    expect(n).toMatchObject({ wordCount: 4, tokenEstimate: 5, pinned: false });
    expect((await call('PATCH', `/api/notes/${n.id}`, { pinned: true })).json()).toMatchObject({ pinned: true });
    expect((await call('GET', '/api/notes?project=demo')).json()).toHaveLength(1);

    const preview = (await call('GET', '/api/recall/demo')).json();
    expect(preview).toMatchObject({ budget: 1500, overBudget: false, trimmed: [] });
    expect(preview.text).toContain('## Pinned note: Protocol');
    expect(preview.tokens).toBeGreaterThan(0);

    expect((await call('DELETE', `/api/notes/${n.id}`)).statusCode).toBe(204);
    expect((await call('GET', '/api/recall/nope')).statusCode).toBe(404);
  });

  it('validates enum query params', async () => {
    expect((await call('GET', '/api/memories?kind=nonsense')).statusCode).toBe(400);
  });
});
