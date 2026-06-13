export type MessageType = 'text' | 'image' | 'mixed'
export type MessageStatus = 'sent' | 'recalled' | 'deleted'

export interface Message {
  $id: string
  conversationId: string
  senderId: string
  content: string
  attachments: string[]
  messageType: MessageType
  status: MessageStatus
  $createdAt?: string
  $updatedAt?: string
  $permissions?: string[]
  [key: string]: unknown
}

export interface MessageCreateData {
  conversationId: string
  content?: string
  attachments?: string[]
  messageType?: MessageType
}

export interface MessageUpdateData {
  content?: string
  attachments?: string[]
  messageType?: MessageType
  status?: MessageStatus
}

export interface MessageListOptions {
  limit?: number
  offset?: number
  status?: MessageStatus | ''
  order?: 'asc' | 'desc'
}
