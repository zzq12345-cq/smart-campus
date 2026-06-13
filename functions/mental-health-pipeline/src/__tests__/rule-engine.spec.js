import { describe, expect, it } from 'vitest'
import { evaluateRiskRules, mergeAssessment } from '../rule-engine.js'

describe('mental health rule engine', () => {
  it('raises high risk when crisis keywords and persistent negative signals coexist', () => {
    const ruleResult = evaluateRiskRules({
      textSignals: [
        {
          source: 'journal',
          text: '我真的不想活了，最近彻底崩溃',
          riskLevel: 3
        }
      ],
      posts: { negativeCount: 1, highRiskCount: 1, nightCount: 1 },
      journals: { negativeCount: 3, negativeStreak: 3, highRiskCount: 1, nightCount: 1 },
      checkins: { highRiskCount: 1, recentRiskAverage: 2.5, avgEnergyLevel: 1.8 },
      study: { interruptionDays: 2, shortDurationCount: 2 },
      exams: { pressureScore: 2, nearestExamInDays: 3 },
      aggregate30: { negativeSignals: 5 },
      temporal: { lateNightSignals: 2 }
    })

    expect(ruleResult.riskLevel).toBe(3)
    expect(ruleResult.ruleScore).toBeGreaterThanOrEqual(75)
    expect(ruleResult.evidence.some((item) => item.includes('crisis_keywords'))).toBe(true)
  })

  it('merges rule and model outputs while preserving structured fallback fields', () => {
    const merged = mergeAssessment({
      ruleResult: {
        ruleScore: 58,
        riskLevel: 2,
        evidence: ['negative_journals:3'],
        emotionLabels: ['low_mood'],
        recommendedAction: 'guided_self_help',
        studentMessage: '请先暂停高压任务',
        severe: false
      },
      modelResult: {
        emotionLabels: ['anxiety'],
        riskLevel: 2,
        confidence: 0.82,
        evidence: ['exam pressure'],
        recommendedAction: 'guided_self_help',
        studentMessage: '建议先降低任务强度'
      }
    })

    expect(merged.finalRiskLevel).toBeGreaterThanOrEqual(2)
    expect(merged.confidence).toBeGreaterThan(0.7)
    expect(merged.evidence).toContain('negative_journals:3')
    expect(merged.evidence).toContain('exam pressure')
    expect(merged.studentMessage).toContain('建议')
  })
})
