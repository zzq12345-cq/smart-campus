import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import notificationsService from '@/services/notifications'
import { tablesDB } from '@/utils/appwrite'
import { COMMENTS_TABLE_ID, MINDGUARD_DATABASE_ID, POSTS_TABLE_ID } from '@/utils/appwrite-shared'

export type CommentStatus = 'published' | 'hidden' | 'deleted'

export interface CommentRow {
  $id: string
  postId: string
  authorId: string
  isAnonymous: boolean
  content: string
  parentCommentId: string
  status: CommentStatus
  likeCount: number
  $createdAt?: string
  $updatedAt?: string
  [key: string]: unknown
}

export interface CreateCommentInput {
  postId: string
  content: string
  isAnonymous?: boolean
  parentCommentId?: string
  status?: CommentStatus
  likeCount?: number
}

export interface UpdateCommentInput {
  content?: string
  isAnonymous?: boolean
  status?: CommentStatus
  likeCount?: number
}

class CommentsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: COMMENTS_TABLE_ID,
    }
  }

  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    if (!user?.$id) {
      const error = new Error('User is not authenticated') as Error & { code?: number }
      error.code = 401
      throw error
    }
    return user.$id
  }

  private buildCommentPermissions(authorId: string, status: CommentStatus) {
    const permissions = [
      Permission.read(Role.user(authorId)),
      Permission.update(Role.user(authorId)),
      Permission.delete(Role.user(authorId)),
    ]
    if (status === 'published') {
      permissions.push(Permission.read(Role.users()))
    }
    return permissions
  }

  async listAllCommentsByPost({
    postId,
    status = 'published',
    limit = 200,
    offset = 0,
  }: {
    postId: string
    status?: CommentStatus | ''
    limit?: number
    offset?: number
  }) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = [Query.equal('postId', postId)]
    if (status) {
      queries.push(Query.equal('status', status))
    }
    queries.push(Query.orderAsc('$createdAt'))
    queries.push(Query.limit(limit))
    queries.push(Query.offset(offset))
    return tablesDB.listRows(databaseId, tableId, queries)
  }

  async getMyComment(rowId: string) {
    const authorId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const row = (await tablesDB.getRow(databaseId, tableId, rowId)) as CommentRow
    if (row.authorId !== authorId) {
      const error = new Error('No access to this comment') as Error & { code?: number }
      error.code = 403
      throw error
    }
    return row
  }

  private async sendCommentNotification(authorId: string, postId: string, content: string, parentCommentId?: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const preview = content.slice(0, 100)

    if (parentCommentId) {
      try {
        const parentComment = (await tablesDB.getRow(databaseId, tableId, parentCommentId)) as CommentRow
        if (parentComment.authorId && parentComment.authorId !== authorId) {
          await notificationsService.createNotification({
            recipientId: parentComment.authorId,
            actorId: authorId,
            type: 'reply',
            targetType: 'comment',
            targetId: postId,
            preview,
          })
        }
      } catch {
        // ignore
      }
    }

    try {
      const post = (await tablesDB.getRow(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, postId)) as {
        authorId: string
      }
      if (post.authorId && post.authorId !== authorId) {
        await notificationsService.createNotification({
          recipientId: post.authorId,
          actorId: authorId,
          type: 'comment',
          targetType: 'post',
          targetId: postId,
          preview,
        })
      }
    } catch {
      // ignore
    }
  }

  async createMyComment(input: CreateCommentInput) {
    const authorId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const status = (input.status || 'published') as CommentStatus
    const postId = String(input.postId || '').trim()
    const content = String(input.content || '').trim()

    if (!postId) {
      const error = new Error('Missing post id') as Error & { code?: number }
      error.code = 400
      throw error
    }
    if (!content) {
      const error = new Error('Comment content is required') as Error & { code?: number }
      error.code = 400
      throw error
    }

    const created = (await tablesDB.createRow(
      databaseId,
      tableId,
      ID.unique(),
      {
        postId,
        authorId,
        isAnonymous: input.isAnonymous ?? true,
        content,
        parentCommentId: input.parentCommentId || '',
        status,
        likeCount: input.likeCount ?? 0,
      },
      this.buildCommentPermissions(authorId, status)
    )) as CommentRow

    if (status === 'published') {
      try {
        await tablesDB.incrementRowColumn(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, postId, 'commentCount', 1)
      } catch (error) {
        console.error('Failed to increment post commentCount:', error)
      }

      if (!(input.isAnonymous ?? true)) {
        this.sendCommentNotification(authorId, postId, content, input.parentCommentId).catch(() => undefined)
      }
    }

    return created
  }

  async updateMyComment(rowId: string, patch: UpdateCommentInput = {}) {
    const existing = await this.getMyComment(rowId)
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const nextStatus = (patch.status || existing.status || 'published') as CommentStatus
    const content = typeof patch.content === 'string' ? patch.content.trim() : String(existing.content || '')

    if (!content) {
      const error = new Error('Comment content is required') as Error & { code?: number }
      error.code = 400
      throw error
    }

    return tablesDB.updateRow(
      databaseId,
      tableId,
      rowId,
      {
        postId: existing.postId,
        authorId: existing.authorId,
        isAnonymous: patch.isAnonymous ?? existing.isAnonymous,
        content,
        parentCommentId: existing.parentCommentId || '',
        status: nextStatus,
        likeCount: patch.likeCount ?? existing.likeCount ?? 0,
      },
      this.buildCommentPermissions(existing.authorId, nextStatus)
    )
  }

  async deleteMyComment(rowId: string) {
    const existing = await this.getMyComment(rowId)
    const wasPublished = existing.status === 'published'
    const updated = await this.updateMyComment(rowId, { status: 'deleted' })

    if (wasPublished && existing.postId) {
      try {
        await tablesDB.decrementRowColumn(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, existing.postId, 'commentCount', 1, 0)
      } catch (error) {
        console.error('Failed to decrement post commentCount:', error)
      }
    }

    return updated
  }

  async setCommentLikeCount(commentId: string, nextLikeCount: number) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const safeCount = Math.max(0, Math.floor(Number(nextLikeCount || 0)))
    return tablesDB.updateRow(databaseId, tableId, commentId, { likeCount: safeCount })
  }
}

const commentsService = new CommentsService()
export default commentsService
