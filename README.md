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

- 🧬 **A gene, not a framework.** It imprints a small, opinionated *architecture gene* into your project. Whatever your agent grows afterward **inherits** that gene's traits — deterministic/LLM split, multi-host output, lazy loading, committable artifacts, self-describing primitives.
- 🪶 **Pure & light.** No persona cast, no multi-stage process, no learning curve. One command.
- ♻️ **Strictly idempotent.** Run it any number of times — same inputs, same result, never clobbers your files.
- 🚪 **Imprint-and-leave.** The gene becomes *the project's own*. Geneprint doesn't stay resident and doesn't make you depend on it.
- 🌐 **Stands on open standards.** Multi-host via the open `AGENTS.md` standard — not reinvented.

> The value isn't a list of features (others have those). It's the **purity, form, and idempotency**: a clean architectural inheritance any agent can grow on, that you own the moment it lands.

---

## How it works

### The one command: `/inherit` (idempotent, self-bootstrapping)

```
/inherit  + an idea
   │
   ├─ Is the gene foundation present in this project?
   │     ├─ no  → stamp it (.gene/, GENE.md, skills/, AGENTS.md)
   │     └─ yes → skip — never re-stamp
   │
   ├─ scaffold a blank gene-conforming skill → agent fills it in
   ├─ install it (fingerprint-idempotent) + update the manifest (.gene/gene.yaml)
   └─ recompile host outputs (AGENTS.md + .claude/skills + .cursor/rules)
```

Same inputs → identical tree. Re-runs never mutate existing files (guaranteed by a content-fingerprint + manifest check).

### Execution chain

```
user goal
  │
  ▼  explicit entry (a command) — or implicit (a skill's when-to-use, auto-fired by the agent)
skill (capability atom)
  ├─ scripts    deterministic layer (0 tokens, same in → same out)
  ├─ mcp        tools / probes (logs, screenshots, AST …)
  ├─ subagents  delegate work
  └─ hooks      deterministic lifecycle control
  │
  ▼
goal met + gene-compliant the whole way = a good product
```

### The 5 genes (every product is born with these)

| # | Gene | Lands as |
|---|------|----------|
| ① | Deterministic + semantic split | `scripts/` (deterministic) ⟂ `prompt.md` (LLM) |
| ② | Multi-host compile + open standard | one source → `AGENTS.md` + `.claude/skills` + `.cursor/rules` |
| ③ | Three-tier lazy loading | metadata → body → `reference/` on demand |
| ④ | Committable artifacts | config `GENE.md` ⟂ memory `MEMORY.md` |
| ⑤ | Self-describing primitives | `skill.yaml` declares the `mcp` / permissions / subagents it uses |

### The 8 primitives an agent can grow

