/**
 * Comments Routes — 评论相关
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createCommentSchema, updateCommentSchema } from '../schemas/comments.schema.js'
import * as commentsService from '../services/comments.service.js'

const router = Router()

// GET /api/posts/:postId/comments — 帖子评论列表
router.get('/posts/:postId/comments', async (req, res, next) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 50)
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const result = await commentsService.getCommentsByPostId(req.params.postId as string, limit, offset)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// POST /api/posts/:postId/comments — 发表评论
router.post('/posts/:postId/comments', requireAuth, validateBody(createCommentSchema), async (req, res, next) => {
  try {
    const comment = await commentsService.createComment(req.userId!, req.params.postId as string, req.body)
    res.status(201).json({ success: true, data: comment })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/comments/:id — 编辑评论
router.patch('/comments/:id', requireAuth, validateBody(updateCommentSchema), async (req, res, next) => {
  try {
    const comment = await commentsService.updateComment(req.userId!, req.params.id as string, req.body.content)
    res.json({ success: true, data: comment })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/comments/:id — 删除评论
router.delete('/comments/:id', requireAuth, async (req, res, next) => {
  try {
    await commentsService.deleteComment(req.userId!, req.params.id as string)
    res.json({ success: true, message: '评论已删除' })
  } catch (err) {
    next(err)
  }
})

export default router
