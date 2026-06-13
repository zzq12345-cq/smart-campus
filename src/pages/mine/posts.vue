<template>
  <view :class="['mine-posts-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ serviceTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="loadMyPosts">
          <Icon name="sync" :size="20" :color="iconColor" />
        </view>
      </view>
    </view>

    <view v-if="!authStore.isLoggedIn" class="guest-card">
      <view class="guest-icon">
        <Icon name="description" :size="26" color="#6fde81" />
      </view>
      <text class="guest-title">{{ guestTitle }}</text>
      <text class="guest-subtitle">{{ guestSubtitle }}</text>

      <view class="guest-preview">
        <view
          v-for="item in sectionPreviewItems"
          :key="item.key"
          :class="['guest-preview-card', `guest-preview-card--${item.key}`]"
        >
          <view class="guest-preview-head">
            <Icon :name="item.icon" :size="16" :color="item.color" />
            <text class="guest-preview-title">{{ item.title }}</text>
          </view>
          <text class="guest-preview-subtitle">{{ item.subtitle }}</text>
        </view>
      </view>

      <view class="guest-actions">
        <view class="primary-btn" @tap="navigateToLogin">
          <text class="primary-btn-text">{{ loginLabel }}</text>
        </view>
        <view class="secondary-btn" @tap="navigateToRegister">
          <text class="secondary-btn-text">{{ registerLabel }}</text>
        </view>
      </view>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-copy">
          <text class="hero-kicker">{{ heroKicker }}</text>
          <text class="hero-title">{{ heroTitle }}</text>
          <text class="hero-subtitle">{{ heroSubtitle }}</text>
        </view>


        <view class="hero-zones">
          <view
            v-for="item in sectionMetrics"
            :key="item.key"
            :class="['zone-pill', `zone-pill--${item.key}`]"
          >
            <view class="zone-pill-head">
              <Icon :name="item.icon" :size="14" :color="item.color" />
              <text class="zone-pill-title">{{ item.title }}</text>
            </view>
            <text class="zone-pill-value">{{ item.count }}</text>
          </view>
        </view>

        <view class="hero-glow hero-glow-study"></view>
        <view class="hero-glow hero-glow-life"></view>
        <view class="hero-glow hero-glow-psychology"></view>
      </view>

      <view class="stats-card">
        <view
          v-for="(item, index) in statItems"
          :key="item.label"
          class="stat-item"
          :class="{ bordered: index === 1 }"
        >
          <text class="stat-value">{{ item.value }}</text>
          <text class="stat-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="section-title-row">
        <view class="section-left">
          <Icon name="dashboard" :size="18" color="#6fde81" />
          <text class="section-title">{{ workbenchTitle }}</text>
        </view>
      </view>

      <scroll-view class="quick-scroll" :scroll-x="hasDashboardOverflow" show-scrollbar="false">
        <view :class="['quick-grid', { 'is-overflow': hasDashboardOverflow }]">
          <view
            v-for="item in dashboardCards"
            :key="item.key"
            :class="['quick-card', `quick-card--${item.key}`, { active: statusFilter === item.status }]"
            @tap="statusFilter = item.status"
          >
            <view class="quick-head">
              <view class="quick-icon">
                <Icon :name="item.icon" :size="18" :color="item.color" />
              </view>
              <text class="quick-title">{{ item.title }}</text>
            </view>
            <text class="quick-value">{{ item.count }}</text>
            <text class="quick-subtitle">{{ item.subtitle }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="filter-card">
        <view class="filter-group">
          <text class="filter-label">{{ filterSectionLabel }}</text>
          <view class="chip-row">
            <view
              v-for="item in sectionFilters"
              :key="item.key"
              :class="['filter-chip', { active: sectionFilter === item.key }]"
              @tap="sectionFilter = item.key"
            >
              <text>{{ item.label }}</text>
              <text class="filter-count">{{ item.count }}</text>
            </view>
          </view>
        </view>

        <view class="filter-group">
          <text class="filter-label">{{ filterStatusLabel }}</text>
          <view class="chip-row">
            <view
              v-for="item in statusFilters"
              :key="item.key"
              :class="['filter-chip', { active: statusFilter === item.key }]"
              @tap="statusFilter = item.key"
            >
              <text>{{ item.label }}</text>
              <text class="filter-count">{{ item.count }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section-title-row">
        <view class="section-left">
          <Icon name="description" :size="18" color="#6fde81" />
          <text class="section-title">{{ timelineTitle }}</text>
        </view>
        <text class="section-action" @tap="loadMyPosts">{{ refreshLabel }}</text>
      </view>

      <view class="feed-list">
        <view v-if="loadingPosts && !myPosts.length" class="state-card">
          <text class="state-title">{{ loadingText }}</text>
          <text class="state-text">{{ loadingHint }}</text>
        </view>

        <view v-else-if="postsError && !myPosts.length" class="state-card error">
          <text class="state-title">{{ loadErrorTitle }}</text>
          <text class="state-text">{{ postsError }}</text>
        </view>

        <view v-else-if="!filteredPosts.length" class="state-card">
          <text class="state-title">{{ emptyTitle }}</text>
          <text class="state-text">{{ emptySubtitle }}</text>
        </view>

        <view
          v-for="post in filteredPosts"
          :key="post.$id"
          :class="['post-card', `post-card--${resolvePostSection(post)}`]"
        >
          <view class="post-meta">
            <view class="post-badges">
              <view :class="['source-badge', `source-badge--${resolvePostSection(post)}`]">
                <Icon
                  :name="getSectionMeta(resolvePostSection(post)).icon"
                  :size="12"
                  :color="getSectionMeta(resolvePostSection(post)).color"
                />
                <text>{{ sectionLabel(resolvePostSection(post)) }}</text>
              </view>
              <view class="info-badge">{{ topicLabel(post) }}</view>
              <view class="info-badge">{{ identityLabel(post) }}</view>
              <view :class="['status-badge', `status-badge--${post.status}`]">
                {{ statusLabel(post.status) }}
              </view>
            </view>
            <text class="post-time">{{ formatRelativeTime(post.$updatedAt || post.$createdAt) }}</text>
          </view>

          <text class="post-content">{{ post.content }}</text>

          <view v-if="(post.images || []).length" :class="['post-images', { single: (post.images || []).length === 1 }]">
            <view
              v-for="(image, index) in (post.images || []).slice(0, 3)"
              :key="`${post.$id}-${image}-${index}`"
              class="post-image-wrap"
              @tap.stop="previewPostImages(post.images || [], image)"
            >
              <image class="post-image" :src="image" mode="aspectFill" lazy-load />
              <view v-if="index === 2 && (post.images || []).length > 3" class="more-mask">
                <text class="more-text">+{{ (post.images || []).length - 3 }}</text>
              </view>
            </view>
          </view>

          <view class="post-footer">
            <view class="engagement">
              <view class="engagement-item">
                <Icon name="favorite" :size="14" color="#ef5a74" />
                <text>{{ Number(post.likeCount || 0) }}</text>
              </view>
              <view class="engagement-item">
                <Icon name="chat_bubble" :size="14" color="#94a3b8" />
                <text>{{ Number(post.commentCount || 0) }}</text>
              </view>
            </view>

            <view class="manage-actions">
              <view
                v-if="post.status !== 'deleted'"
                class="manage-btn primary"
                :class="{ disabled: mutatingPostId === post.$id }"
                @tap="startEditing(post)"
              >
                <text>{{ editLabel }}</text>
              </view>
              <view
                v-else
                class="manage-btn success"
                :class="{ disabled: mutatingPostId === post.$id }"
                @tap="restorePost(post)"
              >
                <text>{{ restoreLabel }}</text>
              </view>

              <view
                class="manage-btn ghost"
                :class="{ disabled: mutatingPostId === post.$id }"
                @tap="openPostMenu(post)"
              >
                <text>{{ moreLabel }}</text>
              </view>

              <view
                v-if="post.status !== 'deleted'"
                class="manage-btn danger"
                :class="{ disabled: mutatingPostId === post.$id }"
                @tap="confirmDelete(post)"
              >
                <text>{{ deleteLabel }}</text>
              </view>
            </view>
          </view>

          <view v-if="editingPostId === post.$id" class="editor-card">
            <textarea
              v-model="editingContent"
              class="editor-textarea"
              :placeholder="editorPlaceholder"
              maxlength="500"
            />
            <view class="editor-image-head">
              <text class="editor-image-title">{{ editorImageTitle }}</text>
              <text class="editor-note">{{ editingImageCountLabel }}</text>
            </view>
            <view class="editor-image-grid">
              <view
                v-for="(image, index) in editingImages"
                :key="`${image.localPath}-${index}`"
                class="editor-image-item"
                @tap="previewEditingImages(image.localPath)"
              >
                <image class="editor-image" :src="image.localPath" mode="aspectFill" lazy-load />
                <view v-if="image.uploading" class="editor-uploading-mask">
                  <text class="editor-uploading-text">{{ editorUploadingLabel }}</text>
                </view>
                <view class="editor-remove-btn" @tap.stop="removeEditingImage(index)">
                  <Icon name="close" :size="14" color="#ffffff" />
                </view>
              </view>

              <view
                v-if="canAddEditingImages"
                class="editor-image-item editor-add-item"
                :class="{ disabled: savingPostId === post.$id }"
                @tap="chooseEditingImages"
              >
                <Icon name="add_photo_alternate" :size="22" color="#6fde81" />
                <text class="editor-add-text">{{ editorAddImageLabel }}</text>
              </view>
            </view>
            <view class="editor-toolbar">
              <view class="editor-meta">
                <text class="editor-count">{{ editingContent.length }}/500</text>
                <text class="editor-note">{{ statusLabel(post.status) }}</text>
              </view>
              <view class="editor-actions">
                <view class="editor-btn subtle" @tap="cancelEditing">
                  <text>{{ cancelLabel }}</text>
                </view>
                <view
                  class="editor-btn solid"
                  :class="{ disabled: savingPostId === post.$id }"
                  @tap="saveEditing(post)"
                >
                  <text>{{ savingPostId === post.$id ? loadingText : saveChangesLabel }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import postsService from '@/services/posts'
import { uploadPostImage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Post, PostSection, PostStatus } from '@/types/post'
import { invalidateCache } from '@/utils/posts-cache'

type MineStatusFilter = 'all' | PostStatus

interface EditorImageAsset {
  localPath: string
  file?: File
  uploadedUrl?: string
  uploading?: boolean
}

interface ChooseImageTempFile {
  path?: string
  tempFilePath?: string
  file?: File
}

const SECTION_META: Record<PostSection, { icon: string; color: string }> = {
  study: {
    icon: 'school',
    color: '#4A90E2'
  },
  life: {
    icon: 'shopping_bag',
    color: '#F49D25'
  },
  psychology: {
    icon: 'spa',
    color: '#886FDE'
  }
}

const MAX_EDIT_IMAGES = 6

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))

const myPosts = ref<Post[]>([])
const loadingPosts = ref(false)
const postsError = ref('')
const sectionFilter = ref<'all' | PostSection>('all')
const statusFilter = ref<MineStatusFilter>('all')
const editingPostId = ref('')
const editingContent = ref('')
const editingImages = ref<EditorImageAsset[]>([])
const savingPostId = ref('')
const mutatingPostId = ref('')

const localeText = (zh: string, en: string) => (isZh.value ? zh : en)

const serviceTitle = computed(() => t(I18N_KEYS.mineServicePosts, uiPreferencesStore.locale))
const guestTitle = computed(() => t(I18N_KEYS.mineGuestTitle, uiPreferencesStore.locale))
const guestSubtitle = computed(() => t(I18N_KEYS.mineGuestSubtitle, uiPreferencesStore.locale))
const loginLabel = computed(() => t(I18N_KEYS.mineLoginAction, uiPreferencesStore.locale))
const registerLabel = computed(() => t(I18N_KEYS.mineRegisterAction, uiPreferencesStore.locale))
const heroKicker = computed(() => t(I18N_KEYS.minePostsHeroKicker, uiPreferencesStore.locale))
const heroTitle = computed(() => t(I18N_KEYS.minePostsHeroTitle, uiPreferencesStore.locale))
const heroSubtitle = computed(() => t(I18N_KEYS.minePostsHeroSubtitle, uiPreferencesStore.locale))
const workbenchTitle = computed(() => t(I18N_KEYS.minePostsWorkbenchTitle, uiPreferencesStore.locale))
const timelineTitle = computed(() => t(I18N_KEYS.minePostsTimelineTitle, uiPreferencesStore.locale))
const filterSectionLabel = computed(() => t(I18N_KEYS.minePostsFilterSection, uiPreferencesStore.locale))
const filterStatusLabel = computed(() => t(I18N_KEYS.minePostsFilterStatus, uiPreferencesStore.locale))
const emptyTitle = computed(() => t(I18N_KEYS.minePostsEmptyTitle, uiPreferencesStore.locale))
const emptySubtitle = computed(() => t(I18N_KEYS.minePostsEmptySubtitle, uiPreferencesStore.locale))
const editorPlaceholder = computed(() => t(I18N_KEYS.minePostsEditorPlaceholder, uiPreferencesStore.locale))
const editorImageTitle = computed(() => localeText('帖子图片', 'Post Images'))
const editingImageCountLabel = computed(() =>
  localeText(
    `已选 ${editingImages.value.length}/${MAX_EDIT_IMAGES}`,
    `${editingImages.value.length}/${MAX_EDIT_IMAGES} selected`
  )
)
const editorAddImageLabel = computed(() => localeText('添加图片', 'Add image'))
const editorUploadingLabel = computed(() => localeText('上传中...', 'Uploading...'))
const deleteTitle = computed(() => t(I18N_KEYS.minePostsDeleteTitle, uiPreferencesStore.locale))
const deleteContent = computed(() => t(I18N_KEYS.minePostsDeleteContent, uiPreferencesStore.locale))
const loadingText = computed(() => t(I18N_KEYS.commonLoading, uiPreferencesStore.locale))

const loadingHint = computed(() => localeText('正在同步你在三个分区发布的内容…', 'Syncing your posts across all sections...'))
const loadErrorTitle = computed(() => localeText('加载失败', 'Load failed'))
const refreshLabel = computed(() => localeText('刷新', 'Refresh'))
const editLabel = computed(() => localeText('修改', 'Edit'))
const deleteLabel = computed(() => localeText('删除', 'Delete'))
const restoreLabel = computed(() => localeText('恢复发布', 'Restore'))
const moreLabel = computed(() => localeText('更多', 'More'))
const cancelLabel = computed(() => localeText('取消', 'Cancel'))
const saveChangesLabel = computed(() => localeText('保存修改', 'Save'))


const publishedCount = computed(() => myPosts.value.filter((item) => item.status === 'published').length)
const draftCount = computed(() => myPosts.value.filter((item) => item.status === 'draft').length)
const pendingCount = computed(() => myPosts.value.filter((item) => item.status === 'pending_review').length)
const deletedCount = computed(() => myPosts.value.filter((item) => item.status === 'deleted').length)
const totalLikes = computed(() =>
  myPosts.value.reduce((sum, item) => sum + Number(item.likeCount || 0), 0)
)

const statItems = computed(() => [
  {
    label: t(I18N_KEYS.mineStatsPosts, uiPreferencesStore.locale),
    value: String(myPosts.value.length)
  },
  {
    label: statusLabel('published'),
    value: String(publishedCount.value)
  },
  {
    label: t(I18N_KEYS.mineStatsLikes, uiPreferencesStore.locale),
    value: formatCompactNumber(totalLikes.value)
  }
])

const sectionMetrics = computed(() =>
  (Object.keys(SECTION_META) as PostSection[]).map((section) => {
    const meta = SECTION_META[section]
    return {
      key: section,
      icon: meta.icon,
      color: meta.color,
      title: sectionLabel(section),
      count: myPosts.value.filter((item) => resolvePostSection(item) === section).length
    }
  })
)

const dashboardCards = computed(() => [
  {
    key: 'all',
    status: 'all' as MineStatusFilter,
    icon: 'inventory_2',
    color: '#6FDE81',
    title: localeText('全部帖子', 'All Posts'),
    subtitle: localeText('统一查看三区内容', 'Across all sections'),
    count: myPosts.value.length
  },
  {
    key: 'published',
    status: 'published' as MineStatusFilter,
    icon: 'task_alt',
    color: '#22C55E',
    title: statusLabel('published'),
    subtitle: localeText('对外可见', 'Visible now'),
    count: publishedCount.value
  },
  {
    key: 'pending_review',
    status: 'pending_review' as MineStatusFilter,
    icon: 'schedule',
    color: '#F59E0B',
    title: statusLabel('pending_review'),
    subtitle: localeText('等待审核', 'Waiting review'),
    count: pendingCount.value
  },
  {
    key: 'draft',
    status: 'draft' as MineStatusFilter,
    icon: 'edit_note',
    color: '#4A90E2',
    title: statusLabel('draft'),
    subtitle: localeText('继续打磨', 'Keep refining'),
    count: draftCount.value
  },
  {
    key: 'deleted',
    status: 'deleted' as MineStatusFilter,
    icon: 'delete',
    color: '#EF4444',
    title: statusLabel('deleted'),
    subtitle: localeText('可恢复查看', 'Recoverable'),
    count: deletedCount.value
  }
])

const hasDashboardOverflow = computed(() => dashboardCards.value.length > 4)
const canAddEditingImages = computed(() => editingImages.value.length < MAX_EDIT_IMAGES)

const sectionFilters = computed(() => [
  {
    key: 'all' as const,
    label: localeText('全部', 'All'),
    count: myPosts.value.length
  },
  ...sectionMetrics.value.map((item) => ({
    key: item.key,
    label: item.title,
    count: item.count
  }))
])

const statusFilters = computed(() => [
  {
    key: 'all' as MineStatusFilter,
    label: localeText('全部', 'All'),
    count: myPosts.value.length
  },
  {
    key: 'published' as MineStatusFilter,
    label: statusLabel('published'),
    count: publishedCount.value
  },
  {
    key: 'pending_review' as MineStatusFilter,
    label: statusLabel('pending_review'),
    count: pendingCount.value
  },
  {
    key: 'draft' as MineStatusFilter,
    label: statusLabel('draft'),
    count: draftCount.value
  },
  {
    key: 'deleted' as MineStatusFilter,
    label: statusLabel('deleted'),
    count: deletedCount.value
  }
])

const sectionPreviewItems = computed(() => [
  {
    key: 'study',
    icon: SECTION_META.study.icon,
    color: SECTION_META.study.color,
    title: t(I18N_KEYS.tabStudy, uiPreferencesStore.locale),
    subtitle: localeText('课程复盘、资料分享', 'Course notes & resources')
  },
  {
    key: 'life',
    icon: SECTION_META.life.icon,
    color: SECTION_META.life.color,
    title: t(I18N_KEYS.tabLife, uiPreferencesStore.locale),
    subtitle: localeText('闲置、活动与求助', 'Campus life and help')
  },
  {
    key: 'psychology',
    icon: SECTION_META.psychology.icon,
    color: SECTION_META.psychology.color,
    title: t(I18N_KEYS.tabPsychology, uiPreferencesStore.locale),
    subtitle: localeText('树洞倾诉、情绪记录', 'Anonymous feelings & care')
  }
])

const filteredPosts = computed(() =>
  myPosts.value.filter((item) => {
    const sectionMatched = sectionFilter.value === 'all' || resolvePostSection(item) === sectionFilter.value
    const statusMatched = statusFilter.value === 'all' || item.status === statusFilter.value
    return sectionMatched && statusMatched
  })
)

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    const compact = (value / 1000).toFixed(value >= 10000 ? 0 : 1)
    return `${compact}k`
  }
  return String(value)
}

