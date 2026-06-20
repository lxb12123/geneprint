// lib/registry.mjs — 技能版本/依赖 + 分发注册表(按名解析自带的黄金技能)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './yaml-lite.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));   // lib/ 的上一级 = 插件根

// 插件根目录(registry.json / gene/* 所在处)
export function pluginRoot() { return ROOT; }

// 读技能源目录的 skill.yaml(取 version / dependencies 等)
export function readSkillMeta(skillDir) {
  const p = join(skillDir, 'skill.yaml');
  if (!existsSync(p)) return {};
  try { return parseYaml(readFileSync(p, 'utf8')) || {}; }
  catch { return {}; }   // 损坏的 skill.yaml 不应崩溃整个 inherit
}

// 检查一个技能声明的 dependencies 是否都已安装(按名)
export function checkDependencies(installedNames, dependencies = []) {
  const missing = (dependencies || []).filter((d) => !installedNames.includes(d));
  return { ok: missing.length === 0, missing };
}

// 读分发注册表 registry.json(缺失/损坏 → 空目录,不抛)
export function loadRegistry(root = ROOT) {
  const p = join(root, 'registry.json');
  if (!existsSync(p)) return { skills: [] };
  try {
    const r = JSON.parse(readFileSync(p, 'utf8'));
    return { skills: Array.isArray(r.skills) ? r.skills : [] };
  } catch { return { skills: [] }; }
}

export function listRegistry(root = ROOT) { return loadRegistry(root).skills; }

// 把 --from 解析成技能源目录:已存在的路径原样返回;否则按注册表名查 → 源目录;查不到原样返回。
export function resolveSource(nameOrPath, root = ROOT) {
  if (!nameOrPath) return nameOrPath;
  if (existsSync(join(nameOrPath, 'skill.yaml'))) return nameOrPath;   // 是技能路径
  const entry = loadRegistry(root).skills.find((s) => s.name === nameOrPath);
  if (entry) {
    if (isAbsolute(entry.source)) throw new Error(`registry source must be relative: ${entry.source}`);
    const abs = resolve(root, entry.source);
    if (abs !== root && !abs.startsWith(root + sep)) {   // 限制在插件根内,防目录穿越
      throw new Error(`registry source escapes plugin root: ${entry.source}`);
    }
    return abs;
  }
  return nameOrPath;   // 未知名 → 原样返回(inherit 会给出友好报错)
}
