<template>
  <view :class="['study-detail-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="reload">
          <Icon name="refresh" :size="20" :color="iconColor" />
        </view>
      </view>
    </view>

    <view class="hero-strip">
      <view class="hero-inner">
        <Icon name="school" :size="24" color="#4A90E2" />
        <text class="hero-title">{{ heroTitle }}</text>
      </view>
      <text class="hero-subtitle">{{ heroSubtitle }}</text>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">{{ loadingText }}</text>
    </view>

    <view v-else-if="errorMessage" class="state-card error">
      <text class="state-text">{{ errorMessage }}</text>
      <view class="retry-btn" @tap="reload">
        <text class="retry-text">{{ retryText }}</text>
      </view>
    </view>

    <view v-else-if="post" class="detail-wrap">
      <view class="post-card">
        <view class="post-meta">
          <view class="meta-tags">
            <view class="meta-chip topic">{{ post.badge }}</view>
            <view class="meta-chip context">
              <Icon name="bookmark_added" :size="12" color="#3f7dcb" />
              <text>{{ post.contextLabel }}</text>
            </view>
            <view v-if="post.imageCount > 0" class="meta-chip media">
              <Icon name="image" :size="12" color="#2f6fbc" />
              <text>{{ post.imageLabel }}</text>
            </view>
          </view>
          <text class="time">{{ post.time }}</text>
        </view>

        <text class="content">{{ post.content }}</text>

        <view v-if="post.images.length" :class="['post-images', { single: post.images.length === 1 }]">
          <view
            v-for="(image, index) in post.images.slice(0, 3)"
            :key="`${post.id}-${image}-${index}`"
            class="post-image-wrap"
            @tap.stop="previewPostImages(post.images, image)"
          >
            <image class="post-image" :src="image" mode="aspectFill" lazy-load />
            <view v-if="index === 2 && post.images.length > 3" class="more-mask">
              <text class="more-text">+{{ post.images.length - 3 }}</text>
            </view>
          </view>
        </view>

        <view class="post-footer">
          <view class="author" @tap="navigateToAuthorProfile">
            <view class="author-avatar">
              <image
                v-if="post.avatar"
                :src="post.avatar"
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
            <view class="author-meta">
              <text class="author-text">{{ post.user }}</text>
              <text class="author-id">{{ authorLabel }}</text>
            </view>
          </view>
          <view class="action-row">
            <view class="action-item" :class="{ active: post.isLiked }" @tap="handleLike">
              <Icon name="favorite" :size="16" :color="post.isLiked ? '#F43F5E' : '#94a3b8'" />
              <text class="action-text">{{ Number(post.likeCount || 0) }}</text>
            </view>
            <view class="action-item" @tap="focusCommentEditor">
              <Icon name="chat_bubble" :size="16" color="#94a3b8" />
              <text class="action-text">{{ Number(post.commentCount || 0) }}</text>
            </view>
            <view class="action-item compact" :class="{ saved: post.isSaved }" @tap="handleSave">
              <Icon name="bookmark" :size="16" :color="post.isSaved ? '#F59E0B' : '#94a3b8'" />
              <text class="action-text">{{ post.isSaved ? savedText : saveText }}</text>
            </view>
            <view
              v-if="canSendPrivateMessage"
              class="action-item compact message-action"
              :class="{ disabled: startingConversation }"
              @tap="handleSendPrivateMessage"
            >
              <Icon name="mail" :size="16" color="#4A90E2" />
              <text class="action-text">{{ sendPrivateMessageText }}</text>
            </view>
            <view class="action-item compact" @tap="handleCommonAction">
              <Icon name="share" :size="16" color="#94a3b8" />
              <text class="action-text">{{ shareText }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section-title-row">
        <view class="section-left">
          <Icon name="chat" :size="18" color="#4A90E2" />
          <text class="section-title">{{ commentsTitle }}</text>
        </view>
        <text class="section-count">{{ commentsCountText }}</text>
      </view>

      <view class="comment-editor">
        <view v-if="editCommentId" class="replying-bar">
          <text class="replying-text">{{ editingCommentText }}</text>
          <text class="replying-cancel" @tap="cancelEdit">{{ cancelText }}</text>
        </view>
        <view v-else-if="replyToCommentId" class="replying-bar">
          <text class="replying-text">{{ replyingToText }} {{ replyToDisplayName || anonymousUserText }}</text>
          <text class="replying-cancel" @tap="cancelReply">{{ cancelText }}</text>
        </view>
        <textarea
          class="comment-input"
          v-model="newCommentContent"
          maxlength="300"
          :placeholder="replyToCommentId ? replyPlaceholder : commentPlaceholder"
          :focus="commentInputFocused"
          @blur="commentInputFocused = false"
        />
        <view class="comment-editor-row">
          <view class="comment-anon">
            <text class="comment-anon-label">{{ anonymousSwitchText }}</text>
            <switch :checked="isAnonymousComment" @change="onAnonymousChange" color="#4A90E2" />
          </view>
          <view class="comment-submit" :class="{ 'is-disabled': submittingComment }" @tap="submitComment">
            <text>{{ submittingComment ? sendingText : sendText }}</text>
          </view>
        </view>
      </view>

      <view class="comment-list">
        <view v-if="commentsLoading" class="state-card mini">
          <text class="state-text">{{ commentsLoadingText }}</text>
        </view>

        <view v-else-if="comments.length === 0" class="state-card mini">
          <text class="state-text">{{ emptyCommentsText }}</text>
        </view>

        <view v-else v-for="item in comments" :key="item.id" class="comment-card">
          <view class="comment-head">
            <view class="comment-author">
              <view class="comment-avatar">
                <image
                  v-if="item.avatar"
                  :src="item.avatar"
                  class="avatar-image"
                  mode="aspectFill"
                  lazy-load
                />
                <Icon v-else name="person" :size="13" color="#94a3b8" />
              </view>
              <text class="comment-user">{{ item.user }}</text>
              <view v-if="item.isAnonymous" class="meta-chip anonymous">{{ anonymousLabel }}</view>
            </view>
            <text class="comment-time">{{ item.time }}</text>
          </view>
          <text class="comment-content">{{ item.content }}</text>
          <view class="comment-footer">
            <view class="action-item" :class="{ active: item.isLiked }" @tap="handleCommentLike(item)">
              <Icon name="favorite" :size="15" :color="item.isLiked ? '#F43F5E' : '#94a3b8'" />
              <text class="action-text">{{ item.likeCount }}</text>
            </view>
            <view class="action-item" @tap="onReplyTap(item)">
              <Icon name="reply" :size="15" color="#94a3b8" />
              <text class="action-text">{{ replyText }}</text>
            </view>
            <view v-if="canManageComment(item)" class="action-item" @tap="openCommentActions(item)">
              <Icon name="more_horiz" :size="15" color="#94a3b8" />
              <text class="action-text">{{ manageText }}</text>
            </view>
          </view>

          <view v-if="item.replies.length" class="replies-list">
            <view v-for="reply in item.replies" :key="reply.id" class="comment-card is-reply">
              <view class="comment-head">
                <view class="comment-author">
                  <view class="comment-avatar">
                    <image v-if="reply.avatar" :src="reply.avatar" class="avatar-image" mode="aspectFill" lazy-load />
                    <Icon v-else name="person" :size="13" color="#94a3b8" />
                  </view>
                  <text class="comment-user">{{ reply.user }}</text>
                  <view v-if="reply.isAnonymous" class="meta-chip anonymous">{{ anonymousLabel }}</view>
                </view>
                <text class="comment-time">{{ reply.time }}</text>
              </view>
              <text class="comment-content">{{ reply.content }}</text>
              <view class="comment-footer">
                <view class="action-item" :class="{ active: reply.isLiked }" @tap="handleCommentLike(reply)">
                  <Icon name="favorite" :size="15" :color="reply.isLiked ? '#F43F5E' : '#94a3b8'" />
                  <text class="action-text">{{ reply.likeCount }}</text>
                </view>
                <view class="action-item" @tap="onReplyTap(reply)">
                  <Icon name="reply" :size="15" color="#94a3b8" />
                  <text class="action-text">{{ replyText }}</text>
                </view>
                <view v-if="canManageComment(reply)" class="action-item" @tap="openCommentActions(reply)">
                  <Icon name="more_horiz" :size="15" color="#94a3b8" />
                  <text class="action-text">{{ manageText }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="detail-bottom-space"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { Query } from 'appwrite'
import { computed, nextTick, ref } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import postsService from '@/services/posts'
import postInteractionsService from '@/services/post-interactions'
import commentsService from '@/services/comments'
import conversationsService from '@/services/conversations'
import type { Post } from '@/types/post'
import { useAuthStore } from '@/stores/auth'
import { redirectToLogin } from '@/utils/auth-guard'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'

interface DetailCommentRow {
  $id: string
  content: string
  authorId: string
  isAnonymous?: boolean
  likeCount?: number
  parentCommentId?: string
  postId: string
  status: string
  $createdAt?: string
}

interface DetailCommentItem {
  id: string
  authorId: string
  parentCommentId: string
  content: string
  user: string
  avatar: string
  createdAt: string
  time: string
  likeCount: number
  isAnonymous: boolean
  isLiked: boolean
  likePending: boolean
  replies: DetailCommentItem[]
}

interface DetailPostItem {
  id: string
  authorId: string
  badge: string
  content: string
  user: string
  avatar: string
  time: string
  contextLabel: string
  likeCount: number
  commentCount: number
  images: string[]
  imageCount: number
  imageLabel: string
  isLiked: boolean
  likeInteractionId: string
  likePending: boolean
  isSaved: boolean
  saveInteractionId: string
  savePending: boolean
}

const STUDY_TOPICS = ['course_review', 'exam_info', 'learning_material', 'competition'] as const
type StudyTopic = (typeof STUDY_TOPICS)[number]

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#334155' : '#cbd5e1'))

const postId = ref('')
const loading = ref(false)
const errorMessage = ref('')
const post = ref<DetailPostItem | null>(null)
const comments = ref<DetailCommentItem[]>([])
const commentsLoading = ref(false)
const newCommentContent = ref('')
const isAnonymousComment = ref(true)
const submittingComment = ref(false)
const replyToCommentId = ref('')
const replyToDisplayName = ref('')
const editCommentId = ref('')
const commentInputFocused = ref(false)
const authorNameMap = ref<Record<string, string>>({})
const authorAvatarMap = ref<Record<string, string>>({})
const startingConversation = ref(false)

const pageTitle = computed(() => (isZh.value ? '帖子详情' : 'Post detail'))
const heroTitle = computed(() => (isZh.value ? '学习交流详情' : 'Study discussion'))
const heroSubtitle = computed(() => (isZh.value ? '聚焦课程、考试与学习资料' : 'Courses, exams, and resources'))
const commentsTitle = computed(() => (isZh.value ? '评论区' : 'Comments'))
const commentsCountText = computed(() =>
  isZh.value
    ? `共 ${Number(post.value?.commentCount || 0)} 条`
    : `${Number(post.value?.commentCount || 0)} comments`
)
const authorLabel = computed(() => (isZh.value ? '发布者' : 'Author'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const retryText = computed(() => (isZh.value ? '重试' : 'Retry'))
const commentsLoadingText = computed(() => (isZh.value ? '评论加载中...' : 'Loading comments...'))
const emptyCommentsText = computed(() => (isZh.value ? '暂时还没有评论' : 'No comments yet'))
const saveText = computed(() => (isZh.value ? '收藏' : 'Save'))
const savedText = computed(() => (isZh.value ? '已收藏' : 'Saved'))
const shareText = computed(() => (isZh.value ? '分享' : 'Share'))
const replyText = computed(() => (isZh.value ? '回复' : 'Reply'))
const replyingToText = computed(() => (isZh.value ? '回复' : 'Reply to'))
const manageText = computed(() => (isZh.value ? '管理' : 'Manage'))
const editingCommentText = computed(() => (isZh.value ? '编辑评论' : 'Edit comment'))
const cancelText = computed(() => (isZh.value ? '取消' : 'Cancel'))
const anonymousLabel = computed(() => (isZh.value ? '匿名' : 'Anon'))
const anonymousSwitchText = computed(() => (isZh.value ? '匿名' : 'Anon'))
const anonymousUserText = computed(() => (isZh.value ? '某位同学' : 'Someone'))
const commentPlaceholder = computed(() => (isZh.value ? '写下你的想法（最多300字）' : 'Write your thoughts (max 300 chars)'))
const replyPlaceholder = computed(() => (isZh.value ? '写下回复（最多300字）' : 'Write a reply (max 300 chars)'))
const sendText = computed(() => (isZh.value ? '发送' : 'Send'))
const sendingText = computed(() => (isZh.value ? '发送中...' : 'Sending...'))
const currentUserId = computed(() => String(authStore.user?.$id || authStore.dbUser?.$id || '').trim())
const canSendPrivateMessage = computed(
  () => Boolean(post.value?.authorId && currentUserId.value && post.value.authorId !== currentUserId.value)
)
const sendPrivateMessageText = computed(() => (isZh.value ? '发私信' : 'Message'))

const isStudyTopic = (topic?: string): topic is StudyTopic =>
  Boolean(topic && (STUDY_TOPICS as readonly string[]).includes(topic))

const topicLabel = (topic?: string) => {
  const map: Record<StudyTopic, { zh: string; en: string }> = {
    course_review: { zh: '课程评价', en: 'Course Reviews' },
    exam_info: { zh: '考试信息', en: 'Exam Info' },
    learning_material: { zh: '学习资料', en: 'Learning Resources' },
    competition: { zh: '竞赛资讯', en: 'Competition News' }
  }
  if (!isStudyTopic(topic)) {
    return isZh.value ? '学习动态' : 'Study Updates'
  }
  const labels = map[topic]
  return isZh.value ? labels.zh : labels.en
}

const formatRelativeTime = (rawTime?: string) => {
  if (!rawTime) {
    return isZh.value ? '刚刚' : 'Just now'
  }
  const timestamp = new Date(rawTime).getTime()
  if (Number.isNaN(timestamp)) {
    return rawTime
  }
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000)
  if (diffMinutes < 1) {
    return isZh.value ? '刚刚' : 'Just now'
  }
  if (diffMinutes < 60) {
    return isZh.value ? `${diffMinutes}分钟前` : `${diffMinutes}m ago`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return isZh.value ? `${diffHours}小时前` : `${diffHours}h ago`
  }
  const diffDays = Math.floor(diffHours / 24)
  return isZh.value ? `${diffDays}天前` : `${diffDays}d ago`
}

const resolveAuthorProfiles = async (ids: string[]) => {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)))
  if (!uniqueIds.length) {
    return
  }
  try {
    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, [
      Query.equal('$id', uniqueIds),
      Query.limit(uniqueIds.length)
    ])
    const nameMap: Record<string, string> = {}
    const avatarMap: Record<string, string> = {}
    for (const row of result.rows || []) {
      const userId = String((row as Record<string, unknown>).$id || '').trim()
      if (!userId) {
        continue
      }
      nameMap[userId] = String((row as Record<string, unknown>).name || '').trim() || userId
      avatarMap[userId] = String((row as Record<string, unknown>).avatar || '').trim()
    }
    authorNameMap.value = { ...authorNameMap.value, ...nameMap }
    authorAvatarMap.value = { ...authorAvatarMap.value, ...avatarMap }
  } catch (error) {
    console.error('Resolve study author profiles failed:', error)
  }
}

