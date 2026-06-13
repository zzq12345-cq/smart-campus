import type { LocaleCode } from '@/types/ui'

type LocalizedLabel = Record<LocaleCode, string>

const CODE_LABELS: Record<string, LocalizedLabel> = {
  stable: { 'zh-CN': '状态平稳', 'en-US': 'Stable' },
  distress: { 'zh-CN': '痛苦信号', 'en-US': 'Distress' },
  overwhelmed: { 'zh-CN': '压力过载', 'en-US': 'Overwhelmed' },
  stress: { 'zh-CN': '压力上升', 'en-US': 'Stress' },
  low_mood: { 'zh-CN': '情绪低落', 'en-US': 'Low mood' },
  persistent_distress: { 'zh-CN': '持续低落', 'en-US': 'Persistent distress' },
  risk_alert: { 'zh-CN': '风险提醒', 'en-US': 'Risk alert' },
  fatigue: { 'zh-CN': '精力不足', 'en-US': 'Fatigue' },
  anxiety: { 'zh-CN': '焦虑', 'en-US': 'Anxiety' },
  anxious: { 'zh-CN': '焦虑', 'en-US': 'Anxious' },
  sadness: { 'zh-CN': '悲伤', 'en-US': 'Sadness' },
  sad: { 'zh-CN': '低落', 'en-US': 'Sad' },
  angry: { 'zh-CN': '烦躁', 'en-US': 'Angry' },
  calm: { 'zh-CN': '平静', 'en-US': 'Calm' },
  happy: { 'zh-CN': '积极', 'en-US': 'Happy' },
  none: { 'zh-CN': '继续观察', 'en-US': 'Observe only' },
  safety_support: { 'zh-CN': '立即安全支持', 'en-US': 'Immediate safety support' },
  guided_self_help: { 'zh-CN': '自助调节建议', 'en-US': 'Guided self-help' },
  gentle_checkin: { 'zh-CN': '温和情绪提醒', 'en-US': 'Gentle check-in' },
  exam_pressure_relief: { 'zh-CN': '考试减压建议', 'en-US': 'Exam pressure relief' },
  rest_support: { 'zh-CN': '休息与支持建议', 'en-US': 'Rest and support' }
}

const SOURCE_LABELS: Record<string, LocalizedLabel> = {
  post: { 'zh-CN': '帖子', 'en-US': 'Post' },
  journal: { 'zh-CN': '日记', 'en-US': 'Journal' },
  checkin: { 'zh-CN': '打卡', 'en-US': 'Check-in' },
  study_checkin: { 'zh-CN': '学习打卡', 'en-US': 'Study check-in' },
  exam_plan: { 'zh-CN': '考试计划', 'en-US': 'Exam plan' }
}

