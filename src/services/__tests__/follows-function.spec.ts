import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFunctions } = vi.hoisted(() => ({
  mockFunctions: {
    createExecution: vi.fn(),
    getExecution: vi.fn()
  }
}))

vi.mock('@/utils/appwrite', () => ({
  functions: mockFunctions
}))

vi.mock('appwrite', () => ({
  ExecutionMethod: {
    POST: 'POST'
  }
}))

import followsFunctionService from '@/services/follows-function'

describe('followsFunctionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls follow function and returns parsed payload', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-1',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({
        ok: true,
        data: {
          follow: {
            $id: 'follow-1',
            followerId: 'user-1',
            followingId: 'user-2',
            $createdAt: '2026-03-06T09:00:00.000Z'
          },
          changed: true,
          followersCount: 3,
          followingCount: 4
        }
      })
    })

    const result = await followsFunctionService.followUser({ targetUserId: 'user-2' })

    expect(mockFunctions.createExecution).toHaveBeenCalledWith(
      'follows-manager',
      JSON.stringify({
        action: 'followUser',
        targetUserId: 'user-2'
      }),
      false,
      '/',
      'POST',
      {
        'content-type': 'application/json'
      }
    )
    expect(result.follow.$id).toBe('follow-1')
    expect(result.followersCount).toBe(3)
    expect(result.followingCount).toBe(4)
  })

  it('waits pending execution and throws function error payload', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-2',
      status: 'processing',
      responseStatusCode: 200,
      responseBody: ''
    })
    mockFunctions.getExecution.mockResolvedValue({
      $id: 'exec-2',
      status: 'failed',
      responseStatusCode: 401,
      responseBody: JSON.stringify({
        ok: false,
        error: 'User is not authenticated',
        code: 401
      })
    })

    await expect(followsFunctionService.unfollowUser({ targetUserId: 'user-2' })).rejects.toMatchObject({
      message: 'User is not authenticated',
      code: 401
    })
    expect(mockFunctions.getExecution).toHaveBeenCalledWith('follows-manager', 'exec-2')
  })
})
