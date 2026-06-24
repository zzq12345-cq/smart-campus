<template>
  <view :class="['market-detail-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">{{ loadingText }}</text>
    </view>

    <view v-else-if="errorMessage" class="state-card error">
      <text class="state-text">{{ errorMessage }}</text>
      <view class="retry-btn" @tap="loadDetail">
        <text class="retry-text">{{ retryText }}</text>
      </view>
    </view>

    <view v-else-if="item" class="detail-body">
      <swiper
        v-if="item.images.length"
        class="image-swiper"
        indicator-dots
        indicator-active-color="#f49d25"
        indicator-color="rgba(255,255,255,0.5)"
        circular
      >
        <swiper-item v-for="(img, idx) in item.images" :key="idx" @tap="previewImages(idx)">
          <image class="swiper-image" :src="img" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <view v-else class="image-empty">
        <Icon name="image" :size="48" color="rgba(244,157,37,0.25)" />
      </view>

      <view class="info-card">
        <view class="price-row">
          <text class="price">¥{{ formattedPrice }}</text>
          <view class="condition-chip">
            <text>{{ conditionLabel }}</text>
          </view>
        </view>
        <text class="item-title">{{ item.title }}</text>
        <text class="item-desc">{{ item.description }}</text>

        <view class="meta-row">
          <view class="meta-chip">
            <Icon name="category" :size="14" color="#b45309" />
            <text>{{ categoryLabel }}</text>
          </view>
          <view class="meta-chip" :class="item.status">
            <text>{{ statusLabel }}</text>
          </view>
          <view class="meta-chip views">
            <Icon name="visibility" :size="14" color="#94a3b8" />
            <text>{{ item.viewCount }} {{ isZh ? '次浏览' : 'views' }}</text>
          </view>
        </view>

        <view class="time-row">
          <text class="time-text">{{ formatTime(item.$createdAt) }}</text>
        </view>
      </view>

      <view v-if="item.contactNote" class="note-card">
        <view class="note-head">
          <Icon name="info" :size="16" color="#f49d25" />
          <text class="note-title">{{ isZh ? '卖家留言' : 'Seller Note' }}</text>
        </view>
        <text class="note-content">{{ item.contactNote }}</text>
      </view>

      <view class="author-card">
        <view class="author-left" @tap="contactSeller">
          <view class="author-avatar">
            <image
              v-if="authorAvatar"
              :src="authorAvatar"
              class="avatar-image"
              mode="aspectFill"
              lazy-load
            />
            <Icon v-else name="person" :size="18" color="#94a3b8" />
          </view>
          <view class="author-info">
            <text class="author-name">{{ authorName }}</text>
            <text class="author-label">{{
              isZh ? '发布者 · 点击私信' : 'Seller · Tap to chat'
            }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-actions">
        <view
          v-if="isOwner"
          class="action-btn sold-btn"
          :class="{ disabled: updatingStatus }"
          @tap="toggleSoldStatus"
        >
          <Icon name="sell" :size="18" color="#ffffff" />
          <text>{{
            item.status === 'sold'
              ? isZh
                ? '重新上架'
                : 'Relist'
              : isZh
                ? '标记已售'
                : 'Mark Sold'
          }}</text>
        </view>
        <view v-if="isOwner" class="action-btn delete-btn" @tap="confirmDelete">
          <Icon name="delete" :size="18" color="#ef4444" />
          <text>{{ isZh ? '删除' : 'Delete' }}</text>
        </view>
        <view
          v-if="!isOwner && canContact"
          class="action-btn contact-btn"
          :class="{ disabled: startingConversation }"
          @tap="contactSeller"
        >
          <Icon name="mail" :size="18" color="#ffffff" />
          <text>{{ isZh ? '联系卖家' : 'Contact Seller' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { Query } from 'appwrite'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import marketItemsService from '@/services/market-items'
import conversationsService from '@/services/conversations'
import type { MarketItem } from '@/types/market-item'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { redirectToLogin } from '@/utils/auth-guard'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const itemId = ref('')
const item = ref<MarketItem | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const authorName = ref('')
const authorAvatar = ref('')
const updatingStatus = ref(false)
const startingConversation = ref(false)

const pageTitle = computed(() => (isZh.value ? '商品详情' : 'Item Detail'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const retryText = computed(() => (isZh.value ? '重试' : 'Retry'))

const currentUserId = computed(() =>
  String(authStore.user?.$id || authStore.dbUser?.$id || '').trim(),
)
const isOwner = computed(() =>
  Boolean(item.value && currentUserId.value && item.value.authorId === currentUserId.value),
)
const canContact = computed(() =>
  Boolean(
    item.value?.authorId && currentUserId.value && item.value.authorId !== currentUserId.value,
  ),
)

const formattedPrice = computed(() => {
  const p = Number(item.value?.price || 0)
  return p % 1 === 0 ? String(p) : p.toFixed(2)
})

const conditionLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    brand_new: { zh: '全新', en: 'New' },
    like_new: { zh: '九成新', en: 'Like New' },
    good: { zh: '良好', en: 'Good' },
    fair: { zh: '有痕迹', en: 'Fair' },
  }
  const entry = map[item.value?.condition || '']
  return entry ? (isZh.value ? entry.zh : entry.en) : ''
})

const categoryLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    digital: { zh: '数码', en: 'Digital' },
    textbook: { zh: '教材', en: 'Textbook' },
    daily: { zh: '生活', en: 'Daily' },
    clothing: { zh: '服装', en: 'Clothing' },
    sports: { zh: '运动', en: 'Sports' },
    other: { zh: '其他', en: 'Other' },
  }
  const entry = map[item.value?.category || '']
  return entry ? (isZh.value ? entry.zh : entry.en) : ''
})

const statusLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    available: { zh: '在售', en: 'Available' },
    reserved: { zh: '已预留', en: 'Reserved' },
    sold: { zh: '已售出', en: 'Sold' },
  }
  const entry = map[item.value?.status || '']
  return entry ? (isZh.value ? entry.zh : entry.en) : ''
})

const formatTime = (rawTime?: string) => {
  if (!rawTime) return ''
  const ts = new Date(rawTime).getTime()
  if (Number.isNaN(ts)) return rawTime
  const diffMin = Math.floor((Date.now() - ts) / 60000)
  if (diffMin < 1) return isZh.value ? '刚刚' : 'Just now'
  if (diffMin < 60) return isZh.value ? `${diffMin}分钟前` : `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return isZh.value ? `${diffH}小时前` : `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return isZh.value ? `${diffD}天前` : `${diffD}d ago`
}

const resolveAuthor = async (authorId: string) => {
  if (!authorId) return
  try {
    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, [
      Query.equal('$id', [authorId]),
      Query.limit(1),
    ])
    const row = (result?.rows || [])[0] as Record<string, unknown> | undefined
    if (row) {
      authorName.value = String(row.name || '').trim() || authorId
      authorAvatar.value = String(row.avatar || '').trim()
    } else {
      authorName.value = isZh.value ? '校园用户' : 'Campus User'
    }
  } catch {
    authorName.value = isZh.value ? '校园用户' : 'Campus User'
  }
}

const loadDetail = async () => {
  if (!itemId.value) {
    errorMessage.value = isZh.value ? '缺少商品 ID' : 'Missing item ID'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await marketItemsService.getItem(itemId.value)
    item.value = result
    await resolveAuthor(result.authorId)
    marketItemsService.incrementViewCount(result.$id)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errorMessage.value = isZh.value
      ? `加载失败：${msg || '请稍后重试'}`
      : `Failed: ${msg || 'retry later'}`
  } finally {
    loading.value = false
  }
}

const previewImages = (index: number) => {
  if (!item.value?.images.length) return
  uni.previewImage({
    urls: item.value.images,
    current: item.value.images[index],
  })
}

const toggleSoldStatus = async () => {
  if (!item.value || updatingStatus.value) return
  updatingStatus.value = true
  try {
    const newStatus = item.value.status === 'sold' ? 'available' : 'sold'
    const updated = await marketItemsService.updateItemStatus(item.value.$id, newStatus)
    item.value = { ...item.value, status: updated.status || newStatus }
    uni.showToast({
      title: isZh.value ? '已更新' : 'Updated',
      icon: 'success',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    uni.showToast({ title: msg || (isZh.value ? '操作失败' : 'Failed'), icon: 'none' })
  } finally {
    updatingStatus.value = false
  }
}

const confirmDelete = () => {
  uni.showModal({
    title: isZh.value ? '确认删除' : 'Confirm Delete',
    content: isZh.value ? '删除后无法恢复，确认删除？' : 'This cannot be undone. Delete?',
    success: async (res) => {
      if (!res.confirm || !item.value) return
      try {
        await marketItemsService.deleteItem(item.value.$id)
        uni.showToast({ title: isZh.value ? '已删除' : 'Deleted', icon: 'success' })
        setTimeout(() => goBack(), 300)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        uni.showToast({ title: msg || (isZh.value ? '删除失败' : 'Delete failed'), icon: 'none' })
      }
    },
  })
}

const contactSeller = async () => {
  if (!item.value?.authorId || startingConversation.value) return
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: isZh.value ? '请先登录' : 'Please login first', icon: 'none' })
    redirectToLogin()
    return
  }
  startingConversation.value = true
  try {
    const conversation = await conversationsService.findOrCreateDirectConversation(
      item.value.authorId,
    )
    const title = encodeURIComponent(authorName.value || (isZh.value ? '卖家' : 'Seller'))
    uni.navigateTo({
      url: `/pages/messages/chat?conversationId=${encodeURIComponent(conversation.$id)}&title=${title}`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    uni.showToast({ title: msg || (isZh.value ? '发起私信失败' : 'Failed'), icon: 'none' })
  } finally {
    startingConversation.value = false
  }
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/life/market/index' })
  }
}

