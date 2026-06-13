import { ref } from 'vue'
import type { FeedPost } from '@/types/components'

export function useFeed(initialPosts: FeedPost[] = []) {
  const posts = ref<FeedPost[]>([...initialPosts])

  function setPosts(nextPosts: FeedPost[]) {
    posts.value = [...nextPosts]
  }

  function appendPosts(nextPosts: FeedPost[]) {
    posts.value = [...posts.value, ...nextPosts]
  }

  function likePost(postId: string | number | undefined) {
    if (postId === undefined || postId === null) {
      return
    }
    posts.value = posts.value.map((post) => {
      if (post.id !== postId) {
        return post
      }
      const isLiked = !post.isLiked
      const currentLikeCount = Number(post.likeCount || 0)
      return {
        ...post,
        isLiked,
        likeCount: isLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1)
      }
    })
  }

  function commentOnPost(postId: string | number | undefined) {
    if (postId === undefined || postId === null) {
      return
    }
    posts.value = posts.value.map((post) => {
      if (post.id !== postId) {
        return post
      }
      return {
        ...post,
        commentCount: Number(post.commentCount || 0) + 1
      }
    })
  }

  return {
    posts,
    setPosts,
    appendPosts,
    likePost,
    commentOnPost
  }
}

export function useFeedInteraction(post: FeedPost) {
  const isLiked = ref(Boolean(post.isLiked))
  const likeCount = ref(Number(post.likeCount || 0))
  const commentCount = ref(Number(post.commentCount || 0))

  function toggleLike() {
    isLiked.value = !isLiked.value
    likeCount.value += isLiked.value ? 1 : -1
    if (likeCount.value < 0) {
      likeCount.value = 0
    }
  }

  function increaseCommentCount() {
    commentCount.value += 1
  }

  return {
    isLiked,
    likeCount,
    commentCount,
    toggleLike,
    increaseCommentCount
  }
}

