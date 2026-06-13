/**
 * AI Chat Routes — AI 聊天代理
 * 前端不再直接暴露 AI API Key
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rate-limit.js'
import {
  AI_BASE_URL,
  AI_API_KEY,
  AI_MODEL,
  AI_TIMEOUT_MS,
} from '../config/index.js'

const router = Router()

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// POST /api/ai/chat — 发送聊天请求
router.post('/chat', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const { messages, temperature, maxTokens } = req.body as {
      messages: ChatMessage[]
      temperature?: number
      maxTokens?: number
    }

    if (!messages?.length) {
      res.status(400).json({ success: false, error: '消息列表不能为空' })
      return
    }

    if (!AI_BASE_URL || !AI_API_KEY) {
      res.status(503).json({ success: false, error: 'AI 服务未配置' })
      return
    }

    const url = AI_BASE_URL.replace(/\/+$/, '') + '/chat/completions'

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 1024,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errText = await response.text()
        console.error('[AI] 请求失败:', response.status, errText)
        res.status(502).json({ success: false, error: 'AI 服务暂时不可用' })
        return
      }

      const data = await response.json() as {
        choices?: { message?: { content?: string } }[]
      }
      const content = data?.choices?.[0]?.message?.content || ''

      res.json({ success: true, data: { content } })
    } catch (err: any) {
      clearTimeout(timeout)
      if (err?.name === 'AbortError') {
        res.status(504).json({ success: false, error: 'AI 请求超时' })
        return
      }
      throw err
    }
  } catch (err) {
    next(err)
  }
})

// POST /api/ai/chat/stream — 流式聊天（SSE）
router.post('/chat/stream', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const { messages, temperature, maxTokens } = req.body as {
      messages: ChatMessage[]
      temperature?: number
      maxTokens?: number
    }

    if (!messages?.length) {
      res.status(400).json({ success: false, error: '消息列表不能为空' })
      return
    }

    if (!AI_BASE_URL || !AI_API_KEY) {
      res.status(503).json({ success: false, error: 'AI 服务未配置' })
      return
    }

    const url = AI_BASE_URL.replace(/\/+$/, '') + '/chat/completions'

    // 超时控制
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

    // 客户端断开时中断上游请求
    let clientDisconnected = false
    req.on('close', () => {
      clientDisconnected = true
      controller.abort()
    })

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 1024,
          stream: true,
        }),
        signal: controller.signal,
      })
    } catch (fetchErr: any) {
      clearTimeout(timeout)
      if (fetchErr?.name === 'AbortError') {
        if (clientDisconnected) return // 客户端已断开，无需响应
        res.status(504).json({ success: false, error: 'AI 请求超时' })
        return
      }
      throw fetchErr
    }

    if (!response.ok || !response.body) {
      clearTimeout(timeout)
      res.status(502).json({ success: false, error: 'AI 服务暂时不可用' })
      return
    }

    // 转发 SSE 流
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done || clientDisconnected) break
        const chunk = decoder.decode(value, { stream: true })
        res.write(chunk)
      }
    } catch {
      // 上游流异常或 abort
    } finally {
      clearTimeout(timeout)
      try { reader.cancel() } catch {}
      res.end()
    }
  } catch (err) {
    next(err)
  }
})

export default router
