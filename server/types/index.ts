/**
 * 共享类型定义
 */

// ========== 通用 ==========
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  rows: T[]
  total: number
  limit: number
  offset: number
}

export interface PaginationQuery {
  limit?: number
  offset?: number
}

// ========== 用户 ==========
export interface DbUser {
  $id: string
  $createdAt: string
  $updatedAt: string
  email: string
  name: string
  avatar?: string | null
  bio?: string | null
  school?: string | null
  teacherSubject?: string | null
  level: number
  streakDays: number
  totalCheckins: number
  totalTasks: number
  followersCount?: number
  followingCount?: number
  privacySettings?: string
  notificationSettings?: string
}

export interface JwtPayload {
  userId: string
  email: string
  name: string
  iat?: number
  exp?: number
}

// ========== 帖子 ==========
export type PostSection = 'study' | 'life' | 'psychology'
export type PostStatus = 'published' | 'draft' | 'deleted'
export type PostMood = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry'

export interface Post {
  $id: string
  $createdAt: string
  $updatedAt: string
  authorId: string
  isAnonymous: boolean
  content: string
  section: PostSection
  topic: string
  mood: PostMood
  riskLevel: number
  status: PostStatus
  images: string[]
  likeCount: number
  commentCount: number
}

export interface PostCreateInput {
  content: string
  section?: PostSection
  topic?: string
  mood?: PostMood
  isAnonymous?: boolean
  riskLevel?: number
  status?: PostStatus
  images?: string[]
}

export interface PostUpdateInput {
  content?: string
  section?: PostSection
  topic?: string
  mood?: PostMood
  isAnonymous?: boolean
  riskLevel?: number
  status?: PostStatus
  images?: string[]
}

// ========== 评论 ==========
export interface Comment {
  $id: string
  $createdAt: string
  $updatedAt: string
  postId: string
  authorId: string
  content: string
  parentId?: string | null
  replyToUserId?: string | null
  likeCount: number
  status: string
}

export interface CommentCreateInput {
  content: string
  parentId?: string
  replyToUserId?: string
}

// ========== 互动 ==========
export type InteractionType = 'like' | 'collect' | 'share'

export interface PostInteraction {
  $id: string
  $createdAt: string
  userId: string
  postId: string
  type: InteractionType
}
