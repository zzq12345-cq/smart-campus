<template>
  <view :class="['study-publish-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-content">
        <text class="hero-title">{{ heroTitle }}</text>
        <text class="hero-subtitle">{{ heroSubtitle }}</text>
      </view>
      <view class="hero-icon">
        <Icon name="school" :size="132" color="rgba(74, 144, 226, 0.24)" />
      </view>
    </view>

    <view class="composer-card">
      <view class="composer-header">
        <view class="composer-icon">
          <Icon name="edit_square" :size="20" color="#4A90E2" />
        </view>
        <view class="composer-title-wrap">
          <text class="label">{{ composerLabel }}</text>
          <text class="label-sub">{{ composerHint }}</text>
        </view>
      </view>

      <textarea
        v-model="draftContent"
        class="composer-input"
        :placeholder="composerPlaceholder"
        maxlength="800"
      />

      <view class="field-block">
        <text class="field-title">{{ topicTitle }}</text>
        <view class="chip-row">
          <view
            v-for="item in topicOptions"
            :key="item.value"
            class="chip"
            :class="{ active: draftTopic === item.value }"
            @tap="draftTopic = item.value"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <view class="field-head">
          <text class="field-title">{{ imageTitle }}</text>
          <text class="field-tip">{{ imageCountLabel }}</text>
        </view>
        <view class="draft-image-grid">
          <view
            v-for="(image, index) in draftImages"
            :key="`${image.localPath}-${index}`"
            class="draft-image-item"
            @tap="previewDraftImages(image.localPath)"
          >
            <image class="draft-image" :src="image.localPath" mode="aspectFill" lazy-load />
            <view v-if="image.uploading" class="draft-uploading-mask">
              <text class="draft-uploading-text">{{ uploadingLabel }}</text>
            </view>
            <view class="draft-remove-btn" @tap.stop="removeDraftImage(index)">
              <Icon name="close" :size="14" color="#ffffff" />
            </view>
          </view>

          <view
            v-if="canAddDraftImages"
            class="draft-image-item draft-add-item"
            :class="{ disabled: submitting }"
            @tap="chooseDraftImages"
          >
            <Icon name="add_photo_alternate" :size="22" color="#4A90E2" />
            <text class="draft-add-text">{{ addImageLabel }}</text>
          </view>
        </view>
      </view>

      <view class="composer-row">
        <view class="switch-wrap">
          <text class="switch-label">{{ anonymousLabel }}</text>
          <switch :checked="isAnonymous" color="#4A90E2" @change="onAnonymousSwitch" />
        </view>
        <view class="submit-btn" :class="{ disabled: submitting }" @tap="createPost">
          <text class="submit-text">{{ submitting ? publishingLabel : submitLabel }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { UniSwitchEvent } from '@/types/uni-events'
import postsService from '@/services/posts'
import { uploadPostImage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import { usePointsStore } from '@/stores/points'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { PostTopic } from '@/types/post'
import { requireAuth } from '@/utils/auth-guard'
import { invalidateCache } from '@/utils/posts-cache'

interface DraftImageAsset {
  localPath: string
  file?: File
  uploading?: boolean
}

interface ChooseImageTempFile {
  path?: string
  tempFilePath?: string
  file?: File
}

const MAX_DRAFT_IMAGES = 6
const STUDY_TOPICS = ['course_review', 'exam_info', 'learning_material', 'competition'] as const
type StudyTopic = (typeof STUDY_TOPICS)[number]

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()
const pointsStore = usePointsStore()

const submitting = ref(false)
const draftContent = ref('')
const draftImages = ref<DraftImageAsset[]>([])
const isAnonymous = ref(false)
const draftTopic = ref<StudyTopic>('course_review')

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const pageTitle = computed(() => (isZh.value ? '学习区发帖' : 'Post to Study'))
const heroTitle = computed(() => (isZh.value ? '分享学习经验和信息' : 'Share study insights'))
const heroSubtitle = computed(() =>
  isZh.value
    ? '课程评价、考试动态、学习资料，统一发布更高效'
    : 'Course review, exam updates, and resources in one place',
)
const composerLabel = computed(() =>
  isZh.value ? '把你的学习经验写给后来人' : 'Turn experience into useful notes',
)
const composerHint = computed(() =>
  isZh.value
    ? '描述清楚课程与时间范围，信息更有价值'
    : 'Add course and timeline context for better value',
)
const composerPlaceholder = computed(() =>
  isZh.value
    ? '例如：数据结构期中重点在图与树，附复习顺序建议...'
    : 'Example: Midterm focus is graph and tree, with review order tips...',
)
const topicTitle = computed(() => (isZh.value ? '帖子主题' : 'Topic'))
const imageTitle = computed(() => (isZh.value ? '图片' : 'Images'))
const imageCountLabel = computed(() =>
  isZh.value
    ? `已选 ${draftImages.value.length}/${MAX_DRAFT_IMAGES}`
    : `${draftImages.value.length}/${MAX_DRAFT_IMAGES} selected`,
)
const addImageLabel = computed(() => (isZh.value ? '添加图片' : 'Add image'))
const uploadingLabel = computed(() => (isZh.value ? '上传中...' : 'Uploading...'))
const anonymousLabel = computed(() => (isZh.value ? '匿名发布' : 'Post anonymously'))
const submitLabel = computed(() => (isZh.value ? '发布帖子' : 'Publish'))
const publishingLabel = computed(() => (isZh.value ? '发布中...' : 'Publishing...'))
const canAddDraftImages = computed(() => draftImages.value.length < MAX_DRAFT_IMAGES)

const topicOptions = computed(() => [
  { value: 'course_review' as StudyTopic, label: isZh.value ? '课程评价' : 'Course Review' },
  { value: 'exam_info' as StudyTopic, label: isZh.value ? '考试信息' : 'Exam Info' },
  {
    value: 'learning_material' as StudyTopic,
    label: isZh.value ? '学习资料' : 'Learning Materials',
  },
  { value: 'competition' as StudyTopic, label: isZh.value ? '竞赛资讯' : 'Competition' },
])

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error || '')
}

