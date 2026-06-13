import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type {
  EducationAuthSnapshot,
  EducationScheduleCacheSnapshot,
  EducationSemesterSchedule,
  EducationSemesterSummary
} from '@/types/education'

const { mockEducationFunctionService, mockEducationSessionService, mockEducationScheduleCacheService } = vi.hoisted(() => ({
  mockEducationFunctionService: {
    getScheduleSemesters: vi.fn(),
    getSchedule: vi.fn()
  },
  mockEducationSessionService: {
    getSnapshot: vi.fn()
  },
  mockEducationScheduleCacheService: {
    getSnapshot: vi.fn(),
    saveSnapshot: vi.fn(),
    clearSnapshot: vi.fn()
  }
}))

const scheduleOnShowCallbacks = vi.hoisted(() => [] as Array<() => void | Promise<void>>)

const mockUiStore = {
  theme: 'light',
  locale: 'zh-CN',
  initFromSystem: vi.fn(),
  setActiveSection: vi.fn()
}

const mockAuthStore = {
  user: { $id: 'user_1234567890' },
  dbUser: null,
  isLoggedIn: true,
  init: vi.fn().mockResolvedValue(undefined)
}

const mockRequireAuth = vi.fn(() => true)

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/utils/auth-guard', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args)
}))

vi.mock('@/services/education-function', () => ({
  default: mockEducationFunctionService
}))

vi.mock('@/services/education-session', () => ({
  default: mockEducationSessionService
}))

vi.mock('@/services/education-schedule-cache', () => ({
  default: mockEducationScheduleCacheService
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void | Promise<void>) => {
    scheduleOnShowCallbacks.push(callback)
  }
}))

function createAuthSnapshot(overrides?: Partial<EducationAuthSnapshot>): EducationAuthSnapshot {
  return {
    appUserId: 'user_1234567890',
    studentId: '20250001',
    cookieBundle: 'PHPSESSID=abc123',
    authenticatedAt: '2026-03-07T09:00:00.000Z',
    personalInfo: {
      name: '张三',
      studentId: '20250001',
      class: '软件工程1班',
      major: '软件工程',
      grade: '2025',
      gender: '男',
      dormitory: '1-101'
    },
    ...overrides
  }
}

function createSemesterSummaries(): EducationSemesterSummary[] {
  return [
    {
      semesterId: '2025-2026-2',
      semesterName: '2025-2026-2',
      startDate: '2026-03-02'
    },
    {
      semesterId: '2025-2026-1',
      semesterName: '2025-2026-1',
      startDate: '2025-09-01'
    }
  ]
}

