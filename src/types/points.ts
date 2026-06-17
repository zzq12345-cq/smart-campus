import type { I18nKey } from '@/i18n/keys'

export type PointTransactionType =
  | 'daily_task'
  | 'achievement'
  | 'ai_analysis'
  | 'robot_purchase'
  | 'robot_purchase_refund'
  | 'sign_up_bonus'

export interface PointTransaction {
  $id: string
  userId: string
  amount: number
  type: PointTransactionType
  refId: string
  description: string
  $createdAt?: string
  $updatedAt?: string
}

export interface PointBalance {
  $id: string
  balance: number
  totalEarned: number
  totalSpent: number
  $createdAt?: string
  $updatedAt?: string
}

export type AchievementCategory = 'streak' | 'first_action' | 'cumulative'

export interface AchievementDefinition {
  id: string
  points: number
  category: AchievementCategory
  target: number
  icon: string
}

export interface UserAchievement {
  $id: string
  userId: string
  achievementId: string
  progress: number
  target: number
  unlocked: boolean
  unlockedAt?: string
  $createdAt?: string
  $updatedAt?: string
}

export type RobotItemType = 'skin'
export type RobotSkinId = 'default' | 'nebula' | 'mint' | 'sunset' | 'ocean' | 'golden'

export interface RobotSkinVisual {
  id: RobotSkinId
  gradient: string
  gradientDark: string
  borderColor: string
  shadowColor: string
  hasFace: boolean
  iconName?: string
}

export interface RobotItemDefinition {
  itemType: RobotItemType
  itemId: string
  nameKey: I18nKey
  points: number
}

export interface RobotInventoryItem {
  $id: string
  userId: string
  itemType: RobotItemType
  itemId: string
  isActive: boolean
  $createdAt?: string
  $updatedAt?: string
}

export type DailyTaskId =
  | 'mood_checkin'
  | 'study_checkin'
  | 'journal_entry'
  | 'ai_chat_message'
  | 'post_create'
  | 'evaluation_complete'

export interface DailyTaskDefinition {
  id: DailyTaskId
  points: number
  icon: string
}