const isCancelError = (error: unknown) => /cancel/i.test(extractErrorMessage(error))

const normalizeDraftImage = (item: unknown) => {
  const source = item as ChooseImageTempFile
  const localPath = (source?.path || source?.tempFilePath || '').trim()
  if (!localPath) {
    return null
  }
  return {
    localPath,
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined,
  } as DraftImageAsset
}

const resetDraft = () => {
  draftContent.value = ''
  draftImages.value = []
  isAnonymous.value = false
  draftTopic.value = 'course_review'
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/study/index' })
  }
}

const onAnonymousSwitch = (event: UniSwitchEvent) => {
  isAnonymous.value = Boolean(event?.detail?.value)
}

const chooseDraftImages = async () => {
  if (submitting.value) {
    return
  }
  const remainCount = MAX_DRAFT_IMAGES - draftImages.value.length
  if (remainCount <= 0) {
    uni.showToast({
      title: isZh.value ? `最多 ${MAX_DRAFT_IMAGES} 张图片` : `Max ${MAX_DRAFT_IMAGES} images`,
      icon: 'none',
    })
    return
  }

  try {
    const result = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({
        count: remainCount,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject,
      })
    })

    const selected: DraftImageAsset[] = []
    const tempFiles = Array.isArray(result.tempFiles) ? result.tempFiles : []
    tempFiles.forEach((item) => {
      const normalized = normalizeDraftImage(item)
      if (normalized) {
        selected.push(normalized)
      }
    })

    if (!selected.length && Array.isArray(result.tempFilePaths)) {
      result.tempFilePaths.forEach((path) => {
        const localPath = String(path || '').trim()
        if (localPath) {
          selected.push({ localPath })
        }
      })
    }

    if (!selected.length) {
      return
    }
    draftImages.value = [...draftImages.value, ...selected].slice(0, MAX_DRAFT_IMAGES)
  } catch (error) {
    if (isCancelError(error)) {
      return
    }
    uni.showToast({
      title: isZh.value ? '选择图片失败' : 'Failed to choose images',
      icon: 'none',
    })
  }
}

const removeDraftImage = (index: number) => {
  if (submitting.value) {
    return
  }
  draftImages.value.splice(index, 1)
}

const previewDraftImages = (current: string) => {
  const urls = draftImages.value
    .map((item) => item.localPath)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (!urls.length) {
    return
  }
  uni.previewImage({
    urls,
    current,
  })
}

const uploadDraftImages = async () => {
  if (!draftImages.value.length) {
    return [] as string[]
  }
  const uploadedUrls: string[] = []
  for (let index = 0; index < draftImages.value.length; index += 1) {
    const asset = draftImages.value[index]
    draftImages.value[index] = {
      ...asset,
      uploading: true,
    }
    try {
      const url = await uploadPostImage({
        localPath: asset.localPath,
        file: asset.file,
      })
      uploadedUrls.push(url)
    } finally {
      const latest = draftImages.value[index]
      if (latest) {
        draftImages.value[index] = {
          ...latest,
          uploading: false,
        }
      }
    }
  }
  return uploadedUrls
}

