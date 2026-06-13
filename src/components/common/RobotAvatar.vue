<template>
  <view :class="containerClasses" :style="containerStyle">
    <Icon v-if="visual.iconName && !visual.hasFace && skinId !== 'default'" :name="visual.iconName" :size="iconSize" color="#ffffff" />
    <Icon v-if="skinId === 'default'" name="smart_toy" :size="iconSize" :color="isDark ? '#94a3b8' : '#64748b'" />
    <!-- Face overlays for non-default skins -->
    <view v-if="visual.hasFace" class="robot-face">
      <!-- Nebula: two dot eyes -->
      <template v-if="skinId === 'nebula'">
        <view class="face-dot face-dot-left" />
        <view class="face-dot face-dot-right" />
      </template>
      <!-- Mint: smile curve -->
      <template v-if="skinId === 'mint'">
        <view class="face-smile" />
      </template>
      <!-- Sunset: visor bar -->
      <template v-if="skinId === 'sunset'">
        <view class="face-visor" />
      </template>
      <!-- Ocean: porthole eye + wave -->
      <template v-if="skinId === 'ocean'">
        <view class="face-porthole" />
        <view class="face-wave" />
      </template>
      <!-- Golden: star sparkles -->
      <template v-if="skinId === 'golden'">
        <view class="face-star face-star-1" />
        <view class="face-star face-star-2" />
        <Icon name="school" :size="iconSize * 0.45" color="#7a5c00" />
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/common/Icon.vue'
import { ROBOT_SKIN_VISUALS } from '@/data/points-constants'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { RobotSkinId } from '@/types/points'

const props = withDefaults(defineProps<{
  skinId: RobotSkinId
  size?: 'small' | 'medium' | 'large'
}>(), {
  size: 'small'
})

const uiPreferencesStore = useUiPreferencesStore()

const visual = computed(() => ROBOT_SKIN_VISUALS[props.skinId] || ROBOT_SKIN_VISUALS.default)
const isDark = computed(() => uiPreferencesStore.theme === 'dark')

const sizeMap = {
  small: { width: '48rpx', height: '48rpx', icon: 16, faceScale: 1 },
  medium: { width: '56px', height: '56px', icon: 28, faceScale: 1.17 },
  large: { width: '120rpx', height: '120rpx', icon: 40, faceScale: 2.5 }
} as const

const currentSize = computed(() => sizeMap[props.size])
const iconSize = computed(() => currentSize.value.icon)

const containerClasses = computed(() => [
  'robot-avatar',
  `robot-skin--${props.skinId}`,
  `robot-avatar--${props.size}`,
  { 'robot-avatar--dark': isDark.value }
])

const containerStyle = computed(() => ({
  width: currentSize.value.width,
  height: currentSize.value.height,
  background: isDark.value ? visual.value.gradientDark : visual.value.gradient,
  border: visual.value.borderColor !== 'transparent' ? `2px solid ${visual.value.borderColor}` : undefined,
  boxShadow: `0 2px 12px ${visual.value.shadowColor}`
}))
</script>

<style lang="scss" scoped>
.robot-avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

// Face overlay container
.robot-face {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

// Nebula eyes
.face-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  top: 35%;
}
.face-dot-left { left: 28%; }
.face-dot-right { right: 28%; }

// Mint smile
.face-smile {
  position: absolute;
  bottom: 25%;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 5px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-top: none;
  border-radius: 0 0 10px 10px;
}

// Sunset visor
.face-visor {
  position: absolute;
  top: 32%;
  left: 15%;
  right: 15%;
  height: 4px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 2px;
}

// Ocean porthole
.face-porthole {
  position: absolute;
  top: 28%;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  border: 1.5px solid #7fdbff;
  border-radius: 50%;
  background: rgba(127, 219, 255, 0.2);
}
.face-wave {
  position: absolute;
  bottom: 28%;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 3px;
  border-bottom: 1.5px solid #7fdbff;
  border-radius: 0 0 4px 4px;
}

// Golden sparkles
.face-star {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
}
.face-star-1 { top: 15%; right: 20%; }
.face-star-2 { top: 25%; left: 15%; width: 3px; height: 3px; }

// Large size face scaling
.robot-avatar--large {
  .face-dot { width: 10px; height: 10px; }
  .face-smile { width: 16px; height: 8px; border-width: 3px; }
  .face-visor { height: 6px; }
  .face-porthole { width: 14px; height: 14px; border-width: 2px; }
  .face-wave { width: 14px; height: 5px; border-bottom-width: 2px; }
  .face-star { width: 6px; height: 6px; }
  .face-star-2 { width: 5px; height: 5px; }
}

// Medium size face scaling
.robot-avatar--medium {
  .face-dot { width: 7px; height: 7px; }
  .face-smile { width: 12px; height: 6px; border-width: 2.5px; }
  .face-visor { height: 5px; }
  .face-porthole { width: 10px; height: 10px; }
  .face-wave { width: 10px; height: 4px; }
}
</style>
