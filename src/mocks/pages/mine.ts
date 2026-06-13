import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import type { LocaleCode } from '@/types/ui'

export interface MineService {
  key: 'posts' | 'orders' | 'collections' | 'identity' | 'points'
  icon: string
  title: string
  subtitle: string
}

export interface MineSettingItem {
  key: 'theme' | 'language' | 'robotSkin' | 'help' | 'about'
  icon: string
  title: string
}

export interface MinePageData {
  headerTitle: string
  name: string
  meta: string
  idLabel: string
  idValue: string
  avatar: string
  stats: Array<{ label: string; value: string }>
  serviceTitle: string
  services: MineService[]
  settingTitle: string
  settings: MineSettingItem[]
}

export function getPageData(locale: LocaleCode): MinePageData {
  return {
    headerTitle: t(I18N_KEYS.mineHeaderTitle, locale),
    name: t(I18N_KEYS.mineName, locale),
    meta: t(I18N_KEYS.mineMeta, locale),
    idLabel: t(I18N_KEYS.mineIdLabel, locale),
    idValue: '20210583',
    avatar: '/static/avatars/user1.jpg',
    stats: [
      { label: t(I18N_KEYS.mineStatsPosts, locale), value: '42' },
      { label: t(I18N_KEYS.mineStatsFollowers, locale), value: '1.2k' },
      { label: t(I18N_KEYS.mineStatsLikes, locale), value: '856' }
    ],
    serviceTitle: t(I18N_KEYS.mineSectionServices, locale),
    services: [
      {
        key: 'posts',
        icon: 'description',
        title: t(I18N_KEYS.mineServicePosts, locale),
        subtitle: t(I18N_KEYS.mineServicePostsDesc, locale)
      },
      {
        key: 'orders',
        icon: 'shopping_bag',
        title: t(I18N_KEYS.mineServiceOrders, locale),
        subtitle: t(I18N_KEYS.mineServiceOrdersDesc, locale)
      },
      {
        key: 'collections',
        icon: 'bookmark',
        title: t(I18N_KEYS.mineServiceCollections, locale),
        subtitle: t(I18N_KEYS.mineServiceCollectionsDesc, locale)
      },
      {
        key: 'points',
        icon: 'stars',
        title: t(I18N_KEYS.pointsServiceTitle, locale),
        subtitle: t(I18N_KEYS.pointsBalance, locale)
      },
      {
        key: 'identity',
        icon: 'verified_user',
        title: t(I18N_KEYS.mineServiceIdentity, locale),
        subtitle: t(I18N_KEYS.mineServiceIdentityDesc, locale)
      }
    ],
    settingTitle: t(I18N_KEYS.mineSectionSettings, locale),
    settings: [
      {
        key: 'theme',
        icon: 'settings',
        title: t(I18N_KEYS.mineSettingTheme, locale)
      },
      {
        key: 'language',
        icon: 'forum',
        title: t(I18N_KEYS.mineSettingLanguage, locale)
      },
      {
        key: 'robotSkin',
        icon: 'palette',
        title: t(I18N_KEYS.mineSettingRobotSkin, locale)
      },
      {
        key: 'help',
        icon: 'help',
        title: t(I18N_KEYS.mineSettingHelp, locale)
      },
      {
        key: 'about',
        icon: 'info',
        title: t(I18N_KEYS.mineSettingAbout, locale)
      }
    ]
  }
}
