export type PostTopic =
  | 'all'
  | 'daily'
  | 'mood'
  | 'study'
  | 'relationship'
  | 'future'
  | 'night'
  | 'course_review'
  | 'exam_info'
  | 'learning_material'
  | 'competition'
  | 'life_help'
  | 'second_hand'
  | 'activity'
  | 'job'
  | 'rental'
export type PostMood = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry'
export type PostStatus = 'published' | 'pending_review' | 'hidden' | 'deleted' | 'draft'
export type PostSection = 'study' | 'life' | 'psychology'

export interface Post {
  $id: string
  authorId: string
  isAnonymous: boolean
  content: string
  topic: PostTopic
  mood?: PostMood
  riskLevel: number
  status: PostStatus
  section?: PostSection
  images?: string[]
  likeCount?: number
  commentCount?: number
  $createdAt?: string
  $updatedAt?: string
  [key: string]: unknown
}

export interface PostCreateData {
  content: string
  topic?: PostTopic
  mood?: PostMood
  riskLevel?: number
  status?: PostStatus
  section?: PostSection
  isAnonymous?: boolean
  images?: string[]
}

export interface PostUpdateData extends Partial<PostCreateData> {
  likeCount?: number
  commentCount?: number
}

export interface PostListOptions {
  topic?: PostTopic | 'all'
  section?: PostSection | 'all'
  status?: PostStatus | ''
  keyword?: string
  limit?: number
  offset?: number
}
