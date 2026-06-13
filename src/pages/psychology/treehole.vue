<template>
  <view :class="['treehole-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="loadPosts">
          <Icon name="refresh" :size="20" :color="iconColor" />
        </view>
      </view>
    </view>

    <view class="composer-card">
      <view class="composer-header">
        <view class="composer-icon">
          <Icon name="forum" :size="20" color="#886fde" />
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
        <text class="field-title">{{ moodTitle }}</text>
        <view class="chip-row">
          <view
            v-for="item in moodOptions"
            :key="item.value"
            class="chip"
            :class="{ active: draftMood === item.value }"
            @tap="draftMood = item.value"
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
            <Icon name="add_photo_alternate" :size="22" color="#886fde" />
            <text class="draft-add-text">{{ addImageLabel }}</text>
          </view>
        </view>
      </view>

      <view class="composer-row">
        <view class="switch-wrap">
          <text class="switch-label">{{ anonymousLabel }}</text>
          <switch :checked="isAnonymous" color="#886fde" @change="onAnonymousSwitch" />
        </view>
        <view class="submit-btn" :class="{ disabled: submitting }" @tap="createPost">
          <text class="submit-text">{{ submitting ? publishingLabel : submitLabel }}</text>
        </view>
      </view>
    </view>

    <view class="list-title-row">
      <text class="list-title">{{ listTitle }}</text>
      <text class="list-count">{{ posts.length }}{{ countSuffix }}</text>
    </view>

    <view class="post-list">
      <view v-if="loading && !posts.length" class="state-card">
        <text class="state-text">{{ loadingText }}</text>
      </view>
      <view v-else-if="!posts.length" class="state-card">
        <text class="state-text">{{ emptyText }}</text>
      </view>

      <view v-for="item in enrichedPosts" :key="item.$id" class="post-card" @tap="goPostDetail(item.$id)">
        <view class="post-meta">
          <view class="meta-tags">
            <view class="meta-chip topic">{{ topicLabel(item.topic) }}</view>
            <view v-if="item.mood" class="meta-chip mood">{{ moodLabel(item.mood) }}</view>
            <view class="meta-chip risk" :class="riskToneClass(item.riskLevel)">{{ riskLabel(item.riskLevel) }}</view>
            <view v-if="item.isAnonymous" class="meta-chip anonymous">{{ anonymousBadge }}</view>
            <view v-if="item._images.length" class="meta-chip media">
              <Icon name="image" :size="12" color="#7c69c9" />
              <text>{{ imageLabel(item._images.length) }}</text>
            </view>
          </view>
          <text class="time">{{ formatTime(item.$createdAt) }}</text>
        </view>

        <text class="content">{{ item.content }}</text>

        <view v-if="item._images.length" :class="['post-images', { single: item._images.length === 1 }]">
          <view
            v-for="(image, index) in item._images.slice(0, 3)"
            :key="`${item.$id}-${image}-${index}`"
            class="post-image-wrap"
            @tap.stop="previewPostImages(item._images, image)"
          >
            <image class="post-image" :src="image" mode="aspectFill" lazy-load />
            <view v-if="index === 2 && item._images.length > 3" class="more-mask">
              <text class="more-text">+{{ item._images.length - 3 }}</text>
            </view>
          </view>
        </view>

        <view class="post-footer">
          <view class="author">
            <view class="author-avatar">
              <image
                v-if="item._avatar"
                :src="item._avatar"
                class="avatar-image"
                mode="aspectFill"
                lazy-load
              />
              <Icon
                v-else
                name="person"
                :size="14"
                color="#94a3b8"
              />
            </view>
            <text class="author-text">{{ authorLabel(item) }}</text>
          </view>
          <view class="actions">
            <view class="action-item" :class="{ active: item.isLiked }" @tap.stop="handleLike(item)">
              <Icon
                name="favorite"
                :size="16"
                :color="item.isLiked ? '#F43F5E' : '#94a3b8'"
              />
              <text class="action-text">{{ Number(item.likeCount || 0) }}</text>
            </view>
            <view class="action-item" @tap.stop="goPostDetail(item.$id, true)">
              <Icon name="chat_bubble" :size="16" color="#94a3b8" />
              <text class="action-text">{{ Number(item.commentCount || 0) }}</text>
            </view>
            <view class="action-item compact" :class="{ saved: item.isSaved }" @tap.stop="handleSave(item)">
              <Icon name="bookmark" :size="16" :color="item.isSaved ? '#F59E0B' : '#94a3b8'" />
              <text class="action-text">{{ item.isSaved ? savedLabel : saveLabel }}</text>
            </view>
            <view class="action-item compact" @tap.stop="handleCommonAction">
              <Icon name="share" :size="16" color="#94a3b8" />
              <text class="action-text">{{ shareLabel }}</text>
            </view>
            <view
              v-if="isOwnedPost(item.$id)"
              class="action-item danger"
              @tap.stop="deletePost(item.$id)"
            >
              <Icon name="delete" :size="16" color="#ef4444" />
              <text class="action-text">{{ deleteLabel }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { Query } from 'appwrite'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import postsService from '@/services/posts'
import postInteractionsService from '@/services/post-interactions'
import { uploadPostImage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Post, PostMood, PostTopic } from '@/types/post'
import { requireAuth, redirectToLogin } from '@/utils/auth-guard'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'
import { getCached, setCache, invalidateCache } from '@/utils/posts-cache'

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

interface PostWithLikeState extends Post {
  isLiked?: boolean
  likeInteractionId?: string
  likePending?: boolean
  isSaved?: boolean
  saveInteractionId?: string
  savePending?: boolean
}

const MAX_DRAFT_IMAGES = 6
const PSYCHOLOGY_TOPICS = ['daily', 'mood', 'relationship', 'future', 'night'] as const
type PsychologyTopic = (typeof PSYCHOLOGY_TOPICS)[number]

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const posts = ref<PostWithLikeState[]>([])
const ownPostIds = ref<string[]>([])
const authorNameMap = ref<Record<string, string>>({})
const authorAvatarMap = ref<Record<string, string>>({})
const loading = ref(false)
const submitting = ref(false)
const draftContent = ref('')
const draftImages = ref<DraftImageAsset[]>([])
const isAnonymous = ref(true)
const draftTopic = ref<PostTopic>('daily')
const draftMood = ref<PostMood>('calm')

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const pageTitle = computed(() => (isZh.value ? '树洞广场' : 'Treehole'))
const composerLabel = computed(() => (isZh.value ? '写下真实想法，轻一点也没关系' : 'Share your thoughts, no pressure'))
const composerHint = computed(() =>
  isZh.value ? '按主题与情绪标记，后续更容易回看' : 'Tag by topic and mood for easier review'
)
const composerPlaceholder = computed(() =>
  isZh.value ? '记录你想说的话...' : 'Write what you want to say...'
)
const topicTitle = computed(() => (isZh.value ? '话题类型' : 'Topic'))
const moodTitle = computed(() => (isZh.value ? '当前心情' : 'Mood'))
const imageTitle = computed(() => (isZh.value ? '图片' : 'Images'))
const imageCountLabel = computed(() =>
  isZh.value
    ? `已选 ${draftImages.value.length}/${MAX_DRAFT_IMAGES}`
    : `${draftImages.value.length}/${MAX_DRAFT_IMAGES} selected`
)
const addImageLabel = computed(() => (isZh.value ? '添加图片' : 'Add image'))
const uploadingLabel = computed(() => (isZh.value ? '上传中...' : 'Uploading...'))
const anonymousLabel = computed(() => (isZh.value ? '匿名发布' : 'Post anonymously'))
const anonymousBadge = computed(() => (isZh.value ? '匿名' : 'Anon'))
const submitLabel = computed(() => (isZh.value ? '发布' : 'Post'))
const publishingLabel = computed(() => (isZh.value ? '发布中...' : 'Posting...'))
const listTitle = computed(() => (isZh.value ? '最新动态' : 'Latest posts'))
const countSuffix = computed(() => (isZh.value ? ' 条' : ' items'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const emptyText = computed(() => (isZh.value ? '还没有帖子，发一条吧' : 'No posts yet. Create one.'))
const deleteLabel = computed(() => (isZh.value ? '删除' : 'Delete'))
const saveLabel = computed(() => (isZh.value ? '收藏' : 'Save'))
const savedLabel = computed(() => (isZh.value ? '已收藏' : 'Saved'))
const shareLabel = computed(() => (isZh.value ? '分享' : 'Share'))
const canAddDraftImages = computed(() => draftImages.value.length < MAX_DRAFT_IMAGES)

interface EnrichedPost extends PostWithLikeState {
  _images: string[]
  _avatar: string
}
const enrichedPosts = computed<EnrichedPost[]>(() =>
  posts.value.map((item) => ({
    ...item,
    _images: postImages(item),
    _avatar: authorAvatar(item)
  }))
)

const topicOptions = computed(() => [
  { value: 'daily' as PostTopic, label: isZh.value ? '日常' : 'Daily' },
  { value: 'mood' as PostTopic, label: isZh.value ? '心情' : 'Mood' },
  { value: 'relationship' as PostTopic, label: isZh.value ? '关系' : 'Relationship' },
  { value: 'future' as PostTopic, label: isZh.value ? '未来' : 'Future' },
  { value: 'night' as PostTopic, label: isZh.value ? '深夜' : 'Night' }
])

function isPsychologyTopic(topic?: string): topic is PsychologyTopic {
  return Boolean(topic && (PSYCHOLOGY_TOPICS as readonly string[]).includes(topic))
}

const moodOptions = computed(() => [
  { value: 'calm' as PostMood, label: isZh.value ? '平静' : 'Calm' },
  { value: 'happy' as PostMood, label: isZh.value ? '开心' : 'Happy' },
  { value: 'anxious' as PostMood, label: isZh.value ? '焦虑' : 'Anxious' },
  { value: 'sad' as PostMood, label: isZh.value ? '低落' : 'Sad' },
  { value: 'angry' as PostMood, label: isZh.value ? '愤怒' : 'Angry' }
])

function goBack() {

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/psychology/index' })
  }
}

function handleCommonAction() {
  uni.showToast({
    title: isZh.value ? '互动功能开发中' : 'Interaction coming soon',
    icon: 'none'
  })
}

async function handleLike(item: PostWithLikeState) {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }

  if (item.likePending) {
    return
  }

  const prevLiked = !!item.isLiked
  const prevCount = Number(item.likeCount || 0)
  const prevInteractionId = item.likeInteractionId || ''

  // 乐观更新 UI
  item.likePending = true
  item.isLiked = !prevLiked
  item.likeCount = Math.max(0, prevCount + (item.isLiked ? 1 : -1))

  uni.showToast({
    title: item.isLiked
      ? isZh.value
        ? '温暖 +1'
        : 'Liked'
      : isZh.value
        ? '已取消'
        : 'Unliked',
    icon: 'none'
  })

  try {
    const result = await postInteractionsService.setMyLikeState(
      item.$id,
      item.isLiked!,
      prevInteractionId
    )

    if (result && typeof result.liked === 'boolean') {
      item.isLiked = result.liked
    }
    if (typeof result?.interactionId === 'string') {
      item.likeInteractionId = result.interactionId
    }
    if (typeof result?.likeCount === 'number') {
      item.likeCount = result.likeCount
    }

    if (
      result?.counterUpdated === false &&
      (result?.counterErrorCode === 401 || result?.counterErrorCode === 403)
    ) {
      setTimeout(() => {
        uni.showToast({
          title: isZh.value
            ? '点赞已记录，但无权限更新计数'
            : 'Like recorded but no permission to update count',
          icon: 'none'
        })
      }, 350)
    }
  } catch (error) {
    // 回滚乐观更新
    item.isLiked = prevLiked
    item.likeCount = prevCount
    item.likeInteractionId = prevInteractionId

    const errorMessage = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: errorMessage || (isZh.value ? '操作失败' : 'Operation failed'),
      icon: 'none'
    })
  } finally {
    item.likePending = false
  }
}

