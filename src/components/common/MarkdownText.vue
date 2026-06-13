<template>
  <view class="md-text">
    <rich-text :nodes="parsedHtml" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  content: string
  theme?: 'light' | 'dark'
}>()

/**
 * 轻量 Markdown → HTML 转换器
 * 支持标题、加粗、斜体、列表、代码块、行内代码、分割线、表格、引用块
 */
function markdownToHtml(md: string): string {
  if (!md) return ''

  let html = md

  // 代码块 ```...```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    const escaped = escapeHtml(code.trim())
    return `<pre class="md-code-block"><code>${escaped}</code></pre>`
  })

  // 行内代码 `...`
  html = html.replace(/`([^`\n]+)`/g, '<code class="md-code-inline">$1</code>')

  // 按行处理
  const lines = html.split('\n')
  const result: string[] = []
  let inList = false
  let listType = '' // 'ul' or 'ol'
  let inTable = false
  let inBlockquote = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 跳过已处理的代码块标签
    if (line.startsWith('<pre') || line.startsWith('</pre>')) {
      if (inList) { result.push(`</${listType}>`); inList = false }
      if (inTable) { result.push('</table>'); inTable = false }
      if (inBlockquote) { result.push('</div>'); inBlockquote = false }
      result.push(line)
      continue
    }

    // 表格分隔行（|:---|:---|）跳过
    if (/^\s*\|?[\s:]*-{2,}[\s:]*\|/.test(line) && /^[\s|:\-]+$/.test(line)) {
      continue
    }

    // 表格行（| ... | ... |）
    const tableMatch = line.match(/^\s*\|(.+)\|\s*$/)
    if (tableMatch) {
      if (inList) { result.push(`</${listType}>`); inList = false }
      if (inBlockquote) { result.push('</div>'); inBlockquote = false }
      if (!inTable) {
        result.push('<table class="md-table">')
        inTable = true
      }
      const cells = tableMatch[1].split('|').map(c => c.trim())
      const isHeader = i + 1 < lines.length && /^[\s|:\-]+$/.test(lines[i + 1])
      const tag = isHeader ? 'th' : 'td'
      result.push('<tr>' + cells.map(c => `<${tag}>${inlineFormat(c)}</${tag}>`).join('') + '</tr>')
      continue
    }

    // 关闭表格
    if (inTable) { result.push('</table>'); inTable = false }

    // 引用块 > ...
    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      if (inList) { result.push(`</${listType}>`); inList = false }
      if (!inBlockquote) {
        result.push('<div class="md-blockquote">')
        inBlockquote = true
      }
      result.push(`<div class="md-p">${inlineFormat(quoteMatch[1])}</div>`)
      continue
    }

    // 关闭引用块
    if (inBlockquote) { result.push('</div>'); inBlockquote = false }

    // 标题 # ~ ####
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      if (inList) { result.push(`</${listType}>`); inList = false }
      const level = headingMatch[1].length
      const text = inlineFormat(headingMatch[2])
      result.push(`<div class="md-h${level}">${text}</div>`)
      continue
    }

    // 分割线
    if (/^[-*_]{3,}\s*$/.test(line)) {
      if (inList) { result.push(`</${listType}>`); inList = false }
      result.push('<div class="md-hr"></div>')
      continue
    }

    // 无序列表 - / * / •
    const ulMatch = line.match(/^[\s]*[-*•]\s+(.+)$/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`)
        result.push('<ul class="md-ul">')
        inList = true
        listType = 'ul'
      }
      result.push(`<li>${inlineFormat(ulMatch[1])}</li>`)
      continue
    }

    // 有序列表 1. 2. 等
    const olMatch = line.match(/^[\s]*\d+[.)]\s+(.+)$/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`)
        result.push('<ol class="md-ol">')
        inList = true
        listType = 'ol'
      }
      result.push(`<li>${inlineFormat(olMatch[1])}</li>`)
      continue
    }

    // 关闭列表
    if (inList && line.trim() === '') {
      result.push(`</${listType}>`)
      inList = false
      continue
    }

    // 【教案格式】标签行
    const labelMatch = line.match(/^[【\[](.+?)[】\]]\s*[:：]?\s*(.*)$/)
    if (labelMatch) {
      if (inList) { result.push(`</${listType}>`); inList = false }
      const label = labelMatch[1]
      const value = labelMatch[2] ? inlineFormat(labelMatch[2]) : ''
      result.push(`<div class="md-label"><span class="md-label-tag">${escapeHtml(label)}</span>${value ? ` ${value}` : ''}</div>`)
      continue
    }

    // 普通段落
    if (inList) { result.push(`</${listType}>`); inList = false }
    if (line.trim()) {
      result.push(`<div class="md-p">${inlineFormat(line)}</div>`)
    } else {
      result.push('<div class="md-gap"></div>')
    }
  }

  if (inList) result.push(`</${listType}>`)
  if (inTable) result.push('</table>')
  if (inBlockquote) result.push('</div>')

  return result.join('')
}

/** 行内格式：加粗、斜体 */
function inlineFormat(text: string): string {
  let s = escapeHtml(text)
  // **加粗**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // *斜体*
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
  return s
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const parsedHtml = computed(() => markdownToHtml(props.content))
</script>

<style lang="scss" scoped>
.md-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: var(--text-main, #0f172a);
  word-break: break-word;

  :deep(.md-h1) {
    font-size: 36rpx;
    font-weight: 700;
    margin: 16rpx 0 8rpx;
    color: var(--text-main, #0f172a);
  }

  :deep(.md-h2) {
    font-size: 32rpx;
    font-weight: 700;
    margin: 14rpx 0 6rpx;
    color: var(--text-main, #0f172a);
  }

  :deep(.md-h3) {
    font-size: 30rpx;
    font-weight: 600;
    margin: 12rpx 0 4rpx;
    color: var(--text-main, #0f172a);
  }

  :deep(.md-h4) {
    font-size: 28rpx;
    font-weight: 600;
    margin: 10rpx 0 4rpx;
    color: var(--text-main, #0f172a);
  }

  :deep(.md-p) {
    margin: 4rpx 0;
  }

  :deep(.md-gap) {
    height: 12rpx;
  }

  :deep(strong) {
    font-weight: 700;
    color: var(--text-main, #0f172a);
  }

  :deep(em) {
    font-style: italic;
  }

  :deep(.md-ul),
  :deep(.md-ol) {
    padding-left: 36rpx;
    margin: 8rpx 0;
  }

  :deep(li) {
    margin: 4rpx 0;
    line-height: 1.7;
  }

  :deep(.md-hr) {
    height: 1px;
    background: var(--line, rgba(0,0,0,0.08));
    margin: 16rpx 0;
  }

  :deep(.md-code-inline) {
    background: rgba(192, 0, 0, 0.06);
    color: #c00000;
    padding: 2rpx 8rpx;
    border-radius: 6rpx;
    font-size: 26rpx;
    font-family: monospace;
  }

  :deep(.md-code-block) {
    background: rgba(0, 0, 0, 0.04);
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    margin: 12rpx 0;
    overflow-x: auto;
    font-size: 24rpx;
    line-height: 1.6;
    font-family: monospace;
  }

  :deep(.md-label) {
    margin: 10rpx 0 4rpx;
    font-size: 28rpx;
    line-height: 1.8;
  }

  :deep(.md-label-tag) {
    display: inline;
    font-weight: 700;
    color: #c00000;
    margin-right: 8rpx;
  }

  :deep(.md-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12rpx 0;
    font-size: 26rpx;
    overflow-x: auto;
    display: block;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid var(--line, rgba(0,0,0,0.1));
    padding: 10rpx 16rpx;
    text-align: left;
    line-height: 1.6;
  }

  :deep(th) {
    font-weight: 700;
    background: rgba(192, 0, 0, 0.06);
    color: var(--text-main, #0f172a);
  }

  :deep(td) {
    background: transparent;
  }

  :deep(tr:nth-child(even) td) {
    background: rgba(0, 0, 0, 0.02);
  }

  :deep(.md-blockquote) {
    border-left: 4rpx solid #c00000;
    padding: 8rpx 16rpx;
    margin: 8rpx 0;
    background: rgba(192, 0, 0, 0.04);
    border-radius: 0 8rpx 8rpx 0;
    color: var(--text-sub, #64748b);
  }
}
</style>
