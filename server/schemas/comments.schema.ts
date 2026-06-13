/**
 * Comments 请求校验 Schema
 */
import { z } from 'zod'

export const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(2000),
  parentId: z.string().optional(),
  replyToUserId: z.string().optional(),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})
