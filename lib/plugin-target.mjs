// lib/plugin-target.mjs
// "Plugin target" compilation: take the skills grown in a gene project and produce a
// cross-platform plugin you can `/plugin install` — skills/subagents land at the plugin root
// (where Claude reads them), plus generated manifests, commands and a README.
// Distinct from compiler.mjs's "project-local" compilation (that targets the "project that uses skills",
// where skills land in .claude/).
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { toFrontmatter } from './yaml-lite.mjs';
import { listSkills, renderClaudeSkill, renderAgentsMd, compileCursorRules } from './compiler.mjs';
import { listRules } from './rules.mjs';
import { readManifest, hasGene } from './manifest.mjs';

const DEFAULT_VERSION = '0.1.0';

// Plugin metadata comes from the plugin field of the committable .gene/gene.json (gene #4); falls back to the directory name when absent.
export function pluginMeta(targetDir) {
  const m = readManifest(targetDir) || {};
  const p = (m && typeof m.plugin === 'object' && m.plugin) || {};
  const name = p.name || basename(resolve(targetDir)) || 'plugin';
  const author = p.author || { name: `${name} authors` };
  return {
    name,
    description: p.description || `${name} — an agent plugin forged by Agent Path Forge.`,
    version: p.version || DEFAULT_VERSION,
    author,
    homepage: p.homepage,
    repository: p.repository,
    license: p.license || 'MIT',
    marketplace: p.marketplace || `${name}-marketplace`,
    owner: p.owner || author,
    // opt-in: emit a Claude slash-command per skill. Default off — a SKILL.md skill is
    // already a /<name> entry in Claude (and auto-triggers + works cross-host), so a
    // same-named command is a redundant duplicate entry. Set "commands": true to add them.
    commands: p.commands === true,
  };
}

export function renderPluginJson(meta) {
  const obj = { name: meta.name, description: meta.description, version: meta.version, author: meta.author };
  if (meta.homepage) obj.homepage = meta.homepage;
  if (meta.repository) obj.repository = meta.repository;
  obj.license = meta.license;
  return `${JSON.stringify(obj, null, 2)}\n`;
}

export function renderMarketplaceJson(meta) {
  const owner = typeof meta.owner === 'string' ? { name: meta.owner } : meta.owner;
  const obj = {
    name: meta.marketplace,
    owner,
    plugins: [{ name: meta.name, source: './', description: meta.description, version: meta.version }],
  };
  return `${JSON.stringify(obj, null, 2)}\n`;
}

// Each skill gets a same-named slash command as its entry point (one of the plugin primitives); the command delegates the work to the skill.
export function renderCommand(s) {
  const fm = toFrontmatter({
    description: s.description,
    // argument-hint is consumed only by Claude Code slash commands (shows an input hint after a space); only written when present, for backward compatibility
    ...(s.argumentHint ? { 'argument-hint': s.argumentHint } : {}),
  });
  const when = s.whenToUse ? `\nWhen to use: ${s.whenToUse}\n` : '';
  return `---\n${fm}\n---\n\nUse the **${s.name}** skill to handle this request.\n${when}`;
}

export function renderPluginReadme(meta, skills) {
  const lines = [
    `# ${meta.name}`,
    '',
    meta.description,
    '',
    '> Forged by [Agent Path Forge](https://github.com/lxb12123/agent-path-forge) — a multi-host agent plugin you can install and own.',
    '',
    '## Quick start',
    '',
    '### Claude Code',
    '',
    '```text',
    `/plugin marketplace add <owner>/${meta.name}`,
    `/plugin install ${meta.name}@${meta.marketplace}`,
    '```',
    '',
    'Then use the slash commands below in any project.',
    '',
    '### Codex (also Copilot / Gemini)',
    '',
    '```bash',
    '# Native skill install — Codex loads SKILL.md skills from its skills dir:',
    'cp -r skills/* ~/.codex/skills/     # or cross-runtime (Codex + Copilot + Gemini): ~/.agents/skills/',
    '```',
    '',
    "Or project-scoped: append this plugin's `AGENTS.md` into your project-root `AGENTS.md`. Codex concatenates `AGENTS.md` from the repo root down — it's additive and never overrides your own.",
    '',
    '### Cursor',
    '',
    'This repo already ships `.cursor/rules/` — open the project in Cursor and the rules load automatically.',
    '',
  ];
  if (skills.length) {
    lines.push('## Skills', '');
    for (const s of skills) {
      lines.push(`- **/${s.name}** — ${s.description}${s.whenToUse ? ` _(use when: ${s.whenToUse})_` : ''}`);
    }
    lines.push('');
  }
  const layout = [
    '## Layout',
    '',
    '```',
    `${meta.name}/`,
    '├── .claude-plugin/        # plugin.json + marketplace.json (installable)',
    '├── skills/<name>/SKILL.md # skills (Claude reads these at the plugin root)',
    '├── agents/                # bundled subagents',
  ];
  if (meta.commands) layout.push('├── commands/<name>.md     # opt-in Claude slash-command per skill');
  layout.push(
    '└── AGENTS.md              # open standard — Codex / Cursor / Copilot / Gemini',
    '```',
    '',
  );
  lines.push(...layout);
  return lines.join('\n');
}

