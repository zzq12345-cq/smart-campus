<template>
  <view :class="['post-detail-page', themeClass, `module-${module}`]">
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
        <Icon :name="config.heroIcon" :size="24" :color="primaryColor" />
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
            <!-- 模块差异区：study/life 用 badge+context，psychology 用 mood/risk，由父页面 slot 决定 -->
            <slot name="meta-chips" :post="post">
              <view class="meta-chip topic">{{ post.badge }}</view>
              <view class="meta-chip context">
                <Icon name="bookmark_added" :size="12" :color="contextChipColor" />
                <text>{{ post.contextLabel }}</text>
              </view>
            </slot>
            <view v-if="post.imageCount > 0" class="meta-chip media">
              <Icon name="image" :size="12" :color="mediaChipColor" />
              <text>{{ post.imageLabel }}</text>
            </view>
          </view>
          <text class="time">{{ post.time }}</text>
        </view>

        <text class="content">{{ post.content }}</text>

        <view
          v-if="post.images.length"
          :class="['post-images', { single: post.images.length === 1 }]"
        >
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
              <Icon v-else name="person" :size="14" color="#94a3b8" />
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
              <Icon name="mail" :size="16" :color="primaryColor" />
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
          <Icon name="chat" :size="18" :color="primaryColor" />
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
          <text class="replying-text"
            >{{ replyingToText }} {{ replyToDisplayName || anonymousUserText }}</text
          >
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
            <switch
              :checked="isAnonymousComment"
              @change="onAnonymousChange"
              :color="primaryColor"
            />
          </view>
          <view
            class="comment-submit"
            :class="{ 'is-disabled': submittingComment }"
            @tap="submitComment"
          >
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
            <view
              class="action-item"
              :class="{ active: item.isLiked }"
              @tap="handleCommentLike(item)"
            >
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
                    <image
                      v-if="reply.avatar"
                      :src="reply.avatar"
                      class="avatar-image"
                      mode="aspectFill"
                      lazy-load
                    />
                    <Icon v-else name="person" :size="13" color="#94a3b8" />
                  </view>
                  <text class="comment-user">{{ reply.user }}</text>
                  <view v-if="reply.isAnonymous" class="meta-chip anonymous">{{
                    anonymousLabel
                  }}</view>
                </view>
                <text class="comment-time">{{ reply.time }}</text>
              </view>
              <text class="comment-content">{{ reply.content }}</text>
              <view class="comment-footer">
                <view
                  class="action-item"
                  :class="{ active: reply.isLiked }"
                  @tap="handleCommentLike(reply)"
                >
                  <Icon name="favorite" :size="15" :color="reply.isLiked ? '#F43F5E' : '#94a3b8'" />
                  <text class="action-text">{{ reply.likeCount }}</text>
                </view>
                <view class="action-item" @tap="onReplyTap(reply)">
                  <Icon name="reply" :size="15" color="#94a3b8" />
                  <text class="action-text">{{ replyText }}</text>
                </view>
                <view
                  v-if="canManageComment(reply)"
                  class="action-item"
                  @tap="openCommentActions(reply)"
                >
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
/**
 * PostDetail —— 帖子详情页公共组件
 *
 * 三个模块（study/life/psychology）的帖子详情页原本各有一份近 1500 行的复制粘贴，
 * 逻辑、模板、样式高度相同，仅在主题色、Hero 文案、话题分类、meta-chips 上有差异。
 * 本组件承载全部公共逻辑，差异通过 props(module/config) 与 #meta-chips slot 注入：
 *
 * - study/life：使用默认 slot（badge + context chip）
 * - psychology：传入自定义 slot（topic + mood + risk chips）
 *
 * @example
 * <PostDetail :module="'study'" />
 * <PostDetail :module="'psychology'">
 *   <template #meta-chips="{ post }">...</template>
 * </PostDetail>
 */
