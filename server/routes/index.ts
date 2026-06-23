/**
 * 路由聚合
 */
import { Router } from 'express'
import authRoutes from './auth.routes.js'
import postsRoutes from './posts.routes.js'
import commentsRoutes from './comments.routes.js'
import interactionsRoutes from './interactions.routes.js'
import usersRoutes from './users.routes.js'
import pptRoutes from './ppt.routes.js'
import aiRoutes from './ai.routes.js'
const router = Router()

// 健康检查
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      time: new Date().toISOString(),
      uptime: process.uptime(),
    },
  })
})

// 认证
router.use('/auth', authRoutes)

// 帖子
router.use('/posts', postsRoutes)

// 评论 — 挂在根级（因为有 /posts/:postId/comments 和 /comments/:id 两种路径）
router.use('/', commentsRoutes)

// 互动 — 挂在根级（同上）
router.use('/', interactionsRoutes)

// 用户
router.use('/users', usersRoutes)

// PPT
router.use('/ppt', pptRoutes)

// AI 聊天
router.use('/ai', aiRoutes)

export default router
