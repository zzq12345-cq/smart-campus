export type ExamType = 'midterm' | 'final' | 'quiz'

export interface ExamTask {
  title: string
  done: boolean
}

export interface ExamPlan {
  $id: string
  $createdAt: string
  $updatedAt: string
  authorId: string
  subject: string
  examDate: string
  examEndDate: string
  location: string
  examType: ExamType
  notes: string
  tasks: string
  isPublic: boolean
}

export interface ExamPlanCreateData {
  subject: string
  examDate: string
  examEndDate?: string
  location?: string
  examType: ExamType
  notes?: string
  tasks?: ExamTask[]
}
