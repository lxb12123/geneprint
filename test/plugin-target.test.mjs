// test/plugin-target.test.mjs — "插件目标"编译:产物 = 可安装的跨平台插件
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inherit } from '../lib/cli.mjs';
import {
  pluginMeta, renderPluginJson, renderMarketplaceJson, renderCommand, compilePlugin, pack,
} from '../lib/plugin-target.mjs';
import { writeManifest, readManifest, emptyManifest } from '../lib/manifest.mjs';

const GOLDEN = resolve('gene/golden-skill');   // review:带 subagent
function tmp() { return mkdtempSync(join(tmpdir(), 'mh-plugin-')); }

test('pack 把基因项目编译成可安装插件:清单 + 插件根技能 + 子agent + 命令', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });   // 长出一个技能(带 review-verifier 子agent)
  const r = pack(d);

  // 清单
  assert.equal(existsSync(join(d, '.claude-plugin', 'plugin.json')), true);
  assert.equal(existsSync(join(d, '.claude-plugin', 'marketplace.json')), true);
  // 技能落到插件根(Claude 读这里),不是 .claude/skills
  assert.equal(existsSync(join(d, 'skills', 'review', 'SKILL.md')), true);
  // 子 agent 落到插件根 agents/
  assert.equal(r.agents, 1);
  assert.equal(existsSync(join(d, 'agents', 'review-verifier.md')), true);
  // 每个技能一个命令
  assert.equal(existsSync(join(d, 'commands', 'review.md')), true);
  // 跨宿主 + 自带 README
  assert.equal(existsSync(join(d, 'AGENTS.md')), true);
  assert.equal(existsSync(join(d, 'README.md')), true);
  assert.equal(r.skills, 1);
  assert.equal(r.commands, 1);
  rmSync(d, { recursive: true, force: true });
});

test('plugin.json 合法 JSON,字段来自 .gene 的 plugin 配置', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  const m = readManifest(d);
  m.plugin = { name: 'my-pack', description: 'D', version: '1.2.3', license: 'Apache-2.0' };
  writeManifest(d, m);
  compilePlugin(d);
  const pj = JSON.parse(readFileSync(join(d, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.equal(pj.name, 'my-pack');
  assert.equal(pj.version, '1.2.3');
  assert.equal(pj.license, 'Apache-2.0');
  const mp = JSON.parse(readFileSync(join(d, '.claude-plugin', 'marketplace.json'), 'utf8'));
  assert.equal(mp.plugins[0].name, 'my-pack');
  assert.equal(mp.plugins[0].source, './');
  rmSync(d, { recursive: true, force: true });
});

test('pluginMeta 无配置时按目录名兜底,license 默认 MIT', () => {
  const d = tmp();
  writeManifest(d, emptyManifest());
  const meta = pluginMeta(d);
  assert.ok(meta.name.length);
  assert.equal(meta.license, 'MIT');
  assert.equal(meta.marketplace, `${meta.name}-marketplace`);
  rmSync(d, { recursive: true, force: true });
});

test('renderCommand 产出带 frontmatter 的命令,委托给同名技能', () => {
  const cmd = renderCommand({ name: 'review', description: '审查改动', whenToUse: '提交前' });
  assert.match(cmd, /^---\n/);
  assert.match(cmd, /description: 审查改动/);
  assert.match(cmd, /Use the \*\*review\*\* skill/);
});

test('compilePlugin 幂等:再编译一次,镜像产物逐字节不变', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  compilePlugin(d);
  const snap = (p) => readFileSync(join(d, p), 'utf8');
  const before = {
    pj: snap('.claude-plugin/plugin.json'),
    mp: snap('.claude-plugin/marketplace.json'),
    skill: snap('skills/review/SKILL.md'),
    cmd: snap('commands/review.md'),
    agents: snap('AGENTS.md'),
  };
  compilePlugin(d);
  assert.equal(snap('.claude-plugin/plugin.json'), before.pj);
  assert.equal(snap('.claude-plugin/marketplace.json'), before.mp);
  assert.equal(snap('skills/review/SKILL.md'), before.skill);
  assert.equal(snap('commands/review.md'), before.cmd);
  assert.equal(snap('AGENTS.md'), before.agents);
  rmSync(d, { recursive: true, force: true });
});

test('compilePlugin 不覆盖作者手写的 README', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  writeFileSync(join(d, 'README.md'), '# 我手写的\n', 'utf8');
  compilePlugin(d);
  assert.equal(readFileSync(join(d, 'README.md'), 'utf8'), '# 我手写的\n');
  rmSync(d, { recursive: true, force: true });
});

test('MCP / hooks 仅在 .gene 源存在时产出(不凭空捏造)', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  let r = compilePlugin(d);
  assert.equal(r.mcp, false);
  assert.equal(existsSync(join(d, '.mcp.json')), false);
  // 放入源
  writeFileSync(join(d, '.gene', 'mcp.json'), '{"mcpServers":{}}', 'utf8');
  writeFileSync(join(d, '.gene', 'hooks.json'), '{"hooks":{}}', 'utf8');
  r = compilePlugin(d);
  assert.equal(r.mcp, true);
  assert.equal(r.hooks, true);
  assert.equal(existsSync(join(d, '.mcp.json')), true);
  assert.equal(existsSync(join(d, 'hooks', 'hooks.json')), true);
  rmSync(d, { recursive: true, force: true });
});

test('inherit --target plugin 一步长出技能并打包', () => {
  const d = tmp();
  const r = inherit(d, { name: 'review', from: GOLDEN, target: 'plugin' });
  assert.ok(r.plugin, 'returns plugin result');
  assert.equal(existsSync(join(d, '.claude-plugin', 'plugin.json')), true);
  assert.equal(existsSync(join(d, 'skills', 'review', 'SKILL.md')), true);
  rmSync(d, { recursive: true, force: true });
});

test('pack 在非基因项目 → 友好报错', () => {
  const d = tmp();
  assert.throws(() => pack(d), /run `inherit` first|not an Agent Path Forge/);
  rmSync(d, { recursive: true, force: true });
});