async function handleSave(item: PostWithLikeState) {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }

  if (item.savePending) {
    return
  }

  const prevSaved = !!item.isSaved
  const prevInteractionId = item.saveInteractionId || ''

  item.savePending = true
  item.isSaved = !prevSaved

  uni.showToast({
    title: item.isSaved
      ? isZh.value
        ? '已收藏'
        : 'Saved'
      : isZh.value
        ? '已取消收藏'
        : 'Unsaved',
    icon: 'none'
  })

  try {
    const result = await postInteractionsService.setMySaveState(
      item.$id,
      item.isSaved!,
      prevInteractionId
    )

    if (typeof result?.saved === 'boolean') {
      item.isSaved = result.saved
    }
    if (typeof result?.interactionId === 'string') {
      item.saveInteractionId = result.interactionId
    }
  } catch (error) {
    item.isSaved = prevSaved
    item.saveInteractionId = prevInteractionId

    const errorMessage = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: errorMessage || (isZh.value ? '操作失败' : 'Operation failed'),
      icon: 'none'
    })
  } finally {
    item.savePending = false
  }
}

function onAnonymousSwitch(event: { detail?: { value?: boolean } }) {
  isAnonymous.value = Boolean(event?.detail?.value)
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error || '')
}

function isCancelError(error: unknown) {
  return /cancel/i.test(extractErrorMessage(error))
}

