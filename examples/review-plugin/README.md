# review-plugin

review-plugin — an agent plugin forged by Agent Plugin Kit.

> Forged by [Agent Plugin Kit](https://github.com/lxb12123/agent-plugin-kit) — a multi-host agent plugin you can install and own.

## Quick start

### Claude Code

```text
/plugin marketplace add <owner>/review-plugin
/plugin install review-plugin@review-plugin-marketplace
```

Then use the slash commands below in any project.

### Codex (also Copilot / Gemini)

```bash
# Native skill install — Codex loads SKILL.md skills from its skills dir:
cp -r skills/* ~/.codex/skills/     # or cross-runtime (Codex + Copilot + Gemini): ~/.agents/skills/
```

Or project-scoped: append this plugin's `AGENTS.md` into your project-root `AGENTS.md`. Codex concatenates `AGENTS.md` from the repo root down — it's additive and never overrides your own.

### Cursor

This repo already ships `.cursor/rules/` — open the project in Cursor and the rules load automatically.

## Skills

- **/review** — Review the current changes (deterministically read the diff + LLM review) _(use when: Before committing or merging, when you need to review the correctness and quality of code changes)_

## Layout

```
review-plugin/
├── .claude-plugin/        # plugin.json + marketplace.json (installable)
├── skills/<name>/SKILL.md # skills (Claude reads these at the plugin root)
├── agents/                # bundled subagents
└── AGENTS.md              # open standard — Codex / Cursor / Copilot / Gemini
```
