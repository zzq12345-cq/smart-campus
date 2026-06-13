/** 备课状态 */
export type LessonPlanStatus = 'draft' | 'published' | 'archived'

/** 备课方案 */
export interface LessonPlan {
  $id: string
  $createdAt: string
  $updatedAt: string
  /** 创建者（教师）用户 ID */
  teacherId: string
  /** 课题名称 */
  title: string
  /** 科目 */
  subject: string
  /** 年级 / 班级 */
  grade: string
  /** 教学目标 */
  objectives: string
  /** 教学内容 */
  content: string
  /** 教学步骤（JSON 字符串） */
  steps: string
  /** 教学重难点 */
  keyPoints: string
  /** 课时（分钟） */
  duration: number
  /** 教学方法 */
  teachingMethod: string
  /** 教学工具 / 素材（JSON 字符串，附件 ID 列表） */
  materials: string
  /** 课后作业 / 练习 */
  homework: string
  /** 教学反思 */
  reflection: string
  /** 备注 */
  notes: string
  /** 状态 */
  status: LessonPlanStatus
}

/** 新建备课方案入参 */
export interface LessonPlanCreateData {
  title: string
  subject: string
  grade?: string
  objectives?: string
  content?: string
  steps?: string
  keyPoints?: string
  duration?: number
  teachingMethod?: string
  materials?: string
  homework?: string
  reflection?: string
  notes?: string
}

/** 更新备课方案入参 */
export interface LessonPlanUpdateData {
  title?: string
  subject?: string
  grade?: string
  objectives?: string
  content?: string
  steps?: string
  keyPoints?: string
  duration?: number
  teachingMethod?: string
  materials?: string
  homework?: string
  reflection?: string
  notes?: string
  status?: LessonPlanStatus
}

/** 备课列表查询选项 */
export interface LessonPlanListOptions {
  subject?: string
  status?: LessonPlanStatus
  keyword?: string
  limit?: number
  offset?: number
}
