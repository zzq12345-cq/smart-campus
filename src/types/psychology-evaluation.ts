/**
 * Types for psychology evaluation (survey / assessment) flow.
 * Results can be persisted to mental_health_assessments or similar later.
 */

export interface EvaluationQuestion {
  id: string
  text: string
  textEn: string
  options: { value: number; label: string; labelEn: string }[]
}

export interface EvaluationAnswer {
  questionId: string
  value: number
}

export interface EvaluationResult {
  totalScore: number
  maxScore: number
  answeredAt: string
  answers: EvaluationAnswer[]
}
