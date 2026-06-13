/**
 * Pure helpers for evaluation scoring and result tier.
 * Used by evaluation page and by tests.
 */

import type { EvaluationQuestion, EvaluationAnswer } from '@/types/psychology-evaluation'

export type ResultTier = 'low' | 'moderate' | 'elevated' | 'high'

export interface EvaluationResultComputed {
  totalScore: number
  maxScore: number
  resultTier: ResultTier
  percentage: number
}

/**
 * Compute total score, max score, and result tier from questions and answers.
 */
export function computeEvaluationResult(
  questions: EvaluationQuestion[],
  answers: Record<string, number>
): EvaluationResultComputed {
  const totalScore = questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0)
  const maxScore = questions.length * 3
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0
  let resultTier: ResultTier = 'low'
  if (percentage > 75) resultTier = 'high'
  else if (percentage > 50) resultTier = 'elevated'
  else if (percentage > 25) resultTier = 'moderate'
  return { totalScore, maxScore, resultTier, percentage }
}

/**
 * Build answers array for persistence from questions + answers record.
 */
export function buildAnswersForPersistence(
  questions: EvaluationQuestion[],
  answers: Record<string, number>
): EvaluationAnswer[] {
  return questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? 0 }))
}
