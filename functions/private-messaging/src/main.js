import crypto from 'node:crypto'
import { Client, Query, TablesDB, Users } from 'node-appwrite'

function env(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function cleanString(value, maxLength) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return ''
  }
  return typeof maxLength === 'number' ? normalized.slice(0, maxLength) : normalized
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => cleanString(item)).filter(Boolean)
}

function createPermission(action, role) {
  return `${action}("${role}")`
}

function userRole(userId) {
  return `user:${cleanString(userId)}`
}

function buildConversationPermissions(memberIds, initiatorId) {
  const uniqueIds = Array.from(new Set(normalizeStringArray(memberIds)))
  const permissions = []
  uniqueIds.forEach((userId) => {
    permissions.push(createPermission('read', userRole(userId)))
    permissions.push(createPermission('update', userRole(userId)))
  })
  permissions.push(createPermission('delete', userRole(initiatorId)))
  return permissions
}

function buildMemberPermissions(allMemberIds, ownerId) {
  const uniqueIds = Array.from(new Set(normalizeStringArray(allMemberIds)))
  const permissions = uniqueIds.map((id) => createPermission('read', userRole(id)))
  permissions.push(createPermission('update', userRole(ownerId)))
  permissions.push(createPermission('delete', userRole(ownerId)))
  return permissions
}

function buildMessagePermissions(memberIds, senderId) {
  const uniqueIds = Array.from(new Set(normalizeStringArray(memberIds)))
  const permissions = uniqueIds.map((userId) => createPermission('read', userRole(userId)))
  permissions.push(createPermission('update', userRole(senderId)))
  permissions.push(createPermission('delete', userRole(senderId)))
  return permissions
}

function nowIso() {
  return new Date().toISOString()
}

function createError(message, code = 500) {
  const error = new Error(message)
  error.code = code
  return error
}

