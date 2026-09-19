import type { AddressInfo } from 'node:net';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createMemory, getMemory } from '../../src/domain/memories.js';
import { buildApp } from '../../src/http/app.js';
import { seedProject, TEST_SECRET, TEST_TOKEN, testConfig, useTestDb } from '../helpers.js';

const db = useTestDb();
let app: FastifyInstance;
let base: string;

beforeAll(async () => {
  app = await buildApp({ config: testConfig(), db });
  await app.listen({ port: 0, host: '127.0.0.1' });
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterAll(() => app.close());
beforeEach(() => seedProject(db, 'demo'));

async function connect(path: string, headers: Record<string, string> = {}) {
  const client = new Client({ name: 'tabula-test', version: '0.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(base + path), { requestInit: { headers } }));
  return client;
}
const bearer = { Authorization: `Bearer ${TEST_TOKEN}`, 'X-Tabula-Agent': 'claude-code' };
type Content = Array<{ type: string; text: string }>;
const textOf = (r: { content?: unknown }) => (r.content as Content)[0]!.text;

describe('MCP endpoint', () => {
  it('exposes exactly the six tools', async () => {
    const client = await connect('/mcp', bearer);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['deprecate', 'get', 'list_projects', 'recall', 'remember', 'search']);
    expect(tools.find((t) => t.name === 'recall')!.description).toMatch(/^Call this FIRST in every session/);
    await client.close();
  });

  it('remember then recall round-trips and records the agent label', async () => {
    const client = await connect('/mcp', bearer);
    const r = await client.callTool({
      name: 'remember',
      arguments: { project: 'demo', kind: 'gotcha', title: 'Cold start kills migrations', body: 'Over 60 s.' },
    });
    const { id } = JSON.parse(textOf(r)) as { id: string };
    expect(await getMemory(db, id)).toMatchObject({ source: 'agent', agentLabel: 'claude-code' });
    const digest = textOf(await client.callTool({ name: 'recall', arguments: { project: 'demo' } }));
    expect(digest).toContain('## Gotchas\n- Cold start kills migrations');
    await client.close();
  });

  it('returns domain errors as tool errors with the status prefix', async () => {
    const h = await createMemory(db, { projectId: 'demo', kind: 'rule', title: 'Human', body: 'b', source: 'human' });
    const client = await connect('/mcp', bearer);
    const r = await client.callTool({ name: 'deprecate', arguments: { id: h.id, reason: 'x' } });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toBe('403: human-authored records are read-only for agents');
    const long = await client.callTool({
      name: 'remember', arguments: { project: 'demo', kind: 'fact', title: 'x'.repeat(121), body: 'b' },
    });
    expect(textOf(long)).toMatch(/^400: title is 121 characters/);
    await client.close();
  });

  it('rejects missing or wrong bearer tokens', async () => {
    const init = { jsonrpc: '2.0', id: 1, method: 'ping' };
    const post = (headers: Record<string, string>) =>
      fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
        body: JSON.stringify(init),
      });
    expect((await post({})).status).toBe(401);
    expect((await post({ Authorization: 'Bearer wrong' })).status).toBe(401);
  });

  it('accepts the connector secret path and labels it claude-ai', async () => {
    const client = await connect(`/mcp/${TEST_SECRET}`);
    const r = await client.callTool({
      name: 'remember', arguments: { project: 'demo', kind: 'fact', title: 'Via claude.ai', body: 'b' },
    });
    const { id } = JSON.parse(textOf(r)) as { id: string };
    expect((await getMemory(db, id))?.agentLabel).toBe('claude-ai');
    await client.close();
    const wrong = await fetch(`${base}/mcp/${'w'.repeat(32)}`, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });
    expect(wrong.status).toBe(404);
  });

  it('answers GET /mcp with 405 and keeps /healthz public', async () => {
    expect((await fetch(`${base}/mcp`)).status).toBe(405);
    expect(await (await fetch(`${base}/healthz`)).json()).toEqual({ ok: true });
  });

  it('answers GET on the connector path with 405, never with the 404 that logs the raw url', async () => {
    expect((await fetch(`${base}/mcp/${TEST_SECRET}`)).status).toBe(405);
    expect((await fetch(`${base}/mcp/${'w'.repeat(32)}`)).status).toBe(404);
  });
});
