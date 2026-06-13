/**
 * Minimal runtime polyfills for running Appwrite client in uni-app.
 * - Add `window` + `localStorage` shim for non-H5 runtimes.
 * - Polyfill URL and URLSearchParams when runtime implementation is missing.
 */

interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

function hasUniStorage() {
  return (
    typeof uni !== 'undefined' &&
    typeof uni.getStorageSync === 'function' &&
    typeof uni.setStorageSync === 'function' &&
    typeof uni.removeStorageSync === 'function'
  )
}

function getGlobalObject() {
  return (
    (typeof globalThis !== 'undefined' && globalThis) ||
    Function('return this')()
  ) as Record<string, any>
}

function ensureWindowShim() {
  if (typeof window !== 'undefined') {
    return
  }
  if (!hasUniStorage()) {
    return
  }

  const globalObject = getGlobalObject()
  if (!globalObject.window) {
    globalObject.window = globalObject
  }

  if (!globalObject.window.location) {
    globalObject.window.location = { host: '' }
  }
  if (!globalObject.window.setTimeout) {
    globalObject.window.setTimeout = setTimeout
  }
  if (!globalObject.window.setInterval) {
    globalObject.window.setInterval = setInterval
  }
  if (!globalObject.window.clearTimeout) {
    globalObject.window.clearTimeout = clearTimeout
  }
  if (!globalObject.window.clearInterval) {
    globalObject.window.clearInterval = clearInterval
  }

  if (!globalObject.window.localStorage) {
    const storageShim: StorageLike = {
      getItem(key) {
        try {
          const value = uni.getStorageSync(key)
          if (typeof value === 'string') {
            return value
          }
          return value == null ? null : String(value)
        } catch {
          return null
        }
      },
      setItem(key, value) {
        try {
          uni.setStorageSync(key, String(value))
        } catch {
          // ignore
        }
      },
      removeItem(key) {
        try {
          uni.removeStorageSync(key)
        } catch {
          // ignore
        }
      }
    }
    globalObject.window.localStorage = storageShim
  }
}

function canUseNativeURL(globalObject: Record<string, any>) {
  try {
    if (typeof globalObject.URL !== 'function') {
      return false
    }
    const parsed = new globalObject.URL('https://example.com/path?x=1')
    return Boolean(parsed && typeof parsed.toString === 'function' && parsed.searchParams)
  } catch {
    return false
  }
}

function canUseNativeURLSearchParams(globalObject: Record<string, any>) {
  try {
    if (typeof globalObject.URLSearchParams !== 'function') {
      return false
    }
    const params = new globalObject.URLSearchParams('a=1')
    return typeof params.append === 'function' && typeof params.toString === 'function'
  } catch {
    return false
  }
}

class URLSearchParamsPolyfill {
  private pairs: Array<[string, string]> = []

  constructor(init: string | Array<[string, string]> | Record<string, unknown> = '') {
    if (typeof init === 'string') {
      const source = init.startsWith('?') ? init.slice(1) : init
      if (!source) {
        return
      }
      source.split('&').forEach((segment) => {
        if (!segment) {
          return
        }
        const eqIndex = segment.indexOf('=')
        const key = eqIndex >= 0 ? segment.slice(0, eqIndex) : segment
        const value = eqIndex >= 0 ? segment.slice(eqIndex + 1) : ''
        this.append(decodeURIComponent(key), decodeURIComponent(value))
      })
      return
    }

    if (Array.isArray(init)) {
      init.forEach(([key, value]) => this.append(key, value))
      return
    }

    Object.entries(init).forEach(([key, value]) => this.append(key, String(value)))
  }

  append(key: string, value: string) {
    this.pairs.push([String(key), String(value)])
  }

  set(key: string, value: string) {
    const normalized = String(key)
    this.pairs = this.pairs.filter(([existingKey]) => existingKey !== normalized)
    this.pairs.push([normalized, String(value)])
  }

  delete(key: string) {
    const normalized = String(key)
    this.pairs = this.pairs.filter(([existingKey]) => existingKey !== normalized)
  }

  get(key: string) {
    const normalized = String(key)
    const found = this.pairs.find(([existingKey]) => existingKey === normalized)
    return found ? found[1] : null
  }

  toString() {
    return this.pairs.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
  }
}

class URLPolyfill {
  private base: string
  hash: string
  searchParams: URLSearchParamsPolyfill

  constructor(input: string) {
    const raw = String(input)
    const hashIndex = raw.indexOf('#')
    const withNoHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
    this.hash = hashIndex >= 0 ? raw.slice(hashIndex) : ''

    const queryIndex = withNoHash.indexOf('?')
    this.base = queryIndex >= 0 ? withNoHash.slice(0, queryIndex) : withNoHash
    const query = queryIndex >= 0 ? withNoHash.slice(queryIndex + 1) : ''
    this.searchParams = new URLSearchParamsPolyfill(query)
  }

  toString() {
    const queryString = this.searchParams.toString()
    return `${this.base}${queryString ? `?${queryString}` : ''}${this.hash || ''}`
  }
}

function defineGlobalValue(globalObject: Record<string, any>, key: string, value: unknown) {
  try {
    globalObject[key] = value
  } catch {
    // ignore
  }
  try {
    if (globalObject.window) {
      globalObject.window[key] = value
    }
  } catch {
    // ignore
  }
}

function ensureURLPolyfill() {
  const globalObject = getGlobalObject()
  const nativeUrlWorks = canUseNativeURL(globalObject)
  const nativeParamsWorks = canUseNativeURLSearchParams(globalObject)
  if (nativeUrlWorks && nativeParamsWorks) {
    return
  }

  defineGlobalValue(globalObject, 'URLSearchParams', URLSearchParamsPolyfill)
  defineGlobalValue(globalObject, 'URL', URLPolyfill)
}

ensureWindowShim()
ensureURLPolyfill()

export { ensureURLPolyfill, ensureWindowShim }
