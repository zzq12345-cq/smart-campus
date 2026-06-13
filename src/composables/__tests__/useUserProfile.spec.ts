import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    getCurrentUser: vi.fn()
  }
}))

const { mockFollowsService } = vi.hoisted(() => ({
  mockFollowsService: {
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    isFollowing: vi.fn()
  }
}))

const { mockUsersService } = vi.hoisted(() => ({
  mockUsersService: {
    getUserById: vi.fn(),
    getUserPublicPosts: vi.fn(),
    getUserPublicPostsCount: vi.fn()
  }
}))

vi.mock('@/services/auth', () => ({
  default: mockAuthService
}))

vi.mock('@/services/follows', () => ({
  default: mockFollowsService
}))

vi.mock('@/services/users', () => ({
  default: mockUsersService
}))

import { useUserProfile } from '@/composables/useUserProfile'

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthService.getCurrentUser.mockResolvedValue({ $id: 'viewer-1' } as any)
    mockUsersService.getUserById.mockResolvedValue({
      $id: 'user-2',
      name: 'Alice',
      followersCount: 10,
      followingCount: 7,
      level: 2
    })
    mockUsersService.getUserPublicPostsCount.mockResolvedValue(3)
    mockUsersService.getUserPublicPosts.mockResolvedValue([{ $id: 'post-1' }])
    mockFollowsService.isFollowing.mockResolvedValue(true)
    mockFollowsService.followUser.mockResolvedValue({ $id: 'follow-1' })
    mockFollowsService.unfollowUser.mockResolvedValue(true)
  })

  it('loads profile summary concurrently', async () => {
    const state = useUserProfile(() => 'user-2')

    await state.loadProfile()

    expect(mockUsersService.getUserById).toHaveBeenCalledWith('user-2')
    expect(mockUsersService.getUserPublicPostsCount).toHaveBeenCalledWith('user-2')
    expect(mockFollowsService.isFollowing).toHaveBeenCalledWith('user-2')
    expect(state.profile.value?.name).toBe('Alice')
    expect(state.postsCount.value).toBe(3)
    expect(state.isFollowing.value).toBe(true)
    expect(state.isSelf.value).toBe(false)
  })

  it('loads and appends posts', async () => {
    const state = useUserProfile(() => 'user-2')

    mockUsersService.getUserPublicPosts
      .mockResolvedValueOnce([{ $id: 'post-1' }])
      .mockResolvedValueOnce([{ $id: 'post-2' }])

    await state.loadPosts(20, 0)
    await state.loadPosts(20, 1)

    expect(state.posts.value).toEqual([{ $id: 'post-1' }, { $id: 'post-2' }])
  })

  it('toggles follow state and updates local followers count', async () => {
    const state = useUserProfile(() => 'user-2')
    await state.loadProfile()

    await state.toggleFollow()
    expect(mockFollowsService.unfollowUser).toHaveBeenCalledWith('user-2')
    expect(state.isFollowing.value).toBe(false)
    expect(state.profile.value?.followersCount).toBe(9)

    mockFollowsService.isFollowing.mockResolvedValue(false)
    state.isFollowing.value = false
    state.profile.value = {
      ...(state.profile.value as any),
      followersCount: 9
    }

    await state.toggleFollow()
    expect(mockFollowsService.followUser).toHaveBeenCalledWith('user-2')
    expect(state.isFollowing.value).toBe(true)
    expect(state.profile.value?.followersCount).toBe(10)
  })

  it('marks missing users as not found', async () => {
    const state = useUserProfile(() => 'user-404')
    mockUsersService.getUserById.mockResolvedValueOnce(null)
    mockUsersService.getUserPublicPostsCount.mockResolvedValueOnce(0)
    mockFollowsService.isFollowing.mockResolvedValueOnce(false)

    await state.loadProfile()

    expect(state.error.value).toBe('not_found')
  })
})
