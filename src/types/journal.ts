export type JournalMood = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry'

export interface Journal {
  $id: string
  userId: string
  title?: string
  content: string
  mood?: JournalMood
  isPrivate?: boolean
  tags?: string[]
  summary?: string
  sentimentScore?: number
  riskLevel?: number
  $createdAt?: string
  $updatedAt?: string
  [key: string]: unknown
}

export interface JournalCreateData {
  content: string
  mood?: JournalMood
  isPrivate?: boolean
  tags?: string[]
  summary?: string
  sentimentScore?: number
  riskLevel?: number
}

export interface JournalUpdateData extends Partial<JournalCreateData> {}

export interface JournalListOptions {
  mood?: JournalMood
  isPrivate?: boolean
  riskLevel?: number
  limit?: number
  offset?: number
  order?: 'asc' | 'desc'
}
