# Meta-Harness v0.1 Implementation Plan

> **For agentic workers:** implement this plan task-by-task (one task at a time, review between tasks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一个能用一条幂等命令 `/inherit` 把"基因地基"刻进任意项目、并长出一个基因合规技能(黄金技能 `/review`)、再编译出 `AGENTS.md` 的最小可用 Claude Code 插件。

**Architecture:** 插件 = Markdown 命令/技能(Claude Code 本身即引擎)+ 一个可独立测试的 Node.js 确定性引擎(`lib/`)。命令提示词 `commands/inherit.md` 指挥 agent 调用 `lib/cli.mjs` 完成"检测→刻地基(幂等)→装技能(指纹幂等)→编译 AGENTS.md"。黄金技能 `/review` 自带确定性 `scripts/collect-diff.mjs`(取 git diff,0 token)+ `prompt.md`(LLM 审查),一次证明 5 条基因。

**Tech Stack:** Node.js ≥18(ESM)· 测试用内置 `node:test` + `node:assert/strict`(`node --test`)· 唯一运行时依赖 `js-yaml` · git。

**Spec:** `docs/design/specs/2026-06-19-meta-harness-gene-plugin-design.md`(§9 为本计划验收基准)

---

## File Structure

```
Meta-Harness/                         # 插件仓库根(= 当前工作目录)
├── package.json                      # Node ESM 项目 + js-yaml + test 脚本
├── plugin.json                       # Claude Code 插件清单
├── commands/
│   └── inherit.md                    # /inherit 元命令(提示词,指挥 agent 调 lib/cli.mjs)
├── gene/
│   └── golden-skill/                 # 黄金技能 /review(DNA 种子,被 /inherit 复制)
│       ├── skill.yaml                # 元信息 + when-to-use + 自描述字段
│       ├── prompt.md                 # LLM 审查指令
│       ├── reference/
│       │   └── review-standards.md   # 审查规范(按需加载)
│       └── scripts/
│           └── collect-diff.mjs      # 确定性:git diff + 改动文件(0 token)
├── lib/                              # 确定性引擎(TDD 的核心)
│   ├── fingerprint.mjs               # 内容指纹(sha256)
│   ├── manifest.mjs                  # .gene/gene.yaml 读写 + hasGene + upsertSkill
│   ├── foundation.mjs                # 幂等刻地基
│   ├── skill-install.mjs             # 指纹幂等地装技能
│   ├── compiler.mjs                  # skills/ → AGENTS.md
│   └── cli.mjs                       # inherit 编排 + 命令行入口
└── test/
    ├── fingerprint.test.mjs
    ├── manifest.test.mjs
    ├── foundation.test.mjs
    ├── skill-install.test.mjs
    ├── compiler.test.mjs
    ├── cli.test.mjs
    ├── collect-diff.test.mjs
    └── acceptance.test.mjs           # §9 端到端验收
```

**数据形状(全计划一致):**
- `gene.yaml`(解析为对象):`{ geneVersion: "0.1.0", skills: [ { name: string, fingerprint: string } ] }`
- 指纹:对目录内所有文件 `相对路径:内容` 排序拼接后取 sha256 前 16 位。
- `installSkill` 返回:`{ name, fingerprint, changed }`
- `inherit` 返回:`{ stamped: boolean, skill: {name,fingerprint,changed}, compiledSkills: number }`

---

## Task 0: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `plugin.json`
- Create: `.gitignore`

- [ ] **Step 1: 初始化 git 仓库**

Run:
```bash
cd /Users/lixibin/Desktop/Meta-Harness && git init
```
Expected: `Initialized empty Git repository ...`

- [ ] **Step 2: 写 `package.json`**

```json
{
  "name": "meta-harness",
  "version": "0.1.0",
  "description": "Agent 原生基因插件:一条幂等命令把好架构基因刻进任意项目",
  "type": "module",
  "license": "MIT",
  "bin": { "meta-harness": "lib/cli.mjs" },
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "js-yaml": "^4.1.0"
  }
}
```

- [ ] **Step 3: 写 `plugin.json`(Claude Code 插件清单)**

```json
{
  "name": "meta-harness",
  "version": "0.1.0",
  "description": "把好架构基因刻进任意项目;一句话长出基因合规技能",
  "commands": ["commands/inherit.md"]
}
```

- [ ] **Step 4: 写 `.gitignore`**

```
node_modules/
```

- [ ] **Step 5: 安装依赖并冒烟**

Run:
```bash
cd /Users/lixibin/Desktop/Meta-Harness && npm install && node -e "import('js-yaml').then(m=>console.log('yaml ok', typeof m.default.load))"
```
Expected: `yaml ok function`

- [ ] **Step 6: Commit**

```bash
git add package.json plugin.json .gitignore package-lock.json
git commit -m "chore: scaffold meta-harness plugin (node esm + js-yaml)"
```

---

## Task 1: 内容指纹 `lib/fingerprint.mjs`

**Files:**
- Create: `lib/fingerprint.mjs`
- Test: `test/fingerprint.test.mjs`

- [ ] **Step 1: 写失败测试**

```javascript
// test/fingerprint.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashContent } from '../lib/fingerprint.mjs';

test('hashContent 稳定且同输入同输出', () => {
  assert.equal(hashContent('hello'), hashContent('hello'));
});

test('hashContent 不同输入不同输出', () => {
  assert.notEqual(hashContent('hello'), hashContent('world'));
});

test('hashContent 返回 16 位十六进制', () => {
  assert.match(hashContent('x'), /^[0-9a-f]{16}$/);
});
```

- [ ] **Step 2: 运行,确认失败**

Run: `node --test test/fingerprint.test.mjs`
Expected: FAIL（`Cannot find module '../lib/fingerprint.mjs'`）

- [ ] **Step 3: 写实现**

```javascript
// lib/fingerprint.mjs
import { createHash } from 'node:crypto';

export function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}
```

- [ ] **Step 4: 运行,确认通过**

Run: `node --test test/fingerprint.test.mjs`
Expected: PASS（3 个测试通过）

- [ ] **Step 5: Commit**

```bash
git add lib/fingerprint.mjs test/fingerprint.test.mjs
git commit -m "feat: content fingerprint (sha256/16)"
```

---

## Task 2: 清单读写 `lib/manifest.mjs`

**Files:**
- Create: `lib/manifest.mjs`
- Test: `test/manifest.test.mjs`

- [ ] **Step 1: 写失败测试**

```javascript
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
```

- [ ] **Step 2: 运行,确认失败**

Run: `node --test test/manifest.test.mjs`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 写实现**

```javascript
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
```

- [ ] **Step 4: 运行,确认通过**

Run: `node --test test/manifest.test.mjs`
Expected: PASS（3 个测试通过）

- [ ] **Step 5: Commit**

```bash
git add lib/manifest.mjs test/manifest.test.mjs
git commit -m "feat: .gene/gene.yaml manifest read/write + upsertSkill"
```

---

## Task 3: 幂等刻地基 `lib/foundation.mjs`

**Files:**
- Create: `lib/foundation.mjs`
- Test: `test/foundation.test.mjs`

- [ ] **Step 1: 写失败测试**

```javascript
// test/foundation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stampFoundation } from '../lib/foundation.mjs';
import { hasGene } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('首次刻地基: stamped=true, 生成 .gene 与 GENE.md', () => {
  const d = tmp();
  const r = stampFoundation(d);
  assert.equal(r.stamped, true);
  assert.equal(hasGene(d), true);
  assert.equal(existsSync(join(d, 'GENE.md')), true);
  rmSync(d, { recursive: true, force: true });
});

test('已存在地基则幂等: stamped=false, 不覆盖 GENE.md', () => {
  const d = tmp();
  stampFoundation(d);
  writeFileSync(join(d, 'GENE.md'), 'USER EDIT', 'utf8');   // 用户改了
  const r2 = stampFoundation(d);
  assert.equal(r2.stamped, false);
  assert.equal(readFileSync(join(d, 'GENE.md'), 'utf8'), 'USER EDIT'); // 不被覆盖
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: 运行,确认失败**

Run: `node --test test/foundation.test.mjs`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 写实现**

```javascript
// lib/foundation.mjs
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { hasGene, writeManifest, emptyManifest, genePath } from './manifest.mjs';

const GENE_MD = `# Gene

本项目由 Meta-Harness 基因刻入。架构决定与语境记录于此(可提交、跨会话)。
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
```

- [ ] **Step 4: 运行,确认通过**

Run: `node --test test/foundation.test.mjs`
Expected: PASS（2 个测试通过）

- [ ] **Step 5: Commit**

```bash
git add lib/foundation.mjs test/foundation.test.mjs
git commit -m "feat: idempotent foundation stamping (.gene + GENE.md + skills/)"
```

---

## Task 4: 指纹幂等装技能 `lib/skill-install.mjs`

**Files:**
- Create: `lib/skill-install.mjs`
- Test: `test/skill-install.test.mjs`

- [ ] **Step 1: 写失败测试**

```javascript
// test/skill-install.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkill, fingerprintDir } from '../lib/skill-install.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

function makeSkill(dir, body) {
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'skill.yaml'), 'name: demo\n', 'utf8');
  writeFileSync(join(dir, 'scripts', 'x.mjs'), body, 'utf8');
}

test('首次安装: changed=true, 文件被复制', () => {
  const src = tmp(); const dst = tmp();
  makeSkill(src, 'export const v = 1;');
  const r = installSkill(dst, src, 'demo');
  assert.equal(r.changed, true);
  assert.equal(r.name, 'demo');
  assert.equal(existsSync(join(dst, 'skills', 'demo', 'scripts', 'x.mjs')), true);
  rmSync(src, { recursive: true, force: true }); rmSync(dst, { recursive: true, force: true });
});

test('重装相同内容: changed=false(幂等)', () => {
  const src = tmp(); const dst = tmp();
  makeSkill(src, 'export const v = 1;');
  installSkill(dst, src, 'demo');
  const r2 = installSkill(dst, src, 'demo');
  assert.equal(r2.changed, false);
  rmSync(src, { recursive: true, force: true }); rmSync(dst, { recursive: true, force: true });
});

test('源内容变化则指纹变化', () => {
  const a = tmp(); const b = tmp();
  makeSkill(a, 'export const v = 1;');
  makeSkill(b, 'export const v = 2;');
  assert.notEqual(fingerprintDir(a), fingerprintDir(b));
  rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true });
});
```

- [ ] **Step 2: 运行,确认失败**

Run: `node --test test/skill-install.test.mjs`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 写实现**

```javascript
// lib/skill-install.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { hashContent } from './fingerprint.mjs';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out.sort();
}

export function fingerprintDir(srcDir) {
  const parts = walk(srcDir).map((f) => `${relative(srcDir, f)}:${readFileSync(f, 'utf8')}`);
  return hashContent(parts.join('\n'));
}

export function installSkill(targetDir, srcDir, name) {
  const fingerprint = fingerprintDir(srcDir);
  const destBase = join(targetDir, 'skills', name);
  if (existsSync(destBase) && fingerprintDir(destBase) === fingerprint) {
    return { name, fingerprint, changed: false };       // 幂等:内容一致则跳过
  }
  for (const f of walk(srcDir)) {
    const dest = join(destBase, relative(srcDir, f));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(f));
  }
  return { name, fingerprint, changed: true };
}
```

- [ ] **Step 4: 运行,确认通过**

Run: `node --test test/skill-install.test.mjs`
Expected: PASS（3 个测试通过）

- [ ] **Step 5: Commit**

```bash
git add lib/skill-install.mjs test/skill-install.test.mjs
git commit -m "feat: fingerprint-idempotent skill install"
```

---

## Task 5: 编译 AGENTS.md `lib/compiler.mjs`

**Files:**
- Create: `lib/compiler.mjs`
- Test: `test/compiler.test.mjs`

- [ ] **Step 1: 写失败测试**

```javascript
// test/compiler.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSkills, renderAgentsMd, compileAgentsMd } from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

function addSkill(dir, name, desc, when) {
  const s = join(dir, 'skills', name);
  mkdirSync(s, { recursive: true });
  writeFileSync(join(s, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
}

test('listSkills 读出名称/描述/when-to-use 并排序', () => {
  const d = tmp();
  addSkill(d, 'review', '代码审查', '提交前审查 diff');
  addSkill(d, 'audit', '设计审查', '检查反模式');
  const list = listSkills(d);
  assert.deepEqual(list.map((s) => s.name), ['audit', 'review']);
  assert.equal(list[1].whenToUse, '提交前审查 diff');
  rmSync(d, { recursive: true, force: true });
});

test('renderAgentsMd 含标题与每个技能段', () => {
  const md = renderAgentsMd([{ name: 'review', description: '代码审查', whenToUse: '提交前审查 diff' }]);
  assert.match(md, /^# AGENTS\.md/);
  assert.match(md, /### review/);
  assert.match(md, /skills\/review\//);
});

test('compileAgentsMd 写出文件且返回技能数', () => {
  const d = tmp();
  addSkill(d, 'review', '代码审查', '提交前审查 diff');
  const n = compileAgentsMd(d);
  assert.equal(n, 1);
  assert.equal(existsSync(join(d, 'AGENTS.md')), true);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: 运行,确认失败**

Run: `node --test test/compiler.test.mjs`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 写实现**

```javascript
// lib/compiler.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export function listSkills(targetDir) {
  const skillsDir = join(targetDir, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((n) => statSync(join(skillsDir, n)).isDirectory())
    .sort()
    .map((name) => {
      const meta = yaml.load(readFileSync(join(skillsDir, name, 'skill.yaml'), 'utf8')) || {};
      return { name, whenToUse: meta['when-to-use'] || '', description: meta.description || '' };
    });
}

export function renderAgentsMd(skills) {
  const lines = [
    '# AGENTS.md',
    '',
    '> 由 Meta-Harness 基因编译生成,供任意 AI 编码宿主读取。',
    '',
    '## Skills',
    '',
  ];
  for (const s of skills) {
    lines.push(`### ${s.name}`, '', s.description, '',
      `- 何时使用: ${s.whenToUse}`, `- 位置: \`skills/${s.name}/\``, '');
  }
  return lines.join('\n');
}

export function compileAgentsMd(targetDir) {
  const skills = listSkills(targetDir);
  writeFileSync(join(targetDir, 'AGENTS.md'), renderAgentsMd(skills), 'utf8');
  return skills.length;
}
```

- [ ] **Step 4: 运行,确认通过**

Run: `node --test test/compiler.test.mjs`
Expected: PASS（3 个测试通过）

- [ ] **Step 5: Commit**

```bash
git add lib/compiler.mjs test/compiler.test.mjs
git commit -m "feat: compile skills/ to AGENTS.md (open standard)"
```

---

## Task 6: 编排 + 命令行入口 `lib/cli.mjs`

**Files:**
- Create: `lib/cli.mjs`
- Test: `test/cli.test.mjs`

- [ ] **Step 1: 写失败测试**

```javascript
// test/cli.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function makeSrc(name, desc, when) {
  const src = tmp();
  writeFileSync(join(src, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
  return src;
}

test('空项目 inherit: 刻地基 + 装技能 + 编译, 清单含该技能', () => {
  const d = tmp();
  const src = makeSrc('review', '代码审查', '提交前审查 diff');
  const r = inherit(d, { name: 'review', from: src });
  assert.equal(r.stamped, true);
  assert.equal(r.skill.changed, true);
  assert.equal(r.compiledSkills, 1);
  assert.equal(readManifest(d).skills[0].name, 'review');
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true });
});

