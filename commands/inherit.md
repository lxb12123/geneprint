<!-- commands/inherit.md -->
---
name: inherit
description: 把基因地基刻进当前项目并长出一个基因合规技能(幂等)
---

# /inherit — 长出一个基因合规技能

你的任务:在**当前项目**里,用 Geneprint 的确定性引擎,幂等地刻地基并长出用户想要的技能。**不要**手工创建 `.gene/` 或编辑 `AGENTS.md`——这些由引擎完成,保证幂等。

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
