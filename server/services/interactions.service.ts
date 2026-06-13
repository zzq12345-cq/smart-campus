/**
 * Interactions Service — 点赞 / 收藏
 */
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  Query,
  Permission,
  Role,
} from './appwrite.service.js'
import { POST_INTERACTIONS_TABLE_ID, POSTS_TABLE_ID } from '../config/index.js'
import type { InteractionType } from '../types/index.js'

async function findInteraction(userId: string, postId: string, type: InteractionType) {
  const result = await listDocuments(POST_INTERACTIONS_TABLE_ID, [
    Query.equal('userId', userId),
    Query.equal('postId', postId),
    Query.equal('type', type),
    Query.limit(1),
  ])
  return result.documents[0] || null
}

/**
 * 切换点赞/收藏状态（toggle）
 */
export async function toggleInteraction(userId: string, postId: string, type: InteractionType) {
  // 验证帖子存在
  await getDocument(POSTS_TABLE_ID, postId)

  const existing = await findInteraction(userId, postId, type)

  if (existing) {
    // 取消
    await deleteDocument(POST_INTERACTIONS_TABLE_ID, existing.$id)

    // 更新帖子计数
    if (type === 'like') {
      try {
        const post = await getDocument(POSTS_TABLE_ID, postId)
        await updateDocument(POSTS_TABLE_ID, postId, {
          likeCount: Math.max(0, ((post as any).likeCount || 0) - 1),
        })
      } catch { /* ignore */ }
    }

    return { action: 'removed', type }
  }

  // 新增
  await createDocument(
    POST_INTERACTIONS_TABLE_ID,
    { userId, postId, type },
    undefined,
    [
      Permission.read(Role.user(userId)),
      Permission.delete(Role.user(userId)),
      Permission.read(Role.users()),
    ]
  )

  // 更新帖子计数
  if (type === 'like') {
    try {
      const post = await getDocument(POSTS_TABLE_ID, postId)
      await updateDocument(POSTS_TABLE_ID, postId, {
        likeCount: ((post as any).likeCount || 0) + 1,
      })
    } catch { /* ignore */ }
  }

  return { action: 'added', type }
}

/**
 * 获取用户对某帖子的互动状态
 */
export async function getMyInteractions(userId: string, postId: string) {
  const result = await listDocuments(POST_INTERACTIONS_TABLE_ID, [
    Query.equal('userId', userId),
    Query.equal('postId', postId),
    Query.limit(10),
  ])

  const types = new Set((result.documents || []).map((d: any) => d.type))
  return {
    liked: types.has('like'),
    collected: types.has('collect'),
    shared: types.has('share'),
  }
}

/**
 * 获取用户收藏列表
 */
export async function getMyCollections(userId: string, limit = 20, offset = 0) {
  const result = await listDocuments(POST_INTERACTIONS_TABLE_ID, [
    Query.equal('userId', userId),
    Query.equal('type', 'collect'),
    Query.orderDesc('$createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ])

  // 获取帖子详情
  const postIds = (result.documents || []).map((d: any) => d.postId).filter(Boolean)
  const posts: any[] = []
  for (const pid of postIds) {
    try {
      const post = await getDocument(POSTS_TABLE_ID, pid)
      if ((post as any).status === 'published') {
        posts.push(post)
      }
    } catch {
      // 帖子可能已删除
    }
  }

  return { rows: posts, total: result.total }
}