test('第二次 inherit 加新技能: 不重刻地基(stamped=false), 清单含两技能', () => {
  const d = tmp();
  const src1 = makeSrc('review', '代码审查', 'x');
  const src2 = makeSrc('audit', '设计审查', 'y');
  inherit(d, { name: 'review', from: src1 });
  const r2 = inherit(d, { name: 'audit', from: src2 });
  assert.equal(r2.stamped, false);                       // 地基只刻一次
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['audit', 'review']);
  rmSync(d, { recursive: true, force: true });
});

test('重复 inherit 同一技能: 幂等(skill.changed=false)', () => {
  const d = tmp();
  const src = makeSrc('review', '代码审查', 'x');
  inherit(d, { name: 'review', from: src });
  const r2 = inherit(d, { name: 'review', from: src });
  assert.equal(r2.skill.changed, false);
  assert.equal(readManifest(d).skills.length, 1);
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: 运行,确认失败**

Run: `node --test test/cli.test.mjs`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 写实现**

```javascript
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
```

- [ ] **Step 4: 运行,确认通过**

Run: `node --test test/cli.test.mjs`
Expected: PASS（3 个测试通过）

- [ ] **Step 5: Commit**

```bash
git add lib/cli.mjs test/cli.test.mjs
git commit -m "feat: idempotent inherit orchestration + CLI entry"
```

---

## Task 7: 黄金技能 `/review`(DNA 种子)

**Files:**
- Create: `gene/golden-skill/scripts/collect-diff.mjs`
- Create: `gene/golden-skill/skill.yaml`
- Create: `gene/golden-skill/prompt.md`
- Create: `gene/golden-skill/reference/review-standards.md`
- Test: `test/collect-diff.test.mjs`

- [ ] **Step 1: 写失败测试(确定性 diff 脚本)**

```javascript
// test/collect-diff.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectDiff } from '../gene/golden-skill/scripts/collect-diff.mjs';

function gitRepo() {
  const d = mkdtempSync(join(tmpdir(), 'mh-git-'));
  const run = (...a) => execFileSync('git', a, { cwd: d });
  run('init');
  run('config', 'user.email', 't@t.io');
  run('config', 'user.name', 't');
  writeFileSync(join(d, 'a.txt'), 'one\n');
  run('add', '.'); run('commit', '-m', 'init');
  return { d, run };
}

test('collectDiff 列出改动文件与 diff 文本', () => {
  const { d } = gitRepo();
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n');           // 改动
  const r = collectDiff(d, 'HEAD');
  assert.deepEqual(r.files, ['a.txt']);
  assert.match(r.diff, /\+two/);
  rmSync(d, { recursive: true, force: true });
});

test('无改动时 files 为空', () => {
  const { d } = gitRepo();
  const r = collectDiff(d, 'HEAD');
  assert.deepEqual(r.files, []);
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: 运行,确认失败**

Run: `node --test test/collect-diff.test.mjs`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 写确定性 diff 脚本**

```javascript
// gene/golden-skill/scripts/collect-diff.mjs
import { execFileSync } from 'node:child_process';

export function collectDiff(cwd = process.cwd(), base = 'HEAD') {
  const files = execFileSync('git', ['diff', '--name-only', base], { cwd, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const diff = execFileSync('git', ['diff', base], { cwd, encoding: 'utf8' });
  return { files, diff };
}

// CLI: node collect-diff.mjs [base]  → 打印 JSON(供 agent 读取,0 token 推理)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(collectDiff(process.cwd(), process.argv[2] || 'HEAD')));
}
```

- [ ] **Step 4: 运行,确认通过**

Run: `node --test test/collect-diff.test.mjs`
Expected: PASS（2 个测试通过）

- [ ] **Step 5: 写 `skill.yaml`(元信息 + 自描述字段)**

```yaml
# gene/golden-skill/skill.yaml
name: review
description: 对当前改动做代码审查(确定性取 diff + LLM 评审)
when-to-use: 提交或合并前,需要审查代码改动的正确性与质量时
# 自描述原语(基因⑤;v0.1 仅声明,不强制)
uses:
  mcp: []
  permissions: []
  subagents: []
```

- [ ] **Step 6: 写 `prompt.md`(LLM 语义层)**

```markdown
<!-- gene/golden-skill/prompt.md -->
# /review — 代码审查

你是一个严格但务实的代码审查者。

## 步骤
1. 运行确定性脚本取得改动(0 token 推理):
   `node skills/review/scripts/collect-diff.mjs HEAD`
   它输出 JSON:`{ files: string[], diff: string }`。
2. 若 `files` 为空,回复"无改动可审查"并停止。
3. 仅在需要时,加载 `skills/review/reference/review-standards.md` 作为审查标准(基因③:按需加载)。
4. 针对 `diff`,逐条给出:问题位置(file:行)、严重度(blocker/warning/nit)、原因、修法建议。
5. 末尾给一句总体结论(可合并 / 需修改)。

## 约束
- 只评审 diff 内的改动,不要泛泛重写整个文件。
- 确定性的事(改了哪些文件)用脚本结果,不要猜。
```

- [ ] **Step 7: 写 `reference/review-standards.md`(按需知识)**

```markdown
<!-- gene/golden-skill/reference/review-standards.md -->
# 审查标准(按需加载)

- **正确性**:边界条件、空值、错误处理、并发/竞态。
- **安全**:注入、越权、密钥硬编码、不可信输入。
- **可读性**:命名、函数长度、重复(DRY)。
- **测试**:改动是否有对应测试;断言是否有意义。
- **严重度**:blocker(必须改)/ warning(应改)/ nit(可选)。
```

- [ ] **Step 8: Commit**

```bash
git add gene/golden-skill test/collect-diff.test.mjs
git commit -m "feat: golden skill /review (deterministic diff + LLM review prompt)"
```

---

## Task 8: `/inherit` 元命令 + 插件接线

**Files:**
- Create: `commands/inherit.md`
- Modify: `plugin.json`（确认已含 `commands/inherit.md`,Task 0 已写,无需改;若缺则补)

> 说明:这是 Markdown 提示词,不做单元测试;验证方式见 Step 2 / Step 3。

- [ ] **Step 1: 写 `commands/inherit.md`**

````markdown
<!-- commands/inherit.md -->
---
name: inherit
description: 把基因地基刻进当前项目并长出一个基因合规技能(幂等)
---

# /inherit — 长出一个基因合规技能

你的任务:在**当前项目**里,用 Meta-Harness 的确定性引擎,幂等地刻地基并长出用户想要的技能。**不要**手工创建 `.gene/` 或编辑 `AGENTS.md`——这些由引擎完成,保证幂等。

## 流程

1. **理解意图**:与用户对话,弄清这个技能要做什么。问清:
   - 技能要解决什么?(一句话)
   - 技能名(kebab-case,如 `review`、`changelog`)?
   - 它需要确定性脚本吗?需要哪些 reference 知识?
2. **准备技能源目录**:在临时位置 `/$TMP/<name>/` 按黄金技能结构生成:
   - `skill.yaml`(含 `name`/`description`/`when-to-use` 与 `uses:` 自描述字段)
   - `prompt.md`(LLM 语义层)
   - 如需:`scripts/*.mjs`(确定性,0 token)、`reference/*.md`(按需知识)
   参照种子结构:本插件的 `gene/golden-skill/`。
3. **调用确定性引擎(它负责幂等)**:
   ```bash
   node <plugin>/lib/cli.mjs inherit . --name <name> --from /$TMP/<name>
   ```
   引擎会:无地基则刻(`.gene/`、`GENE.md`、`skills/`)→ 指纹幂等地装技能 → 更新 `.gene/gene.yaml` → 重新编译 `AGENTS.md`。
4. **回报结果**:把引擎输出的 JSON(`stamped`/`skill.changed`/`compiledSkills`)转述给用户;若 `skill.changed=false`,说明该技能已存在且未变化(幂等,未重复写)。

## 原则
- 严格幂等:可安全重跑,不破坏用户已有文件。
- 刻完即走:不要在项目里留下对本插件的运行时依赖。
- 生成的技能必须带齐基因:`scripts/`(确定性)⟂ `prompt.md`(语义)、`skill.yaml` 的 when-to-use 与自描述字段。
````

- [ ] **Step 2: 验证 plugin.json 引用正确**

Run: `node -e "const p=require('./plugin.json'); if(!p.commands.includes('commands/inherit.md')) throw new Error('missing command'); console.log('plugin ok')"`
Expected: `plugin ok`

- [ ] **Step 3: 人工核对清单(写进 commit message)**

确认:`commands/inherit.md` 有 frontmatter(name/description);流程引用的 `lib/cli.mjs` 接口与 Task 6 一致(`inherit . --name --from`);引用的种子路径 `gene/golden-skill/` 存在。

- [ ] **Step 4: Commit**

```bash
git add commands/inherit.md plugin.json
git commit -m "feat: /inherit meta-command prompt wired to deterministic engine"
```

---

## Task 9: 端到端验收测试(对应 spec §9)

**Files:**
- Test: `test/acceptance.test.mjs`

> 覆盖 §9 中可自动化的验收点(余下"另一宿主识别"为人工核对,见 Step 5)。

- [ ] **Step 1: 写验收测试**

```javascript
// test/acceptance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';
import { fingerprintDir } from '../lib/skill-install.mjs';

const GOLDEN = resolve('gene/golden-skill');
function tmp() { return mkdtempSync(join(tmpdir(), 'mh-acc-')); }

test('§9.1 空目录 inherit → 地基 + 技能 + AGENTS.md', () => {
  const d = tmp();
  const r = inherit(d, { name: 'review', from: GOLDEN });
  assert.equal(r.stamped, true);
  assert.equal(existsSync(join(d, '.gene', 'gene.yaml')), true);
  assert.equal(existsSync(join(d, 'skills', 'review', 'prompt.md')), true);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true });
});

test('§9.2 再次 inherit 加技能 → 不重刻地基, 已有文件指纹不变', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  const before = fingerprintDir(join(d, 'skills', 'review'));
  // 造第二个技能源
  const src2 = tmp();
  cpSync(GOLDEN, src2, { recursive: true });
  writeFileSync(join(src2, 'skill.yaml'), 'name: audit\ndescription: 设计审查\nwhen-to-use: 检查反模式\n', 'utf8');
  const r2 = inherit(d, { name: 'audit', from: src2 });
  assert.equal(r2.stamped, false);                                   // 地基只刻一次
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['audit', 'review']);
  assert.equal(fingerprintDir(join(d, 'skills', 'review')), before); // 已有技能零改动
  rmSync(d, { recursive: true, force: true }); rmSync(src2, { recursive: true, force: true });
});

test('§9.3 /review 确定性脚本对真实 diff 取出改动', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  const run = (...a) => execFileSync('git', a, { cwd: d });
  run('init'); run('config', 'user.email', 't@t.io'); run('config', 'user.name', 't');
  writeFileSync(join(d, 'a.txt'), 'one\n'); run('add', '.'); run('commit', '-m', 'init');
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n');
  const out = execFileSync('node', [join(d, 'skills', 'review', 'scripts', 'collect-diff.mjs'), 'HEAD'],
    { cwd: d, encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.deepEqual(parsed.files, ['a.txt']);
  assert.match(parsed.diff, /\+two/);
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: 运行,确认失败(若引擎有缺口)/通过**

Run: `node --test test/acceptance.test.mjs`
Expected: PASS（3 个测试通过）。若失败,按报错回到对应 Task 修复。

- [ ] **Step 3: 跑全量测试**

Run: `node --test`
Expected: 全部 PASS（fingerprint/manifest/foundation/skill-install/compiler/cli/collect-diff/acceptance)。

- [ ] **Step 4: Commit**

```bash
git add test/acceptance.test.mjs
git commit -m "test: end-to-end acceptance for v0.1 (spec §9)"
```

- [ ] **Step 5: 人工验收(§9 余项)**

在一个真实仓库里 `node lib/cli.mjs inherit . --name review --from gene/golden-skill`,然后:
- 用 Cursor 打开该仓库,确认它能读到生成的 `AGENTS.md` 并据此调用 `review`(此为人工/宿主相关核对,记录结论)。
- 确认全程"一条命令完成、无需任何方法论/角色"。

---

## Self-Review(计划自查结果)

- **Spec 覆盖**:§9.1↔Task9.1 / §9.2(幂等)↔Task3/4/6/9.2 / §9.3(/review 跑通)↔Task7/9.3 / §9.4(另一宿主识别)↔Task9.Step5(人工)/ §9.5(一条命令无方法论)↔Task8+Task9.Step5。5 基因:①Task7(scripts⟂prompt)②Task5(AGENTS.md)③Task7(reference 按需)④Task3(GENE.md)⑤Task7(skill.yaml uses 字段)。
- **占位符**:无 TBD/TODO;所有代码步骤含完整代码与命令。
- **类型/签名一致**:`inherit(targetDir,{name,from})`、`installSkill→{name,fingerprint,changed}`、`gene.yaml={geneVersion,skills:[{name,fingerprint}]}`、`collectDiff(cwd,base)→{files,diff}` 全计划一致。
