// test/registry.test.mjs — 技能版本 + 依赖
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDependencies, readSkillMeta } from '../lib/registry.mjs';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function makeSrc(name, extra = '') {
  const src = tmp();
  writeFileSync(join(src, 'skill.yaml'), `name: ${name}\ndescription: d\nwhen-to-use: w\n${extra}`, 'utf8');
  writeFileSync(join(src, 'prompt.md'), 'b', 'utf8');
  return src;
}

test('checkDependencies: 缺失依赖被列出', () => {
  assert.deepEqual(checkDependencies(['a', 'b'], ['a', 'c']), { ok: false, missing: ['c'] });
  assert.deepEqual(checkDependencies(['a'], []), { ok: true, missing: [] });
});

test('readSkillMeta 读出 version / dependencies', () => {
  const src = makeSrc('x', 'version: "1.2.3"\ndependencies: ["dep1"]\n');
  const m = readSkillMeta(src);
  assert.equal(m.version, '1.2.3');
  assert.deepEqual(m.dependencies, ['dep1']);
  rmSync(src, { recursive: true, force: true });
});

test('inherit 记录 version + 报告 missingDeps', () => {
  const d = tmp();
  const src = makeSrc('report', 'version: "0.2.0"\ndependencies: ["charts"]\n');
  const r = inherit(d, { name: 'report', from: src });
  assert.equal(r.version, '0.2.0');
  assert.deepEqual(r.missingDeps, ['charts']);                       // charts 还没装
  assert.equal(readManifest(d).skills.find((s) => s.name === 'report').version, '0.2.0');
  const src2 = makeSrc('charts');
  inherit(d, { name: 'charts', from: src2 });                        // 装上依赖
  assert.deepEqual(inherit(d, { name: 'report', from: src }).missingDeps, []);
  rmSync(d, { recursive: true, force: true });
});
