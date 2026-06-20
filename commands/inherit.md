<!-- commands/inherit.md -->
---
name: inherit
description: 把基因地基刻进当前项目并长出一个基因合规技能(幂等)
allowed-tools: Bash(node *)
---

# /inherit — 长出一个基因合规技能

你的任务:在**当前项目**里,用 Geneprint 的确定性引擎,幂等地刻地基并长出用户想要的技能。引擎在 `${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs`。**不要**手工创建 `.gene/` 或编辑 `AGENTS.md`——这些由引擎完成,保证幂等。

## 流程

1. **理解意图**:与用户对话,弄清这个技能要做什么。问清:
   - 技能要解决什么?(一句话)
   - 技能名(kebab-case,如 `review`、`changelog`)?
   - 它需要确定性脚本吗?需要哪些 reference 知识?

2. **生成合规骨架**(用引擎搭,保证结构永远合规):
   ```bash
   TMP=$(mktemp -d)
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" scaffold "$TMP" --name <name>
   ```
   生成 `skill.yaml`(含 when-to-use + `uses:` 自描述块)、`prompt.md`、`scripts/`、`reference/`。

3. **填入内容**:编辑 `$TMP` 里的文件:
   - `skill.yaml`:补 `description` 与 `when-to-use`;若用到 mcp/权限/子agent,在 `uses:` 声明。
   - `prompt.md`:写清 LLM 要做什么、产出什么。
   - 确定性步骤放 `scripts/*.mjs`(0 token),按需知识放 `reference/*.md`。

4. **刻进项目(引擎负责幂等)**:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" inherit . --name <name> --from "$TMP"
   ```
   引擎:无地基则刻(`.gene/`、`GENE.md`、`skills/`)→ 指纹幂等装技能 → 更新 `.gene/gene.json` → 重编译 `AGENTS.md`。

5. **回报结果**:转述引擎输出的 JSON(`stamped` / `skill.changed` / `compiledSkills`);`skill.changed=false` 表示该技能已存在且未变化(幂等,未重复写)。

## 原则
- 严格幂等:可安全重跑,不破坏用户已有文件。
- 刻完即走:不在项目里留下对本插件的运行时依赖。
- 生成的技能必须带齐基因:`scripts/`(确定性)⟂ `prompt.md`(语义)、`skill.yaml` 的 when-to-use 与自描述字段。