function extractErrorMessage(error: unknown) {
  const message = String((error as { message?: string })?.message || '').trim()
  return message
}

function toast(title: string, icon: 'success' | 'none' = 'none') {
  uni.showToast({
    title,
    icon
  })
}

function getSectionMeta(section: PostSection) {
  return SECTION_META[section]
}

function resolvePostSection(post: Partial<Post>) {
  const section = String(post.section || '').trim()
  if (section === 'study' || section === 'life' || section === 'psychology') {
    return section
  }
  return 'psychology'
}

function sectionLabel(section: PostSection) {
  const map = {
    study: I18N_KEYS.tabStudy,
    life: I18N_KEYS.tabLife,
    psychology: I18N_KEYS.tabPsychology
  } as const
  return t(map[section], uiPreferencesStore.locale)
}

function statusLabel(status?: string) {
  switch (status) {
    case 'published':
      return localeText('已发布', 'Published')
    case 'pending_review':
      return localeText('审核中', 'In Review')
    case 'draft':
      return localeText('草稿', 'Draft')
    case 'deleted':
      return localeText('已删除', 'Deleted')
    default:
      return localeText('未知状态', 'Unknown')
  }
}

function identityLabel(post: Post) {
  return post.isAnonymous
    ? t(I18N_KEYS.commonAnonymousPost, uiPreferencesStore.locale)
    : t(I18N_KEYS.commonNamedPost, uiPreferencesStore.locale)
}

