// test/cli.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function makeSrc(name, desc, when) {
  const src = tmp();
  writeFileSync(join(src, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
  return src;
}

test('空项目 inherit: 刻地基 + 装技能 + 编译, 清单含该技能', () => {
  const d = tmp();
  const src = makeSrc('review', '代码审查', '提交前审查 diff');
  const r = inherit(d, { name: 'review', from: src });
  assert.equal(r.stamped, true);
  assert.equal(r.skill.changed, true);
  assert.equal(r.compiledSkills, 1);
  assert.equal(readManifest(d).skills[0].name, 'review');
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true });
});

test('第二次 inherit 加新技能: 不重刻地基(stamped=false), 清单含两技能', () => {
  const d = tmp();
  const src1 = makeSrc('review', '代码审查', 'x');
  const src2 = makeSrc('audit', '设计审查', 'y');
  inherit(d, { name: 'review', from: src1 });
  const r2 = inherit(d, { name: 'audit', from: src2 });
  assert.equal(r2.stamped, false);                       // 地基只刻一次
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['audit', 'review']);
  rmSync(d, { recursive: true, force: true });
});

test('重复 inherit 同一技能: 幂等(skill.changed=false)', () => {
  const d = tmp();
  const src = makeSrc('review', '代码审查', 'x');
  inherit(d, { name: 'review', from: src });
  const r2 = inherit(d, { name: 'review', from: src });
  assert.equal(r2.skill.changed, false);
  assert.equal(readManifest(d).skills.length, 1);
  rmSync(d, { recursive: true, force: true });
});
