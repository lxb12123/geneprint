// test/acceptance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';
import { fingerprintDir } from '../lib/skill-install.mjs';

const GOLDEN = resolve('gene/golden-skill');
function tmp() { return mkdtempSync(join(tmpdir(), 'mh-acc-')); }

test('§9.1 空目录 inherit → 地基 + 技能 + AGENTS.md', () => {
  const d = tmp();
  const r = inherit(d, { name: 'review', from: GOLDEN });
  assert.equal(r.stamped, true);
  assert.equal(existsSync(join(d, '.gene', 'gene.json')), true);
  assert.equal(existsSync(join(d, 'skills', 'review', 'prompt.md')), true);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true });
});

test('§9.2 再次 inherit 加技能 → 不重刻地基, 已有文件指纹不变', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  const before = fingerprintDir(join(d, 'skills', 'review'));
  // 造第二个技能源
  const src2 = tmp();
  cpSync(GOLDEN, src2, { recursive: true });
  writeFileSync(join(src2, 'skill.yaml'), 'name: audit\ndescription: 设计审查\nwhen-to-use: 检查反模式\n', 'utf8');
  const r2 = inherit(d, { name: 'audit', from: src2 });
  assert.equal(r2.stamped, false);                                   // 地基只刻一次
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['audit', 'review']);
  assert.equal(fingerprintDir(join(d, 'skills', 'review')), before); // 已有技能零改动
  rmSync(d, { recursive: true, force: true }); rmSync(src2, { recursive: true, force: true });
});

test('§9.3 /review 确定性脚本对真实 diff 取出改动', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  const run = (...a) => execFileSync('git', a, { cwd: d });
  run('init'); run('config', 'user.email', 't@t.io'); run('config', 'user.name', 't');
  writeFileSync(join(d, 'a.txt'), 'one\n'); run('add', '.'); run('commit', '-m', 'init');
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n');
  const out = execFileSync('node', [join(d, 'skills', 'review', 'scripts', 'collect-diff.mjs'), 'HEAD'],
    { cwd: d, encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.deepEqual(parsed.files, ['a.txt']);
  assert.match(parsed.diff, /\+two/);
  rmSync(d, { recursive: true, force: true });
});
