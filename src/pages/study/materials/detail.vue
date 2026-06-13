<template>
  <view :class="['material-detail-page', themeClass]">
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
      <view class="info-card">
        <text class="item-title">{{ item.title }}</text>

        <view class="meta-row">
          <view class="meta-chip subject">
            <Icon name="school" :size="14" color="#2563eb" />
            <text>{{ item.subject }}</text>
          </view>
          <view class="meta-chip type">
            <Icon :name="typeIcon" :size="14" color="#4A90E2" />
            <text>{{ typeLabel }}</text>
          </view>
        </view>

        <text class="item-desc">{{ item.description }}</text>

        <view v-if="item.tags && item.tags.length" class="tags-row">
          <view v-for="tag in item.tags" :key="tag" class="tag-chip">
            <text>#{{ tag }}</text>
          </view>
        </view>

        <view class="stats-row">
          <view class="stat-item">
            <Icon name="download" :size="16" color="#94a3b8" />
            <text>{{ item.downloadCount }} {{ isZh ? '次下载' : 'downloads' }}</text>
          </view>
          <view class="stat-item">
            <Icon name="thumb_up" :size="16" color="#94a3b8" />
            <text>{{ item.likeCount }} {{ isZh ? '次点赞' : 'likes' }}</text>
          </view>
        </view>

        <view class="time-row">
          <text class="time-text">{{ formatTime(item.$createdAt) }}</text>
        </view>
      </view>

      <view class="author-card">
        <view class="author-left" @tap="contactAuthor">
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
            <text class="author-label">{{ isZh ? '上传者 · 点击私信' : 'Uploader · Tap to chat' }}</text>
          </view>
        </view>
      </view>

      <view class="files-card">
        <view class="files-head">
          <Icon name="folder" :size="18" color="#4A90E2" />
          <text class="files-title">{{ isZh ? '文件列表' : 'Files' }} ({{ item.fileIds.length }})</text>
        </view>
        <view
          v-for="(fileId, idx) in item.fileIds"
          :key="fileId"
          class="file-row"
          @tap="downloadFile(fileId, item.fileNames[idx] || `file-${idx + 1}`)"
        >
          <view class="file-info">
            <Icon name="insert_drive_file" :size="18" color="#64748b" />
            <text class="file-name">{{ item.fileNames[idx] || `file-${idx + 1}` }}</text>
          </view>
          <view class="file-download-icon">
            <Icon name="download" :size="18" color="#4A90E2" />
          </view>
        </view>
      </view>

      <view class="bottom-actions">
        <view class="action-btn like-btn" :class="{ liked: hasLiked }" @tap="handleLike">
          <Icon name="thumb_up" :size="18" :color="hasLiked ? '#ffffff' : '#4A90E2'" />
          <text>{{ hasLiked ? (isZh ? '已点赞' : 'Liked') : (isZh ? '点赞' : 'Like') }}</text>
        </view>
        <view
          v-if="isOwner"
          class="action-btn delete-btn"
          @tap="confirmDelete"
        >
          <Icon name="delete" :size="18" color="#ef4444" />
          <text>{{ isZh ? '删除' : 'Delete' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { Query } from 'appwrite'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import studyMaterialsService from '@/services/study-materials'
import conversationsService from '@/services/conversations'
import type { StudyMaterial } from '@/types/study-material'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { redirectToLogin } from '@/utils/auth-guard'
import { tablesDB } from '@/utils/appwrite'
import { config, MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const itemId = ref('')
const item = ref<StudyMaterial | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const authorName = ref('')
const authorAvatar = ref('')
const hasLiked = ref(false)
const startingConversation = ref(false)

const pageTitle = computed(() => (isZh.value ? '资料详情' : 'Material Detail'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const retryText = computed(() => (isZh.value ? '重试' : 'Retry'))

const currentUserId = computed(() =>
  String(authStore.user?.$id || authStore.dbUser?.$id || '').trim()
)
const isOwner = computed(() =>
  Boolean(item.value && currentUserId.value && item.value.authorId === currentUserId.value)
)

const typeIconMap: Record<string, string> = {
  notes: 'description',
  past_exam: 'history_edu',
  courseware: 'slideshow',
  lab_report: 'science',
  other: 'folder'
}

const typeIcon = computed(() => typeIconMap[item.value?.materialType || ''] || 'folder')

const typeLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    notes: { zh: '笔记', en: 'Notes' },
    past_exam: { zh: '历年真题', en: 'Past Exam' },
    courseware: { zh: '课件', en: 'Courseware' },
    lab_report: { zh: '实验报告', en: 'Lab Report' },
    other: { zh: '其他', en: 'Other' }
  }
  const entry = map[item.value?.materialType || '']
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
      Query.limit(1)
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
    errorMessage.value = isZh.value ? '缺少资料 ID' : 'Missing material ID'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await studyMaterialsService.getMaterial(itemId.value)
    item.value = result
    await resolveAuthor(result.authorId)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errorMessage.value = isZh.value
      ? `加载失败：${msg || '请稍后重试'}`
      : `Failed: ${msg || 'retry later'}`
  } finally {
    loading.value = false
  }
}

const buildFileDownloadUrl = (fileId: string) => {
  const bucketId = 'avatars'
  const endpoint = config.endpoint.replace(/\/+$/, '')
  return `${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/download?project=${encodeURIComponent(config.projectId)}`
}

const downloadFile = (fileId: string, fileName: string) => {
  if (!item.value) return
  const url = buildFileDownloadUrl(fileId)

  studyMaterialsService.incrementDownloadCount(item.value.$id, item.value.downloadCount)
  item.value = { ...item.value, downloadCount: item.value.downloadCount + 1 }

  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fail: () => {
            uni.saveFile({
              tempFilePath: res.tempFilePath,
              success: () => {
                uni.showToast({
                  title: isZh.value ? '已保存' : 'Saved',
                  icon: 'success'
                })
              }
            })
          }
        })
      }
    },
    fail: () => {
      uni.showToast({
        title: isZh.value ? '下载失败' : 'Download failed',
        icon: 'none'
      })
    }
  })
  // #endif
}

