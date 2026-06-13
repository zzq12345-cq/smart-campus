/**
 * 请求日志中间件
 * 使用 pino 结构化日志替代 console.log
 */
import type { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger.js'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    const userId = req.userId ? req.userId.slice(0, 8) + '...' : undefined

    const logData = {
      method: req.method,
      url: req.originalUrl,
      status,
      duration,
      ...(userId ? { userId } : {}),
    }

    if (status >= 500) {
      logger.error(logData, `${req.method} ${req.originalUrl} → ${status}`)
    } else if (status >= 400) {
      logger.warn(logData, `${req.method} ${req.originalUrl} → ${status}`)
    } else {
      logger.info(logData, `${req.method} ${req.originalUrl} → ${status}`)
    }
  })

  next()
}
