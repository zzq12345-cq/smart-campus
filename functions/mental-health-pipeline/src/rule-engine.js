const CRISIS_KEYWORDS = [
  '自杀',
  '轻生',
  '不想活',
  '结束自己',
  '活着没意义',
  '撑不下去',
  '我想消失',
  '伤害自己',
  'kill myself',
  'end my life',
  'self harm',
  'suicide'
]

const HIGH_RISK_KEYWORDS = [
  '崩溃',
  '绝望',
  '失眠',
  '没人理解',
  '活不下去',
  'panic',
  'worthless',
  'hopeless',
  'breakdown'
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function cleanString(value, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  return typeof maxLength === 'number' ? normalized.slice(0, maxLength) : normalized
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function findKeywordMatches(textSignals, keywords) {
  const matches = []
  for (const signal of Array.isArray(textSignals) ? textSignals : []) {
    const content = cleanString(signal.text).toLowerCase()
    if (!content) {
      continue
    }
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        matches.push(`${signal.source}:${keyword}`)
      }
    }
  }
  return uniq(matches)
}

export function riskLevelFromScore(score) {
  const normalized = Number(score || 0)
  if (normalized >= 75) {
    return 3
  }
  if (normalized >= 50) {
    return 2
  }
  if (normalized >= 25) {
    return 1
  }
  return 0
}

function buildRecommendedAction(level, evidence) {
  if (level >= 3) {
    return 'safety_support'
  }
  if (level >= 2) {
    return evidence.some((item) => item.includes('exam')) ? 'exam_pressure_relief' : 'guided_self_help'
  }
  if (level >= 1) {
    return 'gentle_checkin'
  }
  return 'none'
}

function buildFallbackStudentMessage(level) {
  if (level >= 3) {
    return '你最近的表达里出现了较强烈的痛苦信号。请立刻联系你信任的人、校园心理中心，若你感到有即时危险，请立即联系当地紧急服务。'
  }
  if (level >= 2) {
    return '你最近承受的压力正在叠加。建议先暂停高压任务，做一次呼吸放松，并尽快查看系统给出的个性化建议。'
  }
  if (level >= 1) {
    return '你最近有一些情绪波动，建议今晚给自己留一点休息时间，也可以看看系统整理的自助建议。'
  }
  return '整体状态平稳，继续保持规律作息和稳定表达。'
}

