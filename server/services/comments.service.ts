/**
 * Comments Service — 评论业务逻辑
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
import { COMMENTS_TABLE_ID, POSTS_TABLE_ID } from '../config/index.js'

function buildCommentPermissions(authorId: string): string[] {
  return [
    Permission.read(Role.users()),
    Permission.update(Role.user(authorId)),
    Permission.delete(Role.user(authorId)),
  ]
}

export async function getCommentsByPostId(postId: string, limit = 50, offset = 0) {
  const queries = [
    Query.equal('postId', postId),
    Query.equal('status', 'active'),
    Query.orderAsc('$createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ]
  const result = await listDocuments(COMMENTS_TABLE_ID, queries)
  return {
    rows: result.documents || [],
    total: result.total,
  }
}

export async function createComment(
  userId: string,
  postId: string,
  input: { content: string; parentId?: string; replyToUserId?: string }
) {
  // 验证帖子存在
  await getDocument(POSTS_TABLE_ID, postId)

  const data: Record<string, unknown> = {
    postId,
    authorId: userId,
    content: input.content,
    status: 'active',
    likeCount: 0,
  }
  if (input.parentId) data.parentId = input.parentId
  if (input.replyToUserId) data.replyToUserId = input.replyToUserId

  const comment = await createDocument(COMMENTS_TABLE_ID, data, undefined, buildCommentPermissions(userId))

  // 更新帖子评论数
  try {
    const post = await getDocument(POSTS_TABLE_ID, postId)
    await updateDocument(POSTS_TABLE_ID, postId, {
      commentCount: ((post as any).commentCount || 0) + 1,
    })
  } catch {
    // 计数更新失败不阻塞
  }

  return comment
}

export async function updateComment(userId: string, commentId: string, content: string) {
  const existing = await getDocument(COMMENTS_TABLE_ID, commentId)
  if ((existing as any).authorId !== userId) {
    const err = new Error('无权修改该评论') as Error & { statusCode?: number }
    err.statusCode = 403
    throw err
  }
  return updateDocument(COMMENTS_TABLE_ID, commentId, { content })
}

export async function deleteComment(userId: string, commentId: string) {
  const existing = await getDocument(COMMENTS_TABLE_ID, commentId)
  if ((existing as any).authorId !== userId) {
    const err = new Error('无权删除该评论') as Error & { statusCode?: number }
    err.statusCode = 403
    throw err
  }

  await updateDocument(COMMENTS_TABLE_ID, commentId, { status: 'deleted' })

  // 更新帖子评论数
  try {
    const postId = (existing as any).postId
    if (postId) {
      const post = await getDocument(POSTS_TABLE_ID, postId)
      const count = Math.max(0, ((post as any).commentCount || 0) - 1)
      await updateDocument(POSTS_TABLE_ID, postId, { commentCount: count })
    }
  } catch {
    // 计数更新失败不阻塞
  }

  return true
}
