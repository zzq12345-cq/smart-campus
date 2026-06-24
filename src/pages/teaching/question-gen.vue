<template>
  <view :class="['qgen-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <view class="topbar-center">
        <Icon name="quiz" :size="20" :color="subjectColor" />
        <text class="title">{{ isZh ? 'AI 智能出题' : 'AI Quiz Generator' }}</text>
      </view>
      <view class="icon-btn" @tap="resetAll">
        <Icon name="refresh" :size="20" :color="iconColor" />
      </view>
    </view>

    <scroll-view class="main-scroll" scroll-y>
      <!-- 配置区域 -->
      <view v-if="!hasResult" class="config-section">
        <!-- 科目显示 -->
        <view class="config-card">
          <view class="config-header">
            <Icon name="school" :size="18" :color="subjectColor" />
            <text class="config-title">{{ isZh ? '出题科目' : 'Subject' }}</text>
          </view>
          <view class="subject-display" :style="{ borderColor: subjectColor }">
            <Icon :name="currentSubject.icon" :size="20" :color="subjectColor" />
            <text :style="{ color: subjectColor, fontWeight: '600' }">{{ subjectLabel }}</text>
          </view>
        </view>

        <!-- 题型选择 -->
        <view class="config-card">
          <view class="config-header">
            <Icon name="category" :size="18" :color="subjectColor" />
            <text class="config-title">{{ isZh ? '题型与数量' : 'Question Types' }}</text>
          </view>
          <view v-for="(spec, i) in typeSpecs" :key="i" class="type-row">
            <view class="type-label-wrap">
              <view class="type-dot" :style="{ background: getTypeColor(spec.type) }" />
              <text class="type-label">{{ getTypeLabel(spec.type) }}</text>
            </view>
            <view class="stepper">
              <view class="stepper-btn" @tap="adjustCount(i, -1)">
                <text>−</text>
              </view>
              <text class="stepper-value">{{ spec.count }}</text>
              <view class="stepper-btn" @tap="adjustCount(i, 1)">
                <text>+</text>
              </view>
            </view>
          </view>
          <view class="total-row">
            <text class="total-label">{{ isZh ? '总计' : 'Total' }}</text>
            <text class="total-value" :style="{ color: subjectColor }"
              >{{ totalCount }} {{ isZh ? '题' : 'Q' }}</text
            >
          </view>
        </view>

        <!-- 难度选择 -->
        <view class="config-card">
          <view class="config-header">
            <Icon name="tune" :size="18" :color="subjectColor" />
            <text class="config-title">{{ isZh ? '难度等级' : 'Difficulty' }}</text>
          </view>
          <view class="diff-options">
            <view
              v-for="d in difficultyOptions"
              :key="d.value"
              :class="['diff-chip', { active: selectedDifficulty === d.value }]"
              :style="
                selectedDifficulty === d.value
                  ? { background: d.activeColor, borderColor: d.activeColor, color: '#fff' }
                  : {}
              "
              @tap="selectedDifficulty = d.value"
            >
              <text>{{ d.label }}</text>
            </view>
          </view>
        </view>

        <!-- 附加选项 -->
        <view class="config-card">
          <view class="config-header">
            <Icon name="settings" :size="18" :color="subjectColor" />
            <text class="config-title">{{ isZh ? '附加选项' : 'Options' }}</text>
          </view>
          <view class="option-row" @tap="includeAnswer = !includeAnswer">
            <text class="option-label">{{ isZh ? '包含答案和解析' : 'Include answers' }}</text>
            <view
              :class="['toggle', { on: includeAnswer }]"
              :style="includeAnswer ? { background: subjectColor } : {}"
            >
              <view class="toggle-thumb" />
            </view>
          </view>
          <view class="option-row">
            <text class="option-label">{{
              isZh ? '知识点/主题（可选）' : 'Topic (optional)'
            }}</text>
          </view>
          <input
            v-model="topicHint"
            class="topic-input"
            :placeholder="
              isZh ? '如：力与运动、二次函数、古诗鉴赏...' : 'e.g. Quadratic equations...'
            "
            placeholder-class="topic-placeholder"
          />
        </view>

        <!-- 生成按钮 -->
        <view class="gen-btn" :style="{ background: subjectColor }" @tap="generateQuestions">
          <Icon name="auto_awesome" :size="20" color="#ffffff" />
          <text class="gen-btn-text">{{ isZh ? '开始生成' : 'Generate' }}</text>
        </view>
      </view>

      <!-- 结果区域 -->
      <view v-else class="result-section">
        <!-- 结果头部 -->
        <view class="result-header">
          <text class="result-title">{{ isZh ? '生成结果' : 'Generated Questions' }}</text>
          <text class="result-count" :style="{ color: subjectColor }"
            >{{ resultQuestionCount }} {{ isZh ? '题' : 'Q' }}</text
          >
        </view>

        <!-- AI 生成状态 -->
        <view v-if="isGenerating" class="gen-status">
          <view class="typing-dots">
            <view class="dot" /><view class="dot" /><view class="dot" />
          </view>
          <text class="gen-status-text">{{
            isZh ? '正在生成试题...' : 'Generating questions...'
          }}</text>
        </view>

        <!-- 结果内容 - Markdown 渲染 -->
        <view v-if="resultContent" class="result-content-card">
          <MarkdownText :content="resultContent" />
        </view>

        <!-- 操作按钮 -->
        <view v-if="!isGenerating && resultContent" class="result-actions">
          <view class="result-btn outline" @tap="saveAsQuiz">
            <Icon name="save" :size="18" :color="subjectColor" />
            <text :style="{ color: subjectColor }">{{ isZh ? '保存' : 'Save' }}</text>
          </view>
          <view class="result-btn outline" @tap="exportResult">
            <Icon name="download" :size="18" :color="subjectColor" />
            <text :style="{ color: subjectColor }">{{ isZh ? '导出' : 'Export' }}</text>
          </view>
          <view class="result-btn outline" @tap="copyResult">
            <Icon name="content_copy" :size="18" :color="subjectColor" />
            <text :style="{ color: subjectColor }">{{ isZh ? '复制' : 'Copy' }}</text>
          </view>
          <view class="result-btn primary" :style="{ background: subjectColor }" @tap="regenerate">
            <Icon name="refresh" :size="18" color="#ffffff" />
            <text style="color: #ffffff">{{ isZh ? '重新' : 'Redo' }}</text>
          </view>
        </view>
      </view>

      <view style="height: 60rpx" />
    </scroll-view>

    <!-- 导出选择弹窗 -->
    <view v-if="showExportPicker" class="export-mask" @tap="showExportPicker = false">
      <view class="export-sheet" @tap.stop>
        <text class="export-sheet-title">{{ isZh ? '选择导出版本' : 'Export Version' }}</text>
        <view class="export-option" @tap="doExport(true)">
          <Icon name="visibility" :size="20" color="#10b981" />
          <view class="export-option-text">
            <text class="export-option-title" style="color: #10b981">{{
              isZh ? '📝 答案版（教师用）' : '📝 With Answers'
            }}</text>
            <text class="export-option-desc">{{
              isZh ? '包含答案和解析，适合教师备用' : 'Includes answers and explanations'
            }}</text>
          </view>
        </view>
        <view class="export-option" @tap="doExport(false)">
          <Icon name="visibility_off" :size="20" color="#3b82f6" />
          <view class="export-option-text">
            <text class="export-option-title" style="color: #3b82f6">{{
              isZh ? '📄 无答案版（学生用）' : '📄 Without Answers'
            }}</text>
            <text class="export-option-desc">{{
              isZh ? '去除答案解析，适合打印发给学生' : 'For printing and distribution'
            }}</text>
          </view>
        </view>
        <view class="export-option cancel" @tap="showExportPicker = false">
          <text>{{ isZh ? '取消' : 'Cancel' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { getSubjectConfig, SUBJECT_LIST } from '@/teacher/types/subjects'
import aiChatService from '@/services/ai-chat.service'
import MarkdownText from '@/components/common/MarkdownText.vue'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const currentSubject = computed(() => getSubjectConfig(authStore.teacherSubject) || SUBJECT_LIST[3])
const subjectColor = computed(() => currentSubject.value.color)
const subjectLabel = computed(() =>
  isZh.value ? currentSubject.value.name : currentSubject.value.nameEn,
)

// ===== 题型配置 =====
interface TypeSpec {
  type: string
  count: number
}

const typeSpecs = ref<TypeSpec[]>([
  { type: 'single_choice', count: 5 },
  { type: 'multi_choice', count: 3 },
  { type: 'true_false', count: 5 },
  { type: 'short_answer', count: 3 },
  { type: 'essay', count: 2 },
])

const typeMap: Record<string, string> = {
  single_choice: '单选题',
  multi_choice: '多选题',
  true_false: '判断题',
  short_answer: '简答题',
  essay: '论述题',
}
const typeMapEn: Record<string, string> = {
  single_choice: 'Single Choice',
  multi_choice: 'Multiple Choice',
  true_false: 'True/False',
  short_answer: 'Short Answer',
  essay: 'Essay',
}
const typeColorMap: Record<string, string> = {
  single_choice: '#3b82f6',
  multi_choice: '#8b5cf6',
  true_false: '#06b6d4',
  short_answer: '#f97316',
  essay: '#ec4899',
}

function getTypeLabel(type: string) {
  return isZh.value ? typeMap[type] || type : typeMapEn[type] || type
}
function getTypeColor(type: string) {
  return typeColorMap[type] || '#6b7280'
}

function adjustCount(index: number, delta: number) {
  const spec = typeSpecs.value[index]
  spec.count = Math.max(0, Math.min(20, spec.count + delta))
}

const totalCount = computed(() => typeSpecs.value.reduce((s, t) => s + t.count, 0))

// ===== 难度 =====
const selectedDifficulty = ref('mixed')
const difficultyOptions = computed(() => [
  { value: 'mixed', label: isZh.value ? '混合' : 'Mixed', activeColor: '#6366f1' },
  { value: 'easy', label: isZh.value ? '简单' : 'Easy', activeColor: '#22c55e' },
  { value: 'medium', label: isZh.value ? '中等' : 'Medium', activeColor: '#f59e0b' },
  { value: 'hard', label: isZh.value ? '困难' : 'Hard', activeColor: '#ef4444' },
])

// ===== 附加选项 =====
const includeAnswer = ref(true)
const topicHint = ref('')

// ===== 生成 =====
const isGenerating = ref(false)
const resultContent = ref('')
const hasResult = ref(false)
const showExportPicker = ref(false)

const resultQuestionCount = computed(() => totalCount.value)

function resetAll() {
  hasResult.value = false
  resultContent.value = ''
  isGenerating.value = false
}

function regenerate() {
  resultContent.value = ''
  generateQuestions()
}

async function generateQuestions() {
  if (totalCount.value === 0) {
    uni.showToast({ title: isZh.value ? '请至少选择一道题' : 'Select at least 1', icon: 'none' })
    return
  }

  hasResult.value = true
  isGenerating.value = true
  resultContent.value = ''

  // 构建题型描述
  const activeTypes = typeSpecs.value.filter((t) => t.count > 0)
  const typeDesc = activeTypes
    .map((t) => `${getTypeLabel(t.type)} ${t.count} ${isZh.value ? '道' : ''}`)
    .join('、')

  const diffLabel =
    selectedDifficulty.value === 'mixed'
      ? isZh.value
        ? '混合难度（简单、中等、困难搭配）'
        : 'mixed difficulty'
      : difficultyOptions.value.find((d) => d.value === selectedDifficulty.value)?.label || ''

  const topicStr = topicHint.value.trim()
    ? isZh.value
      ? `，知识点范围：${topicHint.value.trim()}`
      : `, topic: ${topicHint.value.trim()}`
    : ''

  const systemPrompt = isZh.value
    ? `你是一位专业的${subjectLabel.value}教师，擅长出题和命制试卷。请严格按照用户要求生成试题。

输出格式要求：
- 每种题型前加题型标题，如"## 一、单选题"
- 每道题编号，如"1."
- 选择题的选项用 A. B. C. D. 格式
- 判断题答案用"对"或"错"
${includeAnswer.value ? '- 每道题后附上 **答案** 和 **解析**，用 > 引用格式' : '- 不要给出答案和解析'}
- 使用 Markdown 格式输出`
    : `You are a professional ${subjectLabel.value} teacher who excels at creating exam questions. Generate questions as requested, using Markdown format. ${includeAnswer.value ? 'Include answers and explanations.' : 'Do not include answers.'}`

  const userPrompt = isZh.value
    ? `请帮我出一套${subjectLabel.value}试题${topicStr}，要求如下：\n题型分布：${typeDesc}\n难度：${diffLabel}\n总计 ${totalCount.value} 道题。`
    : `Generate a ${subjectLabel.value} quiz${topicStr}:\nTypes: ${typeDesc}\nDifficulty: ${diffLabel}\nTotal: ${totalCount.value} questions.`

  try {
    await aiChatService.sendMessageStream(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        maxTokens: 6000,
      },
      (_token, full) => {
        resultContent.value = full
      },
      (full) => {
        resultContent.value = full
        isGenerating.value = false
      },
      (error) => {
        resultContent.value = error || (isZh.value ? '生成失败，请重试' : 'Generation failed')
        isGenerating.value = false
      },
    )
  } catch (e) {
    console.error('[QuestionGen] error:', e)
    resultContent.value = isZh.value ? '生成失败，请检查网络' : 'Generation failed'
    isGenerating.value = false
  }
}

function copyResult() {
  if (!resultContent.value) return
  uni.setClipboardData({
    data: resultContent.value,
    success: () => uni.showToast({ title: isZh.value ? '已复制' : 'Copied', icon: 'success' }),
  })
}

/** 保存为试卷到本地存储 */
const QUIZ_STORAGE_KEY = 'saved_quizzes'

function saveAsQuiz() {
  if (!resultContent.value) return

  try {
    const saved = JSON.parse(uni.getStorageSync(QUIZ_STORAGE_KEY) || '[]')
    const quiz = {
      id: `quiz-${Date.now()}`,
      title: `${subjectLabel.value}${isZh.value ? '试题' : ' Quiz'}`,
      subject: authStore.teacherSubject || 'politics',
      difficulty: selectedDifficulty.value,
      questionCount: totalCount.value,
      content: resultContent.value,
      createdAt: new Date().toISOString(),
    }
    saved.unshift(quiz)
    // 最多保存 50 份
    if (saved.length > 50) saved.length = 50
    uni.setStorageSync(QUIZ_STORAGE_KEY, JSON.stringify(saved))
    uni.showToast({ title: isZh.value ? '已保存为试卷' : 'Quiz saved', icon: 'success' })
  } catch (e) {
    console.error('Save quiz failed:', e)
    uni.showToast({ title: isZh.value ? '保存失败' : 'Save failed', icon: 'none' })
  }
}

/** 通用文件下载（H5 使用浏览器下载，小程序端降级为复制到剪贴板） */
function triggerDownload(content: string, filename: string, mimeType: string) {
  // #ifdef H5
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
    uni.showToast({ title: isZh.value ? '已导出' : 'Exported', icon: 'success' })
  } catch (e) {
    console.error('Export failed:', e)
    uni.showToast({ title: isZh.value ? '导出失败' : 'Export failed', icon: 'none' })
  }
  // #endif
  // #ifndef H5
  // 小程序端无 Blob/URL，降级为复制内容到剪贴板
  uni.setClipboardData({
    data: content,
    success: () =>
      uni.showToast({
        title: isZh.value ? '内容已复制，可粘贴保存' : 'Content copied',
        icon: 'success',
      }),
    fail: () => uni.showToast({ title: isZh.value ? '导出失败' : 'Export failed', icon: 'none' }),
  })
  // #endif
}

