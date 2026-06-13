import type { JwtPayload } from './index.js'

declare global {
  namespace Express {
    interface Request {
      /** 鉴权中间件注入的用户 ID */
      userId?: string
      /** 鉴权中间件注入的 JWT payload */
      jwtPayload?: JwtPayload
    }
  }
}

export {}
