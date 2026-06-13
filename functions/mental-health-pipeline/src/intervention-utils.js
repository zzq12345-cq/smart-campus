function cleanString(value, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  return typeof maxLength === 'number' ? normalized.slice(0, maxLength) : normalized
}

export function buildInterventionPlan(assessment) {
  const riskLevel = Number(assessment?.finalRiskLevel || 0)
  const baseMessage = cleanString(assessment?.emotionSummary || assessment?.recommendedAction, 240)
  if (riskLevel >= 3) {
    return {
      channel: 'system_notification',
      actionType: 'safety_support',
      category: '安全支持',
      title: '需要立即关注的安全支持',
      priority: 'urgent',
      suggestionCategory: 'community',
      studentMessage:
        baseMessage ||
        '你最近的状态波动较大。请立即联系你信任的人、校园心理中心；如果你觉得自己处于紧急危险，请立即联系当地紧急服务。',
      resources: [
        '联系信任的同学、辅导员或家人',
        '联系学校心理中心或校医院',
        '若存在即时危险，请立即联系当地紧急服务'
      ]
    }
  }
  if (riskLevel >= 2) {
    return {
      channel: 'system_notification',
      actionType: 'guided_self_help',
      category: '干预建议',
      title: '为你准备的减压建议',
      priority: 'high',
      suggestionCategory: 'mindfulness',
      studentMessage:
        baseMessage ||
        '你最近的压力和情绪信号正在叠加。建议先降低任务强度，做一次呼吸放松，并查看系统为你整理的建议卡片。',
      resources: ['10 分钟离线休息', '呼吸放松 3 轮', '联系可倾诉的人']
    }
  }
  return {
    channel: 'system_notification',
    actionType: 'gentle_checkin',
    category: '情绪提醒',
    title: '今天也要照顾好自己',
    priority: 'medium',
    suggestionCategory: 'selfcare',
    studentMessage:
      baseMessage ||
      '你最近有一些情绪波动，今晚可以给自己留一点恢复时间，必要时也可以查看系统建议。',
    resources: ['保持规律作息', '减少深夜刷屏', '完成一次简单放松']
  }
}

export function buildCooldownKey(assessment, actionType) {
  return cleanString(`${assessment?.userId || ''}:${assessment?.finalRiskLevel || 0}:${actionType}:${assessment?.triggerType || ''}`, 120)
}

export function isCooldownHit(existingRows) {
  return Array.isArray(existingRows) && existingRows.length > 0
}
