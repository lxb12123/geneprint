// lib/compiler.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export function listSkills(targetDir) {
  const skillsDir = join(targetDir, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((n) => statSync(join(skillsDir, n)).isDirectory())
    .filter((n) => existsSync(join(skillsDir, n, 'skill.yaml')))
    .sort()
    .map((name) => {
      const dir = join(skillsDir, name);
      const meta = yaml.load(readFileSync(join(dir, 'skill.yaml'), 'utf8')) || {};
      const promptPath = join(dir, 'prompt.md');
      const prompt = existsSync(promptPath) ? readFileSync(promptPath, 'utf8') : '';
      return { name, whenToUse: meta['when-to-use'] || '', description: meta.description || '', prompt };
    });
}

export function renderAgentsMd(skills) {
  const lines = [
    '# AGENTS.md',
    '',
    '> 由 Geneprint 基因编译生成,供任意 AI 编码宿主读取。',
    '',
    '## Skills',
    '',
  ];
  for (const s of skills) {
    lines.push(`### ${s.name}`, '', s.description, '',
      `- 何时使用: ${s.whenToUse}`, `- 位置: \`skills/${s.name}/\``, '');
  }
  return lines.join('\n');
}

export function compileAgentsMd(targetDir) {
  const skills = listSkills(targetDir);
  writeFileSync(join(targetDir, 'AGENTS.md'), renderAgentsMd(skills), 'utf8');
  return skills.length;
}

// ---- host-specific compilation -------------------------------------------
// 把每个 gene 技能编译成各宿主真正会读的原生格式。脚本/知识仍引用项目相对
// 路径 skills/<name>/...(技能真身),不复制。只写 gene 技能对应的文件。

function fullDescription(s) {
  return s.whenToUse ? `${s.description} ${s.whenToUse}`.trim() : s.description;
}

// Claude Code 读 .claude/skills/<name>/SKILL.md(它不读 AGENTS.md)
export function renderClaudeSkill(s) {
  const fm = yaml.dump({ description: fullDescription(s) }).trimEnd();
  return `---\n${fm}\n---\n\n${s.prompt}`;
}

export function compileClaudeSkills(targetDir) {
  const skills = listSkills(targetDir);
  for (const s of skills) {
    const dir = join(targetDir, '.claude', 'skills', s.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), renderClaudeSkill(s), 'utf8');
  }
  return skills.length;
}

// Cursor 读 .cursor/rules/<name>.mdc(alwaysApply:false → agent 按相关性选用)
export function renderCursorRule(s) {
  const fm = yaml.dump({ description: fullDescription(s), alwaysApply: false }).trimEnd();
  return `---\n${fm}\n---\n\n${s.prompt}`;
}

export function compileCursorRules(targetDir) {
  const skills = listSkills(targetDir);
  if (skills.length) mkdirSync(join(targetDir, '.cursor', 'rules'), { recursive: true });
  for (const s of skills) {
    writeFileSync(join(targetDir, '.cursor', 'rules', `${s.name}.mdc`), renderCursorRule(s), 'utf8');
  }
  return skills.length;
}

// 一份源 → AGENTS.md(开放标准, Copilot/Gemini 读)+ Claude 原生 + Cursor 原生
export function compileAll(targetDir) {
  compileAgentsMd(targetDir);
  compileClaudeSkills(targetDir);
  return compileCursorRules(targetDir);
}
