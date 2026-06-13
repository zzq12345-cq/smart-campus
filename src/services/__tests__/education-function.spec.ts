import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFunctions } = vi.hoisted(() => ({
  mockFunctions: {
    createExecution: vi.fn(),
    getExecution: vi.fn()
  }
}))

vi.mock('@/utils/appwrite', () => ({
  functions: mockFunctions
}))

vi.mock('appwrite', () => ({
  Client: class {
    setEndpoint() {
      return this
    }
    setProject() {
      return this
    }
    setSession() {
      return this
    }
  },
  Account: class {},
  Functions: class {
    createExecution = mockFunctions.createExecution
    getExecution = mockFunctions.getExecution
  },
  Storage: class {},
  TablesDB: class {},
  ExecutionMethod: {
    POST: 'POST'
  }
}))

import educationFunctionService from '@/services/education-function'

function expectCreateExecutionCall(index: number, expectedPayload: Record<string, unknown>) {
  const call = mockFunctions.createExecution.mock.calls[index] || []
  if (typeof call[0] === 'string') {
    expect(call).toEqual([
      'education-jw',
      JSON.stringify(expectedPayload),
      false,
      '/',
      'POST',
      {
        'content-type': 'application/json'
      }
    ])
    return
  }

  expect(call).toEqual([
    {
      functionId: 'education-jw',
      body: JSON.stringify(expectedPayload),
      async: false,
      xpath: '/',
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
    }
  ])
}

function expectGetExecutionCall(index: number, executionId: string) {
  const call = mockFunctions.getExecution.mock.calls[index] || []
  if (typeof call[0] === 'string') {
    expect(call).toEqual(['education-jw', executionId])
    return
  }

  expect(call).toEqual([
    {
      functionId: 'education-jw',
      executionId
    }
  ])
}

describe('educationFunctionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getCaptcha function and returns parsed payload', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-1',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({
        ok: true,
        data: {
          challengeId: 'jwlc_demo',
          captchaImageBase64: 'ZmFrZQ==',
          captchaTextHints: ['红色', '蓝色'],
          imageWidth: 350,
          imageHeight: 200
        }
      })
    })

    const result = await educationFunctionService.getCaptcha()

    expectCreateExecutionCall(0, {
      action: 'getCaptcha'
    })
    expect(result.challengeId).toBe('jwlc_demo')
    expect(result.captchaTextHints).toEqual(['红色', '蓝色'])
    expect(result.imageWidth).toBe(350)
    expect(result.imageHeight).toBe(200)
  })

  it('waits pending execution and throws function error payload', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-2',
      status: 'processing',
      responseStatusCode: 200,
      responseBody: ''
    })
    mockFunctions.getExecution.mockResolvedValue({
      $id: 'exec-2',
      status: 'failed',
      responseStatusCode: 410,
      responseBody: JSON.stringify({
        ok: false,
        error: 'Challenge 已过期',
        code: 410
      })
    })

    await expect(
      educationFunctionService.submitLogin({
        challengeId: 'jwlc_demo',
        username: '20250001',
        password: 'secret',
        imginfo: '1,2-3,4'
      })
    ).rejects.toMatchObject({
      message: 'Challenge 已过期',
      code: 410
    })

    expectGetExecutionCall(0, 'exec-2')
  })

  it('passes cookie bundle when querying schedule semesters', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-3',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({
        ok: true,
        data: {
          semesters: [
            {
              semesterId: '2025-2026-2',
              semesterName: '2025-2026-2',
              startDate: '2026-03-02'
            }
          ]
        }
      })
    })

    const result = await educationFunctionService.getScheduleSemesters('PHPSESSID=abc')

    expectCreateExecutionCall(0, {
      action: 'getScheduleSemesters',
      cookieBundle: 'PHPSESSID=abc'
    })
    expect(result.semesters[0].startDate).toBe('2026-03-02')
  })

  it('passes cookie bundle and semesterId when querying single schedule', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-3b',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({
        ok: true,
        data: {
          schedule: {
            semesterId: '2025-2026-2',
            semesterName: '2025-2026-2',
            startDate: '2026-03-02',
            courses: []
          }
        }
      })
    })

    const result = await educationFunctionService.getSchedule('PHPSESSID=abc', '2025-2026-2')

    expectCreateExecutionCall(0, {
      action: 'getSchedule',
      cookieBundle: 'PHPSESSID=abc',
      semesterId: '2025-2026-2'
    })
    expect(result.schedule.startDate).toBe('2026-03-02')
  })

  it('calls getLoginLink and returns parsed payload', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-4',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({
        ok: true,
        data: {
          challengeId: 'jwll_demo',
          loginUrl: 'https://example.com/login',
          ticket: 'ticket_123',
          expiresAt: '2026-03-07T12:00:00.000Z'
        }
      })
    })

    const result = await educationFunctionService.getLoginLink()

    expectCreateExecutionCall(0, {
      action: 'getLoginLink'
    })
    expect(result.ticket).toBe('ticket_123')
    expect(result.loginUrl).toBe('https://example.com/login')
  })

  it('calls checkLoginLink with challengeId and ticket', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-5',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({
        ok: true,
        data: {
          status: 'waiting',
          message: '等待扫码完成'
        }
      })
    })

    const result = await educationFunctionService.checkLoginLink({
      challengeId: 'jwll_demo',
      ticket: 'ticket_123'
    })

    expectCreateExecutionCall(0, {
      action: 'checkLoginLink',
      challengeId: 'jwll_demo',
      ticket: 'ticket_123'
    })
    expect(result.status).toBe('waiting')
  })

  it('calls confirmLoginLink and returns login payload', async () => {
    mockFunctions.createExecution.mockResolvedValue({
      $id: 'exec-6',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({
        ok: true,
        data: {
          cookieBundle: 'PHPSESSID=linked',
          personalInfo: {
            name: '张三',
            studentId: '20250001',
            class: '软件工程1班',
            major: '软件工程',
            grade: '2025',
            gender: '男',
            dormitory: '1-101'
          }
        }
      })
    })

    const result = await educationFunctionService.confirmLoginLink({
      challengeId: 'jwll_demo',
      ticket: 'ticket_123'
    })

    expectCreateExecutionCall(0, {
      action: 'confirmLoginLink',
      challengeId: 'jwll_demo',
      ticket: 'ticket_123'
    })
    expect(result.cookieBundle).toBe('PHPSESSID=linked')
  })
})
