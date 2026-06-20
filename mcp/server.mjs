#!/usr/bin/env node
// mcp/server.mjs — 手写零依赖的极简 MCP stdio server,暴露一个 diagnostics 工具。
// 协议:行分隔 JSON-RPC 2.0;stdout 只放 JSON-RPC,日志一律走 stderr。
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runDiagnostics } from '../lib/diagnostics.mjs';

const PROTOCOL_VERSION = '2025-11-25';

const DIAGNOSTICS_TOOL = {
  name: 'diagnostics',
  description: '在项目里运行一个诊断命令(如 "npm test" / "npm run build"),返回退出码、错误行摘要与输出尾部,供 agent 自我纠错。',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '要运行的命令,例如 "npm test"' },
      cwd: { type: 'string', description: '工作目录(默认当前项目)' },
    },
    required: ['command'],
    additionalProperties: false,
  },
};

// 纯函数:给一条 JSON-RPC 消息,返回应答对象;notification(无 id)返回 null。
export function handleMessage(msg) {
  if (!msg || msg.id === undefined) return null; // notification → 不回复
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'agent-path-forge-diagnostics', version: '0.1.0' },
      },
    };
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: [DIAGNOSTICS_TOOL] } };
  if (method === 'tools/call') {
    if (params?.name !== 'diagnostics') {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${params?.name}` } };
    }
    const args = params.arguments || {};
    const result = runDiagnostics(args.command || '', args.cwd);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.ok,
      },
    };
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

// stdio 主循环(仅直接运行时启动;被 import 时不启动,方便测试)
if (isMain()) {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; } // 忽略坏行
      let res = null;
      try { res = handleMessage(msg); } catch (e) { process.stderr.write(`agent-path-forge-mcp error: ${e}\n`); }
      if (res) process.stdout.write(`${JSON.stringify(res)}\n`);
    }
  });
  process.stdin.on('end', () => process.exit(0));
}
