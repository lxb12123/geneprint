// test/ignore.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadIgnorePatterns, compileIgnore } from '../lib/ignore.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-ign-')); }
function setIgnore(dir, text) {
  mkdirSync(join(dir, '.gene'), { recursive: true });
  writeFileSync(join(dir, '.gene', 'ignore'), text, 'utf8');
}

test('loadIgnorePatterns 去掉注释与空行', () => {
  const d = tmp();
  setIgnore(d, '# 机密\nsecrets/\n\n*.key\n');
  assert.deepEqual(loadIgnorePatterns(d), ['secrets/', '*.key']);
  rmSync(d, { recursive: true, force: true });
});

test('compileIgnore 写三个 ignore 文件的托管块,幂等,保留用户条目', () => {
  const d = tmp();
  setIgnore(d, 'secrets/\n*.key\n');
  writeFileSync(join(d, '.gitignore'), 'node_modules/\n', 'utf8'); // 用户已有
  const n = compileIgnore(d);
  assert.equal(n, 2);
  for (const f of ['.gitignore', '.cursorignore', '.geminiignore']) {
    assert.equal(existsSync(join(d, f)), true);
    assert.match(readFileSync(join(d, f), 'utf8'), /agent-path-forge:ignore/);
    assert.match(readFileSync(join(d, f), 'utf8'), /secrets\//);
  }
  const git1 = readFileSync(join(d, '.gitignore'), 'utf8');
  assert.match(git1, /node_modules\//);                 // 用户条目保留
  compileIgnore(d);
  assert.equal(readFileSync(join(d, '.gitignore'), 'utf8'), git1); // 幂等
  rmSync(d, { recursive: true, force: true });
});

test('无 ignore 源 → no-op,返回 0,不创建文件', () => {
  const d = tmp();
  assert.equal(compileIgnore(d), 0);
  assert.equal(existsSync(join(d, '.gitignore')), false);
  rmSync(d, { recursive: true, force: true });
});
