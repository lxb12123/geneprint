# Conventional Commits 速查

格式:`<type>(<scope>): <description>`

常用 type:
- `feat` 新功能
- `fix` 修复缺陷
- `docs` 仅文档
- `refactor` 不改外部行为的重构
- `test` 仅测试
- `chore` 构建 / 工具 / 杂项
- `perf` 性能
- `style` 仅格式(不影响语义)

规范:
- 标题用祈使句、现在时:"add" 而非 "added"。
- 标题 ≤ 72 字符,结尾不加句号。
- 破坏性变更:正文加 `BREAKING CHANGE: ...`,或在 type 后加 `!`。
- 正文解释动机与上下文(为什么),而不是逐行复述 diff。
