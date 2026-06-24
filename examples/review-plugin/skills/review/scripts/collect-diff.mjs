// gene/golden-skill/scripts/collect-diff.mjs
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function collectDiff(cwd = process.cwd(), base = 'HEAD') {
  const files = execFileSync('git', ['diff', '--name-only', base], { cwd, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const diff = execFileSync('git', ['diff', base], { cwd, encoding: 'utf8' });
  return { files, diff };
}

// Run only when invoked directly as a script (realpath handles the macOS /var→/private/var symlink)
function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

// CLI: node collect-diff.mjs [base]  → print JSON (for the agent to read, 0-token reasoning)
if (isMain()) {
  console.log(JSON.stringify(collectDiff(process.cwd(), process.argv[2] || 'HEAD')));
}
