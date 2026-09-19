import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import { runMigrations } from '../src/db/migrate.js';

let container: StartedPostgreSqlContainer | undefined;

export default async function setup(project: TestProject) {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const url = container.getConnectionUri();
  await runMigrations(url);
  project.provide('databaseUrl', url);
  return async () => {
    await container?.stop();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
