import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import type { LocaleCode } from '@/types/ui'

export interface StudyQuickAction {
  icon: string
  title: string
  subtitle: string
}

export interface StudyPost {
  id: number
  badge: string
  time: string
  content: string
  author: string
  meta: string
}

export interface StudyPageData {
  headerTitle: string
  heroTitle: string
  heroSubtitle: string
  heroAction: string
  quickTitle: string
  feedTitle: string
  feedAction: string
  quickActions: StudyQuickAction[]
  posts: StudyPost[]
}

export function getPageData(locale: LocaleCode): StudyPageData {
  return {
    headerTitle: t(I18N_KEYS.studyHeaderTitle, locale),
    heroTitle: t(I18N_KEYS.studyHeroTitle, locale),
    heroSubtitle: t(I18N_KEYS.studyHeroSubtitle, locale),
    heroAction: t(I18N_KEYS.studyHeroAction, locale),
    quickTitle: t(I18N_KEYS.studySectionQuick, locale),
    feedTitle: t(I18N_KEYS.studySectionFeed, locale),
    feedAction: t(I18N_KEYS.studyFeedAction, locale),
    quickActions: [
      {
        icon: 'calendar_today',
        title: t(I18N_KEYS.studyQuickSchedule, locale),
        subtitle: t(I18N_KEYS.studyQuickScheduleDesc, locale)
      },
      {

        icon: 'menu_book',
        title: t(I18N_KEYS.studyQuickResources, locale),
        subtitle: t(I18N_KEYS.studyQuickResourcesDesc, locale)
      },
      {

        icon: 'task_alt',
        title: t(I18N_KEYS.studyQuickReview, locale),
        subtitle: t(I18N_KEYS.studyQuickReviewDesc, locale)
      },
      {
        icon: 'quiz',
        title: t(I18N_KEYS.studyQuickExam, locale),
        subtitle: t(I18N_KEYS.studyQuickExamDesc, locale)
      }
    ],
    posts: [
      {
        id: 1,
        badge: t(I18N_KEYS.studyPost1Tag, locale),
        time: t(I18N_KEYS.studyPost1Time, locale),
        content: t(I18N_KEYS.studyPost1Content, locale),
        author: t(I18N_KEYS.studyPost1Author, locale),
        meta: t(I18N_KEYS.studyPost1Meta, locale)
      },
      {
        id: 2,
        badge: t(I18N_KEYS.studyPost2Tag, locale),
        time: t(I18N_KEYS.studyPost2Time, locale),
        content: t(I18N_KEYS.studyPost2Content, locale),
        author: t(I18N_KEYS.studyPost2Author, locale),
        meta: t(I18N_KEYS.studyPost2Meta, locale)
      },
      {
        id: 3,
        badge: t(I18N_KEYS.studyPost3Tag, locale),
        time: t(I18N_KEYS.studyPost3Time, locale),
        content: t(I18N_KEYS.studyPost3Content, locale),
        author: t(I18N_KEYS.studyPost3Author, locale),
        meta: t(I18N_KEYS.studyPost3Meta, locale)
      }
    ]
  }
}
