/**
 * 限流中间件
 */
import rateLimit from 'express-rate-limit'
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, RATE_LIMIT_AI_MAX } from '../config/index.js'

/**
 * 通用 API 限流
 */
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '请求过于频繁，请稍后重试' },
})

/**
 * AI / 计算密集型接口限流（更严格）
 */
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_AI_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI 接口请求过于频繁，请稍后重试' },
})

/**
 * 登录/注册接口限流
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '登录尝试过于频繁，请 15 分钟后重试' },
})
