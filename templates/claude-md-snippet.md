## Memory (Tabula)
Tabula (MCP server `tabula`) is a backup memory that carries knowledge to other machines and to claude.ai. It ranks last: the code and the docs in git first, then Claude Code's local memory, then Tabula. On a conflict the higher source wins and the Tabula record is fixed at the next handoff.
- This project's Tabula project is `<slug>`.
- At session start call `recall` for `<slug>` and follow its rules and gotchas. A record older than the code it describes is suspect — check it.
- Write only at handoff: 0–3 records of what is not in git but another machine would need (mostly what local memory holds). `search` first; replace an outdated record with `remember` + `supersedes_id`, `deprecate` one that no longer holds.
- Never store secrets, task progress, TODOs or anything already in git.
