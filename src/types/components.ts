import type { TabSection } from '@/types/ui'

export type SectionTheme = TabSection

export interface QuickAccessItem {
  icon: string
  title: string
  subtitle?: string
  route: string
}

export interface FeedPost {
  id?: string | number
  user: string
  avatar?: string
  time: string
  tags?: string[]
  content: string
  likeCount?: number
  commentCount?: number
  isLiked?: boolean
}

