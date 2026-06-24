<template>
  <view :class="['ppt-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <view class="topbar-center">
        <Icon name="slideshow" :size="20" :color="subjectColor" />
        <text class="title">{{ isZh ? 'AI 课件生成' : 'AI Slides' }}</text>
      </view>
      <view class="icon-btn" @tap="startNewChat">
        <Icon name="add" :size="20" :color="iconColor" />
      </view>
    </view>

    <!-- 聊天消息区 -->
    <scroll-view
      class="chat-area"
      scroll-y
      :scroll-into-view="scrollAnchor"
      :scroll-with-animation="true"
    >
      <view v-for="msg in messages" :key="msg.id" :class="['msg-row', msg.role]">
        <view :class="['msg-avatar', msg.role]">
          <text v-if="msg.role === 'assistant'" class="avatar-emoji">🎨</text>
          <text v-else class="avatar-text">{{ userInitial }}</text>
        </view>
        <view class="msg-body">
          <view :class="['msg-bubble', msg.role]">
            <text v-if="msg.role === 'user'" class="msg-text user-text">{{ msg.content }}</text>
            <template v-else>
              <!-- 思考过程（流式中显示，完成后折叠） -->
              <view
                v-if="msg.reasoning"
                :class="['thinking-block', { collapsed: !msg.isThinking && msg.content }]"
              >
                <view class="thinking-header" @tap="toggleThinking(msg)">
                  <text class="thinking-icon">{{ msg.isThinking ? '💭' : '🧠' }}</text>
                  <text class="thinking-label">
                    {{
                      msg.isThinking
                        ? isZh
                          ? '思考中...'
                          : 'Thinking...'
                        : isZh
                          ? '思考过程'
                          : 'Thought Process'
                    }}
                  </text>
                  <text v-if="!msg.isThinking" class="thinking-toggle">{{
                    msg.thinkingExpanded ? '▲' : '▼'
                  }}</text>
                </view>
                <view v-if="msg.isThinking || msg.thinkingExpanded" class="thinking-content">
                  <text class="thinking-text">{{ msg.reasoning }}</text>
                </view>
              </view>
              <!-- 正式回复 -->
              <MarkdownText
                v-if="msg.content"
                :content="msg.content"
                :theme="uiPreferencesStore.theme"
              />
              <view v-else-if="msg.isStreaming && !msg.reasoning" class="typing-indicator">
                <view class="typing-dots">
                  <view class="dot" /><view class="dot" /><view class="dot" />
                </view>
                <text class="typing-text">{{ isZh ? '正在思考...' : 'Thinking...' }}</text>
              </view>
            </template>
          </view>

          <!-- 快捷回复按钮 -->
          <view v-if="msg.quickReplies && msg.quickReplies.length" class="quick-replies">
            <view
              v-for="(qr, qi) in msg.quickReplies"
              :key="qi"
              class="quick-reply-btn"
              :style="{ borderColor: subjectColor }"
              @tap="sendMessage(qr)"
            >
              <text :style="{ color: subjectColor }">{{ qr }}</text>
            </view>
          </view>

          <!-- PPT 结果操作 -->
          <view v-if="msg.pptData" class="ppt-result">
            <view class="ppt-result-card" :style="{ borderColor: subjectColor }">
              <Icon name="check_circle" :size="28" :color="subjectColor" />
              <view class="ppt-result-info">
                <text class="ppt-result-title">{{ msg.pptData.title }}</text>
                <text class="ppt-result-desc"
                  >{{ msg.pptData.slides.length
                  }}{{ isZh ? '页课件已就绪' : ' slides ready' }}</text
                >
              </view>
            </view>
            <view class="ppt-actions">
              <view
                class="ppt-action-btn primary"
                :style="{ background: subjectColor }"
                @tap="openSvgPreview(msg.pptData)"
              >
                <Icon name="slideshow" :size="16" color="#fff" />
                <text style="color: #fff; font-size: 24rpx; font-weight: 600">{{
                  isZh ? '预览幻灯片' : 'Preview'
                }}</text>
              </view>
              <view class="ppt-action-btn outline" @tap="downloadPptx(msg.pptData)">
                <Icon name="download" :size="16" :color="subjectColor" />
                <text :style="{ color: subjectColor, fontSize: '24rpx', fontWeight: '600' }">{{
                  isZh ? '下载 PPTX' : 'Download'
                }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 生成进度条 -->
      <view v-if="pptGenerating" class="progress-bar-wrap">
        <view class="progress-info">
          <text class="progress-text">{{ pptStage }}</text>
          <text class="progress-pct">{{ Math.round(pptProgress) }}%</text>
        </view>
        <view class="progress-track">
          <view
            class="progress-fill"
            :style="{ width: `${pptProgress}%`, background: subjectColor }"
          />
        </view>
      </view>

      <view :id="scrollAnchor" style="height: 1px" />
    </scroll-view>

    <!-- 输入栏 -->
    <view class="chat-input-bar">
      <view class="input-wrapper">
        <textarea
          v-model="chatInput"
          class="chat-textarea"
          :placeholder="inputPlaceholder"
          placeholder-class="chat-placeholder"
          :maxlength="2000"
          auto-height
          :disabled="isStreaming"
          @confirm="sendMessage()"
        />
        <view
          :class="['send-btn', { disabled: isStreaming || !chatInput.trim() }]"
          :style="{ background: subjectColor }"
          @tap="sendMessage()"
        >
          <Icon name="send" :size="18" color="#ffffff" />
        </view>
      </view>
      <text class="input-tip">{{
        isZh ? '告诉我你想做什么课件，我会引导你完善需求' : 'Tell me what slides you need'
      }}</text>
    </view>

    <!-- 大纲弹窗 -->
    <view v-if="outlineModal" class="modal-mask" @tap="outlineModal = null">
      <view class="modal-card" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isZh ? '课件大纲' : 'Outline' }}</text>
          <view class="icon-btn" @tap="outlineModal = null">
            <Icon name="close" :size="20" :color="iconColor" />
          </view>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view v-for="(slide, i) in outlineModal.slides" :key="i" class="outline-item">
            <view class="outline-num" :style="{ background: subjectColor }">
              <text>{{ i + 1 }}</text>
            </view>
            <view class="outline-text">
              <text class="outline-slide-title">{{ slide.title }}</text>
              <text v-if="slide.bullets && slide.bullets.length" class="outline-slide-desc">{{
                slide.bullets.join(' · ')
              }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- SVG 幻灯片预览弹窗 -->
    <view v-if="svgPreview" class="modal-mask svg-preview-mask">
      <view class="svg-preview-panel" @tap.stop>
        <view class="svg-preview-topbar">
          <text class="svg-preview-title">{{ svgPreview.title }}</text>
          <view class="icon-btn" @tap="svgPreview = null">
            <Icon name="close" :size="20" color="#fff" />
          </view>
        </view>
        <!-- 主幻灯片 -->
        <view class="svg-slide-main">
          <view
            class="svg-slide-content"
            v-html="sanitizeSvg(svgPreview.slides[currentSlideIdx]?.svg || '')"
          />
        </view>
        <!-- 底部导航 -->
        <view class="svg-slide-nav">
          <view class="nav-btn" :class="{ disabled: currentSlideIdx <= 0 }" @tap="prevSlide"
            ><text>◀</text></view
          >
          <text class="slide-counter"
            >{{ currentSlideIdx + 1 }} / {{ svgPreview.slides.length }}</text
          >
          <view
            class="nav-btn"
            :class="{ disabled: currentSlideIdx >= svgPreview.slides.length - 1 }"
            @tap="nextSlide"
            ><text>▶</text></view
          >
        </view>
        <!-- 缩略图 -->
        <scroll-view class="svg-thumbs" scroll-x>
          <view
            v-for="(slide, i) in svgPreview.slides"
            :key="i"
            :class="['thumb-item', { active: i === currentSlideIdx }]"
            @tap="currentSlideIdx = i"
          >
            <view class="thumb-svg" v-html="sanitizeSvg(slide.svg || '')" />
            <text class="thumb-label">{{ i + 1 }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { getSubjectConfig, SUBJECT_LIST } from '@/teacher/types/subjects'
import aiChatService from '@/services/ai-chat.service'
import type { ChatMessage } from '@/services/ai-chat.service'
import MarkdownText from '@/components/common/MarkdownText.vue'

interface SlideData {
  title: string
  bullets: string[]
  type: string
  svg?: string
}

interface PptResult {
  title: string
  slides: SlideData[]
  style: string
}

interface MsgItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  isStreaming?: boolean
  isThinking?: boolean
  thinkingExpanded?: boolean
  quickReplies?: string[]
  pptData?: PptResult
}

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const currentSubject = computed(() => getSubjectConfig(authStore.teacherSubject) || SUBJECT_LIST[3])
const subjectColor = computed(() => currentSubject.value.color)
const subjectName = computed(() =>
  isZh.value ? currentSubject.value.name : currentSubject.value.nameEn,
)
const userInitial = computed(() => (authStore.user?.name?.[0] || 'T').toUpperCase())

const inputPlaceholder = computed(() =>
  isZh.value ? '输入课件需求或回答问题...' : 'Enter your needs...',
)
const scrollAnchor = 'chatBottom'

const messages = ref<MsgItem[]>([])
const chatInput = ref('')
const isStreaming = ref(false)
const chatHistory = ref<ChatMessage[]>([])

// PPT 生成状态
const pptGenerating = ref(false)
const pptProgress = ref(0)
const pptStage = ref('')
const outlineModal = ref<PptResult | null>(null)

// SVG 预览状态
const svgPreview = ref<PptResult | null>(null)
const currentSlideIdx = ref(0)

const PPT_API_URL =
  (import.meta as any).env?.VITE_PPT_API_URL || (import.meta as any).env?.VITE_API_URL || ''

function prevSlide() {
  if (currentSlideIdx.value > 0) currentSlideIdx.value--
}
function nextSlide() {
  if (svgPreview.value && currentSlideIdx.value < svgPreview.value.slides.length - 1)
    currentSlideIdx.value++
}

function openSvgPreview(data: PptResult) {
  svgPreview.value = data
  currentSlideIdx.value = 0
}

/** 简单 SVG 安全清理 */
function sanitizeSvg(svg: string): string {
  if (!svg) return ''
  // 移除 script 和 foreignObject
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
}

const SYSTEM_PROMPT = computed(
  () => `你是一个专业的教学课件设计助手，专注于${subjectName.value}学科。

你的工作流程：
1. 首先了解用户想做什么课件，通过 1-2 个关键问题明确需求（主题、受众、侧重点）
2. 确认需求后，生成 PPT 大纲
3. 当你认为需求足够明确时，在回复末尾加上特殊标记 [READY_TO_GENERATE]，表示可以进入生成阶段

对话规则：
- 第一轮：如果用户给了明确主题，追问 1-2 个问题（页数偏好、重点内容、学生年级等）
- 第二轮：如果信息足够了，确认需求并加上 [READY_TO_GENERATE] 标记
- 如果用户说"直接生成"、"开始"、"好的"等确认词，立即加上 [READY_TO_GENERATE] 标记
- 语言简洁友好，用 emoji 增加亲和力

当需求足够明确，你需要在消息最后这样输出：

[READY_TO_GENERATE]
主题: xxx
页数: xx
风格: 正式/清新
重点: xxx

注意：[READY_TO_GENERATE] 后面的信息用于提取参数，不要用 markdown 格式包裹。`,
)

function toggleThinking(msg: MsgItem) {
  if (!msg.isThinking) {
    msg.thinkingExpanded = !msg.thinkingExpanded
  }
}

function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function scrollToBottom() {
  nextTick(() => {
    // scroll-into-view 会自动滚到底
  })
}

function startNewChat() {
  messages.value = []
  chatHistory.value = []
  chatInput.value = ''
  isStreaming.value = false
  pptGenerating.value = false
  addWelcomeMessage()
}

function addWelcomeMessage() {
  const welcomeText = isZh.value
    ? `👋 你好！我是 AI 课件助手。\n\n告诉我你想做什么课件，比如：\n- 「帮我做一份关于环境保护的PPT」\n- 「做一个10页的诚实守信课件」\n\n我会先了解你的需求，再帮你生成专业的 PPTX 文件 📊`
    : `👋 Hi! I'm your AI Slides assistant.\n\nTell me what slides you need, like:\n- "Make a 10-page PPT about honesty"\n\nI'll ask a few questions first, then generate your PPTX 📊`

  messages.value.push({
    id: genId(),
    role: 'assistant',
    content: welcomeText,
    quickReplies: isZh.value
      ? [`帮我做一份关于${currentSubject.value.name}的PPT`, '我想做一个10页的教学课件']
      : [`Make a PPT about ${currentSubject.value.nameEn}`, 'I want a 10-page teaching slide'],
  })
}

async function sendMessage(text?: string) {
  const msg = (text || chatInput.value).trim()
  if (!msg || isStreaming.value) return
  chatInput.value = ''

  // 用户消息
  messages.value.push({ id: genId(), role: 'user', content: msg })
  scrollToBottom()

  // 添加到对话历史
  chatHistory.value.push({ role: 'user', content: msg })

  // AI 回复 — 通过数组索引获取 reactive proxy
  messages.value.push({
    id: genId(),
    role: 'assistant',
    content: '',
    isStreaming: true,
    isThinking: true,
  })
  const aiMsgIdx = messages.value.length - 1
  isStreaming.value = true
  scrollToBottom()

  try {
    await new Promise<void>((resolve, reject) => {
      aiChatService.sendMessageStream(
        {
          messages: [{ role: 'system', content: SYSTEM_PROMPT.value }, ...chatHistory.value],
          temperature: 0.7,
          maxTokens: 2000,
          timeoutMs: 60000,
        },
        (token, fullText, isReasoning) => {
          const m = messages.value[aiMsgIdx]
          if (isReasoning) {
            m.reasoning = fullText
            m.isThinking = true
          } else {
            m.content = fullText
            m.isThinking = false
          }
          m.isStreaming = true
          scrollToBottom()
        },
        (fullContent, reasoning) => {
          const m = messages.value[aiMsgIdx]
          m.isStreaming = false
          m.isThinking = false
          if (reasoning) m.reasoning = reasoning
          // content 可能为空（只有 reasoning 的情况），降级使用
          const rawContent = fullContent || reasoning || ''
          m.content = fullContent
          chatHistory.value.push({ role: 'assistant', content: rawContent })

          // 检查是否包含 [READY_TO_GENERATE]
          if (rawContent.includes('[READY_TO_GENERATE]')) {
            const displayContent = rawContent.split('[READY_TO_GENERATE]')[0].trim()
            m.content =
              displayContent ||
              (isZh.value ? '✅ 需求已确认，正在生成课件...' : '✅ Confirmed, generating...')

            const params = extractParams(rawContent)
            generatePpt(m, params).then(resolve).catch(reject)
          } else {
            // 如果 AI 还在问问题，添加快捷回复
            if (rawContent.includes('?') || rawContent.includes('？')) {
              m.quickReplies = isZh.value
                ? ['直接生成吧', '10页左右', '内容要详细一些']
                : ['Just generate it', 'About 10 pages', 'More detailed content']
            }
            resolve()
          }
        },
        (error) => {
          reject(new Error(error))
        },
      )
    })
  } catch (e: any) {
    messages.value[aiMsgIdx].content = `❌ ${e.message || (isZh.value ? '回复失败' : 'Failed')}`
    messages.value[aiMsgIdx].isStreaming = false
  } finally {
    isStreaming.value = false
    scrollToBottom()
  }
}

function extractParams(raw: string): {
  topic: string
  pageCount: number
  style: string
  focus: string
} {
  const afterTag = raw.split('[READY_TO_GENERATE]')[1] || ''
  const topicMatch = afterTag.match(/主题[:：]\s*(.+)/)?.[1]?.trim()
  const pageMatch = afterTag.match(/页数[:：]\s*(\d+)/)?.[1]
  const styleMatch = afterTag.match(/风格[:：]\s*(.+)/)?.[1]?.trim()
  const focusMatch = afterTag.match(/重点[:：]\s*(.+)/)?.[1]?.trim()

  return {
    topic: topicMatch || chatHistory.value.find((m) => m.role === 'user')?.content || '教学课件',
    pageCount: parseInt(pageMatch || '10', 10),
    style: styleMatch || '正式',
    focus: focusMatch || '',
  }
}

async function generatePpt(
  aiMsg: MsgItem,
  params: { topic: string; pageCount: number; style: string; focus: string },
) {
  pptGenerating.value = true
  pptProgress.value = 5
  pptStage.value = isZh.value ? '阶段 1/3：大纲生成中…' : 'Stage 1/3: Outlining...'
  aiMsg.content = isZh.value
    ? '🎨 **正在启动 PPT 三阶段生成流水线…**\n\n⏳ 阶段1/3: 分析主题，生成大纲结构…'
    : '🎨 **Starting PPT pipeline...**\n\n⏳ Stage 1/3: Analyzing topic...'
  scrollToBottom()

  // 进度模拟
  const timer = setInterval(() => {
    if (pptProgress.value < 30) {
      pptProgress.value += 2
      pptStage.value = isZh.value ? '阶段 1/3：大纲生成中…' : 'Stage 1/3: Outlining...'
    } else if (pptProgress.value < 55) {
      pptProgress.value += 1.5
      pptStage.value = isZh.value ? '阶段 2/3：语义规划中…' : 'Stage 2/3: Planning...'
      aiMsg.content = isZh.value
        ? '🎨 **PPT 三阶段生成中…**\n\n✅ 阶段1: 大纲完成\n⏳ 阶段2/3: 正在规划每页版面布局…'
        : '🎨 **PPT generating...**\n\n✅ Stage 1 done\n⏳ Stage 2/3: Layout planning...'
    } else if (pptProgress.value < 90) {
      pptProgress.value += 0.8
      pptStage.value = isZh.value ? '阶段 3/3：SVG 页面渲染中…' : 'Stage 3/3: Rendering SVG...'
      aiMsg.content = isZh.value
        ? '🎨 **PPT 三阶段生成中…**\n\n✅ 阶段1: 大纲完成\n✅ 阶段2: 布局完成\n⏳ 阶段3/3: 正在渲染 SVG 页面…'
        : '🎨 **PPT generating...**\n\n✅ Stage 1-2 done\n⏳ Stage 3/3: Rendering SVG pages...'
    }
    scrollToBottom()
  }, 500)

  try {
    // 调用后端 PPT 生成 API
    const response = await fetch(`${PPT_API_URL}/api/ppt/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: params.topic,
        pageCount: params.pageCount,
        style: params.style,
        focus: params.focus,
        subject: subjectName.value,
      }),
    })

    clearInterval(timer)

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      throw new Error(err.error || `服务器错误: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    pptProgress.value = 100
    pptStage.value = isZh.value ? '生成完成！' : 'Done!'

    // 转换为 PptResult
    const pptData: PptResult = {
      title: data.title || params.topic,
      slides: (data.slides || []).map((s: any) => ({
        title: s.title || '',
        type: s.type || 'content',
        bullets: [],
        svg: s.svg || '',
      })),
      style: params.style,
    }

    // 添加到消息中
    aiMsg.pptData = pptData
    aiMsg.content = isZh.value
      ? `✅ **课件生成完成！**\n\n📊 **${pptData.title}**\n共 ${pptData.slides.length} 页（含封面、目录、内容页和结束页）\n\n👉 点击「预览幻灯片」查看 SVG 幻灯片效果，点击「下载 PPTX」获取文件。`
      : `✅ **Slides ready!**\n\n📊 **${pptData.title}** - ${pptData.slides.length} pages\n\nPreview or download below.`

    await new Promise((r) => setTimeout(r, 500))
  } catch (e: any) {
    clearInterval(timer)
    aiMsg.content = `❌ ${isZh.value ? '课件生成失败' : 'Generation failed'}：${e.message}\n\n请重新描述需求试试。`
  } finally {
    pptGenerating.value = false
    scrollToBottom()
  }
}

function parseOutline(raw: string, fallbackTopic: string): { title: string; slides: SlideData[] } {
  let jsonStr = ''
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch?.[1]) jsonStr = codeMatch[1].trim()
  else {
    const s = raw.indexOf('{'),
      e = raw.lastIndexOf('}')
    if (s >= 0 && e > s) jsonStr = raw.slice(s, e + 1)
  }

  if (!jsonStr) return buildFallback(fallbackTopic)

  try {
    const data = JSON.parse(jsonStr)
    const slides = (data.slides || []).map((s: any) => ({
      title: s.title || '',
      type: s.type || 'content',
      bullets: Array.isArray(s.bullets) ? s.bullets.filter((b: any) => typeof b === 'string') : [],
    }))
    return { title: data.title || fallbackTopic, slides }
  } catch {
    return buildFallback(fallbackTopic)
  }
}

function buildFallback(t: string) {
  return {
    title: t,
    slides: [
      { type: 'cover', title: t, bullets: [`${subjectName.value}课堂课件`] },
      { type: 'toc', title: '目录', bullets: ['概念认识', '深入理解', '实践应用'] },
      { type: 'content', title: '概念认识', bullets: [`${t}的基本含义`, '核心要素', '生活体现'] },
      { type: 'content', title: '深入理解', bullets: ['理论基础', '案例分析', '多角度思考'] },
      { type: 'content', title: '实践应用', bullets: ['课堂讨论', '行动建议', '延伸思考'] },
      { type: 'end', title: '总结与思考', bullets: ['核心回顾', '课后建议'] },
    ],
  }
}

function showOutline(data: PptResult) {
  outlineModal.value = data
}

async function downloadPptx(data: PptResult) {
  try {
    uni.showLoading({ title: isZh.value ? '生成文件...' : 'Creating...' })
    const PptxGenJS = (await import('pptxgenjs')).default
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_16x9'
    pptx.author = 'UniSmart AI'
    pptx.title = data.title

    const themeHex = subjectColor.value.replace('#', '')
    const isFresh = data.style === '清新' || data.style === 'fresh'
    const bgColor = isFresh ? 'F0F8F0' : 'FFFFFF'
    const textColor = '333333'

    for (let i = 0; i < data.slides.length; i++) {
      const slide = data.slides[i]
      const s = pptx.addSlide()

      if (slide.type === 'cover') {
        s.background = { color: themeHex }
        s.addText(slide.title, {
          x: 0.8,
          y: 1.5,
          w: 8.4,
          h: 1.5,
          fontSize: 36,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
        })
        if (slide.bullets[0])
          s.addText(slide.bullets[0], {
            x: 0.8,
            y: 3.2,
            w: 8.4,
            h: 0.8,
            fontSize: 18,
            color: 'FFFFFFCC',
            align: 'center',
          })
        s.addText('UniSmart AI · 智能课件', {
          x: 0.8,
          y: 4.5,
          w: 8.4,
          h: 0.5,
          fontSize: 12,
          color: 'FFFFFF99',
          align: 'center',
        })
      } else if (slide.type === 'end') {
        s.background = { color: themeHex }
        s.addText(slide.title, {
          x: 0.8,
          y: 2.0,
          w: 8.4,
          h: 1.2,
          fontSize: 32,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
        })
        if (slide.bullets.length)
          s.addText(slide.bullets.join('\n'), {
            x: 0.8,
            y: 3.4,
            w: 8.4,
            h: 1.0,
            fontSize: 16,
            color: 'FFFFFFCC',
            align: 'center',
          })
      } else {
        s.background = { color: bgColor }
        s.addShape('rect' as any, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: themeHex } })
        s.addText(slide.title, {
          x: 0.6,
          y: 0.3,
          w: 8.8,
          h: 0.8,
          fontSize: 24,
          bold: true,
          color: themeHex,
        })
        s.addShape('rect' as any, { x: 0.6, y: 1.1, w: 1.2, h: 0.04, fill: { color: themeHex } })
        if (slide.bullets.length) {
          const bulletText = slide.bullets.map((b) => ({
            text: b,
            options: {
              fontSize: 16,
              color: textColor,
              bullet: { type: 'bullet' as const, code: '25CF' },
              breakLine: true,
              lineSpacingMultiple: 1.6,
              paraSpaceBefore: 8,
            },
          }))
          s.addText(bulletText, { x: 0.6, y: 1.4, w: 8.8, h: 3.6, valign: 'top' })
        }
        s.addText(`${i + 1}`, {
          x: 9.0,
          y: 5.0,
          w: 0.6,
          h: 0.4,
          fontSize: 10,
          color: '999999',
          align: 'right',
        })
      }
    }

    // #ifdef H5
    const blob = (await pptx.write({ outputType: 'blob' })) as Blob
    const fileName = `${data.title.replace(/[/\\?%*:|"<>]/g, '')}.pptx`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    uni.hideLoading()
    uni.showToast({ title: isZh.value ? '下载成功' : 'Downloaded', icon: 'success' })
    // #endif
    // #ifndef H5
    uni.hideLoading()
    uni.showToast({
      title: isZh.value ? '请在电脑端浏览器导出 PPT' : 'Please export PPT on a desktop browser',
      icon: 'none',
    })
    // #endif
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: isZh.value ? '生成失败' : 'Failed', icon: 'none' })
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else uni.switchTab({ url: '/pages/teaching/index' })
}

