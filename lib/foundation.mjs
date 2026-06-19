// lib/foundation.mjs
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { hasGene, writeManifest, emptyManifest, genePath } from './manifest.mjs';

const GENE_MD = `# Gene

本项目由 Geneprint 基因刻入。架构决定与语境记录于此(可提交、跨会话)。
`;

export function stampFoundation(targetDir) {
  if (hasGene(targetDir)) return { stamped: false };   // 幂等:已刻则跳过
  mkdirSync(genePath(targetDir), { recursive: true });
  writeManifest(targetDir, emptyManifest());
  mkdirSync(join(targetDir, 'skills'), { recursive: true });
  const geneMd = join(targetDir, 'GENE.md');
  if (!existsSync(geneMd)) writeFileSync(geneMd, GENE_MD, 'utf8');
  return { stamped: true };
}