import { Query } from 'appwrite'
import { computed, nextTick, ref } from 'vue'
import type { UniSwitchEvent } from '@/types/uni-events'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import postsService from '@/services/posts'
import postInteractionsService from '@/services/post-interactions'
import commentsService from '@/services/comments'
import conversationsService from '@/services/conversations'
import type { Post, PostSection } from '@/types/post'
import { useAuthStore } from '@/stores/auth'
import { redirectToLogin } from '@/utils/auth-guard'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'
import { getPostModuleConfig, type PostModuleConfig } from '@/config/post-modules'
import { riskLabelText, riskToneClass, moodLabelText } from '@/config/post-modules'
import { SECTION_THEME_COLORS } from '@/composables/useTheme'

interface Props {
  /** 模块标识，决定主题色、Hero、section 校验、goBack 兜底 */
  module: PostSection
}

const props = defineProps<Props>()
const config: PostModuleConfig = getPostModuleConfig(props.module)

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#334155' : '#cbd5e1'))
const primaryColor = SECTION_THEME_COLORS[props.module]
// context/media chip 取主题色的深一档色调，与原各页面一致
const contextChipColor = computed(() => primaryColor)
const mediaChipColor = computed(() => primaryColor)

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
const heroTitle = computed(() => (isZh.value ? config.heroTitle.zh : config.heroTitle.en))
const heroSubtitle = computed(() => (isZh.value ? config.heroSubtitle.zh : config.heroSubtitle.en))
const commentsTitle = computed(() => (isZh.value ? '评论区' : 'Comments'))
const commentsCountText = computed(() =>
  isZh.value
    ? `共 ${Number(post.value?.commentCount || 0)} 条`
    : `${Number(post.value?.commentCount || 0)} comments`,
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
const commentPlaceholder = computed(() =>
  isZh.value ? '写下你的想法（最多300字）' : 'Write your thoughts (max 300 chars)',
)
const replyPlaceholder = computed(() =>
  isZh.value ? '写下回复（最多300字）' : 'Write a reply (max 300 chars)',
)
const sendText = computed(() => (isZh.value ? '发送' : 'Send'))
const sendingText = computed(() => (isZh.value ? '发送中...' : 'Sending...'))
const currentUserId = computed(() =>
  String(authStore.user?.$id || authStore.dbUser?.$id || '').trim(),
)
const canSendPrivateMessage = computed(() =>
  Boolean(
    post.value?.authorId && currentUserId.value && post.value.authorId !== currentUserId.value,
  ),
)
const sendPrivateMessageText = computed(() => (isZh.value ? '发私信' : 'Message'))

const topicLabel = (topic?: string) => {
  const raw = String(topic || config.defaultTopic || '').trim()
  const label = config.topicLabels[raw]
  if (label) {
    return isZh.value ? label.zh : label.en
  }
  return isZh.value ? config.fallbackTopicLabel.zh : config.fallbackTopicLabel.en
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
      Query.limit(uniqueIds.length),
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
    console.error(`Resolve ${props.module} author profiles failed:`, error)
  }
}