function createSemesterSchedule(semesterId = '2025-2026-2'): EducationSemesterSchedule {
  if (semesterId === '2025-2026-1') {
    return {
      semesterId,
      semesterName: semesterId,
      startDate: '2025-09-01',
      courses: [
        {
          name: '离散数学',
          credit: 3,
          teacher: '王老师',
          weeksText: '1-8周',
          type: '必修',
          studentCount: 48,
          semesterId,
          semesterName: semesterId,
          day: 2,
          startSlot: 1,
          endSlot: 2,
          weeks: [1, 2, 3, 4],
          location: '主楼202',
          weekType: 'all',
          timeLocation: {
            day: 2,
            startSlot: 1,
            endSlot: 2,
            weeks: [1, 2, 3, 4],
            location: '主楼202',
            weekType: 'all',
            raw: '星期二第1-2节（1-4周）主楼202'
          }
        }
      ]
    }
  }

  return {
    semesterId,
    semesterName: semesterId,
    startDate: '2026-03-02',
    courses: [
      {
        name: '高等数学',
        credit: 4,
        teacher: '张老师',
        weeksText: '1-5周',
        type: '必修',
        studentCount: 60,
        semesterId,
        semesterName: semesterId,
        day: 1,
        startSlot: 1,
        endSlot: 2,
        weeks: [1, 2, 3, 4, 5],
        location: '主楼101',
        weekType: 'all',
        timeLocation: {
          day: 1,
          startSlot: 1,
          endSlot: 2,
          weeks: [1, 2, 3, 4, 5],
          location: '主楼101',
          weekType: 'all',
          raw: '星期一第1-2节（1-5周）主楼101'
        }
      },
      {
        name: '高等数学',
        credit: 4,
        teacher: '张老师',
        weeksText: '1-3周',
        type: '必修',
        studentCount: 60,
        semesterId,
        semesterName: semesterId,
        day: 3,
        startSlot: 3,
        endSlot: 4,
        weeks: [1, 2, 3],
        location: '实验楼202',
        weekType: 'all',
        timeLocation: {
          day: 3,
          startSlot: 3,
          endSlot: 4,
          weeks: [1, 2, 3],
          location: '实验楼202',
          weekType: 'all',
          raw: '星期三第3-4节（1-3周）实验楼202'
        }
      },
      {
        name: '专题研讨',
        credit: 2,
        teacher: '李老师',
        weeksText: '2-4周',
        type: '选修',
        studentCount: 36,
        semesterId,
        semesterName: semesterId,
        day: 3,
        startSlot: 11,
        endSlot: 12,
        weeks: [2, 4],
        location: '主2#301',
        weekType: 'double',
        timeLocation: {
          day: 3,
          startSlot: 11,
          endSlot: 12,
          weeks: [2, 4],
          location: '主2#301',
          weekType: 'double',
          raw: '周三午1-午2节(双周)(主2#301)(2-4周)'
        }
      },
      {
        name: '课程设计',
        credit: 2,
        teacher: '李老师',
        weeksText: '8-12周',
        type: '实践',
        studentCount: 20,
        semesterId,
        semesterName: semesterId,
        day: 0,
        startSlot: 0,
        endSlot: 0,
        weeks: [],
        location: '',
        weekType: 'all',
        timeLocation: null
      }
    ]
  }
}

function createCacheSnapshot(overrides?: Partial<EducationScheduleCacheSnapshot>): EducationScheduleCacheSnapshot {
  return {
    appUserId: 'user_1234567890',
    fetchedAt: '2026-03-07T10:00:00.000Z',
    semesters: createSemesterSummaries(),
    semesterSchedules: {
      '2025-2026-2': createSemesterSchedule('2025-2026-2')
    },
    ...overrides
  }
}

