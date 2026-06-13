/**
 * Posts Routes — 帖子相关
 */
import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { validateBody, validateQuery } from '../middleware/validate.js'
import { createPostSchema, updatePostSchema, postListQuerySchema } from '../schemas/posts.schema.js'
import * as postsService from '../services/posts.service.js'

const router = Router()

// GET /api/posts — 公开帖子列表
router.get('/', validateQuery(postListQuerySchema), async (req, res, next) => {
  try {
    const result = await postsService.getPublicPosts(req.query as any)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// GET /api/posts/my — 我的帖子
router.get('/my', requireAuth, validateQuery(postListQuerySchema), async (req, res, next) => {
  try {
    const result = await postsService.getMyPosts(req.userId!, req.query as any)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// GET /api/posts/my/stats — 我的帖子统计
router.get('/my/stats', requireAuth, async (req, res, next) => {
  try {
    const stats = await postsService.getMyPostsStats(req.userId!)
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
})

// GET /api/posts/:id — 帖子详情
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const post = await postsService.getPostById(req.params.id as string, req.userId)
    res.json({ success: true, data: post })
  } catch (err) {
    next(err)
  }
})

// POST /api/posts — 创建帖子
router.post('/', requireAuth, validateBody(createPostSchema), async (req, res, next) => {
  try {
    const post = await postsService.createPost(req.userId!, req.body)
    res.status(201).json({ success: true, data: post })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/posts/:id — 更新帖子
router.patch('/:id', requireAuth, validateBody(updatePostSchema), async (req, res, next) => {
  try {
    const post = await postsService.updatePost(req.userId!, req.params.id as string, req.body)
    res.json({ success: true, data: post })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/posts/:id — 删除帖子
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await postsService.deletePost(req.userId!, req.params.id as string)
    res.json({ success: true, message: '帖子已删除' })
  } catch (err) {
    next(err)
  }
})

export default router
