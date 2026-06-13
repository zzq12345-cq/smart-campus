<template>
  <view
    class="feed-card"
    :hover-class="'card-hover'"
    @tap="handleTap"
  >
    <!-- Header: Avatar + User info -->
    <view class="card-header">
      <view class="avatar">
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
          :size="16"
          color="#94a3b8"
        />
      </view>
      <view class="user-info">
        <text class="username">{{ post.user }}</text>
        <text class="time">{{ post.time }}</text>
      </view>
    </view>

    <!-- Tags -->
    <view v-if="post.tags && post.tags.length > 0" class="tags-wrapper">
      <uni-tag
        v-for="(tag, index) in post.tags"
        :key="index"
        :text="tag"
        type="primary"
        size="small"
        custom-style="margin-right: 8px; margin-bottom: 8px;"
      />
    </view>

    <!-- Content -->
    <view class="content-wrapper">
      <text class="content-text">{{ post.content }}</text>
    </view>

    <!-- Footer: Actions -->
    <view class="card-footer">
      <view class="action-item" @tap.stop="handleLike">
        <Icon
          name="favorite"
          :size="18"
          :color="isLiked ? '#ef4444' : '#94a3b8'"
        />
        <text class="action-count" :class="{ 'liked': isLiked }">{{ likeCount }}</text>
      </view>
      <view class="action-item" @tap.stop="handleComment">
        <Icon name="chat_bubble" :size="18" color="#94a3b8" />
        <text class="action-count">{{ commentCount }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * FeedCard Component
 *
 * Information feed card for displaying posts
 * Features: User avatar + nickname + time + tags + content truncation
 * Supports like/comment interactions
 *
 * @example
 * <FeedCard
 *   :post="{
 *     user: 'Anonymous Fox',
 *     avatar: '/static/avatars/default.jpg',
 *     time: '2h ago',
 *     tags: ['anxiety', 'finals'],
 *     content: 'Feeling a bit overwhelmed with the final exams coming up...',
 *     likeCount: 24,
 *     commentCount: 12
 *   }"
 *   @like="handleLike"
 *   @comment="handleComment"
 *   @tap="handleCardTap"
 * />
 */

import { useFeedInteraction, useNavigation } from '@/composables'
import type { FeedPost } from '@/types/components'

// Props definition
interface Props {
  post: FeedPost // Post object
}

const props = defineProps<Props>()
const { navigateTo } = useNavigation()

// Emits
const emit = defineEmits<{
  like: [postId: string | number | undefined]
  comment: [postId: string | number | undefined]
  tap: [postId: string | number | undefined]
}>()

const { isLiked, likeCount, commentCount, toggleLike, increaseCommentCount } = useFeedInteraction(props.post)

// Handle card tap
const handleTap = () => {
  emit('tap', props.post.id)
  navigateTo(`/pages/common/post-detail?id=${props.post.id}`)
}

// Handle like
const handleLike = () => {
  toggleLike()
  emit('like', props.post.id)
}

// Handle comment
const handleComment = () => {
  increaseCommentCount()
  emit('comment', props.post.id)
  navigateTo(`/pages/common/post-comment?id=${props.post.id}`)
}
</script>

<style lang="scss" scoped>
.feed-card {
  background: $uni-bg-color;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid $border-light;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
  transition: all 0.2s ease;
  cursor: pointer;

  &.card-hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  line-height: 1.3;
}

.time {
  font-size: 12px;
  color: $text-tertiary;
  line-height: 1.4;
}

.tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.content-wrapper {
  margin-bottom: 16px;
}

.content-text {
  font-size: 14px;
  line-height: 1.6;
  color: $text-primary;
  display: -webkit-box;
  -webkit-line-clamp: 2; // Truncate to 2 lines
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid $border-light;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:active {
    opacity: 0.6;
  }
}

.action-count {
  font-size: 12px;
  color: $text-tertiary;
  font-weight: 500;

  &.liked {
    color: #ef4444;
  }
}

// Dark mode support
@media (prefers-color-scheme: dark) {
  .feed-card {
    background: rgba(15, 23, 42, 0.5);
    border-color: rgba(136, 111, 222, 0.1);
  }

  .avatar {
    background: #334155;
  }

  .username {
    color: #f1f5f9;
  }

  .content-text {
    color: #cbd5e1;
  }

  .card-footer {
    border-top-color: rgba(136, 111, 222, 0.1);
  }
}
</style>
