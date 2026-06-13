<template>
  <view :class="['evaluation-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>

    <view v-if="step === 'intro'" class="content-wrap">
      <view class="insight-card intro-card">
        <view class="composer-icon large">
          <Icon name="quiz" :size="48" color="#886fde" />
        </view>
        <text class="intro-title">{{ introTitle }}</text>
        <text class="intro-desc">{{ introDesc }}</text>
        <view class="submit-btn intro-btn" @tap="startEvaluation">
          <text class="submit-text">{{ startLabel }}</text>
        </view>
      </view>
    </view>

    <view v-else-if="step === 'questions'" class="content-wrap">
      <view class="progress-row">
        <text class="progress-text">{{ progressText }}</text>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </view>
      </view>

      <view class="composer-card question-card">
        <view :key="currentIndex" class="question-slide">
          <text class="question-text">{{ currentQuestionText }}</text>
        <view class="options-list">
          <view
            v-for="opt in currentQuestion.options"
            :key="opt.value"
            class="chip option-chip"
            :class="{ active: currentAnswer === opt.value }"
            @tap="chooseOption(opt.value)"
          >
            <text>{{ currentQuestionOptionLabel(opt) }}</text>
          </view>
        </view>
        <view class="composer-row">
          <view v-if="currentIndex > 0" class="secondary-btn" @tap="prevQuestion">
            <text>{{ prevLabel }}</text>
          </view>
          <view class="submit-btn" :class="{ disabled: currentAnswer === null }" @tap="nextOrSubmit">
            <text class="submit-text">{{ nextOrSubmitLabel }}</text>
          </view>
        </view>
        </view>
      </view>
    </view>

    <view v-else-if="step === 'result'" class="content-wrap">
      <view class="insight-card result-card">
        <view class="composer-icon large">
          <Icon name="check_circle" :size="48" color="#886fde" />
        </view>
        <text class="intro-title">{{ resultTitle }}</text>
        <view class="score-row">
          <text class="score-value">{{ result.totalScore }}</text>
          <text class="score-sep">/</text>
          <text class="score-max">{{ result.maxScore }}</text>
        </view>
        <text class="result-desc">{{ resultDesc }}</text>
        <view class="ai-analysis-btn" @tap="showAiAnalysisModal">
          <text>{{ aiAnalysisLabel }}</text>
        </view>
        <view class="composer-row result-actions">
          <view class="secondary-btn" @tap="restart">
            <text>{{ againLabel }}</text>
          </view>
          <view class="secondary-btn" @tap="goBack">
            <text>{{ backLabel }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { EVALUATION_QUESTIONS, SCALE_ID_MOOD_SCREEN } from '@/data/evaluation-questions'
import mentalHealthAssessmentsService from '@/services/mental-health-assessments'
import type { EvaluationQuestion } from '@/types/psychology-evaluation'
import { useAuthStore } from '@/stores/auth'
import { usePointsStore } from '@/stores/points'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { usePsychologyNav } from '@/composables/usePsychologyNav'
import { buildAnswersForPersistence, computeEvaluationResult } from '@/utils/evaluation-result'
import { requireAuth } from '@/utils/auth-guard'

const { goBack } = usePsychologyNav()

const QUESTIONS = EVALUATION_QUESTIONS

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()
const pointsStore = usePointsStore()

const step = ref<'intro' | 'questions' | 'result'>('intro')
const currentIndex = ref(0)
const currentAnswer = ref<number | null>(null)
const answers = ref<Record<string, number>>({})
const result = ref<{ totalScore: number; maxScore: number; resultTier?: string }>({ totalScore: 0, maxScore: 0 })

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const pageTitle = computed(() => (isZh.value ? '心理测评' : 'Evaluation'))
const introTitle = computed(() => (isZh.value ? '简易情绪自评' : 'Quick Mood Self-Check'))
const introDesc = computed(() =>
  isZh.value
    ? `共 ${QUESTIONS.length} 道题，根据最近一周的感受选择最符合的选项。结果仅供参考，必要时请寻求专业帮助。`
    : `${QUESTIONS.length} questions. Choose the option that best fits how you've felt over the past week. Results are for reference only; seek professional help if needed.`
)
const startLabel = computed(() => (isZh.value ? '开始测评' : 'Start'))
const progressText = computed(() =>
  isZh.value ? `第 ${currentIndex.value + 1} / ${QUESTIONS.length} 题` : `Question ${currentIndex.value + 1} of ${QUESTIONS.length}`
)
const progressPercent = computed(() => ((currentIndex.value + 1) / QUESTIONS.length) * 100)
const prevLabel = computed(() => (isZh.value ? '上一题' : 'Previous'))
const nextOrSubmitLabel = computed(() =>
  currentIndex.value < QUESTIONS.length - 1 ? (isZh.value ? '下一题' : 'Next') : (isZh.value ? '提交' : 'Submit')
)
const resultTitle = computed(() => (isZh.value ? '测评完成' : 'Done'))
const resultDesc = computed(() => {
  const r = result.value
  const tier = r.resultTier || 'low'
  if (isZh.value) {
    if (tier === 'low')
      return '整体情绪较平稳，继续保持良好的自我觉察。规律作息和适度运动有助于维持好状态。如有需要，也可以到「心理咨询」页和助手聊聊。'
    if (tier === 'moderate')
      return '近期有一些情绪波动，可以多关注自己的状态，适当休息与放松。建议到「心理咨询」页和助手聊聊，或与身边信任的人倾诉。'
    if (tier === 'elevated')
      return '近期情绪起伏较明显。建议适当减少压力、保证休息，并到「心理咨询」页获得支持。若持续感到不适，请考虑联系学校心理咨询中心或专业机构。'
    return '若您持续感到情绪低落或难以调节，强烈建议寻求专业支持。可前往学校心理咨询中心或拨打心理热线。本结果仅供参考，不能替代专业评估。'
  }
  if (tier === 'low')
    return 'Your mood seems steady. Keep up self-awareness; rest and light exercise help. You can also chat in Counseling if you like.'
  if (tier === 'moderate')
    return 'Some fluctuation. Pay attention to how you feel and take breaks. Consider using Counseling or talking to someone you trust.'
  if (tier === 'elevated')
    return 'Noticeable ups and downs. Rest and reduce stress; try Counseling for support. If it persists, consider your campus counseling center or a professional.'
  return 'If you keep feeling low, please seek professional support (e.g. campus counseling or a helpline). This result is for reference only and not a diagnosis.'
})
const againLabel = computed(() => (isZh.value ? '再测一次' : 'Retake'))
const backLabel = computed(() => (isZh.value ? '返回' : 'Back'))
const aiAnalysisLabel = computed(() => (isZh.value ? 'AI 深度分析' : 'AI Deep Analysis'))

function showAiAnalysisModal() {
  uni.showModal({
    title: isZh.value ? 'AI 深度分析' : 'AI Deep Analysis',
    content: isZh.value ? '功能即将开放，敬请期待。' : 'Coming soon.',
    showCancel: false,
    confirmText: isZh.value ? '确定' : 'OK',
    confirmColor: '#886fde'
  })
}

const currentQuestion = computed(() => QUESTIONS[currentIndex.value]!)
const currentQuestionText = computed(() =>
  isZh.value ? currentQuestion.value.text : currentQuestion.value.textEn
)

function currentQuestionOptionLabel(opt: { label: string; labelEn: string }) {
  return isZh.value ? opt.label : opt.labelEn
}

function startEvaluation() {
  step.value = 'questions'
  currentIndex.value = 0
  answers.value = {}
  currentAnswer.value = answers.value[QUESTIONS[0]!.id] ?? null
}

function chooseOption(value: number) {
  currentAnswer.value = value
  answers.value[QUESTIONS[currentIndex.value]!.id] = value
}

function prevQuestion() {
  if (currentIndex.value <= 0) return
  currentIndex.value--
  currentAnswer.value = answers.value[QUESTIONS[currentIndex.value]!.id] ?? null
}

async function nextOrSubmit() {
  if (currentAnswer.value === null) return
  if (currentIndex.value < QUESTIONS.length - 1) {
    currentIndex.value++
    currentAnswer.value = answers.value[QUESTIONS[currentIndex.value]!.id] ?? null
  } else {
    const computedResult = computeEvaluationResult(QUESTIONS, answers.value)
    result.value = {
      totalScore: computedResult.totalScore,
      maxScore: computedResult.maxScore,
      resultTier: computedResult.resultTier
    }
    try {
      await mentalHealthAssessmentsService.createAssessment({
        scaleId: SCALE_ID_MOOD_SCREEN,
        totalScore: computedResult.totalScore,
        maxScore: computedResult.maxScore,
        answers: buildAnswersForPersistence(QUESTIONS, answers.value),
        resultTier: computedResult.resultTier
      })
      const userId = authStore.dbUser?.$id
      if (userId) {
        await pointsStore.completeDailyTask(userId, 'evaluation_complete')
        pointsStore.checkAndUnlockAchievement(userId, 'first_evaluation')
      }
    } catch (err) {
      console.error('Save assessment failed:', err)
      uni.showToast({
        title: isZh.value ? '保存结果失败' : 'Failed to save result',
        icon: 'none'
      })
    }
    step.value = 'result'
  }
}

function restart() {
  step.value = 'intro'
  currentIndex.value = 0
  currentAnswer.value = null
  answers.value = {}
}

onShow(() => {
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('psychology')
  requireAuth('/pages/psychology/evaluation')
})
</script>

<style lang="scss" scoped>
@import '@/styles/psychology-vars.scss';

.evaluation-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  @include psychology-theme-light;
}

