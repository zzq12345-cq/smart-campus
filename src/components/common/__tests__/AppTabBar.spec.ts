import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import AppTabBar from '@/components/common/AppTabBar.vue'

const mockUiStore = {
  locale: 'zh-CN',
  theme: 'light'
}

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore
}))

const mockAuthStore = { isTeacher: false }

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

const createTabBarStub = (nextValue?: string) =>
  defineComponent({
    props: {
      value: {
        type: String,
        default: ''
      }
    },
    emits: ['change'],
    template: '<div class="tab-bar-stub" @click="handleClick"><slot /></div>',
    methods: {
      handleClick() {
        this.$emit('change', { value: nextValue || this.value })
      }
    }
  })

const TabBarItemStub = defineComponent({
  props: {
    value: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    }
  },
  template: '<div class="tab-item-stub" :data-value="value" :data-icon="icon"><slot /></div>'
})

function mountComponent(currentValue: string, nextValue?: string) {
  return mount(AppTabBar, {
    props: {
      value: currentValue
    },
    global: {
      stubs: {
        teleport: true,
        't-tab-bar': createTabBarStub(nextValue),
        't-tab-bar-item': TabBarItemStub
      }
    }
  })
}

describe('AppTabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.isTeacher = false
    ;(globalThis as any).uni = {
      switchTab: vi.fn(),
      showToast: vi.fn()
    }
  })

  it('renders four tab items for student (study + shared three)', () => {
    const wrapper = mountComponent('/pages/study/index')
    const values = wrapper.findAll('.tab-item-stub').map((i) => i.attributes('data-value'))
    expect(values).toEqual([
      '/pages/study/index',
      '/pages/life/index',
      '/pages/psychology/index',
      '/pages/mine/index'
    ])
  })

  it('renders teaching as first tab for teacher', () => {
    mockAuthStore.isTeacher = true
    const wrapper = mountComponent('/pages/teaching/index')
    const values = wrapper.findAll('.tab-item-stub').map((i) => i.attributes('data-value'))
    expect(values).toEqual([
      '/pages/teaching/index',
      '/pages/life/index',
      '/pages/psychology/index',
      '/pages/mine/index'
    ])
  })

  it('switches tab when selected value changes', async () => {
    const wrapper = mountComponent('/pages/study/index', '/pages/life/index')
    await wrapper.find('.tab-bar-stub').trigger('click')
    expect((globalThis as any).uni.switchTab).toHaveBeenCalledTimes(1)
    expect((globalThis as any).uni.switchTab).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/pages/life/index' })
    )
  })

  it('does not switch tab when selected value is unchanged', async () => {
    const wrapper = mountComponent('/pages/study/index', '/pages/study/index')
    await wrapper.find('.tab-bar-stub').trigger('click')
    expect((globalThis as any).uni.switchTab).not.toHaveBeenCalled()
  })

  it('uses filled icon for active tab', () => {
    const wrapper = mountComponent('/pages/life/index')
    const items = wrapper.findAll('.tab-item-stub')

    // 学生端：study / life / psychology / mine
    expect(items[0].attributes('data-icon')).toBe('ai-education')
    expect(items[1].attributes('data-icon')).toBe('app-filled')
    expect(items[2].attributes('data-icon')).toBe('heart')
    expect(items[3].attributes('data-icon')).toBe('user')
  })
})
