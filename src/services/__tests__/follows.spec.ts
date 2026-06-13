import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    getCurrentUser: vi.fn()
  }
}))

const { mockTablesDB } = vi.hoisted(() => ({
  mockTablesDB: {
    listRows: vi.fn(),
    getRow: vi.fn()
  }
}))

const { mockFollowsFunctionService } = vi.hoisted(() => ({
  mockFollowsFunctionService: {
    followUser: vi.fn(),
    unfollowUser: vi.fn()
  }
}))

vi.mock('@/services/auth', () => ({
  default: mockAuthService
}))

vi.mock('@/utils/appwrite', () => ({
  tablesDB: mockTablesDB
}))

vi.mock('@/services/follows-function', () => ({
  default: mockFollowsFunctionService
}))

vi.mock('appwrite', () => ({
  Query: {
    equal: vi.fn((key: string, value: unknown) => `equal:${key}:${String(value)}`),
    orderDesc: vi.fn((key: string) => `orderDesc:${key}`),
    limit: vi.fn((value: number) => `limit:${value}`),
    offset: vi.fn((value: number) => `offset:${value}`)
  }
}))

describe('followsService', () => {
  let followsService: typeof import('@/services/follows').default

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockAuthService.getCurrentUser.mockResolvedValue({ $id: 'user-1' } as any)
    mockTablesDB.listRows.mockResolvedValue({ rows: [] } as any)
    mockFollowsFunctionService.followUser.mockResolvedValue({
      follow: { $id: 'follow-row-1', followerId: 'user-1', followingId: 'user-2' }
    } as any)
    mockFollowsFunctionService.unfollowUser.mockResolvedValue({
      removed: true
    } as any)
    ;({ default: followsService } = await import('@/services/follows'))
  })

  it('delegates follow creation to Appwrite Function', async () => {
    const result = await followsService.followUser('user-2')

    expect(mockFollowsFunctionService.followUser).toHaveBeenCalledWith({ targetUserId: 'user-2' })
    expect(result).toEqual({ $id: 'follow-row-1', followerId: 'user-1', followingId: 'user-2' })
  })

  it('rejects self follow', async () => {
    await expect(followsService.followUser('user-1')).rejects.toMatchObject({ code: 400 })
    expect(mockFollowsFunctionService.followUser).not.toHaveBeenCalled()
  })

  it('delegates unfollow to Appwrite Function', async () => {
    const result = await followsService.unfollowUser('user-2')

    expect(mockFollowsFunctionService.unfollowUser).toHaveBeenCalledWith({ targetUserId: 'user-2' })
    expect(result).toBe(true)
  })

  it('returns false when function reports no follow record', async () => {
    mockFollowsFunctionService.unfollowUser.mockResolvedValueOnce({ removed: false } as any)

    const result = await followsService.unfollowUser('user-2')

    expect(result).toBe(false)
  })

  it('checks follow state and lists followers/following', async () => {
    mockTablesDB.listRows
      .mockResolvedValueOnce({
        rows: [
          {
            $id: 'follow-row-1',
            followerId: 'user-1',
            followingId: 'user-2'
          }
        ]
      } as any)
      .mockResolvedValueOnce({
        rows: [{ $id: 'follow-a', followerId: 'user-3', followingId: 'user-2' }]
      } as any)
      .mockResolvedValueOnce({
        rows: [{ $id: 'follow-b', followerId: 'user-2', followingId: 'user-4' }]
      } as any)

    await expect(followsService.isFollowing('user-2')).resolves.toBe(true)
    await expect(followsService.getFollowers('user-2', 10, 20)).resolves.toEqual([
      { $id: 'follow-a', followerId: 'user-3', followingId: 'user-2' }
    ])
    await expect(followsService.getFollowing('user-2', 5, 10)).resolves.toEqual([
      { $id: 'follow-b', followerId: 'user-2', followingId: 'user-4' }
    ])
  })
})
