// lib/manifest.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import yaml from 'js-yaml';

export const GENE_VERSION = '0.1.0';
const GENE_DIR = '.gene';
const MANIFEST = 'gene.yaml';

export function genePath(targetDir) { return join(targetDir, GENE_DIR); }
export function manifestPath(targetDir) { return join(targetDir, GENE_DIR, MANIFEST); }

export function hasGene(targetDir) { return existsSync(manifestPath(targetDir)); }

export function readManifest(targetDir) {
  if (!hasGene(targetDir)) return null;
  return yaml.load(readFileSync(manifestPath(targetDir), 'utf8'));
}

export function writeManifest(targetDir, manifest) {
  const p = manifestPath(targetDir);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, yaml.dump(manifest), 'utf8');
}

export function emptyManifest() {
  return { geneVersion: GENE_VERSION, skills: [] };
}

export function upsertSkill(manifest, name, fingerprint) {
  const skills = manifest.skills.filter((s) => s.name !== name);
  skills.push({ name, fingerprint });
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { ...manifest, skills };
}
