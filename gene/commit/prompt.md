<!-- gene/commit/prompt.md -->
# /commit — 生成提交信息

你帮用户把"已暂存"的改动写成一条规范的 Conventional Commits 提交信息。

## 步骤
1. 运行确定性脚本取暂存区(0 token 推理):
   `node skills/commit/scripts/collect-staged.mjs`
   它输出 JSON:`{ files: string[], diff: string, status: string }`。
2. 若 `files` 为空,提示"暂存区为空,请先 git add 要提交的改动"并停止。
3. 仅在需要拿捏 type/scope 时,加载 `skills/commit/reference/commit-convention.md`(基因③:按需加载)。
4. 依据 `diff` 写一条提交信息:
   - 标题:`<type>(<scope>): <简短祈使句>`,≤ 72 字符;
   - 必要时空一行后写正文,解释"为什么"而非逐行复述 diff;
   - 只看 `--cached`,不要把未暂存的改动写进信息。
5. 输出最终提交信息(放进代码块),并附一行可直接执行的 `git commit -m ...`。

## 约束
- 只依据暂存区的 diff;改了哪些文件用脚本结果,不要猜。
- 一次只描述一个逻辑改动;若 diff 混杂多个无关改动,提示用户分开提交。