function topicLabel(post: Post) {
  const section = resolvePostSection(post)
  const topic = String(post.topic || '').trim()

  if (section === 'study') {
    switch (topic) {
      case 'course_review':
        return t(I18N_KEYS.studyTopicCourseReview, uiPreferencesStore.locale)
      case 'exam_info':
        return t(I18N_KEYS.studyTopicExamInfo, uiPreferencesStore.locale)
      case 'learning_material':
        return t(I18N_KEYS.studyTopicLearningMaterial, uiPreferencesStore.locale)
      case 'competition':
        return t(I18N_KEYS.studyTopicCompetition, uiPreferencesStore.locale)
      default:
        return t(I18N_KEYS.studyTopicDefault, uiPreferencesStore.locale)
    }
  }

  if (section === 'life') {
    switch (topic) {
      case 'life_help':
        return t(I18N_KEYS.lifeTopicLifeHelp, uiPreferencesStore.locale)
      case 'second_hand':
        return t(I18N_KEYS.lifeTopicSecondHand, uiPreferencesStore.locale)
      case 'activity':
        return t(I18N_KEYS.lifeTopicActivity, uiPreferencesStore.locale)
      case 'job':
        return t(I18N_KEYS.lifeTopicJob, uiPreferencesStore.locale)
      case 'rental':
        return t(I18N_KEYS.lifeTopicRental, uiPreferencesStore.locale)
      default:
        return t(I18N_KEYS.lifeTopicDefault, uiPreferencesStore.locale)
    }
  }

  switch (topic) {
    case 'daily':
      return localeText('日常倾诉', 'Daily Check-in')
    case 'mood':
      return localeText('情绪波动', 'Mood')
    case 'relationship':
      return localeText('关系困扰', 'Relationships')
    case 'future':
      return localeText('未来迷茫', 'Future')
    case 'night':
      return localeText('夜谈树洞', 'Late Night')
    default:
      return sectionLabel('psychology')
  }
}

