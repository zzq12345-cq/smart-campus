/**
 * Express 应用配置
 * 挂载所有中间件和路由
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { CORS_ORIGINS, IS_PRODUCTION } from './config/index.js'
import { generalLimiter } from './middleware/rate-limit.js'
import { requestLogger } from './middleware/logger.js'
import { notFoundHandler, errorHandler } from './middleware/error-handler.js'
import apiRoutes from './routes/index.js'

const app = express()

// ========== 安全中间件 ==========
app.use(helmet())

// ========== CORS ==========
app.use(
  cors({
    origin: IS_PRODUCTION ? CORS_ORIGINS : true, // 开发环境允许所有来源
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// ========== Body 解析 ==========
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ========== 日志 ==========
app.use(requestLogger)

// ========== 全局限流 ==========
app.use('/api', generalLimiter)

// ========== API 路由 ==========
app.use('/api', apiRoutes)

// ========== 404 ==========
app.use(notFoundHandler)

// ========== 错误处理 ==========
app.use(errorHandler)

export default app
