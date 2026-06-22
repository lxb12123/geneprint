// lib/scaffold.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const skillYaml = (name) => `name: ${name}
description: TODO 一句话描述这个技能做什么
when-to-use: TODO 什么场景下该用它
# argument-hint: <描述命令参数>   # 可选;仅用于 Claude Code 斜杠命令空格后的输入提示
# 自描述原语(基因⑤):声明这个技能用到的能力
uses:
  mcp: []
  permissions: []
  subagents: []
`;

const promptMd = (name) => `# /${name}

TODO:写清楚这个技能让 LLM 做什么、产出什么。

- 确定性的步骤放进 \`scripts/\`(0 token),在这里调用它的输出。
- 需要的领域知识放进 \`reference/\`,按需加载。
`;

// 生成一个空白但结构合规的技能骨架(供 /inherit 填充后再安装)
export function scaffoldSkill(destDir, name) {
  mkdirSync(join(destDir, 'scripts'), { recursive: true });
  mkdirSync(join(destDir, 'reference'), { recursive: true });
  writeFileSync(join(destDir, 'skill.yaml'), skillYaml(name), 'utf8');
  writeFileSync(join(destDir, 'prompt.md'), promptMd(name), 'utf8');
  return { destDir, name };
}
