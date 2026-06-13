/**
 * Shared mood/risk helpers for psychology module (mood, journal, index).
 */

export type MoodValue = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry'

export function moodLabel(mood: MoodValue | string, isZh: boolean): string {
  const map = isZh
    ? { happy: '开心', calm: '平静', anxious: '焦虑', sad: '低落', angry: '烦躁' }
    : { happy: 'Happy', calm: 'Calm', anxious: 'Anxious', sad: 'Sad', angry: 'Angry' }
  return map[mood as MoodValue] ?? String(mood)
}

export function moodClass(mood: MoodValue | string): string {
  const map: Record<string, string> = {
    happy: 'mood-happy',
    calm: 'mood-calm',
    anxious: 'mood-anxious',
    sad: 'mood-low',
    angry: 'mood-angry'
  }
  return map[mood as MoodValue] ?? 'mood-calm'
}

export function riskLabel(level: number, isZh: boolean): string {
  const n = Math.max(1, Math.min(3, Math.round(Number(level))))
  if (isZh) {
    if (n >= 3) return '高关注'
    if (n >= 2) return '需关注'
    return '平稳'
  }
  if (n >= 3) return 'High'
  if (n >= 2) return 'Watch'
  return 'OK'
}

export function riskClass(level: number): string {
  const n = Math.max(1, Math.min(3, Math.round(Number(level))))
  if (n >= 3) return 'risk-high'
  if (n >= 2) return 'risk-mid'
  return 'risk-low'
}
