import { describe, expect, it } from 'vitest'
import { parseStructuredModelOutput } from '../ai-provider.js'

describe('parseStructuredModelOutput', () => {
  it('accepts valid strict JSON wrapped in a code fence', () => {
    const result = parseStructuredModelOutput(`\`\`\`json
{"emotionLabels":["sadness","stress"],"riskLevel":2,"confidence":0.78,"evidence":["连续负向表达","考试压力临近"],"recommendedAction":"guided_self_help","studentMessage":"建议今晚先休息并查看系统建议。"}
\`\`\``)

    expect(result).toEqual({
      emotionLabels: ['sadness', 'stress'],
      riskLevel: 2,
      confidence: 0.78,
      evidence: ['连续负向表达', '考试压力临近'],
      recommendedAction: 'guided_self_help',
      studentMessage: '建议今晚先休息并查看系统建议。'
    })
  })

  it('returns null when model output is not valid structured JSON', () => {
    expect(parseStructuredModelOutput('最近状态不太好，建议多休息')).toBeNull()
    expect(
      parseStructuredModelOutput('{"emotionLabels":["sad"],"riskLevel":8,"confidence":2,"evidence":[],"recommendedAction":"","studentMessage":""}')
    ).toBeNull()
  })
})