function normalizeDraftImage(item: unknown) {
  const source = item as ChooseImageTempFile
  const localPath = (source?.path || source?.tempFilePath || '').trim()
  if (!localPath) {
    return null
  }
  return {
    localPath,
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined
  } as DraftImageAsset
}

async function chooseDraftImages() {
  if (submitting.value) {
    return
  }
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
    console.error('Choose treehole images failed:', error)
    uni.showToast({
      title: isZh.value ? '选择图片失败' : 'Failed to choose images',
      icon: 'none'
    })
  }
}

function removeDraftImage(index: number) {
  if (submitting.value) {
    return
  }
  draftImages.value.splice(index, 1)
}

function previewDraftImages(current: string) {
  const urls = draftImages.value
    .map((item) => item.localPath)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (!urls.length) {
    return
  }
  uni.previewImage({
    urls,
    current
  })
}

async function uploadDraftImages() {
  if (!draftImages.value.length) {
    return [] as string[]
  }
  const uploadedUrls: string[] = []
  for (let index = 0; index < draftImages.value.length; index += 1) {
    const asset = draftImages.value[index]
    draftImages.value[index] = {
      ...asset,
      uploading: true
    }
    try {
      const url = await uploadPostImage({
        localPath: asset.localPath,
        file: asset.file
      })
      uploadedUrls.push(url)
    } finally {
      const latest = draftImages.value[index]
      if (latest) {
        draftImages.value[index] = {
          ...latest,
          uploading: false
        }
      }
    }
  }
  return uploadedUrls
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

function authorLabel(item: Post) {
  if (item.isAnonymous) {
    return isZh.value ? '匿名用户' : 'Anonymous'
  }
  const authorId = String(item.authorId || '').trim()
  if (authorId) {
    return authorNameMap.value[authorId] || authorId
  }
  return isZh.value ? '用户' : 'User'
}

function authorAvatar(item: Post): string {
  // 如果是匿名，返回空字符串
  if (item.isAnonymous) {
    return ''
  }

  const authorId = String(item.authorId || '').trim()
  if (authorId && authorAvatarMap.value[authorId]) {
    return authorAvatarMap.value[authorId]
  }

  return ''
}

async function resolveAuthorNames(list: Post[]) {
  const missingAuthorIds = Array.from(
    new Set(
      list
        .map((item) => String(item.authorId || '').trim())
        .filter((authorId) => authorId && !authorNameMap.value[authorId])
    )
  )
  if (!missingAuthorIds.length) {
    return
  }

  const resolvedNameMap: Record<string, string> = {}
  const resolvedAvatarMap: Record<string, string> = {}

  try {
    const result = (await tablesDB.listRows(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, [
      Query.limit(Math.max(50, missingAuthorIds.length * 5))
    ])) as { rows?: Array<{ $id?: unknown; name?: unknown; avatar?: unknown }> }
    ;(result?.rows || []).forEach((row) => {
      const userId = String(row?.$id || '').trim()
      const name = typeof row?.name === 'string' ? row.name.trim() : ''
      const avatar = typeof row?.avatar === 'string' ? row.avatar.trim() : ''

      if (userId && missingAuthorIds.includes(userId)) {
        if (name) {
          resolvedNameMap[userId] = name
        }
        if (avatar) {
          resolvedAvatarMap[userId] = avatar
        }
      }
    })
  } catch {
    // ignore and continue with single-row fallback
  }

  const unresolvedAuthorIds = missingAuthorIds.filter(
    (authorId) => !resolvedNameMap[authorId] || !resolvedAvatarMap[authorId]
  )
  if (unresolvedAuthorIds.length) {
    const entries = await Promise.all(
      unresolvedAuthorIds.map(async (authorId) => {
        try {
          const row = (await tablesDB.getRow(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, authorId)) as {
            name?: unknown
            avatar?: unknown
          }
          const name = typeof row?.name === 'string' ? row.name.trim() : ''
          const avatar = typeof row?.avatar === 'string' ? row.avatar.trim() : ''

          return {
            authorId,
            name: name || authorId,
            avatar: avatar || ''
          }
        } catch {
          return {
            authorId,
            name: authorId,
            avatar: ''
          }
        }
      })
    )
    entries.forEach(({ authorId, name, avatar }) => {
      resolvedNameMap[authorId] = name
      if (avatar) {
        resolvedAvatarMap[authorId] = avatar
      }
    })
  }

  if (Object.keys(resolvedNameMap).length || Object.keys(resolvedAvatarMap).length) {
    authorNameMap.value = {
      ...authorNameMap.value,
      ...resolvedNameMap
    }
    authorAvatarMap.value = {
      ...authorAvatarMap.value,
      ...resolvedAvatarMap
    }
  }
}

function topicLabel(topic?: string) {
  if (!isPsychologyTopic(topic)) {
    return isZh.value ? '日常' : 'Daily'
  }
  const map: Record<PsychologyTopic, string> = isZh.value
    ? {
        daily: '日常',
        mood: '心情',
        relationship: '关系',
        future: '未来',
        night: '深夜'
      }
    : {
        daily: 'Daily',
        mood: 'Mood',
        relationship: 'Relationship',
        future: 'Future',
        night: 'Night'
      }
  return map[topic]
}

function moodLabel(mood?: string) {
  if (!mood) {
    return ''
  }
  const map: Record<string, string> = isZh.value
    ? {
        happy: '开心',
        calm: '平静',
        anxious: '焦虑',
        sad: '低落',
        angry: '愤怒'
      }
    : {
        happy: 'Happy',
        calm: 'Calm',
        anxious: 'Anxious',
        sad: 'Sad',
        angry: 'Angry'
      }
  return map[mood] || mood
}

function riskToneClass(riskLevel?: number) {
  const level = Math.min(3, Math.max(1, Number(riskLevel || 1)))
  if (level === 3) {
    return 'high'
  }
  if (level === 2) {
    return 'mid'
  }
  return 'low'
}

function riskLabel(riskLevel?: number) {
  const level = Math.min(3, Math.max(1, Number(riskLevel || 1)))
  if (isZh.value) {
    if (level === 3) {
      return `风险 Lv${level}`
    }
    if (level === 2) {
      return `关注 Lv${level}`
    }
    return `稳定 Lv${level}`
  }
  if (level === 3) {
    return `Risk Lv${level}`
  }
  if (level === 2) {
    return `Watch Lv${level}`
  }
  return `Stable Lv${level}`
}

function imageLabel(count: number) {
  return isZh.value ? `${count} 图` : `${count} img`
}

function postImages(item: Post) {
  return Array.isArray(item.images)
    ? item.images.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
}

function previewPostImages(images: string[], current: string) {
  if (!images.length) {
    return
  }
  uni.previewImage({
    urls: images,
    current
  })
}

function goPostDetail(postId?: string, focusComment = false) {
  const id = String(postId || '').trim()
  if (!id) {
    return
  }
  const query = [`id=${encodeURIComponent(id)}`]
  if (focusComment) {
    query.push('focus=comment')
  }
  uni.navigateTo({
    url: `/pages/psychology/post-detail?${query.join('&')}`
  })
}

function isOwnedPost(postId?: string) {
  return Boolean(postId && ownPostIds.value.includes(postId))
}

async function loadPosts() {
  const cached = getCached<PostWithLikeState[]>('psychology-posts')
  if (cached) {
    posts.value = cached
  }
  loading.value = !cached
  try {
    const [publicPosts, myPosts] = await Promise.all([
      postsService.getPublicPosts({ section: 'psychology', status: 'published', limit: 50 }),
      postsService.getMyPosts({ section: 'psychology', limit: 100 })
    ])
    const visiblePublicPosts = publicPosts.filter((item) => isPsychologyTopic(String(item.topic || '')))
    const visibleMyPosts = myPosts.filter((item) => isPsychologyTopic(String(item.topic || '')))

    await resolveAuthorNames(visiblePublicPosts)

    if (authStore.isLoggedIn && visiblePublicPosts.length > 0) {
      const postIds = visiblePublicPosts.map((p) => p.$id)
      const [likeMap, saveMap] = await Promise.all([
        postInteractionsService.getMyLikesForPosts(postIds),
        postInteractionsService.getMySavesForPosts(postIds)
      ])

      visiblePublicPosts.forEach((post) => {
        const like = likeMap.get(post.$id)
        const save = saveMap.get(post.$id)
        if (like) {
          ;(post as PostWithLikeState).isLiked = true
          ;(post as PostWithLikeState).likeInteractionId = like.$id
        }
        if (save) {
          ;(post as PostWithLikeState).isSaved = true
          ;(post as PostWithLikeState).saveInteractionId = save.$id
        }
      })
    }

    const result = visiblePublicPosts as PostWithLikeState[]
    posts.value = result
    setCache('psychology-posts', result)
    ownPostIds.value = visibleMyPosts.map((item) => item.$id)
  } catch (error) {
    console.error('Load treehole posts failed:', error)
    if (!cached) {
      uni.showToast({
        title: isZh.value ? '加载帖子失败' : 'Failed to load posts',
        icon: 'none'
      })
    }
  } finally {
    loading.value = false
  }
}

async function createPost() {
  if (submitting.value) {
    return
  }
  const content = draftContent.value.trim()
  if (!content) {
    uni.showToast({
      title: isZh.value ? '请输入内容' : 'Please input content',
      icon: 'none'
    })
    return
  }

  submitting.value = true
  try {
    const topic = isPsychologyTopic(draftTopic.value) ? draftTopic.value : 'daily'
    const images = await uploadDraftImages()
    await postsService.createPost({
      content,
      section: 'psychology',
      isAnonymous: isAnonymous.value,
      status: 'published',
      topic,
      mood: draftMood.value,
      riskLevel: 1,
      images
    })
    draftContent.value = ''
    draftImages.value = []
    isAnonymous.value = true
    draftTopic.value = 'daily'
    draftMood.value = 'calm'
    invalidateCache('psychology-posts')
    uni.showToast({
      title: isZh.value ? '发布成功' : 'Posted',
      icon: 'success'
    })
    await loadPosts()
  } catch (error) {
    console.error('Create post failed:', error)
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
      icon: 'none'
    })
  } finally {
    submitting.value = false
  }
}

