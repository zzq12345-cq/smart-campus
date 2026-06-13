import { ExecutionMethod, type Models } from 'appwrite'
import type { Message, MessageType } from '@/types/message'
import { functions } from '@/utils/appwrite'
import { PRIVATE_MESSAGING_FUNCTION_ID } from '@/utils/appwrite-shared'

interface FunctionSuccessResponse<T> {
  ok: true
  data: T
}

interface FunctionErrorResponse {
  ok: false
  error: string
  code?: number
}

type FunctionResponse<T> = FunctionSuccessResponse<T> | FunctionErrorResponse

interface ConversationActionResult {
  conversationId: string
  created: boolean
}

interface SendMessageActionResult {
  message: Message
}

function createTypedError(message: string, code = 500) {
  const error = new Error(message) as Error & { code?: number }
  error.code = code
  return error
}

function safeParseJson<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T
  } catch {
    return fallback
  }
}

function extractExecutionBody<T>(execution: Pick<Models.Execution, 'responseBody' | 'responseStatusCode'>) {
  const rawBody = typeof execution.responseBody === 'string' ? execution.responseBody.trim() : ''
  const parsedBody = rawBody ? safeParseJson<FunctionResponse<T> | Record<string, unknown>>(rawBody, {}) : {}
  if (execution.responseStatusCode >= 400) {
    const payload = parsedBody as FunctionErrorResponse
    throw createTypedError(payload.error || 'Private messaging function failed', execution.responseStatusCode)
  }

  const payload = parsedBody as FunctionResponse<T>
  if (!payload || typeof payload !== 'object') {
    throw createTypedError('Private messaging function returned invalid payload', 500)
  }
  if ('ok' in payload && payload.ok === false) {
    throw createTypedError(payload.error || 'Private messaging function failed', payload.code || 500)
  }
  if ('ok' in payload && payload.ok === true) {
    return payload.data
  }
  return payload as T
}

async function waitForExecution(functionId: string, execution: Models.Execution) {
  let currentExecution = execution
  const pendingStatuses = new Set(['waiting', 'processing', 'scheduled'])
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (!pendingStatuses.has(String(currentExecution.status || ''))) {
      return currentExecution
    }
    await new Promise((resolve) => setTimeout(resolve, 350))
    currentExecution = (await functions.getExecution(functionId, currentExecution.$id)) as Models.Execution
  }
  return currentExecution
}

async function executeFunction<T>(payload: Record<string, unknown>) {
  const execution = (await functions.createExecution(
    PRIVATE_MESSAGING_FUNCTION_ID,
    JSON.stringify(payload),
    false,
    '/',
    ExecutionMethod.POST,
    {
      'content-type': 'application/json'
    }
  )) as Models.Execution

  const settledExecution = await waitForExecution(PRIVATE_MESSAGING_FUNCTION_ID, execution)
  return extractExecutionBody<T>(settledExecution)
}

export interface ResolveUsersResult {
  users: Record<string, { name: string; avatar: string }>
}

export interface ConversationPeerInfo {
  userId: string
  name: string
  avatar: string
}

export interface ResolveConversationPeersResult {
  peers: Record<string, ConversationPeerInfo>
}

const privateMessagingFunctionService = {
  async findOrCreateDirectConversation(input: { targetUserId: string; sourcePostId?: string }) {
    return executeFunction<ConversationActionResult>({
      action: 'findOrCreateDirectConversation',
      targetUserId: String(input.targetUserId || '').trim(),
      sourcePostId: String(input.sourcePostId || '').trim()
    })
  },
  async createConversation(input: { memberIds: string[]; sourcePostId?: string }) {
    return executeFunction<ConversationActionResult>({
      action: 'createConversation',
      memberIds: Array.isArray(input.memberIds) ? input.memberIds : [],
      sourcePostId: String(input.sourcePostId || '').trim()
    })
  },
  async sendMessage(input: {
    conversationId: string
    content?: string
    attachments?: string[]
    messageType?: MessageType
  }) {
    return executeFunction<SendMessageActionResult>({
      action: 'sendMessage',
      conversationId: String(input.conversationId || '').trim(),
      content: String(input.content || ''),
      attachments: Array.isArray(input.attachments) ? input.attachments : [],
      messageType: input.messageType || undefined
    })
  },
  async resolveUsers(userIds: string[]) {
    const ids = (Array.isArray(userIds) ? userIds : []).map((id) => String(id || '').trim()).filter(Boolean)
    if (!ids.length) {
      return { users: {} } as ResolveUsersResult
    }
    return executeFunction<ResolveUsersResult>({
      action: 'resolveUsers',
      userIds: ids
    })
  },
  async resolveConversationPeers(conversationIds: string[]) {
    const ids = (Array.isArray(conversationIds) ? conversationIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean)
    if (!ids.length) {
      return { peers: {} } as ResolveConversationPeersResult
    }
    return executeFunction<ResolveConversationPeersResult>({
      action: 'resolveConversationPeers',
      conversationIds: ids
    })
  }
}

export default privateMessagingFunctionService
