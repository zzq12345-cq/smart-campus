import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStorage: Record<string, unknown> = {}

vi.stubGlobal('uni', {
  getStorageSync: vi.fn((key: string) => mockStorage[key]),
  setStorageSync: vi.fn((key: string, value: unknown) => {
    mockStorage[key] = value
  }),
  removeStorageSync: vi.fn((key: string) => {
    delete mockStorage[key]
  })
})

import educationSessionService from '@/services/education-session'
import type { EducationAuthSnapshot, EducationPendingLinkLogin } from '@/types/education'

function createValidSnapshot(overrides?: Partial<EducationAuthSnapshot>): EducationAuthSnapshot {
  return {
    appUserId: 'user_1234567890',
    studentId: '20250001',
    cookieBundle: 'PHPSESSID=abc123',
    authenticatedAt: '2025-03-07T10:00:00.000Z',
    personalInfo: {
      name: '张三',
      studentId: '20250001',
      class: '软件工程1班',
      major: '软件工程',
      grade: '2025级',
      gender: '男',
      dormitory: '1号楼101'
    },
    ...overrides
  }
}

function createPendingLinkLogin(overrides?: Partial<EducationPendingLinkLogin>): EducationPendingLinkLogin {
  return {
    appUserId: 'user_1234567890',
    challengeId: 'jwll_demo',
    loginUrl: 'https://example.com/login',
    ticket: 'ticket_123',
    expiresAt: '2026-03-07T10:00:00.000Z',
    ...overrides
  }
}

describe('educationSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  })

  describe('saveSnapshot', () => {
    it('saves snapshot to local storage', () => {
      const snapshot = createValidSnapshot()
      const result = educationSessionService.saveSnapshot(snapshot)
      expect(result).toBe(true)
      expect(mockStorage['educationAuth']).toEqual(snapshot)
    })

    it('returns false for invalid snapshot', () => {
      const result = educationSessionService.saveSnapshot({
        appUserId: '',
        studentId: '',
        cookieBundle: '',
        authenticatedAt: '',
        personalInfo: null as any
      })
      expect(result).toBe(false)
    })
  })

  describe('getSnapshot', () => {
    it('returns null when no snapshot exists', () => {
      const result = educationSessionService.getSnapshot('user_1234567890')
      expect(result).toBeNull()
    })

    it('returns snapshot for current user', () => {
      const snapshot = createValidSnapshot()
      mockStorage['educationAuth'] = snapshot

      const result = educationSessionService.getSnapshot('user_1234567890')
      expect(result).toEqual(snapshot)
    })

    it('returns null for different appUserId', () => {
      const snapshot = createValidSnapshot()
      mockStorage['educationAuth'] = snapshot

      const result = educationSessionService.getSnapshot('user_different')
      expect(result).toBeNull()
    })

    it('returns snapshot when no appUserId provided', () => {
      const snapshot = createValidSnapshot()
      mockStorage['educationAuth'] = snapshot

      const result = educationSessionService.getSnapshot()
      expect(result).toEqual(snapshot)
    })
  })

  describe('clearSnapshot', () => {
    it('removes snapshot from storage', () => {
      const snapshot = createValidSnapshot()
      mockStorage['educationAuth'] = snapshot

      const result = educationSessionService.clearSnapshot()
      expect(result).toBe(true)
      expect(mockStorage['educationAuth']).toBeUndefined()
    })
  })

  describe('savePendingLinkLogin', () => {
    it('saves pending link login to local storage', () => {
      const pendingLinkLogin = createPendingLinkLogin()

      const result = educationSessionService.savePendingLinkLogin(pendingLinkLogin)

      expect(result).toBe(true)
      expect(mockStorage['educationPendingLink']).toEqual(pendingLinkLogin)
    })

    it('returns false for invalid pending link login', () => {
      const result = educationSessionService.savePendingLinkLogin({
        appUserId: '',
        challengeId: '',
        loginUrl: '',
        ticket: '',
        expiresAt: ''
      })

      expect(result).toBe(false)
    })
  })

  describe('getPendingLinkLogin', () => {
    it('returns null when no pending link login exists', () => {
      const result = educationSessionService.getPendingLinkLogin('user_1234567890')
      expect(result).toBeNull()
    })

    it('returns pending link login for current user', () => {
      const pendingLinkLogin = createPendingLinkLogin()
      mockStorage['educationPendingLink'] = pendingLinkLogin

      const result = educationSessionService.getPendingLinkLogin('user_1234567890')
      expect(result).toEqual(pendingLinkLogin)
    })

    it('returns null for different appUserId', () => {
      const pendingLinkLogin = createPendingLinkLogin()
      mockStorage['educationPendingLink'] = pendingLinkLogin

      const result = educationSessionService.getPendingLinkLogin('user_different')
      expect(result).toBeNull()
    })
  })

  describe('clearPendingLinkLogin', () => {
    it('removes pending link login from storage', () => {
      const pendingLinkLogin = createPendingLinkLogin()
      mockStorage['educationPendingLink'] = pendingLinkLogin

      const result = educationSessionService.clearPendingLinkLogin()
      expect(result).toBe(true)
      expect(mockStorage['educationPendingLink']).toBeUndefined()
    })
  })
})
