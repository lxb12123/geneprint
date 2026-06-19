// test/mcp-server.test.mjs — 协议级测试(handleMessage 纯函数)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMessage } from '../mcp/server.mjs';

test('initialize 返回 protocolVersion + tools capability + serverInfo', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(r.result.protocolVersion, '2025-11-25');
  assert.ok(r.result.capabilities.tools);
  assert.ok(r.result.serverInfo.name);
});

test('notification(无 id)不回复', () => {
  assert.equal(handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
});

test('ping → 空 result', () => {
  assert.deepEqual(handleMessage({ jsonrpc: '2.0', id: 2, method: 'ping' }),
    { jsonrpc: '2.0', id: 2, result: {} });
});

test('tools/list 暴露 diagnostics 工具(合法 inputSchema)', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  const t = r.result.tools[0];
  assert.equal(t.name, 'diagnostics');
  assert.equal(t.inputSchema.type, 'object');
  assert.ok(t.inputSchema.required.includes('command'));
});

test('tools/call diagnostics: 失败命令 → isError:true + text content', () => {
  const r = handleMessage({
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'diagnostics', arguments: { command: 'node -e "process.exit(1)"' } },
  });
  assert.equal(r.result.isError, true);
  assert.equal(r.result.content[0].type, 'text');
});

test('tools/call 未知工具 → JSON-RPC -32601', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nope' } });
  assert.equal(r.error.code, -32601);
});

test('未知方法 → -32601', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 6, method: 'foo/bar' });
  assert.equal(r.error.code, -32601);
});
