export interface StudyCheckin {
  $id: string
  $createdAt: string
  userId: string
  checkinDate: string
  checkinType: StudyCheckinType
  content: string
  duration: number
}

export type StudyCheckinType = 'self_study' | 'vocabulary' | 'exercises' | 'review' | 'other'

export interface StudyCheckinCreateData {
  checkinDate: string
  checkinType: StudyCheckinType
  content: string
  duration: number
}
