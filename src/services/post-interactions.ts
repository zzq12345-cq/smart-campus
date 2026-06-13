import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import notificationsService from '@/services/notifications'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, POST_INTERACTIONS_TABLE_ID, POSTS_TABLE_ID } from '@/utils/appwrite-shared'

export type InteractionType = 'like' | 'save' | 'report'

export interface PostInteraction {
  $id: string
  userId: string
  postId: string
  type: InteractionType
  $createdAt?: string
  $updatedAt?: string
}

export interface LikeResult {
  liked: boolean
  interactionId: string
  likeCount: number
  counterUpdated?: boolean
  counterErrorCode?: number
}

export interface SaveResult {
  saved: boolean
  interactionId: string
}

class PostInteractionsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: POST_INTERACTIONS_TABLE_ID,
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

  private buildInteractionPermissions(userId: string) {
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]
  }

  private async getCurrentPostLikeCount(postId: string) {
    try {
      const post = (await tablesDB.getRow(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, postId)) as {
        likeCount?: number
      }
      return Number(post.likeCount || 0)
    } catch {
      return 0
    }
  }

  private async applyLikeCountDelta(postId: string, delta: number, userId: string) {
    if (!delta) {
      return {
        likeCount: await this.getCurrentPostLikeCount(postId),
        counterUpdated: true,
        counterErrorCode: undefined as number | undefined,
      }
    }

    try {
      const post = (await tablesDB.getRow(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, postId)) as {
        likeCount?: number
        authorId: string
        content?: string
      }
      const nextLikeCount = Math.max(0, Number(post.likeCount || 0) + delta)
      await tablesDB.updateRow(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, postId, {
        likeCount: nextLikeCount,
      })

      if (delta > 0 && post.authorId && post.authorId !== userId) {
        notificationsService.createNotification({
          recipientId: post.authorId,
          actorId: userId,
          type: 'like',
          targetType: 'post',
          targetId: postId,
          preview: String(post.content || '').slice(0, 100),
        }).catch(() => undefined)
      }

      return {
        likeCount: nextLikeCount,
        counterUpdated: true,
        counterErrorCode: undefined as number | undefined,
      }
    } catch (error) {
      return {
        likeCount: await this.getCurrentPostLikeCount(postId),
        counterUpdated: false,
        counterErrorCode: Number((error as { code?: number })?.code || 403),
      }
    }
  }

  async getMyLikeForPost(postId: string): Promise<PostInteraction | null> {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    try {
      const result = await tablesDB.listRows(databaseId, tableId, [
        Query.equal('userId', userId),
        Query.equal('postId', postId),
        Query.equal('type', 'like'),
        Query.limit(1),
      ])
      const rows = (result?.rows || []) as PostInteraction[]
      return rows[0] || null
    } catch {
      return null
    }
  }

  async getMyLikesForPosts(postIds: string[]): Promise<Map<string, PostInteraction>> {
    const likeMap = new Map<string, PostInteraction>()
    if (!postIds.length) {
      return likeMap
    }

    for (const postId of postIds) {
      const interaction = await this.getMyLikeForPost(postId)
      if (interaction) {
        likeMap.set(postId, interaction)
      }
    }

    return likeMap
  }

  async getMySaveForPost(postId: string): Promise<PostInteraction | null> {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    try {
      const result = await tablesDB.listRows(databaseId, tableId, [
        Query.equal('userId', userId),
        Query.equal('postId', postId),
        Query.equal('type', 'save'),
        Query.limit(1),
      ])
      const rows = (result?.rows || []) as PostInteraction[]
      return rows[0] || null
    } catch {
      return null
    }
  }

  async getMySavesForPosts(postIds: string[]): Promise<Map<string, PostInteraction>> {
    const saveMap = new Map<string, PostInteraction>()
    if (!postIds.length) {
      return saveMap
    }

    for (const postId of postIds) {
      const interaction = await this.getMySaveForPost(postId)
      if (interaction) {
        saveMap.set(postId, interaction)
      }
    }

    return saveMap
  }

  async setMyLikeState(postId: string, isLiked: boolean, existingInteractionId?: string): Promise<LikeResult> {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    let interactionId = String(existingInteractionId || '').trim()
    if (!interactionId) {
      interactionId = String((await this.getMyLikeForPost(postId))?.$id || '').trim()
    }

    let delta = 0
    if (isLiked) {
      if (!interactionId) {
        const interaction = (await tablesDB.createRow(
          databaseId,
          tableId,
          ID.unique(),
          { userId, postId, type: 'like' },
          this.buildInteractionPermissions(userId)
        )) as PostInteraction
        interactionId = interaction.$id
        delta = 1
      }
    } else if (interactionId) {
      await tablesDB.deleteRow(databaseId, tableId, interactionId)
      interactionId = ''
      delta = -1
    }

    const counterResult = await this.applyLikeCountDelta(postId, delta, userId)

    return {
      liked: isLiked,
      interactionId,
      likeCount: counterResult.likeCount,
      counterUpdated: counterResult.counterUpdated,
      counterErrorCode: counterResult.counterErrorCode,
    }
  }

  async setMySaveState(postId: string, isSaved: boolean, existingInteractionId?: string): Promise<SaveResult> {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    let interactionId = String(existingInteractionId || '').trim()
    if (!interactionId) {
      interactionId = String((await this.getMySaveForPost(postId))?.$id || '').trim()
    }

    if (isSaved) {
      if (!interactionId) {
        const interaction = (await tablesDB.createRow(
          databaseId,
          tableId,
          ID.unique(),
          { userId, postId, type: 'save' },
          this.buildInteractionPermissions(userId)
        )) as PostInteraction
        interactionId = interaction.$id
      }
      return { saved: true, interactionId }
    }

    if (interactionId) {
      await tablesDB.deleteRow(databaseId, tableId, interactionId)
    }

    return { saved: false, interactionId: '' }
  }

  async toggleMySave(postId: string): Promise<SaveResult> {
    const existing = await this.getMySaveForPost(postId)
    return this.setMySaveState(postId, !existing, existing?.$id)
  }
}

const postInteractionsService = new PostInteractionsService()
export default postInteractionsService
