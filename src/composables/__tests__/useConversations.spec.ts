import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRealtimeConstructor, mockRealtimeService, mockRealtimeSubscription } = vi.hoisted(() => ({
  mockRealtimeConstructor: vi.fn(),
  mockRealtimeService: {
    subscribe: vi.fn()
  },
  mockRealtimeSubscription: {
    close: vi.fn()
  }
}))

vi.mock('appwrite', () => ({
  Client: class {
    setEndpoint() {
      return this
    }
    setProject() {
      return this
    }
    setSession() {
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
  Functions: class {
    constructor(_client: unknown) {}
  },
  ExecutionMethod: {
    POST: 'POST'
  },
  Realtime: class {
    constructor(client: unknown) {
      mockRealtimeConstructor(client)
      return mockRealtimeService
    }
  },
  Query: {
    equal: vi.fn((key: string, value: unknown) => `equal:${key}:${JSON.stringify(value)}`)
  }
}))

function createConversationItem(unreadCount = 0) {
  return {
    $id: 'conv-1',
    type: 'direct' as const,
    sourcePostId: '',
    initiatorId: 'user-2',
    lastMessagePreview: 'hello',
    lastMessageAt: '2026-03-06T12:00:00.000Z',
    lastSenderId: 'user-2',
    status: 'active' as const,
    currentMember: {
      $id: 'member-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      role: 'member' as const,
      lastReadMessageId: '',
      unreadCount,
      muted: false
    },
    peerUserId: 'user-2',
    peerName: 'Peer User',
    peerAvatar: ''
  }
}

async function flushPromises() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve()
  }
}

async function loadUseConversations(uniPlatform: string) {
  vi.resetModules()
  const storage = new Map<string, unknown>([
    ['user', { $id: 'user-1' }],
    ['session', null]
  ])
  ;(globalThis as any).uni = {
    getSystemInfoSync: vi.fn(() => ({
      uniPlatform
    })),
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => {
      storage.set(key, value)
    }),
    removeStorageSync: vi.fn((key: string) => {
      storage.delete(key)
    })
  }
  const [{ useConversations }, { default: conversationsService }] = await Promise.all([
    import('@/composables/useConversations'),
    import('@/services/conversations')
  ])
  return {
    useConversations,
    conversationsService
  }
}

describe('useConversations realtime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockRealtimeSubscription.close.mockResolvedValue(undefined)
    mockRealtimeService.subscribe.mockResolvedValue(mockRealtimeSubscription)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('subscribes to current user member rows and refreshes unread count on realtime event', async () => {
    const { useConversations, conversationsService } = await loadUseConversations('h5')
    vi.spyOn(conversationsService, 'listConversations').mockResolvedValue([createConversationItem(3)] as any)
    const state = useConversations()

    state.startAutoRefresh(10000)
    await flushPromises()

    expect(mockRealtimeService.subscribe).toHaveBeenCalledWith(
      'tablesdb.mindguard.tables.conversation_members.rows',
      expect.any(Function),
      ['equal:userId:["user-1"]']
    )

    const callback = mockRealtimeService.subscribe.mock.calls[0][1] as (event: any) => void
    callback({
      events: ['tablesdb.mindguard.tables.conversation_members.rows.update'],
      payload: {
        $id: 'member-1',
        userId: 'user-1'
      }
    })
    await flushPromises()

    expect(conversationsService.listConversations).toHaveBeenCalledWith(undefined, {
      status: 'active',
      limit: 50,
      offset: 0
    })
    expect(state.totalUnreadCount.value).toBe(3)
  })

  it('falls back to polling when realtime is unsupported', async () => {
    const { useConversations, conversationsService } = await loadUseConversations('mp-weixin')
    vi.spyOn(conversationsService, 'listConversations').mockResolvedValue([createConversationItem(2)] as any)
    const state = useConversations()

    state.startAutoRefresh(12000)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(12000)

    expect(mockRealtimeService.subscribe).not.toHaveBeenCalled()
    expect(conversationsService.listConversations).toHaveBeenCalledWith(undefined, {
      status: 'active',
      limit: 50,
      offset: 0
    })
    expect(state.totalUnreadCount.value).toBe(2)
  })

  it('stops realtime subscription on cleanup', async () => {
    const { useConversations } = await loadUseConversations('h5')
    const state = useConversations()

    state.startAutoRefresh()
    await flushPromises()
    state.stopAutoRefresh()
    await flushPromises()

    expect(mockRealtimeSubscription.close).toHaveBeenCalledTimes(1)
  })
})
