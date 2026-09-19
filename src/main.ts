import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { buildApp } from './http/app.js';

const config = loadConfig();
await runMigrations(config.databaseUrl);
const { db, close } = createDb(config.databaseUrl);
const app = await buildApp({ config, db });

const shutdown = async () => {
  await app.close();
  await close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ port: config.port, host: config.host });
