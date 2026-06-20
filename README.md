# Geneprint

> **Make everything your AI coding agent builds inherit one proven architecture.**
> `gene` + `blueprint` — one source pattern; every piece your agent grows conforms to it.

Geneprint is a lightweight, agent-native plugin (Claude Code / Cursor / Copilot / Gemini …). You describe what you want; your AI agent builds it — and a single idempotent command **imprints a reusable "architecture gene" into the project so that whatever the agent grows is well-architected by birth**, then gets out of the way.

---

## Philosophy

Today's AI coding agents build fast but inconsistently — ad-hoc structure, throwaway prompts, no memory, locked to one IDE. The two common answers each have a cost:

- **Scaffolders** (`create-react-app`, cookiecutter) hand you a *dead* code directory. No governance, no inheritance.
- **Heavyweight methodologies** make you *adopt their whole process* — roles, phases, ceremony — and live inside it.

**Geneprint takes a third path: heredity, not methodology.**

- 🧬 **A gene, not a framework.** It imprints a small, opinionated *architecture gene* into your project. Whatever your agent grows afterward **inherits** that gene's traits.
- 🪶 **Pure & light.** No persona cast, no multi-stage process, no learning curve. One command. (One runtime dep: `js-yaml`, bundled.)
- ♻️ **Strictly idempotent.** Run it any number of times — same inputs, same result, never clobbers your files.
- 🚪 **Imprint-and-leave.** The gene becomes *the project's own*. Geneprint doesn't stay resident.
- 🌐 **Stands on open standards.** Multi-host via the open `AGENTS.md` standard + each host's native format — not reinvented.

> The value isn't a feature list (others have those). It's the **purity, form, and idempotency**: a clean architectural inheritance any agent can grow on, that you own the moment it lands.

---

## How it works

### The one command: `/inherit` (idempotent, self-bootstrapping)

```
/inherit  + an idea
   │
   ├─ gene foundation present?  no → stamp it (.gene/, GENE.md, skills/)   yes → skip
   ├─ scaffold a blank gene-conforming skill → agent fills it in
   ├─ install it (fingerprint-idempotent) + record version in .gene/gene.yaml
   └─ recompile host outputs (AGENTS.md · .claude/skills · .claude/agents · .cursor/rules · rules · ignore)
```

Same inputs → identical tree. Re-runs never mutate existing files (content-fingerprint + manifest check).

### Companion commands & capabilities

- **`/eval`** — grade a skill against its `evals/` cases: deterministic assertions (contains / regex) **plus** optional LLM-rubric judging.
- **`/trace`** — runtime observability: a passive `PostToolUse` hook logs tool calls to `.gene/trace.jsonl` (no-ops outside gene projects); `/trace` summarizes by tool / skill / failures.
- **`diagnostics` MCP tool** — run `npm test` / build → structured `{exitCode, errors, tail}` so the agent can self-correct ("error → probe → fix" loop).
- **registry** — `/inherit --from review` resolves a bundled golden skill by name (catalog in `registry.json`; `node lib/cli.mjs list` prints it).

### The 5 genes (every product is born with these)

| # | Gene | Lands as |
|---|------|----------|
| ① | Deterministic + semantic split | `scripts/` (deterministic) ⟂ `prompt.md` (LLM) |
| ② | Multi-host compile + open standard | one source → `AGENTS.md` + `.claude/skills` + `.claude/agents` + `.cursor/rules` |
| ③ | Three-tier lazy loading | metadata → body → `reference/` on demand |
| ④ | Committable artifacts | config `GENE.md` ⟂ memory `MEMORY.md` |
| ⑤ | Self-describing primitives | `skill.yaml` `uses:` → compiled to Claude `allowed-tools` + AGENTS.md deps |

### The 8 primitives an agent can grow

`skills` · `commands` · `mcp` · `hooks` · `subagents` · `permissions` · `rules` · `ignore` — all eight implemented.

---

## Architecture

**What gets stamped into your project** (the inherited foundation):

```
<your-project>/
├── .gene/
│   ├── gene.yaml        # gene version + product manifest (name · fingerprint · version)
│   ├── ignore           # ignore-primitive source (one glob per line)
│   ├── trace.jsonl      # runtime observability log (local; git-ignored)
│   └── .gitignore       # ignores trace.jsonl
├── skills/<name>/       # gene-conforming products (source of truth)
│   ├── skill.yaml       #   metadata + when-to-use + version + uses{mcp,permissions,subagents}
│   ├── prompt.md        #   LLM semantic layer
│   ├── scripts/         #   deterministic layer (0 tokens)
│   ├── reference/       #   load-on-demand knowledge
│   ├── evals/           #   eval cases (graded by /eval)
│   └── subagents/       #   optional bundled subagent defs
├── rules/<name>.md      # rules-primitive source (description · globs · alwaysApply)
├── AGENTS.md            # compiled: open standard — Skills + Rules (Cursor / Copilot / Gemini)
├── CLAUDE.md            # compiled: rules → geneprint-managed block (Claude native)
├── .claude/skills/<name>/SKILL.md   # compiled: Claude native (+ allowed-tools from uses.permissions)
├── .claude/agents/<name>.md         # compiled: Claude project subagents
├── .cursor/rules/<name>.mdc         # compiled: Cursor native (skills + rules)
├── .gitignore · .cursorignore · .geminiignore   # compiled: ignore → managed block
└── GENE.md              # committable config / architecture decisions
```

