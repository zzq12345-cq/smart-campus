<template>
  <view :class="['market-publish-page', themeClass]">
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
        <Icon name="storefront" :size="100" color="rgba(244, 157, 37, 0.22)" />
      </view>
    </view>

    <view class="form-card">
      <view class="field-block">
        <text class="field-title">{{ titleLabel }} *</text>
        <input
          v-model="draftTitle"
          class="field-input"
          :placeholder="titlePlaceholder"
          maxlength="100"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ descLabel }} *</text>
        <textarea
          v-model="draftDesc"
          class="field-textarea"
          :placeholder="descPlaceholder"
          maxlength="2000"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ priceLabel }} *</text>
        <view class="price-input-wrap">
          <text class="price-prefix">¥</text>
          <input
            v-model="draftPrice"
            class="price-input"
            type="digit"
            placeholder="0.00"
          />
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">{{ conditionLabel }} *</text>
        <view class="chip-row">
          <view
            v-for="opt in conditionOptions"
            :key="opt.value"
            class="chip"
            :class="{ active: draftCondition === opt.value }"
            @tap="draftCondition = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">{{ categoryLabel }} *</text>
        <view class="chip-row">
          <view
            v-for="opt in categoryOptions"
            :key="opt.value"
            class="chip"
            :class="{ active: draftCategory === opt.value }"
            @tap="draftCategory = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <view class="field-head">
          <text class="field-title">{{ imageLabel }}</text>
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
            <Icon name="add_photo_alternate" :size="22" color="#f49d25" />
            <text class="draft-add-text">{{ addImageLabel }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">{{ contactLabel }}</text>
        <textarea
          v-model="draftContactNote"
          class="field-textarea small"
          :placeholder="contactPlaceholder"
          maxlength="200"
        />
      </view>

      <view class="submit-row">
        <view class="submit-btn" :class="{ disabled: submitting }" @tap="handleSubmit">
          <text class="submit-text">{{ submitting ? publishingLabel : submitLabel }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import marketItemsService from '@/services/market-items'
import { uploadPostImage } from '@/services/storage'
import type { MarketItemCategory, MarketItemCondition } from '@/types/market-item'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { requireAuth } from '@/utils/auth-guard'

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

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const submitting = ref(false)
const draftTitle = ref('')
const draftDesc = ref('')
const draftPrice = ref('')
const draftCondition = ref<MarketItemCondition>('like_new')
const draftCategory = ref<MarketItemCategory>('digital')
const draftImages = ref<DraftImageAsset[]>([])
const draftContactNote = ref('')

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const pageTitle = computed(() => (isZh.value ? '发布商品' : 'Publish Item'))
const heroTitle = computed(() => (isZh.value ? '发布闲置，让物品流转' : 'List your item'))
const heroSubtitle = computed(() => (isZh.value ? '图文清晰、价格合理，更容易出手' : 'Clear photos and fair pricing sell faster'))
const titleLabel = computed(() => (isZh.value ? '商品名称' : 'Title'))
const titlePlaceholder = computed(() => (isZh.value ? '例如：iPad Air 5 64G 国行' : 'e.g. iPad Air 5 64G'))
const descLabel = computed(() => (isZh.value ? '商品描述' : 'Description'))
const descPlaceholder = computed(() => (isZh.value ? '描述商品成色、使用时长、配件等信息...' : 'Describe condition, usage period, accessories...'))
const priceLabel = computed(() => (isZh.value ? '价格' : 'Price'))
const conditionLabel = computed(() => (isZh.value ? '成色' : 'Condition'))
const categoryLabel = computed(() => (isZh.value ? '分类' : 'Category'))
const imageLabel = computed(() => (isZh.value ? '图片' : 'Images'))
const imageCountLabel = computed(() =>
  isZh.value
    ? `已选 ${draftImages.value.length}/${MAX_DRAFT_IMAGES}`
    : `${draftImages.value.length}/${MAX_DRAFT_IMAGES} selected`
)
const addImageLabel = computed(() => (isZh.value ? '添加图片' : 'Add image'))
const uploadingLabel = computed(() => (isZh.value ? '上传中...' : 'Uploading...'))
const contactLabel = computed(() => (isZh.value ? '留言（选填）' : 'Note (optional)'))
const contactPlaceholder = computed(() => (isZh.value ? '例如：可小刀、只限校内面交...' : 'e.g. Negotiable, campus meetup only...'))
const submitLabel = computed(() => (isZh.value ? '发布商品' : 'Publish'))
const publishingLabel = computed(() => (isZh.value ? '发布中...' : 'Publishing...'))
const canAddDraftImages = computed(() => draftImages.value.length < MAX_DRAFT_IMAGES)

const conditionOptions = computed(() => [
  { value: 'brand_new' as MarketItemCondition, label: isZh.value ? '全新' : 'New' },
  { value: 'like_new' as MarketItemCondition, label: isZh.value ? '九成新' : 'Like New' },
  { value: 'good' as MarketItemCondition, label: isZh.value ? '良好' : 'Good' },
  { value: 'fair' as MarketItemCondition, label: isZh.value ? '有痕迹' : 'Fair' }
])

const categoryOptions = computed(() => [
  { value: 'digital' as MarketItemCategory, label: isZh.value ? '数码' : 'Digital' },
  { value: 'textbook' as MarketItemCategory, label: isZh.value ? '教材' : 'Textbook' },
  { value: 'daily' as MarketItemCategory, label: isZh.value ? '生活' : 'Daily' },
  { value: 'clothing' as MarketItemCategory, label: isZh.value ? '服装' : 'Clothing' },
  { value: 'sports' as MarketItemCategory, label: isZh.value ? '运动' : 'Sports' },
  { value: 'other' as MarketItemCategory, label: isZh.value ? '其他' : 'Other' }
])

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error || '')
}

