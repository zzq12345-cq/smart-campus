/**
 * UniSmart 统一后端服务入口
 */
import app from './app.js'
import { SERVER_PORT, NODE_ENV, APPWRITE_ENDPOINT, APPWRITE_API_KEY } from './config/index.js'
import logger from './utils/logger.js'

app.listen(SERVER_PORT, () => {
  logger.info(`
🚀 UniSmart Server running at http://localhost:${SERVER_PORT}
   Environment: ${NODE_ENV}
   Appwrite: ${APPWRITE_ENDPOINT}
   API Key: ${APPWRITE_API_KEY ? '✅ configured' : '⚠️  not set'}

   API Routes:
   ├─ GET  /api/health
   ├─ POST /api/auth/register
   ├─ POST /api/auth/login
   ├─ POST /api/auth/logout
   ├─ GET  /api/auth/me
   ├─ PATCH /api/auth/profile
   ├─ GET  /api/posts
   ├─ POST /api/posts
   ├─ GET  /api/posts/:id
   ├─ PATCH /api/posts/:id
   ├─ DELETE /api/posts/:id
   ├─ GET  /api/posts/my
   ├─ GET  /api/posts/my/stats
   ├─ GET  /api/posts/:postId/comments
   ├─ POST /api/posts/:postId/comments
   ├─ PATCH /api/comments/:id
   ├─ DELETE /api/comments/:id
   ├─ POST /api/posts/:postId/like
   ├─ POST /api/posts/:postId/collect
   ├─ GET  /api/posts/:postId/interaction
   ├─ GET  /api/collections
   ├─ GET  /api/users/:id/profile
   ├─ GET  /api/users/:id/posts
   └─ POST /api/ppt/generate
  `)
})
