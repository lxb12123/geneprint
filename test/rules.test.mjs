// test/rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listRules, renderCursorRuleFromRule, renderRulesSection, compileRules } from '../lib/rules.mjs';
import { compileAll } from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-rules-')); }
function addRule(dir, name, frontmatter, body) {
  const rdir = join(dir, 'rules');
  mkdirSync(rdir, { recursive: true });
  writeFileSync(join(rdir, `${name}.md`), `---\n${frontmatter}\n---\n\n${body}\n`, 'utf8');
}

test('listRules 解析 frontmatter:globs 字符串→数组, alwaysApply 默认 true', () => {
  const d = tmp();
  addRule(d, 'style', 'description: 代码风格\nglobs: "*.ts, *.tsx"', '用两空格缩进');
  addRule(d, 'always', 'description: 通用约定', '提交前跑测试');
  const rules = listRules(d);
  assert.equal(rules.length, 2);
  const style = rules.find((r) => r.name === 'style');
  assert.deepEqual(style.globs, ['*.ts', '*.tsx']);
  assert.equal(style.description, '代码风格');
  const always = rules.find((r) => r.name === 'always');
  assert.equal(always.alwaysApply, true);
  assert.deepEqual(always.globs, []);
  rmSync(d, { recursive: true, force: true });
});

test('renderCursorRuleFromRule:有 globs → alwaysApply:false;无 globs → 始终', () => {
  const withGlobs = renderCursorRuleFromRule({ name: 'x', description: 'd', globs: ['*.ts'], alwaysApply: true, body: 'B' });
  assert.match(withGlobs, /globs: ["']?\*\.ts["']?/);
  assert.match(withGlobs, /alwaysApply: false/);
  const always = renderCursorRuleFromRule({ name: 'y', description: 'd', globs: [], alwaysApply: true, body: 'B' });
  assert.match(always, /alwaysApply: true/);
});

test('renderRulesSection 产出 ## Rules + 名称 + 正文', () => {
  const md = renderRulesSection([{ name: 'style', description: '代码风格', globs: [], alwaysApply: true, body: '两空格' }]);
  assert.match(md, /## Rules/);
  assert.match(md, /### style/);
  assert.match(md, /两空格/);
});

test('compileRules 写 .cursor/rules + CLAUDE.md 托管块,幂等,保留用户内容', () => {
  const d = tmp();
  addRule(d, 'style', 'description: 代码风格', '两空格缩进');
  writeFileSync(join(d, 'CLAUDE.md'), '# 我的项目\n\n用户自己的说明\n', 'utf8');
  const n = compileRules(d);
  assert.equal(n, 1);
  assert.equal(existsSync(join(d, '.cursor', 'rules', 'style.mdc')), true);
  const claude1 = readFileSync(join(d, 'CLAUDE.md'), 'utf8');
  assert.match(claude1, /用户自己的说明/);           // 用户内容保留
  assert.match(claude1, /geneprint:rules:start/);
  assert.match(claude1, /两空格缩进/);
  compileRules(d);                                     // 再编译一次
  assert.equal(readFileSync(join(d, 'CLAUDE.md'), 'utf8'), claude1); // 幂等
  rmSync(d, { recursive: true, force: true });
});

test('compileAll:有 rules 时 AGENTS.md 含 ## Rules 段', () => {
  const d = tmp();
  const sdir = join(d, 'skills', 'review');
  mkdirSync(sdir, { recursive: true });
  writeFileSync(join(sdir, 'skill.yaml'), 'name: review\ndescription: 审查\nwhen-to-use: 提交前\n', 'utf8');
  writeFileSync(join(sdir, 'prompt.md'), '审查 diff', 'utf8');
  addRule(d, 'style', 'description: 代码风格', '两空格');
  compileAll(d);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /## Rules/);
  rmSync(d, { recursive: true, force: true });
});

test('compileAll:skill 与 rule 同名 → 抛错(防 .cursor/rules 互相覆盖)', () => {
  const d = tmp();
  const sdir = join(d, 'skills', 'dup');
  mkdirSync(sdir, { recursive: true });
  writeFileSync(join(sdir, 'skill.yaml'), 'name: dup\ndescription: d\nwhen-to-use: w\n', 'utf8');
  writeFileSync(join(sdir, 'prompt.md'), 'P', 'utf8');
  addRule(d, 'dup', 'description: 同名规则', 'R');
  assert.throws(() => compileAll(d), /name collision/);
  rmSync(d, { recursive: true, force: true });
});

test('listRules:坏 frontmatter 不崩溃,降级为空元数据', () => {
  const d = tmp();
  addRule(d, 'ok', 'description: 正常', 'body');
  writeFileSync(join(d, 'rules', 'bad.md'), '---\ndescription: "未闭合\n---\n\nbody\n', 'utf8');
  const rules = listRules(d);
  assert.equal(rules.length, 2);
  assert.equal(rules.find((r) => r.name === 'bad').description, '');
  rmSync(d, { recursive: true, force: true });
});
