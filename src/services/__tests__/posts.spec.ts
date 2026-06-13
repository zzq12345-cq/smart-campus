import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/auth', () => ({
  default: {
    getCurrentUser: vi.fn()
  }
}))

vi.mock('@/utils/appwrite', () => ({
  tablesDB: {
    listRows: vi.fn(),
    getRow: vi.fn(),
    createRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn()
  }
}))

vi.mock('appwrite', () => ({
  ID: {
    unique: vi.fn(() => 'mock-row-id')
  },
  Permission: {
    read: vi.fn((role: string) => `read:${role}`),
    update: vi.fn((role: string) => `update:${role}`),
    delete: vi.fn((role: string) => `delete:${role}`)
  },
  Role: {
    user: vi.fn((userId: string) => `user:${userId}`),
    users: vi.fn(() => 'users')
  },
  Query: {
    equal: vi.fn((key: string, value: unknown) => `equal:${key}:${String(value)}`),
    orderDesc: vi.fn((key: string) => `orderDesc:${key}`),
    limit: vi.fn((value: number) => `limit:${value}`),
    offset: vi.fn((value: number) => `offset:${value}`)
  }
}))

import postsService from '@/services/posts'
import authService from '@/services/auth'
import { tablesDB } from '@/utils/appwrite'
import { Query } from 'appwrite'

describe('postsService', () => {
  const mockedAuth = vi.mocked(authService)
  const mockedTables = vi.mocked(tablesDB)
  const mockedQuery = vi.mocked(Query)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.getCurrentUser.mockResolvedValue({ $id: 'user-1' } as any)
    mockedTables.listRows.mockResolvedValue({ rows: [], total: 0 } as any)
    mockedTables.getRow.mockResolvedValue({} as any)
    mockedTables.createRow.mockResolvedValue({ $id: 'post-1' } as any)
    mockedTables.updateRow.mockResolvedValue({ $id: 'post-1' } as any)
    mockedTables.deleteRow.mockResolvedValue(undefined as any)
  })

  it('returns my post count from total rows', async () => {
    mockedTables.listRows.mockResolvedValue({ rows: [{ $id: 'post-1' }], total: 9 } as any)

    const result = await postsService.getMyPostsCount()

    expect(mockedQuery.equal).toHaveBeenCalledWith('authorId', 'user-1')
    expect(mockedQuery.limit).toHaveBeenCalledWith(1)
    expect(mockedTables.listRows).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(Array), true)
    expect(result).toBe(9)
  })

  it('applies section and status filters when counting my posts', async () => {
    await postsService.getMyPostsCount({ section: 'study', status: 'published' })

    expect(mockedQuery.equal).toHaveBeenCalledWith('section', 'study')
    expect(mockedQuery.equal).toHaveBeenCalledWith('status', 'published')
  })
})
