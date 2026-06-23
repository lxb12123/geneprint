# Agent Path Forge

<p align="center">
  <img src="docs/images/banner.svg" alt="Agent Path Forge — describe one idea, ship a whole installable multi-host plugin" width="100%">
</p>

> **Give it one idea, and your AI coding agent builds — and ships — a complete, installable plugin on a proven, reusable architecture.**

Agent Path Forge is a **plugin factory** for AI coding agents. Describe an idea, and the agent grows it into a real, **installable, multi-host plugin** that you can `/plugin install` and run on Claude Code, Codex, Cursor, Copilot, or Gemini. One command produces the whole package: a [`plugin.json` + `marketplace.json`](https://docs.claude.com/en/docs/claude-code/plugins) manifest, skills, slash-commands, subagents, an MCP tool, hooks, rules, and its own README — all assembled on a proven, reusable architecture that everything you grow afterward inherits.

It's a one-command, **zero-dependency** tool, idempotent (re-run any time, never clobbers your files), and the plugin it builds is yours to keep and publish.

It works because it imprints an agent-native **[golden path](https://www.redhat.com/en/topics/platform-engineering/golden-paths)** (a.k.a. *paved road*): a proven, opinionated architecture you build on. At a big company, setting up a golden path takes a whole platform team; here your AI agent does it for you — from a single idea.

---

## What you get — the architecture your agent inherits

This is the architecture Agent Path Forge imprints. Every skill or tool your agent grows is born with these traits — that's the entire point:

- ⚡ **Deterministic + LLM split.** Exact, repeatable work runs in `scripts/` (0 tokens); judgment lives in `prompt.md`. Faster, cheaper, and reproducible — not one giant brittle prompt.
- 🌐 **Runs on every host.** One source compiles to the open `AGENTS.md` standard **plus** each host's native format (Claude `SKILL.md`, Cursor `.mdc`, project subagents). Never locked to one IDE.
- 🪶 **Lean & self-contained.** Three-tier lazy loading (metadata → body → `reference/`) loads only what's needed, and the engine has **zero runtime dependencies** — pure Node, nothing to install.
- 📦 **Yours & committable.** Config and memory are plain files in your repo (`GENE.md`, `MEMORY.md`, `.gene/`). No lock-in, no hidden state — the architecture becomes the project's own.
- 🔍 **Self-describing & verifiable.** Each skill declares the tools/permissions it uses (compiled into real host config), and ships with built-in evals (`/eval`) and runtime tracing (`/trace`).
- 🚀 **Installable & shippable.** `pack` turns the project into a `/plugin install`-able plugin — manifest + plugin-root skills + subagents + its own README (slash-commands opt-in) — that you publish and others install. Not just files in your repo; a distributable product.

…and the command that imprints all this is **strictly idempotent** — run it any number of times, same result, **never clobbers your files** — then it **gets out of the way**.

---

## How it works

### The one command: `/inherit` (idempotent, self-bootstrapping)

```
/inherit  + an idea
   │
   ├─ gene foundation present?  no → stamp it (.gene/, GENE.md, MEMORY.md, skills/)   yes → skip
   ├─ scaffold a blank gene-conforming skill → agent fills it in
   ├─ install it (fingerprint-idempotent) + record version in .gene/gene.json
   └─ recompile host outputs (AGENTS.md · .claude/skills · .claude/agents · .cursor/rules · rules · ignore)
```

Same inputs → identical tree. Re-runs never mutate existing files (content-fingerprint + manifest check).

### Ship it as a plugin: `pack`

Grow skills with `/inherit`, then turn the project into an **installable, multi-host plugin**:

```
node lib/cli.mjs pack /path/to/project     # or: /inherit … --target plugin (one step)
   │
   ├─ .claude-plugin/plugin.json + marketplace.json   → /plugin install-able
   ├─ skills/<name>/SKILL.md                            → skills at the PLUGIN ROOT (Claude reads here)
   ├─ agents/<skill>-<file>.md                          → bundled subagents
   ├─ commands/<name>.md                                → opt-in Claude slash-command per skill (plugin.commands:true; off by default — a skill is already a /<name> entry)
   ├─ AGENTS.md + .cursor/rules/                         → still cross-host
   └─ README.md (created if absent) · .mcp.json / hooks/hooks.json (only if a .gene source exists)
```

Plugin metadata comes from a `plugin` object in `.gene/gene.json` (name · description · version · author · license); absent fields fall back to sensible defaults. `pack` is idempotent — mirror artifacts are regenerated, your hand-written `README.md` is never clobbered. The result is a real plugin you can `/plugin install` and publish.

**Slash-command input hints.** Add an optional `argument-hint:` to a skill's `skill.yaml` and the generated Claude Code command shows it as a placeholder after you type the command and a space (e.g. `/eval ` → `skills/<name>`). It's host-neutral source — only the Claude command renderer consumes it; `AGENTS.md`, Cursor rules, and `SKILL.md` ignore it. Omit the field and nothing changes.

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
│   ├── gene.json        # gene version + product manifest (name · fingerprint · version)
│   ├── ignore           # ignore-primitive source — only if you use the ignore primitive
│   ├── trace.jsonl      # runtime observability log — appears after a tool call (local; git-ignored)
│   └── .gitignore       # ignores trace.jsonl
├── skills/<name>/       # gene-conforming products (source of truth)
│   ├── skill.yaml       #   metadata + when-to-use + version + uses{mcp,permissions,subagents}
│   ├── prompt.md        #   LLM semantic layer
│   ├── scripts/         #   deterministic layer (0 tokens)
│   ├── reference/       #   load-on-demand knowledge
│   ├── evals/           #   eval cases (graded by /eval)
│   └── subagents/       #   optional bundled subagent defs
├── rules/<name>.md      # rules-primitive source — only if you use the rules primitive
├── AGENTS.md            # compiled: open standard — Skills (+ Rules) (Codex / Cursor / Copilot / Gemini)
├── CLAUDE.md            # compiled: rules → managed block — only when rules exist (Claude native)
├── .claude/skills/<name>/SKILL.md   # compiled: Claude native (+ allowed-tools from uses.permissions)
├── .claude/agents/<name>.md         # compiled: Claude project subagents
├── .cursor/rules/<name>.mdc         # compiled: Cursor native (skills + rules)
├── .gitignore · .cursorignore · .geminiignore   # compiled: ignore → managed block — only when ignore is configured
├── GENE.md              # committable config / architecture decisions
└── MEMORY.md            # committable cross-session memory
```

**The Agent Path Forge plugin itself** (this repo):

```
agent-path-forge/
├── .claude-plugin/
│   ├── plugin.json               # Claude Code plugin manifest
│   └── marketplace.json          # self-marketplace (installable from this repo)
├── .mcp.json                     # declares the agent-path-forge-diagnostics MCP server
├── registry.json                 # distribution registry — golden skills resolvable by name
├── .github/workflows/ci.yml      # CI — node --test on push / PR
├── commands/
│   ├── inherit.md                # /inherit — grow a gene-conforming skill
│   ├── eval.md                   # /eval  — grade a skill (deterministic + LLM-rubric)
│   └── trace.md                  # /trace — runtime observability summary
├── gene/                         # bundled golden skills (registry sources) — DNA seeds /inherit replicates
│   ├── golden-skill/             #   /review — diff → LLM review (+ review-verifier subagent)
│   ├── commit/                   #   /commit — staged diff → Conventional Commits message
│   ├── pr-description/           #   /pr-description — branch commits → PR description
│   │                             #   (above: deterministic-gather + LLM — skill.yaml · prompt.md · scripts/ · reference/ · evals/)
│   └── skill-design/             #   /skill-design — process/methodology skill (checklist + flow + red-flags, NO script)
├── lib/                          # deterministic engine (Node ESM; ZERO dependencies)
│   ├── fingerprint.mjs           #   content fingerprint (idempotency)
│   ├── yaml-lite.mjs             #   tiny built-in YAML reader/writer (replaces js-yaml)
│   ├── manifest.mjs              #   .gene/gene.json read/write + versions
│   ├── foundation.mjs            #   idempotent foundation stamping
│   ├── skill-install.mjs         #   fingerprint-idempotent install
│   ├── compiler.mjs              #   → AGENTS.md + .claude/{skills,agents} + .cursor/rules (+ rules, ignore)
│   ├── rules.mjs                 #   rules primitive → Cursor .mdc + AGENTS.md + CLAUDE.md block
│   ├── ignore.mjs                #   ignore primitive → .gitignore/.cursorignore/.geminiignore block
│   ├── managed-block.mjs         #   idempotent agent-path-forge-managed block in shared host files
│   ├── scaffold.mjs              #   blank gene-conforming skill skeleton
│   ├── eval.mjs                  #   load / grade / summarize eval cases
│   ├── trace.mjs                 #   runtime observability (record / summarize)
│   ├── diagnostics.mjs           #   run a command → structured errors (MCP probe)
│   ├── registry.mjs              #   skill version/deps + distribution registry (resolve by name)
│   ├── plugin-target.mjs         #   "plugin target" compile → installable multi-host plugin (pack)
│   └── cli.mjs                   #   inherit / pack / scaffold / eval / trace / list + CLI
├── hooks/
│   ├── hooks.json                # PostToolUse(Failure) → observe.mjs
│   └── observe.mjs               # passive trace logger (no-op outside gene projects)
├── mcp/
│   └── server.mjs                # zero-dep MCP stdio server (diagnostics tool)
├── test/                         # 130 tests (node:test), 26 files
├── docs/design/{specs,plans}/        # design spec + implementation plan
├── package.json                  # no dependencies — nothing to install
└── README.md · LICENSE · .gitignore
```

---

## Quick start

### As a Claude Code plugin (recommended)

```text
/plugin marketplace add lxb12123/agent-path-forge
/plugin install agent-path-forge@agent-path-forge-marketplace
```

Then, in any project:

```text
/agent-path-forge:inherit             # describe a skill → it's imprinted + compiled to every host
/agent-path-forge:eval skills/<name>  # grade a skill against its eval cases
/agent-path-forge:trace .             # runtime observability summary
```

Claude interviews you, scaffolds a gene-conforming skill, and imprints it (`.gene/`, `skills/<name>/`, host outputs). Re-run any time — it never clobbers existing files. It has **zero dependencies**, so there's nothing to install.

### From source / for development

Requirements: **Node ≥ 18** and **git**.

```bash
git clone https://github.com/lxb12123/agent-path-forge && cd agent-path-forge
npm test          # all tests pass (no install needed — zero deps)

# Imprint the bundled golden /review skill into any project:
node lib/cli.mjs inherit /path/to/project --name review --from gene/golden-skill
```

### Test a forged plugin locally before shipping

After you `pack` a plugin, verify it on a host before publishing:

```bash
# 1. Pack the project into an installable plugin (or use /inherit … --target plugin)
node lib/cli.mjs pack /path/to/plugin

# 2a. Claude Code — load straight from the source dir (no cache copy):
claude --plugin-dir /path/to/plugin     # then /reload-plugins, and /<skill> to use it
# 2b. Or via a local marketplace:
#   /plugin marketplace add /path/to/plugin
#   /plugin install <name>@<name>-marketplace

# 3. Codex — drop the skills into the skills dir, then start codex:
cp -r /path/to/plugin/skills/* ~/.codex/skills/
```

**Gotcha:** `/plugin install` copies the plugin into a version-pinned cache
(`~/.claude/plugins/cache/.../<version>/`). Editing your source afterwards
**won't** update the installed copy — `/reload-plugins` re-reads the cache, not
your source. While iterating, either use `claude --plugin-dir .` (reads source
directly) or bump the version so the cache refreshes.

---

## Why — the philosophy

The two usual ways to make agents build consistently each cost you something. **Scaffolders** (`create-react-app`, cookiecutter) hand you a *dead* directory — no governance, no inheritance. **Heavyweight methodologies** make you adopt their whole process — roles, phases, ceremony — and live inside it.

Agent Path Forge takes a third path — **heredity, not methodology.** It imprints a small, opinionated architecture gene, everything your agent grows inherits it, and then it leaves. The value isn't the feature list (others have those) — it's the **purity, form, and idempotency**: a clean architecture any agent can grow on, that you own the moment it lands.

---

## Prior art & acknowledgements

This project stands on established work — it does not claim to have invented the patterns it imprints:

- **Progressive disclosure / three-tier skill loading** is the community's well-documented pattern for token-efficient skills (and the subject of survey work).
- **[Golden paths / paved roads](https://www.redhat.com/en/topics/platform-engineering/golden-paths)** come from platform engineering.
- **`AGENTS.md`** is an emerging open standard for agent instructions, read by Codex and others.
- Frameworks like **BMAD** already generate installable, multi-host agent components from a guided conversation.

What this project contributes is the **synthesis**: distilling these into a single *inheritable* foundation, plus idempotency by construction (content-fingerprinting — re-run safely, never clobber your files) and an actual multi-host *compiler* rather than portability in principle.

---

## License

[MIT](LICENSE) © lxb12123
