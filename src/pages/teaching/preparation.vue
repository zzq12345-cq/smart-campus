<template>
  <view :class="['prep-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <view class="topbar-center">
        <Icon name="smart_toy" :size="20" :color="subjectColor" />
        <text class="title">{{ isZh ? 'AI 智能备课' : 'AI Preparation' }}</text>
      </view>
      <view class="icon-btn" @tap="newChat">
        <Icon name="add_comment" :size="20" :color="iconColor" />
      </view>
    </view>

    <!-- 欢迎页面 -->
    <view v-if="showWelcome" class="welcome-area">
      <view class="welcome-icon-wrap">
        <Icon name="smart_toy" :size="56" :color="subjectColor" />
      </view>
      <text class="welcome-title">{{ isZh ? 'AI 智能备课助手' : 'AI Teaching Assistant' }}</text>
      <text class="welcome-subtitle">{{ isZh ? '我可以帮你生成教案、设计课堂、编写教学内容，直接告诉我即可。' : 'I can generate lesson plans, design classes, and create teaching content.' }}</text>

      <view class="welcome-cards">
        <view class="welcome-card" @tap="sendQuickMessage(quickPrompts[0])">
          <Icon name="description" :size="24" :color="subjectColor" />
          <text class="welcome-card-title">{{ isZh ? '生成教案' : 'Create Plan' }}</text>
          <text class="welcome-card-desc">{{ isZh ? 'AI 智能编写' : 'AI-generated' }}</text>
        </view>
        <view class="welcome-card" @tap="sendQuickMessage(quickPrompts[1])">
          <Icon name="lightbulb" :size="24" :color="subjectColor" />
          <text class="welcome-card-title">{{ isZh ? '课堂设计' : 'Class Design' }}</text>
          <text class="welcome-card-desc">{{ isZh ? '互动教学方案' : 'Interactive plan' }}</text>
        </view>
        <view class="welcome-card" @tap="sendQuickMessage(quickPrompts[2])">
          <Icon name="quiz" :size="24" :color="subjectColor" />
          <text class="welcome-card-title">{{ isZh ? '出题训练' : 'Question Bank' }}</text>
          <text class="welcome-card-desc">{{ isZh ? '练习与测试' : 'Exercises & tests' }}</text>
        </view>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      v-else
      class="chat-messages"
      scroll-y
      :scroll-into-view="scrollAnchorId"
      :scroll-with-animation="true"
    >
      <view v-for="msg in messages" :key="msg.id" :class="['msg-row', msg.role]">
        <view :class="['msg-avatar', msg.role]">
          <text v-if="msg.role === 'assistant'" class="avatar-emoji">🤖</text>
          <text v-else class="avatar-text">{{ userInitial }}</text>
        </view>
        <view class="msg-body">
          <view v-if="msg.thinking" class="msg-thinking">
            <text class="thinking-label">{{ isZh ? '💭 思考过程' : '💭 Thinking' }}</text>
            <text class="thinking-content">{{ msg.thinking }}</text>
          </view>
          <view :class="['msg-bubble', msg.role]">
            <!-- 用户消息用纯文本 -->
            <text v-if="msg.role === 'user'" class="msg-text user-text">{{ msg.content }}</text>
            <!-- AI 消息用 Markdown 渲染 -->
            <MarkdownText
              v-else-if="msg.content"
              :content="msg.content"
              :theme="uiPreferencesStore.theme"
            />
            <!-- 流式加载动画 -->
            <view v-else-if="msg.isStreaming" class="typing-indicator">
              <view class="typing-dots">
                <view class="dot" /><view class="dot" /><view class="dot" />
              </view>
              <text class="typing-text">{{ isZh ? '正在生成中...' : 'Generating...' }}</text>
            </view>
          </view>
          <!-- 保存/复制操作按钮 -->
          <view v-if="msg.role === 'assistant' && msg.content && !msg.isStreaming" class="msg-actions">
            <view class="msg-action-btn" @tap="saveAsLessonPlan(msg.content)">
              <Icon name="save" :size="14" :color="subjectColor" />
              <text :style="{ color: subjectColor }">{{ isZh ? '保存为教案' : 'Save as Plan' }}</text>
            </view>
            <view class="msg-action-btn" @tap="copyContent(msg.content)">
              <Icon name="content_copy" :size="14" color="#94a3b8" />
              <text>{{ isZh ? '复制' : 'Copy' }}</text>
            </view>
          </view>
        </view>
      </view>
      <view :id="scrollAnchor" style="height: 1px;" />
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
          <Icon v-if="isStreaming" name="sync" :size="18" color="#ffffff" />
          <Icon v-else name="send" :size="18" color="#ffffff" />
        </view>
      </view>
      <text class="input-tip">{{ isZh ? '输入教学需求如「帮我写一份XX的教案」' : 'Type your teaching needs' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { getSubjectConfig, SUBJECT_LIST } from '@/teacher/types/subjects'
import aiChatService from '@/services/ai-chat.service'
import lessonPlansService from '@/teacher/services/lesson-plans'
import MarkdownText from '@/components/common/MarkdownText.vue'
import { watch } from 'vue'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  isStreaming?: boolean
}

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8')
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const currentSubject = computed(() => getSubjectConfig(authStore.teacherSubject) || SUBJECT_LIST[3])
const subjectColor = computed(() => currentSubject.value.color)
const subjectName = computed(() => isZh.value ? currentSubject.value.name : currentSubject.value.nameEn)

// 用户头像首字母
const userInitial = computed(() => {
  const name = authStore.userName || authStore.userEmail || 'T'
  return name.charAt(0).toUpperCase()
})

const CHAT_STORAGE_KEY = 'teaching_prep_chat_history'

const messages = ref<ChatMsg[]>(loadChatHistory())
const chatInput = ref('')
const isStreaming = ref(false)
const scrollAnchor = 'scroll-bottom'
const scrollAnchorId = ref('')

const showWelcome = computed(() => messages.value.length === 0)

/** 从 localStorage 恢复对话 */
function loadChatHistory(): ChatMsg[] {
  try {
    const raw = uni.getStorageSync(CHAT_STORAGE_KEY)
    if (!raw) return []
    const saved = JSON.parse(raw) as ChatMsg[]
    // 恢复时去掉 isStreaming 标记
    return saved.map(m => ({ ...m, isStreaming: false }))
  } catch { return [] }
}

/** 保存对话到 localStorage */
function saveChatHistory() {
  try {
    const toSave = messages.value
      .filter(m => m.content) // 只保存有内容的消息
      .map(({ id, role, content }) => ({ id, role, content }))
    uni.setStorageSync(CHAT_STORAGE_KEY, JSON.stringify(toSave))
  } catch {}
}

// 消息变化时自动保存
watch(messages, saveChatHistory, { deep: true })

const inputPlaceholder = computed(() =>
  isZh.value
    ? `输入需求，如「帮我写一份${subjectName.value}教案」…`
    : `Type your request, e.g. "Create a ${subjectName.value} lesson plan"…`
)

const quickPrompts = computed(() => [
  isZh.value
    ? `帮我写一份${subjectName.value}教案，主题自拟，面向高中生，45分钟课时`
    : `Create a ${subjectName.value} lesson plan for high school, 45 minutes`,
  isZh.value
    ? `请帮我设计一节关于${subjectName.value}的互动课堂，包含小组讨论和课堂练习，45分钟`
    : `Design an interactive ${subjectName.value} class with group discussions, 45 minutes`,
  isZh.value
    ? `帮我出10道${subjectName.value}的选择题和5道简答题，难度适中`
    : `Create 10 multiple choice and 5 short answer questions for ${subjectName.value}`
])

function genId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function scrollToBottom() {
  scrollAnchorId.value = ''
  setTimeout(() => {
    scrollAnchorId.value = scrollAnchor
  }, 50)
}

function newChat() {
  messages.value = []
  chatInput.value = ''
  isStreaming.value = false
  try { uni.removeStorageSync(CHAT_STORAGE_KEY) } catch {}
}

function sendQuickMessage(text: string) {
  chatInput.value = text
  sendMessage()
}

async function sendMessage(text?: string) {
  const msg = (text || chatInput.value).trim()
  if (!msg || isStreaming.value) return
  chatInput.value = ''

  // 用户消息
  messages.value.push({ id: genId(), role: 'user', content: msg })
  scrollToBottom()

  // AI 占位
  const aiMsg: ChatMsg = { id: genId(), role: 'assistant', content: '', isStreaming: true }
  messages.value.push(aiMsg)
  isStreaming.value = true
  scrollToBottom()

  // 构建系统提示
  const systemPrompt = isZh.value
    ? `你是一位专业的${subjectName.value}教师AI助手。你擅长编写教案、设计互动课堂、出题考试。请用中文回答，确保内容专业、详细、实用。当用户要求生成教案时，请按照以下格式输出：
【课题名称】
【科目】${subjectName.value}
【年级】
【教学目标】
【教学内容】
【教学步骤】
【教学重难点】
【课时】
【教学方法】
【课后作业】
【教学反思】`
    : `You are a professional ${subjectName.value} teaching AI assistant. You excel at writing lesson plans, designing interactive classes, and creating exam questions. Provide detailed, professional, and practical content.`

  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.value
      .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
      .slice(-10)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  ]

  // 使用流式输出
  try {
    await aiChatService.sendMessageStream(
      { messages: chatMessages, temperature: 0.7, maxTokens: 4000 },
      // onToken: 逐 token 更新
      (_token, fullContent) => {
        aiMsg.content = fullContent
        // 触发 Vue 响应式更新
        messages.value = [...messages.value]
        scrollToBottom()
      },
      // onDone
      (fullContent) => {
        aiMsg.content = fullContent
        aiMsg.isStreaming = false
        isStreaming.value = false
        messages.value = [...messages.value]
        scrollToBottom()
      },
      // onError
      (error) => {
        aiMsg.content = error || (isZh.value ? '抱歉，请求失败，请重试。' : 'Sorry, request failed.')
        aiMsg.isStreaming = false
        isStreaming.value = false
        messages.value = [...messages.value]
        scrollToBottom()
      }
    )
  } catch (error) {
    console.error('[AI Prep] error:', error)
    aiMsg.content = isZh.value ? '抱歉，请求失败，请检查网络后重试。' : 'Sorry, request failed. Please check your network.'
    aiMsg.isStreaming = false
    isStreaming.value = false
    messages.value = [...messages.value]
    scrollToBottom()
  }
}

