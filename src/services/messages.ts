import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import conversationsService from '@/services/conversations'
import privateMessagingFunctionService from '@/services/private-messaging-function'
import { uploadPostImage } from '@/services/storage'
import type { Message, MessageCreateData, MessageListOptions, MessageType, MessageUpdateData } from '@/types/message'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MESSAGES_TABLE_ID, MINDGUARD_DATABASE_ID } from '@/utils/appwrite-shared'

function createTypedError(message: string, code: number) {
  const error = new Error(message) as Error & { code?: number }
  error.code = code
  return error
}

class MessagesService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: MESSAGES_TABLE_ID
    }
  }

  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    if (!user?.$id) {
      throw createTypedError('User is not authenticated', 401)
    }
    return user.$id
  }

  private normalizeMessage(row: Message) {
    return {
      ...row,
      conversationId: String(row.conversationId || '').trim(),
      senderId: String(row.senderId || '').trim(),
      content: String(row.content || ''),
      attachments: Array.isArray(row.attachments)
        ? row.attachments.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [],
      messageType: (row.messageType || 'text') as MessageType,
      status: (row.status || 'sent') as Message['status']
    }
  }

  private buildMessagePermissions(memberIds: string[], senderId: string) {
    const uniqueIds = Array.from(new Set(memberIds.map((id) => String(id || '').trim()).filter(Boolean)))
    const permissions: string[] = []
    uniqueIds.forEach((id) => {
      permissions.push(Permission.read(Role.user(id)))
    })
    permissions.push(Permission.update(Role.user(senderId)))
    permissions.push(Permission.delete(Role.user(senderId)))
    return permissions
  }

  private resolveMessageType(content: string, attachments: string[], explicitType?: MessageType) {
    if (explicitType) {
      return explicitType
    }
    if (content && attachments.length) {
      return 'mixed' as MessageType
    }
    if (attachments.length) {
      return 'image' as MessageType
    }
    return 'text' as MessageType
  }

  private async normalizeAttachments(attachments?: string[]) {
    if (!Array.isArray(attachments) || !attachments.length) {
      return [] as string[]
    }
    const results: string[] = []
    for (const item of attachments) {
      const value = String(item || '').trim()
      if (!value) {
        continue
      }
      if (/^https?:\/\//i.test(value)) {
        results.push(value)
        continue
      }
      const uploadedUrl = await uploadPostImage({ localPath: value })
      results.push(String(uploadedUrl || '').trim())
    }
    return results.filter(Boolean)
  }

  private async ensureConversationAccess(conversationId: string, userId: string) {
    const member = await conversationsService.getMember(conversationId, userId)
    if (!member) {
      throw createTypedError('No access to this conversation', 403)
    }
    return member
  }

  async sendMessage(
    conversationId: string,
    content = '',
    attachments: string[] = [],
    messageType?: MessageType
  ) {
    const senderId = await this.getAuthUserId()
    const normalizedConversationId = String(conversationId || '').trim()
    if (!normalizedConversationId) {
      throw createTypedError('Conversation id is required', 400)
    }
    await this.ensureConversationAccess(normalizedConversationId, senderId)

    const normalizedContent = String(content || '').trim()
    const normalizedAttachments = await this.normalizeAttachments(attachments)
    const resolvedType = this.resolveMessageType(normalizedContent, normalizedAttachments, messageType)
    if (!normalizedContent && normalizedAttachments.length === 0) {
      throw createTypedError('Message content or attachments are required', 400)
    }

    const result = await privateMessagingFunctionService.sendMessage({
      conversationId: normalizedConversationId,
      content: normalizedContent,
      attachments: normalizedAttachments,
      messageType: resolvedType
    })
    return this.normalizeMessage(result.message)
  }

  async sendMessageWithData(input: MessageCreateData) {
    return this.sendMessage(input.conversationId, input.content || '', input.attachments || [], input.messageType)
  }

  async getMessage(messageId: string) {
    const currentUserId = await this.getAuthUserId()
    const normalizedMessageId = String(messageId || '').trim()
    if (!normalizedMessageId) {
      throw createTypedError('Message id is required', 400)
    }

    const { databaseId, tableId } = this.getDatabaseAndTable()
    const message = this.normalizeMessage(
      (await tablesDB.getRow(databaseId, tableId, normalizedMessageId)) as Message
    )
    await this.ensureConversationAccess(message.conversationId, currentUserId)
    return message
  }

  async listMessages(conversationId: string, options: MessageListOptions = {}) {
    const currentUserId = await this.getAuthUserId()
    const normalizedConversationId = String(conversationId || '').trim()
    if (!normalizedConversationId) {
      throw createTypedError('Conversation id is required', 400)
    }
    await this.ensureConversationAccess(normalizedConversationId, currentUserId)

    const queries: string[] = [Query.equal('conversationId', normalizedConversationId)]
    if (options.status) {
      queries.push(Query.equal('status', options.status))
    }
    if (options.order === 'asc') {
      queries.push(Query.orderAsc('$createdAt'))
    } else {
      queries.push(Query.orderDesc('$createdAt'))
    }
    queries.push(Query.limit(options.limit ?? 20))
    queries.push(Query.offset(options.offset ?? 0))

    const { databaseId, tableId } = this.getDatabaseAndTable()
    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return ((result?.rows || []) as Message[]).map((row) => this.normalizeMessage(row))
  }

  async updateMessage(messageId: string, updates: MessageUpdateData = {}) {
    const currentUserId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const existing = this.normalizeMessage((await tablesDB.getRow(databaseId, tableId, messageId)) as Message)
    if (existing.senderId !== currentUserId) {
      throw createTypedError('No permission to update this message', 403)
    }

    const nextContent = typeof updates.content === 'string' ? updates.content.trim() : existing.content
    const nextAttachments = Array.isArray(updates.attachments)
      ? await this.normalizeAttachments(updates.attachments)
      : existing.attachments
    const nextStatus = updates.status ?? existing.status
    const nextType = updates.messageType ?? this.resolveMessageType(nextContent, nextAttachments, existing.messageType)
    const payload = {
      conversationId: existing.conversationId,
      senderId: existing.senderId,
      content: nextContent,
      attachments: nextAttachments,
      messageType: nextType,
      status: nextStatus
    }

    const updated = (await tablesDB.updateRow(databaseId, tableId, existing.$id, payload)) as Message
    return this.normalizeMessage(updated)
  }

  async recallMessage(messageId: string) {
    return this.updateMessage(messageId, {
      content: '',
      attachments: [],
      messageType: 'text',
      status: 'recalled'
    })
  }

  async deleteMessage(messageId: string) {
    return this.updateMessage(messageId, {
      content: '',
      attachments: [],
      messageType: 'text',
      status: 'deleted'
    })
  }

  async markConversationAsRead(conversationId: string, lastMessageId: string) {
    const currentUserId = await this.getAuthUserId()
    return conversationsService.markAsRead(conversationId, currentUserId, lastMessageId)
  }
}

const messagesService = new MessagesService()
export default messagesService
