// test/yaml-lite.test.mjs — 零依赖 YAML 子集:解析 + frontmatter 输出
// (开发时已与 js-yaml 做过差分校验;此处锁定行为,本身不依赖任何第三方)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml, toFrontmatter } from '../lib/yaml-lite.mjs';

test('扁平标量:字符串/引号含冒号/数字/布尔/null/裸 key', () => {
  assert.deepEqual(
    parseYaml('a: hello\nb: "x: y"\nc: 42\nd: true\ne: false\nf: null\ng:'),
    { a: 'hello', b: 'x: y', c: 42, d: true, e: false, f: null, g: null },
  );
});

test('嵌套 map + 行内空数组 + 块状数组', () => {
  const y = 'uses:\n  mcp: []\n  permissions:\n    - "Bash(node *)"\n    - Read\n  subagents: []';
  assert.deepEqual(parseYaml(y), { uses: { mcp: [], permissions: ['Bash(node *)', 'Read'], subagents: [] } });
});

test('行内数组(含特殊字符引号元素)', () => {
  assert.deepEqual(parseYaml('p: ["Bash(node *)", "x"]'), { p: ['Bash(node *)', 'x'] });
});

test('注释:整行注释 / 行内注释(含数组后)/ 引号内的 # 保留', () => {
  const y = '# 整行注释\nname: x   # 行内注释\narr: ["a"]   # 数组后注释\nnote: "含 # 号"';
  assert.deepEqual(parseYaml(y), { name: 'x', arr: ['a'], note: '含 # 号' });
});

test('toFrontmatter 往返:解析回原对象', () => {
  for (const o of [
    { description: '代码审查 提交前', 'allowed-tools': 'Bash(node *)' },
    { description: 'd', globs: '*.ts', alwaysApply: false },
    { description: 'd', alwaysApply: true },
  ]) {
    assert.deepEqual(parseYaml(toFrontmatter(o)), o);
  }
});

test('toFrontmatter 引号策略:* 开头要引号,普通中文/带括号不加', () => {
  assert.match(toFrontmatter({ globs: '*.ts' }), /globs: "\*\.ts"/);
  assert.match(toFrontmatter({ description: '代码审查 提交前' }), /description: 代码审查 提交前/);
  assert.match(toFrontmatter({ 'allowed-tools': 'Bash(node *)' }), /allowed-tools: Bash\(node \*\)/);
});

test('fail-loud:tab 缩进直接抛错', () => {
  assert.throws(() => parseYaml('a:\n\tb: 1'), /tab/);
});

// ---- 对抗式审查发现的修复(B1/B2/B3/W1/W2/W3)----
test('行内数组尾随逗号不产生 null;空槽位/未闭合则抛错', () => {
  assert.deepEqual(parseYaml('g: ["*.ts",]'), { g: ['*.ts'] });
  assert.deepEqual(parseYaml('p: ["Bash(node *)",]'), { p: ['Bash(node *)'] });
  assert.throws(() => parseYaml('g: [a, , b]'), /empty element/);
  assert.throws(() => parseYaml('g: [a, b'), /unclosed/);
});

test('大小写布尔/null 与 js-yaml core 一致', () => {
  assert.deepEqual(parseYaml('a: False\nb: TRUE\nc: Null'), { a: false, b: true, c: null });
});

test('锚点/别名直接抛错(契约)', () => {
  assert.throws(() => parseYaml('a: &x 1'), /anchor/);
});

test('toFrontmatter 对含换行/结尾冒号的值加引号 → 产出合法可往返的 YAML', () => {
  assert.deepEqual(parseYaml(toFrontmatter({ description: 'line1\nline2' })), { description: 'line1\nline2' });
  assert.deepEqual(parseYaml(toFrontmatter({ description: 'note:' })), { description: 'note:' });
});
