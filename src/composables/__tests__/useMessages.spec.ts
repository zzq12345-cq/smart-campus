import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '@/types/message'

const { mockRealtimeConstructor, mockRealtimeService, mockRealtimeSubscription } =
  vi.hoisted(() => ({
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

function baseMessage(): Message {
  return {
    $id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-2',
    content: 'hello',
    attachments: [],
    messageType: 'text' as const,
    status: 'sent' as const,
    $createdAt: '2026-03-06T12:00:00.000Z',
    $updatedAt: '2026-03-06T12:00:00.000Z'
  }
}

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    ...baseMessage(),
    ...overrides
  }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

async function loadUseMessages(uniPlatform: string) {
  vi.resetModules()
  ;(globalThis as any).uni = {
    getSystemInfoSync: vi.fn(() => ({
      uniPlatform
    }))
  }
  const [{ useMessages }, { default: messagesService }] = await Promise.all([
    import('@/composables/useMessages'),
    import('@/services/messages')
  ])
  return {
    useMessages,
    messagesService
  }
}

describe('useMessages realtime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockRealtimeSubscription.close.mockResolvedValue(undefined)
    mockRealtimeService.subscribe.mockResolvedValue(mockRealtimeSubscription)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('subscribes with server-side conversation filter and applies realtime events', async () => {
    const { useMessages } = await loadUseMessages('h5')
    const state = useMessages('conv-1', 'user-1')

    state.startRealtimeUpdates()
    await flushPromises()
    await vi.runAllTimersAsync()

    expect(mockRealtimeService.subscribe).toHaveBeenCalledWith(
      'tablesdb.mindguard.tables.messages.rows',
      expect.any(Function),
      ['equal:conversationId:["conv-1"]']
    )

    const callback = mockRealtimeService.subscribe.mock.calls[0][1] as (event: any) => void

    callback({
      events: ['tablesdb.mindguard.tables.messages.rows.create'],
      payload: createMessage()
    })
    await flushPromises()
    await vi.runAllTimersAsync()
    expect(state.messages.value.map((item) => item.$id)).toEqual(['msg-1'])

    callback({
      events: ['tablesdb.mindguard.tables.messages.rows.update'],
      payload: createMessage({ status: 'recalled' })
    })
    await flushPromises()
    expect(state.messages.value[0]?.status).toBe('recalled')

    callback({
      events: ['tablesdb.mindguard.tables.messages.rows.delete'],
      payload: createMessage()
    })
    expect(state.messages.value).toEqual([])

    state.stopRealtimeUpdates()
    await flushPromises()
    expect(mockRealtimeSubscription.close).toHaveBeenCalledTimes(1)
  })

  it('falls back to polling when realtime is unsupported', async () => {
    const { useMessages, messagesService } = await loadUseMessages('mp-weixin')
    vi.spyOn(messagesService, 'listMessages').mockResolvedValue([createMessage({ $id: 'msg-poll' })] as any)
    const state = useMessages('conv-1', 'user-1')

    state.startRealtimeUpdates()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(3000)

    expect(mockRealtimeService.subscribe).not.toHaveBeenCalled()
    expect(messagesService.listMessages).toHaveBeenCalledWith('conv-1', {
      limit: 20,
      offset: 0,
      order: 'desc'
    })
    expect(state.messages.value.map((item) => item.$id)).toEqual(['msg-poll'])
  })

  it('re-subscribes when switching conversations while realtime is active', async () => {
    const { useMessages } = await loadUseMessages('h5')
    const state = useMessages('conv-1', 'user-1')

    state.startRealtimeUpdates()
    await flushPromises()
    await vi.runAllTimersAsync()
    state.setConversation('conv-2')
    await flushPromises()
    await vi.runAllTimersAsync()

    expect(mockRealtimeSubscription.close).toHaveBeenCalledTimes(1)
    expect(mockRealtimeService.subscribe).toHaveBeenLastCalledWith(
      'tablesdb.mindguard.tables.messages.rows',
      expect.any(Function),
      ['equal:conversationId:["conv-2"]']
    )
  })

  it('removes temp message once send result matches a realtime create event', async () => {
    const { useMessages, messagesService } = await loadUseMessages('h5')
    let resolveSend: ((value: ReturnType<typeof createMessage>) => void) | undefined
    const pendingCreate = new Promise<ReturnType<typeof createMessage>>((resolve) => {
      resolveSend = resolve
    })
    vi.spyOn(messagesService, 'sendMessage').mockReturnValue(pendingCreate as any)

    const state = useMessages('conv-1', 'user-1')
    state.startRealtimeUpdates()
    await flushPromises()
    await vi.runAllTimersAsync()

    const callback = mockRealtimeService.subscribe.mock.calls[0][1] as (event: any) => void
    const pendingSend = state.sendMessage({ content: 'hello' })

    expect(state.messages.value.some((item) => String(item.$id).startsWith('temp-'))).toBe(true)

    callback({
      events: ['tablesdb.mindguard.tables.messages.rows.create'],
      payload: createMessage({ $id: 'msg-live', senderId: 'user-1' })
    })
    await flushPromises()

    resolveSend?.(createMessage({ $id: 'msg-live', senderId: 'user-1' }))
    await pendingSend

    expect(state.messages.value).toHaveLength(1)
    expect(state.messages.value[0]?.$id).toBe('msg-live')
  })
})
