const DEFAULT_TTL = 60_000

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttl) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      store.delete(key)
    }
  }
}