// Compile a gene project into an "installable plugin". The generated "mirror" artifacts (manifest/SKILL.md/commands/AGENTS.md)
// are overwritten each time to stay in sync with the source; the README is only created when missing (left for the author to hand-write, never overwritten).
export function compilePlugin(targetDir) {
  const meta = pluginMeta(targetDir);
  const skills = listSkills(targetDir);

  const cpDir = join(targetDir, '.claude-plugin');
  mkdirSync(cpDir, { recursive: true });
  writeFileSync(join(cpDir, 'plugin.json'), renderPluginJson(meta), 'utf8');
  writeFileSync(join(cpDir, 'marketplace.json'), renderMarketplaceJson(meta), 'utf8');

  // Skills land at the plugin root under skills/<name>/SKILL.md (sharing a directory with the source skill.yaml/prompt.md)
  for (const s of skills) {
    const dir = join(targetDir, 'skills', s.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), renderClaudeSkill(s), 'utf8');
  }

  // Subagents land at the plugin root under agents/<skill>-<file>.md
  let agents = 0;
  for (const s of skills) {
    const subDir = join(targetDir, 'skills', s.name, 'subagents');
    if (!existsSync(subDir)) continue;
    const agentsDir = join(targetDir, 'agents');
    mkdirSync(agentsDir, { recursive: true });
    for (const f of readdirSync(subDir).filter((n) => n.endsWith('.md'))) {
      writeFileSync(join(agentsDir, `${s.name}-${f}`), readFileSync(join(subDir, f), 'utf8'), 'utf8');
      agents += 1;
    }
  }

  // Opt-in slash commands (meta.commands): a SKILL.md skill is already a /<name> entry
  // in Claude, so emitting a same-named command duplicates it. Off by default.
  let commands = 0;
  if (meta.commands && skills.length) {
    mkdirSync(join(targetDir, 'commands'), { recursive: true });
    for (const s of skills) {
      writeFileSync(join(targetDir, 'commands', `${s.name}.md`), renderCommand(s), 'utf8');
    }
    commands = skills.length;
  }

  // MCP / hooks: copied out verbatim only when the source exists — never fabricate server commands out of thin air (honesty first)
  const mcpSrc = join(targetDir, '.gene', 'mcp.json');
  let mcp = false;
  if (existsSync(mcpSrc)) { writeFileSync(join(targetDir, '.mcp.json'), readFileSync(mcpSrc, 'utf8'), 'utf8'); mcp = true; }
  const hooksSrc = join(targetDir, '.gene', 'hooks.json');
  let hooks = false;
  if (existsSync(hooksSrc)) {
    mkdirSync(join(targetDir, 'hooks'), { recursive: true });
    writeFileSync(join(targetDir, 'hooks', 'hooks.json'), readFileSync(hooksSrc, 'utf8'), 'utf8');
    hooks = true;
  }

  // Cross-host: open-standard AGENTS.md + native Cursor
  writeFileSync(join(targetDir, 'AGENTS.md'), renderAgentsMd(skills, listRules(targetDir)), 'utf8');
  compileCursorRules(targetDir);

  // Plugin's bundled README — generated only when missing (authors can edit it and it won't be overwritten)
  const readme = join(targetDir, 'README.md');
  if (!existsSync(readme)) writeFileSync(readme, renderPluginReadme(meta, skills), 'utf8');

  return { name: meta.name, skills: skills.length, agents, commands, mcp, hooks };
}

// Pack an existing gene project into an installable plugin (the second step after inherit)
export function pack(targetDir) {
  if (!hasGene(targetDir)) {
    throw new Error('not an Agent Path Forge project (run `inherit` first to grow at least the foundation)');
  }
  return compilePlugin(targetDir);
}
