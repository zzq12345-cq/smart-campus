function cleanString(value, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  return typeof maxLength === 'number' ? normalized.slice(0, maxLength) : normalized
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function stripCodeFence(input) {
  const text = String(input || '').trim()
  if (!text) {
    return ''
  }
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

function normalizeEmotionLabels(value) {
  if (!Array.isArray(value)) {
    return []
  }
  return Array.from(new Set(value.map((item) => cleanString(item, 30)).filter(Boolean))).slice(0, 6)
}

function normalizeEvidence(value) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => cleanString(item, 120)).filter(Boolean).slice(0, 8)
}

function normalizeModelOutput(value) {
  if (!value || typeof value !== 'object') {
    return null
  }
  const riskLevel = Number(value.riskLevel)
  const confidence = Number(value.confidence)
  const recommendedAction = cleanString(value.recommendedAction, 120)
  const studentMessage = cleanString(value.studentMessage, 300)
  const emotionLabels = normalizeEmotionLabels(value.emotionLabels)
  const evidence = normalizeEvidence(value.evidence)
  if (!Number.isFinite(riskLevel) || riskLevel < 0 || riskLevel > 3) {
    return null
  }
  if (!Number.isFinite(confidence)) {
    return null
  }
  if (!recommendedAction || !studentMessage) {
    return null
  }
  return {
    emotionLabels,
    riskLevel: Math.round(clamp(riskLevel, 0, 3)),
    confidence: Number(clamp(confidence, 0, 1).toFixed(2)),
    evidence,
    recommendedAction,
    studentMessage
  }
}

export function parseStructuredModelOutput(raw) {
  const text = stripCodeFence(raw)
  if (!text) {
    return null
  }
  try {
    const parsed = JSON.parse(text)
    return normalizeModelOutput(parsed)
  } catch {
    return null
  }
}

function resolveChatCompletionsUrl(baseUrl) {
  const normalized = cleanString(baseUrl)
  if (!normalized) {
    return ''
  }
  if (/\/chat\/completions$/i.test(normalized)) {
    return normalized
  }
  return `${normalized.replace(/\/+$/, '')}/chat/completions`
}

function buildPrompt(snapshot, ruleResult) {
  return [
    '请根据以下大学生心理状态特征做结构化判断。',
    '你只能返回严格 JSON，不允许附加解释、Markdown 或代码块。',
    'JSON 字段必须只有 emotionLabels, riskLevel, confidence, evidence, recommendedAction, studentMessage。',
    'riskLevel 只能是 0/1/2/3，confidence 为 0 到 1 的小数。',
    '不要因为单条消极表达就直接给最高风险，要结合连续性、上下文和压力因素。',
    `规则引擎初判：${JSON.stringify({
      riskLevel: ruleResult.riskLevel,
      ruleScore: ruleResult.ruleScore,
      evidence: ruleResult.evidence
    })}`,
    `特征快照：${JSON.stringify(snapshot)}`
  ].join('\n')
}

function extractChoiceText(payload) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === 'string' ? item.text : typeof item?.content === 'string' ? item.content : ''))
      .join('\n')
  }
  return ''
}

export async function requestStructuredAssessment(aiConfig, snapshot, ruleResult) {
  const baseUrl = resolveChatCompletionsUrl(aiConfig.baseUrl)
  const apiKey = cleanString(aiConfig.apiKey)
  const model = cleanString(aiConfig.model)
  if (!baseUrl || !apiKey || !model) {
    return {
      provider: 'rules-only',
      modelName: model,
      output: null,
      error: 'AI provider not configured'
    }
  }

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: {
          type: 'json_object'
        },
        messages: [
          {
            role: 'system',
            content:
              '你是大学生心理危机预警系统的结构化评估器。你必须谨慎、可解释、保守地输出 JSON，不得输出多余文本。'
          },
          {
            role: 'user',
            content: buildPrompt(snapshot, ruleResult)
          }
        ]
      }),
      signal: AbortSignal.timeout(Number(aiConfig.timeoutMs || 15000))
    })

    const payload = await response.json()
    if (!response.ok) {
      return {
        provider: 'openai-compatible',
        modelName: model,
        output: null,
        error: cleanString(payload?.error?.message || response.statusText, 200)
      }
    }

    const output = parseStructuredModelOutput(extractChoiceText(payload))
    return {
      provider: 'openai-compatible',
      modelName: model,
      output,
      error: output ? '' : 'Model returned invalid JSON'
    }
  } catch (error) {
    return {
      provider: 'openai-compatible',
      modelName: model,
      output: null,
      error: cleanString(error?.message || 'AI request failed', 200)
    }
  }
}