const handleLike = () => {
  if (!item.value || hasLiked.value) return
  hasLiked.value = true
  studyMaterialsService.incrementLikeCount(item.value.$id, item.value.likeCount)
  item.value = { ...item.value, likeCount: item.value.likeCount + 1 }
}

const contactAuthor = async () => {
  if (!item.value?.authorId || startingConversation.value) return
  if (item.value.authorId === String(authStore.user?.$id || '').trim()) {
    uni.showToast({ title: isZh.value ? '这是你自己的资料' : 'This is your material', icon: 'none' })
    return
  }
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: isZh.value ? '请先登录' : 'Please login first', icon: 'none' })
    redirectToLogin()
    return
  }
  startingConversation.value = true
  try {
    const conversation = await conversationsService.findOrCreateDirectConversation(item.value.authorId)
    const title = encodeURIComponent(authorName.value || (isZh.value ? '上传者' : 'Uploader'))
    uni.navigateTo({
      url: `/pages/messages/chat?conversationId=${encodeURIComponent(conversation.$id)}&title=${title}`
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    uni.showToast({ title: msg || (isZh.value ? '发起私信失败' : 'Failed'), icon: 'none' })
  } finally {
    startingConversation.value = false
  }
}

const confirmDelete = () => {
  uni.showModal({
    title: isZh.value ? '确认删除' : 'Confirm Delete',
    content: isZh.value ? '删除后无法恢复，确认删除？' : 'This cannot be undone. Delete?',
    success: async (res) => {
      if (!res.confirm || !item.value) return
      try {
        await studyMaterialsService.deleteMaterial(item.value.$id)
        uni.showToast({ title: isZh.value ? '已删除' : 'Deleted', icon: 'success' })
        setTimeout(() => goBack(), 300)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        uni.showToast({
          title: msg || (isZh.value ? '删除失败' : 'Delete failed'),
          icon: 'none'
        })
      }
    }
  })
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/study/materials/index' })
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
.material-detail-page {
  min-height: 100vh;
  padding: 0 0 160rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f0f4fa;
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(74, 144, 226, 0.16);
  --topbar-bg: rgba(240, 244, 250, 0.9);
}

.theme-dark {
  --page-bg: #101827;
  --surface: rgba(15, 23, 42, 0.78);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #94a3af;
  --line: rgba(74, 144, 226, 0.3);
  --topbar-bg: rgba(16, 24, 39, 0.88);
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

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-top: 16rpx;
}

.info-card,
.author-card,
.files-card {
  margin: 0 24rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
}

.item-title {
  color: var(--text-main);
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.4;
  display: block;
}

.meta-row {
  margin-top: 16rpx;
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

  text {
    font-size: 22rpx;
    font-weight: 600;
  }
}

.meta-chip.subject {
  background: rgba(74, 144, 226, 0.14);

  text {
    color: #2563eb;
  }
}

.meta-chip.type {
  background: rgba(74, 144, 226, 0.08);

  text {
    color: #4A90E2;
  }
}

.item-desc {
  margin-top: 16rpx;
  color: var(--text-sub);
  font-size: 26rpx;
  line-height: 1.65;
  white-space: pre-wrap;
  display: block;
}

.tags-row {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.tag-chip {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(74, 144, 226, 0.08);

  text {
    color: #4A90E2;
    font-size: 20rpx;
    font-weight: 600;
  }
}

.stats-row {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6rpx;

  text {
    color: var(--text-soft);
    font-size: 22rpx;
  }
}

.time-row {
  margin-top: 14rpx;
}

.time-text {
  color: var(--text-soft);
  font-size: 22rpx;
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

.files-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 14rpx;
}

.files-title {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-top: 1px solid var(--line);

  &:active {
    opacity: 0.7;
  }
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  min-width: 0;
}

.file-name {
  color: var(--text-main);
  font-size: 26rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-download-icon {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(74, 144, 226, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
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

.like-btn {
  background: rgba(74, 144, 226, 0.14);
  border: 1px solid rgba(74, 144, 226, 0.2);

  text {
    color: #4A90E2;
  }
}

.like-btn.liked {
  background: linear-gradient(135deg, #4A90E2, #2563eb);
  border-color: transparent;

  text {
    color: #ffffff;
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
  border: 1px solid rgba(74, 144, 226, 0.36);
  padding: 10rpx 24rpx;
  background: rgba(74, 144, 226, 0.14);
}

.retry-text {
  color: #2563eb;
  font-size: 22rpx;
  font-weight: 600;
}
</style>
