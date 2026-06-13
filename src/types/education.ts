export interface EducationCaptchaResult {
  challengeId: string
  captchaImageBase64: string
  captchaTextHints: string[]
  imageWidth: number
  imageHeight: number
}

export interface EducationPersonalInfo {
  name: string
  studentId: string
  class: string
  major: string
  grade: string
  gender: string
  dormitory: string
}

export interface EducationLoginResult {
  cookieBundle: string
  personalInfo: EducationPersonalInfo
}

export interface EducationLoginLinkResult {
  challengeId: string
  loginUrl: string
  ticket: string
  expiresAt: string
}

export interface EducationPendingLinkLogin extends EducationLoginLinkResult {
  appUserId: string
}

export type EducationLoginLinkStatus = 'waiting' | 'confirmed' | 'expired' | 'error'

export interface EducationLoginLinkStatusResult {
  status: EducationLoginLinkStatus
  message: string
}

export interface EducationScheduleTimeLocation {
  day: number
  startSlot: number
  endSlot: number
  weeks: number[]
  location: string
  weekType: string
  raw: string
}

export interface EducationScheduleCourse {
  name: string
  credit: number
  teacher: string
  weeksText: string
  type: string
  studentCount: number
  semesterId: string
  semesterName: string
  day: number
  startSlot: number
  endSlot: number
  weeks: number[]
  location: string
  weekType: string
  timeLocation: EducationScheduleTimeLocation | null
}

export interface EducationSemesterSummary {
  semesterId: string
  semesterName: string
  startDate: string
}

export interface EducationSemesterSchedule extends EducationSemesterSummary {
  courses: EducationScheduleCourse[]
}

export interface EducationGradeCourse {
  courseName: string
  credit: number
  score: number
  scoreText: string
  level: string
  studyType: string
  midtermStatus: string
  finalStatus: string
  semesterId: string
  semesterName: string
}

export interface EducationSemesterGrades {
  semesterId: string
  semesterName: string
  courses: EducationGradeCourse[]
  summary: {
    courseCount: number
    creditTotal: number
    averageScore: number
    failedCount: number
  }
}

export interface EducationGradesResult {
  semesters: EducationSemesterGrades[]
  summary: {
    semesterCount: number
    courseCount: number
    creditTotal: number
    averageScore: number
    failedCount: number
  }
  failedCourses: EducationGradeCourse[]
}

export interface EducationCaptchaPoint {
  x: number
  y: number
  order: number
}

export interface EducationAuthSnapshot {
  appUserId: string
  studentId: string
  cookieBundle: string
  personalInfo: EducationPersonalInfo
  authenticatedAt: string
}

export interface EducationScheduleCacheSnapshot {
  appUserId: string
  fetchedAt: string
  semesters: EducationSemesterSummary[]
  semesterSchedules: Record<string, EducationSemesterSchedule>
}

export interface CaptchaImageRect {
  left: number
  top: number
  width: number
  height: number
}
