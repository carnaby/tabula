import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { DomainError } from '../domain/errors.js';
import { registerMcpRoutes } from '../mcp/routes.js';

// Secret v ceste /mcp/<secret> sa nesmie dostať do logov.
const maskUrl = (url: string) => url.replace(/^\/mcp\/[^/?#]+/, '/mcp/***');

export async function buildApp(deps: {
  config: Config;
  db: Db;
  /** Len pre testy: kam písať logy (default stdout). */
  logStream?: { write(msg: string): void };
}): Promise<FastifyInstance> {
  const secret = deps.config.connectorSecret;
  // Maskuje aj secret mimo /mcp/<secret> (napr. /MCP/<secret>), keby sa URL ocitla v logu inou cestou.
  const mask = (url: string) => {
    const masked = maskUrl(url);
    return secret ? masked.split(secret).join('***') : masked;
  };
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      ...(deps.logStream ? { stream: deps.logStream } : {}),
      serializers: {
        req: (req) => ({ method: req.method, url: mask(req.url), agent: req.headers['x-tabula-agent'] }),
      },
    },
  });

  // Default 404 handler loguje "Route <METHOD>:<raw url> not found" (so secretom) a vracia URL v tele.
  app.setNotFoundHandler((req, reply) => {
    req.log.info({ req }, 'route not found');
    return reply.code(404).send({ error: 'not found' });
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
