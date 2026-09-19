import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const memoryKind = pgEnum('memory_kind', ['rule', 'decision', 'fact', 'gotcha']);
export const memoryStatus = pgEnum('memory_status', ['active', 'deprecated']);
export const memorySource = pgEnum('memory_source', ['agent', 'human']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    kind: memoryKind('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    status: memoryStatus('status').notNull().default('active'),
    supersedesId: uuid('supersedes_id').references((): AnyPgColumn => memories.id, { onDelete: 'set null' }),
    deprecatedReason: text('deprecated_reason'),
    source: memorySource('source').notNull(),
    agentLabel: text('agent_label'),
    ...timestamps,
    search: tsvector('search').generatedAlwaysAs(
      sql`setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') || setweight(to_tsvector('simple'::regconfig, tabula_tags_text(tags)), 'B') || setweight(to_tsvector('simple'::regconfig, coalesce(body, '')), 'C')`,
    ),
  },
  (t) => [
    index('memories_search_idx').using('gin', t.search),
    index('memories_project_status_idx').on(t.projectId, t.status),
    check('memories_title_len', sql`char_length(${t.title}) between 1 and 120`),
    check('memories_body_len', sql`char_length(${t.body}) between 1 and 2000`),
  ],
);

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    body: text('body').notNull().default(''),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    pinned: boolean('pinned').notNull().default(false),
    ...timestamps,
    search: tsvector('search').generatedAlwaysAs(
      sql`setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') || setweight(to_tsvector('simple'::regconfig, tabula_tags_text(tags)), 'B') || setweight(to_tsvector('simple'::regconfig, coalesce(summary, '') || ' ' || coalesce(body, '')), 'C')`,
    ),
  },
  (t) => [
    index('notes_search_idx').using('gin', t.search),
    index('notes_project_idx').on(t.projectId),
    check('notes_summary_len', sql`char_length(${t.summary}) <= 200`),
  ],
);
