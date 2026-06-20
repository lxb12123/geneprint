// gene/pr-description/scripts/collect-commits.mjs
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 确定性取"本分支相对基线"的提交标题与改动规模,供 agent 0 token 读取。
export function collectCommits(cwd = process.cwd(), base = 'main') {
  const range = `${base}..HEAD`;
  const commits = execFileSync('git', ['log', range, '--pretty=%s'], { cwd, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const diffstat = execFileSync('git', ['diff', '--stat', range], { cwd, encoding: 'utf8' });
  return { base, commits, diffstat };
}

// 仅当作为脚本直接运行时执行(realpath 兼容 macOS /var→/private/var 符号链接)
function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

if (isMain()) {
  console.log(JSON.stringify(collectCommits(process.cwd(), process.argv[2] || 'main')));
}
