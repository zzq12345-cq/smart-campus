import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/user-sessions', () => ({
  default: {
    upsertMySession: vi.fn(),
    deleteMySessionBySessionId: vi.fn()
  }
}))

vi.mock('@/utils/api-client', () => ({
  clearToken: vi.fn()
}))

vi.mock('@/utils/appwrite-sdk', () => ({
  syncClientSession: vi.fn(),
  syncClientSessionFromStorage: vi.fn()
}))

vi.mock('@/utils/appwrite-shared', () => ({
  MINDGUARD_DATABASE_ID: 'db',
  USERS_TABLE_ID: 'users'
}))

vi.mock('@/utils/appwrite', () => ({
  account: {
    get: vi.fn(),
    updateName: vi.fn()
  },
  tablesDB: {
    getRow: vi.fn(),
    updateRow: vi.fn(),
    createRow: vi.fn()
  }
}))

vi.mock('appwrite', () => ({
  ID: {
    unique: vi.fn(() => 'row-id')
  },
  Permission: {
    read: vi.fn((role: string) => `read:${role}`),
    update: vi.fn((role: string) => `update:${role}`),
    delete: vi.fn((role: string) => `delete:${role}`)
  },
  Role: {
    user: vi.fn((userId: string) => `user:${userId}`),
    users: vi.fn(() => 'users')
  }
}))

import authService from '@/services/auth'
import { account, tablesDB } from '@/utils/appwrite'

describe('authService', () => {
  const mockedAccount = vi.mocked(account)
  const mockedTables = vi.mocked(tablesDB)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAccount.get.mockResolvedValue({ $id: 'user-1', email: 't@example.com', name: 'Teacher' } as any)
    mockedTables.getRow.mockResolvedValue({
      $id: 'user-1',
      email: 't@example.com',
      name: 'Teacher',
      $permissions: ['read:users']
    } as any)
    mockedTables.updateRow.mockResolvedValue({
      $id: 'user-1',
      email: 't@example.com',
      name: 'Teacher',
      role: 'teacher'
    } as any)
  })

  it('persists role when updating profile', async () => {
    await authService.updateProfile({ role: 'teacher' })

    expect(mockedTables.updateRow).toHaveBeenCalledWith('db', 'users', 'user-1', {
      role: 'teacher'
    })
    expect(uni.setStorageSync).toHaveBeenCalledWith(
      'dbUser',
      expect.objectContaining({ role: 'teacher' })
    )
  })
})
