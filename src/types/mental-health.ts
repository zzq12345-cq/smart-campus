export type MentalHealthTriggerType =
  | 'post'
  | 'journal'
  | 'checkin'
  | 'study_checkin'
  | 'exam_plan'
  | 'user_window'
  | 'backfill'

export type MentalHealthRiskLevel = 0 | 1 | 2 | 3
export type MentalHealthInsightSource = 'assessment' | 'intervention' | 'suggestion' | 'notification'

export interface MentalHealthModelOutput {
  emotionLabels: string[]
  riskLevel: MentalHealthRiskLevel
  confidence: number
  evidence: string[]
  recommendedAction: string
  studentMessage: string
}

export interface MentalHealthAssessment {
  $id: string
  userId: string
  triggerType: MentalHealthTriggerType
  triggerRefId?: string
  windowStart: string
  windowEnd: string
  featureSnapshotJson: string
  ruleScore: number
  modelScore: number
  finalRiskLevel: MentalHealthRiskLevel
  confidence: number
  emotionSummary?: string
  evidenceJson?: string
  recommendedAction?: string
  reviewNeeded?: boolean
  modelProvider?: string
  modelName?: string
  promptVersion?: string
  $createdAt?: string
  $updatedAt?: string
}

export interface MentalHealthIntervention {
  $id: string
  userId: string
  assessmentId: string
  channel: string
  actionType: string
  payloadJson: string
  deliveryStatus: string
  cooldownKey?: string
  acknowledgedAt?: string | null
  effectivenessNote?: string
  $createdAt?: string
  $updatedAt?: string
}

export interface MentalHealthTooltipMessage {
  id: string
  category: string
  text: string
  riskLevel?: MentalHealthRiskLevel
}

export interface MentalHealthInsightTimelineItem {
  id: string
  source: MentalHealthInsightSource
  title: string
  text?: string
  secondaryText?: string
  riskLevel?: MentalHealthRiskLevel
  createdAt: string
}

export interface MentalHealthInsightsSummary {
  latestSource?: MentalHealthInsightSource
  latestRiskLevel: MentalHealthRiskLevel
  latestText: string
  latestCreatedAt: string
  assessmentCount: number
  interventionCount: number
  suggestionCount: number
  notificationCount: number
  totalCount: number
}

export interface MentalHealthInsightsPageData {
  summary: MentalHealthInsightsSummary
  timeline: MentalHealthInsightTimelineItem[]
}