.theme-dark {
  @include psychology-theme-dark;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  @include psychology-topbar-safe-area;
  @include psychology-card-glass;
  background: var(--topbar-bg);

  .left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
}

.title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.content-wrap {
  margin-top: 14rpx;
}

.insight-card {
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: linear-gradient(135deg, rgba(136, 111, 222, 0.16), rgba(136, 111, 222, 0.06));
  padding: 28rpx;
  @include psychology-card-glass;
}

.intro-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16rpx;
}

.composer-icon.large {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: rgba(136, 111, 222, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.intro-title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.intro-desc {
  color: var(--text-sub);
  font-size: 26rpx;
  line-height: 1.6;
  max-width: 560rpx;
}

.intro-btn {
  margin-top: 10rpx;
}

.progress-row {
  margin-bottom: 18rpx;
}

.progress-text {
  color: var(--text-sub);
  font-size: 22rpx;
  display: block;
  margin-bottom: 8rpx;
}

.progress-bar {
  height: 8rpx;
  border-radius: 999rpx;
  background: var(--line);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #886fde;
  transition: width 0.2s ease;
}

.composer-card {
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  padding: 24rpx;
  @include psychology-card-glass;
}

.question-card {
  margin-top: 0;
}

.question-slide {
  animation: questionSlideIn 0.25s ease;
}

@keyframes questionSlideIn {
  from {
    opacity: 0;
    transform: translateX(24rpx);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.question-text {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.5;
  display: block;
  margin-bottom: 22rpx;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.chip {
  min-height: 56rpx;
  border: 1px solid var(--line);
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  color: var(--text-sub);
  font-size: 26rpx;
  display: flex;
  align-items: center;
}

.option-chip.active {
  background: rgba(136, 111, 222, 0.2);
  color: #7359d3;
  border-color: rgba(136, 111, 222, 0.36);
}

.composer-row {
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
}

.secondary-btn {
  border-radius: 16rpx;
  border: 1px solid rgba(136, 111, 222, 0.5);
  background: rgba(136, 111, 222, 0.08);
  padding: 12rpx 24rpx;
  color: #886fde;
  font-size: 24rpx;
}

.submit-btn {
  border-radius: 16rpx;
  background: #886fde;
  padding: 12rpx 26rpx;
  box-shadow: 0 8rpx 18rpx rgba(136, 111, 222, 0.28);
}

.submit-btn.disabled {
  opacity: 0.5;
}

.submit-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}

.result-desc {
  display: block;
  margin-bottom: 20rpx;
  color: var(--text-sub);
  font-size: 26rpx;
  line-height: 1.6;
  max-width: 520rpx;
}

.ai-analysis-btn {
  margin-bottom: 20rpx;
  padding: 14rpx 24rpx;
  border-radius: 16rpx;
  background: #886fde;
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 18rpx rgba(136, 111, 222, 0.28);
}

.result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14rpx;
}

.score-row {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.score-value {
  color: #886fde;
  font-size: 56rpx;
  font-weight: 700;
}

.score-sep {
  color: var(--text-soft);
  font-size: 32rpx;
}

.score-max {
  color: var(--text-sub);
  font-size: 32rpx;
}


.result-actions {
  margin-top: 20rpx;
  width: 100%;
  justify-content: center;
}
</style>
