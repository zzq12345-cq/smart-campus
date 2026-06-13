/**
 * JWT 鉴权中间件
 * 验证 Authorization: Bearer <token> 头
 */
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/index.js'
import type { JwtPayload } from '../types/index.js'

/**
 * 必须登录 — 无有效 token 则 401
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ success: false, error: '请先登录' })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.userId = payload.userId
    req.jwtPayload = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Token 无效或已过期' })
  }
}

/**
 * 可选登录 — 有 token 则解析注入，无 token 也放行
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) {
    next()
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.userId = payload.userId
    req.jwtPayload = payload
  } catch {
    // token 无效时不阻止请求，只是不注入用户信息
  }
  next()
}

/**
 * 签发 JWT
 */
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || null
  }
  return null
}
