import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/appwrite', () => ({
  tablesDB: {
    listRows: vi.fn(),
    getRow: vi.fn()
  }
}))

vi.mock('appwrite', () => ({
  Query: {
    equal: vi.fn((key: string, value: unknown) => `equal:${key}:${String(value)}`),
    orderDesc: vi.fn((key: string) => `orderDesc:${key}`),
    limit: vi.fn((value: number) => `limit:${value}`),
    offset: vi.fn((value: number) => `offset:${value}`)
  }
}))

import usersService from '@/services/users'
import { tablesDB } from '@/utils/appwrite'
import { Query } from 'appwrite'

describe('usersService', () => {
  const mockedTables = vi.mocked(tablesDB)
  const mockedQuery = vi.mocked(Query)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedTables.getRow.mockResolvedValue({} as any)
    mockedTables.listRows.mockResolvedValue({ rows: [], total: 0 } as any)
  })

  it('maps db user into public profile', async () => {
    mockedTables.getRow.mockResolvedValue({
      $id: 'user-2',
      name: 'Alice',
      avatar: 'https://example.com/a.png',
      bio: 'bio',
      school: 'UniSmart',
      level: 3,
      followersCount: 8,
      followingCount: 5
    } as any)

    const result = await usersService.getUserById('user-2')

    expect(result).toEqual({
      $id: 'user-2',
      name: 'Alice',
      avatar: 'https://example.com/a.png',
      bio: 'bio',
      school: 'UniSmart',
      level: 3,
      followersCount: 8,
      followingCount: 5
    })
  })

  it('returns null when user does not exist', async () => {
    mockedTables.getRow.mockRejectedValue(new Error('not found'))

    await expect(usersService.getUserById('user-404')).resolves.toBeNull()
  })

  it('lists only published non-anonymous posts', async () => {
    mockedTables.listRows.mockResolvedValue({
      rows: [{ $id: 'post-1', authorId: 'user-2', status: 'published', isAnonymous: false }]
    } as any)

    const result = await usersService.getUserPublicPosts('user-2', 10, 5)

    expect(mockedQuery.equal).toHaveBeenCalledWith('authorId', 'user-2')
    expect(mockedQuery.equal).toHaveBeenCalledWith('status', 'published')
    expect(mockedQuery.equal).toHaveBeenCalledWith('isAnonymous', false)
    expect(mockedQuery.limit).toHaveBeenCalledWith(10)
    expect(mockedQuery.offset).toHaveBeenCalledWith(5)
    expect(result).toEqual([{ $id: 'post-1', authorId: 'user-2', status: 'published', isAnonymous: false }])
  })

  it('counts only published non-anonymous posts', async () => {
    mockedTables.listRows.mockResolvedValue({ rows: [{ $id: 'post-1' }], total: 6 } as any)

    const result = await usersService.getUserPublicPostsCount('user-2')

    expect(mockedQuery.equal).toHaveBeenCalledWith('authorId', 'user-2')
    expect(mockedQuery.equal).toHaveBeenCalledWith('status', 'published')
    expect(mockedQuery.equal).toHaveBeenCalledWith('isAnonymous', false)
    expect(mockedTables.listRows).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(Array), true)
    expect(result).toBe(6)
  })
})
