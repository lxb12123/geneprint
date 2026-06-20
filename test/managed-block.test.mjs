// test/managed-block.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upsertBlock } from '../lib/managed-block.mjs';

const S = '# >>> start >>>';
const E = '# <<< end <<<';

test('空内容 → 写入一个托管块', () => {
  const out = upsertBlock('', S, E, 'a\nb');
  assert.equal(out, `${S}\na\nb\n${E}\n`);
});

test('幂等:同 body 重复 upsert 结果不变', () => {
  const once = upsertBlock('', S, E, 'a\nb');
  const twice = upsertBlock(once, S, E, 'a\nb');
  assert.equal(twice, once);
});

test('替换已有块的 body,保留前后用户内容', () => {
  const start = upsertBlock('user-top\n', S, E, 'old');
  const updated = upsertBlock(start + 'user-bottom\n', S, E, 'new');
  assert.match(updated, /user-top/);
  assert.match(updated, /user-bottom/);
  assert.match(updated, /new/);
  assert.doesNotMatch(updated, /old/);
  // 再 upsert 同 body → 幂等
  assert.equal(upsertBlock(updated, S, E, 'new'), updated);
});

test('追加到已有用户内容后,用空行隔开', () => {
  const out = upsertBlock('keep me\n', S, E, 'x');
  assert.match(out, /keep me\n\n# >>> start >>>/);
});

test('B1: 文件仅在散文里提到 end 标记、无真实块 → 不无限增长', () => {
  const prose = `# 我的项目\n\n说明:agent-path-forge 用 ${E} 界定它的块。\n`;
  const r1 = upsertBlock(prose, S, E, 'rule body');
  const r2 = upsertBlock(r1, S, E, 'rule body');
  assert.equal(r2, r1);                         // 第二次起稳定,不漂移
  assert.equal(r2.split(S).length - 1, 1);      // 只存在一个块
});

test('B2: 已有两个重复块 → 收敛为一个,旧内容清除,且幂等', () => {
  const dup = `top\n\n${S}\nOLD\n${E}\n\nmid\n\n${S}\nOLD\n${E}\n\nbot\n`;
  const out = upsertBlock(dup, S, E, 'NEW');
  assert.equal(out.split(S).length - 1, 1);
  assert.match(out, /NEW/);
  assert.doesNotMatch(out, /OLD/);
  assert.match(out, /top/); assert.match(out, /bot/);
  assert.equal(upsertBlock(out, S, E, 'NEW'), out);
});

test('body 含标记 → 抛错(避免破坏块边界)', () => {
  assert.throws(() => upsertBlock('', S, E, `x ${E} y`), /must not contain/);
});
