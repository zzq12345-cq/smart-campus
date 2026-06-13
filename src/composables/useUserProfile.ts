import { computed, ref } from 'vue'
import authService from '@/services/auth'
import followsService from '@/services/follows'
import usersService from '@/services/users'
import type { UserProfile } from '@/types/follow'
import type { Post } from '@/types/post'

export function useUserProfile(userId: () => string) {
  const profile = ref<UserProfile | null>(null)
  const posts = ref<Post[]>([])
  const postsCount = ref(0)
  const isFollowing = ref(false)
  const isSelf = ref(false)

  const loading = ref(false)
  const postsLoading = ref(false)
  const followActionLoading = ref(false)
  const error = ref('')

  const displayName = computed(() => profile.value?.name || '')
  const avatarUrl = computed(() => profile.value?.avatar || '')
  const bio = computed(() => profile.value?.bio || '')
  const school = computed(() => profile.value?.school || '')
  const level = computed(() => profile.value?.level || 1)
  const followersCount = computed(() => profile.value?.followersCount || 0)
  const followingCount = computed(() => profile.value?.followingCount || 0)

  async function loadProfile() {
    const uid = userId()
    if (!uid) return

    loading.value = true
    error.value = ''
    try {
      const currentUser = await authService.getCurrentUser()
      isSelf.value = currentUser?.$id === uid

      const [userProfile, count, following] = await Promise.all([
        usersService.getUserById(uid),
        usersService.getUserPublicPostsCount(uid),
        currentUser?.$id && currentUser.$id !== uid
          ? followsService.isFollowing(uid)
          : Promise.resolve(false)
      ])

      if (!userProfile) {
        error.value = 'not_found'
        return
      }

      profile.value = userProfile
      postsCount.value = count
      isFollowing.value = following
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load profile'
    } finally {
      loading.value = false
    }
  }

  async function loadPosts(limit = 20, offset = 0) {
    const uid = userId()
    if (!uid) return

    postsLoading.value = true
    try {
      const result = await usersService.getUserPublicPosts(uid, limit, offset)
      if (offset === 0) {
        posts.value = result
      } else {
        posts.value = [...posts.value, ...result]
      }
    } catch {
      // silent fail for posts load
    } finally {
      postsLoading.value = false
    }
  }

  async function toggleFollow() {
    if (isSelf.value || followActionLoading.value) return

    followActionLoading.value = true

    const wasFollowing = isFollowing.value
    const oldCount = profile.value?.followersCount || 0

    isFollowing.value = !wasFollowing
    if (profile.value) {
      profile.value = {
        ...profile.value,
        followersCount: wasFollowing ? Math.max(0, oldCount - 1) : oldCount + 1
      }
    }

    try {
      if (wasFollowing) {
        await followsService.unfollowUser(userId())
      } else {
        await followsService.followUser(userId())
      }
    } catch (error) {
      isFollowing.value = wasFollowing
      if (profile.value) {
        profile.value = { ...profile.value, followersCount: oldCount }
      }
      throw error
    } finally {
      followActionLoading.value = false
    }
  }

  return {
    profile,
    posts,
    postsCount,
    isFollowing,
    isSelf,
    loading,
    postsLoading,
    followActionLoading,
    error,
    displayName,
    avatarUrl,
    bio,
    school,
    level,
    followersCount,
    followingCount,
    loadProfile,
    loadPosts,
    toggleFollow
  }
}
