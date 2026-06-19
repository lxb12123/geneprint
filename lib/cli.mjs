#!/usr/bin/env node
// lib/cli.mjs
import { stampFoundation } from './foundation.mjs';
import { installSkill } from './skill-install.mjs';
import { compileAll } from './compiler.mjs';
import { readManifest, writeManifest, upsertSkill } from './manifest.mjs';
import { realpathSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scaffoldSkill } from './scaffold.mjs';
import { loadCases, runEval } from './eval.mjs';
import { loadTrace, summarizeTrace } from './trace.mjs';
import { readSkillMeta, checkDependencies } from './registry.mjs';

const SKILL_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export function inherit(targetDir, { name, from }) {
  if (!SKILL_NAME_RE.test(name || '')) {
    throw new Error(`invalid skill name: ${JSON.stringify(name)} (use kebab-case, [a-z0-9-])`);
  }
  const meta = readSkillMeta(from);                               // version / dependencies
  const stamp = stampFoundation(targetDir);                       // 幂等
  const skill = installSkill(targetDir, from, name);              // 幂等
  const manifest = upsertSkill(readManifest(targetDir), name, skill.fingerprint, meta.version);
  writeManifest(targetDir, manifest);
  const compiledSkills = compileAll(targetDir);
  const deps = checkDependencies(manifest.skills.map((s) => s.name), meta.dependencies);
  return { stamped: stamp.stamped, skill, compiledSkills, version: meta.version, missingDeps: deps.missing };
}

// CLI: node lib/cli.mjs inherit|scaffold|eval|trace <dir> [--name <name>] [--from <skillDir>] [--runs <runsFile>]
function parseArgs(argv) {
  const [cmd, targetDir, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  return { cmd, targetDir, opts };
}

function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

if (isMain()) {
  const { cmd, targetDir, opts } = parseArgs(process.argv.slice(2));
  if (cmd === 'inherit') {
    console.log(JSON.stringify(inherit(targetDir, { name: opts.name, from: opts.from })));
  } else if (cmd === 'scaffold') {
    console.log(JSON.stringify(scaffoldSkill(targetDir, opts.name)));
  } else if (cmd === 'eval') {
    const out = opts.runs
      ? runEval(targetDir, JSON.parse(readFileSync(opts.runs, 'utf8')))
      : loadCases(targetDir);
    console.log(JSON.stringify(out));
  } else if (cmd === 'trace') {
    console.log(JSON.stringify(summarizeTrace(loadTrace(targetDir))));
  } else {
    console.error('usage: geneprint <inherit|scaffold|eval|trace> <dir> [--name <name>] [--from <skillDir>] [--runs <runsFile>]');
    process.exit(1);
  }
}
