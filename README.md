# Agent Plugin Kit

<p align="center">
  <img src="docs/images/banner.svg" alt="Agent Plugin Kit — describe one idea, ship a complete installable multi-host plugin" width="100%">
</p>

> **Describe one idea — your AI coding agent builds *and ships* a complete, installable plugin that runs on Claude Code, Codex, Cursor, Copilot, and Gemini.**

Agent Plugin Kit turns a one-line idea into a real, **installable, multi-host plugin** — not a loose folder of prompts. One command produces the whole package: a `plugin.json` + `marketplace.json` manifest, skills, slash-commands, subagents, an MCP tool, hooks, rules, and its own README. It's **zero-dependency** (pure Node, nothing to `npm install`), **idempotent** (re-run any time — it never clobbers your files), and the plugin it builds is yours to keep and publish.

<sub>Node ≥ 18 · zero runtime dependencies · 131 tests · MIT</sub>

---

## ⚡ 30-second demo

**You say** (in any project):

```text
/agent-plugin-kit:inherit
> "a skill that reviews my git diff for bugs"
```

**It grows** a complete, gene-conforming skill — compiled to every host at once:

```text
skills/review/                     # ← source of truth
  skill.yaml  prompt.md  scripts/  reference/  evals/
AGENTS.md                          # ← open standard  (Codex · Cursor · Copilot · Gemini)
.claude/skills/review/SKILL.md     # ← Claude native  (+ allowed-tools)
.cursor/rules/review.mdc           # ← Cursor native
.gene/  ·  GENE.md  ·  MEMORY.md   # ← the committable foundation it inherits
```

**You ship it** as an installable plugin:

```text
node lib/cli.mjs pack .            # → .claude-plugin/plugin.json + marketplace.json
```

**Anyone installs and runs it** — on whatever host they use:

```text
/plugin install …    →    /review
```

That's the loop: **idea → installable plugin → runs everywhere.**

---

## Quick start

### As a Claude Code plugin (recommended)

```text
/plugin marketplace add lxb12123/agent-plugin-kit
/plugin install agent-plugin-kit@agent-plugin-kit-marketplace
```

Then, in any project:

```text
/agent-plugin-kit:inherit             # describe a skill → imprinted + compiled to every host
/agent-plugin-kit:eval skills/<name>  # grade a skill against its eval cases
/agent-plugin-kit:trace .             # runtime observability summary
```

Claude interviews you, scaffolds a gene-conforming skill, and imprints it (`.gene/`, `skills/<name>/`, host outputs). Re-run any time — it never clobbers existing files. **Zero dependencies**, so there's nothing to install.

### From source / for development

Requirements: **Node ≥ 18** and **git**.

```bash
git clone https://github.com/lxb12123/agent-plugin-kit && cd agent-plugin-kit
npm test          # all tests pass (no install needed — zero deps)

# Imprint the bundled golden /review skill into any project:
node lib/cli.mjs inherit /path/to/project --name review --from gene/golden-skill
```

---

## What it generates

From one idea, an agent can grow any of **8 primitives** — all implemented:

`skills` · `commands` · `mcp` · `hooks` · `subagents` · `permissions` · `rules` · `ignore`

Each lands as plain, committable files in **your** repo — no hidden state, no lock-in:

```text
<your-project>/
├── .gene/
│   ├── gene.json        # gene version + per-skill manifest (name · fingerprint · version)
│   └── trace.jsonl      # runtime observability log (local; git-ignored)
├── skills/<name>/       # gene-conforming products (source of truth)
│   ├── skill.yaml       #   metadata + when-to-use + version + uses{mcp,permissions,subagents}
│   ├── prompt.md        #   LLM semantic layer
│   ├── scripts/         #   deterministic layer (0 tokens)
│   ├── reference/       #   load-on-demand knowledge
│   └── evals/           #   eval cases (graded by /eval)
├── AGENTS.md            # compiled: open standard  (Codex · Cursor · Copilot · Gemini)
├── .claude/skills/<name>/SKILL.md   # compiled: Claude native (+ allowed-tools)
├── .claude/agents/<skill>-<file>.md # compiled: Claude project subagents
├── .cursor/rules/<name>.mdc         # compiled: Cursor native
├── GENE.md              # committable architecture decisions
└── MEMORY.md            # committable cross-session memory
```

Run `pack` and the same project becomes a `/plugin install`-able plugin — manifest + plugin-root skills + subagents + its own README (slash-commands opt-in).

---

## Why not just prompts?

A prompt tells an agent what to do *once*. Agent Plugin Kit gives the agent a **reusable, installable path** for doing it again — on any host, with evals and tracing built in.

