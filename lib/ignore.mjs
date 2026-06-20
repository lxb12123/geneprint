// lib/ignore.mjs — ignore 原语:基因声明"宿主应忽略的路径",编译进各 ignore 文件。
// 源:.gene/ignore(每行一个 glob;# 开头为注释,空行忽略)。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { upsertBlock } from './managed-block.mjs';

const START = '# >>> agent-path-forge:ignore >>>';
const END = '# <<< agent-path-forge:ignore <<<';
const TARGETS = ['.gitignore', '.cursorignore', '.geminiignore'];

export function loadIgnorePatterns(targetDir) {
  const p = join(targetDir, '.gene', 'ignore');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

// 把模式写进每个 ignore 文件的 agent-path-forge 托管块(幂等,保留用户其余条目)。
export function compileIgnore(targetDir) {
  const patterns = loadIgnorePatterns(targetDir);
  if (!patterns.length) return 0;
  const body = patterns.join('\n');
  for (const f of TARGETS) {
    const p = join(targetDir, f);
    const existing = existsSync(p) ? readFileSync(p, 'utf8') : '';
    writeFileSync(p, upsertBlock(existing, START, END, body), 'utf8');
  }
  return patterns.length;
}
