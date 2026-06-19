// test/diagnostics.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractErrors, tail, runDiagnostics } from '../lib/diagnostics.mjs';

test('extractErrors 挑出含 error/fail 的行', () => {
  const errs = extractErrors('ok\nError: boom\nfine\nFAILED here');
  assert.equal(errs.length, 2);
  assert.match(errs[0], /boom/);
});

test('tail 取末尾 N 行', () => {
  assert.equal(tail('a\nb\nc\nd', 2), 'c\nd');
});

test('runDiagnostics: 成功命令 ok=true, exitCode=0', () => {
  const r = runDiagnostics('node -e "console.log(\'all good\')"');
  assert.equal(r.ok, true);
  assert.equal(r.exitCode, 0);
});

test('runDiagnostics: 失败命令 ok=false + 抓到错误行', () => {
  const r = runDiagnostics('node -e "console.error(\'Error: boom\'); process.exit(1)"');
  assert.equal(r.ok, false);
  assert.equal(r.exitCode, 1);
  assert.ok(r.errors.some((l) => /boom/.test(l)));
});