const mapPost = (raw: Post): DetailPostItem => {
  const authorId = String(raw.authorId || '').trim()
  const anonymous = Boolean(raw.isAnonymous)
  const images = Array.isArray(raw.images)
    ? raw.images.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const isLiked = Boolean((raw as { isLiked?: unknown }).isLiked)
  const likeInteractionId = String((raw as { likeInteractionId?: unknown }).likeInteractionId || '')
  const isSaved = Boolean((raw as { isSaved?: unknown }).isSaved)
  const saveInteractionId = String((raw as { saveInteractionId?: unknown }).saveInteractionId || '')
  return {
    id: String(raw.$id || ''),
    authorId: anonymous ? '' : authorId,
    badge: topicLabel(String(raw.topic || '')),
    content: String(raw.content || ''),
    user: anonymous
      ? (isZh.value ? '匿名用户' : 'Anonymous')
      : authorNameMap.value[authorId] || authorId || (isZh.value ? '校园用户' : 'Campus User'),
    avatar: anonymous ? '' : authorAvatarMap.value[authorId] || '',
    time: formatRelativeTime(raw.$createdAt),
    contextLabel: anonymous ? (isZh.value ? '匿名发布' : 'Anonymous') : isZh.value ? '实名发布' : 'Named',
    likeCount: Number(raw.likeCount || 0),
    commentCount: Number(raw.commentCount || 0),
    images,
    imageCount: images.length,
    imageLabel: isZh.value ? `${images.length} 图` : `${images.length} img`,
    isLiked,
    likeInteractionId,
    likePending: false,
    isSaved,
    saveInteractionId,
    savePending: false
  }
}

