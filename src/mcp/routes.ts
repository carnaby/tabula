import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { sanitizeAgentLabel } from '../domain/validation.js';
import { requireBearer, safeEqual } from '../http/auth.js';
import { buildMcpServer } from './server.js';

const METHOD_NOT_ALLOWED = { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null };

export function registerMcpRoutes(app: FastifyInstance, deps: { db: Db; config: Config }): void {
  // Stateless: nový server + transport na každý request, agentLabel ide do closure.
  const handle = async (req: FastifyRequest, reply: FastifyReply, agentLabel: string) => {
    const server = buildMcpServer({ db: deps.db, agentLabel, log: req.log });
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.raw.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    reply.hijack();
    await transport.handleRequest(req.raw, reply.raw, req.body);
  };

  app.post('/mcp', { preHandler: requireBearer(deps.config.token) }, (req, reply) =>
    handle(req, reply, sanitizeAgentLabel(req.headers['x-tabula-agent'])),
  );

  const secret = deps.config.connectorSecret;
  if (secret) {
    app.post<{ Params: { secret: string } }>('/mcp/:secret', async (req, reply) => {
      if (!safeEqual(req.params.secret, secret)) return reply.code(404).send({ error: 'not found' });
      const header = req.headers['x-tabula-agent'];
      return handle(req, reply, header ? sanitizeAgentLabel(header) : 'claude-ai');
    });
    // Klient po initialize skúša GET (SSE stream); bez tejto route by default 404 handler zalogoval URL so secretom.
    app.route<{ Params: { secret: string } }>({
      method: ['GET', 'DELETE'],
      url: '/mcp/:secret',
      handler: (req, reply) =>
        safeEqual(req.params.secret, secret)
          ? reply.code(405).send(METHOD_NOT_ALLOWED)
          : reply.code(404).send({ error: 'not found' }),
    });
  }

  for (const method of ['GET', 'DELETE'] as const) {
    app.route({ method, url: '/mcp', handler: (_req, reply) => reply.code(405).send(METHOD_NOT_ALLOWED) });
  }
}
