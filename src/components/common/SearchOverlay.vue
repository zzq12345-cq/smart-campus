<template>
  <view v-if="visible" :class="['search-overlay', themeClass]" :style="overlayVars">
    <view class="search-backdrop" :class="{ active: animReady }" @tap="handleClose" />

    <view class="search-panel" :class="{ active: animReady }">
      <view class="search-header">
        <view class="search-input-wrap">
          <Icon name="search" :size="18" :color="accentColor" />
          <input
            ref="inputRef"
            class="search-input"
            type="text"
            :placeholder="t(I18N_KEYS.searchPlaceholder, locale)"
            :value="keyword"
            confirm-type="search"
            :focus="inputFocused"
            @input="onInput"
            @confirm="onConfirm"
          />
          <view v-if="keyword" class="search-clear" @tap="clearKeyword">
            <Icon name="close" :size="16" color="#94a3b8" />
          </view>
        </view>
        <text class="search-cancel" :style="{ color: accentColor }" @tap="handleClose">
          {{ t(I18N_KEYS.searchCancel, locale) }}
        </text>
      </view>

      <view class="section-tabs">
        <view
          v-for="tab in sectionTabs"
          :key="tab.value"
          :class="['tab-item', { active: activeSection === tab.value }]"
          :style="activeSection === tab.value ? { color: tab.color, borderBottomColor: tab.color } : {}"
          @tap="switchSection(tab.value)"
        >
          <text class="tab-text">{{ tab.label }}</text>
        </view>
      </view>

      <scroll-view class="search-body" scroll-y>
        <view v-if="loading" class="search-state">
          <text class="state-text">{{ t(I18N_KEYS.commonLoading, locale) }}</text>
        </view>

        <view v-else-if="hasSearched && !results.length" class="search-state">
          <Icon name="search_off" :size="48" color="#94a3b8" />
          <text class="state-text">{{ t(I18N_KEYS.searchNoResults, locale) }}</text>
        </view>

        <view v-else-if="results.length" class="search-results">
          <text class="result-count">
            {{ t(I18N_KEYS.searchResultCount, locale, { count: results.length }) }}
          </text>
          <view
            v-for="item in results"
            :key="item.$id"
            class="result-card"
            @tap="selectPost(item)"
          >
            <view class="result-top">
              <view class="result-badge" :style="{ background: getSectionBadgeBg(item.section), color: getSectionBadgeColor(item.section) }">
                {{ getSectionLabel(item.section) }}
              </view>
              <text class="result-time">{{ formatTime(item.$createdAt) }}</text>
            </view>
            <text class="result-content">{{ truncate(item.content, 100) }}</text>
            <view class="result-bottom">
              <view class="result-stats">
                <Icon name="favorite" :size="14" color="#94a3b8" />
                <text class="stat-num">{{ item.likeCount || 0 }}</text>
                <Icon name="chat_bubble" :size="14" color="#94a3b8" />
                <text class="stat-num">{{ item.commentCount || 0 }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="history.length" class="search-history">
          <view class="history-header">
            <text class="history-title">{{ t(I18N_KEYS.searchRecentSearches, locale) }}</text>
            <text class="history-clear" :style="{ color: accentColor }" @tap="clearHistory">
              {{ t(I18N_KEYS.searchClearHistory, locale) }}
            </text>
          </view>
          <view class="history-tags">
            <view
              v-for="(term, idx) in history"
              :key="idx"
              class="history-tag"
              @tap="searchFromHistory(term)"
            >
              <text class="tag-text">{{ term }}</text>
            </view>
          </view>
        </view>

        <view v-else class="search-state empty-hint">
          <Icon name="manage_search" :size="48" color="#94a3b8" />
          <text class="state-text">{{ t(I18N_KEYS.searchPlaceholder, locale) }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import postsService from '@/services/posts'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Post, PostSection } from '@/types/post'

type SectionFilter = PostSection | 'all'

const props = defineProps<{
  visible: boolean
  currentSection: SectionFilter
  accentColor: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-post', payload: { postId: string; section: PostSection }): void
}>()

const STORAGE_KEY = 'search_history'
const MAX_HISTORY = 10
const DEBOUNCE_MS = 300

const SECTION_COLORS: Record<string, { bg: string; color: string }> = {
  study: { bg: 'rgba(74, 144, 226, 0.16)', color: '#3f7dcb' },
  life: { bg: 'rgba(244, 157, 37, 0.18)', color: '#b45309' },
  psychology: { bg: 'rgba(136, 111, 222, 0.16)', color: '#7359d3' }
}

const TAB_COLORS: Record<string, string> = {
  study: '#4A90E2',
  life: '#f49d25',
  psychology: '#886fde'
}

const uiPreferencesStore = useUiPreferencesStore()
const locale = computed(() => uiPreferencesStore.locale)
const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => locale.value === 'zh-CN')

