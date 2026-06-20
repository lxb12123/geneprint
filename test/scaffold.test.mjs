// test/scaffold.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseYaml } from '../lib/yaml-lite.mjs';
import { scaffoldSkill } from '../lib/scaffold.mjs';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('scaffoldSkill 生成合规骨架(skill.yaml 带 name + uses + when-to-use, 还有 prompt.md)', () => {
  const d = tmp();
  scaffoldSkill(d, 'changelog');
  assert.equal(existsSync(join(d, 'skill.yaml')), true);
  assert.equal(existsSync(join(d, 'prompt.md')), true);
  const meta = parseYaml(readFileSync(join(d, 'skill.yaml'), 'utf8'));
  assert.equal(meta.name, 'changelog');
  assert.ok('when-to-use' in meta);
  assert.ok(meta.uses && Array.isArray(meta.uses.mcp)
    && Array.isArray(meta.uses.permissions) && Array.isArray(meta.uses.subagents));
  rmSync(d, { recursive: true, force: true });
});

test('scaffold 出的骨架能被 inherit 安装成合规技能', () => {
  const src = tmp(); const proj = tmp();
  scaffoldSkill(src, 'changelog');
  const r = inherit(proj, { name: 'changelog', from: src });
  assert.equal(r.skill.changed, true);
  assert.equal(existsSync(join(proj, 'skills', 'changelog', 'skill.yaml')), true);
  assert.equal(existsSync(join(proj, 'skills', 'changelog', 'prompt.md')), true);
  assert.equal(readManifest(proj).skills[0].name, 'changelog');
  rmSync(src, { recursive: true, force: true }); rmSync(proj, { recursive: true, force: true });
});
