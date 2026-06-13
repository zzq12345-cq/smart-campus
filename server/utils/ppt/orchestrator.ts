/**
 * PPT 三阶段生成流水线
 * 参考 智慧思政/server/utils/ppt/orchestrator.ts 精简版
 *
 * 阶段1: 大纲生成 (AI)
 * 阶段2: 语义规划 (本地)
 * 阶段3: SVG 渲染 (AI 并发)
 */

import type {
  OutlineDocument,
  SemanticPage,
  LayoutPlan,
  ContentBlock,
  PageRole,
  BlockType,
  GenerationIntent,
  PptSlide,
  ThemeDefinition,
} from './types.js'
import { getTheme } from './theme.js'

// ===== 配置 =====
const RENDER_CONCURRENCY = 2
const RENDER_TIMEOUT_MS = 150000
const OUTLINE_TIMEOUT_MS = 90000

interface PptConfig {
  apiKey: string
  apiUrl: string
  outlineModel: string
  renderModel: string
}

function getConfig(): PptConfig {
  return {
    apiKey: process.env.ZHIPU_API_KEY || '',
    apiUrl: `${process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4'}/chat/completions`,
    outlineModel: process.env.PPT_OUTLINE_MODEL || 'glm-5.1',
    renderModel: process.env.PPT_RENDER_MODEL || 'glm-5v-turbo',
  }
}

// ===== 工具函数 =====
function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function stripMarkdown(text: string): string {
  return text.replace(/[`*_>#-]/g, '').trim()
}

function safeText(value: unknown, fallback: string): string {
  return (typeof value === 'string' && value.trim()) ? value.trim() : fallback
}

function cleanTextArray(values: unknown[]): string[] {
  return values.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean)
}

function extractJson(text: string): string {
  // 尝试提取 [PPT_OUTLINE]...[/PPT_OUTLINE] 标签
  const tagged = text.match(/\[PPT_OUTLINE\]\s*([\s\S]*?)\s*\[\/PPT_OUTLINE\]/i)
  if (tagged?.[1]) return tagged[1].trim()

  // 尝试提取 ```json...``` 代码块
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeBlock?.[1]) return codeBlock[1].trim()

  // 尝试提取 JSON 对象
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)

  return ''
}

function extractSvgDocument(rawText: string): string {
  const tagged = rawText.match(/\[PPT_SVG\]\s*([\s\S]*?)\s*\[\/PPT_SVG\]/i)
  const candidate = tagged?.[1] || rawText
  const svgMatch = candidate.match(/<svg[\s\S]*?<\/svg>/i)
  return svgMatch?.[0]?.trim() || ''
}

function isSafeSvg(svg: string): boolean {
  if (!svg || !/<svg[\s\S]*<\/svg>/i.test(svg)) return false
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/i.test(svg)) return false
  if (!/viewBox="0 0 1280 720"/i.test(svg)) return false
  if (/<script[\s>]/i.test(svg) || /<foreignObject[\s>]/i.test(svg)) return false
  if (/(href|xlink:href)="https?:\/\//i.test(svg)) return false
  return true
}

// ===== AI 请求 =====
async function requestAI(
  modelId: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number }
): Promise<string> {
  const config = getConfig()
  if (!config.apiKey) throw new Error('智谱 API Key 未配置')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000)
  const startTime = Date.now()

  try {
    console.log(`[PPT AI] URL: ${config.apiUrl}, model: ${modelId}`)
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[PPT AI] ${modelId} error:`, response.status, errorText)
      throw new Error(`AI 请求失败: ${response.status}`)
    }

    const data = await response.json() as any
    const elapsed = Date.now() - startTime
    const msg = data.choices?.[0]?.message

    // 优先取 content，如果为空则取 reasoning_content
    let content = msg?.content
    if (!content && msg?.reasoning_content) {
      console.log(`[PPT AI] ${modelId} content 为空，使用 reasoning_content`)
      content = msg.reasoning_content
    }

    const result = typeof content === 'string' ? content.trim()
      : Array.isArray(content) ? content.map((p: any) => typeof p === 'string' ? p : p?.text || p?.content || '').filter(Boolean).join('\n').trim()
      : ''

    console.log(`[PPT AI] ${modelId} 完成, ${elapsed}ms, ${result.length} chars`)
    return result
  } finally {
    clearTimeout(timeoutId)
  }
}