function formatRelativeTime(rawTime?: string) {
  if (!rawTime) {
    return t(I18N_KEYS.commonTimeJustNow, uiPreferencesStore.locale)
  }
  const createdAt = new Date(rawTime).getTime()
  if (Number.isNaN(createdAt)) {
    return rawTime
  }
  const diffMs = Date.now() - createdAt
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) {
    return t(I18N_KEYS.commonTimeJustNow, uiPreferencesStore.locale)
  }
  if (diffMinutes < 60) {
    return t(I18N_KEYS.commonTimeMinutesAgo, uiPreferencesStore.locale, { count: diffMinutes })
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return t(I18N_KEYS.commonTimeHoursAgo, uiPreferencesStore.locale, { count: diffHours })
  }
  const diffDays = Math.floor(diffHours / 24)
  return t(I18N_KEYS.commonTimeDaysAgo, uiPreferencesStore.locale, { count: diffDays })
}

function replacePost(updatedPost: Partial<Post> & { $id: string }) {
  myPosts.value = myPosts.value.map((item) =>
    item.$id === updatedPost.$id
      ? {
          ...item,
          ...updatedPost
        }
      : item
  )
}

function resetEditor() {
  editingPostId.value = ''
  editingContent.value = ''
  editingImages.value = []
}

function isCancelError(error: unknown) {
  return /cancel/i.test(extractErrorMessage(error))
}

