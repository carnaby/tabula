import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TABULA_TOKEN: z.string().min(32, 'TABULA_TOKEN must be at least 32 characters'),
  TABULA_CONNECTOR_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, 'TABULA_CONNECTOR_SECRET must be at least 32 characters').optional(),
  ),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  WEB_DIST: z.string().default('web/dist'),
});

export type Config = {
  databaseUrl: string;
  token: string;
  connectorSecret: string | undefined;
  port: number;
  host: string;
  webDist: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${msg}`);
  }
  const e = parsed.data;
  return {
    databaseUrl: e.DATABASE_URL,
    token: e.TABULA_TOKEN,
    connectorSecret: e.TABULA_CONNECTOR_SECRET,
    port: e.PORT,
    host: e.HOST,
    webDist: e.WEB_DIST,
  };
}
