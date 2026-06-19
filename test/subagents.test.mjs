// test/subagents.test.mjs — 子 agent 编译到 .claude/agents/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileSubagents, compileAll } from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function addSkillWithSub(dir, name, agentFile, agentBody) {
  const skillDir = join(dir, 'skills', name);
  mkdirSync(join(skillDir, 'subagents'), { recursive: true });
  writeFileSync(join(skillDir, 'skill.yaml'), `name: ${name}\ndescription: d\nwhen-to-use: w\n`, 'utf8');
  writeFileSync(join(skillDir, 'prompt.md'), 'b', 'utf8');
  writeFileSync(join(skillDir, 'subagents', agentFile), agentBody, 'utf8');
}

test('compileSubagents 把技能 subagents/*.md 编译到 .claude/agents/(技能名命名空间)', () => {
  const d = tmp();
  addSkillWithSub(d, 'review', 'verifier.md', '---\nname: review-verifier\ndescription: 复核\n---\nbody');
  assert.equal(compileSubagents(d), 1);
  const p = join(d, '.claude', 'agents', 'review-verifier.md');
  assert.equal(existsSync(p), true);
  assert.match(readFileSync(p, 'utf8'), /name: review-verifier/);
  rmSync(d, { recursive: true, force: true });
});

test('无 subagents 目录不报错, 返回 0', () => {
  const d = tmp();
  const s = join(d, 'skills', 'x'); mkdirSync(s, { recursive: true });
  writeFileSync(join(s, 'skill.yaml'), 'name: x\ndescription: d\n', 'utf8');
  assert.equal(compileSubagents(d), 0);
  rmSync(d, { recursive: true, force: true });
});

test('compileAll 也产出 .claude/agents', () => {
  const d = tmp();
  addSkillWithSub(d, 'review', 'verifier.md', '---\nname: review-verifier\ndescription: 复核\n---\nbody');
  compileAll(d);
  assert.equal(existsSync(join(d, '.claude', 'agents', 'review-verifier.md')), true);
  rmSync(d, { recursive: true, force: true });
});
