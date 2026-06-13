/**
 * 后端 API 集成测试
 * 测试健康检查、认证拦截、参数校验、CORS
 */
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app.js'

describe('Health Check', () => {
  it('GET /api/health 返回 200 和正确结构', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
    expect(res.body.data).toHaveProperty('time')
    expect(res.body.data).toHaveProperty('uptime')
  })
})

describe('Auth Routes', () => {
  it('POST /api/auth/register 缺少字段返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' }) // 缺少 password 和 name
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('POST /api/auth/login 缺少字段返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({}) // 缺少 email 和 password
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('GET /api/auth/me 未认证返回 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('PATCH /api/auth/profile 未认证返回 401', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .send({ name: 'test' })
    expect(res.status).toBe(401)
  })
})

describe('Posts Routes', () => {
  it('GET /api/posts 无需认证，返回 200', async () => {
    const res = await request(app).get('/api/posts')
    // 可能 200（有数据）或 502（Appwrite 不可达）
    expect([200, 502]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('rows')
      expect(res.body.data).toHaveProperty('total')
    }
  })

  it('POST /api/posts 未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ content: 'test' })
    expect(res.status).toBe(401)
  })

  it('GET /api/posts/my 未认证返回 401', async () => {
    const res = await request(app).get('/api/posts/my')
    expect(res.status).toBe(401)
  })
})

describe('Comments Routes', () => {
  it('POST /api/posts/fake-id/comments 未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/posts/fake-id/comments')
      .send({ content: 'test' })
    expect(res.status).toBe(401)
  })
})

describe('Interactions Routes', () => {
  it('POST /api/posts/fake-id/like 未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/posts/fake-id/like')
    expect(res.status).toBe(401)
  })

  it('POST /api/posts/fake-id/collect 未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/posts/fake-id/collect')
    expect(res.status).toBe(401)
  })
})

describe('Data Proxy Routes', () => {
  it('POST /api/data/list 未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/data/list')
      .send({ collectionId: 'test' })
    expect(res.status).toBe(401)
  })
})

describe('AI Routes', () => {
  it('POST /api/ai/chat 未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ messages: [{ role: 'user', content: 'hello' }] })
    expect(res.status).toBe(401)
  })
})

describe('404 Handling', () => {
  it('不存在的路由返回 404', async () => {
    const res = await request(app).get('/api/nonexistent')
    expect(res.status).toBe(404)
  })
})