const mapComment = (raw: DetailCommentRow): DetailCommentItem => {
  const authorId = String(raw.authorId || '').trim()
  const anonymous = Boolean(raw.isAnonymous)
  return {
    id: String(raw.$id || ''),
    authorId,
    parentCommentId: String(raw.parentCommentId || '').trim(),
    content: String(raw.content || ''),
    user: anonymous
      ? (isZh.value ? '匿名用户' : 'Anonymous')
      : authorNameMap.value[authorId] || authorId || (isZh.value ? '校园用户' : 'Campus User'),
    avatar: anonymous ? '' : authorAvatarMap.value[authorId] || '',
    createdAt: String(raw.$createdAt || ''),
    time: formatRelativeTime(raw.$createdAt),
    likeCount: Number(raw.likeCount || 0),
    isAnonymous: anonymous,
    isLiked: false,
    likePending: false,
    replies: []
  }
}

const canManageComment = (comment: DetailCommentItem) =>
  Boolean(comment.authorId && currentUserId.value && comment.authorId === currentUserId.value)

const rebuildCommentsTree = (rows: DetailCommentRow[]) => {
  const normalized = rows.map(mapComment)
  const topLevel: DetailCommentItem[] = []
  const repliesByParent: Record<string, DetailCommentItem[]> = {}

  for (const comment of normalized) {
    if (!comment.parentCommentId) {
      topLevel.push(comment)
      continue
    }
    if (!repliesByParent[comment.parentCommentId]) {
      repliesByParent[comment.parentCommentId] = []
    }
    repliesByParent[comment.parentCommentId].push(comment)
  }

  const sortByCreatedAt = (a: DetailCommentItem, b: DetailCommentItem) =>
    new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()

  topLevel.sort(sortByCreatedAt)
  for (const parentId of Object.keys(repliesByParent)) {
    repliesByParent[parentId].sort(sortByCreatedAt)
  }

  comments.value = topLevel.map((comment) => ({
    ...comment,
    replies: repliesByParent[comment.id] || []
  }))

  if (post.value) {
    post.value.commentCount = normalized.length
  }
}

