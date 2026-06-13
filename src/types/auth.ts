export interface AuthUser {
  $id: string
  email: string
  name: string
  status?: boolean
  labels?: string[]
  [key: string]: unknown
}

export interface DbUser {
  $id: string
  userId?: string
  email: string
  name: string
  avatar?: string | null
  bio?: string
  school?: string
  /** 教师主教科目（chinese / math / english / politics） */
  teacherSubject?: string
  level?: number
  streakDays?: number
  totalCheckins?: number
  totalTasks?: number
  followersCount?: number
  followingCount?: number
  privacySettings?: string
  notificationSettings?: string
  $permissions?: string[]
  [key: string]: unknown
}

export interface Session {
  $id: string
  userId?: string
  expire?: string
  expiresAt?: string
  ip?: string
  countryCode?: string
  countryName?: string
  [key: string]: unknown
}

export interface LoginResult {
  session: Session
  user: AuthUser
  dbUser: DbUser
}

export interface RegisterResult {
  session: Session
  user: AuthUser
  dbUser: DbUser
}

export interface ProfileUpdateInput {
  name?: string
  avatar?: string | null
  bio?: string
  school?: string
  /** 教师主教科目 */
  teacherSubject?: string
}

export interface DeviceInfoSnapshot {
  platform?: string
  uniPlatform?: string
  brand?: string
  model?: string
  system?: string
  appVersion?: string
}

