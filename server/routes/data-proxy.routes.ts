/**
 * 通用数据代理路由
 * 为尚未拥有独立 API 的前端服务提供统一的数据操作接口
 * 后续逐步拆分为独立路由
 *
 * 安全措施：
 * 1. 所有操作需要认证
 * 2. 白名单限制可访问的 collection
 * 3. 写操作校验文档归属权
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../services/appwrite.service.js'
import {
  USER_SESSIONS_TABLE_ID,
  CHECKINS_TABLE_ID,
  JOURNALS_TABLE_ID,
  STUDY_CHECKINS_TABLE_ID,
  STUDY_MATERIALS_TABLE_ID,
  EXAM_PLANS_TABLE_ID,
  EVENTS_TABLE_ID,
  EVENT_REGISTRATIONS_TABLE_ID,
  MARKET_ITEMS_TABLE_ID,
  JOB_LISTINGS_TABLE_ID,
  VENUES_TABLE_ID,
  POINT_BALANCES_TABLE_ID,
  POINT_TRANSACTIONS_TABLE_ID,
  FOLLOWS_TABLE_ID,
  NOTIFICATIONS_TABLE_ID,
  CONVERSATIONS_TABLE_ID,
  CONVERSATION_MEMBERS_TABLE_ID,
  MESSAGES_TABLE_ID,
} from '../config/index.js'

const router = Router()

// ========== 安全：Collection 白名单 ==========
// 只允许前端通过代理访问的 collection
const ALLOWED_COLLECTIONS = new Set([
  USER_SESSIONS_TABLE_ID,
  CHECKINS_TABLE_ID,
  JOURNALS_TABLE_ID,
  STUDY_CHECKINS_TABLE_ID,
  STUDY_MATERIALS_TABLE_ID,
  EXAM_PLANS_TABLE_ID,
  EVENTS_TABLE_ID,
  EVENT_REGISTRATIONS_TABLE_ID,
  MARKET_ITEMS_TABLE_ID,
  JOB_LISTINGS_TABLE_ID,
  VENUES_TABLE_ID,
  POINT_BALANCES_TABLE_ID,
  POINT_TRANSACTIONS_TABLE_ID,
  FOLLOWS_TABLE_ID,
  NOTIFICATIONS_TABLE_ID,
  CONVERSATIONS_TABLE_ID,
  CONVERSATION_MEMBERS_TABLE_ID,
  MESSAGES_TABLE_ID,
])

// 拥有 userId 字段的 collection（用于行级权限校验）
const USER_OWNED_COLLECTIONS = new Set([
  USER_SESSIONS_TABLE_ID,
  CHECKINS_TABLE_ID,
  JOURNALS_TABLE_ID,
  STUDY_CHECKINS_TABLE_ID,
  STUDY_MATERIALS_TABLE_ID,
  EXAM_PLANS_TABLE_ID,
  POINT_BALANCES_TABLE_ID,
  POINT_TRANSACTIONS_TABLE_ID,
  FOLLOWS_TABLE_ID,
])

function isCollectionAllowed(collectionId: string): boolean {
  return ALLOWED_COLLECTIONS.has(collectionId)
}

/**
 * 校验文档归属权（写操作）
 * 对于 USER_OWNED_COLLECTIONS 中的 collection，确保文档属于当前用户
 */
async function verifyOwnership(
  collectionId: string,
  documentId: string,
  userId: string,
  databaseId?: string
): Promise<boolean> {
  if (!USER_OWNED_COLLECTIONS.has(collectionId)) {
    // 不在所有权校验列表中的 collection，允许通过（如公共活动等）
    return true
  }

  try {
    const doc = await getDocument(collectionId, documentId, databaseId)
    return (doc as any)?.userId === userId
  } catch {
    return false
  }
}

// POST /api/data/list — 列表查询
router.post('/list', requireAuth, async (req, res, next) => {
  try {
    const { collectionId, queries, databaseId } = req.body
    if (!collectionId) {
      res.status(400).json({ success: false, error: '缺少 collectionId' })
      return
    }
    if (!isCollectionAllowed(collectionId)) {
      res.status(403).json({ success: false, error: '无权访问该数据集合' })
      return
    }
    const result = await listDocuments(collectionId, queries || [], databaseId)
    res.json({ success: true, data: { rows: result.documents, total: result.total } })
  } catch (err) {
    next(err)
  }
})

// POST /api/data/get — 获取单个文档
router.post('/get', requireAuth, async (req, res, next) => {
  try {
    const { collectionId, documentId, databaseId } = req.body
    if (!collectionId || !documentId) {
      res.status(400).json({ success: false, error: '缺少 collectionId 或 documentId' })
      return
    }
    if (!isCollectionAllowed(collectionId)) {
      res.status(403).json({ success: false, error: '无权访问该数据集合' })
      return
    }
    const doc = await getDocument(collectionId, documentId, databaseId)
    res.json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
})

// POST /api/data/create — 创建文档
router.post('/create', requireAuth, async (req, res, next) => {
  try {
    const { collectionId, data, documentId, permissions, databaseId } = req.body
    if (!collectionId || !data) {
      res.status(400).json({ success: false, error: '缺少 collectionId 或 data' })
      return
    }
    if (!isCollectionAllowed(collectionId)) {
      res.status(403).json({ success: false, error: '无权访问该数据集合' })
      return
    }
    const doc = await createDocument(collectionId, data, documentId, permissions, databaseId)
    res.json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
})

// POST /api/data/update — 更新文档
router.post('/update', requireAuth, async (req, res, next) => {
  try {
    const { collectionId, documentId, data, permissions, databaseId } = req.body
    if (!collectionId || !documentId) {
      res.status(400).json({ success: false, error: '缺少 collectionId 或 documentId' })
      return
    }
    if (!isCollectionAllowed(collectionId)) {
      res.status(403).json({ success: false, error: '无权访问该数据集合' })
      return
    }
    // 行级权限校验
    const isOwner = await verifyOwnership(collectionId, documentId, req.userId!, databaseId)
    if (!isOwner) {
      res.status(403).json({ success: false, error: '无权修改该文档' })
      return
    }
    const doc = await updateDocument(collectionId, documentId, data || {}, permissions, databaseId)
    res.json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
})

// POST /api/data/delete — 删除文档
router.post('/delete', requireAuth, async (req, res, next) => {
  try {
    const { collectionId, documentId, databaseId } = req.body
    if (!collectionId || !documentId) {
      res.status(400).json({ success: false, error: '缺少 collectionId 或 documentId' })
      return
    }
    if (!isCollectionAllowed(collectionId)) {
      res.status(403).json({ success: false, error: '无权访问该数据集合' })
      return
    }
    // 行级权限校验
    const isOwner = await verifyOwnership(collectionId, documentId, req.userId!, databaseId)
    if (!isOwner) {
      res.status(403).json({ success: false, error: '无权删除该文档' })
      return
    }
    await deleteDocument(collectionId, documentId, databaseId)
    res.json({ success: true, message: '已删除' })
  } catch (err) {
    next(err)
  }
})

export default router
