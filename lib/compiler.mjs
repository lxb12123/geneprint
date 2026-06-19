// lib/compiler.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
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
      const meta = yaml.load(readFileSync(join(skillsDir, name, 'skill.yaml'), 'utf8')) || {};
      return { name, whenToUse: meta['when-to-use'] || '', description: meta.description || '' };
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
