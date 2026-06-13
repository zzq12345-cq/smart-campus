<template>
  <teleport to="body">
    <view class="floating-ai-button" @tap="handleTap">
      <!-- Chat bubble -->
      <view
        v-if="showTooltip"
        class="chat-bubble"
        :style="{
          background: bubbleBg,
          borderColor: bubbleBorderColor,
          '--accent': sectionColor,
          '--accent-soft': accentSoft
        }"
      >
        <view class="bubble-avatar" :style="{ background: sectionColor }">
          <RobotAvatar :skin-id="pointsStore.equippedSkinId" size="small" />
        </view>
        <view class="bubble-body">
          <text v-if="tooltipCategory" class="bubble-tag" :style="{ color: sectionColor }">
            {{ tooltipCategory }}
          </text>
          <text class="bubble-text" :style="{ color: bubbleTextColor }">{{ tooltipText }}</text>
        </view>
        <view class="bubble-tail" :style="{ '--tail-bg': bubbleBg, '--tail-border': bubbleBorderColor }"></view>
      </view>

      <view class="button-wrapper" :style="{ background: sectionColor, boxShadow: buttonShadow }">
        <RobotAvatar :skin-id="pointsStore.equippedSkinId" size="medium" />
      </view>
    </view>
  </teleport>
</template>

<script setup lang="ts">
/**
 * FloatingAiButton Component
 *
 * Floating AI robot entry button
 * Fixed positioning at bottom-right corner
 * Navigates to full-screen AI chat page on tap
 * Color changes based on active section from global store
 *
 * @example
 * <FloatingAiButton />
 */

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { I18N_KEYS, type I18nKey } from '@/i18n/keys'
import mentalHealthInsightsService from '@/services/mental-health-insights'
import type { MentalHealthTooltipMessage } from '@/types/mental-health'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { usePointsStore } from '@/stores/points'
import RobotAvatar from '@/components/common/RobotAvatar.vue'
import type { TabSection } from '@/types/ui'
import { localizeMentalHealthText } from '@/utils/mental-health-localization'

// Props definition
interface Props {
  showTooltip?: boolean // Show tooltip on first load
  tooltipKey?: I18nKey // i18n key for tooltip copy
}

const props = withDefaults(defineProps<Props>(), {
  showTooltip: true,
  tooltipKey: I18N_KEYS.commonAiTooltip
})

interface MockAiPushMessage {
  id: string
  category: string
  text: string
  riskLevel?: number
}

const TOOLTIP_DISPLAY_DURATION = 4200
const PUSH_INTERVAL_MIN = 6000
const PUSH_INTERVAL_MAX = 15000

const mockAiPushMessages: MockAiPushMessage[] = [
  {
    id: 'psychology-sleep',
    category: '心理预警',
    text: '你最近连续几天睡得有点晚，今晚记得 23:30 前放下手机休息。'
  },
  {
    id: 'psychology-stress',
    category: '心理预警',
    text: '本周压力指数偏高，建议中午抽 10 分钟做一次深呼吸或散步。'
  },
  {
    id: 'study-class',
    category: '上课提醒',
    text: '15:20 在 2 教 403 有《数据结构》课程，别忘了提前 10 分钟到教室。'
  },
  {
    id: 'study-quiz',
    category: '上课提醒',
    text: '明早 08:00 高数随堂测验，今晚把错题本再快速过一遍。'
  },
  {
    id: 'activity-workshop',
    category: '活动提醒',
    text: '今晚 19:00 心理中心有情绪减压工作坊，现在还可以现场报名。'
  },
  {
    id: 'activity-club',
    category: '活动提醒',
    text: '周末社团嘉年华开始招募志愿者了，感兴趣的话可以先锁定名额。'
  },
  {
    id: 'career-fair',
    category: '就业信息',
    text: '校招专场明天 14:00 在大学生活动中心开始，记得带上纸质简历。'
  },
  {
    id: 'career-internship',
    category: '就业信息',
    text: '就业办刚更新了 3 个实习岗位，适合大三同学这周内投递。'
  }
]

// Local tooltip state
const showTooltip = ref(props.showTooltip)
const uiPreferencesStore = useUiPreferencesStore()
const pointsStore = usePointsStore()
const availablePushMessages = ref<MockAiPushMessage[]>(mockAiPushMessages)
const currentPushMessage = ref<MockAiPushMessage | null>(
  props.showTooltip ? pickRandomPushMessage() : null
)

let hideTimer: ReturnType<typeof setTimeout> | null = null
let nextPushTimer: ReturnType<typeof setTimeout> | null = null

const sectionColors: Record<TabSection, string> = {
  study: '#4A90E2',
  life: '#f49d25',
  psychology: '#886fde',
  mine: '#6fde81'
}

