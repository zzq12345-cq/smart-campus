import type {
  EducationScheduleCourse,
  EducationSemesterSchedule,
  EducationSemesterSummary
} from '@/types/education'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const LOCAL_DATE_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/
const SLOT_ORDER_MAP = new Map<number, number>([
  [1, 1],
  [2, 2],
  [3, 3],
  [4, 4],
  [11, 5],
  [12, 6],
  [5, 7],
  [6, 8],
  [7, 9],
  [8, 10],
  [9, 11],
  [10, 12],
])

export interface EducationCourseMeeting {
  day: number
  startSlot: number
  endSlot: number
  weeks: number[]
  location: string
  weekType: string
}

export interface EducationGroupedScheduleCourse {
  key: string
  name: string
  teacher: string
  credit: number
  type: string
  studentCount: number
  semesterId: string
  semesterName: string
  weeksText: string
  meetings: EducationCourseMeeting[]
  hasUntimedCourse: boolean
  rawCourses: EducationScheduleCourse[]
}

type EducationSemesterLike = EducationSemesterSummary | EducationSemesterSchedule

function hasCourses(semester: EducationSemesterLike | null | undefined): semester is EducationSemesterSchedule {
  return Boolean(semester && Array.isArray((semester as EducationSemesterSchedule).courses))
}

function normalizeWeekdayIndex(day: number) {
  if (!Number.isFinite(day)) {
    return 1
  }
  return Math.min(7, Math.max(1, Math.floor(day)))
}

export function parseEducationDate(value: string) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return null
  }

  const localMatch = normalized.match(LOCAL_DATE_PATTERN)
  const dateValue = localMatch
    ? new Date(Number(localMatch[1]), Number(localMatch[2]) - 1, Number(localMatch[3]))
    : new Date(normalized.replace(/-/g, '/'))
  if (Number.isNaN(dateValue.getTime())) {
    return null
  }

  dateValue.setHours(0, 0, 0, 0)
  return dateValue
}

function toTime(input: string) {
  return parseEducationDate(input)?.getTime() ?? 0
}

export function getSemesterWeekBaseDate(semester: EducationSemesterLike | null | undefined) {
  const startDate = parseEducationDate(semester?.startDate || '')
  if (!startDate) {
    return null
  }

  const weekday = startDate.getDay()
  const offset = weekday === 0 ? 6 : weekday - 1
  const weekBaseDate = new Date(startDate)
  weekBaseDate.setDate(weekBaseDate.getDate() - offset)
  weekBaseDate.setHours(0, 0, 0, 0)
  return weekBaseDate
}

export function getSemesterWeekStartDate(
  semester: EducationSemesterLike | null | undefined,
  week: number
) {
  const weekBaseDate = getSemesterWeekBaseDate(semester)
  if (!weekBaseDate) {
    return null
  }

  return new Date(weekBaseDate.getTime() + (Math.max(1, Math.floor(week || 1)) - 1) * 7 * DAY_IN_MS)
}

export function getSemesterWeekdayForDate(
  semester: EducationSemesterLike | null | undefined,
  week: number,
  date = new Date()
) {
  const weekBaseDate = getSemesterWeekBaseDate(semester)
  if (!weekBaseDate) {
    return null
  }

  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((targetDate.getTime() - weekBaseDate.getTime()) / DAY_IN_MS)
  if (diffDays < 0) {
    return null
  }

  const targetWeek = Math.floor(diffDays / 7) + 1
  if (targetWeek !== Math.max(1, Math.floor(week || 1))) {
    return null
  }

  return normalizeWeekdayIndex((diffDays % 7) + 1)
}

function compareCourses(a: EducationScheduleCourse, b: EducationScheduleCourse) {
  const leftStartOrder = SLOT_ORDER_MAP.get(a.startSlot) ?? a.startSlot
  const rightStartOrder = SLOT_ORDER_MAP.get(b.startSlot) ?? b.startSlot
  const leftEndOrder = SLOT_ORDER_MAP.get(a.endSlot) ?? a.endSlot
  const rightEndOrder = SLOT_ORDER_MAP.get(b.endSlot) ?? b.endSlot

  if (a.day !== b.day) {
    return a.day - b.day
  }
  if (leftStartOrder !== rightStartOrder) {
    return leftStartOrder - rightStartOrder
  }
  if (leftEndOrder !== rightEndOrder) {
    return leftEndOrder - rightEndOrder
  }
  return a.name.localeCompare(b.name)
}

export function sortSemesters<T extends EducationSemesterLike>(semesters: T[]) {
  return [...semesters].sort((left, right) => {
    const timeDiff = toTime(right.startDate) - toTime(left.startDate)
    if (timeDiff !== 0) {
      return timeDiff
    }
    return right.semesterId.localeCompare(left.semesterId)
  })
}

