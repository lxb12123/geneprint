// test/golden-skills.test.mjs — 新增黄金技能的脚本行为 + 基因合规
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectStaged } from '../gene/commit/scripts/collect-staged.mjs';
import { collectCommits } from '../gene/pr-description/scripts/collect-commits.mjs';
import { readSkillMeta } from '../lib/registry.mjs';

function gitRepo() {
  const d = mkdtempSync(join(tmpdir(), 'mh-gold-'));
  const run = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8' });
  run('init');
  run('config', 'user.email', 't@t.io');
  run('config', 'user.name', 't');
  writeFileSync(join(d, 'a.txt'), 'one\n');
  run('add', '.'); run('commit', '-m', 'init');
  return { d, run };
}

test('collectStaged 取已暂存改动,未暂存不计入', () => {
  const { d, run } = gitRepo();
  writeFileSync(join(d, 'b.txt'), 'new\n');   // 未暂存
  assert.deepEqual(collectStaged(d).files, []);
  run('add', 'b.txt');                         // 暂存
  const r = collectStaged(d);
  assert.deepEqual(r.files, ['b.txt']);
  assert.match(r.diff, /\+new/);
  rmSync(d, { recursive: true, force: true });
});

test('collectCommits 列出相对基线的提交标题与 diffstat', () => {
  const { d, run } = gitRepo();
  const base = run('rev-parse', 'HEAD').trim();   // 用初始提交 SHA 当基线,避开分支名差异
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n');
  run('add', '.'); run('commit', '-m', 'feat: add two');
  const r = collectCommits(d, base);
  assert.deepEqual(r.commits, ['feat: add two']);
  assert.match(r.diffstat, /a\.txt/);
  rmSync(d, { recursive: true, force: true });
});

for (const name of ['commit', 'pr-description']) {
  test(`gene/${name} 基因合规:skill.yaml + prompt + script + evals`, () => {
    const dir = resolve('gene', name);
    const meta = readSkillMeta(dir);
    assert.equal(meta.name, name);                       // 名称与目录一致
    assert.ok(meta.version, 'has version');
    assert.ok(Array.isArray(meta.uses.permissions) && meta.uses.permissions.length, 'declares permissions');
    assert.equal(existsSync(join(dir, 'prompt.md')), true);
    assert.ok(readdirSync(join(dir, 'scripts')).some((f) => f.endsWith('.mjs')), 'has a script');
    const evals = readdirSync(join(dir, 'evals')).filter((f) => f.endsWith('.json'));
    assert.ok(evals.length, 'has eval cases');
    for (const e of evals) JSON.parse(readFileSync(join(dir, 'evals', e), 'utf8'));  // 合法 JSON
  });
}