// 初始化欢迎消息
addWelcomeMessage()
</script>

<style lang="scss" scoped>
.ppt-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f6f6;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.12);
  --bubble-user: rgba(192, 0, 0, 0.08);
  --bubble-ai: #ffffff;
}

.theme-dark {
  --page-bg: #1a1315;
  --surface: rgba(26, 19, 21, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.24);
  --bubble-user: rgba(192, 0, 0, 0.15);
  --bubble-ai: rgba(26, 19, 21, 0.78);
}

.top-bar {
  padding: 0 24rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(14px);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active {
    opacity: 0.7;
  }
}

.topbar-center {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.title {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

// ===== 聊天 =====
.chat-area {
  flex: 1;
  padding: 24rpx;
}

.msg-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;
  &.assistant {
    max-width: 92%;
  }
  &.user {
    flex-direction: row-reverse;
    margin-left: auto;
    max-width: 85%;
    padding-right: 4rpx;
  }
}

.msg-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.user {
    background: var(--bubble-user);
  }
  &.assistant {
    background: linear-gradient(135deg, #fce4ec, #f8bbd0);
  }
}

.avatar-emoji {
  font-size: 28rpx;
}
.avatar-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-main);
}

.msg-body {
  flex: 1;
  min-width: 0;
}

.msg-bubble {
  padding: 18rpx 24rpx;
  border-radius: 20rpx;
  &.user {
    background: var(--bubble-user);
    border-top-right-radius: 6rpx;
  }
  &.assistant {
    background: var(--bubble-ai);
    border: 1px solid var(--line);
    border-top-left-radius: 6rpx;
  }
}