function normalizeEditingImage(item: unknown) {
  const source = item as ChooseImageTempFile
  const localPath = String(source?.path || source?.tempFilePath || '').trim()
  if (!localPath) {
    return null
  }
  return {
    localPath,
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined
  } as EditorImageAsset
}

function normalizeExistingImage(url: unknown) {
  const value = String(url || '').trim()
  if (!value) {
    return null
  }
  return {
    localPath: value,
    uploadedUrl: value
  } as EditorImageAsset
}

function previewPostImages(images: string[], current: string) {
  if (!images.length || typeof uni?.previewImage !== 'function') {
    return
  }
  uni.previewImage({
    urls: images,
    current
  })
}

function navigateToLogin() {
  uni.navigateTo({
    url: '/pages/mine/login?redirect=' + encodeURIComponent('/pages/mine/posts')
  })
}

function navigateToRegister() {
  uni.navigateTo({
    url: '/pages/mine/register?redirect=' + encodeURIComponent('/pages/mine/posts')
  })
}

function goBack() {
  const pageStack = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pageStack.length > 1) {
    uni.navigateBack({
      delta: 1
    })
    return
  }
  uni.switchTab({
    url: '/pages/mine/index'
  })
}

function goToPostDetail(post: Post) {
  const section = resolvePostSection(post)
  uni.navigateTo({
    url: `/pages/${section}/post-detail?id=${encodeURIComponent(String(post.$id || ''))}`
  })
}

function startEditing(post: Post) {
  if (post.status === 'deleted') {
    return
  }
  editingPostId.value = post.$id
  editingContent.value = String(post.content || '')
  editingImages.value = Array.isArray(post.images)
    ? post.images
        .map((item) => normalizeExistingImage(item))
        .filter((item): item is EditorImageAsset => Boolean(item))
    : []
}

function cancelEditing() {
  resetEditor()
}

