import type {
  EducationScheduleCacheSnapshot,
  EducationSemesterSchedule,
  EducationSemesterSummary
} from '@/types/education'

const STORAGE_KEY = 'educationScheduleCache'

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null
}

function normalizeCourse(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Record<string, unknown>
  return {
    name: String(payload.name || '').trim(),
    credit: Number(payload.credit || 0),
    teacher: String(payload.teacher || '').trim(),
    weeksText: String(payload.weeksText || '').trim(),
    type: String(payload.type || '').trim(),
    studentCount: Number(payload.studentCount || 0),
    semesterId: String(payload.semesterId || '').trim(),
    semesterName: String(payload.semesterName || '').trim(),
    day: Number(payload.day || 0),
    startSlot: Number(payload.startSlot || 0),
    endSlot: Number(payload.endSlot || 0),
    weeks: Array.isArray(payload.weeks) ? payload.weeks.map((item) => Number(item || 0)).filter((item) => item > 0) : [],
    location: String(payload.location || '').trim(),
    weekType: String(payload.weekType || '').trim(),
    timeLocation:
      payload.timeLocation && typeof payload.timeLocation === 'object'
        ? {
            day: Number((payload.timeLocation as Record<string, unknown>).day || 0),
            startSlot: Number((payload.timeLocation as Record<string, unknown>).startSlot || 0),
            endSlot: Number((payload.timeLocation as Record<string, unknown>).endSlot || 0),
            weeks: Array.isArray((payload.timeLocation as Record<string, unknown>).weeks)
              ? (((payload.timeLocation as Record<string, unknown>).weeks as unknown[]) || [])
                  .map((item) => Number(item || 0))
                  .filter((item) => item > 0)
              : [],
            location: String((payload.timeLocation as Record<string, unknown>).location || '').trim(),
            weekType: String((payload.timeLocation as Record<string, unknown>).weekType || '').trim(),
            raw: String((payload.timeLocation as Record<string, unknown>).raw || '').trim()
          }
        : null
  }
}

function normalizeSemesterSummary(value: unknown): EducationSemesterSummary | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Partial<EducationSemesterSummary>
  const semesterId = String(payload.semesterId || '').trim()
  const semesterName = String(payload.semesterName || '').trim()
  const startDate = String(payload.startDate || '').trim()

  if (!semesterId || !semesterName || !startDate) {
    return null
  }

  return {
    semesterId,
    semesterName,
    startDate
  }
}

function normalizeSemesterSchedule(value: unknown): EducationSemesterSchedule | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Partial<EducationSemesterSchedule>
  const summary = normalizeSemesterSummary(payload)
  const courses = Array.isArray(payload.courses) ? payload.courses.map(normalizeCourse).filter(isDefined) : []

  if (!summary) {
    return null
  }

  return {
    ...summary,
    courses
  }
}

function normalizeSemesterSchedulesMap(value: unknown): Record<string, EducationSemesterSchedule> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const result: Record<string, EducationSemesterSchedule> = {}
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const normalized = normalizeSemesterSchedule(entry)
    if (normalized && normalized.semesterId === String(key || '').trim()) {
      result[normalized.semesterId] = normalized
    }
  })
  return result
}

function normalizeSnapshot(value: unknown): EducationScheduleCacheSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Partial<EducationScheduleCacheSnapshot>
  const appUserId = String(payload.appUserId || '').trim()
  const fetchedAt = String(payload.fetchedAt || '').trim()
  const semesters = Array.isArray(payload.semesters)
    ? payload.semesters.map(normalizeSemesterSummary).filter(isDefined)
    : []
  const semesterSchedules = normalizeSemesterSchedulesMap(payload.semesterSchedules)

  if (!appUserId || !fetchedAt || !semesters.length) {
    return null
  }

  return {
    appUserId,
    fetchedAt,
    semesters,
    semesterSchedules
  }
}

const educationScheduleCacheService = {
  getSnapshot(appUserId?: string) {
    try {
      const snapshot = normalizeSnapshot(uni.getStorageSync(STORAGE_KEY))
      if (!snapshot) {
        return null
      }

      const expectedUserId = String(appUserId || '').trim()
      if (!expectedUserId || expectedUserId === snapshot.appUserId) {
        return snapshot
      }

      return null
    } catch {
      return null
    }
  },

  saveSnapshot(snapshot: EducationScheduleCacheSnapshot) {
    const normalized = normalizeSnapshot(snapshot)
    if (!normalized) {
      return false
    }

    try {
      uni.setStorageSync(STORAGE_KEY, normalized)
      return true
    } catch {
      return false
    }
  },

  clearSnapshot() {
    try {
      uni.removeStorageSync(STORAGE_KEY)
      return true
    } catch {
      return false
    }
  }
}

export default educationScheduleCacheService
