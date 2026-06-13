/**
 * 全局错误处理中间件
 */
import type { Request, Response, NextFunction } from 'express'
import { IS_PRODUCTION } from '../config/index.js'
import logger from '../utils/logger.js'

export interface AppError extends Error {
  statusCode?: number
  code?: number | string
}

/**
 * 404 处理 — 未匹配到任何路由
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `路由不存在: ${req.method} ${req.originalUrl}`,
  })
}

/**
 * 全局错误处理
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || (typeof err.code === 'number' ? err.code : 500)
  const safeStatus = statusCode >= 100 && statusCode < 600 ? statusCode : 500

  logger.error({ statusCode: safeStatus, err }, err.message)

  res.status(safeStatus).json({
    success: false,
    error: err.message || '服务器内部错误',
    ...(IS_PRODUCTION ? {} : { stack: err.stack }),
  })
}

