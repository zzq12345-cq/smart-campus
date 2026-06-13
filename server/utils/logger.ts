/**
 * 结构化日志器
 * 使用 pino 替代 console.log，生产环境输出 JSON，开发环境使用 pino-pretty
 */
import pino from 'pino'
import { IS_PRODUCTION } from '../config/index.js'

export const logger = pino({
  level: IS_PRODUCTION ? 'info' : 'debug',
  ...(IS_PRODUCTION
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
})

export default logger
