// test/manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
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

test('readManifest 规范化空 gene.json 为合法清单', () => {
  const d = tmp();
  mkdirSync(join(d, '.gene'), { recursive: true });
  writeFileSync(join(d, '.gene', 'gene.json'), '', 'utf8');   // 空文件
  const m = readManifest(d);
  assert.equal(m.geneVersion, GENE_VERSION);
  assert.deepEqual(m.skills, []);
  rmSync(d, { recursive: true, force: true });
});

test('upsertSkill 对缺失 skills 的清单也健壮', () => {
  const m = upsertSkill({ geneVersion: GENE_VERSION }, 'review', 'aaa'); // 无 skills 键
  assert.deepEqual(m.skills.map(s => s.name), ['review']);
});
