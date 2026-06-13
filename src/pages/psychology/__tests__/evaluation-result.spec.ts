import { describe, expect, it } from 'vitest'
import { buildAnswersForPersistence, computeEvaluationResult } from '@/utils/evaluation-result'
import type { EvaluationQuestion } from '@/types/psychology-evaluation'

const mockQuestions: EvaluationQuestion[] = [
  { id: 'q1', text: 'Q1', textEn: 'Q1 en', options: [{ value: 0, label: 'a', labelEn: 'a' }, { value: 1, label: 'b', labelEn: 'b' }, { value: 2, label: 'c', labelEn: 'c' }, { value: 3, label: 'd', labelEn: 'd' }] },
  { id: 'q2', text: 'Q2', textEn: 'Q2 en', options: [{ value: 0, label: 'a', labelEn: 'a' }, { value: 1, label: 'b', labelEn: 'b' }] }
]

describe('computeEvaluationResult', () => {
  it('returns totalScore 0 and tier low when all answers are 0', () => {
    const answers = { q1: 0, q2: 0 }
    const result = computeEvaluationResult(mockQuestions, answers)
    expect(result.totalScore).toBe(0)
    expect(result.maxScore).toBe(6)
    expect(result.percentage).toBe(0)
    expect(result.resultTier).toBe('low')
  })

  it('returns totalScore max and tier high when all answers are max', () => {
    const answers = { q1: 3, q2: 3 }
    const result = computeEvaluationResult(mockQuestions, answers)
    expect(result.totalScore).toBe(6)
    expect(result.maxScore).toBe(6)
    expect(result.percentage).toBe(100)
    expect(result.resultTier).toBe('high')
  })

  it('returns low tier when percentage below 25', () => {
    const answers = { q1: 1, q2: 0 }
    const result = computeEvaluationResult(mockQuestions, answers)
    expect(result.totalScore).toBe(1)
    expect(result.percentage).toBeCloseTo(16.67, 1)
    expect(result.resultTier).toBe('low')
  })

  it('returns moderate tier at 25% boundary', () => {
    const answers = { q1: 1, q2: 1 }
    const result = computeEvaluationResult(mockQuestions, answers)
    expect(result.totalScore).toBe(2)
    expect(result.percentage).toBeCloseTo(33.33, 1)
    expect(result.resultTier).toBe('moderate')
  })

  it('returns elevated tier when percentage is between 50 and 75', () => {
    const answers = { q1: 2, q2: 2 }
    const result = computeEvaluationResult(mockQuestions, answers)
    expect(result.totalScore).toBe(4)
    expect(result.percentage).toBeCloseTo(66.67, 1)
    expect(result.resultTier).toBe('elevated')
  })

  it('returns high tier when percentage above 75', () => {
    const answers = { q1: 3, q2: 2 }
    const result = computeEvaluationResult(mockQuestions, answers)
    expect(result.totalScore).toBe(5)
    expect(result.percentage).toBeCloseTo(83.33, 1)
    expect(result.resultTier).toBe('high')
  })

  it('ignores missing answer keys and treats as 0', () => {
    const result = computeEvaluationResult(mockQuestions, {})
    expect(result.totalScore).toBe(0)
    expect(result.resultTier).toBe('low')
  })
})

describe('buildAnswersForPersistence', () => {
  it('builds array of { questionId, value } for each question', () => {
    const answers = { q1: 2, q2: 1 }
    const out = buildAnswersForPersistence(mockQuestions, answers)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ questionId: 'q1', value: 2 })
    expect(out[1]).toEqual({ questionId: 'q2', value: 1 })
  })

  it('uses 0 for missing answer keys', () => {
    const out = buildAnswersForPersistence(mockQuestions, { q1: 1 })
    expect(out.find((a) => a.questionId === 'q1')?.value).toBe(1)
    expect(out.find((a) => a.questionId === 'q2')?.value).toBe(0)
  })
})