async function deletePost(postId?: string) {
  if (!postId) {
    return
  }
  const postsSnapshot = posts.value.slice()
  const ownIdsSnapshot = ownPostIds.value.slice()

  posts.value = posts.value.filter((item) => item.$id !== postId)
  ownPostIds.value = ownPostIds.value.filter((id) => id !== postId)
  invalidateCache('psychology-posts')
  uni.showToast({
    title: isZh.value ? '已删除' : 'Deleted',
    icon: 'success'
  })

  try {
    await postsService.deletePost(postId)
  } catch (error) {
    console.error('Delete post failed:', error)
    posts.value = postsSnapshot
    ownPostIds.value = ownIdsSnapshot
    uni.showToast({
      title: isZh.value ? '删除失败，已恢复' : 'Delete failed, restored',
      icon: 'none'
    })
  }
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  if (!requireAuth('/pages/psychology/treehole')) {
    return
  }
  await authStore.refreshProfile()
  await loadPosts()
})
</script>

<style lang="scss" scoped>
.treehole-page {
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

.composer-card {
  margin-top: 14rpx;
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
  min-height: 180rpx;
  color: var(--text-main);
  font-size: 26rpx;
}

.field-block {
  margin-top: 14rpx;
}

.field-title {
  color: var(--text-sub);
  font-size: 22rpx;
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
  background: rgba(136, 111, 222, 0.2);
  color: #7359d3;
  border-color: rgba(136, 111, 222, 0.36);
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
  background: rgba(136, 111, 222, 0.08);
}

.draft-image {
  width: 100%;
  height: 100%;
}

.draft-add-item {
  border: 1px dashed rgba(136, 111, 222, 0.42);
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
  color: #7359d3;
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
  background: #886fde;
  padding: 12rpx 28rpx;
  box-shadow: 0 8rpx 18rpx rgba(136, 111, 222, 0.28);
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

.post-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.post-card,
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

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meta-tags {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.meta-chip {
  min-height: 40rpx;
  border-radius: 999rpx;
  padding: 0 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5rpx;
}

.meta-chip.topic {
  background: rgba(136, 111, 222, 0.16);
  color: #7359d3;
}

.meta-chip.mood {
  background: rgba(59, 130, 246, 0.14);
  color: #2563eb;
}

.meta-chip.risk.low {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
}

.meta-chip.risk.mid {
  background: rgba(245, 158, 11, 0.16);
  color: #d97706;
}

.meta-chip.risk.high {
  background: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}

.meta-chip.anonymous {
  background: rgba(148, 163, 184, 0.16);
  color: #64748b;
}

.meta-chip.media {
  background: rgba(136, 111, 222, 0.08);
  color: #7c69c9;
}

.time {
  color: var(--text-soft);
  font-size: 22rpx;
}

.content {
  margin-top: 12rpx;
  display: block;
  color: var(--text-main);
  font-size: 24rpx;
  line-height: 1.6;
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
  background: rgba(136, 111, 222, 0.08);
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
}

.author {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.author-avatar {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(136, 111, 222, 0.08);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-text {
  color: var(--text-sub);
  font-size: 22rpx;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 5rpx;

  &:active {
    opacity: 0.7;
  }
}

.action-item.active .action-text {
  color: #F43F5E;
}

.action-item.saved .action-text {
  color: #F59E0B;
}

.action-item.compact {
  gap: 4rpx;
}

.action-item.danger .action-text {
  color: #ef4444;
}

.action-text {
  color: var(--text-soft);
  font-size: 21rpx;
}
</style>
