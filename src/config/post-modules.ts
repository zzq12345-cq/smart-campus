/**
 * 帖子详情/发布页的按模块配置
 *
 * 三个模块（study/life/psychology）的帖子详情页共享同一套逻辑与模板，
 * 仅在以下维度有差异：主题色、Hero 图标/文案、话题分类、返回首页路由。
 * 本文件集中这些差异，供 PostDetail 组件按 module 取用，消除复制粘贴。
 */
import type { PostSection } from '@/types/post'

/** 单个话题的双语标签 */
export interface TopicLabel {
  zh: string
  en: string
}

/** 模块级配置 */
export interface PostModuleConfig {
  /** 模块标识（用于 section 校验与 goBack 兜底） */
  section: PostSection
  /** Hero 区图标名（material symbols） */
  heroIcon: string
  /** Hero 主标题 */
  heroTitle: { zh: string; en: string }
  /** Hero 副标题 */
  heroSubtitle: { zh: string; en: string }
  /** 允许的话题分类（用于 topicLabel 兜底判断） */
  topics: readonly string[]
  /** 默认话题（raw.topic 为空时使用） */
  defaultTopic: string
  /** 话题 → 双语标签映射 */
  topicLabels: Record<string, TopicLabel>
  /** 话题不匹配时的兜底标签 */
  fallbackTopicLabel: { zh: string; en: string }
  /** section 不匹配时的错误文案 */
  sectionMismatchError: { zh: string; en: string }
  /** 返回首页路由（无历史页时 switchTab 兜底） */
  indexRoute: string
}

export const STUDY_CONFIG: PostModuleConfig = {
  section: 'study',
  heroIcon: 'school',
  heroTitle: { zh: '学习交流详情', en: 'Study discussion' },
  heroSubtitle: { zh: '聚焦课程、考试与学习资料', en: 'Courses, exams, and resources' },
  topics: ['course_review', 'exam_info', 'learning_material', 'competition'],
  defaultTopic: '',
  topicLabels: {
    course_review: { zh: '课程评价', en: 'Course Reviews' },
    exam_info: { zh: '考试信息', en: 'Exam Info' },
    learning_material: { zh: '学习资料', en: 'Learning Resources' },
    competition: { zh: '竞赛资讯', en: 'Competition News' },
  },
  fallbackTopicLabel: { zh: '学习动态', en: 'Study Updates' },
  sectionMismatchError: { zh: '该帖子不属于学习区', en: 'Post section mismatch' },
  indexRoute: '/pages/study/index',
}

export const LIFE_CONFIG: PostModuleConfig = {
  section: 'life',
  heroIcon: 'self_improvement',
  heroTitle: { zh: '生活广场详情', en: 'Life discussion' },
  heroSubtitle: { zh: '聚焦活动、兼职与二手好物', en: 'Events, jobs, and marketplace' },
  topics: ['life_help', 'second_hand', 'activity', 'job', 'rental'],
  defaultTopic: '',
  topicLabels: {
    life_help: { zh: '生活互助', en: 'Life Help' },
    second_hand: { zh: '二手交易', en: 'Second-hand' },
    activity: { zh: '活动', en: 'Activities' },
    job: { zh: '兼职', en: 'Jobs' },
    rental: { zh: '租房', en: 'Rentals' },
  },
  fallbackTopicLabel: { zh: '生活动态', en: 'Life Updates' },
  sectionMismatchError: { zh: '该帖子不属于生活区', en: 'Post section mismatch' },
  indexRoute: '/pages/life/index',
}

export const PSYCHOLOGY_CONFIG: PostModuleConfig = {
  section: 'psychology',
  heroIcon: 'psychology',
  heroTitle: { zh: '树洞详情', en: 'Tree hole' },
  heroSubtitle: { zh: '在这里，你可以安全地说', en: 'A safe space to be heard' },
  topics: ['daily', 'mood', 'relationship', 'future', 'night'],
  defaultTopic: 'daily',
  topicLabels: {
    daily: { zh: '日常', en: 'Daily' },
    mood: { zh: '心情', en: 'Mood' },
    relationship: { zh: '关系', en: 'Relationship' },
    future: { zh: '未来', en: 'Future' },
    night: { zh: '深夜', en: 'Night' },
  },
  fallbackTopicLabel: { zh: '日常', en: 'Daily' },
  sectionMismatchError: { zh: '该帖子不属于心理区', en: 'Post section mismatch' },
  indexRoute: '/pages/psychology/index',
}

/** 心理模块独有：情绪标签 */
export const MOOD_LABELS: Record<string, TopicLabel> = {
  happy: { zh: '开心', en: 'Happy' },
  calm: { zh: '平静', en: 'Calm' },
  anxious: { zh: '焦虑', en: 'Anxious' },
  sad: { zh: '低落', en: 'Sad' },
  angry: { zh: '愤怒', en: 'Angry' },
}

/** 心理模块独有：风险等级 → tone class */
export function riskToneClass(riskLevel?: number): 'low' | 'mid' | 'high' {
  const level = Math.min(3, Math.max(1, Number(riskLevel || 1)))
  if (level >= 3) return 'high'
  if (level >= 2) return 'mid'
  return 'low'
}

/** 心理模块独有：风险等级 → 双语标签 */
export function riskLabelText(riskLevel?: number, isZh = true): string {
  const level = Math.min(3, Math.max(1, Number(riskLevel || 1)))
  if (isZh) {
    if (level >= 3) return `风险 Lv${level}`
    if (level >= 2) return `关注 Lv${level}`
    return `稳定 Lv${level}`
  }
  if (level >= 3) return `Risk Lv${level}`
  if (level >= 2) return `Watch Lv${level}`
  return `Stable Lv${level}`
}

/** 心理模块独有：情绪 → 双语标签 */
export function moodLabelText(mood: string, isZh = true): string {
  const label = MOOD_LABELS[mood]
  if (!label) return mood
  return isZh ? label.zh : label.en
}

/** 按 module 取配置 */
export function getPostModuleConfig(section: PostSection): PostModuleConfig {
  switch (section) {
    case 'study':
      return STUDY_CONFIG
    case 'life':
      return LIFE_CONFIG
    case 'psychology':
      return PSYCHOLOGY_CONFIG
  }
}