export function getSemesterMaxWeek(semester: EducationSemesterLike | null | undefined) {
  if (!hasCourses(semester)) {
    return 1
  }

  const maxWeek = semester.courses.reduce((result, course) => {
    const courseMaxWeek = course.weeks.length ? Math.max(...course.weeks) : 1
    return Math.max(result, courseMaxWeek)
  }, 1)

  return Math.max(1, maxWeek)
}

export function clampSemesterWeek(semester: EducationSemesterLike | null | undefined, week: number) {
  if (!hasCourses(semester)) {
    if (!Number.isFinite(week)) {
      return 1
    }
    return Math.max(1, Math.floor(week))
  }

  const maxWeek = getSemesterMaxWeek(semester)
  if (!Number.isFinite(week)) {
    return 1
  }
  return Math.min(Math.max(1, Math.floor(week)), maxWeek)
}

export function selectDefaultSemester<T extends EducationSemesterLike>(semesters: T[], today = new Date()) {
  const sortedSemesters = sortSemesters(semesters)
  if (!sortedSemesters.length) {
    return null
  }

  const todayDate = new Date(today)
  todayDate.setHours(0, 0, 0, 0)

  return sortedSemesters.find((semester) => {
    const startDate = getSemesterWeekBaseDate(semester)
    return startDate ? startDate.getTime() <= todayDate.getTime() : false
  }) || sortedSemesters[0]
}

export function getCurrentWeekForSemester(semester: EducationSemesterLike | null | undefined, today = new Date()) {
  if (!semester) {
    return 1
  }

  const startDate = getSemesterWeekBaseDate(semester)
  if (!startDate) {
    return 1
  }

  const todayDate = new Date(today)
  todayDate.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((todayDate.getTime() - startDate.getTime()) / DAY_IN_MS)
  const rawWeek = diffDays < 0 ? 1 : Math.floor(diffDays / 7) + 1
  return hasCourses(semester) ? clampSemesterWeek(semester, rawWeek) : Math.max(1, rawWeek)
}

export function getWeekScheduleCourses(semester: EducationSemesterSchedule | null | undefined, week: number) {
  if (!semester) {
    return []
  }

  return semester.courses
    .filter((course) => course.day > 0 && course.startSlot > 0 && course.endSlot > 0 && course.weeks.includes(week))
    .sort(compareCourses)
}

export function getUntimedCourses(semester: EducationSemesterSchedule | null | undefined) {
  if (!semester) {
    return []
  }

  return semester.courses
    .filter((course) => course.day <= 0 || course.startSlot <= 0 || course.endSlot <= 0)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function groupSemesterCourses(semester: EducationSemesterSchedule | null | undefined): EducationGroupedScheduleCourse[] {
  if (!semester) {
    return []
  }

  const groupedCourses = new Map<string, EducationGroupedScheduleCourse>()

  for (const course of semester.courses) {
    const key = [
      course.semesterId,
      course.name,
      course.teacher,
      course.type,
      String(course.credit)
    ].join('::')

    if (!groupedCourses.has(key)) {
      groupedCourses.set(key, {
        key,
        name: course.name,
        teacher: course.teacher,
        credit: course.credit,
        type: course.type,
        studentCount: course.studentCount,
        semesterId: course.semesterId,
        semesterName: course.semesterName,
        weeksText: course.weeksText,
        meetings: [],
        hasUntimedCourse: false,
        rawCourses: []
      })
    }

    const currentGroup = groupedCourses.get(key)!
    currentGroup.rawCourses.push(course)
    currentGroup.studentCount = Math.max(currentGroup.studentCount, course.studentCount)
    if (course.weeksText && !currentGroup.weeksText) {
      currentGroup.weeksText = course.weeksText
    }

    if (course.day > 0 && course.startSlot > 0 && course.endSlot > 0) {
      currentGroup.meetings.push({
        day: course.day,
        startSlot: course.startSlot,
        endSlot: course.endSlot,
        weeks: [...course.weeks],
        location: course.location,
        weekType: course.weekType
      })
    } else {
      currentGroup.hasUntimedCourse = true
    }
  }

  return [...groupedCourses.values()]
    .map((course) => ({
      ...course,
      meetings: course.meetings.sort((left, right) => {
        const leftStartOrder = SLOT_ORDER_MAP.get(left.startSlot) ?? left.startSlot
        const rightStartOrder = SLOT_ORDER_MAP.get(right.startSlot) ?? right.startSlot
        const leftEndOrder = SLOT_ORDER_MAP.get(left.endSlot) ?? left.endSlot
        const rightEndOrder = SLOT_ORDER_MAP.get(right.endSlot) ?? right.endSlot

        if (left.day !== right.day) {
          return left.day - right.day
        }
        if (leftStartOrder !== rightStartOrder) {
          return leftStartOrder - rightStartOrder
        }
        return leftEndOrder - rightEndOrder
      })
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}
