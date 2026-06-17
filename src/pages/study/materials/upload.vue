<template>
  <view :class="['material-upload-page', themeClass]">
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
        <Icon name="school" :size="100" color="rgba(74, 144, 226, 0.22)" />
      </view>
    </view>

    <view class="form-card">
      <view class="field-block">
        <text class="field-title">{{ titleLabel }} *</text>
        <input
          v-model="draftTitle"
          class="field-input"
          :placeholder="titlePlaceholder"
          maxlength="200"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ subjectLabel }} *</text>
        <input
          v-model="draftSubject"
          class="field-input"
          :placeholder="subjectPlaceholder"
          maxlength="200"
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
        <text class="field-title">{{ typeLabel }} *</text>
        <view class="chip-row">
          <view
            v-for="opt in typeOptions"
            :key="opt.value"
            class="chip"
            :class="{ active: draftType === opt.value }"
            @tap="draftType = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <view class="field-head">
          <text class="field-title">{{ fileLabel }} *</text>
          <text class="field-tip">{{ fileCountLabel }}</text>
        </view>
        <view class="file-list">
          <view
            v-for="(file, index) in draftFiles"
            :key="`${file.name}-${index}`"
            class="file-item"
          >
            <view class="file-info">
              <Icon name="insert_drive_file" :size="18" color="#4A90E2" />
              <text class="file-name">{{ file.name }}</text>
            </view>
            <view class="file-remove" @tap="removeFile(index)">
              <Icon name="close" :size="14" color="#ef4444" />
            </view>
          </view>

          <view
            v-if="canAddFiles"
            class="file-add-btn"
            :class="{ disabled: submitting }"
            @tap="chooseFiles"
          >
            <Icon name="upload_file" :size="22" color="#4A90E2" />
            <text class="file-add-text">{{ addFileLabel }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">{{ tagsLabel }}</text>
        <input
          v-model="draftTags"
          class="field-input"
          :placeholder="tagsPlaceholder"
          maxlength="500"
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
import { ID } from 'appwrite'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import studyMaterialsService from '@/services/study-materials'
import type { MaterialType } from '@/types/study-material'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { requireAuth } from '@/utils/auth-guard'
import { storage } from '@/utils/appwrite'

interface DraftFile {
  name: string
  path: string
  file?: File
  size?: number
}

const MAX_FILES = 5

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const submitting = ref(false)
const draftTitle = ref('')
const draftSubject = ref('')
const draftDesc = ref('')
const draftType = ref<MaterialType>('notes')
const draftFiles = ref<DraftFile[]>([])
const draftTags = ref('')

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const pageTitle = computed(() => (isZh.value ? '上传资料' : 'Upload Material'))
const heroTitle = computed(() =>
  isZh.value ? '分享知识，共同进步' : 'Share knowledge, grow together',
)
const heroSubtitle = computed(() =>
  isZh.value ? '上传笔记、课件、真题等学习资料' : 'Upload notes, courseware, past exams and more',
)
const titleLabel = computed(() => (isZh.value ? '资料标题' : 'Title'))
const titlePlaceholder = computed(() =>
  isZh.value ? '例如：高等数学期末复习笔记' : 'e.g. Calculus Final Review Notes',
)
const subjectLabel = computed(() => (isZh.value ? '课程/科目' : 'Subject'))
const subjectPlaceholder = computed(() =>
  isZh.value ? '例如：高等数学' : 'e.g. Advanced Mathematics',
)
const descLabel = computed(() => (isZh.value ? '资料描述' : 'Description'))
const descPlaceholder = computed(() =>
  isZh.value ? '描述资料内容、适用范围等信息...' : 'Describe the content, scope, etc...',
)
const typeLabel = computed(() => (isZh.value ? '资料类型' : 'Type'))
const fileLabel = computed(() => (isZh.value ? '文件' : 'Files'))
const fileCountLabel = computed(() =>
  isZh.value
    ? `已选 ${draftFiles.value.length}/${MAX_FILES}`
    : `${draftFiles.value.length}/${MAX_FILES} selected`,
)
const addFileLabel = computed(() => (isZh.value ? '添加文件' : 'Add file'))
const tagsLabel = computed(() =>
  isZh.value ? '标签（选填，逗号分隔）' : 'Tags (optional, comma separated)',
)
const tagsPlaceholder = computed(() =>
  isZh.value ? '例如：期末,复习,重点' : 'e.g. final, review, key points',
)
const submitLabel = computed(() => (isZh.value ? '上传资料' : 'Upload'))
const publishingLabel = computed(() => (isZh.value ? '上传中...' : 'Uploading...'))
const canAddFiles = computed(() => draftFiles.value.length < MAX_FILES)

const typeOptions = computed(() => [
  { value: 'notes' as MaterialType, label: isZh.value ? '笔记' : 'Notes' },
  { value: 'past_exam' as MaterialType, label: isZh.value ? '历年真题' : 'Past Exam' },
  { value: 'courseware' as MaterialType, label: isZh.value ? '课件' : 'Courseware' },
  { value: 'lab_report' as MaterialType, label: isZh.value ? '实验报告' : 'Lab Report' },
  { value: 'other' as MaterialType, label: isZh.value ? '其他' : 'Other' },
])

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/study/materials/index' })
  }
}