const keyword = ref('')
const activeSection = ref<SectionFilter>(props.currentSection)
const results = ref<Post[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const animReady = ref(false)
const inputFocused = ref(false)
const history = ref<string[]>([])
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const overlayVars = computed(() => ({
  '--accent': props.accentColor
}))

const sectionTabs = computed(() => [
  { value: 'study' as SectionFilter, label: t(I18N_KEYS.tabStudy, locale.value), color: TAB_COLORS.study },
  { value: 'life' as SectionFilter, label: t(I18N_KEYS.tabLife, locale.value), color: TAB_COLORS.life },
  { value: 'psychology' as SectionFilter, label: t(I18N_KEYS.tabPsychology, locale.value), color: TAB_COLORS.psychology },
  { value: 'all' as SectionFilter, label: t(I18N_KEYS.searchAllSections, locale.value), color: props.accentColor }
])

function loadHistory() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (Array.isArray(raw)) {
      history.value = raw.slice(0, MAX_HISTORY)
    }
  } catch {
    history.value = []
  }
}

function saveHistory(term: string) {
  const trimmed = term.trim()
  if (!trimmed) return
  const filtered = history.value.filter((h) => h !== trimmed)
  history.value = [trimmed, ...filtered].slice(0, MAX_HISTORY)
  try {
    uni.setStorageSync(STORAGE_KEY, history.value)
  } catch { /* ignore */ }
}

function clearHistory() {
  history.value = []
  try {
    uni.removeStorageSync(STORAGE_KEY)
  } catch { /* ignore */ }
}

function getSectionLabel(section?: PostSection | string) {
  if (section === 'study') return isZh.value ? '学习' : 'Study'
  if (section === 'life') return isZh.value ? '生活' : 'Life'
  if (section === 'psychology') return isZh.value ? '心理' : 'Psychology'
  return ''
}

function getSectionBadgeBg(section?: PostSection | string) {
  return SECTION_COLORS[section || '']?.bg || 'rgba(148,163,184,0.14)'
}

function getSectionBadgeColor(section?: PostSection | string) {
  return SECTION_COLORS[section || '']?.color || '#64748b'
}

function formatTime(raw?: string) {
  if (!raw) return ''
  const diff = Date.now() - new Date(raw).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return isZh.value ? '刚刚' : 'Now'
  if (mins < 60) return isZh.value ? `${mins}分钟前` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return isZh.value ? `${hrs}小时前` : `${hrs}h`
  const days = Math.floor(hrs / 24)
  return isZh.value ? `${days}天前` : `${days}d`
}

function truncate(text: string, max: number) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

async function doSearch() {
  const term = keyword.value.trim()
  if (!term) {
    results.value = []
    hasSearched.value = false
    return
  }

  loading.value = true
  hasSearched.value = true
  try {
    const sectionFilter = activeSection.value === 'all' ? 'all' : activeSection.value
    const list = await postsService.getPublicPosts({
      keyword: term,
      section: sectionFilter,
      status: 'published',
      limit: 30
    })
    results.value = list
    if (list.length > 0) {
      saveHistory(term)
    }
  } catch (error) {
    console.error('Search failed:', error)
    results.value = []
  } finally {
    loading.value = false
  }
}

function onInput(e: { detail?: { value?: string } }) {
  keyword.value = String(e.detail?.value || '')
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doSearch, DEBOUNCE_MS)
}

function onConfirm() {
  if (debounceTimer) clearTimeout(debounceTimer)
  doSearch()
}

function clearKeyword() {
  keyword.value = ''
  results.value = []
  hasSearched.value = false
  inputFocused.value = true
}

function switchSection(section: SectionFilter) {
  activeSection.value = section
  if (keyword.value.trim()) {
    doSearch()
  }
}

function searchFromHistory(term: string) {
  keyword.value = term
  inputFocused.value = true
  doSearch()
}

function selectPost(post: Post) {
  const fallback = props.currentSection !== 'all' ? props.currentSection : 'study'
  const section = (post.section || fallback) as PostSection
  emit('select-post', { postId: String(post.$id || ''), section })
}

