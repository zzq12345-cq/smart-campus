import type { AchievementDefinition, DailyTaskDefinition, RobotItemDefinition, RobotSkinId, RobotSkinVisual } from '@/types/points'

export const INITIAL_POINTS = 100

export const AI_COSTS = {
  deepAnalysis: 20,
  counselingMessage: 5,
  aiChatMessage: 3,
} as const

export const DAILY_TASKS: DailyTaskDefinition[] = [
  { id: 'mood_checkin', points: 10, icon: 'mood' },
  { id: 'study_checkin', points: 10, icon: 'edit_note' },
  { id: 'journal_entry', points: 15, icon: 'book' },
  { id: 'ai_chat_message', points: 5, icon: 'smart_toy' },
  { id: 'post_create', points: 10, icon: 'forum' },
  { id: 'evaluation_complete', points: 20, icon: 'quiz' },
]

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Streak milestones
  { id: 'streak_3', points: 30, category: 'streak', target: 3, icon: 'local_fire_department' },
  { id: 'streak_7', points: 80, category: 'streak', target: 7, icon: 'local_fire_department' },
  { id: 'streak_30', points: 300, category: 'streak', target: 30, icon: 'local_fire_department' },
  // First actions
  { id: 'first_mood', points: 10, category: 'first_action', target: 1, icon: 'mood' },
  { id: 'first_study', points: 10, category: 'first_action', target: 1, icon: 'edit_note' },
  { id: 'first_journal', points: 15, category: 'first_action', target: 1, icon: 'book' },
  { id: 'first_evaluation', points: 20, category: 'first_action', target: 1, icon: 'quiz' },
  { id: 'first_ai_chat', points: 10, category: 'first_action', target: 1, icon: 'smart_toy' },
  { id: 'first_counseling', points: 10, category: 'first_action', target: 1, icon: 'psychology' },
  // Cumulative
  { id: 'journal_10', points: 50, category: 'cumulative', target: 10, icon: 'book' },
  { id: 'evaluation_5', points: 50, category: 'cumulative', target: 5, icon: 'quiz' },
  { id: 'study_hours_50', points: 100, category: 'cumulative', target: 50, icon: 'schedule' },
]

export const ROBOT_SHOP_ITEMS: RobotItemDefinition[] = [
  { itemType: 'skin', itemId: 'nebula', nameKey: 'mineRobotSkinNebula', points: 200 },
  { itemType: 'skin', itemId: 'mint', nameKey: 'mineRobotSkinMint', points: 300 },
  { itemType: 'skin', itemId: 'sunset', nameKey: 'mineRobotSkinSunset', points: 150 },
  { itemType: 'skin', itemId: 'ocean', nameKey: 'mineRobotSkinOcean', points: 250 },
  { itemType: 'skin', itemId: 'golden', nameKey: 'mineRobotSkinGolden', points: 400 },
]

export const ROBOT_FREE_DEFAULTS: Record<string, string> = {
  skin: 'default',
}

export const ROBOT_SKINS: { id: RobotSkinId; nameKey: string; points: number; icon: string }[] = [
  { id: 'default', nameKey: 'mineRobotSkinDefault', points: 0, icon: 'smart_toy' },
  { id: 'nebula', nameKey: 'mineRobotSkinNebula', points: 200, icon: 'auto_awesome' },
  { id: 'mint', nameKey: 'mineRobotSkinMint', points: 300, icon: 'eco' },
  { id: 'sunset', nameKey: 'mineRobotSkinSunset', points: 150, icon: 'wb_twilight' },
  { id: 'ocean', nameKey: 'mineRobotSkinOcean', points: 250, icon: 'water' },
  { id: 'golden', nameKey: 'mineRobotSkinGolden', points: 400, icon: 'school' },
]

export const ROBOT_SKIN_VISUALS: Record<RobotSkinId, RobotSkinVisual> = {
  default: {
    id: 'default',
    gradient: '#ffffff',
    gradientDark: '#e2e8f0',
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: 'rgba(0,0,0,0.1)',
    hasFace: false,
    iconName: 'smart_toy',
  },
  nebula: {
    id: 'nebula',
    gradient: 'radial-gradient(circle at 35% 35%, #667eea, #764ba2)',
    gradientDark: 'radial-gradient(circle at 35% 35%, #5a67d8, #6b46c1)',
    borderColor: 'rgba(102,126,234,0.4)',
    shadowColor: 'rgba(102,126,234,0.5)',
    hasFace: true,
  },
  mint: {
    id: 'mint',
    gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    gradientDark: 'linear-gradient(135deg, #38d9a9, #20c997)',
    borderColor: 'rgba(67,233,123,0.3)',
    shadowColor: 'rgba(67,233,123,0.4)',
    hasFace: true,
  },
  sunset: {
    id: 'sunset',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
    gradientDark: 'linear-gradient(135deg, #d67ee9, #e04858)',
    borderColor: 'rgba(240,147,251,0.4)',
    shadowColor: 'rgba(245,87,108,0.4)',
    hasFace: true,
  },
  ocean: {
    id: 'ocean',
    gradient: 'linear-gradient(180deg, #0c3547, #1a6b8a)',
    gradientDark: 'linear-gradient(180deg, #0a2a38, #15556d)',
    borderColor: '#1a6b8a',
    shadowColor: 'rgba(26,107,138,0.5)',
    hasFace: true,
  },
  golden: {
    id: 'golden',
    gradient: 'linear-gradient(145deg, #f7d76e, #c9943e)',
    gradientDark: 'linear-gradient(145deg, #d4b85c, #a87d32)',
    borderColor: '#b8860b',
    shadowColor: 'rgba(247,215,110,0.4)',
    hasFace: true,
    iconName: 'school',
  },
}