// Get section color from active section in store
const sectionColor = computed(
  () => sectionColors[uiPreferencesStore.activeSection] || sectionColors.psychology
)
const buttonShadow = computed(() => `0 8px 24px ${sectionColor.value}66`)
const tooltipText = computed(
  () => currentPushMessage.value?.text || t(props.tooltipKey, uiPreferencesStore.locale)
)
const tooltipCategory = computed(() => currentPushMessage.value?.category || '')
const isLight = computed(() => uiPreferencesStore.theme === 'light')
const bubbleBg = computed(() => (isLight.value ? '#ffffff' : '#1e293b'))
const bubbleBorderColor = computed(() =>
  isLight.value ? `${sectionColor.value}33` : `${sectionColor.value}55`
)
const bubbleTextColor = computed(() => (isLight.value ? '#334155' : '#e2e8f0'))
const accentSoft = computed(() => `${sectionColor.value}18`)

function pickRandomPushMessage() {
  const source = availablePushMessages.value.length ? availablePushMessages.value : mockAiPushMessages
  const randomIndex = Math.floor(Math.random() * source.length)
  return source[randomIndex] || null
}

function getRandomPushDelay() {
  return PUSH_INTERVAL_MIN + Math.floor(Math.random() * (PUSH_INTERVAL_MAX - PUSH_INTERVAL_MIN + 1))
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function clearNextPushTimer() {
  if (nextPushTimer) {
    clearTimeout(nextPushTimer)
    nextPushTimer = null
  }
}

function clearPushTimers() {
  clearHideTimer()
  clearNextPushTimer()
}

function scheduleTooltipHide() {
  if (!props.showTooltip) return

  clearHideTimer()
  hideTimer = setTimeout(() => {
    showTooltip.value = false
    scheduleNextPush()
  }, TOOLTIP_DISPLAY_DURATION)
}

function showRandomPushMessage() {
  if (!props.showTooltip) return

  clearNextPushTimer()
  currentPushMessage.value = pickRandomPushMessage()
  showTooltip.value = true
  scheduleTooltipHide()
}

function scheduleNextPush() {
  if (!props.showTooltip) return

  clearNextPushTimer()
  nextPushTimer = setTimeout(() => {
    showRandomPushMessage()
  }, getRandomPushDelay())
}

function normalizeInsightMessages(messages: MentalHealthTooltipMessage[]) {
  return messages.map((item) => ({
    id: item.id,
    category: localizeMentalHealthText(item.category, uiPreferencesStore.locale),
    text: localizeMentalHealthText(item.text, uiPreferencesStore.locale),
    riskLevel: item.riskLevel
  }))
}

async function loadRealPushMessages() {
  try {
    const messages = await mentalHealthInsightsService.listTooltipMessages(8)
    availablePushMessages.value = messages.length ? normalizeInsightMessages(messages) : mockAiPushMessages
  } catch {
    availablePushMessages.value = mockAiPushMessages
  }

  if (showTooltip.value) {
    currentPushMessage.value = pickRandomPushMessage()
  }
}

// Handle button tap
const handleTap = () => {
  clearHideTimer()
  showTooltip.value = false

  // If there's an active push message, navigate to notifications tab
  if (currentPushMessage.value) {
    // Navigate to AI chat page's notifications tab
    uni.navigateTo({
      url: '/pages/ai/chat?tab=notifications'
    })
  } else {
    // Navigate to AI chat page's chat tab (default)
    uni.navigateTo({
      url: '/pages/ai/chat'
    })
  }

  if (props.showTooltip) {
    scheduleNextPush()
  }
}

onMounted(() => {
  loadRealPushMessages()
  if (showTooltip.value) {
    scheduleTooltipHide()
  }
})

onBeforeUnmount(() => {
  clearPushTimers()
})
</script>

<style lang="scss" scoped>
.floating-ai-button {
  position: fixed;
  bottom: calc(190rpx + env(safe-area-inset-bottom, 0px));
  right: 24rpx;
  z-index: 10020;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.button-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;

  &:active {
    transform: scale(0.95);
  }

  animation: float 2.4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

/* ── Chat Bubble ── */
.chat-bubble {
  position: relative;
  width: 220px;
  margin-right: 5px;
  padding: 12px 14px 12px 12px;
  border-radius: 18px 18px 14px 18px;
  border: 1.5px solid;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 10px;
  animation: bubbleIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.bubble-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.bubble-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bubble-tag {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.04em;
}

.bubble-text {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.02em;
  word-break: break-all;
}

.bubble-tail {
  position: absolute;
  bottom: -7px;
  right: 16px;
  width: 14px;
  height: 14px;
  background: var(--tail-bg, #fff);
  border-right: 1.5px solid var(--tail-border, transparent);
  border-bottom: 1.5px solid var(--tail-border, transparent);
  transform: rotate(45deg);
  border-radius: 0 0 3px 0;
}

@keyframes bubbleIn {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
