import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/auth', () => ({
  default: {
    getCurrentUser: vi.fn()
  }
}))

vi.mock('@/services/mental-health-function', () => ({
  default: {
    evaluateUserWindow: vi.fn()
  }
}))

vi.mock('@/utils/appwrite', () => ({
  tablesDB: {
    listRows: vi.fn()
  }
}))

vi.mock('appwrite', () => ({
  Query: {
    equal: vi.fn((key: string, value: unknown) => `equal:${key}:${String(value)}`),
    orderDesc: vi.fn((key: string) => `orderDesc:${key}`),
    limit: vi.fn((value: number) => `limit:${value}`)
  }
}))

import mentalHealthInsightsService from '@/services/mental-health-insights'
import authService from '@/services/auth'
import mentalHealthFunctionService from '@/services/mental-health-function'
import { tablesDB } from '@/utils/appwrite'

describe('mentalHealthInsightsService', () => {
  const mockedAuth = vi.mocked(authService)
  const mockedMentalHealthFunction = vi.mocked(mentalHealthFunctionService)
  const mockedTables = vi.mocked(tablesDB)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.getCurrentUser.mockResolvedValue({ $id: 'user-1' } as any)
    mockedMentalHealthFunction.evaluateUserWindow.mockResolvedValue({ assessments: [] } as any)
    mockedTables.listRows.mockResolvedValue({ rows: [] } as any)
  })

  it('builds page data from multiple sources and sorts timeline by created time', async () => {
    mockedTables.listRows.mockImplementation(async (_databaseId, tableId) => {
      if (tableId === 'mental_health_assessments') {
        return {
          rows: [
            {
              $id: 'assessment-1',
              userId: 'user-1',
              finalRiskLevel: 2,
              emotionSummary: '焦虑有所升高',
              recommendedAction: 'rest_support',
              featureSnapshotJson: '{"studentMessage":"最近的压力偏高，建议先安排一次休息。"}',
              $createdAt: '2026-03-16T10:00:00.000Z'
            }
          ]
        } as any
      }
      if (tableId === 'mental_health_interventions') {
        return {
          rows: [
            {
              $id: 'intervention-1',
              userId: 'user-1',
              payloadJson:
                '{"title":"需要立即关注的安全支持","studentMessage":"请联系信任的人并优先保证安全。","riskLevel":3}',
              actionType: 'safety_support',
              $createdAt: '2026-03-16T11:00:00.000Z'
            }
          ]
        } as any
      }
      if (tableId === 'suggestions') {
        return {
          rows: [
            {
              $id: 'suggestion-1',
              title: '做一次呼吸练习',
              description: '先用两分钟把呼吸放慢下来。',
              metadataJson: '{"finalRiskLevel":1}',
              $createdAt: '2026-03-16T09:00:00.000Z'
            }
          ]
        } as any
      }
      if (tableId === 'notifications') {
        return {
          rows: [
            {
              $id: 'notification-1',
              preview: '系统已为你生成新的心理建议。',
              type: 'system',
              recipientId: 'user-1',
              actorId: 'user-1',
              targetType: 'user',
              targetId: 'user-1',
              isRead: false,
              groupKey: 'mental-health:1',
              $createdAt: '2026-03-16T12:00:00.000Z'
            }
          ]
        } as any
      }
      return { rows: [] } as any
    })

    const result = await mentalHealthInsightsService.getInsightsPageData(10)

    expect(result.timeline.map((item) => item.source)).toEqual([
      'notification',
      'intervention',
      'assessment',
      'suggestion'
    ])
    expect(result.summary.latestRiskLevel).toBe(3)
    expect(result.summary.latestText).toBe('需要立即关注的安全支持')
    expect(result.summary.totalCount).toBe(4)
    expect(result.summary.notificationCount).toBe(1)
  })

  it('degrades gracefully when one source query fails', async () => {
    mockedTables.listRows.mockImplementation(async (_databaseId, tableId) => {
      if (tableId === 'mental_health_assessments') {
        throw new Error('assessment failed')
      }
      if (tableId === 'suggestions') {
        return {
          rows: [
            {
              $id: 'suggestion-1',
              title: '今天早点休息',
              description: '尽量在 23 点前结束刷手机。',
              $createdAt: '2026-03-16T09:00:00.000Z'
            }
          ]
        } as any
      }
      return { rows: [] } as any
    })

    const result = await mentalHealthInsightsService.getInsightsPageData(10)

    expect(result.summary.assessmentCount).toBe(0)
    expect(result.summary.suggestionCount).toBe(1)
    expect(result.timeline).toHaveLength(1)
    expect(result.timeline[0].source).toBe('suggestion')
  })

  it('throws when all source queries fail', async () => {
    mockedTables.listRows.mockRejectedValue(new Error('all failed'))

    await expect(mentalHealthInsightsService.getInsightsPageData(10)).rejects.toThrow(
      'Failed to load mental health insights'
    )
  })

  it('refreshes insights by re-running evaluateUserWindow for the current user', async () => {
    mockedTables.listRows.mockResolvedValue({ rows: [] } as any)

    await mentalHealthInsightsService.refreshInsights({
      limit: 5,
      windowDays: 14,
      aggregateDays: 30
    })

    expect(mockedMentalHealthFunction.evaluateUserWindow).toHaveBeenCalledWith({
      userId: 'user-1',
      windowDays: 14,
      aggregateDays: 30
    })
    expect(mockedTables.listRows).toHaveBeenCalledTimes(4)
  })

  it('keeps tooltip fallback chain available for floating ai button', async () => {
    mockedTables.listRows.mockImplementation(async (_databaseId, tableId) => {
      if (tableId === 'mental_health_interventions') {
        return {
          rows: [
            {
              $id: 'intervention-1',
              payloadJson: '{"category":"安全支持","studentMessage":"先去喝杯水并联系朋友。","riskLevel":2}',
              $createdAt: '2026-03-16T11:00:00.000Z'
            }
          ]
        } as any
      }
      return { rows: [] } as any
    })

    const result = await mentalHealthInsightsService.listTooltipMessages(6)

    expect(result).toEqual([
      {
        id: 'intervention-1',
        category: '安全支持',
        text: '先去喝杯水并联系朋友。',
        riskLevel: 2
      }
    ])
  })
})
