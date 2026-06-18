// lib/cli.mjs
import { stampFoundation } from './foundation.mjs';
import { installSkill } from './skill-install.mjs';
import { compileAgentsMd } from './compiler.mjs';
import { readManifest, writeManifest, upsertSkill } from './manifest.mjs';

export function inherit(targetDir, { name, from }) {
  const stamp = stampFoundation(targetDir);                       // 幂等
  const skill = installSkill(targetDir, from, name);              // 幂等
  const manifest = upsertSkill(readManifest(targetDir), name, skill.fingerprint);
  writeManifest(targetDir, manifest);
  const compiledSkills = compileAgentsMd(targetDir);
  return { stamped: stamp.stamped, skill, compiledSkills };
}

// CLI: node lib/cli.mjs inherit <targetDir> --name <name> --from <skillDir>
function parseArgs(argv) {
  const [cmd, targetDir, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  return { cmd, targetDir, opts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cmd, targetDir, opts } = parseArgs(process.argv.slice(2));
  if (cmd !== 'inherit') {
    console.error('usage: meta-harness inherit <targetDir> --name <name> --from <skillDir>');
    process.exit(1);
  }
  const r = inherit(targetDir, { name: opts.name, from: opts.from });
  console.log(JSON.stringify(r));
}
