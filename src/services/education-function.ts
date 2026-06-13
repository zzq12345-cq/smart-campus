import { ExecutionMethod, type Models } from 'appwrite'
import { functions } from '@/utils/appwrite'
import { EDUCATION_JW_FUNCTION_ID } from '@/utils/appwrite-shared'
import type {
  EducationCaptchaResult,
  EducationGradesResult,
  EducationLoginLinkResult,
  EducationLoginLinkStatusResult,
  EducationLoginResult,
  EducationPersonalInfo,
  EducationScheduleCourse,
  EducationScheduleTimeLocation,
  EducationSemesterGrades,
  EducationSemesterSummary,
  EducationSemesterSchedule,
  EducationGradeCourse
} from '@/types/education'

export type {
  EducationCaptchaResult,
  EducationPersonalInfo,
  EducationLoginLinkResult,
  EducationLoginLinkStatusResult,
  EducationLoginResult,
  EducationScheduleTimeLocation,
  EducationScheduleCourse,
  EducationSemesterSummary,
  EducationSemesterSchedule,
  EducationGradeCourse,
  EducationSemesterGrades,
  EducationGradesResult
} from '@/types/education'

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
    throw createTypedError(payload.error || 'Education JW function failed', execution.responseStatusCode)
  }

  const payload = parsedBody as FunctionResponse<T>
  if (!payload || typeof payload !== 'object') {
    throw createTypedError('Education JW function returned invalid payload', 500)
  }
  if ('ok' in payload && payload.ok === false) {
    throw createTypedError(payload.error || 'Education JW function failed', payload.code || 500)
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
    EDUCATION_JW_FUNCTION_ID,
    JSON.stringify(payload),
    false,
    '/',
    ExecutionMethod.POST,
    {
      'content-type': 'application/json'
    }
  )) as Models.Execution

  const settledExecution = await waitForExecution(EDUCATION_JW_FUNCTION_ID, execution)
  return extractExecutionBody<T>(settledExecution)
}

const educationFunctionService = {
  async getCaptcha() {
    return executeFunction<EducationCaptchaResult>({
      action: 'getCaptcha'
    })
  },

  async submitLogin(input: { challengeId: string; username: string; password: string; imginfo: string }) {
    return executeFunction<EducationLoginResult>({
      action: 'submitLogin',
      challengeId: String(input.challengeId || '').trim(),
      username: String(input.username || '').trim(),
      password: String(input.password || ''),
      imginfo: String(input.imginfo || '').trim()
    })
  },

  async getLoginLink() {
    return executeFunction<EducationLoginLinkResult>({
      action: 'getLoginLink'
    })
  },

  async checkLoginLink(input: { challengeId: string; ticket: string }) {
    return executeFunction<EducationLoginLinkStatusResult>({
      action: 'checkLoginLink',
      challengeId: String(input.challengeId || '').trim(),
      ticket: String(input.ticket || '').trim()
    })
  },

  async confirmLoginLink(input: { challengeId: string; ticket: string }) {
    return executeFunction<EducationLoginResult>({
      action: 'confirmLoginLink',
      challengeId: String(input.challengeId || '').trim(),
      ticket: String(input.ticket || '').trim()
    })
  },

  async getScheduleSemesters(cookieBundle: string) {
    return executeFunction<{ semesters: EducationSemesterSummary[] }>({
      action: 'getScheduleSemesters',
      cookieBundle: String(cookieBundle || '').trim()
    })
  },

  async getSchedule(cookieBundle: string, semesterId: string) {
    return executeFunction<{ schedule: EducationSemesterSchedule }>({
      action: 'getSchedule',
      cookieBundle: String(cookieBundle || '').trim(),
      semesterId: String(semesterId || '').trim()
    })
  },

  async getGrades(cookieBundle: string) {
    return executeFunction<{ grades: EducationGradesResult }>({
      action: 'getGrades',
      cookieBundle: String(cookieBundle || '').trim()
    })
  }
}

export default educationFunctionService
