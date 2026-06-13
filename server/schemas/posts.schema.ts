/**
 * Posts 请求校验 Schema
 */
import { z } from 'zod'

const sectionEnum = z.enum(['study', 'life', 'psychology']).default('psychology')
const moodEnum = z.enum(['happy', 'calm', 'anxious', 'sad', 'angry']).default('calm')
const statusEnum = z.enum(['published', 'draft']).default('published')

export const createPostSchema = z.object({
  content: z.string().min(1, '内容不能为空').max(10000),
  section: sectionEnum.optional(),
  topic: z.string().max(50).default('daily').optional(),
  mood: moodEnum.optional(),
  isAnonymous: z.boolean().default(true).optional(),
  riskLevel: z.number().int().min(1).max(3).default(1).optional(),
  status: statusEnum.optional(),
  images: z.array(z.string()).max(9).default([]).optional(),
})

export const updatePostSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  section: sectionEnum.optional(),
  topic: z.string().max(50).optional(),
  mood: moodEnum.optional(),
  isAnonymous: z.boolean().optional(),
  riskLevel: z.number().int().min(1).max(3).optional(),
  status: statusEnum.optional(),
  images: z.array(z.string()).max(9).optional(),
})

export const postListQuerySchema = z.object({
  section: z.enum(['study', 'life', 'psychology', 'all']).optional(),
  topic: z.string().optional(),
  status: z.string().optional(),
  keyword: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
})
