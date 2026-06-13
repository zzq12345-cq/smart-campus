import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import authService from '@/services/auth'
import type { DbUser, LoginResult, ProfileUpdateInput, RegisterResult, Session } from '@/types/auth'

const TEACHER_SUBJECT_KEY = 'teacher.subject'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const user = ref<LoginResult['user'] | null>(null)
  const dbUser = ref<DbUser | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const userName = computed(() => user.value?.name || '')
  const userEmail = computed(() => user.value?.email || '')
  const avatar = computed(() => dbUser.value?.avatar || '')

  // teacherSubject: 优先 localStorage，其次 dbUser
  const _localTeacherSubject = ref('')
  const teacherSubject = computed(() => {
    return _localTeacherSubject.value
      || String(dbUser.value?.teacherSubject || '').trim()
  })

  async function init() {
    if (initialized.value) {
      return
    }
    isLoggedIn.value = authService.isLoggedIn()
    user.value = authService.getStoredUser()
    dbUser.value = authService.getStoredDbUser()
    session.value = (uni.getStorageSync('session') as Session) || null

    // 恢复教师科目
    try {
      const stored = uni.getStorageSync(TEACHER_SUBJECT_KEY)
      if (typeof stored === 'string' && stored) {
        _localTeacherSubject.value = stored
      }
    } catch {}

    initialized.value = true
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    loading.value = true
    try {
      const result = await authService.login(email, password)
      isLoggedIn.value = true
      user.value = result.user
      dbUser.value = result.dbUser
      session.value = result.session
      return result
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string, name: string): Promise<RegisterResult> {
    loading.value = true
    try {
      const result = await authService.register(email, password, name)
      isLoggedIn.value = true
      user.value = result.user
      dbUser.value = result.dbUser
      session.value = result.session
      return result
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(email: string) {
    loading.value = true
    try {
      await authService.resetPassword(email)
      return true
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      await authService.logout()
      isLoggedIn.value = false
      user.value = null
      dbUser.value = null
      session.value = null
    } finally {
      loading.value = false
    }
  }

  async function refreshProfile() {
    const result = await authService.refreshProfile()
    if (!result) {
      return null
    }
    isLoggedIn.value = true
    user.value = result.user
    dbUser.value = result.dbUser
    return result
  }

  async function updateProfile(input: ProfileUpdateInput = {}) {
    loading.value = true
    try {
      // teacherSubject 单独处理，不传给 Appwrite
      const { teacherSubject: inputSubject, ...restInput } = input
      if (inputSubject) {
        _localTeacherSubject.value = inputSubject
        try { uni.setStorageSync(TEACHER_SUBJECT_KEY, inputSubject) } catch {}
        // 尝试同步到 Appwrite（可选，失败不影响）
        try {
          await authService.updateProfile({ teacherSubject: inputSubject })
        } catch (e) {
          console.warn('[Auth] teacherSubject sync to DB failed (field may not exist):', e)
        }
      }

      // 其他字段正常更新
      if (Object.keys(restInput).length > 0) {
        const result = await authService.updateProfile(restInput)
        isLoggedIn.value = true
        user.value = result.user
        dbUser.value = result.dbUser
        return result
      }

      return { user: user.value, dbUser: dbUser.value }
    } finally {
      loading.value = false
    }
  }

  /** 直接设置教师科目（仅 localStorage，不调 API） */
  function setTeacherSubject(subject: string) {
    _localTeacherSubject.value = subject
    try { uni.setStorageSync(TEACHER_SUBJECT_KEY, subject) } catch {}
  }

  return {
    isLoggedIn,
    user,
    dbUser,
    session,
    loading,
    initialized,
    userName,
    userEmail,
    avatar,
    teacherSubject,
    init,
    login,
    register,
    resetPassword,
    logout,
    refreshProfile,
    updateProfile,
    setTeacherSubject
  }
})