const chooseFiles = async () => {
  if (submitting.value) return
  const remainCount = MAX_FILES - draftFiles.value.length
  if (remainCount <= 0) {
    uni.showToast({
      title: isZh.value ? `最多 ${MAX_FILES} 个文件` : `Max ${MAX_FILES} files`,
      icon: 'none',
    })
    return
  }

  try {
    // #ifdef MP-WEIXIN
    const wxResult: any = await new Promise((resolve, reject) => {
      ;(globalThis as any).wx.chooseMessageFile({
        count: remainCount,
        type: 'file',
        success: (res: unknown) => resolve(res),
        fail: reject,
      })
    })
    const tempFiles = Array.isArray(wxResult.tempFiles) ? wxResult.tempFiles : []
    const selected: DraftFile[] = tempFiles
      .map((f: any) => ({
        name: f.name || 'file',
        path: f.path || '',
        size: f.size,
      }))
      .filter((f: DraftFile) => f.path)
    if (selected.length) {
      draftFiles.value = [...draftFiles.value, ...selected].slice(0, MAX_FILES)
    }
    // #endif

    // #ifdef H5
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = remainCount > 1
    input.onchange = () => {
      const files = input.files
      if (!files) return
      const selected: DraftFile[] = []
      for (let i = 0; i < Math.min(files.length, remainCount); i++) {
        selected.push({
          name: files[i].name,
          path: URL.createObjectURL(files[i]),
          file: files[i],
          size: files[i].size,
        })
      }
      if (selected.length) {
        draftFiles.value = [...draftFiles.value, ...selected].slice(0, MAX_FILES)
      }
    }
    input.click()
    // #endif

    // #ifdef APP-PLUS
    const result: any = await new Promise((resolve, reject) => {
      ;(uni as any).chooseFile?.({
        count: remainCount,
        success: resolve,
        fail: reject,
      })
    })
    const appFiles = Array.isArray(result.tempFiles) ? result.tempFiles : []
    const appSelected: DraftFile[] = appFiles
      .map((f: any) => ({
        name: f.name || 'file',
        path: f.path || f.tempFilePath || '',
        size: f.size,
      }))
      .filter((f: DraftFile) => f.path)
    if (appSelected.length) {
      draftFiles.value = [...draftFiles.value, ...appSelected].slice(0, MAX_FILES)
    }
    // #endif
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (/cancel/i.test(msg)) return
    uni.showToast({
      title: isZh.value ? '选择文件失败' : 'Failed to choose files',
      icon: 'none',
    })
  }
}

const removeFile = (index: number) => {
  if (submitting.value) return
  draftFiles.value.splice(index, 1)
}

