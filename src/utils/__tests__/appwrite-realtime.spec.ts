import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRealtimeConstructor, mockRealtimeService } = vi.hoisted(() => ({
    mockRealtimeConstructor: vi.fn(),
    mockRealtimeService: {
      subscribe: vi.fn()
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
  }
}))

async function loadModule(uniPlatform: string) {
  vi.resetModules()
  ;(globalThis as any).uni = {
    getSystemInfoSync: vi.fn(() => ({
      uniPlatform
    }))
  }
  return import('@/utils/appwrite-realtime')
}

describe('appwrite realtime utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates independent realtime clients on supported platforms', async () => {
    const module = await loadModule('h5')

    expect(module.isRealtimeSupported).toBe(true)
    const firstClient = module.createRealtimeClient()
    const secondClient = module.createRealtimeClient()

    expect(firstClient).not.toBeNull()
    expect(secondClient).not.toBeNull()
    expect(mockRealtimeConstructor).toHaveBeenCalledTimes(2)
    expect(module.messagesChannel()).toBe('tablesdb.mindguard.tables.messages.rows')
    expect(module.conversationMembersChannel()).toBe('tablesdb.mindguard.tables.conversation_members.rows')
    expect(module.conversationsChannel()).toBe('tablesdb.mindguard.tables.conversations.rows')
  })

  it('disables realtime on mp-weixin runtime', async () => {
    const module = await loadModule('mp-weixin')

    expect(module.isRealtimeSupported).toBe(false)
    expect(module.createRealtimeClient()).toBeNull()
    expect(mockRealtimeConstructor).not.toHaveBeenCalled()
  })
})
