import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    getCurrentUser: vi.fn()
  }
}))

const { mockMentalHealthFunctionService } = vi.hoisted(() => ({
  mockMentalHealthFunctionService: {
    evaluateEvent: vi.fn()
  }
}))

const { mockTablesDB } = vi.hoisted(() => ({
  mockTablesDB: {
    listRows: vi.fn(),
    getRow: vi.fn(),
    createRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn()
  }
}))

vi.mock('@/services/auth', () => ({
  default: mockAuthService
}))

vi.mock('@/services/mental-health-function', () => ({
  default: mockMentalHealthFunctionService
}))

vi.mock('@/utils/appwrite', () => ({
  tablesDB: mockTablesDB
}))

vi.mock('appwrite', () => ({
  ID: {
    unique: vi.fn(() => 'journal-id')
  },
  Permission: {
    read: vi.fn((role: string) => `read:${role}`),
    update: vi.fn((role: string) => `update:${role}`),
    delete: vi.fn((role: string) => `delete:${role}`)
  },
  Role: {
    user: vi.fn((userId: string) => `user:${userId}`)
  },
  Query: {
    equal: vi.fn((key: string, value: unknown) => `equal:${key}:${String(value)}`),
    orderAsc: vi.fn((key: string) => `orderAsc:${key}`),
    orderDesc: vi.fn((key: string) => `orderDesc:${key}`),
    limit: vi.fn((value: number) => `limit:${value}`),
    offset: vi.fn((value: number) => `offset:${value}`)
  }
}))

describe('journalsService', () => {
  let journalsService: typeof import('@/services/journals').default

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockAuthService.getCurrentUser.mockResolvedValue({ $id: 'user-1' } as any)
    mockMentalHealthFunctionService.evaluateEvent.mockResolvedValue({
      assessment: null
    })
    mockTablesDB.createRow.mockResolvedValue({
      $id: 'journal-id',
      userId: 'user-1',
      title: '',
      content: '最近有点累',
      mood: 'sad',
      isPrivate: true,
      tags: ['study'],
      summary: '最近有点累',
      sentimentScore: 0,
      riskLevel: 1
    } as any)
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'journal-id',
      userId: 'user-1',
      title: '最近有点累',
      content: '最近有点累',
      mood: 'sad',
      isPrivate: true,
      tags: ['study'],
      summary: '最近有点累',
      sentimentScore: 0,
      riskLevel: 1
    } as any)
    mockTablesDB.updateRow.mockResolvedValue({
      $id: 'journal-id',
      userId: 'user-1',
      title: '更新后的标题',
      content: '更新后的内容',
      mood: 'anxious',
      isPrivate: false,
      tags: ['emotion'],
      summary: '更新后的内容',
      sentimentScore: -0.6,
      riskLevel: 2
    } as any)
    ;({ default: journalsService } = await import('@/services/journals'))
  })

  it('creates journals with the new schema and queues mental health evaluation', async () => {
    await journalsService.createJournal({
      content: '最近有点累',
      mood: 'sad',
      isPrivate: true,
      tags: ['study'],
      summary: '最近有点累'
    })

    expect(mockTablesDB.createRow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'journal-id',
      expect.objectContaining({
        userId: 'user-1',
        title: '',
        content: '最近有点累',
        mood: 'sad',
        isPrivate: true,
        tags: ['study'],
        summary: '最近有点累',
        sentimentScore: 0,
        riskLevel: 1,
        entryAt: expect.any(String),
        rebtOnly: true,
        tagIds: ['study'],
        moodIntensity: 3
      }),
      expect.arrayContaining(['read:user:user-1', 'update:user:user-1', 'delete:user:user-1'])
    )
    expect(mockMentalHealthFunctionService.evaluateEvent).toHaveBeenCalledWith({
      sourceTable: 'journals',
      rowId: 'journal-id',
      eventType: 'create'
    })
  })

  it('updates journals with normalized fields instead of legacy moodIntensity/tagIds payloads', async () => {
    await journalsService.updateJournal('journal-id', {
      content: '更新后的内容',
      mood: 'anxious',
      isPrivate: false,
      tags: ['emotion'],
      sentimentScore: -0.6,
      riskLevel: 2
    })

    expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'journal-id',
      expect.objectContaining({
        title: '最近有点累',
        content: '更新后的内容',
        mood: 'anxious',
        isPrivate: false,
        tags: ['emotion'],
        sentimentScore: -0.6,
        riskLevel: 2,
        entryAt: expect.any(String),
        rebtOnly: false,
        tagIds: ['emotion'],
        moodIntensity: 4
      }),
      expect.any(Array)
    )
    expect(mockMentalHealthFunctionService.evaluateEvent).toHaveBeenCalledWith({
      sourceTable: 'journals',
      rowId: 'journal-id',
      eventType: 'update'
    })
  })

  it('normalizes legacy journal rows when listing journals', async () => {
    mockTablesDB.listRows.mockResolvedValue({
      rows: [
        {
          $id: 'legacy-journal',
          userId: 'user-1',
          title: '旧标题',
          content: '今天有点累',
          mood: '焦虑',
          rebtOnly: true,
          tagIds: ['study', 'emotion'],
          moodIntensity: 4
        }
      ]
    } as any)

    const rows = await journalsService.getMyJournals()

    expect(rows).toEqual([
      expect.objectContaining({
        $id: 'legacy-journal',
        mood: 'anxious',
        isPrivate: true,
        tags: ['study', 'emotion'],
        riskLevel: 3,
        title: '旧标题'
      })
    ])
  })
})
