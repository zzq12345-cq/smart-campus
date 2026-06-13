import type { LocaleCode } from '@/types/ui'

export interface TeachingQuickAction {
  icon: string
  title: string
  subtitle: string
  route?: string
}

export interface TeachingPageData {
  headerTitle: string
  heroTitle: string
  heroSubtitle: string
  heroAction: string
  quickTitle: string
  recentTitle: string
  quickActions: TeachingQuickAction[]
}

export function getPageData(locale: LocaleCode): TeachingPageData {
  const isZh = locale === 'zh-CN'
  return {
    headerTitle: isZh ? '教学空间' : 'Teaching',
    heroTitle: isZh ? '智慧备课，高效教学' : 'Smart Teaching',
    heroSubtitle: isZh ? 'AI 赋能备课 · 一键生成教案和课件' : 'AI-powered lesson preparation',
    heroAction: isZh ? '开始备课' : 'Start Preparing',
    quickTitle: isZh ? '教学工具' : 'Tools',
    recentTitle: isZh ? '最近教案' : 'Recent Plans',
    quickActions: [
      {
        icon: 'smart_toy',
        title: isZh ? 'AI 备课' : 'AI Prep',
        subtitle: isZh ? '对话式智能备课' : 'AI-powered prep',
        route: '/pages/teaching/preparation'
      },
      {
        icon: 'description',
        title: isZh ? '我的教案' : 'My Plans',
        subtitle: isZh ? '查看管理全部教案' : 'View & manage plans',
        route: '/pages/teaching/lesson-plans'
      },
      {
        icon: 'add_circle',
        title: isZh ? '新建教案' : 'New Plan',
        subtitle: isZh ? '手动创建备课方案' : 'Create lesson plan',
        route: '/pages/teaching/lesson-plan-edit'
      },
      {
        icon: 'quiz',
        title: isZh ? 'AI 出题' : 'AI Quiz',
        subtitle: isZh ? '智能生成试题练习' : 'Generate quiz questions',
        route: '/pages/teaching/question-gen'
      },
      {
        icon: 'bar_chart',
        title: isZh ? '教学分析' : 'Analytics',
        subtitle: isZh ? '教学数据一目了然' : 'Track teaching data',
        route: '/pages/teaching/analytics'
      },
      {
        icon: 'slideshow',
        title: isZh ? 'AI 课件' : 'AI Slides',
        subtitle: isZh ? '一键生成PPT课件' : 'Generate PPTX slides',
        route: '/pages/teaching/ppt-gen'
      }
    ]
  }
}
