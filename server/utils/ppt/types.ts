// ===== PPT 类型定义 =====

/** 页面角色 */
export type PageRole =
  | 'cover' | 'toc' | 'section-intro'
  | 'concept' | 'breakdown' | 'case-study'
  | 'interaction' | 'quote' | 'timeline'
  | 'comparison' | 'summary' | 'end'

/** 内容块类型 */
export type BlockType = 'paragraph' | 'bullet-list' | 'quote' | 'case' | 'question' | 'summary-note'

/** 内容块 */
export interface ContentBlock {
  id: string
  type: BlockType
  payload: Record<string, unknown>
  editable: boolean
}

/** 大纲文档 */
export interface OutlineDocument {
  cover: { title: string; subtitle?: string }
  toc?: { title: string; items: string[] }
  sections: Array<{
    id: string
    title: string
    pages: Array<{
      id: string
      title: string
      summary?: string
      content: string[]
    }>
  }>
  summary?: string
  endPage?: { title: string; subtitle?: string }
}

/** 语义页面 */
export interface SemanticPage {
  pageId: string
  pageRole: PageRole
  title: string
  subtitle?: string
  blocks: ContentBlock[]
  contentIntent: string
}

/** 布局方案 */
export interface LayoutPlan {
  pageId: string
  layoutFamily: string
  layoutId: string
}

/** 主题 token 集 */
export interface ThemeTokenSet {
  colors: Record<string, string>
  typography: Record<string, string | number>
  spacing: Record<string, number>
}

/** 主题定义 */
export interface ThemeDefinition {
  id: string
  tokenSet: ThemeTokenSet
}

/** PPT 幻灯片输出 */
export interface PptSlide {
  type: string
  title: string
  svg: string
}

/** 生成意图 */
export interface GenerationIntent {
  topic: string
  pageCount: number
  style: string
  focus: string
  subject?: string
}
