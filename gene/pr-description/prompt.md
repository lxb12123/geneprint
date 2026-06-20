<!-- gene/pr-description/prompt.md -->
# /pr-description — 生成 PR 描述

你根据"本分支相对基线"的提交,写一份清晰的 Pull Request 描述。

## 步骤
1. 运行确定性脚本取提交与改动规模(0 token 推理),基线默认 `main`:
   `node skills/pr-description/scripts/collect-commits.mjs main`
   它输出 JSON:`{ base, commits: string[], diffstat: string }`。
2. 若 `commits` 为空,提示"相对 <base> 没有新提交"并停止(或让用户换基线)。
3. 仅在需要模板结构时,加载 `skills/pr-description/reference/pr-template.md`(基因③:按需加载)。
4. 依据 commits 与 diffstat 输出:
   - 标题:一句话概括本 PR;
   - `## Summary`:2-4 条要点,说清改了什么、为什么;
   - `## Test Plan`:可勾选的验证步骤。
5. 整份描述放进代码块,便于直接粘贴到 PR。

## 约束
- 只综述脚本给出的提交/改动,不要臆造未发生的变更。
- 摘要讲动机与影响,不要逐条复述每个 commit。
