<template>
  <view :class="['detail-page', themeClass]">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="title">{{ isZh ? '教案详情' : 'Plan Detail' }}</text>
      <view class="icon-btn" @tap="showMoreActions = true">
        <Icon name="more_vert" :size="20" :color="iconColor" />
      </view>
    </view>

    <scroll-view v-if="plan" class="detail-scroll" scroll-y>
      <!-- 头部信息卡 -->
      <view class="hero-section" :style="{ background: heroGradient }">
        <view class="hero-meta">
          <view class="badge" :style="{ background: subjectColorLight, color: subjectColor }">
            <text>{{ subjectLabel }}</text>
          </view>
          <view :class="['status-badge', `status-${plan.status}`]">
            <text>{{ statusLabel }}</text>
          </view>
        </view>
        <text class="hero-title">{{ plan.title }}</text>
        <view class="hero-info-row">
          <view v-if="plan.grade" class="info-chip">
            <Icon name="school" :size="14" color="#ffffff99" />
            <text>{{ plan.grade }}</text>
          </view>
          <view class="info-chip">
            <Icon name="schedule" :size="14" color="#ffffff99" />
            <text>{{ plan.duration || 45 }}{{ isZh ? '分钟' : 'min' }}</text>
          </view>
          <view v-if="plan.teachingMethod" class="info-chip">
            <Icon name="psychology" :size="14" color="#ffffff99" />
            <text>{{ plan.teachingMethod }}</text>
          </view>
        </view>
        <text class="hero-date">{{ formatFullDate(plan.$updatedAt) }}</text>
      </view>

      <!-- 教学目标 -->
      <view v-if="plan.objectives" class="section-card">
        <view class="section-header">
          <Icon name="flag" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '教学目标' : 'Objectives' }}</text>
        </view>
        <MarkdownText :content="plan.objectives" />
      </view>

      <!-- 教学内容 -->
      <view v-if="plan.content" class="section-card">
        <view class="section-header">
          <Icon name="menu_book" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '教学内容' : 'Content' }}</text>
        </view>
        <MarkdownText :content="plan.content" />
      </view>

      <!-- 教学重难点 -->
      <view v-if="plan.keyPoints" class="section-card">
        <view class="section-header">
          <Icon name="star" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '教学重难点' : 'Key Points' }}</text>
        </view>
        <MarkdownText :content="plan.keyPoints" />
      </view>

      <!-- 课后作业 -->
      <view v-if="plan.homework" class="section-card">
        <view class="section-header">
          <Icon name="assignment" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '课后作业' : 'Homework' }}</text>
        </view>
        <MarkdownText :content="plan.homework" />
      </view>

      <!-- 教学反思 -->
      <view v-if="plan.reflection" class="section-card">
        <view class="section-header">
          <Icon name="lightbulb" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '教学反思' : 'Reflection' }}</text>
        </view>
        <MarkdownText :content="plan.reflection" />
      </view>

      <!-- 备注 -->
      <view v-if="plan.notes" class="section-card">
        <view class="section-header">
          <Icon name="sticky_note_2" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '备注' : 'Notes' }}</text>
        </view>
        <MarkdownText :content="plan.notes" />
      </view>

      <view style="height: 160rpx" />
    </scroll-view>

    <!-- 加载中 -->
    <view v-else class="loading-state">
      <text class="loading-text">{{ isZh ? '加载中...' : 'Loading...' }}</text>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="plan" class="bottom-bar">
      <view class="action-btn outline" @tap="exportAsFile">
        <Icon name="download" :size="18" :color="subjectColor" />
        <text class="action-text" :style="{ color: subjectColor }">{{
          isZh ? '导出' : 'Export'
        }}</text>
      </view>
      <view class="action-btn outline" @tap="copyFullText">
        <Icon name="content_copy" :size="18" :color="subjectColor" />
        <text class="action-text" :style="{ color: subjectColor }">{{
          isZh ? '复制' : 'Copy'
        }}</text>
      </view>
      <view class="action-btn primary" :style="{ background: subjectColor }" @tap="goEdit">
        <Icon name="edit" :size="18" color="#ffffff" />
        <text class="action-text" style="color: #ffffff">{{ isZh ? '编辑' : 'Edit' }}</text>
      </view>
    </view>

    <!-- 更多操作弹窗 -->
    <view v-if="showMoreActions" class="action-mask" @tap="showMoreActions = false">
      <view class="action-sheet" @tap.stop>
        <view v-if="plan?.status === 'draft'" class="action-item" @tap="handlePublish">
          <Icon name="publish" :size="20" color="#10b981" />
          <text style="color: #10b981">{{ isZh ? '发布教案' : 'Publish' }}</text>
        </view>
        <view v-if="plan?.status === 'published'" class="action-item" @tap="handleArchive">
          <Icon name="archive" :size="20" color="#f59e0b" />
          <text style="color: #f59e0b">{{ isZh ? '归档教案' : 'Archive' }}</text>
        </view>
        <view class="action-item" @tap="handleDuplicate">
          <Icon name="content_copy" :size="20" color="#3b82f6" />
          <text style="color: #3b82f6">{{ isZh ? '复制为新教案' : 'Duplicate' }}</text>
        </view>
        <view class="action-item" @tap="handleDelete">
          <Icon name="delete" :size="20" color="#ef4444" />
          <text style="color: #ef4444">{{ isZh ? '删除教案' : 'Delete' }}</text>
        </view>
        <view class="action-item cancel" @tap="showMoreActions = false">
          <text>{{ isZh ? '取消' : 'Cancel' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { getSubjectConfig, SUBJECT_LIST } from '@/teacher/types/subjects'
import lessonPlansService from '@/teacher/services/lesson-plans'
import type { LessonPlan } from '@/teacher/types/lesson-plan'
import MarkdownText from '@/components/common/MarkdownText.vue'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const currentSubject = computed(() => {
  const sub = plan.value?.subject || authStore.teacherSubject
  return getSubjectConfig(sub) || SUBJECT_LIST[3]
})
const subjectColor = computed(() => currentSubject.value.color)
const subjectColorLight = computed(() => currentSubject.value.colorLight)
const subjectLabel = computed(() =>
  isZh.value ? currentSubject.value.name : currentSubject.value.nameEn,
)
const heroGradient = computed(() => currentSubject.value.gradient)

const plan = ref<LessonPlan | null>(null)
const planId = ref('')
const showMoreActions = ref(false)

const statusLabel = computed(() => {
  if (!plan.value) return ''
  const s = plan.value.status
  if (isZh.value) return s === 'published' ? '已发布' : s === 'archived' ? '已归档' : '草稿'
  return s === 'published' ? 'Published' : s === 'archived' ? 'Archived' : 'Draft'
})

function formatFullDate(raw?: string) {
  if (!raw) return '--'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadPlan(id: string) {
  try {
    plan.value = await lessonPlansService.getLessonPlan(id)
  } catch (e) {
    console.error('Load plan failed:', e)
    uni.showToast({ title: isZh.value ? '加载失败' : 'Load failed', icon: 'none' })
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/teaching/index' })
  }
}

function goEdit() {
  uni.navigateTo({ url: `/pages/teaching/lesson-plan-edit?id=${encodeURIComponent(planId.value)}` })
}

function copyFullText() {
  if (!plan.value) return
  const p = plan.value
  const sections = [
    `【课题名称】${p.title}`,
    p.grade ? `【年级】${p.grade}` : '',
    `【科目】${subjectLabel.value}`,
    `【课时】${p.duration || 45}分钟`,
    p.teachingMethod ? `【教学方法】${p.teachingMethod}` : '',
    p.objectives ? `\n【教学目标】\n${p.objectives}` : '',
    p.content ? `\n【教学内容】\n${p.content}` : '',
    p.keyPoints ? `\n【教学重难点】\n${p.keyPoints}` : '',
    p.homework ? `\n【课后作业】\n${p.homework}` : '',
    p.reflection ? `\n【教学反思】\n${p.reflection}` : '',
    p.notes ? `\n【备注】\n${p.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  uni.setClipboardData({
    data: sections,
    success: () => uni.showToast({ title: isZh.value ? '已复制全文' : 'Copied', icon: 'success' }),
  })
}

/** 通用文件下载（H5 使用浏览器下载，小程序端降级为复制到剪贴板） */
function triggerDownload(content: string, filename: string, mimeType: string) {
  // #ifdef H5
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
    uni.showToast({ title: isZh.value ? '已导出' : 'Exported', icon: 'success' })
  } catch (e) {
    console.error('Export failed:', e)
    uni.showToast({ title: isZh.value ? '导出失败，请复制后粘贴' : 'Export failed', icon: 'none' })
  }
  // #endif
  // #ifndef H5
  // 小程序端无 Blob/URL，降级为复制内容到剪贴板
  uni.setClipboardData({
    data: content,
    success: () =>
      uni.showToast({
        title: isZh.value ? '内容已复制，可粘贴保存' : 'Content copied',
        icon: 'success',
      }),
    fail: () => uni.showToast({ title: isZh.value ? '导出失败' : 'Export failed', icon: 'none' }),
  })
  // #endif
}

/** 导出为 HTML 文件（手机和电脑都能下载，WPS/Word 可打开） */
function exportAsFile() {
  if (!plan.value) return
  const p = plan.value

  const sectionHtml = (title: string, text: string) =>
    text
      ? `<h2 style="color:#c00000;border-bottom:2px solid #c00000;padding-bottom:6px;">${title}</h2><div style="line-height:1.8;white-space:pre-wrap;">${text.replace(/\n/g, '<br>')}</div>`
      : ''

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${p.title}</title>
<style>
body{font-family:-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.8;}
h1{font-size:24px;color:#c00000;margin-bottom:8px;}
.meta{color:#666;font-size:14px;margin-bottom:24px;}
.meta span{margin-right:16px;}
h2{font-size:18px;margin-top:28px;}
</style></head><body>
<h1>${p.title}</h1>
<div class="meta">
<span>📚 ${subjectLabel.value}</span>
${p.grade ? `<span>🎓 ${p.grade}</span>` : ''}
<span>⏱ ${p.duration || 45}${isZh.value ? '分钟' : 'min'}</span>
${p.teachingMethod ? `<span>📋 ${p.teachingMethod}</span>` : ''}
</div>
${sectionHtml(isZh.value ? '教学目标' : 'Objectives', p.objectives)}
${sectionHtml(isZh.value ? '教学内容' : 'Content', p.content)}
${sectionHtml(isZh.value ? '教学重难点' : 'Key Points', p.keyPoints)}
${sectionHtml(isZh.value ? '课后作业' : 'Homework', p.homework)}
${sectionHtml(isZh.value ? '教学反思' : 'Reflection', p.reflection)}
${sectionHtml(isZh.value ? '备注' : 'Notes', p.notes)}
</body></html>`

  triggerDownload(html, `${p.title}.html`, 'text/html')
}

async function handlePublish() {
  showMoreActions.value = false
  try {
    await lessonPlansService.publishLessonPlan(planId.value)
    plan.value!.status = 'published'
    uni.showToast({ title: isZh.value ? '已发布' : 'Published', icon: 'success' })
  } catch {
    uni.showToast({ title: isZh.value ? '操作失败' : 'Failed', icon: 'none' })
  }
}

async function handleArchive() {
  showMoreActions.value = false
  try {
    await lessonPlansService.archiveLessonPlan(planId.value)
    plan.value!.status = 'archived'
    uni.showToast({ title: isZh.value ? '已归档' : 'Archived', icon: 'success' })
  } catch {
    uni.showToast({ title: isZh.value ? '操作失败' : 'Failed', icon: 'none' })
  }
}

async function handleDuplicate() {
  showMoreActions.value = false
  try {
    const dup = await lessonPlansService.duplicateLessonPlan(planId.value)
    uni.showToast({ title: isZh.value ? '已复制' : 'Duplicated', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({
        url: `/pages/teaching/lesson-plan-detail?id=${encodeURIComponent(dup.$id)}`,
      })
    }, 600)
  } catch {
    uni.showToast({ title: isZh.value ? '操作失败' : 'Failed', icon: 'none' })
  }
}

function handleDelete() {
  showMoreActions.value = false
  uni.showModal({
    title: isZh.value ? '确认删除' : 'Confirm Delete',
    content: isZh.value ? '删除后不可恢复，确定删除？' : 'This cannot be undone. Delete?',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await lessonPlansService.deleteLessonPlan(planId.value)
        uni.showToast({ title: isZh.value ? '已删除' : 'Deleted', icon: 'success' })
        setTimeout(() => goBack(), 600)
      } catch {
        uni.showToast({ title: isZh.value ? '删除失败' : 'Delete failed', icon: 'none' })
      }
    },
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> } | undefined
  const id = currentPage?.options?.id
  if (id) {
    planId.value = id
    loadPlan(id)
  }
})
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f6f6;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.12);
}

