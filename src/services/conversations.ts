import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import privateMessagingFunctionService from '@/services/private-messaging-function'
import type {
  Conversation,
  ConversationCreateData,
  ConversationListItem,
  ConversationListOptions,
  ConversationMember,
  ConversationMemberUpdateData,
  ConversationUpdateData,
  MemberRole
} from '@/types/conversation'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import {
  CONVERSATIONS_TABLE_ID,
  CONVERSATION_MEMBERS_TABLE_ID,
  MINDGUARD_DATABASE_ID
} from '@/utils/appwrite-shared'

function createTypedError(message: string, code: number) {
  const error = new Error(message) as Error & { code?: number }
  error.code = code
  return error
}

class ConversationsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      conversationTableId: CONVERSATIONS_TABLE_ID,
      memberTableId: CONVERSATION_MEMBERS_TABLE_ID
    }
  }

  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    if (!user?.$id) {
      throw createTypedError('User is not authenticated', 401)
    }
    return user.$id
  }

  private normalizeConversation(row: Conversation) {
    return {
      ...row,
      sourcePostId: String(row.sourcePostId || '').trim(),
      lastMessagePreview: String(row.lastMessagePreview || '').trim(),
      lastMessageAt: String(row.lastMessageAt || '').trim(),
      lastSenderId: String(row.lastSenderId || '').trim(),
      type: (row.type || 'direct') as Conversation['type'],
      status: (row.status || 'active') as Conversation['status']
    }
  }

  private normalizeMember(row: ConversationMember) {
    return {
      ...row,
      conversationId: String(row.conversationId || '').trim(),
      userId: String(row.userId || '').trim(),
      role: (row.role || 'member') as ConversationMember['role'],
      lastReadMessageId: String(row.lastReadMessageId || '').trim(),
      unreadCount: Math.max(0, Number(row.unreadCount || 0)),
      muted: Boolean(row.muted)
    }
  }

  private buildConversationPermissions(memberIds: string[], initiatorId: string) {
    const uniqueIds = Array.from(new Set(memberIds.map((id) => String(id || '').trim()).filter(Boolean)))
    const permissions: string[] = []
    uniqueIds.forEach((id) => {
      permissions.push(Permission.read(Role.user(id)))
      permissions.push(Permission.update(Role.user(id)))
    })
    permissions.push(Permission.delete(Role.user(initiatorId)))
    return permissions
  }

  private buildMemberPermissions(userId: string) {
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  }

  private async listConversationMembers(conversationId: string) {
    const { databaseId, memberTableId } = this.getDatabaseAndTable()
    const result = await tablesDB.listRows(databaseId, memberTableId, [
      Query.equal('conversationId', conversationId),
      Query.orderAsc('$createdAt'),
      Query.limit(100)
    ])
    return ((result?.rows || []) as ConversationMember[]).map((row) => this.normalizeMember(row))
  }

  private async getMemberByUser(conversationId: string, userId: string) {
    const { databaseId, memberTableId } = this.getDatabaseAndTable()
    const result = await tablesDB.listRows(databaseId, memberTableId, [
      Query.equal('conversationId', conversationId),
      Query.equal('userId', userId),
      Query.limit(1)
    ])
    const rows = (result?.rows || []) as ConversationMember[]
    return rows.length ? this.normalizeMember(rows[0]) : null
  }

  private async resolveConversationPeers(conversationIds: string[]) {
    const uniqueIds = Array.from(new Set(conversationIds.map((id) => String(id || '').trim()).filter(Boolean)))
    if (!uniqueIds.length) {
      return {} as Record<string, { userId: string; name: string; avatar: string }>
    }

    try {
      const result = await privateMessagingFunctionService.resolveConversationPeers(uniqueIds)
      return result.peers || {}
    } catch {
      return {} as Record<string, { userId: string; name: string; avatar: string }>
    }
  }

  private async findDirectConversationByMembers(memberIds: string[]) {
    const normalizedIds = Array.from(new Set(memberIds.map((id) => String(id || '').trim()).filter(Boolean)))
    if (normalizedIds.length !== 2) {
      return null
    }

    const { databaseId, conversationTableId, memberTableId } = this.getDatabaseAndTable()
    const result = await tablesDB.listRows(databaseId, memberTableId, [
      Query.equal('userId', normalizedIds[0]),
      Query.limit(100)
    ])
    const memberships = (result?.rows || []) as ConversationMember[]

    for (const membership of memberships) {
      const conversationId = String(membership.conversationId || '').trim()
      if (!conversationId) {
        continue
      }
      try {
        const members = await this.listConversationMembers(conversationId)
        const userSet = new Set(members.map((item) => item.userId))
        if (members.length === 2 && normalizedIds.every((id) => userSet.has(id))) {
          const conversation = (await tablesDB.getRow(databaseId, conversationTableId, conversationId)) as Conversation
          if (conversation.type === 'direct' && conversation.status !== 'archived') {
            return this.normalizeConversation(conversation)
          }
        }
      } catch {
        // ignore invalid rows
      }
    }

    return null
  }

  async createConversation(sourcePostId: string, memberIds: string[]) {
    const initiatorId = await this.getAuthUserId()
    const normalizedMembers = Array.from(
      new Set(
        [initiatorId, ...(Array.isArray(memberIds) ? memberIds : [])]
          .map((id) => String(id || '').trim())
          .filter(Boolean)
      )
    )
    if (normalizedMembers.length < 2) {
      throw createTypedError('Conversation must contain at least two members', 400)
    }
    const result = await privateMessagingFunctionService.createConversation({
      sourcePostId,
      memberIds: normalizedMembers.filter((id) => id !== initiatorId)
    })
    return this.getConversation(result.conversationId)
  }

  async findOrCreateDirectConversation(targetUserId: string, sourcePostId = '') {
    const currentUserId = await this.getAuthUserId()
    const normalizedTargetId = String(targetUserId || '').trim()
    if (!normalizedTargetId) {
      throw createTypedError('Target user id is required', 400)
    }
    if (normalizedTargetId === currentUserId) {
      throw createTypedError('Cannot create private conversation with yourself', 400)
    }

    const result = await privateMessagingFunctionService.findOrCreateDirectConversation({
      targetUserId: normalizedTargetId,
      sourcePostId
    })
    return this.getConversation(result.conversationId)
  }

  async getConversation(conversationId: string) {
    const currentUserId = await this.getAuthUserId()
    const normalizedId = String(conversationId || '').trim()
    if (!normalizedId) {
      throw createTypedError('Conversation id is required', 400)
    }

    const { databaseId, conversationTableId } = this.getDatabaseAndTable()
    const conversation = this.normalizeConversation(
      (await tablesDB.getRow(databaseId, conversationTableId, normalizedId)) as Conversation
    )
    const currentMember = await this.getMemberByUser(normalizedId, currentUserId)
    if (!currentMember) {
      throw createTypedError('No access to this conversation', 403)
    }

    const peerMap = await this.resolveConversationPeers([normalizedId])
    const peer = peerMap[normalizedId]
    const peerUserId = peer?.userId || ''
    return {
      ...conversation,
      currentMember,
      memberIds: [currentUserId, peerUserId].filter(Boolean),
      peerUserId,
      peerName: peer?.name || '',
      peerAvatar: peer?.avatar || ''
    } as ConversationListItem
  }

  async listConversations(userId?: string, options: ConversationListOptions = {}) {
    const effectiveUserId = String(userId || '').trim() || (await this.getAuthUserId())
    const { databaseId, conversationTableId, memberTableId } = this.getDatabaseAndTable()

    const membershipResult = await tablesDB.listRows(databaseId, memberTableId, [
      Query.equal('userId', effectiveUserId),
      Query.orderDesc('$updatedAt'),
      Query.limit(options.limit ?? 20),
      Query.offset(options.offset ?? 0)
    ])

    const membershipRows = ((membershipResult?.rows || []) as ConversationMember[]).map((row) =>
      this.normalizeMember(row)
    )

    const conversationEntries = await Promise.all(
      membershipRows.map(async (membership) => {
        const conversationId = String(membership.conversationId || '').trim()
        if (!conversationId) {
          return null
        }
        try {
          const conversation = this.normalizeConversation(
            (await tablesDB.getRow(databaseId, conversationTableId, conversationId)) as Conversation
          )
          if (options.status && conversation.status !== options.status) {
            return null
          }
          return { conversation, currentMember: membership }
        } catch {
          return null
        }
      })
    )

    const validEntries = conversationEntries.filter(Boolean) as Array<{
      conversation: Conversation
      currentMember: ConversationMember
    }>

    const conversationIds = validEntries.map((entry) => entry.conversation.$id)
    const peerMap = await this.resolveConversationPeers(conversationIds)

    const items: ConversationListItem[] = validEntries.map((entry) => {
      const peer = peerMap[entry.conversation.$id]
      const peerUserId = peer?.userId || ''
      return {
        ...entry.conversation,
        currentMember: entry.currentMember,
        memberIds: [effectiveUserId, peerUserId].filter(Boolean),
        peerUserId,
        peerName: peer?.name || '',
        peerAvatar: peer?.avatar || ''
      }
    })

    return items.sort((a, b) => {
      const aTime = new Date(a.lastMessageAt || a.$createdAt || 0).getTime()
      const bTime = new Date(b.lastMessageAt || b.$createdAt || 0).getTime()
      return bTime - aTime
    })
  }

  async updateConversation(conversationId: string, updates: ConversationUpdateData = {}) {
    const current = await this.getConversation(conversationId)
    const { databaseId, conversationTableId } = this.getDatabaseAndTable()
    const payload = {
      type: current.type,
      sourcePostId: updates.sourcePostId ?? current.sourcePostId,
      initiatorId: current.initiatorId,
      lastMessagePreview: updates.lastMessagePreview ?? current.lastMessagePreview,
      lastMessageAt: updates.lastMessageAt ?? current.lastMessageAt,
      lastSenderId: updates.lastSenderId ?? current.lastSenderId,
      status: updates.status ?? current.status
    }
    return (await tablesDB.updateRow(databaseId, conversationTableId, current.$id, payload)) as Conversation
  }

  async archiveConversation(conversationId: string) {
    return this.updateConversation(conversationId, { status: 'archived' })
  }

  async addMember(conversationId: string, userId: string, role: MemberRole = 'member') {
    const normalizedConversationId = String(conversationId || '').trim()
    const normalizedUserId = String(userId || '').trim()
    if (!normalizedConversationId || !normalizedUserId) {
      throw createTypedError('conversationId and userId are required', 400)
    }

    const existing = await this.getMemberByUser(normalizedConversationId, normalizedUserId)
    if (existing) {
      return existing
    }

    const { databaseId, memberTableId } = this.getDatabaseAndTable()
    const payload = {
      conversationId: normalizedConversationId,
      userId: normalizedUserId,
      role,
      lastReadMessageId: '',
      unreadCount: 0,
      muted: false
    }
    const permissions = this.buildMemberPermissions(normalizedUserId)
    const created = (await tablesDB.createRow(
      databaseId,
      memberTableId,
      ID.unique(),
      payload,
      permissions
    )) as ConversationMember
    return this.normalizeMember(created)
  }

  async getMember(conversationId: string, userId: string) {
    return this.getMemberByUser(String(conversationId || '').trim(), String(userId || '').trim())
  }

  async updateMember(conversationId: string, userId: string, updates: ConversationMemberUpdateData = {}) {
    const member = await this.getMemberByUser(String(conversationId || '').trim(), String(userId || '').trim())
    if (!member) {
      throw createTypedError('Conversation member does not exist', 404)
    }

    const { databaseId, memberTableId } = this.getDatabaseAndTable()
    const payload = {
      conversationId: member.conversationId,
      userId: member.userId,
      role: updates.role ?? member.role,
      lastReadMessageId: updates.lastReadMessageId ?? member.lastReadMessageId,
      unreadCount: Math.max(0, Number(updates.unreadCount ?? member.unreadCount)),
      muted: updates.muted ?? member.muted
    }
    const updated = (await tablesDB.updateRow(databaseId, memberTableId, member.$id, payload)) as ConversationMember
    return this.normalizeMember(updated)
  }

  async removeMember(conversationId: string, userId: string) {
    const member = await this.getMemberByUser(String(conversationId || '').trim(), String(userId || '').trim())
    if (!member) {
      return false
    }

    const { databaseId, memberTableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, memberTableId, member.$id)
    return true
  }

  async markAsRead(conversationId: string, userId: string, messageId: string) {
    return this.updateMember(conversationId, userId, {
      lastReadMessageId: String(messageId || '').trim(),
      unreadCount: 0
    })
  }

  async markCurrentUserAsRead(conversationId: string, messageId: string) {
    const userId = await this.getAuthUserId()
    return this.markAsRead(conversationId, userId, messageId)
  }

  async incrementUnreadForOtherMembers(conversationId: string, senderId: string) {
    const normalizedConversationId = String(conversationId || '').trim()
    const normalizedSenderId = String(senderId || '').trim()
    if (!normalizedConversationId || !normalizedSenderId) {
      return
    }

    const members = await this.listConversationMembers(normalizedConversationId)
    const { databaseId, memberTableId } = this.getDatabaseAndTable()
    await Promise.all(
      members
        .filter((member) => member.userId !== normalizedSenderId)
        .map(async (member) => {
          try {
            await tablesDB.incrementRowColumn(
              databaseId,
              memberTableId,
              member.$id,
              'unreadCount',
              1
            )
          } catch (error) {
            console.error(`Failed to increment unread count for member ${member.$id}:`, error)
          }
        })
    )
  }

  async getConversationMemberIds(conversationId: string) {
    const members = await this.listConversationMembers(String(conversationId || '').trim())
    return members.map((member) => member.userId).filter(Boolean)
  }
}

const conversationsService = new ConversationsService()
export default conversationsService
