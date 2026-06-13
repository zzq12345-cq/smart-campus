import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    getCurrentUser: vi.fn()
  }
}))

vi.mock('@/services/auth', () => ({
  default: mockAuthService
}))

const { mockConversationsService, mockUploadPostImage } = vi.hoisted(() => ({
  mockConversationsService: {
    getMember: vi.fn(),
    getConversationMemberIds: vi.fn(),
    updateConversation: vi.fn(),
    incrementUnreadForOtherMembers: vi.fn(),
    markAsRead: vi.fn()
  },
  mockUploadPostImage: vi.fn()
}))

const { mockTablesDB } = vi.hoisted(() => ({
  mockTablesDB: {
    listRows: vi.fn(),
    getRow: vi.fn(),
    createRow: vi.fn(),
    updateRow: vi.fn()
  }
}))

vi.mock('@/services/conversations', () => ({
  default: mockConversationsService
}))

vi.mock('@/services/storage', () => ({
  uploadPostImage: mockUploadPostImage
}))

vi.mock('@/utils/appwrite', () => ({
  tablesDB: mockTablesDB,
  functions: {
    createExecution: vi.fn()
  }
}))

const { mockPrivateMessagingFunction } = vi.hoisted(() => ({
  mockPrivateMessagingFunction: {
    sendMessage: vi.fn()
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
  ExecutionMethod: {
    POST: 'POST',
    GET: 'GET',
    PUT: 'PUT',
    DELETE: 'DELETE'
  },
  ID: {
    unique: vi.fn(() => 'mock-message-id')
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

describe('messagesService', () => {
  let messagesService: typeof import('@/services/messages').default

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockAuthService.getCurrentUser.mockResolvedValue({ $id: 'user-1' } as any)
    mockUploadPostImage.mockResolvedValue('https://example.com/image.jpg')
    mockConversationsService.getMember.mockResolvedValue({
      $id: 'member-1',
      conversationId: 'conv-1',
      userId: 'user-1'
    })
    mockConversationsService.getConversationMemberIds.mockResolvedValue(['user-1', 'user-2'])
    mockConversationsService.updateConversation.mockResolvedValue({})
    mockConversationsService.incrementUnreadForOtherMembers.mockResolvedValue(undefined)
    mockConversationsService.markAsRead.mockResolvedValue({})
    mockTablesDB.listRows.mockResolvedValue({ rows: [] } as any)
    mockTablesDB.getRow.mockResolvedValue({} as any)
    mockTablesDB.createRow.mockResolvedValue({ $id: 'msg-1' } as any)
    mockTablesDB.updateRow.mockResolvedValue({ $id: 'msg-1' } as any)
    mockPrivateMessagingFunction.sendMessage.mockImplementation(async (input: any) => ({
      message: {
        $id: 'msg-1',
        conversationId: input.conversationId,
        senderId: 'user-1',
        content: input.content,
        attachments: input.attachments,
        messageType: input.messageType,
        status: 'sent'
      }
    }))
    ;({ default: messagesService } = await import('@/services/messages'))
  })

  it('sends text message via private-messaging function', async () => {
    const result = await messagesService.sendMessage('conv-1', 'hello')

    expect(mockPrivateMessagingFunction.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        content: 'hello',
        attachments: [],
        messageType: 'text'
      })
    )
    expect(result.messageType).toBe('text')
    expect(result.content).toBe('hello')
  })

  it('uploads local image attachments before sending', async () => {
    const result = await messagesService.sendMessage('conv-1', '', ['/tmp/local-image.png'])

    expect(mockUploadPostImage).toHaveBeenCalledWith({
      localPath: '/tmp/local-image.png'
    })
    expect(mockPrivateMessagingFunction.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: ['https://example.com/image.jpg'],
        messageType: 'image'
      })
    )
    expect(result.messageType).toBe('image')
    expect(result.attachments).toEqual(['https://example.com/image.jpg'])
  })

  it('recalls own message with soft-delete payload', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'old text',
      attachments: [],
      messageType: 'text',
      status: 'sent'
    } as any)
    mockTablesDB.updateRow.mockResolvedValue({
      $id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: '',
      attachments: [],
      messageType: 'text',
      status: 'recalled'
    } as any)

    const result = await messagesService.recallMessage('msg-3')

    expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'msg-3',
      expect.objectContaining({
        status: 'recalled',
        content: '',
        attachments: []
      })
    )
    expect(result.status).toBe('recalled')
  })

  it('rejects when user has no access to message conversation', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'msg-4',
      conversationId: 'conv-denied',
      senderId: 'user-2',
      content: 'no access',
      attachments: [],
      messageType: 'text',
      status: 'sent'
    } as any)
    mockConversationsService.getMember.mockResolvedValue(null)

    await expect(messagesService.getMessage('msg-4')).rejects.toMatchObject({ code: 403 })
  })
})
