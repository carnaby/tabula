export const TOOL_DESCRIPTIONS = {
  list_projects: `List Tabula projects: slug, one-line description, number of active memories and notes.
Call it when you are unsure which project slug to use. Never invent a slug; projects are created by the human.`,

  recall: `Call this FIRST in every session, before reading code. Returns the
active rules, gotchas, decisions and facts for a project plus global ones.
Do not call search for things already in the digest.`,

  search: `Full-text search over memories and notes. Use before remember to
check whether a similar record already exists, and when you need something
specific that the recall digest did not contain.`,

  get: `Fetch the full body of one memory or note by id. Notes can be long;
fetch them only when the summary in recall is not enough.`,

  remember: `Persist a durable rule, decision, fact or gotcha for a project.
Write it only when it will still matter in a future session and is not
obvious from the code. Do NOT record task progress, TODOs, or restatements
of what CLAUDE.md already says. Always search first; if a record covers the
same topic, pass its id as supersedes_id instead of creating a duplicate.
Title: one line, imperative for rules ("Run tests via pnpm test:unit").
Body: the why and the context in 1–5 sentences.
Write only if all three hold: it will still be true in a month; it is not
visible in the code or CLAUDE.md; a future session would lose time without it.
Expect 0–3 records per session. Never store secrets (passwords, keys, tokens),
not even as a fact.`,

  deprecate: `Mark a memory as no longer valid, with a reason. Use when the
code or a decision has changed. You cannot deprecate human-authored records
or notes; instead, remember a fact describing the discrepancy.`,
} as const;
