import { Query } from 'appwrite'
import { computed, nextTick, onUnmounted, ref } from 'vue'
import messagesService from '@/services/messages'
import type { Message, MessageType } from '@/types/message'
import { createRealtimeClient, isRealtimeSupported, messagesChannel } from '@/utils/appwrite-realtime'

interface SendPayload {
  content?: string
  attachments?: string[]
  messageType?: MessageType
}

interface LoadMessagesOptions {
  reset?: boolean
  limit?: number
  silent?: boolean
}

interface RealtimeEvent<T> {
  events?: string[]
  payload?: T
}

interface RealtimeSubscriptionLike {
  close: () => Promise<void>
}

interface RealtimeClientLike {
  subscribe: (
    channel: string,
    callback: (event: RealtimeEvent<Message>) => void,
    queries?: string[]
  ) => Promise<RealtimeSubscriptionLike>
  onError?: (callback: (error?: Error, statusCode?: number) => void) => void
}

let tempIdCounter = 0

function sortByCreatedAt(rows: Message[]) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.$createdAt || 0).getTime()
    const bTime = new Date(b.$createdAt || 0).getTime()
    return aTime - bTime
  })
}

function normalizeIncomingMessage(row?: Partial<Message> | null): Message | null {
  const normalizedId = String(row?.$id || '').trim()
  if (!normalizedId) {
    return null
  }

  return {
    ...(row || {}),
    $id: normalizedId,
    conversationId: String(row?.conversationId || '').trim(),
    senderId: String(row?.senderId || '').trim(),
    content: String(row?.content || ''),
    attachments: Array.isArray(row?.attachments)
      ? row.attachments.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    messageType: row?.messageType === 'image' || row?.messageType === 'mixed' ? row.messageType : 'text',
    status: row?.status === 'recalled' || row?.status === 'deleted' ? row.status : 'sent',
    $createdAt: typeof row?.$createdAt === 'string' ? row.$createdAt : undefined,
    $updatedAt: typeof row?.$updatedAt === 'string' ? row.$updatedAt : undefined
  }
}

