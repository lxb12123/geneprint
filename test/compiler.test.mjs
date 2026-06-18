// test/compiler.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSkills, renderAgentsMd, compileAgentsMd } from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

function addSkill(dir, name, desc, when) {
  const s = join(dir, 'skills', name);
  mkdirSync(s, { recursive: true });
  writeFileSync(join(s, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
}

test('listSkills 读出名称/描述/when-to-use 并排序', () => {
  const d = tmp();
  addSkill(d, 'review', '代码审查', '提交前审查 diff');
  addSkill(d, 'audit', '设计审查', '检查反模式');
  const list = listSkills(d);
  assert.deepEqual(list.map((s) => s.name), ['audit', 'review']);
  assert.equal(list[1].whenToUse, '提交前审查 diff');
  rmSync(d, { recursive: true, force: true });
});

test('renderAgentsMd 含标题与每个技能段', () => {
  const md = renderAgentsMd([{ name: 'review', description: '代码审查', whenToUse: '提交前审查 diff' }]);
  assert.match(md, /^# AGENTS\.md/);
  assert.match(md, /### review/);
  assert.match(md, /skills\/review\//);
});

test('compileAgentsMd 写出文件且返回技能数', () => {
  const d = tmp();
  addSkill(d, 'review', '代码审查', '提交前审查 diff');
  const n = compileAgentsMd(d);
  assert.equal(n, 1);
  assert.equal(existsSync(join(d, 'AGENTS.md')), true);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true });
});
