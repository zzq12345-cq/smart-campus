import { describe, expect, it } from 'vitest'
import { localizeMentalHealthText } from '@/utils/mental-health-localization'

describe('localizeMentalHealthText', () => {
  it('translates stable state and evidence keys into Chinese labels', () => {
    expect(localizeMentalHealthText('stable | study_interruptions:2', 'zh-CN')).toBe('状态平稳 · 学习中断 2 天')
  })

  it('translates action and emotion codes into English labels', () => {
    expect(localizeMentalHealthText('low_mood / fatigue | guided_self_help', 'en-US')).toBe(
      'Low mood / Fatigue · Guided self-help'
    )
  })

  it('formats keyword evidence with localized source names', () => {
    expect(localizeMentalHealthText('crisis_keywords:journal:自杀,post:hopeless', 'zh-CN')).toBe(
      '出现危机关键词：日记 自杀、帖子 hopeless'
    )
  })
})
