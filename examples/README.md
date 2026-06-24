# Examples

Real, **unedited** output from the engine — so you can see exactly what Agent Plugin Kit produces before you run it yourself. Nothing here is hand-written.

## [`review-plugin/`](review-plugin/) — a code-review plugin, generated end-to-end

Produced in **one command**, from the bundled golden `/review` skill:

```bash
node lib/cli.mjs inherit examples/review-plugin --name review --from review --target plugin
```

`inherit` grows the skill into the project; `--target plugin` also `pack`s it into an installable plugin. The result is **two forms in one directory**:

### The source (what you author / own)

```
review-plugin/skills/review/
├── skill.yaml      # metadata + when-to-use + version + uses{permissions,subagents}
├── prompt.md       # the LLM semantic layer
├── scripts/        # deterministic layer (collect-diff.mjs — 0 tokens, reproducible)
├── reference/      # load-on-demand knowledge (review-standards.md)
├── evals/          # eval cases graded by /eval (no-changes, flags-null-deref)
└── subagents/      # bundled adversarial verifier
```

### The compiled host outputs (one source → every host)

| File | Host |
|------|------|
| `AGENTS.md` | open standard — Codex · Cursor · Copilot · Gemini |
| `.claude/skills/review/SKILL.md` | Claude Code native (+ `allowed-tools` from `uses.permissions`) |
| `.claude/agents/review-verifier.md` | Claude project subagent |
| `.cursor/rules/review.mdc` | Cursor native |

### The packed plugin (what you ship)

| File | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` + `marketplace.json` | makes it `/plugin install`-able |
| `skills/review/SKILL.md` | skills at the **plugin root** (where Claude reads them) |
| `agents/review-verifier.md` | bundled subagent |
| `README.md` | the plugin's own README (auto-generated when absent) |

### The inherited foundation

`GENE.md` (architecture decisions) · `MEMORY.md` (cross-session memory) · `.gene/gene.json` (gene version + per-skill fingerprint + version) — all plain, committable files. No hidden state.

## Notes

- **No `commands/` directory** — per-skill Claude slash-commands are opt-in (`plugin.commands: true`); a skill is already a `/<name>` entry, so they're off by default.
- **No `trace.jsonl`** — the runtime trace log only appears in `.gene/` after a tool actually runs.
- **Placeholder metadata** (`review-plugin authors`, `<owner>`) is the honest default. A real plugin sets `name` · `description` · `author` · `license` via the `plugin` object in `.gene/gene.json`.
- **Idempotent** — re-running the command above reproduces this exact tree and never clobbers a hand-edited `README.md`.

> Regenerate it yourself: delete `review-plugin/` and run the command above from the repo root.
