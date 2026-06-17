<template>
  <view v-if="visible" :class="['skin-selector-overlay', themeClass]">
    <view class="skin-backdrop" :class="{ active: animReady }" @tap="handleClose" />

    <view class="skin-panel" :class="{ active: animReady }">
      <view class="skin-header">
        <view class="skin-header-close" @tap="handleClose">
          <Icon name="close" :size="22" color="var(--ss-text)" />
        </view>
        <text class="skin-header-title">{{ t(I18N_KEYS.robotSkinSelectorTitle, locale) }}</text>
        <view class="skin-header-spacer" />
      </view>

      <scroll-view class="skin-body" scroll-y>
        <view
          v-for="skin in ROBOT_SKINS"
          :key="skin.id"
          :class="['skin-card', { 'skin-card--equipped': pointsStore.isSkinEquipped(skin.id) }]"
          @tap="handleSkinTap(skin.id, skin.points)"
        >
          <view class="skin-card-avatar">
            <RobotAvatar :skinId="skin.id" size="large" />
          </view>
          <view class="skin-card-info">
            <text class="skin-card-name">{{ t(skin.nameKey, locale) }}</text>
            <text v-if="skin.points > 0" class="skin-card-cost"> {{ skin.points }} pts </text>
            <text v-else class="skin-card-cost skin-card-cost--free">
              {{ t(I18N_KEYS.robotSkinFree, locale) }}
            </text>
          </view>
          <view class="skin-card-action">
            <text
              v-if="pointsStore.isSkinEquipped(skin.id)"
              class="skin-badge skin-badge--equipped"
            >
              {{ t(I18N_KEYS.robotSkinEquipped, locale) }}
            </text>
            <view
              v-else-if="pointsStore.ownsSkin(skin.id)"
              class="skin-btn skin-btn--equip"
              @tap.stop="handleEquip(skin.id)"
            >
              <text class="skin-btn-text">{{ t(I18N_KEYS.robotSkinEquip, locale) }}</text>
            </view>
            <template v-else>
              <view
                v-if="skin.points <= pointsStore.balance"
                class="skin-btn skin-btn--buy"
                @tap.stop="handleBuy(skin.id, skin.points)"
              >
                <text class="skin-btn-text">{{ t(I18N_KEYS.robotSkinBuy, locale) }}</text>
              </view>
              <text v-else class="skin-badge skin-badge--insufficient">
                {{ t(I18N_KEYS.robotSkinInsufficient, locale) }}
              </text>
            </template>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import type { I18nKey } from '@/i18n/keys'
import { ROBOT_SKINS } from '@/data/points-constants'
import { usePointsStore } from '@/stores/points'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import Icon from '@/components/common/Icon.vue'
import RobotAvatar from '@/components/common/RobotAvatar.vue'
import type { RobotSkinId } from '@/types/points'

const props = withDefaults(
  defineProps<{
    visible: boolean
  }>(),
  {
    visible: false,
  },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'skin-changed', skinId: RobotSkinId): void
}>()

const uiPreferencesStore = useUiPreferencesStore()
const pointsStore = usePointsStore()
const authStore = useAuthStore()

const locale = computed(() => uiPreferencesStore.locale)
const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const animReady = ref(false)

function getUserId(): string {
  return authStore.dbUser?.$id || ''
}

async function handleBuy(skinId: RobotSkinId, cost: number) {
  const userId = getUserId()
  if (!userId) {
    uni.showToast({ title: 'Please login first', icon: 'none' })
    return
  }

  const success = await pointsStore.purchaseRobotItem(userId, 'skin', skinId, cost)
  if (success) {
    uni.showToast({ title: t(I18N_KEYS.robotSkinPurchaseSuccess, locale.value), icon: 'success' })
    await handleEquip(skinId)
  } else {
    uni.showToast({ title: t(I18N_KEYS.robotSkinPurchaseFail, locale.value), icon: 'none' })
  }
}