const mapPost = (raw: Post): DetailPostItem => {
  const authorId = String(raw.authorId || '').trim()
  const anonymous = Boolean(raw.isAnonymous)
  const images = Array.isArray(raw.images)
    ? raw.images.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      )
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
      ? isZh.value
        ? '匿名用户'
        : 'Anonymous'
      : authorNameMap.value[authorId] || authorId || (isZh.value ? '校园用户' : 'Campus User'),
    avatar: anonymous ? '' : authorAvatarMap.value[authorId] || '',
    time: formatRelativeTime(raw.$createdAt),
    contextLabel: anonymous
      ? isZh.value
        ? '匿名发布'
        : 'Anonymous'
      : isZh.value
        ? '实名发布'
        : 'Named',
    isAnonymous: anonymous,
    topicLabel: topicLabel(String(raw.topic || config.defaultTopic || '')),
    moodLabel: moodLabelText(String(raw.mood || ''), isZh.value),
    riskLabel: riskLabelText(Number(raw.riskLevel || 1), isZh.value),
    riskTone: riskToneClass(Number(raw.riskLevel || 1)),
    anonymousLabel: isZh.value ? '匿名' : 'Anon',
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
    savePending: false,
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
      ? isZh.value
        ? '匿名用户'
        : 'Anonymous'
      : authorNameMap.value[authorId] || authorId || (isZh.value ? '校园用户' : 'Campus User'),
    avatar: anonymous ? '' : authorAvatarMap.value[authorId] || '',
    createdAt: String(raw.$createdAt || ''),
    time: formatRelativeTime(raw.$createdAt),
    likeCount: Number(raw.likeCount || 0),
    isAnonymous: anonymous,
    isLiked: false,
    likePending: false,
    replies: [],
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
    replies: repliesByParent[comment.id] || [],
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
    const result = await commentsService.listAllCommentsByPost({
      postId: postId.value,
      status: 'published',
    })
    const rows = (result?.rows || []) as DetailCommentRow[]
    const authorIds = rows
      .filter((item) => !item.isAnonymous)
      .map((item) => String(item.authorId || '').trim())
      .filter(Boolean)
    await resolveAuthorProfiles(authorIds)
    rebuildCommentsTree(rows)
  } catch (error) {
    console.error(`Load ${props.module} comments failed:`, error)
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

const focusCommentEditor = () => {
  commentInputFocused.value = true
}

const onAnonymousChange = (event: UniSwitchEvent) => {
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
        content: isZh.value
          ? '删除后该评论将不再对外可见'
          : 'This comment will no longer be visible',
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
              icon: 'none',
            })
          }
        },
      })
    },
  })
}

const submitComment = async () => {
  const content = String(newCommentContent.value || '').trim()
  if (!content) {
    uni.showToast({
      title: isZh.value ? '请输入评论内容' : 'Please enter comment content',
      icon: 'none',
    })
    return
  }

  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none',
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
        isAnonymous: isAnonymousComment.value,
      })
      cancelEdit()
    } else {
      await commentsService.createMyComment({
        postId: postId.value,
        content,
        isAnonymous: isAnonymousComment.value,
        parentCommentId: replyToCommentId.value || '',
      })
    }

    newCommentContent.value = ''
    cancelReply()
    await loadComments()
    uni.showToast({
      title: isEditing ? (isZh.value ? '已保存' : 'Saved') : isZh.value ? '已发送' : 'Sent',
      icon: 'success',
    })
  } catch (error) {
    const code = (error as { code?: number })?.code
    if (code === 401) {
      uni.showToast({
        title: isZh.value ? '请先登录' : 'Please login first',
        icon: 'none',
      })
      redirectToLogin()
      return
    }

    const message = extractErrorMessage(error)
    uni.showToast({
      title: message || (isZh.value ? '发送失败' : 'Send failed'),
      icon: 'none',
    })
  } finally {
    submittingComment.value = false
  }
}

const handleCommentLike = async (comment: DetailCommentItem) => {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none',
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
        icon: 'none',
      })
    } else {
      comment.isLiked = prevLiked
      comment.likeCount = prevLikeCount
      const message = extractErrorMessage(error)
      uni.showToast({
        title: message || (isZh.value ? '操作失败' : 'Operation failed'),
        icon: 'none',
      })
    }
  } finally {
    comment.likePending = false
  }
}