// ===== 阶段1: 大纲生成 =====

function buildFallbackOutline(topic: string, pageCount: number): OutlineDocument {
  const contentPages = Math.max(3, Math.min(8, pageCount - 3))
  const sectionTitles = ['核心认识', '课堂解析', '实践提升']
  const sections = sectionTitles.map((title, i) => ({
    id: `section-${i + 1}`,
    title,
    pages: [] as OutlineDocument['sections'][number]['pages'],
  }))

  for (let i = 0; i < contentPages; i++) {
    const section = sections[i % sections.length]
    section.pages.push({
      id: `section-${(i % sections.length) + 1}-page-${section.pages.length + 1}`,
      title: `${topic} · ${i + 1}`,
      content: [`围绕"${topic}"提炼课堂要点`, '联系真实情境进行理解与分析', '形成可落地的课堂表达与行动建议'],
    })
  }

  return {
    cover: { title: topic, subtitle: '教学课件' },
    toc: { title: '目录', items: sections.map(s => s.title) },
    sections,
    summary: `围绕"${topic}"完成知识梳理与课堂互动。`,
    endPage: { title: '总结与展望', subtitle: '学以致用' },
  }
}

function parseOutline(rawText: string, topic: string, pageCount: number): OutlineDocument {
  const jsonText = extractJson(rawText)
  if (!jsonText) return buildFallbackOutline(topic, pageCount)

  try {
    const parsed = JSON.parse(jsonText) as any
    const source = parsed.ppt_outline || parsed

    const rawSections = Array.isArray(source.parts) && source.parts.length > 0
      ? source.parts
      : Array.isArray(source.sections) ? source.sections : []

    const sections = rawSections.map((sec: any, si: number) => {
      const pages = (Array.isArray(sec.pages) ? sec.pages : []).map((p: any, pi: number) => ({
        id: `section-${si + 1}-page-${pi + 1}`,
        title: safeText(p.title, `${safeText(sec.part_title || sec.title, `第${si + 1}部分`)} · ${pi + 1}`),
        summary: typeof p.summary === 'string' ? p.summary.trim() : undefined,
        content: cleanTextArray(Array.isArray(p.content) ? p.content : []),
      })).filter((p: any) => p.title)

      return {
        id: `section-${si + 1}`,
        title: safeText(sec.part_title || sec.title, `第${si + 1}部分`),
        pages,
      }
    }).filter((s: any) => s.pages.length > 0)

    if (sections.length === 0) return buildFallbackOutline(topic, pageCount)

    // 裁剪到目标页数
    const targetContentPages = Math.max(1, pageCount - 3) // 减去封面、目录、结束页
    let remaining = targetContentPages
    const trimmed = sections.map((s: any) => {
      if (remaining <= 0) return { ...s, pages: [] }
      const pages = s.pages.slice(0, remaining)
      remaining -= pages.length
      return { ...s, pages }
    }).filter((s: any) => s.pages.length > 0)

    const tocItems = cleanTextArray(source.table_of_contents?.content || source.toc?.items || trimmed.map((s: any) => s.title))

    return {
      cover: { title: safeText(source.cover?.title, topic), subtitle: safeText(source.cover?.subtitle || source.cover?.sub_title, '教学课件') },
      toc: tocItems.length > 0 ? { title: safeText(source.table_of_contents?.title || source.toc?.title, '目录'), items: tocItems } : undefined,
      sections: trimmed,
      summary: typeof source.summary === 'string' ? source.summary.trim() : undefined,
      endPage: {
        title: safeText(source.end_page?.title || source.endPage?.title, '感谢聆听'),
        subtitle: safeText(source.end_page?.subtitle || source.endPage?.subtitle, '学以致用'),
      },
    }
  } catch {
    return buildFallbackOutline(topic, pageCount)
  }
}

