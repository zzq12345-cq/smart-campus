import { Query } from 'appwrite'
import type { DbUser } from '@/types/auth'
import type { Post } from '@/types/post'
import type { UserProfile } from '@/types/follow'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'

class UsersService {
  async getUserById(userId: string): Promise<UserProfile | null> {
    const uid = String(userId || '').trim()
    if (!uid) return null

    try {
      const row = (await tablesDB.getRow(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, uid)) as DbUser
      return {
        $id: row.$id,
        name: String(row.name || '').trim(),
        avatar: row.avatar || null,
        bio: String(row.bio || '').trim(),
        school: String(row.school || '').trim(),
        level: Number(row.level || 1),
        followersCount: Number(row.followersCount || 0),
        followingCount: Number(row.followingCount || 0)
      }
    } catch {
      return null
    }
  }

  async getUserPublicPosts(userId: string, limit = 20, offset = 0): Promise<Post[]> {
    const uid = String(userId || '').trim()
    if (!uid) return []

    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, [
      Query.equal('authorId', uid),
      Query.equal('status', 'published'),
      Query.equal('isAnonymous', false),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
      Query.offset(offset)
    ])
    return (result?.rows || []) as Post[]
  }

  async getUserPublicPostsCount(userId: string): Promise<number> {
    const uid = String(userId || '').trim()
    if (!uid) return 0

    const result = (await tablesDB.listRows(
      MINDGUARD_DATABASE_ID,
      POSTS_TABLE_ID,
      [
        Query.equal('authorId', uid),
        Query.equal('status', 'published'),
        Query.equal('isAnonymous', false),
        Query.limit(1)
      ],
      true
    )) as { total?: number }
    return Number(result?.total || 0)
  }
}

const usersService = new UsersService()
export default usersService
