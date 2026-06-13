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
    incrementRowColumn: vi.fn(),
    decrementRowColumn: vi.fn()
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
    orderAsc: vi.fn((key: string) => `orderAsc:${key}`),
    limit: vi.fn((value: number) => `limit:${value}`),
    offset: vi.fn((value: number) => `offset:${value}`)
  }
}))

import commentsService from '@/services/comments'
import authService from '@/services/auth'
import { tablesDB } from '@/utils/appwrite'
import { ID, Permission, Query, Role } from 'appwrite'

describe('commentsService', () => {
  const mockedAuth = vi.mocked(authService)
  const mockedTables = vi.mocked(tablesDB)
  const mockedID = vi.mocked(ID)
  const mockedPermission = vi.mocked(Permission)
  const mockedQuery = vi.mocked(Query)
  const mockedRole = vi.mocked(Role)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.getCurrentUser.mockResolvedValue({ $id: 'user-1' } as any)
    mockedTables.listRows.mockResolvedValue({ rows: [] } as any)
    mockedTables.getRow.mockResolvedValue({} as any)
    mockedTables.createRow.mockResolvedValue({ $id: 'comment-1' } as any)
    mockedTables.updateRow.mockResolvedValue({ $id: 'comment-1' } as any)
    mockedTables.incrementRowColumn.mockResolvedValue({} as any)
    mockedTables.decrementRowColumn.mockResolvedValue({} as any)
  })

  it('lists comments by post with default filters', async () => {
    await commentsService.listAllCommentsByPost({ postId: 'post-1' })

    expect(mockedQuery.equal).toHaveBeenCalledWith('postId', 'post-1')
    expect(mockedQuery.equal).toHaveBeenCalledWith('status', 'published')
    expect(mockedQuery.orderAsc).toHaveBeenCalledWith('$createdAt')
    expect(mockedQuery.limit).toHaveBeenCalledWith(200)
    expect(mockedQuery.offset).toHaveBeenCalledWith(0)
    expect(mockedTables.listRows).toHaveBeenCalledTimes(1)
  })

  it('creates comment and increments post commentCount', async () => {
    mockedTables.createRow.mockResolvedValue({
      $id: 'comment-1',
      postId: 'post-1',
      authorId: 'user-1',
      content: 'hello'
    } as any)

    const result = await commentsService.createMyComment({
      postId: 'post-1',
      content: '  hello  ',
      isAnonymous: false
    })

    expect(mockedID.unique).toHaveBeenCalledTimes(1)
    expect(mockedRole.user).toHaveBeenCalledWith('user-1')
    expect(mockedRole.users).toHaveBeenCalledTimes(1)
    expect(mockedPermission.read).toHaveBeenCalled()
    expect(mockedTables.createRow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'mock-row-id',
      expect.objectContaining({
        postId: 'post-1',
        authorId: 'user-1',
        content: 'hello',
        isAnonymous: false,
        parentCommentId: '',
        status: 'published',
        likeCount: 0
      }),
      expect.arrayContaining(['read:user:user-1', 'update:user:user-1', 'delete:user:user-1', 'read:users'])
    )
    expect(mockedTables.incrementRowColumn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'post-1',
      'commentCount',
      1
    )
    expect(result.$id).toBe('comment-1')
  })

  it('does not throw when incrementing post commentCount fails', async () => {
    mockedTables.incrementRowColumn.mockRejectedValue(new Error('forbidden'))

    await expect(
      commentsService.createMyComment({
        postId: 'post-2',
        content: 'comment'
      })
    ).resolves.toBeDefined()
  })

  it('updates my comment and keeps original relations', async () => {
    mockedTables.getRow.mockResolvedValue({
      $id: 'comment-2',
      postId: 'post-2',
      authorId: 'user-1',
      content: 'old',
      isAnonymous: true,
      parentCommentId: 'parent-1',
      status: 'published',
      likeCount: 3
    } as any)

    await commentsService.updateMyComment('comment-2', {
      content: '  new  ',
      isAnonymous: false
    })

    expect(mockedTables.updateRow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'comment-2',
      expect.objectContaining({
        postId: 'post-2',
        authorId: 'user-1',
        content: 'new',
        isAnonymous: false,
        parentCommentId: 'parent-1',
        status: 'published',
        likeCount: 3
      }),
      expect.any(Array)
    )
  })

  it('rejects when current user is not the comment author', async () => {
    mockedTables.getRow.mockResolvedValue({
      $id: 'comment-3',
      authorId: 'user-2'
    } as any)

    await expect(commentsService.getMyComment('comment-3')).rejects.toMatchObject({ code: 403 })
  })

  it('soft-deletes comment and decrements post commentCount', async () => {
    mockedTables.getRow.mockResolvedValue({
      $id: 'comment-4',
      postId: 'post-4',
      authorId: 'user-1',
      content: 'content',
      isAnonymous: true,
      parentCommentId: '',
      status: 'published',
      likeCount: 2
    } as any)
    mockedTables.updateRow.mockResolvedValue({ $id: 'comment-4', status: 'deleted' } as any)

    await commentsService.deleteMyComment('comment-4')

    expect(mockedTables.updateRow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'comment-4',
      expect.objectContaining({
        status: 'deleted'
      }),
      expect.any(Array)
    )
    expect(mockedTables.decrementRowColumn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'post-4',
      'commentCount',
      1,
      0
    )
  })

  it('updates comment like count with non-negative clamp', async () => {
    await commentsService.setCommentLikeCount('comment-5', -8)

    expect(mockedTables.updateRow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'comment-5',
      {
        likeCount: 0
      }
    )
  })

  it('throws 401 when user is not authenticated', async () => {
    mockedAuth.getCurrentUser.mockResolvedValue(null)

    await expect(
      commentsService.createMyComment({
        postId: 'post-6',
        content: 'hello'
      })
    ).rejects.toMatchObject({ code: 401 })
  })
})