async function handleEquip(skinId: RobotSkinId) {
  const userId = getUserId()
  if (!userId) {
    uni.showToast({ title: 'Please login first', icon: 'none' })
    return
  }

  try {
    await pointsStore.equipRobotItem(userId, 'skin', skinId)
    uni.showToast({ title: t(I18N_KEYS.robotSkinEquipSuccess, locale.value), icon: 'success' })
    emit('skin-changed', skinId)
  } catch {
    uni.showToast({ title: t(I18N_KEYS.robotSkinPurchaseFail, locale.value), icon: 'none' })
  }
}

function handleSkinTap(_skinId: RobotSkinId, _points: number) {
  // Card tap reserved for future use; actions handled by explicit buttons
}

function handleClose() {
  animReady.value = false
  setTimeout(() => emit('close'), 200)
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      nextTick(() => {
        animReady.value = true
      })
    } else {
      animReady.value = false
    }
  },
)
</script>

<style lang="scss" scoped>
.skin-selector-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.theme-light {
  --ss-bg: #f8f8fa;
  --ss-surface: #ffffff;
  --ss-text: #0f172a;
  --ss-text-sub: #64748b;
  --ss-text-soft: #94a3b8;
  --ss-line: rgba(148, 163, 184, 0.18);
  --ss-backdrop: rgba(15, 23, 42, 0.4);
  --ss-accent: #4cd964;
  --ss-accent-text: #ffffff;
  --ss-btn-primary: #886fde;
  --ss-btn-buy: #886fde;
  --ss-btn-text: #ffffff;
  --ss-card-border: rgba(148, 163, 184, 0.18);
  --ss-cost-color: #f59e0b;
}

.theme-dark {
  --ss-bg: #0f0d1a;
  --ss-surface: rgba(24, 22, 36, 0.95);
  --ss-text: #f1f5f9;
  --ss-text-sub: #cbd5e1;
  --ss-text-soft: #94a3b8;
  --ss-line: rgba(148, 163, 184, 0.14);
  --ss-backdrop: rgba(0, 0, 0, 0.56);
  --ss-accent: #4cd964;
  --ss-accent-text: #0f0d1a;
  --ss-btn-primary: #886fde;
  --ss-btn-buy: #886fde;
  --ss-btn-text: #ffffff;
  --ss-card-border: rgba(148, 163, 184, 0.14);
  --ss-cost-color: #fbbf24;
}

.skin-backdrop {
  position: absolute;
  inset: 0;
  background: var(--ss-backdrop);
  opacity: 0;
  transition: opacity 0.22s ease;

  &.active {
    opacity: 1;
  }
}

.skin-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 70vh;
  background: var(--ss-bg);
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  opacity: 0;
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease;

  &.active {
    transform: translateY(0);
    opacity: 1;
  }
}

.skin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid var(--ss-line);
  flex-shrink: 0;
}

.skin-header-close {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.6;
  }
}

.skin-header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--ss-text);
}

.skin-header-spacer {
  width: 48rpx;
}

.skin-body {
  flex: 1;
  min-height: 200rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom, 0px));
}

.skin-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: var(--ss-surface);
  border-radius: 20rpx;
  border: 2rpx solid var(--ss-card-border);
  border-left: 6rpx solid transparent;
  transition: border-color 0.18s ease;

  &--equipped {
    border-left-color: var(--ss-accent);
  }
}

.skin-card-avatar {
  flex-shrink: 0;
}

.skin-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.skin-card-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ss-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skin-card-cost {
  font-size: 24rpx;
  color: var(--ss-cost-color);
  font-weight: 500;

  &--free {
    color: var(--ss-accent);
  }
}

.skin-card-action {
  flex-shrink: 0;
}

.skin-badge {
  font-size: 24rpx;
  font-weight: 600;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  white-space: nowrap;

  &--equipped {
    background: var(--ss-accent);
    color: var(--ss-accent-text);
  }

  &--insufficient {
    background: transparent;
    color: var(--ss-text-soft);
    border: 2rpx solid var(--ss-line);
  }
}

.skin-btn {
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.7;
  }

  &--equip {
    background: var(--ss-btn-primary);
  }

  &--buy {
    background: var(--ss-btn-buy);
  }
}

.skin-btn-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--ss-btn-text);
}
</style>
