/**
 * Interactions Routes — 点赞 / 收藏
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as interactionsService from '../services/interactions.service.js'

const router = Router()

// POST /api/posts/:postId/like — 切换点赞
router.post('/posts/:postId/like', requireAuth, async (req, res, next) => {
  try {
    const result = await interactionsService.toggleInteraction(req.userId!, req.params.postId as string, 'like')
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// POST /api/posts/:postId/collect — 切换收藏
router.post('/posts/:postId/collect', requireAuth, async (req, res, next) => {
  try {
    const result = await interactionsService.toggleInteraction(req.userId!, req.params.postId as string, 'collect')
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// GET /api/posts/:postId/interaction — 我的互动状态
router.get('/posts/:postId/interaction', requireAuth, async (req, res, next) => {
  try {
    const result = await interactionsService.getMyInteractions(req.userId!, req.params.postId as string)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// GET /api/collections — 我的收藏列表
router.get('/collections', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20)
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const result = await interactionsService.getMyCollections(req.userId!, limit, offset)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
