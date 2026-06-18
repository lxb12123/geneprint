// test/manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hasGene, readManifest, writeManifest, emptyManifest, upsertSkill, GENE_VERSION,
} from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('空项目 hasGene=false, readManifest=null', () => {
  const d = tmp();
  assert.equal(hasGene(d), false);
  assert.equal(readManifest(d), null);
  rmSync(d, { recursive: true, force: true });
});

test('写入后可读回, hasGene=true', () => {
  const d = tmp();
  writeManifest(d, emptyManifest());
  assert.equal(hasGene(d), true);
  const m = readManifest(d);
  assert.equal(m.geneVersion, GENE_VERSION);
  assert.deepEqual(m.skills, []);
  rmSync(d, { recursive: true, force: true });
});

test('upsertSkill 新增并按名排序, 同名覆盖', () => {
  let m = emptyManifest();
  m = upsertSkill(m, 'review', 'aaa');
  m = upsertSkill(m, 'audit', 'bbb');
  assert.deepEqual(m.skills.map(s => s.name), ['audit', 'review']);
  m = upsertSkill(m, 'review', 'ccc');                 // 覆盖
  assert.equal(m.skills.find(s => s.name === 'review').fingerprint, 'ccc');
  assert.equal(m.skills.length, 2);                    // 不重复
});
