// Social notification types
export type SocialNotificationType = 'like' | 'comment' | 'reply' | 'follow'

// System notification types
export type SystemNotificationType = 'system'

// Push notification types (robot push system)
export type PushNotificationType = 'course_reminder' | 'checkin_reminder' | 'order_status' | 'ai_message'

// Combined notification type
export type NotificationType = SocialNotificationType | SystemNotificationType | PushNotificationType

// Push notification types array for type guard
export const PUSH_NOTIFICATION_TYPES: PushNotificationType[] = [
  'course_reminder',
  'checkin_reminder',
  'order_status',
  'ai_message'
]

// Type guard function to check if notification is a push type
export function isPushNotification(notification: NotificationRow): notification is NotificationRow & { type: PushNotificationType } {
  return PUSH_NOTIFICATION_TYPES.includes(notification.type as PushNotificationType)
}

export type NotificationTargetType = 'post' | 'comment' | 'user'

export interface NotificationRow {
  $id: string
  recipientId: string
  actorId: string
  type: NotificationType
  targetType: NotificationTargetType
  targetId: string
  preview: string
  isRead: boolean
  groupKey: string
  $createdAt: string
  $updatedAt?: string
  $permissions?: string[]
}

export interface NotificationListItem extends NotificationRow {
  actorName: string
  actorAvatar: string
}

export interface CreateNotificationInput {
  recipientId: string
  actorId: string
  type: NotificationType
  targetType: NotificationTargetType
  targetId: string
  preview?: string
  groupKey?: string
  // Optional metadata for push notifications
  metadata?: {
    // Course reminder metadata
    courseId?: string
    courseName?: string
    startTime?: string
    location?: string
    // Checkin reminder metadata
    streakDays?: number
    // Order status metadata
    orderId?: string
    orderStatus?: string
    // AI message metadata
    conversationId?: string
    // Generic metadata
    [key: string]: string | number | undefined
  }
}
