/**
 * Posts Service — 帖子业务逻辑
 */
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  Query,
  Permission,
  Role,
} from './appwrite.service.js'
import { POSTS_TABLE_ID } from '../config/index.js'
import type { Post, PostCreateInput, PostUpdateInput, PostSection, PostStatus, PostMood } from '../types/index.js'

const SECTION_SET = new Set<PostSection>(['study', 'life', 'psychology'])
const MOOD_SET = new Set<PostMood>(['happy', 'calm', 'anxious', 'sad', 'angry'])

function normalizeSection(section?: string): PostSection {
  return SECTION_SET.has(section as PostSection) ? (section as PostSection) : 'psychology'
}

function normalizeMood(section: PostSection, mood?: string): PostMood {
  if (section !== 'psychology') return 'calm'
  return MOOD_SET.has(mood as PostMood) ? (mood as PostMood) : 'calm'
}

function normalizeRiskLevel(section: PostSection, riskLevel?: number): number {
  if (section !== 'psychology') return 1
  const v = Number(riskLevel ?? 1)
  return Number.isFinite(v) ? Math.max(1, Math.min(3, Math.round(v))) : 1
}

function buildPermissions(authorId: string, status: PostStatus): string[] {
  const perms = [
    Permission.read(Role.user(authorId)),
    Permission.update(Role.user(authorId)),
    Permission.delete(Role.user(authorId)),
  ]
  if (status === 'published') {
    perms.push(Permission.read(Role.users()))
  }
  return perms
}

function sanitizePost(post: any, isAnonymous?: boolean): Post {
  const p = { ...post } as Post
  p.section = normalizeSection(p.section)
  if (isAnonymous ?? p.isAnonymous) {
    p.authorId = ''
  }
  return p
}

// ========== Public API ==========

export async function getPublicPosts(options: {
  section?: string
  topic?: string
  status?: string
  keyword?: string
  limit?: number
  offset?: number
}) {
  // 公开列表强制只返回已发布帖子，忽略客户端传入的 status，防止草稿/私密内容泄露
  const queries: string[] = [Query.equal('status', 'published')]
  if (options.section && options.section !== 'all') {
    queries.push(Query.equal('section', options.section))
  }
  if (options.topic && options.topic !== 'all') {
    queries.push(Query.equal('topic', options.topic))
  }

  const keyword = options.keyword?.trim()
  if (keyword) {
    try {
      queries.push(Query.search('content', keyword))
    } catch {
      queries.push(Query.contains('content', keyword))
    }
  }

  queries.push(Query.orderDesc('$createdAt'))
  queries.push(Query.limit(options.limit || 20))
  queries.push(Query.offset(options.offset || 0))

  const result = await listDocuments(POSTS_TABLE_ID, queries)
  return {
    rows: (result.documents || []).map((doc: any) => sanitizePost(doc)),
    total: result.total,
  }
}

export async function getPostById(postId: string, currentUserId?: string) {
  const doc = await getDocument(POSTS_TABLE_ID, postId)
  const post = doc as unknown as Post

  if (post.status === 'published') {
    return sanitizePost(post)
  }

  // 未发布帖子只有作者可见
  if (!currentUserId || post.authorId !== currentUserId) {
    const err = new Error('无权访问该帖子') as Error & { statusCode?: number }
    err.statusCode = 403
    throw err
  }

  return sanitizePost(post, false)
}

export async function createPost(userId: string, input: PostCreateInput) {
  const section = normalizeSection(input.section)
  const status = (input.status || 'published') as PostStatus

  const data = {
    authorId: userId,
    isAnonymous: input.isAnonymous ?? true,
    content: input.content,
    section,
    topic: input.topic || 'daily',
    mood: normalizeMood(section, input.mood),
    riskLevel: normalizeRiskLevel(section, input.riskLevel),
    status,
    images: input.images || [],
    likeCount: 0,
    commentCount: 0,
  }

  const permissions = buildPermissions(userId, status)
  const created = await createDocument(POSTS_TABLE_ID, data, undefined, permissions)
  return created
}

export async function updatePost(userId: string, postId: string, input: PostUpdateInput) {
  // 校验所有权
  const existing = await getDocument(POSTS_TABLE_ID, postId)
  if ((existing as any).authorId !== userId) {
    const err = new Error('无权修改该帖子') as Error & { statusCode?: number }
    err.statusCode = 403
    throw err
  }

  const section = normalizeSection(input.section ?? (existing as any).section)
  const status = (input.status || (existing as any).status || 'published') as PostStatus

  const data: Record<string, unknown> = {}
  if (input.content !== undefined) data.content = input.content
  data.section = section
  if (input.topic !== undefined) data.topic = input.topic
  data.mood = normalizeMood(section, input.mood ?? (existing as any).mood)
  if (input.isAnonymous !== undefined) data.isAnonymous = input.isAnonymous
  data.riskLevel = normalizeRiskLevel(section, input.riskLevel ?? (existing as any).riskLevel)
  data.status = status
  if (input.images !== undefined) data.images = input.images

  const permissions = buildPermissions(userId, status)
  return updateDocument(POSTS_TABLE_ID, postId, data, permissions)
}

export async function deletePost(userId: string, postId: string) {
  const existing = await getDocument(POSTS_TABLE_ID, postId)
  if ((existing as any).authorId !== userId) {
    const err = new Error('无权删除该帖子') as Error & { statusCode?: number }
    err.statusCode = 403
    throw err
  }

  return updateDocument(POSTS_TABLE_ID, postId, { status: 'deleted' })
}

export async function getMyPosts(userId: string, options: {
  section?: string
  status?: string
  topic?: string
  limit?: number
  offset?: number
}) {
  const queries: string[] = [Query.equal('authorId', userId)]
  if (options.section && options.section !== 'all') {
    queries.push(Query.equal('section', options.section))
  }
  if (options.status) {
    queries.push(Query.equal('status', options.status))
  }
  if (options.topic && options.topic !== 'all') {
    queries.push(Query.equal('topic', options.topic))
  }
  queries.push(Query.orderDesc('$createdAt'))
  queries.push(Query.limit(options.limit || 20))
  queries.push(Query.offset(options.offset || 0))

  const result = await listDocuments(POSTS_TABLE_ID, queries)
  return {
    rows: result.documents || [],
    total: result.total,
  }
}

export async function getMyPostsStats(userId: string) {
  // 帖子数
  const countResult = await listDocuments(POSTS_TABLE_ID, [
    Query.equal('authorId', userId),
    Query.equal('status', 'published'),
    Query.limit(1),
  ])
  const postCount = countResult.total

  // 总获赞数 — 遍历帖子相加（设置安全上限防止无限循环）
  let totalLikes = 0
  let offset = 0
  const limit = 100
  const MAX_PAGES = 5 // 最多遍历 500 篇帖子

  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await listDocuments(POSTS_TABLE_ID, [
      Query.equal('authorId', userId),
      Query.equal('status', 'published'),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ])
    for (const doc of batch.documents) {
      totalLikes += Number((doc as any).likeCount || 0)
    }
    if (batch.documents.length < limit) break
    offset += limit
  }

  return { postCount, totalLikes }
}

