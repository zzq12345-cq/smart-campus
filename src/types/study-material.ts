export interface StudyMaterial {
  $id: string
  $createdAt: string
  $updatedAt: string
  authorId: string
  title: string
  description: string
  subject: string
  materialType: MaterialType
  fileIds: string[]
  fileNames: string[]
  downloadCount: number
  likeCount: number
  tags: string[]
}

export type MaterialType = 'notes' | 'past_exam' | 'courseware' | 'lab_report' | 'other'

export interface StudyMaterialCreateData {
  title: string
  description: string
  subject: string
  materialType: MaterialType
  fileIds: string[]
  fileNames: string[]
  tags?: string[]
}
