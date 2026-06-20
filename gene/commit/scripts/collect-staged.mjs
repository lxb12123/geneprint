// gene/commit/scripts/collect-staged.mjs
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 确定性取"已暂存"的改动(只看 --cached),供 agent 0 token 读取。
export function collectStaged(cwd = process.cwd()) {
  const files = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const diff = execFileSync('git', ['diff', '--cached'], { cwd, encoding: 'utf8' });
  const status = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' });
  return { files, diff, status };
}

// 仅当作为脚本直接运行时执行(realpath 兼容 macOS /var→/private/var 符号链接)
function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

if (isMain()) {
  console.log(JSON.stringify(collectStaged(process.cwd())));
}
