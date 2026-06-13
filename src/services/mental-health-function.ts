import { ExecutionMethod, type Models } from 'appwrite'
import type { MentalHealthAssessment, MentalHealthIntervention, MentalHealthTriggerType } from '@/types/mental-health'
import { functions } from '@/utils/appwrite'
import { MENTAL_HEALTH_PIPELINE_FUNCTION_ID } from '@/utils/appwrite-shared'

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
    throw createTypedError(payload.error || 'Mental health pipeline failed', execution.responseStatusCode)
  }

  const payload = parsedBody as FunctionResponse<T>
  if (!payload || typeof payload !== 'object') {
    throw createTypedError('Mental health pipeline returned invalid payload', 500)
  }
  if ('ok' in payload && payload.ok === false) {
    throw createTypedError(payload.error || 'Mental health pipeline failed', payload.code || 500)
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
    MENTAL_HEALTH_PIPELINE_FUNCTION_ID,
    JSON.stringify(payload),
    false,
    '/',
    ExecutionMethod.POST,
    {
      'content-type': 'application/json'
    }
  )) as Models.Execution

  const settledExecution = await waitForExecution(MENTAL_HEALTH_PIPELINE_FUNCTION_ID, execution)
  return extractExecutionBody<T>(settledExecution)
}

export interface EvaluateEventInput {
  sourceTable: string
  rowId: string
  eventType?: 'create' | 'update'
}

export interface EvaluateWindowInput {
  userId?: string
  windowDays?: number
  aggregateDays?: number
}

export interface EvaluateEventResult {
  assessment: MentalHealthAssessment | null
  intervention?: MentalHealthIntervention | null
  skipped?: boolean
}

export interface EvaluateUserWindowResult {
  assessments: MentalHealthAssessment[]
}

export interface DispatchInterventionResult {
  intervention: MentalHealthIntervention | null
  skipped?: boolean
}

const mentalHealthFunctionService = {
  async evaluateEvent(input: EvaluateEventInput) {
    return executeFunction<EvaluateEventResult>({
      action: 'evaluateEvent',
      sourceTable: String(input.sourceTable || '').trim(),
      rowId: String(input.rowId || '').trim(),
      eventType: input.eventType || 'create'
    })
  },

  async evaluateUserWindow(input: EvaluateWindowInput = {}) {
    return executeFunction<EvaluateUserWindowResult>({
      action: 'evaluateUserWindow',
      userId: String(input.userId || '').trim(),
      windowDays: input.windowDays ?? 7,
      aggregateDays: input.aggregateDays ?? 30
    })
  },

  async dispatchIntervention(input: {
    assessmentId: string
    triggerType?: MentalHealthTriggerType
    force?: boolean
  }) {
    return executeFunction<DispatchInterventionResult>({
      action: 'dispatchIntervention',
      assessmentId: String(input.assessmentId || '').trim(),
      triggerType: input.triggerType || undefined,
      force: Boolean(input.force)
    })
  },

  async backfillUser(input: { userId: string; windowDays?: number; aggregateDays?: number }) {
    return executeFunction<EvaluateUserWindowResult>({
      action: 'backfillUser',
      userId: String(input.userId || '').trim(),
      windowDays: input.windowDays ?? 7,
      aggregateDays: input.aggregateDays ?? 30
    })
  }
}

export default mentalHealthFunctionService
