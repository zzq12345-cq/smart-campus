<template>
  <view class="quick-access-grid">
    <uni-row>
      <uni-col
        v-for="(item, index) in items"
        :key="index"
        :span="12"
      >
        <view
          class="quick-access-card"
          :data-theme="theme"
          :hover-class="'card-hover'"
          @tap="handleTap(item)"
        >
          <view class="icon-wrapper">
            <Icon
              :name="item.icon"
              :size="24"
              :color="themeColor"
            />
          </view>
          <text class="card-title">{{ item.title }}</text>
          <text v-if="item.subtitle" class="card-subtitle">{{ item.subtitle }}</text>
        </view>
      </uni-col>
    </uni-row>
  </view>
</template>

<script setup lang="ts">
/**
 * QuickAccessCard Component
 *
 * 2x2 quick access grid for main features
 * Displays circular icon containers with bold titles
 * Supports theme color switching per section (study/life/psychology/mine)
 *
 * @example
 * <QuickAccessCard
 *   :items="[
 *     { icon: 'headset_mic', title: 'Counseling', subtitle: 'Professional support', route: '/pages/psychology/counseling' },
 *     { icon: 'forest', title: 'Tree Hole', subtitle: 'Speak anonymously', route: '/pages/psychology/tree-hole' }
 *   ]"
 *   theme="psychology"
 * />
 */

import { computed, watch } from 'vue'
import { useNavigation, useTheme } from '@/composables'
import type { QuickAccessItem, SectionTheme } from '@/types/components'

// Props definition
interface Props {
  items: QuickAccessItem[] // Array of 4 quick access items (2x2 grid)
  theme?: SectionTheme // Section theme for color
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'psychology'
})

const { navigateTo } = useNavigation()
const { sectionColor, setSection } = useTheme(props.theme)

// Computed theme color
const themeColor = computed(() => {
  return sectionColor.value
})

// Handle card tap
const handleTap = (item: QuickAccessItem) => {
  navigateTo(item.route)
}

watch(
  () => props.theme,
  (nextTheme) => {
    setSection(nextTheme)
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.quick-access-grid {
  padding: 0 $uni-spacing-row-base;
  margin-bottom: 16px;
}

.quick-access-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  margin: 6px;
  background: $uni-bg-color;
  border: 1px solid $border-light;
  border-radius: $uni-border-radius-lg;
  transition: all 0.2s ease;
  cursor: pointer;

  // Hover effect (simulated via hover-class)
  &.card-hover {
    border-color: $border-medium;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(136, 111, 222, 0.1); // primary/10
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  // Theme-specific background colors
  .quick-access-card[data-theme="study"] & {
    background: rgba(74, 144, 226, 0.1);
  }

  .quick-access-card[data-theme="life"] & {
    background: rgba(244, 157, 37, 0.1);
  }

  .quick-access-card[data-theme="psychology"] & {
    background: rgba(136, 111, 222, 0.1);
  }

  .quick-access-card[data-theme="mine"] & {
    background: rgba(111, 222, 129, 0.1);
  }
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.3;
}

.card-subtitle {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.4;
}

// Dark mode support
@media (prefers-color-scheme: dark) {
  .quick-access-card {
    background: rgba(15, 23, 42, 0.5);
    border-color: rgba(136, 111, 222, 0.2);
  }

  .card-title {
    color: #f1f5f9;
  }

  .card-subtitle {
    color: #94a3b8;
  }
}
</style>
