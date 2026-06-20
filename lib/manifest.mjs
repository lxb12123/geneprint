// lib/manifest.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const GENE_VERSION = '0.1.0';
const GENE_DIR = '.gene';
const MANIFEST = 'gene.json';   // 机读清单用 JSON(Node 原生,零依赖)

export function genePath(targetDir) { return join(targetDir, GENE_DIR); }
export function manifestPath(targetDir) { return join(targetDir, GENE_DIR, MANIFEST); }

export function hasGene(targetDir) { return existsSync(manifestPath(targetDir)); }

export function readManifest(targetDir) {
  if (!hasGene(targetDir)) return null;
  let loaded = {};
  try { loaded = JSON.parse(readFileSync(manifestPath(targetDir), 'utf8')) || {}; }
  catch { loaded = {}; }   // 空/损坏的清单 → 规范化为空清单,不崩溃
  if (typeof loaded !== 'object' || Array.isArray(loaded)) loaded = {};
  return { ...emptyManifest(), ...loaded, skills: Array.isArray(loaded.skills) ? loaded.skills : [] };
}

export function writeManifest(targetDir, manifest) {
  const p = manifestPath(targetDir);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function emptyManifest() {
  return { geneVersion: GENE_VERSION, skills: [] };
}

export function upsertSkill(manifest, name, fingerprint, version) {
  const base = manifest && Array.isArray(manifest.skills) ? manifest : emptyManifest();
  const skills = base.skills.filter((s) => s.name !== name);
  skills.push({ name, fingerprint, ...(version ? { version } : {}) });
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { ...base, skills };
}