function handleClose() {
  animReady.value = false
  setTimeout(() => {
    keyword.value = ''
    results.value = []
    hasSearched.value = false
    inputFocused.value = false
    emit('close')
  }, 200)
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      activeSection.value = props.currentSection
      keyword.value = ''
      results.value = []
      hasSearched.value = false
      loadHistory()
      nextTick(() => {
        animReady.value = true
        inputFocused.value = true
      })
    } else {
      animReady.value = false
      inputFocused.value = false
    }
  }
)
</script>

<style lang="scss" scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.theme-light {
  --so-bg: #f8f8fa;
  --so-surface: #ffffff;
  --so-input-bg: #f1f5f9;
  --so-text: #0f172a;
  --so-text-sub: #64748b;
  --so-text-soft: #94a3b8;
  --so-line: rgba(148, 163, 184, 0.18);
  --so-backdrop: rgba(15, 23, 42, 0.32);
  --so-tag-bg: #f1f5f9;
}

.theme-dark {
  --so-bg: #0f0d1a;
  --so-surface: rgba(24, 22, 36, 0.92);
  --so-input-bg: rgba(30, 28, 46, 0.8);
  --so-text: #f1f5f9;
  --so-text-sub: #cbd5e1;
  --so-text-soft: #94a3b8;
  --so-line: rgba(148, 163, 184, 0.14);
  --so-backdrop: rgba(0, 0, 0, 0.56);
  --so-tag-bg: rgba(51, 65, 85, 0.5);
}

.search-backdrop {
  position: absolute;
  inset: 0;
  background: var(--so-backdrop);
  opacity: 0;
  transition: opacity 0.22s ease;

  &.active {
    opacity: 1;
  }
}

.search-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  max-height: 85vh;
  background: var(--so-bg);
  border-radius: 0 0 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  transform: translateY(-100%);
  opacity: 0;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;

  &.active {
    transform: translateY(0);
    opacity: 1;
  }
}

.search-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: calc(env(safe-area-inset-top, 0px) + 16rpx) 24rpx 16rpx;
}

.search-input-wrap {
  flex: 1;
  height: 72rpx;
  border-radius: 36rpx;
  background: var(--so-input-bg);
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 24rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  color: var(--so-text);
  background: transparent;
}

.search-clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.6;
  }
}

.search-cancel {
  font-size: 28rpx;
  font-weight: 600;
  white-space: nowrap;
  padding: 8rpx;

  &:active {
    opacity: 0.6;
  }
}

.section-tabs {
  display: flex;
  gap: 0;
  padding: 0 24rpx;
  border-bottom: 1px solid var(--so-line);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-bottom: 3rpx solid transparent;
  transition: all 0.18s ease;

  &:active {
    opacity: 0.6;
  }
}

.tab-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--so-text-soft);
}

.tab-item.active .tab-text {
  color: inherit;
}

.search-body {
  flex: 1;
  min-height: 200rpx;
  max-height: calc(85vh - 200rpx);
}

.search-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 80rpx 24rpx;
}

.state-text {
  color: var(--so-text-soft);
  font-size: 26rpx;
}

.result-count {
  display: block;
  color: var(--so-text-soft);
  font-size: 24rpx;
  margin-bottom: 16rpx;
}

.search-results {
  display: flex;
  flex-direction: column;
  padding: 16rpx 24rpx 32rpx;
  box-sizing: border-box;
}

.result-card {
  background: var(--so-surface);
  border-radius: 20rpx;
  border: 1px solid var(--so-line);
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-sizing: border-box;
  width: 100%;

  &:active {
    opacity: 0.8;
  }
}

.result-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.result-badge {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
}

.result-time {
  color: var(--so-text-soft);
  font-size: 22rpx;
}

.result-content {
  display: block;
  color: var(--so-text);
  font-size: 26rpx;
  line-height: 1.55;
}

.result-bottom {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
}

.result-stats {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.stat-num {
  color: var(--so-text-soft);
  font-size: 22rpx;
  margin-right: 12rpx;
}

.search-history {
  padding: 8rpx 24rpx 32rpx;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.history-title {
  color: var(--so-text-sub);
  font-size: 26rpx;
  font-weight: 600;
}

.history-clear {
  font-size: 24rpx;
  font-weight: 500;

  &:active {
    opacity: 0.6;
  }
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.history-tag {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: var(--so-tag-bg);

  &:active {
    opacity: 0.7;
  }
}

.tag-text {
  color: var(--so-text-sub);
  font-size: 24rpx;
}
</style>