const isCancelError = (error: unknown) => /cancel/i.test(extractErrorMessage(error))

const normalizeDraftImage = (item: unknown) => {
  const source = item as ChooseImageTempFile
  const localPath = (source?.path || source?.tempFilePath || '').trim()
  if (!localPath) return null
  return {
    localPath,
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined
  } as DraftImageAsset
}

const resetDraft = () => {
  draftTitle.value = ''
  draftDesc.value = ''
  draftPrice.value = ''
  draftCondition.value = 'like_new'
  draftCategory.value = 'digital'
  draftImages.value = []
  draftContactNote.value = ''
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/life/market/index' })
  }
}

const chooseDraftImages = async () => {
  if (submitting.value) return
  const remainCount = MAX_DRAFT_IMAGES - draftImages.value.length
  if (remainCount <= 0) {
    uni.showToast({
      title: isZh.value ? `最多 ${MAX_DRAFT_IMAGES} 张图片` : `Max ${MAX_DRAFT_IMAGES} images`,
      icon: 'none'
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
        fail: reject
      })
    })

    const selected: DraftImageAsset[] = []
    const tempFiles = Array.isArray(result.tempFiles) ? result.tempFiles : []
    tempFiles.forEach((f) => {
      const normalized = normalizeDraftImage(f)
      if (normalized) selected.push(normalized)
    })

    if (!selected.length && Array.isArray(result.tempFilePaths)) {
      result.tempFilePaths.forEach((path) => {
        const localPath = String(path || '').trim()
        if (localPath) selected.push({ localPath })
      })
    }

    if (!selected.length) return
    draftImages.value = [...draftImages.value, ...selected].slice(0, MAX_DRAFT_IMAGES)
  } catch (error) {
    if (isCancelError(error)) return
    uni.showToast({
      title: isZh.value ? '选择图片失败' : 'Failed to choose images',
      icon: 'none'
    })
  }
}

const removeDraftImage = (index: number) => {
  if (submitting.value) return
  draftImages.value.splice(index, 1)
}

const previewDraftImages = (current: string) => {
  const urls = draftImages.value
    .map((item) => item.localPath)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  if (!urls.length) return
  uni.previewImage({ urls, current })
}

const uploadDraftImages = async () => {
  if (!draftImages.value.length) return [] as string[]
  const uploadedUrls: string[] = []
  for (let index = 0; index < draftImages.value.length; index += 1) {
    const asset = draftImages.value[index]
    draftImages.value[index] = { ...asset, uploading: true }
    try {
      const url = await uploadPostImage({
        localPath: asset.localPath,
        file: asset.file
      })
      uploadedUrls.push(url)
    } finally {
      const latest = draftImages.value[index]
      if (latest) {
        draftImages.value[index] = { ...latest, uploading: false }
      }
    }
  }
  return uploadedUrls
}

