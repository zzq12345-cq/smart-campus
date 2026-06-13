/**
 * 统一配置管理
 * 从环境变量读取所有配置项，提供类型安全的默认值
 */
import dotenv from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 加载 .env（先项目根目录，再 server 目录，后者优先）
dotenv.config({ path: resolve(__dirname, '../../.env') })
dotenv.config({ path: resolve(__dirname, '../.env') })

function env(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key]?.trim()
  return v ? parseInt(v, 10) : fallback
}

// ========== Server ==========
export const SERVER_PORT = envInt('PORT', envInt('PPT_SERVER_PORT', 3001))
export const NODE_ENV = env('NODE_ENV', 'development')
export const IS_PRODUCTION = NODE_ENV === 'production'

// ========== JWT ==========
export const JWT_SECRET = env('JWT_SECRET', 'unismart-dev-secret-change-in-production')
export const JWT_EXPIRES_IN = env('JWT_EXPIRES_IN', '7d')

// ========== CORS ==========
export const CORS_ORIGINS = env('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// ========== Appwrite ==========
export const APPWRITE_ENDPOINT = env('APPWRITE_ENDPOINT', env('VITE_APPWRITE_ENDPOINT', 'https://sgp.cloud.appwrite.io/v1'))
export const APPWRITE_PROJECT_ID = env('APPWRITE_PROJECT_ID', env('VITE_APPWRITE_PROJECT_ID', 'rainbowrain'))
export const APPWRITE_API_KEY = env('APPWRITE_API_KEY', '')

export const APPWRITE_DATABASE_ID = env('APPWRITE_DATABASE_ID', 'mindguard')

// Table IDs
export const USERS_TABLE_ID = env('USERS_TABLE_ID', 'users')
export const USER_SESSIONS_TABLE_ID = env('USER_SESSIONS_TABLE_ID', 'user_sessions')
export const POSTS_TABLE_ID = env('POSTS_TABLE_ID', 'posts')
export const COMMENTS_TABLE_ID = env('COMMENTS_TABLE_ID', 'comments')
export const POST_INTERACTIONS_TABLE_ID = env('POST_INTERACTIONS_TABLE_ID', 'post_interactions')
export const FOLLOWS_TABLE_ID = env('FOLLOWS_TABLE_ID', 'follows')
export const NOTIFICATIONS_TABLE_ID = env('NOTIFICATIONS_TABLE_ID', 'notifications')
export const CONVERSATIONS_TABLE_ID = env('CONVERSATIONS_TABLE_ID', 'conversations')
export const CONVERSATION_MEMBERS_TABLE_ID = env('CONVERSATION_MEMBERS_TABLE_ID', 'conversation_members')
export const MESSAGES_TABLE_ID = env('MESSAGES_TABLE_ID', 'messages')
export const CHECKINS_TABLE_ID = env('CHECKINS_TABLE_ID', 'checkins')
export const JOURNALS_TABLE_ID = env('JOURNALS_TABLE_ID', 'journals')
export const STUDY_CHECKINS_TABLE_ID = env('STUDY_CHECKINS_TABLE_ID', 'study_checkins')
export const STUDY_MATERIALS_TABLE_ID = env('STUDY_MATERIALS_TABLE_ID', 'study_materials')
export const EXAM_PLANS_TABLE_ID = env('EXAM_PLANS_TABLE_ID', 'exam_plans')
export const MARKET_ITEMS_TABLE_ID = env('MARKET_ITEMS_TABLE_ID', 'market_items')
export const EVENTS_TABLE_ID = env('EVENTS_TABLE_ID', 'events')
export const EVENT_REGISTRATIONS_TABLE_ID = env('EVENT_REGISTRATIONS_TABLE_ID', 'event_registrations')
export const JOB_LISTINGS_TABLE_ID = env('JOB_LISTINGS_TABLE_ID', 'job_listings')
export const VENUES_TABLE_ID = env('VENUES_TABLE_ID', 'venues')
export const POINT_BALANCES_TABLE_ID = env('POINT_BALANCES_TABLE_ID', 'point_balances')
export const POINT_TRANSACTIONS_TABLE_ID = env('POINT_TRANSACTIONS_TABLE_ID', 'point_transactions')

// ========== AI / PPT ==========
export const ZHIPU_API_KEY = env('ZHIPU_API_KEY', '')
export const ZHIPU_BASE_URL = env('ZHIPU_BASE_URL', 'https://open.bigmodel.cn/api/coding/paas/v4')
export const PPT_OUTLINE_MODEL = env('PPT_OUTLINE_MODEL', 'glm-5.1')
export const PPT_RENDER_MODEL = env('PPT_RENDER_MODEL', 'glm-5v-turbo')

export const AI_BASE_URL = env('AI_BASE_URL', env('VITE_AI_BASE_URL', ''))
export const AI_API_KEY = env('AI_API_KEY', env('VITE_AI_API_KEY', ''))
export const AI_MODEL = env('AI_MODEL', env('VITE_AI_MODEL', 'glm-5v-turbo'))
export const AI_TIMEOUT_MS = envInt('AI_TIMEOUT_MS', 30000)

// ========== Rate Limit ==========
export const RATE_LIMIT_WINDOW_MS = envInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000) // 15 min
export const RATE_LIMIT_MAX = envInt('RATE_LIMIT_MAX', 200)
export const RATE_LIMIT_AI_MAX = envInt('RATE_LIMIT_AI_MAX', 20) // AI 接口更严格
