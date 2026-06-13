import { ExecutionMethod, type Models } from 'appwrite'
import type { Follow } from '@/types/follow'
import { functions } from '@/utils/appwrite'
import { FOLLOWS_FUNCTION_ID } from '@/utils/appwrite-shared'

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

interface FollowUserActionResult {
  follow: Follow
  changed: boolean
  followersCount: number
  followingCount: number
}

interface UnfollowUserActionResult {
  removed: boolean
  changed: boolean
  followersCount: number
  followingCount: number
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
    throw createTypedError(payload.error || 'Follows function failed', execution.responseStatusCode)
  }

  const payload = parsedBody as FunctionResponse<T>
  if (!payload || typeof payload !== 'object') {
    throw createTypedError('Follows function returned invalid payload', 500)
  }
  if ('ok' in payload && payload.ok === false) {
    throw createTypedError(payload.error || 'Follows function failed', payload.code || 500)
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
    FOLLOWS_FUNCTION_ID,
    JSON.stringify(payload),
    false,
    '/',
    ExecutionMethod.POST,
    {
      'content-type': 'application/json'
    }
  )) as Models.Execution

  const settledExecution = await waitForExecution(FOLLOWS_FUNCTION_ID, execution)
  return extractExecutionBody<T>(settledExecution)
}

const followsFunctionService = {
  async followUser(input: { targetUserId: string }) {
    return executeFunction<FollowUserActionResult>({
      action: 'followUser',
      targetUserId: String(input.targetUserId || '').trim()
    })
  },
  async unfollowUser(input: { targetUserId: string }) {
    return executeFunction<UnfollowUserActionResult>({
      action: 'unfollowUser',
      targetUserId: String(input.targetUserId || '').trim()
    })
  }
}

export default followsFunctionService
