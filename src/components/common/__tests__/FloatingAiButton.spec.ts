import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FloatingAiButton from '@/components/common/FloatingAiButton.vue'

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(FloatingAiButton, {
    props,
    global: {
      stubs: {
        teleport: true,
        Icon: {
          props: ['name'],
          template: '<i class="icon-stub">{{ name }}</i>'
        }
      }
    }
  })
}

describe('FloatingAiButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      navigateTo: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders a mock push tooltip by default', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const wrapper = mountComponent()

    expect(wrapper.find('.chat-bubble').exists()).toBe(true)
    expect(wrapper.find('.bubble-tag').text()).toBe('心理预警')
    expect(wrapper.find('.bubble-text').text()).not.toBe('')
  })

  it('hides tooltip after tapping button', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const wrapper = mountComponent()
    await wrapper.find('.floating-ai-button').trigger('tap')

    expect(wrapper.find('.chat-bubble').exists()).toBe(false)
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledTimes(1)
  })

  it('rotates to the next mock push after the current one hides', async () => {
    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy.mockReturnValueOnce(0)
    randomSpy.mockReturnValueOnce(0)
    randomSpy.mockReturnValueOnce(0.95)

    const wrapper = mountComponent()
    const firstText = wrapper.find('.bubble-text').text()

    vi.advanceTimersByTime(4200)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.chat-bubble').exists()).toBe(false)

    vi.advanceTimersByTime(6000)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.chat-bubble').exists()).toBe(true)
    expect(wrapper.find('.bubble-text').text()).not.toBe(firstText)
  })
})
