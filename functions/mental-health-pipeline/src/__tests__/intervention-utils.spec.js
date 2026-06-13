import { describe, expect, it } from 'vitest'
import { buildCooldownKey, buildInterventionPlan, isCooldownHit } from '../intervention-utils.js'

describe('intervention utils', () => {
  it('builds a stable cooldown key for the same user and risk type', () => {
    const assessment = {
      userId: 'user-1',
      finalRiskLevel: 2,
      triggerType: 'journal'
    }

    expect(buildCooldownKey(assessment, 'guided_self_help')).toBe('user-1:2:guided_self_help:journal')
  })

  it('marks duplicate interventions when recent rows already exist', () => {
    expect(isCooldownHit([{ $id: 'itv-1' }])).toBe(true)
    expect(isCooldownHit([])).toBe(false)
  })

  it('returns safety support plan for high risk assessments', () => {
    const plan = buildInterventionPlan({
      finalRiskLevel: 3,
      emotionSummary: 'distress | crisis_keywords:journal:不想活'
    })

    expect(plan.actionType).toBe('safety_support')
    expect(plan.priority).toBe('urgent')
    expect(plan.resources.length).toBeGreaterThan(1)
  })
})
