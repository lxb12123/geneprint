---
name: eval
description: Grade a gene skill against its own evals/ cases
allowed-tools: Bash(node *)
---

# /eval — 评测一个技能

对某个技能(如 `skills/review`)跑它自带的 `evals/` 用例,看它达不达标。

## 流程
1. 确定要评测的技能目录 `skills/<name>`(问用户或取当前项目里已有的)。
2. 列出用例:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" eval skills/<name>
   ```
   输出 `[{name, input, expect}, ...]`。
3. **对每个 case**:按 `input` 描述设置场景(必要时建临时 fixture / git 仓库),运行该技能,捕获它的输出文本。
4. 把所有输出收集成一个 JSON `{ "<caseName>": "<output>" }`,写到临时文件,例如 `runs.json`。
   - 对带 `expect.rubric` 的用例:你(作为 LLM 裁判)判断该输出是否满足 rubric 描述,写成对象 `{ "<caseName>": { "output": "...", "rubric": true/false } }`。引擎会把确定性断言与你的 rubric 裁决一起计入通过与否。
5. 判分:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" eval skills/<name> --runs runs.json
   ```
   输出 `{total, passed, failed, cases:[{name, pass, failures}]}`。
6. 把报告转述给用户;对每个 `failures` 非空的用例,指出哪条期望(contains / notContains / matches)没满足。

## 说明
- `expect` 的确定性断言(contains / notContains / matches 正则)由引擎判分,通过/不通过以它为准。
- 需要主观质量(rubric)评判时,你可以额外评述,但不改变确定性结论。
- 评测**只读**用户项目,不写入。
