import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import followsService from '@/services/follows'
import mentalHealthFunctionService from '@/services/mental-health-function'
import pushSchedulerService from '@/services/push-scheduler'
import type { Post, PostCreateData, PostListOptions, PostSection, PostStatus, PostUpdateData } from '@/types/post'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, POSTS_TABLE_ID } from '@/utils/appwrite-shared'

const DEFAULT_SECTION: PostSection = 'psychology'
const SECTION_SET: Set<PostSection> = new Set(['study', 'life', 'psychology'])
const MOOD_SET: Set<NonNullable<Post['mood']>> = new Set(['happy', 'calm', 'anxious', 'sad', 'angry'])

class PostsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: POSTS_TABLE_ID,
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

  private buildPostPermissions(authorId: string, status: PostStatus) {
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

  private normalizeSection(section?: unknown): PostSection {
    if (typeof section === 'string' && SECTION_SET.has(section as PostSection)) {
      return section as PostSection
    }
    return DEFAULT_SECTION
  }

  private normalizeMoodBySection(section: PostSection, mood?: unknown): NonNullable<Post['mood']> {
    if (section !== 'psychology') {
      return 'calm'
    }
    if (typeof mood === 'string' && MOOD_SET.has(mood as NonNullable<Post['mood']>)) {
      return mood as NonNullable<Post['mood']>
    }
    return 'calm'
  }

  private normalizeRiskLevelBySection(section: PostSection, riskLevel?: unknown) {
    if (section !== 'psychology') {
      return 1
    }
    const value = Number(riskLevel ?? 1)
    if (!Number.isFinite(value)) {
      return 1
    }
    return Math.max(1, Math.min(3, Math.round(value)))
  }

  private normalizePost(post: Post): Post {
    return {
      ...post,
      section: this.normalizeSection(post.section),
    }
  }

  private sanitizeForPublic(post: Post): Post {
    const normalized = this.normalizePost(post)
    if (!normalized.isAnonymous) {
      return normalized
    }
    return {
      ...normalized,
      authorId: '',
    }
  }

  private async queueMentalHealthEvaluation(rowId: string, eventType: 'create' | 'update') {
    try {
      await mentalHealthFunctionService.evaluateEvent({
        sourceTable: 'posts',
        rowId,
        eventType,
      })
    } catch (error) {
      console.warn('Mental health evaluation skipped for post:', error)
    }
  }

  private isFulltextIndexError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return /fulltext|index|search/i.test(message)
  }

  private async notifyFollowers(postId: string, authorId: string, content: string) {
    try {
      const followers = await followsService.getFollowers(authorId, 100, 0)
      if (!followers?.length) {
        return
      }
      const followerIds = followers.map((item) => item.followerId).filter(Boolean)
      const preview = content.slice(0, 200)
      await pushSchedulerService.scheduleFollowerNotifications(postId, authorId, preview, followerIds)
    } catch {
      // ignore
    }
  }

  async createPost(input: PostCreateData) {
    const authorId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const status = (input.status || 'published') as PostStatus
    const section = this.normalizeSection(input.section)
    const payload = {
      authorId,
      isAnonymous: input.isAnonymous ?? true,
      content: input.content,
      section,
      topic: input.topic || 'daily',
      mood: this.normalizeMoodBySection(section, input.mood),
      riskLevel: this.normalizeRiskLevelBySection(section, input.riskLevel),
      status,
      images: input.images || [],
      likeCount: 0,
      commentCount: 0,
    }
    const permissions = this.buildPostPermissions(authorId, status)
    const created = (await tablesDB.createRow(databaseId, tableId, ID.unique(), payload, permissions)) as Post

    await this.queueMentalHealthEvaluation(created.$id, 'create')

    if (status === 'published' && !payload.isAnonymous) {
      this.notifyFollowers(created.$id, authorId, input.content).catch(() => undefined)
    }

    return created
  }

  async getPublicPosts(options: PostListOptions = {}) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = [Query.equal('status', (options.status || 'published') as string)]
    if (options.section && options.section !== 'all') {
      queries.push(Query.equal('section', options.section))
    }
    if (options.topic && options.topic !== 'all') {
      queries.push(Query.equal('topic', options.topic))
    }
    const keyword = options.keyword?.trim()
    if (keyword) {
      queries.push(Query.search('content', keyword))
    }
    queries.push(Query.orderDesc('$createdAt'))
    queries.push(Query.limit(options.limit ?? 20))
    queries.push(Query.offset(options.offset ?? 0))

    try {
      const result = await tablesDB.listRows(databaseId, tableId, queries)
      const rows = (result?.rows || []) as Post[]
      return rows.map((post) => this.sanitizeForPublic(post))
    } catch (error) {
      if (keyword && this.isFulltextIndexError(error)) {
        const fallbackQueries: string[] = [Query.equal('status', (options.status || 'published') as string)]
        if (options.section && options.section !== 'all') {
          fallbackQueries.push(Query.equal('section', options.section))
        }
        if (options.topic && options.topic !== 'all') {
          fallbackQueries.push(Query.equal('topic', options.topic))
        }
        fallbackQueries.push(Query.contains('content', keyword))
        fallbackQueries.push(Query.orderDesc('$createdAt'))
        fallbackQueries.push(Query.limit(options.limit ?? 20))
        fallbackQueries.push(Query.offset(options.offset ?? 0))
        const result = await tablesDB.listRows(databaseId, tableId, fallbackQueries)
        const rows = (result?.rows || []) as Post[]
        return rows.map((post) => this.sanitizeForPublic(post))
      }
      throw error
    }
  }

  async getMyPosts(options: PostListOptions = {}) {
    const authorId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = [Query.equal('authorId', authorId)]
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
    queries.push(Query.limit(options.limit ?? 20))
    queries.push(Query.offset(options.offset ?? 0))
    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as Post[]
  }

  async getMyPostsCount(options: Omit<PostListOptions, 'limit' | 'offset'> = {}) {
    const authorId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = [Query.equal('authorId', authorId)]
    if (options.section && options.section !== 'all') {
      queries.push(Query.equal('section', options.section))
    }
    if (options.status) {
      queries.push(Query.equal('status', options.status))
    }
    if (options.topic && options.topic !== 'all') {
      queries.push(Query.equal('topic', options.topic))
    }
    queries.push(Query.limit(1))
    const result = (await tablesDB.listRows(databaseId, tableId, queries, true)) as { total?: number }
    return Number(result?.total || 0)
  }

  async getMyPostsLikeCount(options: Omit<PostListOptions, 'limit' | 'offset'> = {}) {
    const authorId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const limit = 100
    let offset = 0
    let totalLikes = 0

    while (true) {
      const queries: string[] = [Query.equal('authorId', authorId)]
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
      queries.push(Query.limit(limit))
      queries.push(Query.offset(offset))

      const result = await tablesDB.listRows(databaseId, tableId, queries)
      const rows = (result?.rows || []) as Post[]
      rows.forEach((post) => {
        totalLikes += Number(post.likeCount || 0)
      })

      if (rows.length < limit) {
        break
      }
      offset += limit
    }

    return totalLikes
  }

  async getPostById(rowId: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const post = (await tablesDB.getRow(databaseId, tableId, rowId)) as Post
    if (post.status === 'published') {
      return this.sanitizeForPublic(post)
    }

    const currentUserId = await this.getAuthUserId()
    if (post.authorId !== currentUserId) {
      const error = new Error('No access to this post') as Error & { code?: number }
      error.code = 403
      throw error
    }
    return this.normalizePost(post)
  }

  private async getOwnedPost(rowId: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const post = (await tablesDB.getRow(databaseId, tableId, rowId)) as Post
    const currentUserId = await this.getAuthUserId()
    if (post.authorId !== currentUserId) {
      const error = new Error('No access to this post') as Error & { code?: number }
      error.code = 403
      throw error
    }
    return this.normalizePost(post)
  }

  async updatePost(rowId: string, patch: PostUpdateData) {
    const existing = await this.getOwnedPost(rowId)
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const status = (patch.status || existing.status || 'published') as PostStatus
    const section = this.normalizeSection(patch.section ?? existing.section)
    const payload = {
      content: patch.content ?? existing.content,
      section,
      topic: patch.topic ?? existing.topic,
      mood: this.normalizeMoodBySection(section, patch.mood ?? existing.mood),
      isAnonymous: patch.isAnonymous ?? existing.isAnonymous,
      riskLevel: this.normalizeRiskLevelBySection(section, patch.riskLevel ?? existing.riskLevel),
      status,
      images: patch.images ?? existing.images ?? [],
      likeCount: patch.likeCount ?? existing.likeCount ?? 0,
      commentCount: patch.commentCount ?? existing.commentCount ?? 0,
    }
    const permissions = this.buildPostPermissions(existing.authorId, status)
    const updated = (await tablesDB.updateRow(databaseId, tableId, rowId, payload, permissions)) as Post
    await this.queueMentalHealthEvaluation(updated.$id, 'update')
    return updated
  }

  async deletePost(rowId: string) {
    await this.getOwnedPost(rowId)
    await this.updatePost(rowId, { status: 'deleted' })
    return true
  }

  async getPostsByTag(topic: string) {
    return this.getPublicPosts({ topic: topic as PostListOptions['topic'], status: 'published', limit: 50 })
  }

  async createMyPost(input: PostCreateData) {
    return this.createPost(input)
  }

  async listPosts(options: PostListOptions = {}) {
    const rows = await this.getPublicPosts(options)
    return { rows, total: rows.length }
  }

  async getPost(rowId: string) {
    return this.getPostById(rowId)
  }

  async getMyPost(rowId: string) {
    return this.getOwnedPost(rowId)
  }

  async updateMyPost(rowId: string, patch: PostUpdateData) {
    return this.updatePost(rowId, patch)
  }

  async deleteMyPost(rowId: string) {
    return this.deletePost(rowId)
  }
}

const postsService = new PostsService()
export default postsService
