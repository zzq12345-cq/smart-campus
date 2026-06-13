import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    getCurrentUser: vi.fn()
  }
}))

const { mockTablesDB } = vi.hoisted(() => ({
  mockTablesDB: {
    listRows: vi.fn(),
    getRow: vi.fn(),
    createRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn(),
    incrementRowColumn: vi.fn()
  }
}))

vi.mock('@/services/auth', () => ({
  default: mockAuthService
}))

vi.mock('@/utils/appwrite', () => ({
  tablesDB: mockTablesDB,
  functions: {
    createExecution: vi.fn()
  }
}))

const { mockPrivateMessagingFunction } = vi.hoisted(() => ({
  mockPrivateMessagingFunction: {
    createConversation: vi.fn(),
    findOrCreateDirectConversation: vi.fn(),
    resolveConversationPeers: vi.fn()
  }
}))

vi.mock('@/services/private-messaging-function', () => ({
  default: mockPrivateMessagingFunction
}))

vi.mock('appwrite', () => ({
  Client: class {
    setEndpoint() {
      return this
    }
    setProject() {
      return this
    }
  },
  Account: class {
    constructor(_client: unknown) {}
  },
  Storage: class {
    constructor(_client: unknown) {}
  },
  TablesDB: class {
    constructor(_client: unknown) {}
  },
  ID: {
    unique: vi.fn(() => 'mock-row-id')
  },
  Permission: {
    read: vi.fn((role: string) => `read:${role}`),
    update: vi.fn((role: string) => `update:${role}`),
    delete: vi.fn((role: string) => `delete:${role}`)
  },
  Role: {
    user: vi.fn((userId: string) => `user:${userId}`)
  },
  Query: {
    equal: vi.fn((key: string, value: unknown) => `equal:${key}:${String(value)}`),
    orderAsc: vi.fn((key: string) => `orderAsc:${key}`),
    orderDesc: vi.fn((key: string) => `orderDesc:${key}`),
    limit: vi.fn((value: number) => `limit:${value}`),
    offset: vi.fn((value: number) => `offset:${value}`)
  }
}))

describe('conversationsService', () => {
  let conversationsService: typeof import('@/services/conversations').default

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockAuthService.getCurrentUser.mockResolvedValue({ $id: 'user-1' } as any)
    mockTablesDB.listRows.mockResolvedValue({ rows: [] } as any)
    mockTablesDB.getRow.mockResolvedValue({} as any)
    mockTablesDB.createRow.mockResolvedValue({ $id: 'mock-row-id' } as any)
    mockTablesDB.updateRow.mockResolvedValue({} as any)
    mockTablesDB.deleteRow.mockResolvedValue(undefined as any)
    mockTablesDB.incrementRowColumn.mockResolvedValue({} as any)
    mockPrivateMessagingFunction.createConversation.mockResolvedValue({
      conversationId: 'conv-1',
      created: true
    })
    mockPrivateMessagingFunction.resolveConversationPeers.mockResolvedValue({
      peers: {
        'conv-1': { userId: 'user-2', name: 'Peer User', avatar: 'https://example.com/avatar.jpg' }
      }
    })
    ;({ default: conversationsService } = await import('@/services/conversations'))
  })

  it('creates conversation via private-messaging function and returns detail', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'conv-1',
      type: 'direct',
      sourcePostId: 'post-1',
      initiatorId: 'user-1',
      lastMessagePreview: '',
      lastMessageAt: '',
      lastSenderId: '',
      status: 'active'
    } as any)

    mockTablesDB.listRows.mockResolvedValue({
      rows: [
        {
          $id: 'member-owner',
          conversationId: 'conv-1',
          userId: 'user-1',
          role: 'owner',
          unreadCount: 0,
          muted: false
        }
      ]
    } as any)

    const result = await conversationsService.createConversation('post-1', ['user-2'])

    expect(mockPrivateMessagingFunction.createConversation).toHaveBeenCalledWith({
      sourcePostId: 'post-1',
      memberIds: ['user-2']
    })
    expect(result.currentMember?.role).toBe('owner')
    expect(result.peerUserId).toBe('user-2')
    expect(result.peerName).toBe('Peer User')
  })

  it('rejects when trying to create conversation with self', async () => {
    await expect(conversationsService.findOrCreateDirectConversation('user-1')).rejects.toMatchObject({
      code: 400
    })
  })

  it('marks member as read and resets unread count', async () => {
    mockTablesDB.listRows.mockResolvedValue({
      rows: [
        {
          $id: 'member-1',
          conversationId: 'conv-1',
          userId: 'user-1',
          role: 'owner',
          lastReadMessageId: '',
          unreadCount: 3,
          muted: false
        }
      ]
    } as any)

    await conversationsService.markAsRead('conv-1', 'user-1', 'msg-1')

    expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'member-1',
      expect.objectContaining({
        lastReadMessageId: 'msg-1',
        unreadCount: 0
      })
    )
  })

  it('increments unread count for non-sender members', async () => {
    mockTablesDB.listRows.mockResolvedValue({
      rows: [
        {
          $id: 'member-1',
          conversationId: 'conv-1',
          userId: 'user-1',
          unreadCount: 0,
          muted: false
        },
        {
          $id: 'member-2',
          conversationId: 'conv-1',
          userId: 'user-2',
          unreadCount: 0,
          muted: false
        }
      ]
    } as any)

    await conversationsService.incrementUnreadForOtherMembers('conv-1', 'user-1')

    expect(mockTablesDB.incrementRowColumn).toHaveBeenCalledTimes(1)
    expect(mockTablesDB.incrementRowColumn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'member-2',
      'unreadCount',
      1
    )
  })
})
