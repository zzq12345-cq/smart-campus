/**
 * AI Chat Service — 走后端 API
 * 不再暴露 AI API Key 到前端
 */
import { apiPost, getToken } from '@/utils/api-client'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiChatConfig {
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs: number
}

export interface SendMessageOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

export interface SendMessageResult {
  success: boolean
  content?: string
  error?: string
}

class AiChatService {
  /**
   * 非流式聊天 — 走后端 /api/ai/chat
   */
  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const data = await apiPost<{ content: string }>('/api/ai/chat', {
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 1000,
      })

      if (!data.content) {
        return { success: false, error: 'Empty response from AI' }
      }

      return { success: true, content: data.content }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'AI request failed',
      }
    }
  }

  /**
   * SSE 流式聊天 — 走后端 /api/ai/chat/stream
   */
  async sendMessageStream(
    options: SendMessageOptions,
    onToken: (token: string, fullContent: string, isReasoning?: boolean) => void,
    onDone: (fullContent: string, reasoning?: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = getToken()
    const apiBase = (import.meta as any).env?.VITE_API_URL || ''
    const url = `${apiBase}/api/ai/chat/stream`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          maxTokens: options.maxTokens ?? 4000,
        }),
      })

      if (!response.ok) {
        let errMsg = response.statusText
        try {
          const errPayload = await response.json()
          errMsg = (errPayload as any)?.error || errMsg
        } catch {}
        onError(errMsg || 'AI request failed')
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        onError('Stream not supported')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let fullReasoning = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()

          if (data === '[DONE]') {
            onDone(fullContent, fullReasoning || undefined)
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta
            if (!delta) continue
            const contentDelta = delta?.content
            const reasoningDelta = delta?.reasoning_content

            if (typeof contentDelta === 'string' && contentDelta) {
              fullContent += contentDelta
              onToken(contentDelta, fullContent, false)
            } else if (typeof reasoningDelta === 'string' && reasoningDelta) {
              fullReasoning += reasoningDelta
              onToken(reasoningDelta, fullReasoning, true)
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // stream 结束但未收到 [DONE]
      onDone(fullContent, fullReasoning || undefined)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onError('AI request timed out. Please try again.')
      } else {
        onError((error as Error)?.message || 'AI request failed')
      }
    }
  }

  /**
   * 检查 AI 服务是否可用（只要登录了就算可用，后端负责配置）
   */
  isConfigured(): boolean {
    return Boolean(getToken())
  }
}

const aiChatService = new AiChatService()
export default aiChatService