const loadComments = async () => {
  if (!postId.value) {
    comments.value = []
    return
  }

  commentsLoading.value = true
  try {
    const result = await commentsService.listAllCommentsByPost({ postId: postId.value, status: 'published' })
    const rows = (result?.rows || []) as DetailCommentRow[]
    const authorIds = rows
      .filter((item) => !item.isAnonymous)
      .map((item) => String(item.authorId || '').trim())
      .filter(Boolean)
    await resolveAuthorProfiles(authorIds)
    rebuildCommentsTree(rows)
  } catch (error) {
    console.error('Load study comments failed:', error)
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

const focusCommentEditor = () => {
  commentInputFocused.value = true
}

const onAnonymousChange = (event: { detail?: { value?: boolean } }) => {
  isAnonymousComment.value = Boolean(event?.detail?.value)
}

const onReplyTap = (comment: DetailCommentItem) => {
  replyToCommentId.value = comment.parentCommentId || comment.id
  replyToDisplayName.value = comment.user || anonymousUserText.value
  editCommentId.value = ''
  commentInputFocused.value = true
}

const cancelReply = () => {
  replyToCommentId.value = ''
  replyToDisplayName.value = ''
}

const cancelEdit = () => {
  editCommentId.value = ''
}

const openCommentActions = (comment: DetailCommentItem) => {
  if (!canManageComment(comment)) {
    return
  }

  uni.showActionSheet({
    itemList: isZh.value ? ['编辑评论', '删除评论'] : ['Edit comment', 'Delete comment'],
    success: (res) => {
      if (res.tapIndex === 0) {
        editCommentId.value = comment.id
        replyToCommentId.value = ''
        replyToDisplayName.value = ''
        newCommentContent.value = comment.content
        isAnonymousComment.value = comment.isAnonymous
        commentInputFocused.value = true
        return
      }

      if (res.tapIndex !== 1) {
        return
      }

      uni.showModal({
        title: isZh.value ? '确认删除' : 'Delete comment',
        content: isZh.value ? '删除后该评论将不再对外可见' : 'This comment will no longer be visible',
        success: async (modalRes) => {
          if (!modalRes.confirm) {
            return
          }
          try {
            await commentsService.deleteMyComment(comment.id)
            if (editCommentId.value === comment.id) {
              cancelEdit()
            }
            await loadComments()
            uni.showToast({ title: isZh.value ? '已删除' : 'Deleted', icon: 'success' })
          } catch (error) {
            const message = extractErrorMessage(error)
            uni.showToast({
              title: message || (isZh.value ? '删除失败' : 'Delete failed'),
              icon: 'none'
            })
          }
        }
      })
    }
  })
}

const submitComment = async () => {
  const content = String(newCommentContent.value || '').trim()
  if (!content) {
    uni.showToast({
      title: isZh.value ? '请输入评论内容' : 'Please enter comment content',
      icon: 'none'
    })
    return
  }

  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }

  if (submittingComment.value) {
    return
  }

  submittingComment.value = true
  try {
    const isEditing = Boolean(editCommentId.value)
    if (isEditing) {
      await commentsService.updateMyComment(editCommentId.value, {
        content,
        isAnonymous: isAnonymousComment.value
      })
      cancelEdit()
    } else {
      await commentsService.createMyComment({
        postId: postId.value,
        content,
        isAnonymous: isAnonymousComment.value,
        parentCommentId: replyToCommentId.value || ''
      })
    }

    newCommentContent.value = ''
    cancelReply()
    await loadComments()
    uni.showToast({
      title: isEditing ? (isZh.value ? '已保存' : 'Saved') : isZh.value ? '已发送' : 'Sent',
      icon: 'success'
    })
  } catch (error) {
    const code = (error as { code?: number })?.code
    if (code === 401) {
      uni.showToast({
        title: isZh.value ? '请先登录' : 'Please login first',
        icon: 'none'
      })
      redirectToLogin()
      return
    }

    const message = extractErrorMessage(error)
    uni.showToast({
      title: message || (isZh.value ? '发送失败' : 'Send failed'),
      icon: 'none'
    })
  } finally {
    submittingComment.value = false
  }
}

const handleCommentLike = async (comment: DetailCommentItem) => {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }

  if (comment.likePending) {
    return
  }

  const prevLiked = comment.isLiked
  const prevLikeCount = comment.likeCount

  comment.likePending = true
  comment.isLiked = !prevLiked
  comment.likeCount = Math.max(0, prevLikeCount + (comment.isLiked ? 1 : -1))

  try {
    await commentsService.setCommentLikeCount(comment.id, comment.likeCount)
  } catch (error) {
    const code = (error as { code?: number })?.code
    if (code === 401 || code === 403) {
      uni.showToast({
        title: isZh.value ? '点赞已切换，仅本次会话有效' : 'Like toggled for this session only',
        icon: 'none'
      })
    } else {
      comment.isLiked = prevLiked
      comment.likeCount = prevLikeCount
      const message = extractErrorMessage(error)
      uni.showToast({
        title: message || (isZh.value ? '操作失败' : 'Operation failed'),
        icon: 'none'
      })
    }
  } finally {
    comment.likePending = false
  }
}

