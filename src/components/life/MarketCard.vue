<template>
  <view :class="['market-card', themeClass]" @tap="$emit('tap')">
    <view class="card-image-wrap">
      <image
        v-if="coverImage"
        class="card-image"
        :src="coverImage"
        mode="aspectFill"
        lazy-load
      />
      <view v-else class="card-image-empty">
        <Icon name="image" :size="28" color="rgba(244,157,37,0.35)" />
      </view>
      <view class="price-tag">
        <text class="price-text">¥{{ formattedPrice }}</text>
      </view>
      <view class="condition-badge">
        <text class="condition-text">{{ conditionLabel }}</text>
      </view>
    </view>
    <view class="card-body">
      <text class="card-title">{{ item.title }}</text>
      <view class="card-bottom">
        <view class="category-chip">
          <text>{{ categoryLabel }}</text>
        </view>
        <view v-if="item.status !== 'available'" class="status-chip" :class="item.status">
          <text>{{ statusLabel }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MarketItem } from '@/types/market-item'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

const props = defineProps<{
  item: MarketItem
  themeClass: string
}>()

defineEmits<{
  (e: 'tap'): void
}>()

const uiPreferencesStore = useUiPreferencesStore()
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const coverImage = computed(() => {
  const images = props.item.images
  return Array.isArray(images) && images.length > 0 ? images[0] : ''
})

const formattedPrice = computed(() => {
  const p = Number(props.item.price || 0)
  return p % 1 === 0 ? String(p) : p.toFixed(2)
})

const conditionLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    brand_new: { zh: '全新', en: 'New' },
    like_new: { zh: '九成新', en: 'Like New' },
    good: { zh: '良好', en: 'Good' },
    fair: { zh: '有痕迹', en: 'Fair' }
  }
  const entry = map[props.item.condition]
  return entry ? (isZh.value ? entry.zh : entry.en) : props.item.condition
})

const categoryLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    digital: { zh: '数码', en: 'Digital' },
    textbook: { zh: '教材', en: 'Textbook' },
    daily: { zh: '生活', en: 'Daily' },
    clothing: { zh: '服装', en: 'Clothing' },
    sports: { zh: '运动', en: 'Sports' },
    other: { zh: '其他', en: 'Other' }
  }
  const entry = map[props.item.category]
  return entry ? (isZh.value ? entry.zh : entry.en) : props.item.category
})

const statusLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    reserved: { zh: '已预留', en: 'Reserved' },
    sold: { zh: '已售出', en: 'Sold' }
  }
  const entry = map[props.item.status]
  return entry ? (isZh.value ? entry.zh : entry.en) : ''
})
</script>

<style scoped lang="scss">
.market-card {
  border-radius: 20rpx;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid rgba(244, 157, 37, 0.16);
  box-shadow: 0 6rpx 16rpx rgba(244, 157, 37, 0.08);
}

.card-image-wrap {
  position: relative;
  width: 100%;
  height: 280rpx;
  overflow: hidden;
  background: rgba(244, 157, 37, 0.06);
}

.card-image {
  width: 100%;
  height: 100%;
}

.card-image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.price-tag {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 6rpx 16rpx;
  background: linear-gradient(135deg, #ea580c, #f59e0b);
  border-radius: 0 14rpx 0 0;
}

.price-text {
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
}

.condition-badge {
  position: absolute;
  right: 8rpx;
  top: 8rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
}

.condition-text {
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 600;
}

.card-body {
  padding: 14rpx 16rpx 16rpx;
}

.card-title {
  color: var(--text-main);
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.card-bottom {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.category-chip {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(244, 157, 37, 0.14);

  text {
    color: #b45309;
    font-size: 20rpx;
    font-weight: 600;
  }
}

.status-chip {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;

  text {
    font-size: 20rpx;
    font-weight: 600;
  }
}

.status-chip.reserved {
  background: rgba(59, 130, 246, 0.14);

  text {
    color: #2563eb;
  }
}

.status-chip.sold {
  background: rgba(148, 163, 184, 0.18);

  text {
    color: #64748b;
  }
}
</style>
