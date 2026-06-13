<template>
  <teleport to="body">
    <view class="app-tab-bar" :style="tabBarVars">
      <view class="app-tab-bar__inner">
        <t-tab-bar
          t-class="t-tab-bar"
          :value="value"
          shape="round"
          theme="tag"
          :split="false"
          :fixed="false"
          @change="onChange"
        >
          <t-tab-bar-item
            v-for="item in list"
            :key="item.value"
            :value="item.value"
            :icon="item.icon"
            :aria-label="item.ariaLabel"
          >
            {{ item.label }}
          </t-tab-bar-item>
        </t-tab-bar>
      </view>
    </view>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import TTabBar from '@/uni_modules/tdesign-uniapp/components/tab-bar/tab-bar.vue'
import TTabBarItem from '@/uni_modules/tdesign-uniapp/components/tab-bar-item/tab-bar-item.vue'

interface TabBarItemConfig {
  value: string
  icon: string
  ariaLabel: string
  label: string
}

const SECTION_ACTIVE_COLOR: Record<string, string> = {
  '/pages/study/index': '#4A90E2',
  '/pages/life/index': '#f49d25',
  '/pages/teaching/index': '#C00000',
  '/pages/psychology/index': '#886fde',
  '/pages/mine/index': '#6fde81'
}

const props = defineProps<{
  value: string
}>()

const emit = defineEmits<{
  (event: 'change', value: string): void
}>()

const uiPreferencesStore = useUiPreferencesStore()

const activeColor = computed(() => SECTION_ACTIVE_COLOR[props.value] || '#4A90E2')

function hexToRgba(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '')
  if (normalized.length !== 6) {
    return `rgba(74, 144, 226, ${alpha})`
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const tabBarVars = computed(() => {
  const dark = uiPreferencesStore.theme === 'dark'
  const currentActiveColor = activeColor.value

  return {
    '--td-tab-bar-bg-color': dark ? '#1b1828' : '#ffffff',
    '--td-tab-bar-color': dark ? '#a9b3c7' : '#64748b',
    '--td-tab-bar-active-color': currentActiveColor,
    '--td-tab-bar-active-bg': dark
      ? hexToRgba(currentActiveColor, 0.24)
      : hexToRgba(currentActiveColor, 0.14),
    '--td-tab-bar-border-color': dark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.28)',
    '--app-tab-shadow': dark
      ? '0 12rpx 32rpx rgba(15, 23, 42, 0.44)'
      : '0 8rpx 28rpx rgba(15, 23, 42, 0.16)'
  }
})

const list = computed<TabBarItemConfig[]>(() => [
  {
    value: '/pages/study/index',
    icon: props.value === '/pages/study/index' ? 'ai-education-filled' : 'ai-education',
    ariaLabel: t(I18N_KEYS.tabStudy, uiPreferencesStore.locale),
    label: t(I18N_KEYS.tabStudy, uiPreferencesStore.locale)
  },
  {
    value: '/pages/life/index',
    icon: props.value === '/pages/life/index' ? 'app-filled' : 'app',
    ariaLabel: t(I18N_KEYS.tabLife, uiPreferencesStore.locale),
    label: t(I18N_KEYS.tabLife, uiPreferencesStore.locale)
  },
  {
    value: '/pages/teaching/index',
    icon: props.value === '/pages/teaching/index' ? 'ai-book-open-filled' : 'ai-book-open',
    ariaLabel: uiPreferencesStore.locale === 'zh-CN' ? '教学' : 'Teaching',
    label: uiPreferencesStore.locale === 'zh-CN' ? '教学' : 'Teaching'
  },
  {
    value: '/pages/psychology/index',
    icon: props.value === '/pages/psychology/index' ? 'heart-filled' : 'heart',
    ariaLabel: t(I18N_KEYS.tabPsychology, uiPreferencesStore.locale),
    label: t(I18N_KEYS.tabPsychology, uiPreferencesStore.locale)
  },
  {
    value: '/pages/mine/index',
    icon: props.value === '/pages/mine/index' ? 'user-filled' : 'user',
    ariaLabel: t(I18N_KEYS.tabMine, uiPreferencesStore.locale),
    label: t(I18N_KEYS.tabMine, uiPreferencesStore.locale)
  }
])

function onChange(event: { value?: string } | string) {
  const nextValue = typeof event === 'string' ? event : String(event?.value || '')
  if (!nextValue) {
    return
  }

  emit('change', nextValue)
  if (nextValue === props.value || typeof uni?.switchTab !== 'function') {
    return
  }

  uni.switchTab({
    url: nextValue,
    fail: () => {
      uni.showToast({
        title: t(I18N_KEYS.commonComingSoon, uiPreferencesStore.locale),
        icon: 'none'
      })
    }
  })
}
</script>

<style lang="scss" scoped>
.app-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  box-sizing: border-box;
  padding: 0 20rpx calc(20rpx + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}

.app-tab-bar__inner {
  pointer-events: auto;
}

:deep(.t-tab-bar) {
  border-radius: 999rpx;
  overflow: hidden;
  box-shadow: var(--app-tab-shadow);
}
</style>