async function chooseEditingImages() {
  if (savingPostId.value) {
    return
  }
  const remainCount = MAX_EDIT_IMAGES - editingImages.value.length
  if (remainCount <= 0) {
    toast(localeText(`最多 ${MAX_EDIT_IMAGES} 张图片`, `Max ${MAX_EDIT_IMAGES} images`))
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

    const selected: EditorImageAsset[] = []
    const tempFiles = Array.isArray(result.tempFiles) ? result.tempFiles : []
    tempFiles.forEach((item) => {
      const normalized = normalizeEditingImage(item)
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

    editingImages.value = [...editingImages.value, ...selected].slice(0, MAX_EDIT_IMAGES)
  } catch (error) {
    if (isCancelError(error)) {
      return
    }
    console.error('Choose post images failed:', error)
    toast(localeText('选择图片失败', 'Failed to choose images'))
  }
}

function removeEditingImage(index: number) {
  if (savingPostId.value) {
    return
  }
  editingImages.value.splice(index, 1)
}

function previewEditingImages(current: string) {
  const urls = editingImages.value
    .map((item) => item.localPath)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (!urls.length || typeof uni?.previewImage !== 'function') {
    return
  }
  uni.previewImage({
    urls,
    current
  })
}

async function resolveEditingImageUrls() {
  if (!editingImages.value.length) {
    return [] as string[]
  }

  const resolvedUrls: string[] = []
  for (let index = 0; index < editingImages.value.length; index += 1) {
    const asset = editingImages.value[index]
    if (asset.uploadedUrl) {
      resolvedUrls.push(asset.uploadedUrl)
      continue
    }

    editingImages.value[index] = {
      ...asset,
      uploading: true
    }

    try {
      const url = await uploadPostImage({
        localPath: asset.localPath,
        file: asset.file
      })
      resolvedUrls.push(url)
      const latest = editingImages.value[index]
      if (latest) {
        editingImages.value[index] = {
          ...latest,
          localPath: url,
          uploadedUrl: url,
          uploading: false
        }
      }
    } catch (error) {
      const latest = editingImages.value[index]
      if (latest) {
        editingImages.value[index] = {
          ...latest,
          uploading: false
        }
      }
      throw error
    }
  }

  return resolvedUrls
}

async function saveEditing(post: Post) {
  if (savingPostId.value) {
    return
  }
  const content = editingContent.value.trim()
  if (!content) {
    toast(localeText('请输入帖子内容', 'Please enter post content'))
    return
  }
  savingPostId.value = post.$id
  try {
    const images = await resolveEditingImageUrls()
    const updatedPost = await postsService.updateMyPost(post.$id, {
      content,
      images
    })
    replacePost({
      ...post,
      ...updatedPost,
      content,
      images
    })
    resetEditor()
    const section = String((post as Record<string, unknown>).section || '')
    if (section) {
      invalidateCache(`${section}-posts`)
    }
    toast(localeText('帖子已更新', 'Post updated'), 'success')
  } catch (error) {
    console.error('update my post failed:', error)
    toast(extractErrorMessage(error) || localeText('更新失败，请重试', 'Update failed'))
  } finally {
    savingPostId.value = ''
  }
}

async function changePostStatus(post: Post, nextStatus: Exclude<PostStatus, 'deleted'>) {
  if (mutatingPostId.value) {
    return
  }
  mutatingPostId.value = post.$id
  try {
    const updatedPost = await postsService.updateMyPost(post.$id, {
      status: nextStatus
    })
    replacePost({
      ...post,
      ...updatedPost,
      status: nextStatus
    })
    const section = String((post as Record<string, unknown>).section || '')
    if (section) {
      invalidateCache(`${section}-posts`)
    }
    if (nextStatus === 'draft') {
      toast(localeText('已移入草稿箱', 'Moved to draft'), 'success')
    } else {
      toast(localeText('已恢复发布', 'Republished'), 'success')
    }
  } catch (error) {
    console.error('change post status failed:', error)
    toast(
      extractErrorMessage(error) ||
        (nextStatus === 'draft'
          ? localeText('操作失败，请重试', 'Action failed')
          : localeText('恢复失败，请重试', 'Restore failed'))
    )
  } finally {
    mutatingPostId.value = ''
  }
}

async function restorePost(post: Post) {
  await changePostStatus(post, 'published')
}

function confirmDelete(post: Post) {
  if (mutatingPostId.value) {
    return
  }
  uni.showModal({
    title: deleteTitle.value,
    content: deleteContent.value,
    success: async (modalRes) => {
      if (!modalRes.confirm) {
        return
      }
      mutatingPostId.value = post.$id
      try {
        await postsService.deleteMyPost(post.$id)
        replacePost({
          ...post,
          status: 'deleted'
        })
        if (editingPostId.value === post.$id) {
          resetEditor()
        }
        const section = String((post as Record<string, unknown>).section || '')
        if (section) {
          invalidateCache(`${section}-posts`)
        }
        toast(localeText('帖子已删除', 'Post deleted'), 'success')
      } catch (error) {
        console.error('delete my post failed:', error)
        toast(extractErrorMessage(error) || localeText('删除失败，请重试', 'Delete failed'))
      } finally {
        mutatingPostId.value = ''
      }
    }
  })
}

function openPostMenu(post: Post) {
  const actions: Array<{ label: string; handler: () => void | Promise<void> }> = []

  if (post.status === 'deleted') {
    actions.push({
      label: restoreLabel.value,
      handler: () => restorePost(post)
    })
  } else if (post.status === 'published') {
    actions.push({
      label: localeText('转为草稿', 'Move to Draft'),
      handler: () => changePostStatus(post, 'draft')
    })
  } else {
    actions.push({
      label: localeText('重新发布', 'Republish'),
      handler: () => changePostStatus(post, 'published')
    })
  }

  actions.push({
    label: localeText('查看原帖', 'View Source'),
    handler: () => goToPostDetail(post)
  })

  uni.showActionSheet({
    itemList: actions.map((item) => item.label),
    success: async (res) => {
      await actions[res.tapIndex]?.handler()
    }
  })
}

async function loadMyPosts() {
  if (!authStore.isLoggedIn) {
    myPosts.value = []
    postsError.value = ''
    resetEditor()
    return
  }

  loadingPosts.value = true
  postsError.value = ''
  try {
    const rows = await postsService.getMyPosts({
      limit: 100
    })
    myPosts.value = rows
  } catch (error) {
    console.error('load my posts failed:', error)
    postsError.value = extractErrorMessage(error) || t(I18N_KEYS.commonLoadError, uiPreferencesStore.locale)
  } finally {
    loadingPosts.value = false
  }
}

function hideNativeTabBar() {
  if (typeof uni?.hideTabBar !== 'function') {
    return
  }
  uni.hideTabBar({
    animation: false
  })
}

onShow(async () => {
  hideNativeTabBar()
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('mine')
  await authStore.init()
  if (authStore.isLoggedIn) {
    await authStore.refreshProfile()
    await loadMyPosts()
  } else {
    myPosts.value = []
  }
})

onHide(() => {
  resetEditor()
})
</script>

<style lang="scss" scoped>
.mine-posts-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 64rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f8f6;
  --surface: #ffffff;
  --surface-soft: #f8fbf8;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(111, 222, 129, 0.18);
  --line-strong: rgba(111, 222, 129, 0.26);
  --topbar-bg: rgba(246, 248, 246, 0.9);
}

.theme-dark {
  --page-bg: #131f15;
  --surface: rgba(15, 30, 20, 0.78);
  --surface-soft: rgba(20, 38, 26, 0.88);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(111, 222, 129, 0.3);
  --line-strong: rgba(111, 222, 129, 0.44);
  --topbar-bg: rgba(19, 31, 21, 0.9);
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

    &:active {
      opacity: 0.72;
    }
  }

  .right {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  .title {
    color: var(--text-main);
    font-size: 34rpx;
    font-weight: 700;
  }
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.72;
  }
}

