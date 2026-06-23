// test/plugin-target.test.mjs — "plugin target" compilation: artifact = an installable cross-platform plugin
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inherit } from '../lib/cli.mjs';
import {
  pluginMeta, renderPluginJson, renderMarketplaceJson, renderCommand, renderPluginReadme, compilePlugin, pack,
} from '../lib/plugin-target.mjs';
import { writeManifest, readManifest, emptyManifest } from '../lib/manifest.mjs';

const GOLDEN = resolve('gene/golden-skill');   // review: comes with a subagent
function tmp() { return mkdtempSync(join(tmpdir(), 'mh-plugin-')); }

test('pack compiles a gene project into an installable plugin: manifest + plugin-root skills + subagents (commands off by default)', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });   // grow a skill (with the review-verifier subagent)
  const r = pack(d);

  // manifest
  assert.equal(existsSync(join(d, '.claude-plugin', 'plugin.json')), true);
  assert.equal(existsSync(join(d, '.claude-plugin', 'marketplace.json')), true);
  // skills land at the plugin root (where Claude reads them), not .claude/skills
  assert.equal(existsSync(join(d, 'skills', 'review', 'SKILL.md')), true);
  // subagents land at the plugin root agents/
  assert.equal(r.agents, 1);
  assert.equal(existsSync(join(d, 'agents', 'review-verifier.md')), true);
  // commands are OFF by default — the SKILL.md skill is already a /review entry, so a
  // same-named command would just duplicate it
  assert.equal(existsSync(join(d, 'commands', 'review.md')), false);
  assert.equal(r.commands, 0);
  // cross-host + bundled README
  assert.equal(existsSync(join(d, 'AGENTS.md')), true);
  assert.equal(existsSync(join(d, 'README.md')), true);
  assert.equal(r.skills, 1);
  rmSync(d, { recursive: true, force: true });
});

test('pack with plugin.commands=true opts into a slash command per skill', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  const m = readManifest(d);
  m.plugin = { commands: true };
  writeManifest(d, m);
  const r = pack(d);
  assert.equal(existsSync(join(d, 'commands', 'review.md')), true);
  assert.equal(r.commands, 1);
  rmSync(d, { recursive: true, force: true });
});

test('plugin.json is valid JSON, with fields coming from the plugin config in .gene', () => {
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

test('pluginMeta falls back to the directory name when there is no config, license defaults to MIT', () => {
  const d = tmp();
  writeManifest(d, emptyManifest());
  const meta = pluginMeta(d);
  assert.ok(meta.name.length);
  assert.equal(meta.license, 'MIT');
  assert.equal(meta.marketplace, `${meta.name}-marketplace`);
  rmSync(d, { recursive: true, force: true });
});

test("pluginMeta with the relative path '.' as the fallback name → resolves to the real directory name, not the literal '.'", () => {
  const meta = pluginMeta('.');
  assert.notEqual(meta.name, '.');
  assert.ok(meta.name.length > 1);
});

test('renderCommand produces a command with frontmatter that delegates to the same-named skill', () => {
  const cmd = renderCommand({ name: 'review', description: 'review the changes', whenToUse: 'before committing' });
  assert.match(cmd, /^---\n/);
  assert.match(cmd, /description: review the changes/);
  assert.match(cmd, /Use the \*\*review\*\* skill/);
});

test('renderPluginReadme multi-host quick start: Claude + Codex (cross-runtime) + Cursor', () => {
  const md = renderPluginReadme(
    { name: 'my-pack', marketplace: 'my-pack-marketplace', description: 'D' },
    [{ name: 'review', description: 'review', whenToUse: 'before committing' }],
  );
  assert.match(md, /### Claude Code/);
  assert.match(md, /\/plugin install my-pack@my-pack-marketplace/);
  assert.match(md, /### Codex/);
  assert.match(md, /~\/\.codex\/skills/);
  assert.match(md, /~\/\.agents\/skills/);   // cross-runtime path (Codex + Copilot + Gemini)
  assert.match(md, /### Cursor/);
});

test('renderCommand: writes argument-hint when argumentHint is present, omits it otherwise (backward compatible)', () => {
  const withHint = renderCommand({ name: 'eval', description: 'D', argumentHint: 'skills/<name>' });
  assert.match(withHint, /argument-hint: skills\/<name>/);

  const without = renderCommand({ name: 'trace', description: 'D' });
  assert.doesNotMatch(without, /argument-hint/);
});

test('compilePlugin is idempotent: compiling again leaves the mirror artifacts byte-for-byte unchanged', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  compilePlugin(d);
  const snap = (p) => readFileSync(join(d, p), 'utf8');
  const before = {
    pj: snap('.claude-plugin/plugin.json'),
    mp: snap('.claude-plugin/marketplace.json'),
    skill: snap('skills/review/SKILL.md'),
    agents: snap('AGENTS.md'),
  };
  compilePlugin(d);
  assert.equal(snap('.claude-plugin/plugin.json'), before.pj);
  assert.equal(snap('.claude-plugin/marketplace.json'), before.mp);
  assert.equal(snap('skills/review/SKILL.md'), before.skill);
  assert.equal(snap('AGENTS.md'), before.agents);
  rmSync(d, { recursive: true, force: true });
});

test('compilePlugin does not overwrite the author-written README', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  writeFileSync(join(d, 'README.md'), '# my hand-written one\n', 'utf8');
  compilePlugin(d);
  assert.equal(readFileSync(join(d, 'README.md'), 'utf8'), '# my hand-written one\n');
  rmSync(d, { recursive: true, force: true });
});

test('MCP / hooks are produced only when the .gene source exists (never fabricated)', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  let r = compilePlugin(d);
  assert.equal(r.mcp, false);
  assert.equal(existsSync(join(d, '.mcp.json')), false);
  // put the source in place
  writeFileSync(join(d, '.gene', 'mcp.json'), '{"mcpServers":{}}', 'utf8');
  writeFileSync(join(d, '.gene', 'hooks.json'), '{"hooks":{}}', 'utf8');
  r = compilePlugin(d);
  assert.equal(r.mcp, true);
  assert.equal(r.hooks, true);
  assert.equal(existsSync(join(d, '.mcp.json')), true);
  assert.equal(existsSync(join(d, 'hooks', 'hooks.json')), true);
  rmSync(d, { recursive: true, force: true });
});

test('inherit --target plugin grows the skill and packs it in one step', () => {
  const d = tmp();
  const r = inherit(d, { name: 'review', from: GOLDEN, target: 'plugin' });
  assert.ok(r.plugin, 'returns plugin result');
  assert.equal(existsSync(join(d, '.claude-plugin', 'plugin.json')), true);
  assert.equal(existsSync(join(d, 'skills', 'review', 'SKILL.md')), true);
  rmSync(d, { recursive: true, force: true });
});

test('pack on a non-gene project → friendly error', () => {
  const d = tmp();
  assert.throws(() => pack(d), /run `inherit` first|not an Agent Path Forge/);
  rmSync(d, { recursive: true, force: true });
});