async function mountPage() {
  const SchedulePage = (await import('@/pages/study/schedule.vue')).default
  const wrapper = mount(SchedulePage, {
    global: {
      stubs: {
        Icon: {
          props: ['name'],
          template: '<i class="icon-stub">{{ name }}</i>'
        },
        'scroll-view': {
          template: '<div class="scroll-view-stub"><slot /></div>'
        }
      }
    }
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('study schedule page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-07T10:00:00.000Z'))
    scheduleOnShowCallbacks.length = 0

    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      switchTab: vi.fn()
    }

    mockRequireAuth.mockReturnValue(true)
    mockAuthStore.init.mockResolvedValue(undefined)
    mockEducationSessionService.getSnapshot.mockReturnValue(createAuthSnapshot())
    mockEducationScheduleCacheService.getSnapshot.mockReturnValue(createCacheSnapshot())
    mockEducationScheduleCacheService.saveSnapshot.mockReturnValue(true)
    mockEducationFunctionService.getScheduleSemesters.mockResolvedValue({
      semesters: createSemesterSummaries()
    })
    mockEducationFunctionService.getSchedule.mockResolvedValue({
      schedule: createSemesterSchedule('2025-2026-2')
    })
  })

  it('renders cached weekly schedule by default', async () => {
    const wrapper = await mountPage()

    expect(mockEducationFunctionService.getScheduleSemesters).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.timetable-shell').exists()).toBe(true)
    expect(wrapper.text()).toContain('高等数学')
    expect(wrapper.text()).toContain('课程设计')
    expect(wrapper.find('.week-range-text').text()).toBe('03/02 - 03/08')
    expect(wrapper.text()).toContain('08:45')
    expect(wrapper.text()).toContain('08:55')
    expect(wrapper.text()).toContain('12:30')
    expect(wrapper.text()).toContain('13:15')
    expect(wrapper.text()).toContain('13:25')
    expect(wrapper.text()).toContain('14:10')
    expect(wrapper.text()).toContain('10:00')
    expect(wrapper.text()).toContain('10:45')
    expect(wrapper.text()).toContain('11:40')
  })

  it('switches between previous and next week', async () => {
    const wrapper = await mountPage()

    expect(wrapper.find('.week-chip-text').text()).toContain('1')

    await wrapper.findAll('.week-nav-btn')[0].trigger('tap')
    expect(wrapper.find('.week-chip-text').text()).toContain('1')

    await wrapper.findAll('.week-nav-btn')[1].trigger('tap')
    expect(wrapper.find('.week-chip-text').text()).toContain('2')
    expect(wrapper.text()).toContain('专题研讨')
    expect(wrapper.text()).toContain('主2#301')
  })

  it('switches to day view', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('.view-tab')[0].trigger('tap')

    expect(wrapper.find('.day-agenda-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('主楼101')
  })

  it('switches selected day in day view', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('.view-tab')[0].trigger('tap')
    await wrapper.findAll('.weekday-pill')[2].trigger('tap')

    expect(wrapper.text()).toContain('实验楼202')
    expect(wrapper.text()).toContain('10:00-11:40')
  })

  it('fetches another semester when switching semester tab', async () => {
    mockEducationScheduleCacheService.getSnapshot.mockReturnValue(
      createCacheSnapshot({
        semesterSchedules: {}
      })
    )
    mockEducationFunctionService.getSchedule
      .mockResolvedValueOnce({
        schedule: createSemesterSchedule('2025-2026-2')
      })
      .mockResolvedValueOnce({
        schedule: createSemesterSchedule('2025-2026-1')
      })

    const wrapper = await mountPage()
    await wrapper.findAll('.semester-chip')[1].trigger('tap')
    await flushPromises()

    expect(mockEducationFunctionService.getSchedule).toHaveBeenLastCalledWith('PHPSESSID=abc123', '2025-2026-1')
    expect(wrapper.text()).toContain('离散数学')
  })

  it('redirects to identity page when education account is missing', async () => {
    mockEducationSessionService.getSnapshot.mockReturnValue(null)

    const wrapper = await mountPage()

    expect((globalThis as any).uni.showToast).toHaveBeenCalled()
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/mine/identity?source=schedule'
    })
    expect(wrapper.find('.state-card.error').exists()).toBe(true)
  })

  it('refreshes schedule when returning from identity with a new cookie bundle', async () => {
    await mountPage()

    mockEducationFunctionService.getScheduleSemesters.mockClear()
    mockEducationFunctionService.getSchedule.mockClear()
    mockEducationSessionService.getSnapshot.mockReturnValue(
      createAuthSnapshot({
        cookieBundle: 'PHPSESSID=new-cookie'
      })
    )

    await scheduleOnShowCallbacks[0]?.()
    await flushPromises()
    await flushPromises()

    expect(mockEducationFunctionService.getScheduleSemesters).toHaveBeenCalledTimes(1)
    expect(mockEducationFunctionService.getSchedule).toHaveBeenCalledTimes(1)
    expect(mockEducationFunctionService.getScheduleSemesters).toHaveBeenCalledWith('PHPSESSID=new-cookie')
    expect(mockEducationFunctionService.getSchedule).toHaveBeenCalledWith('PHPSESSID=new-cookie', '2025-2026-2')
  })

  it('keeps cached data when semester refresh fails', async () => {
    const error = Object.assign(new Error('Cookie 已失效'), { code: 401 })
    mockEducationFunctionService.getSchedule.mockRejectedValue(error)

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('高等数学')
    expect(wrapper.find('.notice-card').text()).toContain('缓存课表')
    expect(wrapper.find('.notice-card').text()).toContain('去绑定')
  })
})