const uploadFiles = async (): Promise<{ ids: string[]; names: string[] }> => {
  const ids: string[] = []
  const names: string[] = []
  const bucketId = 'avatars'

  const runtimeStorage = storage as any
  if (!runtimeStorage || typeof runtimeStorage.createFile !== 'function') {
    throw new Error(isZh.value ? '当前环境不支持文件上传' : 'File upload not supported')
  }

  for (const draft of draftFiles.value) {
    let fileToUpload: File | undefined = draft.file

    if (!fileToUpload && typeof fetch !== 'undefined' && typeof File !== 'undefined') {
      const response = await fetch(draft.path)
      const blob = await response.blob()
      fileToUpload = new File([blob], draft.name, { type: blob.type || 'application/octet-stream' })
    }

    if (!fileToUpload) {
      throw new Error(isZh.value ? '无法处理文件' : 'Cannot process file')
    }

    const created = await runtimeStorage.createFile({
      bucketId,
      fileId: ID.unique(),
      file: fileToUpload,
    })
    const fileId = (created?.$id || created?.id || '').trim()
    if (!fileId) {
      throw new Error(isZh.value ? '上传失败：文件ID缺失' : 'Upload failed: missing file ID')
    }
    ids.push(fileId)
    names.push(draft.name)
  }

  return { ids, names }
}

const resetDraft = () => {
  draftTitle.value = ''
  draftSubject.value = ''
  draftDesc.value = ''
  draftType.value = 'notes'
  draftFiles.value = []
  draftTags.value = ''
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
    uni.showToast({ title: isZh.value ? '请输入资料标题' : 'Please enter title', icon: 'none' })
    return
  }

  const subject = draftSubject.value.trim()
  if (!subject) {
    uni.showToast({ title: isZh.value ? '请输入课程/科目' : 'Please enter subject', icon: 'none' })
    return
  }

  const description = draftDesc.value.trim()
  if (!description) {
    uni.showToast({
      title: isZh.value ? '请输入资料描述' : 'Please enter description',
      icon: 'none',
    })
    return
  }

  if (!draftFiles.value.length) {
    uni.showToast({
      title: isZh.value ? '请至少添加一个文件' : 'Please add at least one file',
      icon: 'none',
    })
    return
  }

  submitting.value = true
  try {
    const { ids, names } = await uploadFiles()
    const tags = draftTags.value
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)

    await studyMaterialsService.createMaterial({
      title,
      description,
      subject,
      materialType: draftType.value,
      fileIds: ids,
      fileNames: names,
      tags,
    })
    resetDraft()
    uni.showToast({ title: isZh.value ? '上传成功' : 'Uploaded', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/study/materials/index' }), 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: message || (isZh.value ? '上传失败' : 'Upload failed'),
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  if (!requireAuth('/pages/study/materials/upload')) return
  await authStore.refreshProfile()
})
</script>

<style scoped lang="scss">
.material-upload-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f0f4fa;
  --surface: #ffffff;
  --line: rgba(74, 144, 226, 0.2);
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(240, 244, 250, 0.9);
}

.theme-dark {
  --page-bg: #101827;
  --surface: rgba(15, 23, 42, 0.78);
  --line: rgba(74, 144, 226, 0.34);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #94a3af;
  --topbar-bg: rgba(16, 24, 39, 0.88);
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
  color: #1d4ed8;
  border-color: rgba(74, 144, 226, 0.36);
}

.file-list {
  margin-top: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 16rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  background: rgba(74, 144, 226, 0.04);
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
  font-size: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-remove {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 1px dashed rgba(74, 144, 226, 0.5);

  &:active {
    opacity: 0.7;
  }
}

.file-add-btn.disabled {
  opacity: 0.6;
}

.file-add-text {
  color: #2563eb;
  font-size: 24rpx;
  font-weight: 600;
}

.submit-row {
  margin-top: 24rpx;
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  border-radius: 16rpx;
  background: linear-gradient(135deg, #4a90e2, #2563eb);
  padding: 14rpx 36rpx;
  box-shadow: 0 8rpx 18rpx rgba(74, 144, 226, 0.3);
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
