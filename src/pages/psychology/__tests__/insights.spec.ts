import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import InsightsPage from '@/pages/psychology/insights.vue'

const {
  onShowHandlers,
  mockUiStore,
  mockAuthStore,
  mockMentalHealthInsightsService
} = vi.hoisted(() => ({
  onShowHandlers: [] as Array<() => unknown>,
  mockUiStore: {
    theme: 'light',
    locale: 'zh-CN',
    initFromSystem: vi.fn()
  },
  mockAuthStore: {
    refreshProfile: vi.fn()
  },
  mockMentalHealthInsightsService: {
    getInsightsPageData: vi.fn(),
    refreshInsights: vi.fn()
  }
}))

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/services/mental-health-insights', () => ({
  default: mockMentalHealthInsightsService
}))

vi.mock('@/utils/auth-guard', () => ({
  requireAuth: vi.fn(() => true)
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: vi.fn((handler: () => unknown) => {
    onShowHandlers.push(handler)
  }),
  onPullDownRefresh: vi.fn()
}))

describe('insights page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onShowHandlers.length = 0
    mockMentalHealthInsightsService.getInsightsPageData.mockResolvedValue({
      summary: {
        latestSource: 'intervention',
        latestRiskLevel: 2,
        latestText: 'stable | study_interruptions:2',
        latestCreatedAt: '2026-03-16T10:00:00.000Z',
        assessmentCount: 1,
        interventionCount: 1,
        suggestionCount: 1,
        notificationCount: 1,
        totalCount: 1
      },
      timeline: [
        {
          id: 'timeline-1',
          source: 'assessment',
          title: 'stable | study_interruptions:2',
          text: '最近学习压力偏高，建议先调整节奏。',
          secondaryText: 'rest_support',
          riskLevel: 2,
          createdAt: '2026-03-16T10:00:00.000Z'
        }
      ]
    })
    mockMentalHealthInsightsService.refreshInsights.mockResolvedValue({
      summary: {
        latestSource: 'assessment',
        latestRiskLevel: 1,
        latestText: '状态已更新',
        latestCreatedAt: '2026-03-16T11:00:00.000Z',
        assessmentCount: 1,
        interventionCount: 0,
        suggestionCount: 0,
        notificationCount: 0,
        totalCount: 1
      },
      timeline: [
        {
          id: 'timeline-2',
          source: 'assessment',
          title: '状态已更新',
          text: '',
          secondaryText: '',
          riskLevel: 1,
          createdAt: '2026-03-16T11:00:00.000Z'
        }
      ]
    })
    ;(globalThis as any).uni = {
      navigateBack: vi.fn(),
      switchTab: vi.fn(),
      showToast: vi.fn(),
      stopPullDownRefresh: vi.fn()
    }
  })

  it('loads and renders insight summary plus timeline on show', async () => {
    const wrapper = mount(InsightsPage, {
      global: {
        stubs: {
          Icon: {
            props: ['name'],
            template: '<i class="icon-stub">{{ name }}</i>'
          }
        }
      }
    })

    await onShowHandlers[0]?.()
    await flushPromises()

    expect(wrapper.find('.hero-card').exists()).toBe(true)
    expect(wrapper.findAll('.timeline-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('状态平稳')
    expect(wrapper.text()).toContain('学习中断 2 天')
    expect(wrapper.text()).toContain('休息与支持建议')
  })

  it('refreshes insights when tapping the sync action', async () => {
    const wrapper = mount(InsightsPage, {
      global: {
        stubs: {
          Icon: {
            props: ['name'],
            template: '<i class="icon-stub">{{ name }}</i>'
          }
        }
      }
    })

    await onShowHandlers[0]?.()
    await flushPromises()
    await wrapper.find('.top-bar .right .icon-btn').trigger('tap')
    await flushPromises()

    expect(mockMentalHealthInsightsService.refreshInsights).toHaveBeenCalledWith({
      limit: 20,
      windowDays: 7,
      aggregateDays: 30
    })
  })

  it('renders english copy and translated backend codes for en locale', async () => {
    mockUiStore.locale = 'en-US'
    mockMentalHealthInsightsService.getInsightsPageData.mockResolvedValueOnce({
      summary: {
        latestSource: 'assessment',
        latestRiskLevel: 1,
        latestText: 'stable | study_interruptions:2',
        latestCreatedAt: '2026-03-16T10:00:00.000Z',
        assessmentCount: 1,
        interventionCount: 0,
        suggestionCount: 0,
        notificationCount: 0,
        totalCount: 1
      },
      timeline: [
        {
          id: 'timeline-3',
          source: 'assessment',
          title: 'low_mood / fatigue',
          text: '',
          secondaryText: 'guided_self_help',
          riskLevel: 1,
          createdAt: '2026-03-16T10:00:00.000Z'
        }
      ]
    })

    const wrapper = mount(InsightsPage, {
      global: {
        stubs: {
          Icon: {
            props: ['name'],
            template: '<i class="icon-stub">{{ name }}</i>'
          }
        }
      }
    })

    await onShowHandlers[0]?.()
    await flushPromises()

    expect(wrapper.text()).toContain('Mental Insights')
    expect(wrapper.text()).toContain('Stable')
    expect(wrapper.text()).toContain('2 study interruption days')
    expect(wrapper.text()).toContain('Guided self-help')
  })
})
