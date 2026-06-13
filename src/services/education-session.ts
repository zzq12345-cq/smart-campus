import type { EducationAuthSnapshot, EducationPendingLinkLogin } from '@/types/education'

const SNAPSHOT_STORAGE_KEY = 'educationAuth'
const PENDING_LINK_STORAGE_KEY = 'educationPendingLink'

function normalizeSnapshot(value: unknown): EducationAuthSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Partial<EducationAuthSnapshot>
  const appUserId = String(payload.appUserId || '').trim()
  const studentId = String(payload.studentId || '').trim()
  const cookieBundle = String(payload.cookieBundle || '').trim()
  const authenticatedAt = String(payload.authenticatedAt || '').trim()
  const personalInfo = payload.personalInfo

  if (!appUserId || !studentId || !cookieBundle || !authenticatedAt || !personalInfo) {
    return null
  }

  return {
    appUserId,
    studentId,
    cookieBundle,
    authenticatedAt,
    personalInfo: {
      name: String(personalInfo.name || '').trim(),
      studentId: String(personalInfo.studentId || studentId).trim(),
      class: String(personalInfo.class || '').trim(),
      major: String(personalInfo.major || '').trim(),
      grade: String(personalInfo.grade || '').trim(),
      gender: String(personalInfo.gender || '').trim(),
      dormitory: String(personalInfo.dormitory || '').trim()
    }
  }
}

function normalizePendingLinkLogin(value: unknown): EducationPendingLinkLogin | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Partial<EducationPendingLinkLogin>
  const appUserId = String(payload.appUserId || '').trim()
  const challengeId = String(payload.challengeId || '').trim()
  const loginUrl = String(payload.loginUrl || '').trim()
  const ticket = String(payload.ticket || '').trim()
  const expiresAt = String(payload.expiresAt || '').trim()

  if (!appUserId || !challengeId || !loginUrl || !ticket || !expiresAt) {
    return null
  }

  return {
    appUserId,
    challengeId,
    loginUrl,
    ticket,
    expiresAt
  }
}

const educationSessionService = {
  getSnapshot(appUserId?: string) {
    try {
      const snapshot = normalizeSnapshot(uni.getStorageSync(SNAPSHOT_STORAGE_KEY))
      if (!snapshot) {
        return null
      }
      const expectedUserId = String(appUserId || '').trim()
      if (!expectedUserId || snapshot.appUserId === expectedUserId) {
        return snapshot
      }
      return null
    } catch {
      return null
    }
  },

  saveSnapshot(snapshot: EducationAuthSnapshot) {
    const normalized = normalizeSnapshot(snapshot)
    if (!normalized) {
      return false
    }
    try {
      uni.setStorageSync(SNAPSHOT_STORAGE_KEY, normalized)
      return true
    } catch {
      return false
    }
  },

  clearSnapshot() {
    try {
      uni.removeStorageSync(SNAPSHOT_STORAGE_KEY)
      return true
    } catch {
      return false
    }
  },

  getPendingLinkLogin(appUserId?: string) {
    try {
      const pendingLinkLogin = normalizePendingLinkLogin(uni.getStorageSync(PENDING_LINK_STORAGE_KEY))
      if (!pendingLinkLogin) {
        return null
      }
      const expectedUserId = String(appUserId || '').trim()
      if (!expectedUserId || pendingLinkLogin.appUserId === expectedUserId) {
        return pendingLinkLogin
      }
      return null
    } catch {
      return null
    }
  },

  savePendingLinkLogin(pendingLinkLogin: EducationPendingLinkLogin) {
    const normalized = normalizePendingLinkLogin(pendingLinkLogin)
    if (!normalized) {
      return false
    }
    try {
      uni.setStorageSync(PENDING_LINK_STORAGE_KEY, normalized)
      return true
    } catch {
      return false
    }
  },

  clearPendingLinkLogin() {
    try {
      uni.removeStorageSync(PENDING_LINK_STORAGE_KEY)
      return true
    } catch {
      return false
    }
  }
}

export default educationSessionService
