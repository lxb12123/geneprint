// lib/plugin-target.mjs
// "插件目标"编译:把一个基因项目长出来的技能,产出成一个可 /plugin install 的
// 跨平台插件 —— 技能/子agent 落到插件根(Claude 读这里),并生成清单、命令与 README。
// 区别于 compiler.mjs 的"项目本地"编译(那是给"用技能的项目",技能落到 .claude/)。
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { toFrontmatter } from './yaml-lite.mjs';
import { listSkills, renderClaudeSkill, renderAgentsMd, compileCursorRules } from './compiler.mjs';
import { listRules } from './rules.mjs';
import { readManifest, hasGene } from './manifest.mjs';

const DEFAULT_VERSION = '0.1.0';

// 插件元信息来源:可提交的 .gene/gene.json 的 plugin 字段(基因④);缺省则按目录名推断。
export function pluginMeta(targetDir) {
  const m = readManifest(targetDir) || {};
  const p = (m && typeof m.plugin === 'object' && m.plugin) || {};
  const name = p.name || basename(targetDir);
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

// 每个技能给一个同名斜杠命令作为入口(插件原语之一);命令把活儿委托给技能。
export function renderCommand(s) {
  const fm = toFrontmatter({ description: s.description });
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
    '## Install (Claude Code)',
    '',
    '```text',
    `/plugin marketplace add <owner>/${meta.name}`,
    `/plugin install ${meta.name}@${meta.marketplace}`,
    '```',
    '',
  ];
  if (skills.length) {
    lines.push('## Skills', '');
    for (const s of skills) {
      lines.push(`- **/${s.name}** — ${s.description}${s.whenToUse ? ` _(use when: ${s.whenToUse})_` : ''}`);
    }
    lines.push('');
  }
  lines.push(
    '## Layout',
    '',
    '```',
    `${meta.name}/`,
    '├── .claude-plugin/        # plugin.json + marketplace.json (installable)',
    '├── skills/<name>/SKILL.md # skills (Claude reads these at the plugin root)',
    '├── agents/                # bundled subagents',
    '├── commands/<name>.md     # slash-command entry points',
    '└── AGENTS.md              # open standard — Cursor / Copilot / Gemini',
    '```',
    '',
  );
  return lines.join('\n');
}

// 把一个基因项目编译成"可安装插件"。生成的"镜像"产物(清单/SKILL.md/命令/AGENTS.md)
// 每次覆盖以与源保持同步;README 仅在缺失时创建(留给作者手写,不覆盖)。
export function compilePlugin(targetDir) {
  const meta = pluginMeta(targetDir);
  const skills = listSkills(targetDir);

  const cpDir = join(targetDir, '.claude-plugin');
  mkdirSync(cpDir, { recursive: true });
  writeFileSync(join(cpDir, 'plugin.json'), renderPluginJson(meta), 'utf8');
  writeFileSync(join(cpDir, 'marketplace.json'), renderMarketplaceJson(meta), 'utf8');

  // 技能落到插件根 skills/<name>/SKILL.md(与源 skill.yaml/prompt.md 共处一目录)
  for (const s of skills) {
    const dir = join(targetDir, 'skills', s.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), renderClaudeSkill(s), 'utf8');
  }

  // 子 agent 落到插件根 agents/<skill>-<file>.md
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

  // 每个技能一个斜杠命令
  if (skills.length) mkdirSync(join(targetDir, 'commands'), { recursive: true });
  for (const s of skills) {
    writeFileSync(join(targetDir, 'commands', `${s.name}.md`), renderCommand(s), 'utf8');
  }

  // MCP / hooks:只在源存在时原样拷出 —— 不凭空捏造服务器命令(诚实优先)
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

  // 跨宿主:开放标准 AGENTS.md + Cursor 原生
  writeFileSync(join(targetDir, 'AGENTS.md'), renderAgentsMd(skills, listRules(targetDir)), 'utf8');
  compileCursorRules(targetDir);

  // 插件自带 README —— 仅在缺失时生成(作者可改且不被覆盖)
  const readme = join(targetDir, 'README.md');
  if (!existsSync(readme)) writeFileSync(readme, renderPluginReadme(meta, skills), 'utf8');

  return { name: meta.name, skills: skills.length, agents, commands: skills.length, mcp, hooks };
}

// 把一个已有的基因项目打包成可安装插件(inherit 之后的第二步)
export function pack(targetDir) {
  if (!hasGene(targetDir)) {
    throw new Error('not an Agent Path Forge project (run `inherit` first to grow at least the foundation)');
  }
  return compilePlugin(targetDir);
}
