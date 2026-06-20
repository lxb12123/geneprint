// lib/rules.mjs — rules 原语:项目级常驻/按 glob 触发的指令,编译到各宿主原生格式。
// 源:rules/<name>.md(frontmatter: description, globs?, alwaysApply?),正文是指令本体。
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseYaml, toFrontmatter } from './yaml-lite.mjs';
import { upsertBlock } from './managed-block.mjs';

const CLAUDE_START = '<!-- agent-path-forge:rules:start -->';
const CLAUDE_END = '<!-- agent-path-forge:rules:end -->';

function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n?---\n?([\s\S]*)$/.exec(text);   // 也容忍空 frontmatter
  if (!m) return { data: {}, body: text };
  let data = {};
  try { data = parseYaml(m[1]) || {}; } catch { data = {}; }    // 坏 frontmatter 不崩溃整个编译
  if (typeof data !== 'object' || Array.isArray(data)) data = {};
  return { data, body: m[2] };
}

function normGlobs(g) {
  if (Array.isArray(g)) return g.map((x) => String(x).trim()).filter(Boolean);
  if (typeof g === 'string') return g.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export function listRules(targetDir) {
  const dir = join(targetDir, 'rules');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .sort()
    .map((file) => {
      const { data, body } = parseFrontmatter(readFileSync(join(dir, file), 'utf8'));
      return {
        name: file.replace(/\.md$/, ''),
        description: data.description || '',
        globs: normGlobs(data.globs),
        alwaysApply: data.alwaysApply !== false, // 默认常驻
        body: body.trim(),
      };
    });
}

// Cursor .mdc:有 globs → 自动附着(alwaysApply:false);无 globs 且 alwaysApply → 始终。
export function renderCursorRuleFromRule(r) {
  const fm = { description: r.description };
  if (r.globs.length) fm.globs = r.globs.join(',');
  fm.alwaysApply = r.globs.length ? false : r.alwaysApply;
  return `---\n${toFrontmatter(fm)}\n---\n\n${r.body}\n`;
}

// AGENTS.md 的 "## Rules" 段(开放标准:Cursor/Copilot/Gemini 都读)
export function renderRulesSection(rules) {
  if (!rules.length) return '';
  const lines = ['## Rules', ''];
  for (const r of rules) {
    lines.push(`### ${r.name}`, '');
    if (r.description) lines.push(r.description, '');
    lines.push(`- 适用: ${r.globs.length ? `globs ${r.globs.join(', ')}` : r.alwaysApply ? '始终' : '按需'}`, '');
    if (r.body) lines.push(r.body, '');
  }
  return lines.join('\n').trimEnd();
}

// CLAUDE.md 托管块的正文(Claude Code 读 CLAUDE.md 作为项目记忆)
function claudeRulesBody(rules) {
  return rules.map((r) => {
    const head = `### ${r.name}${r.globs.length ? ` (globs: ${r.globs.join(', ')})` : ''}`;
    return [head, r.description, r.body].filter(Boolean).join('\n\n');
  }).join('\n\n');
}

// 写 .cursor/rules/<name>.mdc + 把规则刻进 CLAUDE.md 的 agent-path-forge 托管块。
export function compileRules(targetDir) {
  const rules = listRules(targetDir);
  if (!rules.length) return 0;
  const cursorDir = join(targetDir, '.cursor', 'rules');
  mkdirSync(cursorDir, { recursive: true });
  for (const r of rules) {
    writeFileSync(join(cursorDir, `${r.name}.mdc`), renderCursorRuleFromRule(r), 'utf8');
  }
  const claudeMd = join(targetDir, 'CLAUDE.md');
  const existing = existsSync(claudeMd) ? readFileSync(claudeMd, 'utf8') : '';
  const body = `# Project rules (agent-path-forge)\n\n${claudeRulesBody(rules)}`;
  writeFileSync(claudeMd, upsertBlock(existing, CLAUDE_START, CLAUDE_END, body), 'utf8');
  return rules.length;
}
