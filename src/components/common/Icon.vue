<template>
  <text class="material-symbols-outlined icon-symbol" :style="iconStyle">
    {{ resolvedIconName }}
  </text>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: number | string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: 'currentColor'
})

const aliasMap: Record<string, string> = {
  book_2: 'menu_book',
  book_4: 'menu_book',
  lost_and_found: 'published_with_changes',
  logout: 'account_circle',
  assignment: 'description'
}

const themeColors: Record<string, string> = {
  primary: 'var(--primary-color, #886fde)',
  study: '#4A90E2',
  life: '#f49d25',
  teaching: '#C00000',
  psychology: '#886fde',
  mine: '#6fde81',
  success: '#4cd964',
  warning: '#f0ad4e',
  error: '#dd524d'
}

const resolvedIconName = computed(() => aliasMap[props.name] || props.name || 'help')

const iconStyle = computed(() => {
  const fontSize = typeof props.size === 'number' ? `${props.size}px` : props.size
  const resolvedColor = themeColors[props.color] || props.color
  return {
    fontSize,
    color: resolvedColor
  }
})
</script>

<style lang="scss" scoped>
.icon-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-weight: normal;
  font-style: normal;
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  font-family: 'Material Symbols Outlined', 'Segoe UI Symbol', sans-serif;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}
</style>
