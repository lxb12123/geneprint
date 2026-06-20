// test/self-describe.test.mjs — 基因⑤:uses 自描述块编译出真效果
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSkills, renderClaudeSkill, renderAgentsMd } from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function addSkill(dir, name, uses) {
  const s = join(dir, 'skills', name);
  mkdirSync(s, { recursive: true });
  const y = `name: ${name}\ndescription: d\nwhen-to-use: w\nuses:\n`
    + `  mcp: ${JSON.stringify(uses.mcp || [])}\n`
    + `  permissions: ${JSON.stringify(uses.permissions || [])}\n`
    + `  subagents: ${JSON.stringify(uses.subagents || [])}\n`;
  writeFileSync(join(s, 'skill.yaml'), y, 'utf8');
  writeFileSync(join(s, 'prompt.md'), 'body', 'utf8');
}

test('listSkills 带出 uses 自描述块', () => {
  const d = tmp(); addSkill(d, 'review', { permissions: ['Bash(node *)'] });
  assert.deepEqual(listSkills(d)[0].uses.permissions, ['Bash(node *)']);
  rmSync(d, { recursive: true, force: true });
});

test('renderClaudeSkill: uses.permissions → allowed-tools frontmatter', () => {
  const md = renderClaudeSkill({ name: 'review', description: 'd', whenToUse: 'w', prompt: 'body', uses: { permissions: ['Bash(node *)'], mcp: [], subagents: [] } });
  assert.match(md, /allowed-tools:/);
  assert.match(md, /Bash\(node \*\)/);
});

test('renderClaudeSkill: 无 permissions 不加 allowed-tools', () => {
  const md = renderClaudeSkill({ name: 'x', description: 'd', whenToUse: 'w', prompt: 'b', uses: { permissions: [], mcp: [], subagents: [] } });
  assert.doesNotMatch(md, /allowed-tools:/);
});

test('renderAgentsMd: 非空 uses 被列为依赖', () => {
  const md = renderAgentsMd([{ name: 'review', description: 'd', whenToUse: 'w', uses: { permissions: ['Bash(node *)'], mcp: ['agent-path-forge-diagnostics'], subagents: [] } }]);
  assert.match(md, /agent-path-forge-diagnostics/);
  assert.match(md, /Bash\(node \*\)/);
});
