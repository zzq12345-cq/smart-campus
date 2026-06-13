/**
 * Users Routes — 用户公开资料
 */
import { Router } from 'express'
import * as usersService from '../services/users.service.js'

const router = Router()

// GET /api/users/:id/profile — 用户公开资料
router.get('/:id/profile', async (req, res, next) => {
  try {
    const profile = await usersService.getUserProfile(req.params.id)
    res.json({ success: true, data: profile })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/:id/posts — 用户公开帖子
router.get('/:id/posts', async (req, res, next) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20)
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const result = await usersService.getUserPosts(req.params.id, limit, offset)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