const handleCommonAction = () => {
  uni.showToast({
    title: isZh.value ? '功能开发中' : 'Coming soon',
    icon: 'none'
  })
}

const handleSendPrivateMessage = async () => {
  const authorId = String(post.value?.authorId || '').trim()
  if (!authorId || startingConversation.value) {
    return
  }
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }

  startingConversation.value = true
  try {
    const conversation = await conversationsService.findOrCreateDirectConversation(authorId, postId.value)
    const title = encodeURIComponent(post.value?.user || (isZh.value ? '私信' : 'Message'))
    uni.navigateTo({
      url: `/pages/messages/chat?conversationId=${encodeURIComponent(conversation.$id)}&title=${title}`
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '')
    uni.showToast({
      title: message || (isZh.value ? '发起私信失败' : 'Failed to start conversation'),
      icon: 'none'
    })
  } finally {
    startingConversation.value = false
  }
}

const handleLike = async () => {
  if (!post.value) {
    return
  }
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }
  if (post.value.likePending) {
    return
  }

  const target = post.value
  const prevLiked = target.isLiked
  const prevCount = target.likeCount
  const prevInteractionId = target.likeInteractionId

  target.likePending = true
  target.isLiked = !prevLiked
  target.likeCount = Math.max(0, prevCount + (target.isLiked ? 1 : -1))

  uni.showToast({
    title: target.isLiked
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
      target.id,
      target.isLiked,
      prevInteractionId
    )

    if (typeof result?.liked === 'boolean') {
      target.isLiked = result.liked
    }
    if (typeof result?.interactionId === 'string') {
      target.likeInteractionId = result.interactionId
    }
    if (typeof result?.likeCount === 'number') {
      target.likeCount = result.likeCount
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
    target.isLiked = prevLiked
    target.likeCount = prevCount
    target.likeInteractionId = prevInteractionId

    const errorMessage = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: errorMessage || (isZh.value ? '操作失败' : 'Operation failed'),
      icon: 'none'
    })
  } finally {
    target.likePending = false
  }
}

