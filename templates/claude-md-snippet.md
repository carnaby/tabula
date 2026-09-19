## Memory (Tabula)

This project's slug in Tabula is `<slug>`.

1. At the start of every session, before reading any code, call
   `tabula.recall("<slug>")` and follow the rules and gotchas it returns.
2. Before making an architectural or tooling decision, call
   `tabula.search` to check whether it was already decided.
3. When you make a decision that a future session must know, or hit a
   trap that cost more than 10 minutes, call `tabula.remember`.
   Search first; supersede instead of duplicating.
4. When you find that an active memory is wrong, call `tabula.deprecate`
   with the reason. Never silently ignore a rule.
5. Never record: task progress, TODOs, things visible in the code,
   anything already in this CLAUDE.md.
