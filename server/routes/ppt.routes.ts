/**
 * PPT Routes — PPT 生成（从原 index.ts 迁移）
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rate-limit.js'
import { generatePptSlides } from '../utils/ppt/orchestrator.js'

const router = Router()

// POST /api/ppt/generate
router.post('/generate', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const { topic, pageCount, style, focus, subject } = req.body || {}

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      res.status(400).json({ success: false, error: '请输入 PPT 主题' })
      return
    }

    const intent = {
      topic: topic.trim().slice(0, 500),
      pageCount: Math.min(20, Math.max(6, Number(pageCount) || 10)),
      style: style || 'formal',
      focus: focus || '',
      subject: subject || '',
    }

    console.log(`[PPT] 生成请求: "${intent.topic}" (${intent.pageCount}页) [user:${req.userId}]`)
    const result = await generatePptSlides(intent)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