export function useMessages(initialConversationId = '', currentUserId = '') {
  const conversationId = ref(String(initialConversationId || '').trim())
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const sending = ref(false)
  const error = ref('')
  const hasMore = ref(true)
  const offset = ref(0)
  const pageSize = ref(20)
  const scrollIntoView = ref('')
  let realtimeTimer: ReturnType<typeof setInterval> | null = null
  let realtimeClient: RealtimeClientLike | null = null
  let realtimeSubscription: RealtimeSubscriptionLike | null = null
  let realtimeTask: Promise<void> = Promise.resolve()
  let realtimeGeneration = 0
  let realtimeIntentEnabled = false
  let realtimePollingInterval = 3000

  const latestMessageId = computed(() => messages.value[messages.value.length - 1]?.$id || '')

  const updateScrollAnchor = () => {
    const latestId = latestMessageId.value
    if (!latestId) {
      return
    }
    const anchor = `message-${latestId}`
    scrollIntoView.value = ''
    nextTick(() => {
      setTimeout(() => {
        scrollIntoView.value = anchor
      }, 80)
    })
  }

  const mergeMessages = (rows: Message[]) => {
    const nextMap = new Map<string, Message>()
    ;[...messages.value, ...rows].forEach((item) => {
      nextMap.set(item.$id, item)
    })
    messages.value = sortByCreatedAt(Array.from(nextMap.values()))
  }

  const removeMessage = (messageId: string) => {
    const normalizedId = String(messageId || '').trim()
    if (!normalizedId) {
      return
    }
    messages.value = messages.value.filter((item) => item.$id !== normalizedId)
  }

  const queueRealtimeTask = (task: () => Promise<void>) => {
    realtimeTask = realtimeTask.catch(() => undefined).then(task)
    return realtimeTask
  }

  const clearPollingTimer = () => {
    if (realtimeTimer) {
      clearInterval(realtimeTimer)
      realtimeTimer = null
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

  const syncLatestMessages = async () => {
    if (!conversationId.value) {
      return
    }
    const previousLatestId = latestMessageId.value
    const rows = await messagesService.listMessages(conversationId.value, {
      limit: pageSize.value,
      offset: 0,
      order: 'desc'
    })
    const normalizedRows = rows
      .map((row) => normalizeIncomingMessage(row))
      .filter((row): row is Message => Boolean(row))
    mergeMessages(normalizedRows)
    if (latestMessageId.value && latestMessageId.value !== previousLatestId) {
      updateScrollAnchor()
    }
  }

  const startPollingFallback = (intervalMs = 3000) => {
    clearPollingTimer()
    realtimeTimer = setInterval(() => {
      syncLatestMessages().catch(() => undefined)
    }, Math.max(3000, intervalMs))
  }

  const handleRealtimeEvent = (activeConversationId: string, event: RealtimeEvent<Message>) => {
    const payload = normalizeIncomingMessage(event.payload)
    if (!payload || payload.conversationId !== activeConversationId) {
      return
    }

    const eventNames = Array.isArray(event.events) ? event.events : []
    if (eventNames.some((item) => item.endsWith('.delete'))) {
      removeMessage(payload.$id)
      return
    }

    const previousLatestId = latestMessageId.value
    mergeMessages([payload])
    if (eventNames.some((item) => item.endsWith('.create')) && latestMessageId.value !== previousLatestId) {
      updateScrollAnchor()
    }
  }

  const subscribeRealtime = async (generation: number, activeConversationId: string) => {
    const nextRealtimeClient = createRealtimeClient()
    if (!nextRealtimeClient) {
      startPollingFallback(realtimePollingInterval)
      return
    }
    realtimeClient = nextRealtimeClient

    realtimeClient.onError?.(() => {
      if (generation !== realtimeGeneration || conversationId.value !== activeConversationId) {
        return
      }
      void queueRealtimeTask(async () => {
        await closeRealtimeSubscription()
        releaseRealtimeClient()
        startPollingFallback(realtimePollingInterval)
      })
    })

    const subscription = await realtimeClient.subscribe(
      messagesChannel(),
      (event) => {
        if (generation !== realtimeGeneration || conversationId.value !== activeConversationId) {
          return
        }
        handleRealtimeEvent(activeConversationId, event as RealtimeEvent<Message>)
      },
      [Query.equal('conversationId', [activeConversationId])]
    )

    if (generation !== realtimeGeneration || conversationId.value !== activeConversationId) {
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

  async function loadMessages(options: LoadMessagesOptions = {}) {
    if (!conversationId.value) {
      messages.value = []
      hasMore.value = false
      return []
    }

    const reset = options.reset !== false
    const limit = Math.max(1, options.limit ?? pageSize.value)
    const silent = Boolean(options.silent)

    if (reset) {
      if (!silent) {
        loading.value = true
      }
      offset.value = 0
      hasMore.value = true
    } else {
      loadingMore.value = true
    }
    error.value = ''

    try {
      const rows = await messagesService.listMessages(conversationId.value, {
        limit,
        offset: offset.value,
        order: 'desc'
      })

      const normalized = sortByCreatedAt(rows)
      if (reset) {
        messages.value = normalized
      } else {
        messages.value = sortByCreatedAt([...normalized, ...messages.value])
      }

      offset.value += rows.length
      hasMore.value = rows.length >= limit
      if (reset) {
        updateScrollAnchor()
      }
      return messages.value
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || '').trim()
      error.value = message || 'Failed to load messages'
      if (!silent) {
        throw err
      }
      return messages.value
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) {
      return messages.value
    }
    return loadMessages({ reset: false, limit: pageSize.value })
  }

  async function sendMessage(payload: SendPayload) {
    if (!conversationId.value) {
      return null
    }

    const tempId = `temp-${Date.now()}-${++tempIdCounter}`
    const tempMessage: Message = {
      $id: tempId,
      conversationId: conversationId.value,
      senderId: currentUserId,
      content: String(payload.content || ''),
      attachments: payload.attachments || [],
      messageType: payload.messageType || 'text',
      status: 'sent',
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      _pending: true
    }

    mergeMessages([tempMessage])
    updateScrollAnchor()

    sending.value = true
    error.value = ''
    try {
      const created = await messagesService.sendMessage(
        conversationId.value,
        String(payload.content || ''),
        payload.attachments || [],
        payload.messageType
      )
      const normalizedCreated = normalizeIncomingMessage(created)
      removeMessage(tempId)
      if (normalizedCreated) {
        mergeMessages([normalizedCreated])
      }
      updateScrollAnchor()
      return created
    } catch (err) {
      messages.value = messages.value.map((m) =>
        m.$id === tempId ? { ...m, _pending: false, _failed: true } : m
      )
      const message = err instanceof Error ? err.message : String(err || '').trim()
      error.value = message || 'Failed to send message'
      throw err
    } finally {
      sending.value = false
    }
  }

  function retryMessage(tempId: string) {
    const failedMsg = messages.value.find((m) => m.$id === tempId && m._failed)
    if (!failedMsg) return
    messages.value = messages.value.filter((m) => m.$id !== tempId)
    sendMessage({
      content: failedMsg.content,
      attachments: failedMsg.attachments,
      messageType: failedMsg.messageType
    }).catch(() => undefined)
  }

  async function recallMessage(messageId: string) {
    const normalizedMessageId = String(messageId || '').trim()
    if (!normalizedMessageId) {
      return null
    }
    const original = messages.value.find((m) => m.$id === normalizedMessageId)
    const prevStatus = original?.status
    if (original) {
      messages.value = messages.value.map((m) =>
        m.$id === normalizedMessageId ? { ...m, status: 'recalled' as const } : m
      )
    }
    try {
      const updated = await messagesService.recallMessage(normalizedMessageId)
      mergeMessages([updated])
      return updated
    } catch (err) {
      if (original && prevStatus) {
        messages.value = messages.value.map((m) =>
          m.$id === normalizedMessageId ? { ...m, status: prevStatus } : m
        )
      }
      throw err
    }
  }

  async function markCurrentConversationAsRead() {
    const latestId = latestMessageId.value
    if (!conversationId.value || !latestId) {
      return
    }
    await messagesService.markConversationAsRead(conversationId.value, latestId)
  }

  function startRealtimeUpdates(intervalMs = 3000) {
    realtimeIntentEnabled = true
    realtimePollingInterval = Math.max(3000, intervalMs)
    teardownRealtimeRuntime()

    const activeConversationId = conversationId.value
    if (!activeConversationId) {
      return
    }
    if (!isRealtimeSupported) {
      startPollingFallback(realtimePollingInterval)
      return
    }

    const generation = realtimeGeneration
    void queueRealtimeTask(async () => {
      if (generation !== realtimeGeneration || conversationId.value !== activeConversationId) {
        return
      }
      try {
        await subscribeRealtime(generation, activeConversationId)
      } catch {
        if (generation === realtimeGeneration && conversationId.value === activeConversationId) {
          startPollingFallback(realtimePollingInterval)
        }
      }
    })
  }

  function stopRealtimeUpdates() {
    realtimeIntentEnabled = false
    teardownRealtimeRuntime()
  }

  function setConversation(nextConversationId: string) {
    const normalizedId = String(nextConversationId || '').trim()
    if (conversationId.value === normalizedId) {
      return
    }
    const shouldRestartRealtime = realtimeIntentEnabled
    const nextPollingInterval = realtimePollingInterval
    teardownRealtimeRuntime()
    conversationId.value = normalizedId
    messages.value = []
    offset.value = 0
    hasMore.value = true
    scrollIntoView.value = ''
    if (shouldRestartRealtime && normalizedId) {
      startRealtimeUpdates(nextPollingInterval)
    }
  }

  onUnmounted(() => {
    stopRealtimeUpdates()
  })

  return {
    conversationId,
    messages,
    loading,
    loadingMore,
    sending,
    error,
    hasMore,
    scrollIntoView,
    latestMessageId,
    updateScrollAnchor,
    setConversation,
    loadMessages,
    loadMore,
    sendMessage,
    retryMessage,
    recallMessage,
    markCurrentConversationAsRead,
    startRealtimeUpdates,
    stopRealtimeUpdates
  }
}