const handleSubmit = async () => {
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: isZh.value ? '请先登录' : 'Please login first', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  if (submitting.value) return

  const title = draftTitle.value.trim()
  if (!title) {
    uni.showToast({ title: isZh.value ? '请输入商品名称' : 'Please enter title', icon: 'none' })
    return
  }

  const description = draftDesc.value.trim()
  if (!description) {
    uni.showToast({ title: isZh.value ? '请输入商品描述' : 'Please enter description', icon: 'none' })
    return
  }

  const price = parseFloat(draftPrice.value)
  if (!draftPrice.value.trim() || Number.isNaN(price) || price < 0) {
    uni.showToast({ title: isZh.value ? '请输入有效价格' : 'Please enter a valid price', icon: 'none' })
    return
  }

  if (!draftImages.value.length) {
    uni.showToast({ title: isZh.value ? '请至少上传一张图片' : 'Please upload at least one image', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const images = await uploadDraftImages()
    await marketItemsService.createItem({
      title,
      description,
      price,
      condition: draftCondition.value,
      category: draftCategory.value,
      images,
      contactNote: draftContactNote.value.trim()
    })
    resetDraft()
    uni.showToast({ title: isZh.value ? '发布成功' : 'Published', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/life/market/index' }), 200)
  } catch (error) {
    const message = extractErrorMessage(error)
    const hasDraftImages = draftImages.value.length > 0
    const isUploadRuntimeIssue =
      /Storage service is unavailable|cannot convert local image/i.test(message) && hasDraftImages
    uni.showToast({
      title: isUploadRuntimeIssue
        ? isZh.value ? '当前环境暂不支持发图' : 'Image upload not supported'
        : isZh.value ? '发布失败' : 'Publish failed',
      icon: 'none'
    })
  } finally {
    submitting.value = false
  }
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  if (!requireAuth('/pages/life/market/publish')) return
  await authStore.refreshProfile()
})
</script>

<style scoped lang="scss">
.market-publish-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f7f5;
  --surface: #ffffff;
  --line: rgba(244, 157, 37, 0.2);
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(248, 247, 245, 0.9);
}

.theme-dark {
  --page-bg: #221a10;
  --surface: rgba(30, 23, 15, 0.78);
  --line: rgba(244, 157, 37, 0.34);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #94a3af;
  --topbar-bg: rgba(34, 26, 16, 0.88);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
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
  background: linear-gradient(130deg, rgba(244, 157, 37, 0.22), rgba(244, 157, 37, 0.08));
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

.form-card {
  margin-top: 18rpx;
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  padding: 24rpx;
}

.field-block {
  margin-top: 16rpx;

  &:first-child {
    margin-top: 0;
  }
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

.field-input {
  margin-top: 10rpx;
  width: 100%;
  height: 72rpx;
  border: 1px solid var(--line);
  border-radius: 16rpx;
  padding: 0 18rpx;
  color: var(--text-main);
  font-size: 26rpx;
  box-sizing: border-box;
}

.field-textarea {
  margin-top: 10rpx;
  width: 100%;
  min-height: 200rpx;
  border: 1px solid var(--line);
  border-radius: 16rpx;
  padding: 14rpx 18rpx;
  color: var(--text-main);
  font-size: 26rpx;
  box-sizing: border-box;
}

.field-textarea.small {
  min-height: 120rpx;
}

.price-input-wrap {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 16rpx;
  padding: 0 18rpx;
  height: 72rpx;
}

.price-prefix {
  color: #ea580c;
  font-size: 32rpx;
  font-weight: 700;
  margin-right: 8rpx;
}

.price-input {
  flex: 1;
  height: 100%;
  color: var(--text-main);
  font-size: 28rpx;
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
  background: rgba(244, 157, 37, 0.18);
  color: #b45309;
  border-color: rgba(244, 157, 37, 0.36);
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
  background: rgba(244, 157, 37, 0.08);
}

.draft-image {
  width: 100%;
  height: 100%;
}

.draft-add-item {
  border: 1px dashed rgba(244, 157, 37, 0.5);
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
  color: #b45309;
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

.submit-row {
  margin-top: 24rpx;
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  border-radius: 16rpx;
  background: linear-gradient(135deg, #f49d25, #ea580c);
  padding: 14rpx 36rpx;
  box-shadow: 0 8rpx 18rpx rgba(244, 157, 37, 0.3);
}

.submit-btn.disabled {
  opacity: 0.72;
  box-shadow: none;
}

.submit-text {
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}
</style>
