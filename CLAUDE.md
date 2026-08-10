# AGENTS.md

---

## Quick Triggers

**Session Start**: Check `docs/kb/ai-patterns/mistake-log.md` for patterns to avoid.

**During Session**:
- User says "commit/stage" -> run `pre-commit-check`
- You get corrected -> run `log-mistake`
- KB lookup fails -> after solving, run `document-solution`
- You modify KB files -> run `check-kb-index`

**Session End** (user says "done/thanks/bye"): Run `session-end-checklist`

---

## Project Context

**Project**: atendio

| Aspect | Value |
|--------|-------|
| Language/Framework | Express |
| Architecture | Frontend SPA |
| Main branch | `main` |
| Deployment | Heroku |
| Database | — |
| Package manager | yarn |

**Key commands**:
```bash
npx jest       # Run tests
npx eslint .       # Lint
yarn run dev        # Dev server
```

---

## Knowledge Base

Index: `docs/kb/README.md`

Load ONLY relevant docs. Do not load entire KB.

### KB-First Rule

Before exploring code: check `docs/kb/README.md` for a matching doc. If found,
read it before any grep/read. If not found, explore code, then run
`document-solution` if non-trivial.

---

## Memory

At session start, read `.agents/memory/project-profile.md` for cached context.
Check `.agents/memory/decisions.md` when making architectural choices.
Update `.agents/memory/preferences.md` when you learn how the user works.

---

## Critical Constraints

1. **No magic strings** - Use constants, enums, or config values
2. **No N+1 queries** - Use eager loading where applicable
3. **Sanitize inputs** - Validate at system boundaries
4. **Parameterized queries** - Never interpolate user input into queries

---

## Things to Avoid

1. Over-engineering - only make directly requested changes
2. Breaking existing tests - run tests before committing
3. Adding dependencies without evaluating alternatives
4. Large PRs - prefer small, focused changesets

---

## Auto-Triggers

| Trigger | Action |
|---------|--------|
| User says "commit", "stage", "push" | `pre-commit-check` |
| KB lookup fails -> solved via code | `document-solution` |
| User corrects you | `log-mistake` |
| Modified KB files | `check-kb-index` |
| User ending session | `session-end-checklist` |

---

## Skills

| Skill | When |
|-------|------|
| `pre-commit-check` | Before commit/staging |
| `code-review` | Self-review before PR |
| `dependency-audit` | Check for vulnerable/outdated deps |
| `document-solution` | Complex problem solved or KB miss |
| `log-mistake` | User corrects you |
| `check-kb-index` | After KB file changes |
| `save-session` | Long session or pausing work |
| `session-end-checklist` | Session ending |
| `create-plan` | Starting a multi-step feature |
| `execute-task` | Working on a plan task |
| `execute-plan` | Running remaining plan tasks |
| `scaffold-feature` | Bootstrapping a new feature |
| `investigate-bug` | Bug — investigate, root cause, fix, document |
| `dev-environment` | Start/stop/reset/doctor local dev (AI-configured during init) |
| `changelog-update` | Updating CHANGELOG.md from commits |
| `evolve-framework` | Self-improve: audit, research, suggest |
| `list-skills` | Show all available skills |
| `upgrade-framework` | Update installed skills from latest framework source |
| `add-defect` | Log a defect/bug as a tracked task with severity and reproduction steps |
| `check-agent-drift` | Audit AI agent behaviour for drift from AGENTS.md conventions |
| `cleanup-sessions` | Archive or purge stale session handoff docs |
| `promptcraft` | Craft, save, and reuse high-quality prompts for recurring tasks |
| `security-review` | OWASP checklist: auth, input validation, secrets, SQL injection, XSS |
| `setup-tests` | Bootstrap a test runner for repos with no testing configured |
| `eval-harness` | Eval-driven development: define pass/fail criteria before coding |
| `tdd-workflow` | Red-green-refactor TDD cycle — write tests first, implement, verify coverage |
| `verification-loop` | Full pre-PR check: build, types, lint, tests, security scan, diff review |
| `strategic-compact` | Compact context at logical task boundaries, not mid-task |
| `memory-compress` | manual | Compress memory/KB/CLAUDE.md files to reduce input tokens. Preserves a |
| `bootstrap-memory` | manual | Seeds memory files from existing project history. Solves cold-start fo |
| `consolidate-memory` | manual | LLM-rewrites accumulated session docs into memory files. Merges learni |
| `framework` | manual | Framework management — evolve, upgrade, memory, hooks, session, list,  |
| `hooks` | manual | Manage Claude Code hook lifecycle — status, enable, disable, audit log |

---

## Agents

`.agents/agents/`: Claude/tool-agnostic role specs.
`.codex/agents/`: Codex-native custom agents with the same roles.

---

## REMEMBER

Before responding, check:
1. **Am I being corrected?** -> `log-mistake`
2. **Is user committing?** -> `pre-commit-check`
3. **Is user ending session?** -> `session-end-checklist`
4. **Did I solve something complex without KB?** -> `document-solution`

## Code style

- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- Types: explicit. No `any`, no `Dict`, no untyped functions.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

## Comments

- Keep your own comments. Don't strip them on refactor — they carry intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because of a specific bug or upstream constraint.

## Tests

- Tests run with a single command: `yart test`.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes, not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable, self-validating, timely.

## Dependencies

- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.

## Formatting

- Use the language default formatter (`yarn linter`, `prettier`). Don't discuss style beyond that.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.