const handleSave = async () => {
  if (!post.value) {
    return
  }
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }
  if (post.value.savePending) {
    return
  }

  const target = post.value
  const prevSaved = target.isSaved
  const prevInteractionId = target.saveInteractionId

  target.savePending = true
  target.isSaved = !prevSaved

  uni.showToast({
    title: target.isSaved
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
      target.id,
      target.isSaved,
      prevInteractionId
    )

    if (typeof result?.saved === 'boolean') {
      target.isSaved = result.saved
    }
    if (typeof result?.interactionId === 'string') {
      target.saveInteractionId = result.interactionId
    }
  } catch (error) {
    target.isSaved = prevSaved
    target.saveInteractionId = prevInteractionId

    const errorMessage = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: errorMessage || (isZh.value ? '操作失败' : 'Operation failed'),
      icon: 'none'
    })
  } finally {
    target.savePending = false
  }
}

const previewPostImages = (images: string[], current: string) => {
  if (!images.length) {
    return
  }
  uni.previewImage({ urls: images, current })
}

const goBack = () => {

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/study/index' })
  }
}

const navigateToAuthorProfile = () => {
  const authorId = post.value?.authorId
  if (!authorId || post.value?.isAnonymous) return
  uni.navigateTo({ url: `/pages/profile/index?userId=${authorId}` })
}

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return String(error || '')
}

