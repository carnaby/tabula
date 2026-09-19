import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { DomainError } from '../domain/errors.js';
import { registerMcpRoutes } from '../mcp/routes.js';

// Secret v ceste /mcp/<secret> sa nesmie dostať do logov.
const maskUrl = (url: string) => url.replace(/^\/mcp\/[^/?#]+/, '/mcp/***');

export async function buildApp(deps: { config: Config; db: Db }): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      serializers: {
        req: (req) => ({ method: req.method, url: maskUrl(req.url), agent: req.headers['x-tabula-agent'] }),
      },
    },
  });

  app.setErrorHandler<FastifyError>((err, _req, reply) => {
    if (err instanceof DomainError) return reply.code(err.status).send({ error: err.code, message: err.message });
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    return reply.code(status).send({ error: status >= 500 ? 'internal' : 'bad_request', message: err.message });
  });

  app.get('/healthz', async () => ({ ok: true }));
  registerMcpRoutes(app, deps);
  return app;
}
