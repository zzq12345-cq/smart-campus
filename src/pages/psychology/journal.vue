<template>
  <view :class="['journal-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="handleCommonAction">
          <Icon name="insights" :size="20" :color="iconColor" />
        </view>
      </view>
    </view>

    <view class="insight-card">
      <view class="stat-item">
        <text class="stat-value">{{ journalStats.total }}</text>
        <text class="stat-label">{{ totalLabel }}</text>
      </view>
      <view class="stat-item bordered">
        <text class="stat-value">{{ journalStats.riskCount }}</text>
        <text class="stat-label">{{ riskCountLabel }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-value small">{{ journalStats.latestDate }}</text>
        <text class="stat-label">{{ latestLabel }}</text>
      </view>
    </view>

    <view class="composer-card">
      <view class="composer-header">
        <view class="composer-icon">
          <Icon name="edit_note" :size="20" color="#886fde" />
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
        maxlength="1000"
      />

      <view class="field-block">
        <text class="field-title">{{ moodTitle }}</text>
        <view class="chip-row">
          <view
            v-for="item in moodOptions"
            :key="item.value"
            class="chip mood-chip"
            :class="{ active: draftMood === item.value }"
            @tap="draftMood = item.value"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">{{ tagTitle }}</text>
        <view class="chip-row">
          <view
            v-for="item in tagOptions"
            :key="item.value"
            class="chip tag-chip"
            :class="{ active: draftTags.includes(item.value) }"
            @tap="toggleDraftTag(item.value)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="composer-row">
        <view class="switch-wrap">
          <text class="switch-label">{{ privateLabel }}</text>
          <switch :checked="draftIsPrivate" color="#886fde" @change="onPrivateSwitch" />
        </view>
        <view class="submit-btn" @tap="createJournal">
          <text class="submit-text">{{ submitLabel }}</text>
        </view>
      </view>
    </view>

    <view class="list-title-row">
      <text class="list-title">{{ listTitle }}</text>
      <text class="list-count">{{ journals.length }}{{ countSuffix }}</text>
    </view>

    <view class="journal-list">
      <view v-if="loading && !journals.length" class="state-card">
        <text class="state-text">{{ loadingText }}</text>
      </view>
      <view v-else-if="!journals.length" class="state-card">
        <text class="state-text">{{ emptyText }}</text>
      </view>

      <view v-for="item in journals" :key="item.$id" class="journal-card">
        <view class="card-header">
          <view :class="['mood-pill', moodClass(item.mood ?? 'calm')]">
            <Icon name="mood" :size="14" color="#ffffff" />
            <text>{{ moodLabel(item.mood ?? 'calm', isZh) }}</text>
          </view>
          <text class="time">{{ formatTime(item.$createdAt) }}</text>
        </view>

        <view class="card-tags">
          <view class="meta-chip risk" :class="riskClass(Number(item.riskLevel ?? 1))">
            {{ riskLabel(Number(item.riskLevel ?? 1), isZh) }}
          </view>
          <view v-if="item.isPrivate" class="meta-chip private">{{ privateBadge }}</view>
          <view v-for="tag in item.tags || []" :key="`tag-${item.$id}-${tag}`" class="meta-chip tag">
            {{ formatTag(tag) }}
          </view>
        </view>

        <text class="content">{{ item.content }}</text>
        <text v-if="item.summary" class="summary">{{ summaryPrefix }}{{ item.summary }}</text>

        <view class="card-footer">
          <text class="entry-time">{{ createdAtLabel }} {{ formatTime(item.$createdAt) }}</text>
          <view class="delete-btn" @tap="deleteJournal(item.$id)">
            <Icon name="delete" :size="14" color="#ef4444" />
            <text class="delete">{{ deleteLabel }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import journalsService from '@/services/journals'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Journal, JournalMood } from '@/types/journal'
import { usePsychologyNav } from '@/composables/usePsychologyNav'
import { moodClass, moodLabel, riskClass, riskLabel } from '@/utils/mood-helpers'
import { requireAuth } from '@/utils/auth-guard'

const { goBack } = usePsychologyNav()

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const journals = ref<Journal[]>([])
const loading = ref(false)
const draftContent = ref('')
const draftMood = ref<JournalMood>('calm')
const draftIsPrivate = ref(true)
const draftTags = ref<string[]>([])

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const pageTitle = computed(() => (isZh.value ? '心情日记' : 'Mood Journal'))
const composerLabel = computed(() => (isZh.value ? '记录此刻感受' : 'Capture your current feeling'))
const composerHint = computed(() => (isZh.value ? '文本优先的心理记录与追踪' : 'Text-first journaling for emotional tracking'))
const composerPlaceholder = computed(() =>
  isZh.value ? '今天发生了什么？你此刻有什么感受？' : 'What happened today? How do you feel right now?'
)
const submitLabel = computed(() => (isZh.value ? '保存日记' : 'Save Journal'))
const listTitle = computed(() => (isZh.value ? '我的记录' : 'My Journals'))
const countSuffix = computed(() => (isZh.value ? ' 条' : ' items'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const emptyText = computed(() => (isZh.value ? '还没有日记，先写一条吧' : 'No journal yet. Write your first one.'))
const deleteLabel = computed(() => (isZh.value ? '删除' : 'Delete'))
const moodTitle = computed(() => (isZh.value ? '情绪标签' : 'Mood'))
const tagTitle = computed(() => (isZh.value ? '主题标签' : 'Tags'))
const privateLabel = computed(() => (isZh.value ? '仅自己可见' : 'Private only'))
const privateBadge = computed(() => (isZh.value ? '私密' : 'Private'))
const createdAtLabel = computed(() => (isZh.value ? '创建时间' : 'Created'))
const totalLabel = computed(() => (isZh.value ? '总记录' : 'Entries'))
const riskCountLabel = computed(() => (isZh.value ? '风险关注' : 'Risk Watch'))
const latestLabel = computed(() => (isZh.value ? '最近更新' : 'Latest'))
const noDateLabel = computed(() => (isZh.value ? '暂无' : 'None'))
const summaryPrefix = computed(() => (isZh.value ? 'AI 摘要：' : 'AI Summary: '))

const moodOptions = computed(() => [
  { value: 'happy' as JournalMood, label: isZh.value ? '开心' : 'Happy' },
  { value: 'calm' as JournalMood, label: isZh.value ? '平静' : 'Calm' },
  { value: 'anxious' as JournalMood, label: isZh.value ? '焦虑' : 'Anxious' },
  { value: 'sad' as JournalMood, label: isZh.value ? '低落' : 'Sad' },
  { value: 'angry' as JournalMood, label: isZh.value ? '烦躁' : 'Angry' }
])

const tagOptions = computed(() => [
  { value: 'study', label: isZh.value ? '学习' : 'Study' },
  { value: 'emotion', label: isZh.value ? '情绪' : 'Emotion' },
  { value: 'sleep', label: isZh.value ? '睡眠' : 'Sleep' },
  { value: 'relation', label: isZh.value ? '关系' : 'Relation' },
  { value: 'growth', label: isZh.value ? '成长' : 'Growth' }
])

const journalStats = computed(() => {
  const total = journals.value.length
  const riskCount = journals.value.filter((item) => Number(item.riskLevel || 1) >= 2).length
  const latest = journals.value[0]?.$createdAt || ''
  return {
    total,
    riskCount,
    latestDate: latest ? formatDateShort(latest) : noDateLabel.value
  }
})

function handleCommonAction() {
  uni.navigateTo({ url: '/pages/psychology/insights' })
}

function onPrivateSwitch(event: { detail?: { value?: boolean } }) {
  draftIsPrivate.value = Boolean(event?.detail?.value)
}

function toggleDraftTag(tag: string) {
  if (draftTags.value.includes(tag)) {
    draftTags.value = draftTags.value.filter((item) => item !== tag)
    return
  }
  draftTags.value = [...draftTags.value, tag]
}

function formatTag(tag: string) {
  const map = isZh.value
    ? {
        study: '学习',
        emotion: '情绪',
        sleep: '睡眠',
        relation: '关系',
        growth: '成长'
      }
    : {
        study: 'Study',
        emotion: 'Emotion',
        sleep: 'Sleep',
        relation: 'Relation',
        growth: 'Growth'
      }
  return map[tag as keyof typeof map] || tag
}

function formatDateShort(raw?: string) {
  if (!raw) {
    return noDateLabel.value
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return raw
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

function formatTime(raw?: string) {
  if (!raw) {
    return ''
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return raw
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function buildSummary(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, 120)
}

async function loadJournals() {
  loading.value = true
  try {
    journals.value = await journalsService.getMyJournals({
      limit: 50,
      order: 'desc'
    })
  } catch (error) {
    console.error('Load journals failed:', error)
    uni.showToast({
      title: isZh.value ? '加载日记失败' : 'Failed to load journals',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

async function createJournal() {
  const content = draftContent.value.trim()
  if (!content) {
    uni.showToast({
      title: isZh.value ? '请输入内容' : 'Please input content',
      icon: 'none'
    })
    return
  }

  try {
    await journalsService.createJournal({
      content,
      mood: draftMood.value,
      isPrivate: draftIsPrivate.value,
      tags: [...draftTags.value],
      summary: buildSummary(content)
    })
    draftContent.value = ''
    draftMood.value = 'calm'
    draftIsPrivate.value = true
    draftTags.value = []
    uni.showToast({
      title: isZh.value ? '已保存' : 'Saved',
      icon: 'success'
    })
    await loadJournals()
  } catch (error) {
    console.error('Create journal failed:', error)
    uni.showToast({
      title: isZh.value ? '保存失败' : 'Save failed',
      icon: 'none'
    })
  }
}

async function deleteJournal(rowId: string) {
  const snapshot = journals.value.slice()
  journals.value = journals.value.filter((item) => item.$id !== rowId)
  uni.showToast({
    title: isZh.value ? '已删除' : 'Deleted',
    icon: 'success'
  })

  try {
    await journalsService.deleteJournal(rowId)
  } catch (error) {
    console.error('Delete journal failed:', error)
    journals.value = snapshot
    uni.showToast({
      title: isZh.value ? '删除失败，已恢复' : 'Delete failed, restored',
      icon: 'none'
    })
  }
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  if (!requireAuth('/pages/psychology/journal')) {
    return
  }
  await authStore.refreshProfile()
  await loadJournals()
})
</script>

<style lang="scss" scoped>
.journal-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --line: rgba(136, 111, 222, 0.16);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(246, 246, 248, 0.9);
}

.theme-dark {
  --page-bg: #15131f;
  --surface: rgba(24, 25, 39, 0.8);
  --line: rgba(136, 111, 222, 0.3);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 19, 31, 0.9);
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

  .left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .right {
    display: flex;
    align-items: center;
  }
}

.title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.insight-card {
  margin-top: 14rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: linear-gradient(135deg, rgba(136, 111, 222, 0.16), rgba(136, 111, 222, 0.06));
  padding: 22rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat-item.bordered {
  border-left: 1px dashed var(--line);
  border-right: 1px dashed var(--line);
}

.stat-value {
  color: var(--text-main);
  font-size: 36rpx;
  font-weight: 700;
}

.stat-value.small {
  font-size: 28rpx;
}

.stat-label {
  color: var(--text-sub);
  font-size: 20rpx;
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
  background: rgba(136, 111, 222, 0.14);
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
  color: var(--text-main);
  font-size: 26rpx;
  border-radius: 18rpx;
  background: rgba(136, 111, 222, 0.04);
  padding: 18rpx 20rpx;
  box-sizing: border-box;
}

.composer-input {
  min-height: 220rpx;
}

.field-block {
  margin-top: 14rpx;
}

.field-title {
  color: var(--text-sub);
  font-size: 22rpx;
  font-weight: 600;
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

.mood-chip.active,
.tag-chip.active {
  background: rgba(136, 111, 222, 0.2);
  color: #7359d3;
  border-color: rgba(136, 111, 222, 0.36);
}

.composer-row {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.switch-label {
  color: var(--text-sub);
  font-size: 23rpx;
}

.submit-btn {
  border-radius: 16rpx;
  background: #886fde;
  padding: 12rpx 26rpx;
  box-shadow: 0 8rpx 18rpx rgba(136, 111, 222, 0.28);
}

.submit-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}

.list-title-row {
  margin-top: 30rpx;
  margin-bottom: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-title {
  color: var(--text-main);
  font-size: 32rpx;
  font-weight: 700;
}

.list-count {
  color: var(--text-soft);
  font-size: 22rpx;
}

.journal-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.journal-card,
.state-card {
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
  padding: 22rpx;
}

.state-card {
  text-align: center;
}

.state-text {
  color: var(--text-sub);
  font-size: 24rpx;
}

.card-header,
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.mood-pill {
  min-height: 42rpx;
  border-radius: 999rpx;
  padding: 0 14rpx;
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.mood-happy {
  background: #f59e0b;
}

.mood-calm {
  background: #10b981;
}

.mood-anxious {
  background: #ef4444;
}

.mood-low {
  background: #6366f1;
}

.mood-angry {
  background: #f97316;
}

.time,
.entry-time {
  color: var(--text-soft);
  font-size: 22rpx;
}

.card-tags {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.meta-chip {
  min-height: 44rpx;
  border-radius: 999rpx;
  padding: 0 14rpx;
  background: rgba(136, 111, 222, 0.1);
  color: #6d57c8;
  font-size: 20rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.meta-chip.private {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.meta-chip.risk-low {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.meta-chip.risk-mid {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.meta-chip.risk-high {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.content {
  margin-top: 16rpx;
  color: var(--text-main);
  font-size: 26rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}

.summary {
  margin-top: 14rpx;
  color: var(--text-sub);
  font-size: 23rpx;
  line-height: 1.6;
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.delete {
  color: #ef4444;
  font-size: 22rpx;
}
</style>
