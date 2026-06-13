export interface Follow {
  $id: string
  followerId: string
  followingId: string
  $createdAt: string
  $updatedAt?: string
  $permissions?: string[]
}

export interface UserProfile {
  $id: string
  name: string
  avatar?: string | null
  bio?: string
  school?: string
  level?: number
  followersCount?: number
  followingCount?: number
  postsCount?: number
  isFollowing?: boolean
}
