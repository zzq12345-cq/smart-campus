export type ConversationType = 'direct'
export type ConversationStatus = 'active' | 'archived'
export type MemberRole = 'owner' | 'member'

export interface Conversation {
  $id: string
  type: ConversationType
  sourcePostId: string
  initiatorId: string
  lastMessagePreview: string
  lastMessageAt: string
  lastSenderId: string
  status: ConversationStatus
  $createdAt?: string
  $updatedAt?: string
  $permissions?: string[]
  [key: string]: unknown
}

export interface ConversationMember {
  $id: string
  conversationId: string
  userId: string
  role: MemberRole
  lastReadMessageId: string
  unreadCount: number
  muted: boolean
  $createdAt?: string
  $updatedAt?: string
  $permissions?: string[]
  [key: string]: unknown
}

export interface ConversationCreateData {
  sourcePostId?: string
  memberIds: string[]
  type?: ConversationType
}

export interface ConversationUpdateData {
  sourcePostId?: string
  lastMessagePreview?: string
  lastMessageAt?: string
  lastSenderId?: string
  status?: ConversationStatus
}

export interface ConversationMemberUpdateData {
  role?: MemberRole
  lastReadMessageId?: string
  unreadCount?: number
  muted?: boolean
}

export interface ConversationListOptions {
  status?: ConversationStatus | ''
  limit?: number
  offset?: number
}

export interface ConversationListItem extends Conversation {
  currentMember?: ConversationMember
  memberIds?: string[]
  peerUserId?: string
  peerName?: string
  peerAvatar?: string
}