const handleCommonAction = () => {
  uni.showToast({
    title: isZh.value ? '功能开发中' : 'Coming soon',
    icon: 'none',
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
      icon: 'none',
    })
    redirectToLogin()
    return
  }

  startingConversation.value = true
  try {
    const conversation = await conversationsService.findOrCreateDirectConversation(
      authorId,
      postId.value,
    )
    const title = encodeURIComponent(post.value?.user || (isZh.value ? '私信' : 'Message'))
    uni.navigateTo({
      url: `/pages/messages/chat?conversationId=${encodeURIComponent(conversation.$id)}&title=${title}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '')
    uni.showToast({
      title: message || (isZh.value ? '发起私信失败' : 'Failed to start conversation'),
      icon: 'none',
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
      icon: 'none',
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
    title: target.isLiked ? (isZh.value ? '温暖 +1' : 'Liked') : isZh.value ? '已取消' : 'Unliked',
    icon: 'none',
  })

  try {
    const result = await postInteractionsService.setMyLikeState(
      target.id,
      target.isLiked,
      prevInteractionId,
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
          icon: 'none',
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
      icon: 'none',
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
      icon: 'none',
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
    icon: 'none',
  })

  try {
    const result = await postInteractionsService.setMySaveState(
      target.id,
      target.isSaved,
      prevInteractionId,
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
      icon: 'none',
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
    uni.switchTab({ url: config.indexRoute })
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
    if (rawPost.section && rawPost.section !== config.section) {
      throw new Error(isZh.value ? config.sectionMismatchError.zh : config.sectionMismatchError.en)
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
          postInteractionsService.getMySaveForPost(postId.value),
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
        console.error(`Load ${props.module} detail interaction state failed:`, error)
      }
    }

    const authorIds = !rawPost.isAnonymous ? [String(rawPost.authorId || '')] : []
    await resolveAuthorProfiles(authorIds)
    post.value = mapPost(rawPostWithLike)
    await loadComments()
  } catch (error) {
    console.error(`Load ${props.module} post detail failed:`, error)
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
  const focusTarget = String(query?.focus || '')
    .trim()
    .toLowerCase()
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

// ---- 类型定义（组件内部） ----
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
  isAnonymous: boolean
  // 心理模块独有（study/life 不渲染，但统一填充避免 slot 取值失败）
  topicLabel?: string
  moodLabel?: string
  riskLabel?: string
  riskTone?: 'low' | 'mid' | 'high'
  anonymousLabel?: string
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
</script>

<style scoped lang="scss">
.post-detail-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 40rpx;
  background: var(--page-bg);
}

/* 主题色与页面底色随 module 变化；文本色 light/dark 一致 */
.theme-light {
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --surface: #ffffff;
}

.theme-dark {
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --surface: rgba(15, 23, 42, 0.78);
}

/* 各模块页面底色 + 线条色（主题色 rgba）+ 顶栏底色 */
.module-study.theme-light {
  --page-bg: #f6f6f8;
  --line: rgba(74, 144, 226, 0.16);
  --topbar-bg: rgba(246, 246, 248, 0.9);
}
.module-study.theme-dark {
  --page-bg: #151c2a;
  --line: rgba(74, 144, 226, 0.3);
  --topbar-bg: rgba(21, 28, 42, 0.88);
}
.module-life.theme-light {
  --page-bg: #f8f7f5;
  --line: rgba(244, 157, 37, 0.18);
  --topbar-bg: rgba(248, 247, 245, 0.9);
}
.module-life.theme-dark {
  --page-bg: #1a1610;
  --line: rgba(244, 157, 37, 0.3);
  --topbar-bg: rgba(26, 22, 16, 0.88);
}
.module-psychology.theme-light {
  --page-bg: #f7f5ff;
  --line: rgba(136, 111, 222, 0.2);
  --topbar-bg: rgba(247, 245, 255, 0.92);
}
.module-psychology.theme-dark {
  --page-bg: #1b1530;
  --line: rgba(136, 111, 222, 0.32);
  --topbar-bg: rgba(27, 21, 48, 0.9);
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
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-main);
}

.right {
  display: flex;
  align-items: center;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.hero-strip {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 20rpx 24rpx 28rpx;
}

.hero-inner {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.hero-title {
  font-size: 38rpx;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.hero-subtitle {
  font-size: 26rpx;
  color: var(--text-sub);
  line-height: 1.4;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 80rpx 32rpx;
  margin: 24rpx 0;
  background: var(--surface);
  border-radius: 24rpx;
  border: 1px solid var(--line);
}

.state-card.mini {
  padding: 40rpx 24rpx;
  margin: 16rpx 0;
}

.state-card.error .state-text {
  color: #ef4444;
}

.state-text {
  font-size: 28rpx;
  color: var(--text-sub);
  text-align: center;
}

.retry-btn {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: var(--surface);
  border: 1px solid var(--line);
}

.retry-text {
  font-size: 26rpx;
  color: var(--text-main);
  font-weight: 600;
}

.detail-wrap {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.post-card {
  background: var(--surface);
  border-radius: 24rpx;
  border: 1px solid var(--line);
  padding: 28rpx;
}

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.meta-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  background: var(--line);
  color: var(--text-main);
}

.meta-chip.topic {
  background: var(--line);
  color: var(--text-main);
}

.meta-chip.context {
  background: var(--line);
  color: var(--text-sub);
}

.meta-chip.media {
  background: var(--line);
  color: var(--text-sub);
}

.meta-chip.anonymous {
  background: rgba(148, 163, 184, 0.16);
  color: var(--text-sub);
}

/* 心理模块独有的 mood / risk chips */
.meta-chip.mood {
  background: rgba(136, 111, 222, 0.16);
  color: #6d28d9;
}

.meta-chip.risk {
  background: var(--line);
  color: var(--text-sub);
}

.meta-chip.risk.low {
  background: rgba(34, 197, 94, 0.16);
  color: #15803d;
}

.meta-chip.risk.mid {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.meta-chip.risk.high {
  background: rgba(239, 68, 68, 0.18);
  color: #b91c1c;
}

.time {
  font-size: 22rpx;
  color: var(--text-soft);
}

.content {
  font-size: 30rpx;
  line-height: 1.6;
  color: var(--text-main);
  margin-bottom: 20rpx;
  word-break: break-word;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.post-images.single {
  grid-template-columns: 1fr;
  max-width: 60%;
}

.post-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
}

.post-images.single .post-image-wrap {
  aspect-ratio: 4 / 3;
}

.post-image {
  width: 100%;
  height: 100%;
}

.more-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.more-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}

.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding-top: 20rpx;
  border-top: 1px solid var(--line);
}

.author {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.author-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--line);
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.author-meta {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.author-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-main);
}

.author-id {
  font-size: 20rpx;
  color: var(--text-soft);
}

.action-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
}

.action-item.compact {
  padding: 8rpx;
}

.action-text {
  font-size: 24rpx;
  color: var(--text-sub);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 4rpx;
}

.section-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
}

.section-count {
  font-size: 24rpx;
  color: var(--text-sub);
}

.comment-editor {
  background: var(--surface);
  border-radius: 20rpx;
  border: 1px solid var(--line);
  padding: 20rpx;
}

.replying-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0 16rpx;
}

.replying-text {
  font-size: 24rpx;
  color: var(--text-sub);
}

.replying-cancel {
  font-size: 24rpx;
  color: var(--text-sub);
  padding: 4rpx 12rpx;
}

.comment-input {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: var(--page-bg);
  border: 1px solid var(--line);
  font-size: 28rpx;
  color: var(--text-main);
  box-sizing: border-box;
}

.comment-editor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.comment-anon {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.comment-anon-label {
  font-size: 24rpx;
  color: var(--text-sub);
}

.comment-submit {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: var(--line);
}

.comment-submit.is-disabled {
  opacity: 0.5;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.comment-card {
  background: var(--surface);
  border-radius: 20rpx;
  border: 1px solid var(--line);
  padding: 24rpx;
}

.comment-card.is-reply {
  margin-top: 16rpx;
  background: var(--page-bg);
  border: 1px solid var(--line);
}

.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.comment-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--line);
}

.comment-user {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-main);
}

.comment-time {
  font-size: 22rpx;
  color: var(--text-soft);
}

.comment-content {
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--text-main);
  margin-bottom: 12rpx;
  word-break: break-word;
}

.comment-footer {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 16rpx;
  padding-left: 24rpx;
  border-left: 2rpx solid var(--line);
}

.detail-bottom-space {
  height: 40rpx;
}
</style>