**The Geneprint plugin itself** (this repo):

```
geneprint/
├── .claude-plugin/
│   ├── plugin.json               # Claude Code plugin manifest
│   └── marketplace.json          # self-marketplace (installable from this repo)
├── .mcp.json                     # declares the geneprint-diagnostics MCP server
├── registry.json                 # distribution registry — golden skills resolvable by name
├── .github/workflows/ci.yml      # CI — node --test on push / PR
├── commands/
│   ├── inherit.md                # /inherit — grow a gene-conforming skill
│   ├── eval.md                   # /eval  — grade a skill (deterministic + LLM-rubric)
│   └── trace.md                  # /trace — runtime observability summary
├── gene/                         # bundled golden skills (registry sources) — DNA seeds /inherit replicates
│   ├── golden-skill/             #   /review — diff → LLM review (+ review-verifier subagent)
│   ├── commit/                   #   /commit — staged diff → Conventional Commits message
│   └── pr-description/           #   /pr-description — branch commits → PR description
│                                 #   each: skill.yaml · prompt.md · scripts/ · reference/ · evals/
├── lib/                          # deterministic engine (Node ESM; only dep: js-yaml)
│   ├── fingerprint.mjs           #   content fingerprint (idempotency)
│   ├── manifest.mjs              #   .gene/gene.yaml read/write + versions
│   ├── foundation.mjs            #   idempotent foundation stamping
│   ├── skill-install.mjs         #   fingerprint-idempotent install
│   ├── compiler.mjs              #   → AGENTS.md + .claude/{skills,agents} + .cursor/rules (+ rules, ignore)
│   ├── rules.mjs                 #   rules primitive → Cursor .mdc + AGENTS.md + CLAUDE.md block
│   ├── ignore.mjs                #   ignore primitive → .gitignore/.cursorignore/.geminiignore block
│   ├── managed-block.mjs         #   idempotent geneprint-managed block in shared host files
│   ├── scaffold.mjs              #   blank gene-conforming skill skeleton
│   ├── eval.mjs                  #   load / grade / summarize eval cases
│   ├── trace.mjs                 #   runtime observability (record / summarize)
│   ├── diagnostics.mjs           #   run a command → structured errors (MCP probe)
│   ├── registry.mjs              #   skill version/deps + distribution registry (resolve by name)
│   └── cli.mjs                   #   inherit / scaffold / eval / trace / list + CLI
├── hooks/
│   ├── hooks.json                # PostToolUse(Failure) → observe.mjs
│   └── observe.mjs               # passive trace logger (no-op outside gene projects)
├── mcp/
│   └── server.mjs                # zero-dep MCP stdio server (diagnostics tool)
├── test/                         # 91 tests (node:test), 23 files
├── docs/superpowers/{specs,plans}/   # design spec + implementation plan
├── node_modules/                 # bundled (js-yaml) — zero-setup install
├── package.json · package-lock.json
└── README.md · LICENSE · .gitignore
```

---

## Quick start

### As a Claude Code plugin (recommended)

```text
/plugin marketplace add lxb12123/geneprint
/plugin install geneprint@geneprint-marketplace
```

Then, in any project:

```text
/geneprint:inherit          # describe a skill → it's imprinted + compiled to every host
/geneprint:eval skills/<n>  # grade a skill against its eval cases
/geneprint:trace .          # runtime observability summary
```

Claude interviews you, scaffolds a gene-conforming skill, and imprints it (`.gene/`, `skills/<name>/`, host outputs). Re-run any time — it never clobbers existing files. Dependencies are bundled, so there's no setup step.

### From source / for development

Requirements: **Node ≥ 18** and **git**.

```bash
git clone https://github.com/lxb12123/geneprint && cd geneprint
npm test          # 91/91 should pass

# Imprint the bundled golden /review skill into any project:
node lib/cli.mjs inherit /path/to/project --name review --from gene/golden-skill
```

To iterate on the plugin inside Claude Code: `claude --plugin-dir .` then `/reload-plugins`.

---

## License

[MIT](LICENSE)