`skills` · `commands` · `mcp` · `hooks` · `subagents` · `permissions` · `rules` · `ignore`
(aligned with the field's real taxonomy; deterministic probes, hooks, permissions and sub-agents are all first-class.)

---

## Architecture

**What gets stamped into your project** (the inherited foundation):

```
<your-project>/
├── .gene/
│   ├── gene.yaml        # gene version + product manifest (idempotency detector)
│   ├── trace.jsonl      # runtime observability log (local; git-ignored)
│   └── .gitignore       # ignores trace.jsonl
├── skills/<name>/       # gene-conforming products (the atoms)
│   ├── skill.yaml       #   metadata + when-to-use + self-describe (uses:)
│   ├── prompt.md        #   LLM semantic layer
│   ├── scripts/         #   deterministic layer (0 tokens)
│   ├── reference/       #   load-on-demand knowledge
│   └── evals/           #   eval cases (graded by /eval)
├── AGENTS.md            # compiled: open standard (read by Cursor / Copilot / Gemini)
├── .claude/skills/<name>/SKILL.md   # compiled: Claude Code native (Claude ignores AGENTS.md)
├── .cursor/rules/<name>.mdc         # compiled: Cursor native
└── GENE.md              # committable config / architecture decisions
```

**The Geneprint plugin itself** (this repo):

```
geneprint/
├── .claude-plugin/
│   ├── plugin.json               # Claude Code plugin manifest
│   └── marketplace.json          # self-marketplace (installable from this repo)
├── .mcp.json                     # declares the geneprint-diagnostics MCP server
├── commands/
│   ├── inherit.md                # /inherit — grow a gene-conforming skill
│   ├── eval.md                   # /eval — grade a skill against its eval cases
│   └── trace.md                  # /trace — runtime observability summary
├── gene/
│   └── golden-skill/             # the golden /review skill — the DNA seed /inherit replicates
│       ├── skill.yaml            #   metadata + when-to-use + self-describe (uses:)
│       ├── prompt.md             #   LLM review prompt
│       ├── scripts/
│       │   └── collect-diff.mjs  #   deterministic git diff (0 tokens)
│       ├── reference/
│       │   └── review-standards.md   # load-on-demand knowledge
│       └── evals/                #   example eval cases
├── lib/                          # deterministic Node.js engine
│   ├── fingerprint.mjs           #   content fingerprint (idempotency)
│   ├── manifest.mjs              #   .gene/gene.yaml read/write
│   ├── foundation.mjs            #   idempotent foundation stamping
│   ├── skill-install.mjs         #   fingerprint-idempotent install
│   ├── compiler.mjs              #   skills/ → AGENTS.md + .claude/skills + .cursor/rules
│   ├── scaffold.mjs              #   blank gene-conforming skill skeleton
│   ├── eval.mjs                  #   load / grade / summarize eval cases
│   ├── trace.mjs                 #   runtime observability (record / summarize)
│   ├── diagnostics.mjs           #   run a command → structured errors (for the MCP probe)
│   └── cli.mjs                   #   inherit + scaffold + eval + trace + CLI
├── hooks/
│   ├── hooks.json                # PostToolUse(Failure) → observe.mjs
│   └── observe.mjs               # passive trace logger (no-op outside gene projects)
├── mcp/
│   └── server.mjs                # zero-dep MCP stdio server (diagnostics tool)
├── test/                         # 55 tests (node:test)
│   ├── fingerprint.test.mjs
│   ├── manifest.test.mjs
│   ├── foundation.test.mjs
│   ├── skill-install.test.mjs
│   ├── compiler.test.mjs
│   ├── compiler-hosts.test.mjs
│   ├── cli.test.mjs
│   ├── collect-diff.test.mjs
│   ├── scaffold.test.mjs
│   ├── eval.test.mjs
│   ├── trace.test.mjs
│   ├── diagnostics.test.mjs
│   ├── mcp-server.test.mjs
│   └── acceptance.test.mjs       #   end-to-end (spec §9)
├── docs/superpowers/
│   ├── specs/                    # design spec
│   └── plans/                    # implementation plan
├── node_modules/                 # bundled (js-yaml) — zero-setup install
├── package.json                  # Node ESM project (dep: js-yaml)
├── package-lock.json
├── README.md
├── LICENSE                       # MIT
└── .gitignore
```

---

## Quick start

### As a Claude Code plugin (recommended)

```text
/plugin marketplace add lxb12123/geneprint
/plugin install geneprint@geneprint-marketplace
```

Then, inside any project, describe a skill you want:

```text
/geneprint:inherit
```

Claude interviews you, scaffolds a gene-conforming skill, and the engine imprints it into the project (`.gene/`, `skills/<name>/`, `AGENTS.md`). Re-run any time — it never clobbers existing files. Dependencies are bundled, so there is no setup step.

### From source / for development

Requirements: **Node ≥ 18** and **git**.

```bash
git clone https://github.com/lxb12123/geneprint && cd geneprint
npm test          # 55/55 should pass

# Scaffold a blank conforming skill, fill it, then imprint into any project:
node lib/cli.mjs scaffold /tmp/my-skill --name my-skill
node lib/cli.mjs inherit /path/to/project --name my-skill --from /tmp/my-skill

# Or imprint the bundled golden /review skill directly:
node lib/cli.mjs inherit /path/to/project --name review --from gene/golden-skill
```

To iterate on the plugin itself inside Claude Code: `claude --plugin-dir .` then `/reload-plugins`.

The bundled golden skill **`/review`** demonstrates all five genes: a deterministic `collect-diff.mjs` (0-token `git diff`) feeds an LLM review `prompt.md`, with standards loaded on demand.

---

## Status & roadmap

**Done & tested.** Idempotent `/inherit` engine, `scaffold` generator, the golden `/review` skill, host-native compilation (Claude / Cursor / AGENTS.md), a deterministic skill-**eval** harness (`/eval`), passive **runtime observability** (`/trace` hook), and a zero-dep **MCP diagnostics probe** (run build/test → structured errors for self-correction), installable as a Claude Code plugin — **55 passing tests**.

| Phase | Adds | Status |
|-------|------|--------|
| **A** | golden skill + foundation + idempotency core | ✅ |
| **B** | `/inherit` flow (interview → scaffold → fill → imprint) | ✅ |
| **C** | installable plugin + host-native compile (Claude / Cursor / AGENTS.md) | ✅ |
| **D** | skill-eval harness (`/eval`) + runtime observability (`/trace` hook) | ✅ · LLM-rubric grading next |
| **E** | MCP diagnostics probe (zero-dep stdio server, self-healing loop) | ✅ · subagents / permissions / versioning next |

Design docs live in [`docs/superpowers/specs/`](docs/superpowers/specs/) and [`docs/superpowers/plans/`](docs/superpowers/plans/).

---

## License

[MIT](LICENSE)
