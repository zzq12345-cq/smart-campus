import { Query } from 'appwrite'
import { computed, ref } from 'vue'
import authService from '@/services/auth'
import conversationsService from '@/services/conversations'
import type { ConversationListItem } from '@/types/conversation'
import { conversationMembersChannel, createRealtimeClient, isRealtimeSupported } from '@/utils/appwrite-realtime'

const conversations = ref<ConversationListItem[]>([])
const loading = ref(false)
const error = ref('')
const loaded = ref(false)
const lastLoadedAt = ref(0)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let realtimeClient: RealtimeClientLike | null = null
let realtimeSubscription: { close: () => Promise<void> } | null = null
let realtimeTask: Promise<void> = Promise.resolve()
let realtimeGeneration = 0
let realtimePollingInterval = 12000
let activeRealtimeUserId = ''
let silentReloadPromise: Promise<ConversationListItem[]> | null = null

interface RealtimeEventPayload {
  $id?: string
  userId?: string
}

interface RealtimeEvent<T> {
  events?: string[]
  payload?: T
}

interface RealtimeClientLike {
  subscribe: (
    channel: string,
    callback: (event: RealtimeEvent<RealtimeEventPayload>) => void,
    queries?: string[]
  ) => Promise<{ close: () => Promise<void> }>
  onError?: (callback: (error?: Error, statusCode?: number) => void) => void
}

const updateConversationInList = (item: ConversationListItem) => {
  const index = conversations.value.findIndex((conversation) => conversation.$id === item.$id)
  if (index >= 0) {
    conversations.value.splice(index, 1, item)
  } else {
    conversations.value.unshift(item)
  }
}

const sortConversations = () => {
  conversations.value = [...conversations.value].sort((a, b) => {
    const aTime = new Date(a.lastMessageAt || a.$createdAt || 0).getTime()
    const bTime = new Date(b.lastMessageAt || b.$createdAt || 0).getTime()
    return bTime - aTime
  })
}

const queueRealtimeTask = (task: () => Promise<void>) => {
  realtimeTask = realtimeTask.catch(() => undefined).then(task)
  return realtimeTask
}

const clearPollingTimer = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const closeRealtimeSubscription = async () => {
  if (!realtimeSubscription) {
    return
  }
  const activeSubscription = realtimeSubscription
  realtimeSubscription = null
  try {
    await activeSubscription.close()
  } catch {
    // ignore subscription close failure
  }
}

const releaseRealtimeClient = () => {
  realtimeClient = null
}

const teardownRealtimeRuntime = () => {
  realtimeGeneration += 1
  clearPollingTimer()
  void queueRealtimeTask(closeRealtimeSubscription)
  releaseRealtimeClient()
}

const resolveRealtimeUserId = () => String(authService.getStoredUser()?.$id || '').trim()

