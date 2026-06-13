/**
 * Auth Routes — 认证相关
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rate-limit.js'
import { validateBody } from '../middleware/validate.js'
import { registerSchema, loginSchema, updateProfileSchema, resetPasswordSchema } from '../schemas/auth.schema.js'
import * as authService from '../services/auth.service.js'

const router = Router()

// POST /api/auth/register
router.post('/register', authLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body
    const result = await authService.register(email, password, name)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/logout
router.post('/logout', requireAuth, (_req, res) => {
  // JWT 是无状态的，客户端删除 token 即可
  res.json({ success: true, message: '已登出' })
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.userId!)
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.userId!, req.body)
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.email)
    res.json({ success: true, message: '如果该邮箱已注册，将收到密码重置邮件' })
  } catch (err) {
    next(err)
  }
})

export default router