const createPost = async () => {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none',
    })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }

  if (submitting.value) {
    return
  }

  const content = draftContent.value.trim()
  if (!content) {
    uni.showToast({
      title: isZh.value ? '请输入内容' : 'Please enter content',
      icon: 'none',
    })
    return
  }

  submitting.value = true
  try {
    const images = await uploadDraftImages()
    await postsService.createPost({
      content,
      section: 'study',
      topic: draftTopic.value as PostTopic,
      isAnonymous: isAnonymous.value,
      status: 'published',
      images,
    })
    invalidateCache('study-posts')
    const userId = authStore.dbUser?.$id
    if (userId) {
      await pointsStore.completeDailyTask(userId, 'post_create')
    }
    resetDraft()
    uni.showToast({
      title: isZh.value ? '发布成功' : 'Posted',
      icon: 'success',
    })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/study/index' })
    }, 160)
  } catch (error) {
    const message = extractErrorMessage(error)
    const hasDraftImages = draftImages.value.length > 0
    const isUploadRuntimeIssue =
      /Storage service is unavailable|cannot convert local image/i.test(message) && hasDraftImages
    uni.showToast({
      title: isUploadRuntimeIssue
        ? isZh.value
          ? '当前运行环境暂不支持发图'
          : 'Current runtime does not support image upload'
        : hasDraftImages
          ? isZh.value
            ? '图片上传或发布失败'
            : 'Image upload or post failed'
          : isZh.value
            ? '发布失败'
            : 'Post failed',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  if (!requireAuth('/pages/study/post-publish')) {
    return
  }
  await authStore.refreshProfile()
})
</script>

<style scoped lang="scss">
.study-publish-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --line: rgba(74, 144, 226, 0.2);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(246, 246, 248, 0.9);
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.78);
  --line: rgba(74, 144, 226, 0.32);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 28, 42, 0.88);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.hero-card {
  margin-top: 14rpx;
  border: 1px solid var(--line);
  border-radius: 26rpx;
  background: linear-gradient(130deg, rgba(74, 144, 226, 0.22), rgba(74, 144, 226, 0.08));
  padding: 30rpx 24rpx;
  position: relative;
  overflow: hidden;
}

.hero-content {
  width: 72%;
  position: relative;
  z-index: 2;
}

.hero-title {
  color: var(--text-main);
  font-size: 36rpx;
  line-height: 1.3;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 8rpx;
  color: var(--text-sub);
  font-size: 22rpx;
  line-height: 1.5;
}

.hero-icon {
  position: absolute;
  right: -12rpx;
  bottom: -14rpx;
}

.composer-card {
  margin-top: 18rpx;
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  padding: 24rpx;
}

.composer-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.composer-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 16rpx;
  background: rgba(74, 144, 226, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.composer-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.label {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.label-sub {
  color: var(--text-soft);
  font-size: 22rpx;
}

.composer-input {
  margin-top: 14rpx;
  width: 100%;
  min-height: 220rpx;
  color: var(--text-main);
  font-size: 26rpx;
}

.field-block {
  margin-top: 16rpx;
}

.field-title {
  color: var(--text-sub);
  font-size: 23rpx;
  font-weight: 600;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.field-tip {
  color: var(--text-soft);
  font-size: 20rpx;
}

.chip-row {
  margin-top: 10rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.chip {
  min-height: 52rpx;
  border: 1px solid var(--line);
  border-radius: 999rpx;
  padding: 0 18rpx;
  color: var(--text-sub);
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip.active {
  background: rgba(74, 144, 226, 0.18);
  color: #2f6fbc;
  border-color: rgba(74, 144, 226, 0.38);
}

.draft-image-grid {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.draft-image-item {
  position: relative;
  height: 168rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: rgba(74, 144, 226, 0.08);
}

.draft-image {
  width: 100%;
  height: 100%;
}

.draft-add-item {
  border: 1px dashed rgba(74, 144, 226, 0.52);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.draft-add-item.disabled {
  opacity: 0.6;
}

.draft-add-text {
  color: #2f6fbc;
  font-size: 22rpx;
  font-weight: 600;
}

.draft-remove-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
}

.draft-uploading-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
}

.draft-uploading-text {
  color: #f8fafc;
  font-size: 20rpx;
}

.composer-row {
  margin-top: 18rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.switch-label {
  color: var(--text-sub);
  font-size: 24rpx;
}

.submit-btn {
  border-radius: 16rpx;
  background: #4a90e2;
  padding: 12rpx 28rpx;
  box-shadow: 0 8rpx 18rpx rgba(74, 144, 226, 0.3);
}

.submit-btn.disabled {
  opacity: 0.72;
  box-shadow: none;
}

.submit-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