function cleanString(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function getLabel(map: LocalizedLabel | undefined, locale: LocaleCode) {
  return map?.[locale] || map?.['zh-CN'] || ''
}

function humanizeToken(token: string) {
  return token
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(' ')
}

function formatCount(
  value: string,
  locale: LocaleCode,
  zhLabel: string,
  zhUnit: string,
  enSingular: string,
  enPlural = `${enSingular}s`
) {
  const normalized = cleanString(value)
  if (!normalized) {
    return locale === 'zh-CN' ? zhLabel : humanizeToken(enPlural)
  }
  const amount = Number(normalized)
  if (!Number.isFinite(amount)) {
    return locale === 'zh-CN' ? `${zhLabel} ${normalized}${zhUnit ? ` ${zhUnit}` : ''}` : `${normalized} ${enPlural}`
  }
  if (locale === 'zh-CN') {
    return `${zhLabel} ${normalized}${zhUnit ? ` ${zhUnit}` : ''}`
  }
  return `${normalized} ${Math.abs(amount) === 1 ? enSingular : enPlural}`
}

function localizeSourceDetail(detail: string, locale: LocaleCode) {
  const normalized = cleanString(detail)
  const separatorIndex = normalized.indexOf(':')
  if (separatorIndex <= 0) {
    return localizeMentalHealthText(normalized, locale)
  }
  const source = normalized.slice(0, separatorIndex)
  const rest = normalized.slice(separatorIndex + 1)
  const sourceLabel = getLabel(SOURCE_LABELS[source], locale)
  if (!sourceLabel) {
    return localizeMentalHealthText(normalized, locale)
  }
  return locale === 'zh-CN'
    ? `${sourceLabel} ${localizeMentalHealthText(rest, locale)}`
    : `${sourceLabel}: ${localizeMentalHealthText(rest, locale)}`
}

function formatEvidenceItem(value: string, locale: LocaleCode) {
  const normalized = cleanString(value)
  const separatorIndex = normalized.indexOf(':')
  if (separatorIndex <= 0) {
    return ''
  }

  const key = normalized.slice(0, separatorIndex)
  const detail = normalized.slice(separatorIndex + 1)
  const detailList = detail
    .split(',')
    .map((item) => cleanString(item))
    .filter(Boolean)

  switch (key) {
    case 'crisis_keywords':
      return locale === 'zh-CN'
        ? `出现危机关键词：${detailList.map((item) => localizeSourceDetail(item, locale)).join('、')}`
        : `Crisis keywords: ${detailList.map((item) => localizeSourceDetail(item, locale)).join(', ')}`
    case 'high_risk_keywords':
      return locale === 'zh-CN'
        ? `出现高风险关键词：${detailList.map((item) => localizeSourceDetail(item, locale)).join('、')}`
        : `High-risk keywords: ${detailList.map((item) => localizeSourceDetail(item, locale)).join(', ')}`
    case 'negative_posts':
      return formatCount(detail, locale, '负向帖子', '条', 'negative post')
    case 'negative_journals':
      return formatCount(detail, locale, '负向日记', '条', 'negative journal')
    case 'negative_journal_streak':
      return formatCount(detail, locale, '连续负向日记', '天', 'day of negative journal streak', 'days of negative journal streak')
    case 'late_night_expression':
      return formatCount(detail, locale, '深夜表达', '次', 'late-night expression')
    case 'high_risk_checkins':
      return formatCount(detail, locale, '高风险打卡', '次', 'high-risk check-in')
    case 'checkin_risk_trend':
      return locale === 'zh-CN' ? `近期打卡风险均值 ${detail}` : `Recent check-in risk average ${detail}`
    case 'low_energy':
      return locale === 'zh-CN' ? `平均精力值 ${detail}` : `Average energy level ${detail}`
    case 'study_interruptions':
      return formatCount(detail, locale, '学习中断', '天', 'study interruption day')
    case 'short_study_sessions':
      return formatCount(detail, locale, '短时学习记录', '次', 'short study session')
    case 'exam_pressure':
      return formatCount(detail, locale, '距离最近考试', '天', 'day until nearest exam', 'days until nearest exam')
    case 'aggregate_negative_signals':
      return formatCount(detail, locale, '近30天负向信号', '次', 'aggregate negative signal')
    default:
      return ''
  }
}

function localizeToken(token: string, locale: LocaleCode) {
  const normalized = cleanString(token)
  if (!normalized) {
    return ''
  }
  const mapped = getLabel(CODE_LABELS[normalized], locale)
  if (mapped) {
    return mapped
  }
  if (locale === 'en-US' && /^[_a-z0-9-]+$/i.test(normalized) && /[_-]/.test(normalized)) {
    return humanizeToken(normalized)
  }
  return normalized.replace(/\b[a-z][a-z0-9_-]*\b/gi, (match) => {
    const translated = getLabel(CODE_LABELS[match], locale)
    if (translated) {
      return translated
    }
    return match
  })
}

function localizeSegment(value: string, locale: LocaleCode) {
  const normalized = cleanString(value)
  if (!normalized) {
    return ''
  }

  const evidenceLabel = formatEvidenceItem(normalized, locale)
  if (evidenceLabel) {
    return evidenceLabel
  }

  if (normalized.includes('/')) {
    return normalized
      .split(/\s*\/\s*/)
      .map((token) => localizeToken(token, locale))
      .filter(Boolean)
      .join(' / ')
  }

  return localizeToken(normalized, locale)
}

export function localizeMentalHealthText(value: unknown, locale: LocaleCode) {
  const normalized = cleanString(value)
  if (!normalized) {
    return ''
  }

  return normalized
    .split(/\s*\|\s*/)
    .map((segment) => localizeSegment(segment, locale))
    .filter(Boolean)
    .join(' · ')
}