export function useConversations() {
  const totalUnreadCount = computed(() =>
    conversations.value.reduce((sum, item) => sum + Number(item.currentMember?.unreadCount || 0), 0)
  )

  async function loadConversations(options: { silent?: boolean } = {}) {
    const silent = Boolean(options.silent)
    if (!silent) {
      loading.value = true
    }
    error.value = ''
    try {
      const rows = await conversationsService.listConversations(undefined, {
        status: 'active',
        limit: 50,
        offset: 0
      })
      conversations.value = rows
      sortConversations()
      loaded.value = true
      lastLoadedAt.value = Date.now()
      return rows
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || '').trim()
      error.value = message || 'Failed to load conversations'
      if (!silent) {
        throw err
      }
      return conversations.value
    } finally {
      if (!silent) {
        loading.value = false
      }
    }
  }

  async function queueSilentReload() {
    if (silentReloadPromise) {
      return silentReloadPromise
    }
    silentReloadPromise = loadConversations({ silent: true }).finally(() => {
      silentReloadPromise = null
    })
    return silentReloadPromise
  }

  async function createConversation(sourcePostId: string, memberIds: string[]) {
    const conversation = await conversationsService.createConversation(sourcePostId, memberIds)
    updateConversationInList(conversation)
    sortConversations()
    return conversation
  }

  async function findOrCreateConversation(targetUserId: string, sourcePostId = '') {
    const conversation = await conversationsService.findOrCreateDirectConversation(targetUserId, sourcePostId)
    updateConversationInList(conversation)
    sortConversations()
    return conversation
  }

  async function archiveConversation(conversationId: string) {
    const snapshot = conversations.value.slice()
    conversations.value = conversations.value.filter((item) => item.$id !== conversationId)
    try {
      await conversationsService.archiveConversation(conversationId)
    } catch (err) {
      conversations.value = snapshot
      throw err
    }
  }

  async function markAsRead(conversationId: string, messageId = '') {
    const target = conversations.value.find((item) => item.$id === conversationId)
    const prevUnread = target?.currentMember?.unreadCount ?? 0
    const prevLastRead = target?.currentMember?.lastReadMessageId ?? ''
    if (target?.currentMember) {
      target.currentMember.unreadCount = 0
      target.currentMember.lastReadMessageId = messageId
    }
    try {
      await conversationsService.markCurrentUserAsRead(conversationId, messageId)
    } catch (err) {
      if (target?.currentMember) {
        target.currentMember.unreadCount = prevUnread
        target.currentMember.lastReadMessageId = prevLastRead
      }
      throw err
    }
  }

  const startPollingFallback = (intervalMs = 12000) => {
    clearPollingTimer()
    refreshTimer = setInterval(() => {
      queueSilentReload().catch(() => undefined)
    }, Math.max(3000, intervalMs))
  }

  const handleConversationMemberEvent = (userId: string, event: RealtimeEvent<RealtimeEventPayload>) => {
    const payloadUserId = String(event.payload?.userId || '').trim()
    if (payloadUserId !== userId) {
      return
    }
    queueSilentReload().catch(() => undefined)
  }

  const subscribeRealtime = async (generation: number, userId: string) => {
    const nextRealtimeClient = createRealtimeClient()
    if (!nextRealtimeClient) {
      startPollingFallback(realtimePollingInterval)
      return
    }
    realtimeClient = nextRealtimeClient

    realtimeClient.onError?.(() => {
      if (generation !== realtimeGeneration || activeRealtimeUserId !== userId) {
        return
      }
      void queueRealtimeTask(async () => {
        await closeRealtimeSubscription()
        releaseRealtimeClient()
        startPollingFallback(realtimePollingInterval)
      })
    })

    const subscription = await realtimeClient.subscribe(
      conversationMembersChannel(),
      (event) => {
        if (generation !== realtimeGeneration || activeRealtimeUserId !== userId) {
          return
        }
        handleConversationMemberEvent(userId, event as RealtimeEvent<RealtimeEventPayload>)
      },
      [Query.equal('userId', [userId])]
    )

    if (generation !== realtimeGeneration || activeRealtimeUserId !== userId) {
      try {
        await subscription.close()
      } catch {
        // ignore stale subscription close failure
      }
      if (realtimeClient === nextRealtimeClient) {
        releaseRealtimeClient()
      }
      return
    }

    realtimeSubscription = subscription
  }

  function startAutoRefresh(intervalMs = 12000) {
    realtimePollingInterval = Math.max(3000, intervalMs)
    activeRealtimeUserId = resolveRealtimeUserId()
    teardownRealtimeRuntime()

    if (!activeRealtimeUserId) {
      startPollingFallback(realtimePollingInterval)
      return
    }
    if (!isRealtimeSupported) {
      startPollingFallback(realtimePollingInterval)
      return
    }

    const generation = realtimeGeneration
    void queueRealtimeTask(async () => {
      if (generation !== realtimeGeneration || activeRealtimeUserId !== resolveRealtimeUserId()) {
        return
      }
      try {
        await subscribeRealtime(generation, activeRealtimeUserId)
      } catch {
        if (generation === realtimeGeneration) {
          startPollingFallback(realtimePollingInterval)
        }
      }
    })
  }

  function stopAutoRefresh() {
    activeRealtimeUserId = ''
    teardownRealtimeRuntime()
  }

  async function refreshUnreadCount() {
    await loadConversations({ silent: true })
    return totalUnreadCount.value
  }

  return {
    conversations,
    loading,
    error,
    loaded,
    lastLoadedAt,
    totalUnreadCount,
    loadConversations,
    createConversation,
    findOrCreateConversation,
    archiveConversation,
    markAsRead,
    refreshUnreadCount,
    startAutoRefresh,
    stopAutoRefresh
  }
}
