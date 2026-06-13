import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import type { LocaleCode } from '@/types/ui'

export interface LifeQuickAction {
  icon: string
  title: string
  subtitle: string
}

export interface LifePost {
  id: number
  badge: string
  time: string
  content: string
  author: string
  meta: string
}

export interface LifePageData {
  headerTitle: string
  heroTitle: string
  heroSubtitle: string
  quickTitle: string
  feedTitle: string
  feedAction: string
  quickActions: LifeQuickAction[]
  posts: LifePost[]
}

export function getPageData(locale: LocaleCode): LifePageData {
  return {
    headerTitle: t(I18N_KEYS.lifeHeaderTitle, locale),
    heroTitle: t(I18N_KEYS.lifeHeroTitle, locale),
    heroSubtitle: t(I18N_KEYS.lifeHeroSubtitle, locale),
    quickTitle: t(I18N_KEYS.lifeSectionQuick, locale),
    feedTitle: t(I18N_KEYS.lifeSectionFeed, locale),
    feedAction: t(I18N_KEYS.lifeFeedAction, locale),
    quickActions: [
      {

        icon: 'storefront',
        title: t(I18N_KEYS.lifeQuickMarket, locale),
        subtitle: t(I18N_KEYS.lifeQuickMarketDesc, locale)
      },
      {
        icon: 'celebration',
        title: t(I18N_KEYS.lifeQuickEntertainment, locale),
        subtitle: t(I18N_KEYS.lifeQuickEntertainmentDesc, locale)
      },
      {
        icon: 'work',
        title: t(I18N_KEYS.lifeQuickJobs, locale),
        subtitle: t(I18N_KEYS.lifeQuickJobsDesc, locale)
      },
      {

        icon: 'meeting_room',
        title: t(I18N_KEYS.lifeQuickShopping, locale),
        subtitle: t(I18N_KEYS.lifeQuickShoppingDesc, locale)
      }
    ],
    posts: [
      {
        id: 1,
        badge: t(I18N_KEYS.lifePost1Badge, locale),
        time: t(I18N_KEYS.lifePost1Time, locale),
        content: t(I18N_KEYS.lifePost1Content, locale),
        author: t(I18N_KEYS.lifePost1Author, locale),
        meta: t(I18N_KEYS.lifePost1Meta, locale)
      },
      {
        id: 2,
        badge: t(I18N_KEYS.lifePost2Badge, locale),
        time: t(I18N_KEYS.lifePost2Time, locale),
        content: t(I18N_KEYS.lifePost2Content, locale),
        author: t(I18N_KEYS.lifePost2Author, locale),
        meta: t(I18N_KEYS.lifePost2Meta, locale)
      },
      {
        id: 3,
        badge: t(I18N_KEYS.lifePost3Badge, locale),
        time: t(I18N_KEYS.lifePost3Time, locale),
        content: t(I18N_KEYS.lifePost3Content, locale),
        author: t(I18N_KEYS.lifePost3Author, locale),
        meta: t(I18N_KEYS.lifePost3Meta, locale)
      }
    ]
  }
}