| | Raw prompt | Scaffolder<br>(cookiecutter) | Single-host skill | **Agent Plugin Kit** |
|---|:---:|:---:|:---:|:---:|
| Reusable across projects | ❌ copy-paste | ⚠️ one-shot | ✅ | ✅ |
| Runs on every host | ❌ | ❌ | ❌ one IDE | ✅ AGENTS.md + native |
| Deterministic ⟂ LLM split | ❌ | n/a | ⚠️ | ✅ `scripts/` ⟂ `prompt.md` |
| Built-in evals + tracing | ❌ | ❌ | ❌ | ✅ `/eval` · `/trace` |
| Installable & shippable | ❌ | ❌ | ⚠️ | ✅ `/plugin install` |
| Idempotent re-runs | ❌ | ❌ regenerates | n/a | ✅ never clobbers |
| Versioned, committable memory | ❌ | ❌ | ❌ | ✅ `GENE.md` · `MEMORY.md` |

---

## How it works

### `/inherit` — grow a skill (idempotent, self-bootstrapping)

```text
/inherit  + an idea
   │
   ├─ gene foundation present?  no → stamp it (.gene/, GENE.md, MEMORY.md, skills/)   yes → skip
   ├─ scaffold a blank gene-conforming skill → agent fills it in
   ├─ install it (fingerprint-idempotent) + record version in .gene/gene.json
   └─ recompile host outputs (AGENTS.md · .claude/skills · .claude/agents · .cursor/rules · rules · ignore)
```

Same inputs → identical tree. Re-runs never mutate existing files (content-fingerprint + manifest check), then the tool **gets out of the way**.

### `pack` — ship it as a plugin

```text
node lib/cli.mjs pack /path/to/project     # or: /inherit … --target plugin (one step)
   │
   ├─ .claude-plugin/plugin.json + marketplace.json   → /plugin install-able
   ├─ skills/<name>/SKILL.md                            → skills at the PLUGIN ROOT (Claude reads here)
   ├─ agents/<skill>-<file>.md                          → bundled subagents
   ├─ commands/<name>.md                                → opt-in Claude slash-command per skill (off by default)
   ├─ AGENTS.md + .cursor/rules/                         → still cross-host
   └─ README.md (created if absent) · .mcp.json / hooks  (only if a .gene source exists)
```

`pack` is idempotent — mirror artifacts are regenerated, your hand-written `README.md` is never clobbered. Plugin metadata comes from a `plugin` object in `.gene/gene.json` (name · description · version · author · license); absent fields fall back to sensible defaults.

---

## Under the hood: the inherited architecture

Most tools make agents *follow instructions*. Agent Plugin Kit makes every plugin **inherit a proven architecture** — so everything you grow afterward is born with the same good traits. Each generated product carries **5 genes**:

| # | Gene | Lands as |
|---|------|----------|
| ① | Deterministic + semantic split | `scripts/` (deterministic, 0 tokens) ⟂ `prompt.md` (LLM judgment) |
| ② | Multi-host compile + open standard | one source → `AGENTS.md` + `.claude/{skills,agents}` + `.cursor/rules` |
| ③ | Three-tier lazy loading | metadata → body → `reference/` on demand |
| ④ | Committable artifacts | config `GENE.md` ⟂ memory `MEMORY.md` |
| ⑤ | Self-describing primitives | `skill.yaml` `uses:` → compiled to Claude `allowed-tools` + AGENTS.md deps |

The engine is **pure Node ESM with zero runtime dependencies** — a content-fingerprinting core for idempotency, a multi-host compiler, and a tiny built-in YAML reader (no `js-yaml`).

> **For the full philosophy — Agent = Model + Harness, why prompts aren't enough, the five architectural layers, and why idempotency matters — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).**

---

## Evals, tracing & diagnostics

Skills don't just generate — they're **verifiable and observable**:

- **`/eval`** — grade a skill against its `evals/` cases: deterministic assertions (contains / regex) **plus** optional LLM-rubric judging.
- **`/trace`** — runtime observability: a passive `PostToolUse` hook logs tool calls to `.gene/trace.jsonl` (no-ops outside gene projects); `/trace` summarizes by tool / skill / failures.
- **`diagnostics` MCP tool** — run `npm test` / build → structured `{exitCode, errors, tail}` so the agent can self-correct in an "error → probe → fix" loop.
- **registry** — `/inherit --from review` resolves a bundled golden skill by name (catalog in `registry.json`; `node lib/cli.mjs list` prints it).

The repo ships with **131 tests** (`node --test`, 26 files) and CI on every push/PR.

---

## Prior art & acknowledgements

This project stands on established work — it does not claim to have invented the patterns it imprints:

- **Progressive disclosure / three-tier skill loading** is the community's well-documented pattern for token-efficient skills.
- **[Golden paths / paved roads](https://www.redhat.com/en/topics/platform-engineering/golden-paths)** come from platform engineering.
- **`AGENTS.md`** is an emerging open standard for agent instructions, read by Codex and others.
- Frameworks like **BMAD** already generate installable, multi-host agent components from a guided conversation.

What this project contributes is the **synthesis**: distilling these into a single *inheritable* foundation, plus idempotency by construction (content-fingerprinting — re-run safely, never clobber your files) and an actual multi-host *compiler* rather than portability in principle. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reasoning.

---

## License

[MIT](LICENSE) © lxb12123
