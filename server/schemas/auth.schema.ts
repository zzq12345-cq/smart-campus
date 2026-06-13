/**
 * Auth 请求校验 Schema
 */
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少 8 位').max(128),
  name: z.string().min(1, '请输入用户名').max(50).trim(),
})

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  avatar: z.string().url().nullable().optional(),
  bio: z.string().max(500).trim().optional(),
  school: z.string().max(100).trim().optional(),
  teacherSubject: z.string().max(100).trim().optional(),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
})
