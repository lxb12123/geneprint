// lib/managed-block.mjs
// 在共享宿主文件(.gitignore / CLAUDE.md 等)里维护一段"agent-path-forge 托管"的内容块。
// 用清晰的起止标记界定;重复运行只更新本块、不动用户的其余内容(严格幂等)。

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// 返回插入/替换托管块后的完整文件内容。
//   existing    现有文件内容(不存在时传 '')
//   startMarker / endMarker  托管块的起止标记行
//   body        本块要写入的正文(标记之间;不得自身含标记)
export function upsertBlock(existing, startMarker, endMarker, body) {
  if (body.includes(startMarker) || body.includes(endMarker)) {
    throw new Error('managed-block: body must not contain the block markers');
  }
  const block = `${startMarker}\n${body}\n${endMarker}`;
  // 只匹配"先 start 再 end"的成对区域(非贪婪):
  //  - 用户散文里单独出现某个标记,不会被误判成块;
  //  - 已有多个块时收敛为一个(首块原位更新,其余删除)。
  const pattern = `${escapeRe(startMarker)}[\\s\\S]*?${escapeRe(endMarker)}`;
  const hasBlock = (existing.match(new RegExp(pattern, 'g')) || []).length > 0;
  if (hasBlock) {
    let seen = 0;
    const out = existing.replace(new RegExp(pattern, 'g'), () => (seen++ === 0 ? block : ''));
    return out.replace(/\n{3,}/g, '\n\n');   // 收拢删除重复块后留下的多余空行
  }
  const base = existing.trimEnd();
  return base ? `${base}\n\n${block}\n` : `${block}\n`;   // 追加(与已有内容空行隔开)
}
