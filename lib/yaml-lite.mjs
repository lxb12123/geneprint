// lib/yaml-lite.mjs
// 零依赖的极简 YAML —— 只覆盖 geneprint 自己用到的子集:
//   注释(整行 / 行内)、key: value、嵌套 map、行内数组 [a,b] 与块状数组(- item)、
//   单/双引号与裸标量、true/false/null、数字、空 [] {}。
// 不支持的语法(tab 缩进、锚点&别名、块标量 | >、多文档、list-of-maps)→ 直接抛错,绝不静默猜。
// 只用于读"我们自己的简单配置"(skill.yaml / 规则 frontmatter);清单等机读文件用 JSON。

// 去掉行内注释:第一个"前面是空白(或行首)且不在引号内"的 # 起,到行尾。
function stripComment(line) {
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

// 按分隔符切分,但尊重引号与括号深度(给行内数组用)。
function splitTopLevel(str, delim) {
  const out = []; let cur = '', inS = false, inD = false, depth = 0;
  for (const c of str) {
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (!inS && !inD && (c === '[' || c === '{')) depth++;
    else if (!inS && !inD && (c === ']' || c === '}')) depth--;
    if (c === delim && !inS && !inD && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseFlowArray(s) {
  const inner = s.slice(1, -1).trim();
  if (inner === '') return [];
  const parts = splitTopLevel(inner, ',');
  if (parts.length > 1 && parts[parts.length - 1].trim() === '') parts.pop();   // 允许尾随逗号
  return parts.map((p) => {
    if (p.trim() === '') throw new Error(`yaml-lite: empty element in flow array: ${s}`);  // [a,,b]
    return parseScalar(p.trim());
  });
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '~' || /^null$/i.test(s)) return null;
  if (/^true$/i.test(s)) return true;                                      // 大小写一致(同 js-yaml core)
  if (/^false$/i.test(s)) return false;
  if (s === '[]') return [];
  if (s === '{}') return {};
  if (s[0] === '"') return JSON.parse(s);                                  // 双引号 ≈ JSON 字符串(非法会抛)
  if (s[0] === "'") {
    if (s.length < 2 || s[s.length - 1] !== "'") throw new Error(`yaml-lite: bad single-quoted scalar: ${s}`);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s[0] === '[') {
    if (s[s.length - 1] !== ']') throw new Error(`yaml-lite: unclosed flow array: ${s}`);  // 不静默猜
    return parseFlowArray(s);
  }
  if (s[0] === '{') throw new Error(`yaml-lite: inline maps not supported: ${s}`);
  if (s[0] === '&' || s[0] === '*') throw new Error(`yaml-lite: anchors/aliases not supported: ${s}`);
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  return s;                                                                // 裸字符串
}

// 向后看下一条有效行:更深的列表项→'list',更深的键→'map',没有更深→'none'
function childKind(lines, ln, indent) {
  for (let i = ln + 1; i < lines.length; i++) {
    const l = stripComment(lines[i]);
    if (l.trim() === '') continue;
    const ind = l.length - l.trimStart().length;
    if (ind <= indent) return 'none';
    return l.trim().startsWith('- ') ? 'list' : 'map';
  }
  return 'none';
}

export function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, container: root }];
  const lines = text.replace(/^﻿/, '').split('\n');
  for (let ln = 0; ln < lines.length; ln++) {
    if (/^\s*\t/.test(lines[ln])) throw new Error(`yaml-lite: tab indentation not supported (line ${ln + 1})`);
    const line = stripComment(lines[ln]);
    const content = line.trim();
    if (content === '' || content === '---' || content === '...') continue;
    const indent = line.length - line.trimStart().length;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].container;

    if (content.startsWith('- ')) {
      if (!Array.isArray(parent)) throw new Error(`yaml-lite: list item outside a list (line ${ln + 1})`);
      const item = content.slice(2).trim();
      if (/^[^[{"'].*:\s/.test(item)) throw new Error(`yaml-lite: list of maps not supported (line ${ln + 1})`);
      parent.push(parseScalar(item));
      continue;
    }

    const m = /^([^:]+):(.*)$/.exec(content);
    if (!m) throw new Error(`yaml-lite: cannot parse line ${ln + 1}: ${content}`);
    if (Array.isArray(parent)) throw new Error(`yaml-lite: key inside a list (line ${ln + 1})`);
    const key = m[1].trim();
    const rest = m[2].trim();
    if (rest === '') {
      const kind = childKind(lines, ln, indent);
      if (kind === 'none') { parent[key] = null; continue; }   // 裸 key: → null(同 js-yaml)
      const child = kind === 'list' ? [] : {};
      parent[key] = child;
      stack.push({ indent, container: child });
    } else {
      parent[key] = parseScalar(rest);
    }
  }
  return root;
}

// ---- 输出:把我们的小 frontmatter 对象写成合法 YAML(JSON 字符串本身就是合法 YAML)----
function needsQuote(s) {
  if (s === '') return true;
  if (/^\s|\s$/.test(s)) return true;
  if (/[\n\r\t]/.test(s)) return true;             // 控制字符 → 必须引号,否则产生非法多行 YAML
  if (/:(\s|$)|\s#/.test(s)) return true;          // ": " / 以":"结尾 / " #"
  if (/^[-?:,[\]{}&*!|>'"%@`]/.test(s)) return true;
  if (/^(true|false|null|~)$/i.test(s) || /^-?\d/.test(s)) return true;
  return false;
}

function emitScalar(v) {
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.map(emitScalar).join(', ')}]`;
  return needsQuote(v) ? JSON.stringify(v) : v;
}

// 单层 frontmatter:{ description, allowed-tools?, globs?, alwaysApply? }
export function toFrontmatter(obj) {
  return Object.entries(obj).map(([k, v]) => `${k}: ${emitScalar(v)}`).join('\n');
}