async function saveAsLessonPlan(content: string) {
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: isZh.value ? '请先登录' : 'Please login', icon: 'none' })
    return
  }

  try {
    const titleMatch = content.match(/[【\[]课题名称[】\]]\s*[:：]?\s*(.+)/m)
      || content.match(/^#\s+(.+)/m)
      || content.match(/^(.{2,30})/m)
    const title = titleMatch?.[1]?.trim() || (isZh.value ? 'AI 生成教案' : 'AI Generated Plan')

    const plan = await lessonPlansService.createLessonPlan({
      title,
      subject: authStore.teacherSubject || 'politics',
      content
    })

    uni.showToast({ title: isZh.value ? '已保存为教案' : 'Saved as plan', icon: 'success' })

    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/teaching/lesson-plan-detail?id=${encodeURIComponent(plan.$id)}`
      })
    }, 800)
  } catch (error) {
    console.error('Save as plan failed:', error)
    uni.showToast({ title: isZh.value ? '保存失败' : 'Save failed', icon: 'none' })
  }
}

function copyContent(content: string) {
  uni.setClipboardData({
    data: content,
    success: () => {
      uni.showToast({ title: isZh.value ? '已复制' : 'Copied', icon: 'success' })
    }
  })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/teaching/index' })
  }
}
</script>

<style lang="scss" scoped>
.prep-page {
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
  --bubble-user: #C00000;
  --bubble-ai: #ffffff;
  --bubble-ai-border: rgba(192, 0, 0, 0.12);
}

.theme-dark {
  --page-bg: #1a1315;
  --surface: rgba(26, 19, 21, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.24);
  --bubble-user: #8B0000;
  --bubble-ai: rgba(30, 25, 27, 0.9);
  --bubble-ai-border: rgba(192, 0, 0, 0.2);
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

  .icon-btn {
    width: 64rpx; height: 64rpx; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    &:active { opacity: 0.7; }
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

// ===== 欢迎 =====
.welcome-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  gap: 16rpx;
}

.welcome-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(192, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.welcome-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-main);
}

.welcome-subtitle {
  font-size: 24rpx;
  color: var(--text-sub);
  text-align: center;
  line-height: 1.6;
  max-width: 560rpx;
}

.welcome-cards {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
  width: 100%;
}

.welcome-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 28rpx 16rpx;
  border-radius: 20rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  transition: all 0.15s ease;

  &:active {
    transform: scale(0.96);
    border-color: rgba(192, 0, 0, 0.3);
  }
}

.welcome-card-title {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-main);
}

.welcome-card-desc {
  font-size: 20rpx;
  color: var(--text-soft);
}

// ===== 聊天消息 =====
.chat-messages {
  flex: 1;
  padding: 24rpx;
}

.msg-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;

  &.assistant {
    max-width: 90%;
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
    background: linear-gradient(135deg, #e8d5d5, #d4b8b8);
  }
}

.avatar-emoji {
  font-size: 28rpx;
  line-height: 1;
}

.avatar-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.msg-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;

  .user & {
    align-items: flex-end;
  }
}

.msg-thinking {
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(192, 0, 0, 0.06);
  border: 1px solid rgba(192, 0, 0, 0.1);
}

.thinking-label {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--text-sub);
  display: block;
  margin-bottom: 4rpx;
}

.thinking-content {
  font-size: 22rpx;
  color: var(--text-soft);
  line-height: 1.5;
}

.msg-bubble {
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  word-break: break-word;
  overflow: hidden;

  &.user {
    background: var(--bubble-user);
    border-bottom-right-radius: 8rpx;
    display: inline-block;
    max-width: 100%;
  }

  &.assistant {
    background: var(--bubble-ai);
    border: 1px solid var(--bubble-ai-border);
    border-bottom-left-radius: 8rpx;
  }
}

.user-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: #ffffff;
  white-space: pre-wrap;
}

// 流式加载动画
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 4rpx 0;
}

.typing-dots {
  display: flex;
  gap: 8rpx;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--text-soft);
  animation: typing 1.4s infinite;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
}

.typing-text {
  font-size: 24rpx;
  color: var(--text-soft);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.msg-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 6rpx;
}

.msg-action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: var(--surface);
  border: 1px solid var(--line);

  text {
    font-size: 22rpx;
    color: var(--text-sub);
  }

  &:active { opacity: 0.7; }
}

// ===== 输入栏 =====
.chat-input-bar {
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  padding: 8rpx 8rpx 8rpx 24rpx;
  border-radius: 28rpx;
  border: 1px solid var(--line);
  background: var(--page-bg);
  transition: border-color 0.15s ease;
}

.chat-textarea {
  flex: 1;
  max-height: 200rpx;
  font-size: 28rpx;
  color: var(--text-main);
  line-height: 1.5;
  padding: 8rpx 0;
  background: transparent;
}

.chat-placeholder { color: var(--text-soft); }

.send-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:active:not(.disabled) { transform: scale(0.92); }
  &.disabled { opacity: 0.4; }
}

.input-tip {
  font-size: 20rpx;
  color: var(--text-soft);
  text-align: center;
  margin-top: 8rpx;
  display: block;
}
</style>
