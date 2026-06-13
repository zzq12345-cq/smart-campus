import { describe, expect, it } from 'vitest'
import type { EducationSemesterSchedule } from '@/types/education'
import {
  clampSemesterWeek,
  getCurrentWeekForSemester,
  getSemesterMaxWeek,
  getSemesterWeekStartDate,
  getSemesterWeekdayForDate,
  getUntimedCourses,
  getWeekScheduleCourses,
  groupSemesterCourses,
  parseEducationDate,
  selectDefaultSemester,
  sortSemesters
} from '@/utils/education-schedule'

function createSemester(overrides?: Partial<EducationSemesterSchedule>): EducationSemesterSchedule {
  return {
    semesterId: '2025-2026-2',
    semesterName: '2025-2026-2',
    startDate: '2026-03-02',
    courses: [
      {
        name: '高等数学',
        credit: 4,
        teacher: '张老师',
        weeksText: '1-16周',
        type: '必修',
        studentCount: 60,
        semesterId: '2025-2026-2',
        semesterName: '2025-2026-2',
        day: 1,
        startSlot: 1,
        endSlot: 2,
        weeks: [1, 2, 3, 4, 5],
        location: '主楼101',
        weekType: 'all',
        timeLocation: {
          day: 1,
          startSlot: 1,
          endSlot: 2,
          weeks: [1, 2, 3, 4, 5],
          location: '主楼101',
          weekType: 'all',
          raw: '星期一第1-2节（1-5周）主楼101'
        }
      },
      {
        name: '高等数学',
        credit: 4,
        teacher: '张老师',
        weeksText: '1-16周',
        type: '必修',
        studentCount: 60,
        semesterId: '2025-2026-2',
        semesterName: '2025-2026-2',
        day: 3,
        startSlot: 3,
        endSlot: 4,
        weeks: [1, 2, 3],
        location: '实验楼202',
        weekType: 'all',
        timeLocation: {
          day: 3,
          startSlot: 3,
          endSlot: 4,
          weeks: [1, 2, 3],
          location: '实验楼202',
          weekType: 'all',
          raw: '星期三第3-4节（1-3周）实验楼202'
        }
      },
      {
        name: '课程设计',
        credit: 2,
        teacher: '李老师',
        weeksText: '8-12周',
        type: '实践',
        studentCount: 30,
        semesterId: '2025-2026-2',
        semesterName: '2025-2026-2',
        day: 0,
        startSlot: 0,
        endSlot: 0,
        weeks: [],
        location: '',
        weekType: 'all',
        timeLocation: null
      }
    ],
    ...overrides
  }
}

function formatDate(dateValue: Date | null) {
  if (!dateValue) {
    return null
  }

  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('education-schedule utils', () => {
  it('parses plain semester dates in local time', () => {
    expect(formatDate(parseEducationDate('2026-03-02'))).toBe('2026-03-02')
    expect(parseEducationDate('')).toBeNull()
  })

  it('sorts semesters by start date descending', () => {
    const semesters = sortSemesters([
      createSemester({ semesterId: '2024-2025-1', startDate: '2024-09-01', courses: [] }),
      createSemester({ semesterId: '2025-2026-2', startDate: '2026-03-02', courses: [] })
    ])

    expect(semesters.map((item) => item.semesterId)).toEqual(['2025-2026-2', '2024-2025-1'])
  })

  it('selects current semester by aligned opening week and falls back to latest', () => {
    const currentSemester = selectDefaultSemester(
      [
        createSemester({ semesterId: '2024-2025-1', startDate: '2024-09-01', courses: [] }),
        createSemester({ semesterId: '2025-2026-2', startDate: '2026-03-02', courses: [] })
      ],
      new Date('2026-03-02T12:00:00.000Z')
    )

    const fallbackSemester = selectDefaultSemester(
      [
        createSemester({ semesterId: '2025-2026-2', startDate: '2026-03-02', courses: [] }),
        createSemester({ semesterId: '2026-2027-1', startDate: '2026-09-01', courses: [] })
      ],
      new Date('2026-01-10T12:00:00.000Z')
    )

    expect(currentSemester?.semesterId).toBe('2025-2026-2')
    expect(fallbackSemester?.semesterId).toBe('2026-2027-1')
  })

  it('aligns week one to monday and computes current week correctly', () => {
    const semester = createSemester()

    expect(formatDate(getSemesterWeekStartDate(semester, 1))).toBe('2026-03-02')
    expect(formatDate(getSemesterWeekStartDate(semester, 2))).toBe('2026-03-09')
    expect(getCurrentWeekForSemester(semester, new Date('2026-03-07T12:00:00.000Z'))).toBe(1)
    expect(getSemesterWeekdayForDate(semester, 1, new Date('2026-03-07T12:00:00.000Z'))).toBe(6)
    expect(getSemesterWeekdayForDate(semester, 2, new Date('2026-03-07T12:00:00.000Z'))).toBeNull()
  })

  it('computes max week and clamps week range', () => {
    const semester = createSemester()

    expect(getSemesterMaxWeek(semester)).toBe(5)
    expect(clampSemesterWeek(semester, 99)).toBe(5)
  })

  it('filters courses by week and keeps untimed courses separately', () => {
    const semester = createSemester()

    const weekCourses = getWeekScheduleCourses(semester, 4)
    const untimedCourses = getUntimedCourses(semester)

    expect(weekCourses).toHaveLength(1)
    expect(weekCourses[0].day).toBe(1)
    expect(untimedCourses).toHaveLength(1)
    expect(untimedCourses[0].name).toBe('课程设计')
  })

  it('groups semester courses for semester view', () => {
    const groupedCourses = groupSemesterCourses(createSemester())

    expect(groupedCourses).toHaveLength(2)
    const mathCourse = groupedCourses.find((item) => item.name === '高等数学')
    const practiceCourse = groupedCourses.find((item) => item.name === '课程设计')

    expect(mathCourse?.meetings).toHaveLength(2)
    expect(practiceCourse?.hasUntimedCourse).toBe(true)
  })
})