function parseBody(req) {
  if (req?.bodyJson && typeof req.bodyJson === 'object') {
    return req.bodyJson
  }
  const raw = typeof req?.bodyText === 'string' ? req.bodyText : typeof req?.body === 'string' ? req.body : '{}'
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function respondJson(res, statusCode, payload) {
  return res.json(payload, statusCode)
}

function ok(res, data) {
  return respondJson(res, 200, {
    ok: true,
    data
  })
}

function fail(res, error) {
  const statusCode = Number(error?.code || 500)
  return respondJson(res, statusCode, {
    ok: false,
    error: String(error?.message || 'Unknown error'),
    code: statusCode
  })
}

function getContext(req) {
  const endpoint = env('APPWRITE_ENDPOINT', env('APPWRITE_FUNCTION_API_ENDPOINT', ''))
  const projectId = env('APPWRITE_PROJECT_ID', env('APPWRITE_FUNCTION_PROJECT_ID', ''))
  const apiKey = env('APPWRITE_API_KEY', '') || cleanString(req?.headers?.['x-appwrite-key'])
  if (!endpoint) {
    throw createError('Missing APPWRITE_ENDPOINT', 500)
  }
  if (!projectId) {
    throw createError('Missing APPWRITE_PROJECT_ID', 500)
  }
  if (!apiKey) {
    throw createError('Missing APPWRITE_API_KEY', 500)
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  return {
    tablesDB: new TablesDB(client),
    users: new Users(client),
    databaseId: env('APPWRITE_DATABASE_ID', 'mindguard'),
    conversationsTableId: env('APPWRITE_CONVERSATIONS_TABLE_ID', 'conversations'),
    conversationMembersTableId: env('APPWRITE_CONVERSATION_MEMBERS_TABLE_ID', 'conversation_members'),
    messagesTableId: env('APPWRITE_MESSAGES_TABLE_ID', 'messages')
  }
}

function getAuthenticatedUserId(req) {
  const userId = cleanString(
    req?.headers?.['x-appwrite-user-id'] ||
      req?.headers?.['X-Appwrite-User-Id'] ||
      req?.headers?.['x-appwrite-userid']
  )
  if (!userId) {
    throw createError('User is not authenticated', 401)
  }
  return userId
}

async function listConversationMembers(context, conversationId) {
  const result = await context.tablesDB.listRows({
    databaseId: context.databaseId,
    tableId: context.conversationMembersTableId,
    queries: [Query.equal('conversationId', conversationId), Query.orderAsc('$createdAt'), Query.limit(100)]
  })
  return Array.isArray(result?.rows) ? result.rows : []
}

async function getMemberByUser(context, conversationId, userId) {
  const result = await context.tablesDB.listRows({
    databaseId: context.databaseId,
    tableId: context.conversationMembersTableId,
    queries: [Query.equal('conversationId', conversationId), Query.equal('userId', userId), Query.limit(1)]
  })
  const rows = Array.isArray(result?.rows) ? result.rows : []
  return rows[0] || null
}

async function findDirectConversationByMembers(context, memberIds) {
  const normalizedIds = Array.from(new Set(normalizeStringArray(memberIds)))
  if (normalizedIds.length !== 2) {
    return null
  }

  const membershipResult = await context.tablesDB.listRows({
    databaseId: context.databaseId,
    tableId: context.conversationMembersTableId,
    queries: [Query.equal('userId', normalizedIds), Query.limit(50)]
  })
  const memberships = Array.isArray(membershipResult?.rows) ? membershipResult.rows : []

  for (const membership of memberships) {
    const conversationId = cleanString(membership?.conversationId)
    if (!conversationId) {
      continue
    }

    const members = await listConversationMembers(context, conversationId)
    const userSet = new Set(members.map((item) => cleanString(item?.userId)).filter(Boolean))
    if (members.length !== 2 || normalizedIds.some((id) => !userSet.has(id))) {
      continue
    }

    const conversation = await context.tablesDB.getRow({
      databaseId: context.databaseId,
      tableId: context.conversationsTableId,
      rowId: conversationId
    })
    if (cleanString(conversation?.type) === 'direct' && cleanString(conversation?.status || 'active') !== 'archived') {
      return conversation
    }
  }

  return null
}

async function createMemberRow(context, conversationId, userId, role, allMemberIds) {
  return context.tablesDB.createRow({
    databaseId: context.databaseId,
    tableId: context.conversationMembersTableId,
    rowId: crypto.randomUUID(),
    data: {
      conversationId,
      userId,
      role,
      lastReadMessageId: '',
      unreadCount: 0,
      muted: false
    },
    permissions: buildMemberPermissions(allMemberIds, userId)
  })
}

async function handleCreateConversation(context, currentUserId, payload) {
  const memberIds = Array.from(
    new Set([currentUserId, ...normalizeStringArray(payload?.memberIds)].filter(Boolean))
  )
  if (memberIds.length !== 2) {
    throw createError('Direct conversation must contain exactly two members', 400)
  }

  const existingConversation = await findDirectConversationByMembers(context, memberIds)
  if (existingConversation?.$id) {
    return {
      conversationId: existingConversation.$id,
      created: false
    }
  }

  const sourcePostId = cleanString(payload?.sourcePostId, 36)
  const conversation = await context.tablesDB.createRow({
    databaseId: context.databaseId,
    tableId: context.conversationsTableId,
    rowId: crypto.randomUUID(),
    data: {
      type: 'direct',
      sourcePostId,
      initiatorId: currentUserId,
      lastMessagePreview: '',
      lastMessageAt: nowIso(),
      lastSenderId: '',
      status: 'active'
    },
    permissions: buildConversationPermissions(memberIds, currentUserId)
  })

  await Promise.all(
    memberIds.map((userId) =>
      createMemberRow(context, conversation.$id, userId, userId === currentUserId ? 'owner' : 'member', memberIds)
    )
  )

  return {
    conversationId: conversation.$id,
    created: true
  }
}

async function handleFindOrCreateDirectConversation(context, currentUserId, payload) {
  const targetUserId = cleanString(payload?.targetUserId, 36)
  if (!targetUserId) {
    throw createError('Target user id is required', 400)
  }
  if (targetUserId === currentUserId) {
    throw createError('Cannot create private conversation with yourself', 400)
  }

  return handleCreateConversation(context, currentUserId, {
    sourcePostId: payload?.sourcePostId,
    memberIds: [targetUserId]
  })
}

function resolveMessageType(content, attachments, explicitType) {
  const normalizedType = cleanString(explicitType)
  if (['text', 'image', 'mixed'].includes(normalizedType)) {
    return normalizedType
  }
  if (content && attachments.length) {
    return 'mixed'
  }
  if (attachments.length) {
    return 'image'
  }
  return 'text'
}

async function incrementUnreadForOtherMembers(context, members, senderId) {
  await Promise.all(
    members
      .filter((member) => cleanString(member?.userId) !== senderId)
      .map(async (member) => {
        const currentUnread = Math.max(0, Number(member?.unreadCount || 0))
        await context.tablesDB.updateRow({
          databaseId: context.databaseId,
          tableId: context.conversationMembersTableId,
          rowId: member.$id,
          data: {
            unreadCount: currentUnread + 1
          }
        })
      })
  )
}

async function handleSendMessage(context, currentUserId, payload) {
  const conversationId = cleanString(payload?.conversationId, 36)
  if (!conversationId) {
    throw createError('Conversation id is required', 400)
  }

  const currentMember = await getMemberByUser(context, conversationId, currentUserId)
  if (!currentMember) {
    throw createError('No access to this conversation', 403)
  }

  const content = String(payload?.content || '').trim()
  const attachments = normalizeStringArray(payload?.attachments)
  if (!content && attachments.length === 0) {
    throw createError('Message content or attachments are required', 400)
  }

  const members = await listConversationMembers(context, conversationId)
  const memberIds = members.map((member) => cleanString(member?.userId)).filter(Boolean)
  const messageType = resolveMessageType(content, attachments, payload?.messageType)

  const message = await context.tablesDB.createRow({
    databaseId: context.databaseId,
    tableId: context.messagesTableId,
    rowId: crypto.randomUUID(),
    data: {
      conversationId,
      senderId: currentUserId,
      content,
      attachments,
      messageType,
      status: 'sent'
    },
    permissions: buildMessagePermissions(memberIds, currentUserId)
  })

  const preview = content || (attachments.length ? '[image]' : '')
  await context.tablesDB.updateRow({
    databaseId: context.databaseId,
    tableId: context.conversationsTableId,
    rowId: conversationId,
    data: {
      lastMessagePreview: cleanString(preview, 100),
      lastMessageAt: nowIso(),
      lastSenderId: currentUserId,
      status: 'active'
    }
  })

  await incrementUnreadForOtherMembers(context, members, currentUserId)

  return { message }
}

async function resolveUserProfile(context, uid) {
  const usersTableId = env('APPWRITE_USERS_TABLE_ID', 'users')
  let name = ''
  let avatar = ''

  try {
    const row = await context.tablesDB.getRow({
      databaseId: context.databaseId,
      tableId: usersTableId,
      rowId: uid
    })
    name = cleanString(row?.name)
    avatar = cleanString(row?.avatar)
  } catch {
    // users table row not found
  }

  if (!name) {
    try {
      const authUser = await context.users.get(uid)
      name = cleanString(authUser?.name)
    } catch {
      // auth user not found
    }
  }

  return { name, avatar }
}

async function handleResolveUsers(context, _currentUserId, payload) {
  const userIds = normalizeStringArray(payload?.userIds)
  if (!userIds.length) {
    return { users: {} }
  }

  const users = {}
  await Promise.all(
    userIds.map(async (uid) => {
      users[uid] = await resolveUserProfile(context, uid)
    })
  )

  return { users }
}

async function handleResolveConversationPeers(context, currentUserId, payload) {
  const conversationIds = normalizeStringArray(payload?.conversationIds)
  if (!conversationIds.length) {
    return { peers: {} }
  }

  const peers = {}
  await Promise.all(
    conversationIds.map(async (cid) => {
      try {
        const members = await listConversationMembers(context, cid)
        const peerMember = members.find((m) => cleanString(m?.userId) !== currentUserId)
        if (!peerMember) {
          peers[cid] = { userId: '', name: '', avatar: '' }
          return
        }
        const peerUid = cleanString(peerMember.userId)
        const profile = await resolveUserProfile(context, peerUid)
        peers[cid] = { userId: peerUid, name: profile.name, avatar: profile.avatar }
      } catch {
        peers[cid] = { userId: '', name: '', avatar: '' }
      }
    })
  )

  return { peers }
}

const ACTION_HANDLERS = {
  createConversation: handleCreateConversation,
  findOrCreateDirectConversation: handleFindOrCreateDirectConversation,
  sendMessage: handleSendMessage,
  resolveUsers: handleResolveUsers,
  resolveConversationPeers: handleResolveConversationPeers
}

export default async ({ req, res, log, error }) => {
  try {
    const payload = parseBody(req)
    const action = cleanString(payload?.action)
    if (!action || !(action in ACTION_HANDLERS)) {
      throw createError('Unsupported action', 400)
    }

    const context = getContext(req)
    const currentUserId = getAuthenticatedUserId(req)
    const handler = ACTION_HANDLERS[action]
    const result = await handler(context, currentUserId, payload)

    if (typeof log === 'function') {
      log(JSON.stringify({ action, currentUserId, ok: true }))
    }
    return ok(res, result)
  } catch (caughtError) {
    if (typeof error === 'function') {
      error(caughtError)
    }
    return fail(res, caughtError)
  }
}