onLoad(async (query) => {
  uiPreferencesStore.initFromSystem()
  await authStore.refreshProfile()
  itemId.value = String(query?.id || '').trim()
  await loadDetail()
})
</script>

<style scoped lang="scss">
.market-detail-page {
  min-height: 100vh;
  padding: 0 0 160rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f7f5;
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(244, 157, 37, 0.16);
  --topbar-bg: rgba(248, 247, 245, 0.9);
}

.theme-dark {
  --page-bg: #221a10;
  --surface: rgba(30, 23, 15, 0.78);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #94a3af;
  --line: rgba(244, 157, 37, 0.3);
  --topbar-bg: rgba(34, 26, 16, 0.88);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  backdrop-filter: blur(14px);
  background: var(--topbar-bg);
}

.left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.image-swiper {
  width: 100%;
  height: 560rpx;
}

.swiper-image {
  width: 100%;
  height: 100%;
}

.image-empty {
  width: 100%;
  height: 360rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(244, 157, 37, 0.06);
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-card,
.note-card,
.author-card {
  margin: 0 24rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.price {
  color: #ea580c;
  font-size: 48rpx;
  font-weight: 800;
  line-height: 1.2;
}

.condition-chip {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(244, 157, 37, 0.16);

  text {
    color: #b45309;
    font-size: 22rpx;
    font-weight: 600;
  }
}

.item-title {
  margin-top: 16rpx;
  color: var(--text-main);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.4;
  display: block;
}

.item-desc {
  margin-top: 12rpx;
  color: var(--text-sub);
  font-size: 26rpx;
  line-height: 1.65;
  white-space: pre-wrap;
  display: block;
}

.meta-row {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(244, 157, 37, 0.12);

  text {
    color: #b45309;
    font-size: 22rpx;
    font-weight: 600;
  }
}

.meta-chip.available text {
  color: #b45309;
}

.meta-chip.sold {
  background: rgba(148, 163, 184, 0.18);

  text {
    color: #64748b;
  }
}

.meta-chip.reserved {
  background: rgba(59, 130, 246, 0.14);

  text {
    color: #2563eb;
  }
}

.meta-chip.views {
  background: rgba(148, 163, 184, 0.12);

  text {
    color: var(--text-soft);
  }
}

.time-row {
  margin-top: 14rpx;
}

.time-text {
  color: var(--text-soft);
  font-size: 22rpx;
}

.note-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.note-title {
  color: var(--text-main);
  font-size: 26rpx;
  font-weight: 700;
}

.note-content {
  color: var(--text-sub);
  font-size: 26rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

.author-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.author-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--line);
  background: rgba(148, 163, 184, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.author-name {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 600;
}

.author-label {
  color: var(--text-soft);
  font-size: 22rpx;
}

.bottom-actions {
  margin: 8rpx 24rpx 0;
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  min-height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;

  text {
    font-size: 26rpx;
    font-weight: 700;
  }

  &:active {
    opacity: 0.8;
  }
}

.action-btn.disabled {
  opacity: 0.6;
}

.contact-btn {
  background: linear-gradient(135deg, #f49d25, #ea580c);
  box-shadow: 0 8rpx 20rpx rgba(244, 157, 37, 0.35);

  text {
    color: #ffffff;
  }
}

.sold-btn {
  background: rgba(244, 157, 37, 0.18);

  text {
    color: #b45309;
  }
}

.delete-btn {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.2);

  text {
    color: #ef4444;
  }
}

.state-card {
  margin: 60rpx 24rpx 0;
  padding: 36rpx 24rpx;
  border: 1px dashed var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.3);
}

.state-text {
  color: var(--text-sub);
  font-size: 24rpx;
}

.retry-btn {
  border-radius: 999rpx;
  border: 1px solid rgba(244, 157, 37, 0.36);
  padding: 10rpx 24rpx;
  background: rgba(244, 157, 37, 0.14);
}

.retry-text {
  color: #b45309;
  font-size: 22rpx;
  font-weight: 600;
}
</style>