async function generateOutline(intent: GenerationIntent): Promise<OutlineDocument> {
  const config = getConfig()
  const systemPrompt = `# Role: 顶级的PPT结构架构师
## Goals
基于用户提供的教学主题，设计一份逻辑严密、层次清晰的 PPT 大纲。

## 输出规范
请严格按照以下 JSON 格式输出，结果用 [PPT_OUTLINE] 和 [/PPT_OUTLINE] 包裹：
[PPT_OUTLINE]
{
  "ppt_outline": {
    "cover": { "title": "主标题", "sub_title": "副标题" },
    "table_of_contents": { "title": "目录", "content": ["第一部分", "第二部分"] },
    "parts": [
      {
        "part_title": "第一部分",
        "pages": [
          { "title": "页面标题", "content": ["要点1", "要点2", "要点3"] }
        ]
      }
    ],
    "end_page": { "title": "总结与展望", "sub_title": "课堂升华" }
  }
}
[/PPT_OUTLINE]

## Constraints
1. 内容贴合教学场景${intent.subject ? `，学科：${intent.subject}` : ''}
2. 总页数控制在 ${intent.pageCount} 页左右（含封面、目录、结束页）
3. 内容表达精炼，适合直接生成课件页面
4. ${intent.focus ? `重点关注：${intent.focus}` : '内容全面、层次分明'}`

  const content = await requestAI(config.outlineModel, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请为以下教学主题生成 PPT 大纲：\n\n${intent.topic}` },
  ], { temperature: 0.7, maxTokens: 4096, timeoutMs: OUTLINE_TIMEOUT_MS })

  console.log('[PPT] 大纲原文长度:', content.length)
  return parseOutline(content, intent.topic, intent.pageCount)
}

// ===== 阶段2: 语义规划 =====

function createBlock(pageId: string, index: number, type: BlockType, payload: Record<string, unknown>): ContentBlock {
  return { id: `${pageId}-block-${index + 1}`, type, payload, editable: true }
}

function choosePageRole(title: string, content: string[]): PageRole {
  const signal = `${title} ${content.join(' ')}`
  if (/案例|事例|故事|情境/.test(signal)) return 'case-study'
  if (/思考|讨论|互动|问题|辨析|探究|活动/.test(signal)) return 'interaction'
  if (/名言|引用|格言|金句/.test(signal)) return 'quote'
  if (/时间线|历程|进程|发展史|阶段/.test(signal)) return 'timeline'
  if (/对比|比较|区别|联系/.test(signal)) return 'comparison'
  if (/总结|小结|回顾|提升|结语/.test(signal)) return 'summary'
  if (/路径|做法|措施|要求|方法|步骤|原则|重点/.test(signal) || content.length >= 4) return 'breakdown'
  return 'concept'
}

function buildContentBlocks(pageId: string, title: string, summary: string | undefined, content: string[]): { pageRole: PageRole; blocks: ContentBlock[] } {
  const items = [summary, ...content].filter(Boolean) as string[]
  const pageRole = choosePageRole(title, items)

  switch (pageRole) {
    case 'quote':
      return { pageRole, blocks: [createBlock(pageId, 0, 'quote', { text: items[0] || title })] }
    case 'case-study':
      return { pageRole, blocks: [createBlock(pageId, 0, 'case', { title, body: items.join('；') || title })] }
    case 'interaction':
      return {
        pageRole,
        blocks: [
          createBlock(pageId, 0, 'question', { text: items[0] || title, hint: items[1] }),
          ...(items[2] ? [createBlock(pageId, 1, 'summary-note', { text: items[2] })] : []),
        ],
      }
    case 'summary':
      return {
        pageRole,
        blocks: [
          ...(items[0] ? [createBlock(pageId, 0, 'summary-note', { text: items[0] })] : []),
          ...(items.length > 1 ? [createBlock(pageId, 1, 'bullet-list', { items: items.slice(1, 6) })] : []),
        ],
      }
    default:
      if (items.length <= 1) {
        return { pageRole, blocks: [createBlock(pageId, 0, 'paragraph', { text: items[0] || title })] }
      }
      return { pageRole, blocks: [createBlock(pageId, 0, 'bullet-list', { items: items.slice(0, 5) })] }
  }
}

function buildSemanticPages(outline: OutlineDocument): SemanticPage[] {
  const pages: SemanticPage[] = []
  let pageNo = 1

  // 封面
  const coverId = `page-${pageNo++}`
  pages.push({
    pageId: coverId, pageRole: 'cover', title: outline.cover.title,
    subtitle: outline.cover.subtitle, contentIntent: '封面页',
    blocks: [createBlock(coverId, 0, 'paragraph', { text: outline.cover.subtitle || '教学课件' })],
  })

  // 目录
  if (outline.toc?.items?.length) {
    const tocId = `page-${pageNo++}`
    pages.push({
      pageId: tocId, pageRole: 'toc', title: outline.toc.title,
      contentIntent: '目录页',
      blocks: [createBlock(tocId, 0, 'bullet-list', { items: outline.toc.items.slice(0, 6) })],
    })
  }

  // 内容页
  for (const section of outline.sections) {
    for (const page of section.pages) {
      const pageId = `page-${pageNo++}`
      const result = buildContentBlocks(pageId, page.title, page.summary, page.content)
      pages.push({
        pageId, pageRole: result.pageRole, title: page.title,
        subtitle: section.title, contentIntent: section.title,
        blocks: result.blocks.length > 0 ? result.blocks : [createBlock(pageId, 0, 'paragraph', { text: page.title })],
      })
    }
  }

  // 结束页
  const endId = `page-${pageNo}`
  pages.push({
    pageId: endId, pageRole: 'end', title: outline.endPage?.title || '感谢聆听',
    subtitle: outline.endPage?.subtitle, contentIntent: '结束页',
    blocks: [createBlock(endId, 0, 'summary-note', { text: outline.summary || outline.endPage?.subtitle || '学以致用' })],
  })

  return pages
}

function buildLayoutPlan(page: SemanticPage): LayoutPlan {
  const variant = (() => {
    switch (page.pageRole) {
      case 'cover': case 'quote': case 'case-study': case 'interaction': case 'end': return 'focus'
      case 'toc': case 'timeline': case 'summary': return page.blocks.length <= 1 ? 'focus' : 'grid'
      case 'comparison': return 'split'
      default: return page.blocks.length <= 1 ? 'focus' : page.blocks.length === 2 ? 'split' : 'grid'
    }
  })()
  return { pageId: page.pageId, layoutFamily: variant, layoutId: `${page.pageRole}-${variant}` }
}

// ===== 阶段3: SVG 渲染 =====

function getBlockPreview(block: ContentBlock): string {
  const p = block.payload as any
  if (p.text) return String(p.text).slice(0, 100)
  if (p.items) return (p.items as string[]).slice(0, 3).join('、')
  if (p.body) return String(p.body).slice(0, 100)
  return ''
}

function buildRenderPrompt(page: SemanticPage, layout: LayoutPlan, theme: ThemeDefinition, pageNo: number, totalPages: number): string {
  return [
    '你是一位专业 PPT SVG 视觉设计师。',
    '请根据给定页面语义、布局和主题 token，生成一张 1280x720 的完整 SVG 幻灯片。',
    '',
    '输出要求：',
    '1. 只能输出以下结构：',
    '[PPT_SVG]',
    '<svg ...>...</svg>',
    '[/PPT_SVG]',
    '2. 必须包含 xmlns="http://www.w3.org/2000/svg"。',
    '3. 必须包含 viewBox="0 0 1280 720"。',
    '4. 不要输出解释、Markdown 代码块、注释。',
    '5. 禁止 script、foreignObject、外链 URL。',
    '6. 字体使用 Microsoft YaHei, SimHei, sans-serif。',
    '7. 设计要美观、专业，使用主题配色。',
    '',
    `页码：${pageNo}/${totalPages}`,
    `页面角色：${page.pageRole}`,
    `页面标题：${page.title}`,
    page.subtitle ? `页面副标题：${page.subtitle}` : '',
    `布局：${layout.layoutId} (${layout.layoutFamily})`,
    '',
    '内容数据(JSON)：',
    JSON.stringify({
      pageNo, totalPages,
      pageRole: page.pageRole,
      title: page.title,
      subtitle: page.subtitle,
      blocks: page.blocks.map(b => ({ type: b.type, preview: getBlockPreview(b), payload: b.payload })),
      theme: { colors: theme.tokenSet.colors, typography: theme.tokenSet.typography },
    }, null, 2),
  ].filter(Boolean).join('\n')
}

async function renderPageSvg(
  page: SemanticPage, layout: LayoutPlan, theme: ThemeDefinition,
  pageNo: number, totalPages: number
): Promise<string> {
  const config = getConfig()
  const prompt = buildRenderPrompt(page, layout, theme, pageNo, totalPages)

  try {
    // 第一次尝试
    const firstPass = await requestAI(config.renderModel, [
      { role: 'system', content: '你负责生成可直接渲染的 PPT SVG 页面。严格遵守输出协议。' },
      { role: 'user', content: prompt },
    ], { temperature: 0.4, maxTokens: 8192, timeoutMs: RENDER_TIMEOUT_MS })

    const firstSvg = extractSvgDocument(firstPass)
    if (isSafeSvg(firstSvg)) return firstSvg

    // 如果 SVG 格式有误但有内容，放宽 viewBox 检查直接用
    if (firstSvg && /<svg[\s\S]*<\/svg>/i.test(firstSvg)) {
      console.log(`[PPT] 第${pageNo}页 SVG 格式不完全合规但可用`)
      return firstSvg
    }

    console.log(`[PPT] 第${pageNo}页 SVG 无效 (${firstSvg.length} chars)，使用占位`)
  } catch (err: any) {
    console.error(`[PPT] 第${pageNo}页渲染失败: ${err.message}，使用占位`)
  }

  return buildFallbackSvg(page, theme, pageNo, totalPages)
}

function buildFallbackSvg(page: SemanticPage, theme: ThemeDefinition, pageNo: number, totalPages: number): string {
  const c = theme.tokenSet.colors
  const title = escapeXml(page.title)
  const subtitle = escapeXml(page.subtitle || page.contentIntent)
  const content = page.blocks.map(b => escapeXml(getBlockPreview(b))).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="${c.background}"/>
  <rect width="1280" height="80" fill="${c.primary}"/>
  <text x="640" y="50" text-anchor="middle" fill="${c.headerText}" font-size="28" font-family="Microsoft YaHei, SimHei, sans-serif" font-weight="bold">${title}</text>
  <text x="640" y="140" text-anchor="middle" fill="${c.textSecondary}" font-size="20" font-family="Microsoft YaHei, SimHei, sans-serif">${subtitle}</text>
  <text x="640" y="360" text-anchor="middle" fill="${c.text}" font-size="18" font-family="Microsoft YaHei, SimHei, sans-serif">${escapeXml(content.slice(0, 200))}</text>
  <text x="1240" y="700" text-anchor="end" fill="${c.footerText}" font-size="14" font-family="Microsoft YaHei, SimHei, sans-serif">${pageNo}/${totalPages}</text>
</svg>`
}

// ===== 并发工具 =====
async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  async function run() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await worker(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()))
  return results
}

