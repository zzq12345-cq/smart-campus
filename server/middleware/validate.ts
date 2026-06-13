/**
 * Zod 请求校验中间件
 */
import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

/**
 * 校验 req.body
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      res.status(400).json({ success: false, error: '参数校验失败', details: errors })
      return
    }
    req.body = result.data
    next()
  }
}

/**
 * 校验 req.query
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      res.status(400).json({ success: false, error: '查询参数校验失败', details: errors })
      return
    }
    req.query = result.data as any
    next()
  }
}
