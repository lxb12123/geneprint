// test/compiler-hosts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listSkills, renderClaudeSkill, compileClaudeSkills,
  renderCursorRule, compileCursorRules, compileAll,
} from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function addSkill(dir, name, desc, when, prompt) {
  const s = join(dir, 'skills', name);
  mkdirSync(s, { recursive: true });
  writeFileSync(join(s, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
  writeFileSync(join(s, 'prompt.md'), prompt, 'utf8');
}

test('listSkills 现在带 prompt 正文', () => {
  const d = tmp();
  addSkill(d, 'review', '代码审查', '提交前', '# /review\n审查 diff');
  const list = listSkills(d);
  assert.match(list[0].prompt, /审查 diff/);
  rmSync(d, { recursive: true, force: true });
});

test('renderClaudeSkill 产出 description frontmatter + 正文', () => {
  const md = renderClaudeSkill({ name: 'review', description: '代码审查', whenToUse: '提交前', prompt: '# /review\n审查 diff' });
  assert.match(md, /^---\n/);
  assert.match(md, /description: 代码审查.*提交前/);
  assert.match(md, /审查 diff/);
});

test('compileClaudeSkills 写 .claude/skills/<name>/SKILL.md', () => {
  const d = tmp();
  addSkill(d, 'review', '代码审查', '提交前', '# /review\n审查 diff');
  const n = compileClaudeSkills(d);
  assert.equal(n, 1);
  const p = join(d, '.claude', 'skills', 'review', 'SKILL.md');
  assert.equal(existsSync(p), true);
  assert.match(readFileSync(p, 'utf8'), /description: 代码审查/);
  rmSync(d, { recursive: true, force: true });
});

test('renderCursorRule 含 alwaysApply:false + description + 正文', () => {
  const md = renderCursorRule({ name: 'review', description: '代码审查', whenToUse: '提交前', prompt: '审查 diff' });
  assert.match(md, /alwaysApply: false/);
  assert.match(md, /description: 代码审查/);
  assert.match(md, /审查 diff/);
});

test('compileCursorRules 写 .cursor/rules/<name>.mdc', () => {
  const d = tmp();
  addSkill(d, 'review', '代码审查', '提交前', '审查 diff');
  const n = compileCursorRules(d);
  assert.equal(n, 1);
  const p = join(d, '.cursor', 'rules', 'review.mdc');
  assert.equal(existsSync(p), true);
  assert.match(readFileSync(p, 'utf8'), /alwaysApply: false/);
  rmSync(d, { recursive: true, force: true });
});

test('compileAll 同时产 AGENTS.md + .claude/skills + .cursor/rules, 返回技能数', () => {
  const d = tmp();
  addSkill(d, 'review', '代码审查', '提交前', '审查 diff');
  const n = compileAll(d);
  assert.equal(n, 1);
  assert.equal(existsSync(join(d, 'AGENTS.md')), true);
  assert.equal(existsSync(join(d, '.claude', 'skills', 'review', 'SKILL.md')), true);
  assert.equal(existsSync(join(d, '.cursor', 'rules', 'review.mdc')), true);
  rmSync(d, { recursive: true, force: true });
});