.msg-text {
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--text-main);
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 4rpx 0;
}
.typing-dots {
  display: flex;
  gap: 6rpx;
}
.dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: var(--text-soft);
  animation: dotBounce 1.4s infinite ease-in-out;
  &:nth-child(1) {
    animation-delay: 0s;
  }
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}
@keyframes dotBounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
.typing-text {
  font-size: 22rpx;
  color: var(--text-soft);
}

// 思考过程折叠区
.thinking-block {
  margin-bottom: 12rpx;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(139, 92, 246, 0.06);
  border-left: 3px solid rgba(139, 92, 246, 0.4);
  transition: all 0.3s ease;

  &.collapsed {
    .thinking-content {
      display: none;
    }
  }
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  &:active {
    opacity: 0.7;
  }
}

.thinking-icon {
  font-size: 24rpx;
}
.thinking-label {
  font-size: 22rpx;
  color: rgba(139, 92, 246, 0.8);
  font-weight: 500;
}
.thinking-toggle {
  font-size: 18rpx;
  color: var(--text-soft);
  margin-left: auto;
}

.thinking-content {
  margin-top: 8rpx;
  padding-top: 8rpx;
  border-top: 1px solid rgba(139, 92, 246, 0.12);
}

.thinking-text {
  font-size: 22rpx;
  color: var(--text-soft);
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
}