.guest-card {
  margin-top: 18rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 28rpx;
}

.guest-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(111, 222, 129, 0.14);
}

.guest-title {
  margin-top: 18rpx;
  display: block;
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.guest-subtitle {
  margin-top: 10rpx;
  display: block;
  color: var(--text-sub);
  font-size: 24rpx;
  line-height: 1.6;
}

.guest-preview {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16rpx;
}

.guest-preview-card {
  border-radius: 20rpx;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  padding: 18rpx;
}

.guest-preview-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.guest-preview-title {
  color: var(--text-main);
  font-size: 22rpx;
  font-weight: 700;
}

.guest-preview-subtitle {
  margin-top: 10rpx;
  display: block;
  color: var(--text-soft);
  font-size: 20rpx;
  line-height: 1.5;
}

.guest-actions {
  margin-top: 20rpx;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.primary-btn,
.secondary-btn {
  border-radius: 16rpx;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;

  &:active {
    opacity: 0.72;
  }
}

.primary-btn {
  background: #6fde81;
}

.primary-btn-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
}

.secondary-btn {
  background: transparent;
  border-color: var(--line);
}

.secondary-btn-text {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 600;
}

.hero-card {
  margin-top: 18rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 28rpx;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-bottom: 20rpx;
  border-bottom: 1px solid var(--line);
}

.hero-kicker {
  color: #6fde81;
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.theme-dark .hero-kicker {
  color: #8be59a;
}

.hero-title {
  color: var(--text-main);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.28;
}

.theme-dark .hero-title {
  color: var(--text-main);
}

.hero-subtitle {
  color: var(--text-sub);
  font-size: 24rpx;
  line-height: 1.6;
}

.theme-dark .hero-subtitle {
  color: var(--text-sub);
}


.hero-zones {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.zone-pill {
  border-radius: 18rpx;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  padding: 18rpx;
}

.theme-dark .zone-pill {
  background: var(--surface-soft);
}

.zone-pill-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.zone-pill-title {
  color: rgba(15, 23, 42, 0.68);
  font-size: 20rpx;
  font-weight: 600;
}

.theme-dark .zone-pill-title {
  color: rgba(248, 250, 252, 0.68);
}

.zone-pill-value {
  margin-top: 10rpx;
  display: block;
  color: #0f172a;
  font-size: 34rpx;
  font-weight: 700;
}

.theme-dark .zone-pill-value {
  color: #f8fafc;
}

.hero-glow,
.hero-glow-study,
.hero-glow-life,
.hero-glow-psychology {
  display: none;
}

.stats-card {
  margin-top: 22rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
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
  border-left: 1px solid var(--line);
  border-right: 1px solid var(--line);
}

.stat-value {
  color: var(--text-main);
  font-size: 40rpx;
  font-weight: 700;
}

.stat-label {
  color: var(--text-soft);
  font-size: 21rpx;
  text-transform: uppercase;
  letter-spacing: 1rpx;
}

.section-title-row {
  margin-top: 30rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.section-title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.section-action {
  color: #6fde81;
  font-size: 24rpx;
  font-weight: 600;

  &:active {
    opacity: 0.72;
  }
}

.quick-scroll {
  width: 100%;
}

.quick-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.quick-grid.is-overflow {
  width: max-content;
  grid-template-columns: none;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  grid-auto-flow: column;
  grid-auto-columns: 324rpx;
}

.quick-card {
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;

  &:active {
    opacity: 0.82;
  }
}

.quick-card.active {
  border-color: var(--line-strong);
}

.quick-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.quick-icon {
  width: 62rpx;
  height: 62rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(111, 222, 129, 0.16);
}

.quick-card--pending_review .quick-icon {
  background: rgba(245, 158, 11, 0.16);
}

.quick-card--draft .quick-icon {
  background: rgba(74, 144, 226, 0.14);
}

.quick-card--deleted .quick-icon {
  background: rgba(239, 68, 68, 0.14);
}

.quick-title {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.quick-value {
  color: var(--text-main);
  font-size: 40rpx;
  font-weight: 700;
}

.quick-subtitle {
  color: var(--text-soft);
  font-size: 22rpx;
  line-height: 1.6;
}

.filter-card {
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
}

.filter-group + .filter-group {
  margin-top: 18rpx;
}

.filter-label {
  color: var(--text-main);
  font-size: 24rpx;
  font-weight: 700;
}

.chip-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.filter-chip {
  min-height: 44rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  padding: 0 14rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: var(--text-sub);
  font-size: 21rpx;
  font-weight: 600;

  &:active {
    opacity: 0.72;
  }
}

.filter-chip.active {
  color: #3d8c4d;
  background: rgba(111, 222, 129, 0.14);
  border-color: var(--line-strong);
}

.theme-dark .filter-chip.active {
  color: #8be59a;
}

.filter-count {
  color: var(--text-soft);
  font-size: 20rpx;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.state-card,
.post-card {
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
  padding: 22rpx;
}

.state-card {
  text-align: center;
}

.state-title {
  display: block;
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
}

.state-text {
  margin-top: 10rpx;
  display: block;
  color: var(--text-sub);
  font-size: 24rpx;
  line-height: 1.6;
}

.post-card--study {
  box-shadow: inset 6rpx 0 0 rgba(74, 144, 226, 0.36);
}

.post-card--life {
  box-shadow: inset 6rpx 0 0 rgba(244, 157, 37, 0.38);
}

.post-card--psychology {
  box-shadow: inset 6rpx 0 0 rgba(136, 111, 222, 0.38);
}

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.post-badges {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.source-badge,
.info-badge,
.status-badge {
  min-height: 40rpx;
  border-radius: 999rpx;
  padding: 0 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5rpx;
}

.source-badge--study {
  background: rgba(74, 144, 226, 0.14);
  color: #4A90E2;
}

.source-badge--life {
  background: rgba(244, 157, 37, 0.16);
  color: #d97706;
}

.source-badge--psychology {
  background: rgba(136, 111, 222, 0.16);
  color: #7359d3;
}

.info-badge {
  background: rgba(148, 163, 184, 0.16);
  color: #64748b;
}

.status-badge--published {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
}

.status-badge--pending_review {
  background: rgba(245, 158, 11, 0.16);
  color: #d97706;
}

.status-badge--draft {
  background: rgba(59, 130, 246, 0.14);
  color: #2563eb;
}

.status-badge--deleted {
  background: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}

.post-time {
  color: var(--text-soft);
  font-size: 22rpx;
  flex-shrink: 0;
}

.post-content {
  margin-top: 12rpx;
  display: block;
  color: var(--text-main);
  font-size: 24rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

.post-images {
  margin-top: 12rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.post-images.single {
  grid-template-columns: minmax(0, 1fr);
}

.post-image-wrap {
  position: relative;
  height: 176rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: rgba(111, 222, 129, 0.08);
}

.post-images.single .post-image-wrap {
  height: 320rpx;
}

.post-image {
  width: 100%;
  height: 100%;
}

.more-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-text {
  color: #f8fafc;
  font-size: 30rpx;
  font-weight: 700;
}

.post-footer {
  margin-top: 14rpx;
  padding-top: 12rpx;
  border-top: 1px dashed var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.engagement,
.manage-actions {
  display: flex;
  align-items: center;
  gap: 18rpx;
  flex-wrap: wrap;
}

.manage-actions {
  justify-content: flex-end;
  gap: 12rpx;
  row-gap: 10rpx;
}

.engagement-item,
.manage-btn {
  display: flex;
  align-items: center;
  gap: 5rpx;
  color: var(--text-soft);
  font-size: 21rpx;
}

.manage-btn {
  min-height: 56rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  color: var(--text-main);
  font-weight: 600;

  &:active {
    opacity: 0.72;
  }
}

.manage-btn.primary {
  background: rgba(111, 222, 129, 0.16);
  border-color: rgba(111, 222, 129, 0.3);
  color: #15803d;
}

.manage-btn.ghost {
  color: var(--text-sub);
}

.manage-btn.danger {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}

.manage-btn.success {
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.24);
  color: #15803d;
}

.manage-btn.disabled,
.editor-btn.disabled {
  opacity: 0.48;
}

.editor-card {
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 1px dashed var(--line);
}

.editor-textarea {
  width: 100%;
  min-height: 180rpx;
  box-sizing: border-box;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  padding: 22rpx;
  color: var(--text-main);
  font-size: 24rpx;
  line-height: 1.6;
}

.editor-image-head {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.editor-image-title {
  color: var(--text-main);
  font-size: 24rpx;
  font-weight: 600;
}

.editor-image-grid {
  margin-top: 12rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.editor-image-item {
  position: relative;
  height: 168rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: rgba(111, 222, 129, 0.08);
}

.editor-image {
  width: 100%;
  height: 100%;
}

.editor-add-item {
  border: 1px dashed rgba(111, 222, 129, 0.42);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: var(--surface-soft);
}

.editor-add-item.disabled {
  opacity: 0.6;
}

.editor-add-text {
  color: #15803d;
  font-size: 22rpx;
  font-weight: 600;
}

.editor-remove-btn {
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

.editor-uploading-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-uploading-text {
  color: #f8fafc;
  font-size: 20rpx;
}

.editor-toolbar {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.editor-meta {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.editor-count,
.editor-note {
  color: var(--text-soft);
  font-size: 20rpx;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.editor-btn {
  min-width: 132rpx;
  min-height: 64rpx;
  border-radius: 14rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;

  &:active {
    opacity: 0.72;
  }
}

.editor-btn text {
  font-size: 24rpx;
  font-weight: 600;
}

.editor-btn.subtle {
  border-color: var(--line);
  background: transparent;
}

.editor-btn.solid {
  background: #6fde81;
}

.editor-btn.subtle text {
  color: var(--text-main);
}

.editor-btn.solid text {
  color: #ffffff;
}

@media screen and (max-width: 520px) {
  .mine-posts-page {
    padding-bottom: 40rpx;
  }

  .guest-preview,
  .hero-zones,
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor-image-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .post-meta,
  .post-footer,
  .editor-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .post-time {
    margin-top: 4rpx;
  }

  .manage-actions {
    justify-content: flex-start;
  }

  .guest-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
