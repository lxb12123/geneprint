// lib/registry.mjs — 技能版本与依赖
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

// 读技能源目录的 skill.yaml(取 version / dependencies 等)
export function readSkillMeta(skillDir) {
  const p = join(skillDir, 'skill.yaml');
  if (!existsSync(p)) return {};
  return yaml.load(readFileSync(p, 'utf8')) || {};
}

// 检查一个技能声明的 dependencies 是否都已安装(按名)
export function checkDependencies(installedNames, dependencies = []) {
  const missing = (dependencies || []).filter((d) => !installedNames.includes(d));
  return { ok: missing.length === 0, missing };
}