const loadDetail = async () => {
  if (!postId.value) {
    errorMessage.value = isZh.value ? '缺少帖子 ID' : 'Missing post id'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const rawPost = await postsService.getPostById(postId.value)
    if (rawPost.section && rawPost.section !== 'study') {
      throw new Error(isZh.value ? '该帖子不属于学习区' : 'Post section mismatch')
    }

    const rawPostWithLike = rawPost as Post & {
      isLiked?: boolean
      likeInteractionId?: string
      isSaved?: boolean
      saveInteractionId?: string
    }
    if (authStore.isLoggedIn) {
      try {
        const [myLike, mySave] = await Promise.all([
          postInteractionsService.getMyLikeForPost(postId.value),
          postInteractionsService.getMySaveForPost(postId.value)
        ])
        if (myLike) {
          rawPostWithLike.isLiked = true
          rawPostWithLike.likeInteractionId = myLike.$id
        }
        if (mySave) {
          rawPostWithLike.isSaved = true
          rawPostWithLike.saveInteractionId = mySave.$id
        }
      } catch (error) {
        console.error('Load study detail interaction state failed:', error)
      }
    }

    const authorIds = !rawPost.isAnonymous ? [String(rawPost.authorId || '')] : []
    await resolveAuthorProfiles(authorIds)
    post.value = mapPost(rawPostWithLike)
    await loadComments()
  } catch (error) {
    console.error('Load study post detail failed:', error)
    const message = extractErrorMessage(error)
    errorMessage.value = isZh.value
      ? `加载详情失败：${message || '请稍后重试'}`
      : `Failed to load detail: ${message || 'please retry later'}`
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

const reload = () => {
  loadDetail()
}

onLoad(async (query) => {
  uiPreferencesStore.initFromSystem()
  await authStore.refreshProfile()
  postId.value = String(query?.id || '').trim()
  const focusTarget = String(query?.focus || '').trim().toLowerCase()
  const shouldFocusComment = focusTarget === 'comment' || focusTarget === 'comments'
  await loadDetail()
  if (shouldFocusComment) {
    await nextTick()
    focusCommentEditor()
  }
})

onPullDownRefresh(() => {
  loadDetail()
})
</script>

<style scoped lang="scss">
.study-detail-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 40rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(74, 144, 226, 0.16);
  --topbar-bg: rgba(246, 246, 248, 0.9);
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.78);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(74, 144, 226, 0.3);
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
  background: var(--topbar-bg);
  backdrop-filter: blur(14px);
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

.right {
  display: flex;
  align-items: center;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
}

.hero-strip {
  margin-top: 20rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background:
    radial-gradient(circle at 80% 0%, rgba(74, 144, 226, 0.26) 0%, rgba(74, 144, 226, 0) 62%),
    linear-gradient(135deg, rgba(74, 144, 226, 0.18), rgba(74, 144, 226, 0.06));
  padding: 26rpx 24rpx;
}

.hero-inner {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.hero-title {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 8rpx;
  color: var(--text-sub);
  font-size: 22rpx;
}

.detail-wrap {
  margin-top: 18rpx;
}

.post-card,
.comment-card,
.comment-editor,
.state-card {
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface);
}

.post-card {
  padding: 24rpx;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding-bottom: 20rpx;
}

.meta-tags {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  border-radius: 999rpx;
  padding: 8rpx 14rpx;
  font-size: 20rpx;
  color: #356fb8;
  background: rgba(74, 144, 226, 0.12);
}

.meta-chip.topic {
  font-weight: 700;
}

.meta-chip.context {
  color: #2f6fbc;
}

.meta-chip.media {
  color: #265b98;
}

.meta-chip.anonymous {
  color: #4b5563;
  background: rgba(148, 163, 184, 0.18);
}

.time {
  color: var(--text-soft);
  font-size: 22rpx;
  padding-left: 20rpx;
}

.content {
  margin-top: 16rpx;
  color: var(--text-main);
  font-size: 28rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}

.post-images {
  margin-top: 18rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.post-images.single {
  grid-template-columns: minmax(0, 1fr);
}

.post-image-wrap {
  position: relative;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1px solid var(--line);
}

.post-image {
  width: 100%;
  height: 180rpx;
  display: block;
}

.post-images.single .post-image {
  height: 360rpx;
}

.more-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
}

.post-footer {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.author {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.author-avatar,
.comment-avatar {
  width: 44rpx;
  height: 44rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  background: rgba(148, 163, 184, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  display: block;
}

.author-meta {
  display: flex;
  flex-direction: column;
}

.author-text {
  color: var(--text-main);
  font-size: 24rpx;
  font-weight: 600;
}

.author-id {
  color: var(--text-soft);
  font-size: 20rpx;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  flex-wrap: wrap;
}

.comment-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 18rpx;
  flex-wrap: wrap;
}

.action-item {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.action-item.compact .action-text {
  font-size: 21rpx;
}

.action-item.active .action-text {
  color: #F43F5E;
}

.action-item.saved .action-text {
  color: #F59E0B;
}

.action-item.message-action {
  border-color: rgba(74, 144, 226, 0.28);
  background: rgba(74, 144, 226, 0.12);
  border-radius: 12rpx;
  padding: 8rpx 20rpx;
}

.action-item.message-action .action-text {
  color: #2f6fbc;
}

.action-item.message-action.disabled {
  opacity: 0.6;
}

.action-text {
  color: var(--text-soft);
  font-size: 23rpx;
}

.section-title-row {
  margin-top: 20rpx;
  margin-bottom: 14rpx;
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
  font-size: 30rpx;
  font-weight: 700;
}

.section-count {
  color: var(--text-soft);
  font-size: 22rpx;
}

.comment-editor {
  padding: 20rpx;
}

.replying-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
  padding: 10rpx 14rpx;
  border-radius: 16rpx;
  background: rgba(74, 144, 226, 0.14);
}

.replying-text {
  font-size: 24rpx;
  color: var(--text-main);
}

.replying-cancel {
  font-size: 24rpx;
  color: var(--text-sub);
}

.comment-input {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx;
  border-radius: 18rpx;
  border: 1px solid var(--line);
  font-size: 26rpx;
  color: var(--text-main);
  box-sizing: border-box;
}

.comment-editor-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.comment-anon {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.comment-anon-label {
  font-size: 24rpx;
  color: var(--text-sub);
}

.comment-submit {
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(74, 144, 226, 0.2);
  color: #2f6fbc;
  font-size: 24rpx;
  font-weight: 700;
}

.comment-submit.is-disabled {
  opacity: 0.7;
}

.comment-list {
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.detail-bottom-space {
  height: calc(160rpx + constant(safe-area-inset-bottom));
  height: calc(160rpx + env(safe-area-inset-bottom));
}

.comment-card {
  padding: 20rpx 20rpx 20rpx 24rpx;
}

.comment-card.is-reply {
  margin-top: 10rpx;
  margin-left: 22rpx;
  padding: 16rpx;
  border-radius: 18rpx;
  background: rgba(74, 144, 226, 0.08);
}
.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.comment-user {
  color: var(--text-main);
  font-size: 23rpx;
  font-weight: 600;
}

.comment-time {
  color: var(--text-soft);
  font-size: 20rpx;
}

.comment-content {
  margin-top: 12rpx;
  padding-left: 44rpx;
  color: var(--text-main);
  font-size: 25rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

.replies-list {
  margin-top: 14rpx;
}

.state-card {
  margin-top: 20rpx;
  padding: 36rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}

.state-card.mini {
  margin-top: 0;
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.32);
}

.state-text {
  color: var(--text-sub);
  font-size: 24rpx;
}

.retry-btn {
  border-radius: 999rpx;
  border: 1px solid rgba(74, 144, 226, 0.3);
  padding: 10rpx 24rpx;
  background: rgba(74, 144, 226, 0.12);
}

.retry-text {
  color: #2f6fbc;
  font-size: 22rpx;
  font-weight: 600;
}
</style>
