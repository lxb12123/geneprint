---
name: trace
description: Runtime observability summary for this project (gene skills & tool calls)
allowed-tools: Bash(node *)
---

# /trace — 运行时观测摘要

本项目装了 gene 后,`PostToolUse` hook 会被动把每次工具调用记到 `.gene/trace.jsonl`(运行时数据,已被 `.gene/.gitignore` 忽略,不入库)。

运行:
```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" trace .
```
输出 `{total, byTool, bySkill, failures}`。

把摘要讲给用户:总调用数、按工具分布(byTool)、按 gene 技能分布(bySkill)、失败次数(failures)。failures 偏多时,提示去看 `.gene/trace.jsonl` 里 `ok:false` 的具体条目。
