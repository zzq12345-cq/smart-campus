/**
 * Users Service — 用户资料（公开视图）
 */
import { getDocument, listDocuments, Query } from './appwrite.service.js'
import { USERS_TABLE_ID, POSTS_TABLE_ID } from '../config/index.js'

/**
 * 获取用户公开资料
 */
export async function getUserProfile(userId: string) {
  const doc = await getDocument(USERS_TABLE_ID, userId)
  const user = doc as any
  return {
    id: user.$id,
    name: user.name,
    avatar: user.avatar || null,
    bio: user.bio || null,
    school: user.school || null,
    level: user.level,
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0,
    createdAt: user.$createdAt,
  }
}

/**
 * 获取用户的公开帖子
 */
export async function getUserPosts(userId: string, limit = 20, offset = 0) {
  const result = await listDocuments(POSTS_TABLE_ID, [
    Query.equal('authorId', userId),
    Query.equal('status', 'published'),
    Query.equal('isAnonymous', false),
    Query.orderDesc('$createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ])

  return {
    rows: result.documents || [],
    total: result.total,
  }
}
