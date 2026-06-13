import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSetEndpoint, mockSetProject, mockSetSession, mockAccountCtor, mockStorageCtor, mockTablesCtor, mockFunctionsCtor } =
  vi.hoisted(() => ({
    mockSetEndpoint: vi.fn(),
    mockSetProject: vi.fn(),
    mockSetSession: vi.fn(),
    mockAccountCtor: vi.fn(),
    mockStorageCtor: vi.fn(),
    mockTablesCtor: vi.fn(),
    mockFunctionsCtor: vi.fn()
  }))

vi.mock('appwrite', () => ({
  Client: class {
    headers: Record<string, string> = {}
    config: Record<string, unknown> = {}

    setEndpoint(value: string) {
      mockSetEndpoint(value)
      this.config.endpoint = value
      return this
    }

    setProject(value: string) {
      mockSetProject(value)
      this.config.project = value
      return this
    }

    setSession(value: string) {
      mockSetSession(value)
      this.config.session = value
      this.headers['X-Appwrite-Session'] = value
      return this
    }
  },
  Account: class {
    constructor(client: unknown) {
      mockAccountCtor(client)
    }
  },
  Storage: class {
    constructor(client: unknown) {
      mockStorageCtor(client)
    }
  },
  TablesDB: class {
    constructor(client: unknown) {
      mockTablesCtor(client)
    }
  },
  Functions: class {
    constructor(client: unknown) {
      mockFunctionsCtor(client)
    }
  },
  ExecutionMethod: {
    POST: 'POST'
  }
}))

async function loadModule(storedSession: Record<string, unknown> | null) {
  vi.resetModules()
  ;(globalThis as any).uni = {
    getStorageSync: vi.fn((key: string) => (key === 'session' ? storedSession : undefined)),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn()
  }
  return import('@/utils/appwrite-sdk')
}

describe('appwrite sdk session sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not set client session when storage only contains session id', async () => {
    const module = await loadModule({ $id: 'session-id-only' })

    expect(mockSetSession).not.toHaveBeenCalled()
    const client = module.default as any
    expect(client.config.session).toBeUndefined()
    expect(client.headers['X-Appwrite-Session']).toBeUndefined()
  })

  it('sets client session when storage contains secret', async () => {
    const module = await loadModule({ $id: 'session-id', secret: 'session-secret' })

    expect(mockSetSession).toHaveBeenCalledWith('session-secret')
    const client = module.default as any
    expect(client.config.session).toBe('session-secret')
    expect(client.headers['X-Appwrite-Session']).toBe('session-secret')
  })
})
