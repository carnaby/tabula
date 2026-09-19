import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import {
  type AgentContext, agentDeprecate, agentGet, agentListProjects, agentRecall, agentRemember, agentSearch,
} from '../agent/operations.js';
import { DomainError } from '../domain/errors.js';
import { MEMORY_KINDS } from '../domain/validation.js';
import { TOOL_DESCRIPTIONS as D } from './descriptions.js';

const idParam = z.string().describe('Full uuid or the short #xxxx id shown in recall and search.');
const projectParam = z.string().describe('Project slug, e.g. "omnistra". Global records are always included.');
const kindParam = z.enum(MEMORY_KINDS);

async function run(fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    const text = typeof result === 'string' ? result : JSON.stringify(result);
    return { content: [{ type: 'text' as const, text }] };
  } catch (e) {
    if (e instanceof DomainError) {
      return { content: [{ type: 'text' as const, text: `${e.status}: ${e.message}` }], isError: true };
    }
    throw e;
  }
}

export function buildMcpServer(ctx: AgentContext): McpServer {
  const server = new McpServer({ name: 'tabula', version: '0.1.0' });

  server.registerTool('list_projects', { description: D.list_projects, inputSchema: z.object({}) }, () =>
    run(() => agentListProjects(ctx)),
  );

  server.registerTool('recall', { description: D.recall, inputSchema: z.object({ project: projectParam }) }, ({ project }) =>
    run(() => agentRecall(ctx, project)),
  );

  server.registerTool(
    'search',
    {
      description: D.search,
      inputSchema: z.object({
        query: z.string().min(1).describe('Words to look for; supports "quoted phrases", OR and -exclusion.'),
        project: projectParam.optional().describe('Limit to this project plus global. Omit to search everything.'),
        kind: kindParam.optional().describe('Only memories of this kind (excludes notes).'),
        include_deprecated: z.boolean().default(false),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    },
    (a) =>
      run(() =>
        agentSearch(ctx, { query: a.query, project: a.project, kind: a.kind, includeDeprecated: a.include_deprecated, limit: a.limit }),
      ),
  );

  server.registerTool('get', { description: D.get, inputSchema: z.object({ id: idParam }) }, ({ id }) =>
    run(() => agentGet(ctx, id)),
  );

  server.registerTool(
    'remember',
    {
      description: D.remember,
      inputSchema: z.object({
        project: projectParam.describe('Project slug; use "global" only for rules that apply to every project.'),
        kind: kindParam.describe('rule = how to do things; decision = what was chosen and why; fact = state of the world not in code; gotcha = a trap already hit.'),
        title: z.string().describe('One line, max 120 characters.'),
        body: z.string().describe('The why and the context in 1–5 sentences, max 2000 characters.'),
        tags: z.array(z.string()).optional().describe('Free lowercase tags.'),
        supersedes_id: idParam.optional().describe('Id of the record this one replaces; it will be deprecated.'),
      }),
    },
    (a) => run(() => agentRemember(ctx, a)),
  );

  server.registerTool(
    'deprecate',
    {
      description: D.deprecate,
      inputSchema: z.object({ id: idParam, reason: z.string().describe('Why the record is no longer valid.') }),
    },
    (a) => run(() => agentDeprecate(ctx, a)),
  );

  return server;
}
