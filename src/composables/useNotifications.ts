import { computed, ref } from 'vue'
import notificationsService from '@/services/notifications'
import type { NotificationListItem } from '@/types/notification'

const notifications = ref<NotificationListItem[]>([])
const loading = ref(false)
const error = ref('')
const loaded = ref(false)
const unreadCount = ref(0)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let countPollTimer: ReturnType<typeof setInterval> | null = null

export function useNotifications() {
  const totalUnreadCount = computed(() => unreadCount.value)

  async function loadNotifications(options: { silent?: boolean } = {}) {
    const silent = Boolean(options.silent)
    if (!silent) {
      loading.value = true
    }
    error.value = ''
    try {
      const rows = await notificationsService.listNotifications({ limit: 50 })
      notifications.value = rows
      unreadCount.value = rows.filter((n) => !n.isRead).length
      loaded.value = true
      return rows
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || '').trim()
      error.value = message || 'Failed to load notifications'
      if (!silent) {
        throw err
      }
      return notifications.value
    } finally {
      if (!silent) {
        loading.value = false
      }
    }
  }

  async function refreshUnreadCount() {
    try {
      unreadCount.value = await notificationsService.getUnreadCount()
    } catch {
      // silent
    }
    return unreadCount.value
  }

  async function markAsRead(notificationId: string) {
    const target = notifications.value.find((n) => n.$id === notificationId)
    const wasRead = target?.isRead ?? true
    if (target && !wasRead) {
      target.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    try {
      await notificationsService.markAsRead(notificationId)
    } catch (err) {
      if (target && !wasRead) {
        target.isRead = false
        unreadCount.value += 1
      }
      throw err
    }
  }

  async function markAllAsRead() {
    const prevStates = notifications.value.map((n) => ({ id: n.$id, isRead: n.isRead }))
    const prevCount = unreadCount.value
    notifications.value.forEach((n) => {
      n.isRead = true
    })
    unreadCount.value = 0
    try {
      await notificationsService.markAllAsRead()
    } catch (err) {
      prevStates.forEach(({ id, isRead }) => {
        const n = notifications.value.find((item) => item.$id === id)
        if (n) n.isRead = isRead
      })
      unreadCount.value = prevCount
      throw err
    }
  }

  function startAutoRefresh(intervalMs = 15000) {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    refreshTimer = setInterval(() => {
      loadNotifications({ silent: true }).catch(() => undefined)
    }, Math.max(5000, intervalMs))
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  function startCountPolling(intervalMs = 15000) {
    stopCountPolling()
    refreshUnreadCount()
    countPollTimer = setInterval(() => {
      refreshUnreadCount()
    }, Math.max(5000, intervalMs))
  }

  function stopCountPolling() {
    if (countPollTimer) {
      clearInterval(countPollTimer)
      countPollTimer = null
    }
  }

  return {
    notifications,
    loading,
    error,
    loaded,
    totalUnreadCount,
    loadNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    startAutoRefresh,
    stopAutoRefresh,
    startCountPolling,
    stopCountPolling
  }
}
