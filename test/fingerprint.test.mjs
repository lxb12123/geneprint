// test/fingerprint.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashContent } from '../lib/fingerprint.mjs';

test('hashContent 稳定且同输入同输出', () => {
  assert.equal(hashContent('hello'), hashContent('hello'));
});

test('hashContent 不同输入不同输出', () => {
  assert.notEqual(hashContent('hello'), hashContent('world'));
});

test('hashContent 返回 16 位十六进制', () => {
  assert.match(hashContent('x'), /^[0-9a-f]{16}$/);
});