/** 弹出导出选择 */
function exportResult() {
  if (!resultContent.value) return
  showExportPicker.value = true
}

/** 去除答案和解析内容 */
function stripAnswers(text: string): string {
  return (
    text
      // 去除 > 答案：... 或 > **答案**... 引用块
      .replace(/^>\s*\*{0,2}(答案|解析|Answer|Explanation)\*{0,2}[：:].*/gm, '')
      // 去除 **答案：** ... 行
      .replace(/^\*{2}(答案|解析|Answer|Explanation)\*{2}[：:].*$/gm, '')
      // 去除 答案：X 单独行
      .replace(/^(答案|解析|Answer|Explanation)[：:].*/gm, '')
      // 清理多余空行
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

/** 导出试卷为 HTML */
function doExport(withAnswers: boolean) {
  showExportPicker.value = false
  const suffix = withAnswers
    ? isZh.value
      ? '(答案版)'
      : '(answers)'
    : isZh.value
      ? '(学生版)'
      : '(student)'
  const title = `${subjectLabel.value}${isZh.value ? '试题' : ' Quiz'} ${suffix} - ${new Date().toLocaleDateString()}`
  const content = withAnswers ? resultContent.value : stripAnswers(resultContent.value)

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title>
<style>
body{font-family:-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.8;}
h1{font-size:22px;text-align:center;color:#c00000;margin-bottom:24px;border-bottom:2px solid #c00000;padding-bottom:12px;}
h2{font-size:18px;color:#333;margin-top:24px;}
blockquote{border-left:3px solid #c00000;padding-left:12px;color:#666;margin:8px 0;}
</style></head><body>
<h1>${title}</h1>
${content.replace(/\n/g, '<br>')}
</body></html>`
  triggerDownload(html, `${title}.html`, 'text/html')
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
.qgen-page {
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
}

.theme-dark {
  --page-bg: #1a1315;
  --surface: rgba(26, 19, 21, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.24);
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

.main-scroll {
  flex: 1;
  padding: 0 24rpx;
}

// ===== 配置区 =====
.config-section {
  padding-top: 16rpx;
}

.config-card {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--surface);
  border: 1px solid var(--line);
}

.config-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.config-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.subject-display {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  border: 1.5px solid;
  background: rgba(192, 0, 0, 0.04);
  text {
    font-size: 28rpx;
  }
}

// 题型行
.type-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.type-label-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.type-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 4rpx;
}

.type-label {
  font-size: 26rpx;
  color: var(--text-main);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  border-radius: 12rpx;
  overflow: hidden;
  border: 1px solid var(--line);
}

.stepper-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--page-bg);
  &:active {
    opacity: 0.7;
  }
  text {
    font-size: 28rpx;
    color: var(--text-main);
    font-weight: 600;
  }
}

.stepper-value {
  width: 56rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  margin-top: 12rpx;
  border-top: 1px solid var(--line);
}

.total-label {
  font-size: 26rpx;
  color: var(--text-sub);
  font-weight: 600;
}

.total-value {
  font-size: 30rpx;
  font-weight: 700;
}

// 难度
.diff-options {
  display: flex;
  gap: 12rpx;
}

.diff-chip {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 14rpx;
  border: 1px solid var(--line);
  text-align: center;
  transition: all 0.15s ease;
  &:active {
    transform: scale(0.96);
  }
  text {
    font-size: 24rpx;
    font-weight: 600;
    color: var(--text-sub);
  }
  &.active text {
    color: #ffffff;
  }
}

// 附加选项
.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;
}

.option-label {
  font-size: 26rpx;
  color: var(--text-main);
}

.toggle {
  width: 80rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background: var(--line);
  position: relative;
  transition: background 0.2s ease;
}

.toggle-thumb {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.2s ease;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
}

.toggle.on .toggle-thumb {
  transform: translateX(36rpx);
}

.topic-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  margin-top: 12rpx;
  border-radius: 14rpx;
  border: 1px solid var(--line);
  background: var(--page-bg);
  font-size: 26rpx;
  color: var(--text-main);
}

.topic-placeholder {
  color: var(--text-soft);
}

// 生成按钮
.gen-btn {
  margin-top: 12rpx;
  margin-bottom: 24rpx;
  height: 96rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  transition: all 0.15s ease;
  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}

.gen-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}

// ===== 结果区 =====
.result-section {
  padding-top: 16rpx;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.result-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-main);
}

.result-count {
  font-size: 28rpx;
  font-weight: 700;
}

.gen-status {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: var(--surface);
  border: 1px solid var(--line);
  margin-bottom: 16rpx;
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
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

.gen-status-text {
  font-size: 24rpx;
  color: var(--text-soft);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.result-content-card {
  padding: 28rpx;
  border-radius: 20rpx;
  background: var(--surface);
  border: 1px solid var(--line);
  margin-bottom: 20rpx;
}

.result-actions {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.result-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  transition: all 0.15s ease;
  &:active {
    transform: scale(0.97);
  }

  &.outline {
    background: transparent;
    border: 1px solid var(--line);
  }

  text {
    font-size: 28rpx;
    font-weight: 600;
  }
}

// ===== 导出弹窗 =====
.export-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.export-sheet {
  width: 100%;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  border-radius: 28rpx 28rpx 0 0;
}

.export-sheet-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
  text-align: center;
  margin-bottom: 20rpx;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
  border: 1px solid var(--line);
  &:active {
    opacity: 0.7;
    transform: scale(0.98);
  }

  &.cancel {
    justify-content: center;
    margin-top: 8rpx;
    border: none;
    text {
      color: var(--text-soft);
      font-size: 28rpx;
    }
  }
}

.export-option-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.export-option-title {
  font-size: 28rpx;
  font-weight: 600;
}

.export-option-desc {
  font-size: 22rpx;
  color: var(--text-soft);
}
</style>