export function evaluateRiskRules(snapshot) {
  let ruleScore = 0
  const evidence = []
  const emotionLabels = []
  const crisisMatches = findKeywordMatches(snapshot.textSignals, CRISIS_KEYWORDS)
  const highRiskMatches = findKeywordMatches(snapshot.textSignals, HIGH_RISK_KEYWORDS)

  if (crisisMatches.length) {
    ruleScore += 55
    evidence.push(`crisis_keywords:${crisisMatches.slice(0, 3).join(',')}`)
    emotionLabels.push('distress')
  }

  if (highRiskMatches.length) {
    ruleScore += 20
    evidence.push(`high_risk_keywords:${highRiskMatches.slice(0, 3).join(',')}`)
    emotionLabels.push('overwhelmed')
  }

  if (snapshot.posts.negativeCount >= 2) {
    ruleScore += 10
    evidence.push(`negative_posts:${snapshot.posts.negativeCount}`)
    emotionLabels.push('stress')
  }

  if (snapshot.journals.negativeCount >= 2) {
    ruleScore += 12
    evidence.push(`negative_journals:${snapshot.journals.negativeCount}`)
    emotionLabels.push('low_mood')
  }

  if (snapshot.journals.negativeStreak >= 3) {
    ruleScore += 16
    evidence.push(`negative_journal_streak:${snapshot.journals.negativeStreak}`)
    emotionLabels.push('persistent_distress')
  }

  if (snapshot.temporal.lateNightSignals >= 2) {
    ruleScore += 8
    evidence.push(`late_night_expression:${snapshot.temporal.lateNightSignals}`)
  }

  if (snapshot.checkins.highRiskCount >= 1) {
    ruleScore += 12
    evidence.push(`high_risk_checkins:${snapshot.checkins.highRiskCount}`)
    emotionLabels.push('risk_alert')
  }

  if (snapshot.checkins.recentRiskAverage >= 2) {
    ruleScore += 10
    evidence.push(`checkin_risk_trend:${snapshot.checkins.recentRiskAverage}`)
  }

  if (snapshot.checkins.avgEnergyLevel > 0 && snapshot.checkins.avgEnergyLevel <= 2.2) {
    ruleScore += 8
    evidence.push(`low_energy:${snapshot.checkins.avgEnergyLevel}`)
    emotionLabels.push('fatigue')
  }

  if (snapshot.study.interruptionDays >= 2) {
    ruleScore += 7
    evidence.push(`study_interruptions:${snapshot.study.interruptionDays}`)
  }

  if (snapshot.study.shortDurationCount >= 2) {
    ruleScore += 5
    evidence.push(`short_study_sessions:${snapshot.study.shortDurationCount}`)
  }

  if (snapshot.exams.pressureScore >= 2) {
    ruleScore += 8
    evidence.push(`exam_pressure:${snapshot.exams.nearestExamInDays}`)
  }

  if (snapshot.aggregate30.negativeSignals >= 4) {
    ruleScore += 10
    evidence.push(`aggregate_negative_signals:${snapshot.aggregate30.negativeSignals}`)
  }

  ruleScore = clamp(ruleScore, 0, 100)
  let riskLevel = riskLevelFromScore(ruleScore)

  if (crisisMatches.length) {
    riskLevel = 3
  } else if (snapshot.journals.negativeStreak >= 3 || snapshot.checkins.highRiskCount >= 2) {
    riskLevel = Math.max(riskLevel, 2)
  }

  return {
    ruleScore,
    riskLevel,
    evidence: uniq(evidence),
    emotionLabels: uniq(emotionLabels),
    recommendedAction: buildRecommendedAction(riskLevel, evidence),
    studentMessage: buildFallbackStudentMessage(riskLevel),
    severe: crisisMatches.length > 0
  }
}

function modelScoreFromOutput(modelResult) {
  if (!modelResult) {
    return 0
  }
  return clamp(Math.round(Number(modelResult.riskLevel || 0) * 25 + Number(modelResult.confidence || 0) * 25), 0, 100)
}

export function mergeAssessment({ ruleResult, modelResult }) {
  const modelScore = modelScoreFromOutput(modelResult)
  const ruleScore = clamp(Number(ruleResult.ruleScore || 0), 0, 100)
  const combinedScore = modelResult ? Math.round(ruleScore * 0.6 + modelScore * 0.4) : ruleScore
  let finalRiskLevel = riskLevelFromScore(combinedScore)

  if (ruleResult.severe) {
    finalRiskLevel = 3
  }
  if (modelResult?.riskLevel === 3 && Number(modelResult.confidence || 0) >= 0.75) {
    finalRiskLevel = 3
  }
  if (ruleResult.riskLevel >= 2 && modelResult?.riskLevel >= 2) {
    finalRiskLevel = Math.max(finalRiskLevel, 2)
  }

  const confidence = clamp(
    modelResult
      ? Number((Number(ruleScore / 100) * 0.35 + Number(modelResult.confidence || 0) * 0.65).toFixed(2))
      : Number(Math.max(0.45, ruleScore / 100).toFixed(2)),
    0,
    1
  )

  const evidence = uniq([...(ruleResult.evidence || []), ...((modelResult && modelResult.evidence) || [])]).slice(0, 8)
  const emotionLabels = uniq([...(ruleResult.emotionLabels || []), ...((modelResult && modelResult.emotionLabels) || [])]).slice(
    0,
    6
  )
  const recommendedAction = cleanString(
    modelResult?.recommendedAction || ruleResult.recommendedAction || buildRecommendedAction(finalRiskLevel, evidence),
    120
  )
  const studentMessage = cleanString(
    modelResult?.studentMessage || ruleResult.studentMessage || buildFallbackStudentMessage(finalRiskLevel),
    300
  )

  return {
    ruleScore,
    modelScore,
    finalScore: combinedScore,
    finalRiskLevel,
    confidence,
    evidence,
    emotionLabels,
    recommendedAction,
    studentMessage
  }
}