// 快捷回复
.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}

.quick-reply-btn {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  border: 1px solid;
  background: transparent;
  text {
    font-size: 22rpx;
  }
  &:active {
    opacity: 0.7;
    transform: scale(0.97);
  }
}

// PPT 结果
.ppt-result {
  margin-top: 12rpx;
}

.ppt-result-card {
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  border: 1.5px solid;
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ppt-result-info {
  flex: 1;
}
.ppt-result-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-main);
  display: block;
}
.ppt-result-desc {
  font-size: 22rpx;
  color: var(--text-soft);
  display: block;
  margin-top: 2rpx;
}

.ppt-actions {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
}

.ppt-action-btn {
  flex: 1;
  height: 64rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  &.outline {
    background: transparent;
    border: 1px solid var(--line);
  }
  &:active {
    transform: scale(0.97);
  }
}

// 进度
.progress-bar-wrap {
  margin: 12rpx 0 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: var(--surface);
  border: 1px solid var(--line);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.progress-text {
  font-size: 22rpx;
  color: var(--text-soft);
}
.progress-pct {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--text-main);
}

.progress-track {
  height: 10rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.3s ease;
}

// ===== 输入栏 =====
.chat-input-bar {
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  border-top: 1px solid var(--line);
}

.input-wrapper {
  display: flex;
  gap: 12rpx;
  align-items: flex-end;
}

