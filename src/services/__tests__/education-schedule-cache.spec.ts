import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EducationScheduleCacheSnapshot } from '@/types/education'

const mockStorage: Record<string, unknown> = {}

vi.stubGlobal('uni', {
  getStorageSync: vi.fn((key: string) => mockStorage[key]),
  setStorageSync: vi.fn((key: string, value: unknown) => {
    mockStorage[key] = value
  }),
  removeStorageSync: vi.fn((key: string) => {
    delete mockStorage[key]
  })
})

import educationScheduleCacheService from '@/services/education-schedule-cache'

function createSnapshot(overrides?: Partial<EducationScheduleCacheSnapshot>): EducationScheduleCacheSnapshot {
  return {
    appUserId: 'user_1234567890',
    fetchedAt: '2026-03-07T10:00:00.000Z',
    semesters: [
      {
        semesterId: '2025-2026-2',
        semesterName: '2025-2026-2',
        startDate: '2026-03-02'
      }
    ],
    semesterSchedules: {
      '2025-2026-2': {
        semesterId: '2025-2026-2',
        semesterName: '2025-2026-2',
        startDate: '2026-03-02',
        courses: [
          {
            name: '高等数学',
            credit: 4,
            teacher: '张老师',
            weeksText: '1-16周',
            type: '必修',
            studentCount: 60,
            semesterId: '2025-2026-2',
            semesterName: '2025-2026-2',
            day: 1,
            startSlot: 1,
            endSlot: 2,
            weeks: [1, 2, 3],
            location: '主楼101',
            weekType: 'all',
            timeLocation: {
              day: 1,
              startSlot: 1,
              endSlot: 2,
              weeks: [1, 2, 3],
              location: '主楼101',
              weekType: 'all',
              raw: '星期一第1-2节（1-3周）主楼101'
            }
          }
        ]
      }
    },
    ...overrides
  }
}

describe('educationScheduleCacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  })

  it('saves snapshot into local storage', () => {
    const snapshot = createSnapshot()

    const result = educationScheduleCacheService.saveSnapshot(snapshot)

    expect(result).toBe(true)
    expect(mockStorage.educationScheduleCache).toEqual(snapshot)
  })

  it('returns null for invalid snapshot payload', () => {
    const result = educationScheduleCacheService.saveSnapshot({
      appUserId: '',
      fetchedAt: '',
      semesters: [],
      semesterSchedules: {}
    })

    expect(result).toBe(false)
  })

  it('returns snapshot for matching user', () => {
    const snapshot = createSnapshot()
    mockStorage.educationScheduleCache = snapshot

    const result = educationScheduleCacheService.getSnapshot('user_1234567890')

    expect(result).toEqual(snapshot)
  })

  it('returns null for different user', () => {
    mockStorage.educationScheduleCache = createSnapshot()

    const result = educationScheduleCacheService.getSnapshot('user_other')

    expect(result).toBeNull()
  })

  it('clears cached snapshot', () => {
    mockStorage.educationScheduleCache = createSnapshot()

    const result = educationScheduleCacheService.clearSnapshot()

    expect(result).toBe(true)
    expect(mockStorage.educationScheduleCache).toBeUndefined()
  })
})
