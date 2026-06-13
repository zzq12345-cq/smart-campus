import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import QuickAccessCard from '@/components/common/QuickAccessCard.vue'

const items = [
  { icon: 'calendar_today', title: '课程表', subtitle: '今日课程', route: '/pages/study/schedule' },
  { icon: 'quiz', title: '考试安排', route: '/pages/study/exam' }
]

function mountComponent() {
  return mount(QuickAccessCard, {
    props: {
      items,
      theme: 'study'
    },
    global: {
      stubs: {
        Icon: {
          props: ['name', 'size', 'color'],
          template: '<i class="icon-stub" :data-name="name" :data-color="color"></i>'
        },
        'uni-row': {
          template: '<div class="uni-row-stub"><slot /></div>'
        },
        'uni-col': {
          template: '<div class="uni-col-stub"><slot /></div>'
        }
      }
    }
  })
}

describe('QuickAccessCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    ;(globalThis as any).uni = {
      navigateTo: vi.fn(),
      showToast: vi.fn()
    }
  })

  it('renders quick cards from props', () => {
    const wrapper = mountComponent()
    expect(wrapper.findAll('.quick-access-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('课程表')
    expect(wrapper.text()).toContain('考试安排')
    expect(wrapper.text()).toContain('今日课程')
  })

  it('applies theme attribute and icon theme color', () => {
    const wrapper = mountComponent()
    const firstCard = wrapper.find('.quick-access-card')
    expect(firstCard.attributes('data-theme')).toBe('study')
    const firstIcon = wrapper.find('.icon-stub')
    expect(firstIcon.attributes('data-color')).toBe('#4A90E2')
  })

  it('navigates when tapping a card', async () => {
    const wrapper = mountComponent()
    await wrapper.find('.quick-access-card').trigger('tap')

    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledTimes(1)
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/pages/study/schedule'
      })
    )
  })
})