.theme-dark {
  --page-bg: #1a1315;
  --surface: rgba(26, 19, 21, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.24);
}

.top-bar {
  padding: 0 24rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(14px);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;

  .title {
    color: var(--text-main);
    font-size: 30rpx;
    font-weight: 700;
  }

  .icon-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    &:active {
      opacity: 0.7;
    }
  }
}

.detail-scroll {
  flex: 1;
  padding: 0 24rpx;
}

// ===== Hero =====
.hero-section {
  margin-top: 16rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.hero-meta {
  display: flex;
  gap: 10rpx;
  margin-bottom: 16rpx;
}

.badge {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  text {
    font-size: 22rpx;
    font-weight: 600;
  }
}

.status-badge {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  text {
    font-size: 20rpx;
    font-weight: 500;
  }

  &.status-draft {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }
  &.status-published {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }
  &.status-archived {
    background: rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
  }
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.3;
  margin-bottom: 16rpx;
}

.hero-info-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-bottom: 12rpx;
}

.info-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.15);
  text {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.85);
  }
}

.hero-date {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
}

// ===== 内容区 =====
.section-card {
  margin-top: 20rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: var(--surface);
  border: 1px solid var(--line);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
  padding-bottom: 14rpx;
  border-bottom: 1px solid var(--line);
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

// ===== 加载 =====
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 28rpx;
  color: var(--text-soft);
}

// ===== 底部操作 =====
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom, 0px));
  display: flex;
  gap: 16rpx;
  background: var(--surface);
  border-top: 1px solid var(--line);
  backdrop-filter: blur(14px);
}

.action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  transition: all 0.15s ease;
  &:active {
    transform: scale(0.97);
  }

  &.outline {
    background: transparent;
    border: 1px solid var(--line);
  }
}

.action-text {
  font-size: 28rpx;
  font-weight: 600;
}

// ===== 更多操作弹窗 =====
.action-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.action-sheet {
  width: 100%;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  border-radius: 28rpx 28rpx 0 0;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 16rpx;
  border-radius: 16rpx;
  &:active {
    opacity: 0.7;
  }

  text {
    font-size: 28rpx;
    font-weight: 500;
    color: var(--text-main);
  }

  &.cancel {
    justify-content: center;
    margin-top: 8rpx;
    border-top: 1px solid var(--line);
    text {
      color: var(--text-soft);
    }
  }
}
</style>
