import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Zo src/db/ aj z dist/db/ vedie ../../drizzle do koreňa repa (v Dockeri /app/drizzle).
const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function runMigrations(url: string): Promise<void> {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle({ client }), { migrationsFolder: MIGRATIONS });
  } finally {
    await client.end();
  }
}