// ===== 主流程 =====
export async function generatePptSlides(intent: GenerationIntent): Promise<{ title: string; totalPages: number; slides: PptSlide[]; outline: OutlineDocument }> {
  console.log('[PPT] === 开始生成 ===', intent.topic)

  // 阶段1: 大纲
  console.log('[PPT] 阶段1: 生成大纲...')
  const outline = await generateOutline(intent)
  console.log('[PPT] 大纲完成:', outline.sections.length, '个章节')

  // 阶段2: 语义规划
  console.log('[PPT] 阶段2: 语义规划...')
  const semanticPages = buildSemanticPages(outline)
  const layoutPlans = semanticPages.map(buildLayoutPlan)
  console.log('[PPT] 语义规划完成:', semanticPages.length, '页')

  // 阶段3: SVG 渲染
  console.log('[PPT] 阶段3: SVG 渲染...')
  const theme = getTheme(intent.style)
  const totalPages = semanticPages.length

  const svgResults = await mapWithConcurrency(semanticPages, RENDER_CONCURRENCY, async (page, index) => {
    const layout = layoutPlans[index]
    console.log(`[PPT] 渲染第 ${index + 1}/${totalPages} 页: ${page.title}`)
    const svg = await renderPageSvg(page, layout, theme, index + 1, totalPages)
    console.log(`[PPT] 第 ${index + 1}/${totalPages} 页完成 (${svg.length} bytes)`)
    return svg
  })

  const slides: PptSlide[] = semanticPages.map((page, i) => ({
    type: page.pageRole,
    title: page.title,
    svg: svgResults[i],
  }))

  console.log('[PPT] === 生成完成 ===', slides.length, '页')

  return {
    title: outline.cover.title,
    totalPages: slides.length,
    slides,
    outline,
  }
}
