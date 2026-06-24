# Architecture & Philosophy

This document is the *why* behind [Agent Plugin Kit](../README.md). The README shows you what it does and how to use it; this is the reasoning the design rests on. Read it if you want to understand — or extend — the project.

---

## 1. Agent = Model + Harness

An AI coding agent is two things:

```
agent  =  model  +  harness
```

The **model** supplies judgment. The **harness** supplies everything around the judgment: what the agent can see, how it acts, how it checks its own work, and how all of that is packaged so it can run again tomorrow, on a different machine, for a different person.

Most tooling pours effort into the prompt — the model side. Agent Plugin Kit is a **harness factory**: it produces the durable structure around the judgment, so a capability you build once keeps working long after the conversation that created it ends.

---

## 2. Why prompts aren't enough

A prompt is the fastest way to make an agent do something. It is also the least durable.

A one-off prompt typically has:

- no structure — it's a wall of text, not a system,
- no versioned memory — nothing carries between sessions,
- no host-specific outputs — it works in one tool and nowhere else,
- no evals — you can't tell if a change made it better or worse,
- no install path — you can't hand it to someone else as a unit,
- no safe way to regenerate it later without starting over.

Prompts **describe** behavior. Plugins **package** behavior. Agent Plugin Kit makes that package inherit a reliable architecture.

```
prompt   →  tells an agent what to do once
plugin   →  gives the agent a reusable path for doing it again
```

---

## 3. What "inherited architecture" means

Most AI coding tools make agents *follow instructions*. Agent Plugin Kit makes agents *inherit an architecture*.

The core idea:

```
one idea
  ↓
inherited architecture          (the gene foundation)
  ↓
skills + commands + subagents + MCP + hooks + rules
  ↓
an installable, multi-host agent plugin
```

Instead of generating a loose folder of prompts, every plugin is imprinted with a proven structure — a small set of files that act as the plugin's *operating system*: `GENE.md`, `MEMORY.md`, `AGENTS.md`, skill definitions, host rules, manifests, evals, and traces. They are not just documentation. They are the inherited foundation that everything else is built on.

This is **heredity, not methodology**. Heavyweight frameworks make you adopt their whole process — roles, phases, ceremony — and live inside it. Scaffolders (`create-react-app`, cookiecutter) hand you a *dead* directory with no governance and no inheritance. Agent Plugin Kit takes a third path: it imprints a small, opinionated architecture gene, everything the agent grows inherits it, and then **it leaves**. The value isn't the feature list — others have those — it's the *purity, form, and idempotency*: a clean architecture any agent can grow on, that you own the moment it lands.

---

## 4. The five layers

The inherited architecture is organized as five layers. Every generated plugin has all five:

1. **Information layer — what the agent can see.**
   Three-tier lazy loading (metadata → body → `reference/`) plus committable `GENE.md`/`MEMORY.md`. The agent loads only what a task needs, and what it learns persists across sessions.

2. **Execution layer — how the agent acts.**
   The deterministic ⟂ semantic split: exact, repeatable work runs in `scripts/` (0 tokens, reproducible); judgment lives in `prompt.md`. Not one giant brittle prompt — a system where each half does what it's best at.

3. **Feedback layer — how the agent checks, traces, and improves its work.**
   Built-in evals (`/eval`), runtime tracing (`/trace` → `.gene/trace.jsonl`), and a `diagnostics` MCP tool that turns build/test output into structured errors the agent can act on.

4. **Portability layer — how one plugin targets many hosts.**
   One source compiles to the open `AGENTS.md` standard **plus** each host's native format (Claude `SKILL.md`, Cursor `.mdc`, project subagents). Never locked to one IDE.

5. **Inheritance layer — how architectural decisions survive regeneration.**
   The gene foundation (`.gene/`, content fingerprints, versioned manifest) means the same capability can be regenerated later without drift, and every *new* thing you grow is born with the same traits.

---

## 5. The five genes, in depth

The layers are realized as **5 genes** — concrete invariants every product is born with:

| # | Gene | What it guarantees | Lands as |
|---|------|--------------------|----------|
| ① | Deterministic + semantic split | Repeatable work is reproducible & free; judgment stays flexible | `scripts/` ⟂ `prompt.md` |
| ② | Multi-host compile + open standard | One source runs everywhere, no per-host rewrite | `AGENTS.md` + `.claude/{skills,agents}` + `.cursor/rules` |
| ③ | Three-tier lazy loading | Token-efficient — only the needed tier loads | metadata → body → `reference/` |
| ④ | Committable artifacts | No hidden state; the architecture is the project's own | `GENE.md` (config) ⟂ `MEMORY.md` (memory) |
| ⑤ | Self-describing primitives | A skill declares its own tools/permissions, compiled into real host config | `skill.yaml` `uses:` → `allowed-tools` + AGENTS.md deps |

---

## 6. Multi-host compilation

Portability "in principle" is a README claim. Agent Plugin Kit ships an actual **compiler**: one gene-conforming source is compiled to every host's real format.

```
skills/<name>/  (source of truth)
   │
   ├─► AGENTS.md                      open standard  (Codex · Cursor · Copilot · Gemini)
   ├─► .claude/skills/<name>/SKILL.md Claude native  (+ allowed-tools from uses.permissions)
   ├─► .claude/agents/<name>.md       Claude project subagents
   ├─► .cursor/rules/<name>.mdc       Cursor native
   └─► CLAUDE.md / *ignore blocks     managed blocks, only when rules/ignore are configured
```

Shared host files (`CLAUDE.md`, `.gitignore`, …) are edited through **managed blocks** delimited by markers, so compilation updates only its own block and leaves the user's other content untouched.

---

## 7. `GENE.md` / `MEMORY.md` design

Two committable files separate two concerns that tools usually entangle:

- **`GENE.md` — config & architecture decisions.** The *why* of this project's structure. Stable, intentional, human-authored.
- **`MEMORY.md` — cross-session memory.** What was learned along the way. Append-oriented, evolving.

Both are plain files in your repo. There is no database, no lock file, no hidden state — the foundation lives in version control alongside the code it governs, which means it is reviewable, diffable, and yours.

---

## 8. Why idempotency matters

A generator you can only run *once* is a scaffolder. A generator you can run **any number of times, safely** is infrastructure.

Agent Plugin Kit is idempotent by construction: every artifact is content-fingerprinted and recorded in `.gene/gene.json`. Re-running `/inherit` or `pack`:

- re-stamps only what changed,
- **never clobbers** your hand-written files (your `README.md`, your edits),
- produces an identical tree from identical inputs.

This is what makes the inheritance layer real. Because regeneration is safe, the architecture can be *refreshed* as the gene evolves — you adopt improvements without losing your work, and without the fear that re-running the tool will overwrite something you care about.

---

## 9. Future direction

The foundation is a small set of genes and an honest compiler. Natural directions from here:

- **More primitives & hosts** as the agent-tooling ecosystem standardizes.
- **Richer evals** — beyond contains/regex + LLM-rubric, toward scenario and regression suites.
- **Gene versioning & migration** — automatically upgrading a project from an older gene to a newer one, idempotently.
- **A larger registry** of golden skills that `/inherit --from <name>` can replicate.

The goal isn't only to create plugins faster. It's to make agent capabilities **reusable, installable, portable, version-controlled, safe to regenerate, and understandable by both humans and agents.**

> Prompts describe behavior. Plugins package behavior. Agent Plugin Kit makes that package inherit a reliable architecture.
