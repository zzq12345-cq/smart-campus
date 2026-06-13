<template>
  <view
    class="base-card"
    :class="[interactive ? 'is-interactive' : '']"
    :style="cssVars"
    :hover-class="interactive ? 'base-card-hover' : ''"
  >
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { createThemeCssVars } from '@/composables'
import type { SectionTheme } from '@/types/components'

interface Props {
  theme?: SectionTheme
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'psychology',
  interactive: false
})

const cssVars = computed(() => createThemeCssVars(props.theme))
</script>

<style scoped lang="scss">
.base-card {
  border-radius: 20rpx;
  border: 1px solid var(--primary-light);
  background: var(--surface-bg, #ffffff);
}

.base-card.is-interactive {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.base-card.base-card-hover {
  transform: translateY(-2px);
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.12);
  border-color: var(--primary-medium);
}
</style>