.chat-textarea {
  flex: 1;
  min-height: 56rpx;
  max-height: 200rpx;
  padding: 14rpx 20rpx;
  border-radius: 20rpx;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-main);
  font-size: 28rpx;
  line-height: 1.5;
}

.chat-placeholder {
  color: #9ca3af;
}

.send-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.disabled {
    opacity: 0.4;
  }
  &:active {
    transform: scale(0.93);
  }
}

.input-tip {
  font-size: 20rpx;
  color: var(--text-soft);
  text-align: center;
  margin-top: 6rpx;
  display: block;
}

// ===== 大纲弹窗 =====
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.modal-card {
  width: 100%;
  max-height: 80vh;
  background: var(--surface);
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.modal-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}
.modal-body {
  flex: 1;
  padding: 20rpx 24rpx;
}

.outline-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.outline-num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text {
    font-size: 20rpx;
    font-weight: 700;
    color: #fff;
  }
}

.outline-text {
  flex: 1;
  min-width: 0;
}
.outline-slide-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-main);
  display: block;
}
.outline-slide-desc {
  font-size: 22rpx;
  color: var(--text-soft);
  margin-top: 2rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

// ===== SVG 幻灯片预览 =====
.svg-preview-mask {
  background: rgba(0, 0, 0, 0.85) !important;
  padding: 0 !important;
}

.svg-preview-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.svg-preview-topbar {
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background: rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

.svg-preview-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.svg-slide-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  overflow: hidden;
}

.svg-slide-content {
  width: 100%;
  max-height: 100%;
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  :deep(svg) {
    width: 100%;
    height: auto;
    display: block;
  }
}

.svg-slide-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
  padding: 16rpx 0;
  flex-shrink: 0;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  text {
    font-size: 24rpx;
    color: #fff;
  }
  &:active {
    background: rgba(255, 255, 255, 0.3);
  }
  &.disabled {
    opacity: 0.3;
    pointer-events: none;
  }
}

.slide-counter {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.svg-thumbs {
  flex-shrink: 0;
  white-space: nowrap;
  padding: 8rpx 16rpx 24rpx;
  display: flex;
  gap: 12rpx;
}

.thumb-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  cursor: pointer;
  flex-shrink: 0;
  &.active .thumb-svg {
    border-color: #fff;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
  }
}

.thumb-svg {
  width: 120rpx;
  height: 68rpx;
  border-radius: 6rpx;
  overflow: hidden;
  background: #fff;
  border: 2px solid transparent;
  transition: border-color 0.2s;
  :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.thumb-label {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.6);
}
</style>
