<template>
  <view :class="['exam-edit-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ isEdit ? '编辑考试' : '添加考试' }}</text>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-content">
        <text class="hero-title">{{ isEdit ? '修改考试计划' : '新建考试计划' }}</text>
        <text class="hero-subtitle">记录考试安排，设置复习任务，轻松备考</text>
      </view>
      <view class="hero-icon">
        <Icon name="quiz" :size="120" color="rgba(74, 144, 226, 0.22)" />
      </view>
    </view>

    <view class="form-card">
      <view class="field-block">
        <text class="field-title">科目名称 *</text>
        <input
          v-model="form.subject"
          class="field-input"
          placeholder="例如：高等数学 II"
          maxlength="200"
        />
      </view>

      <view class="field-block">
        <text class="field-title">考试类型 *</text>
        <view class="chip-row">
          <view
            v-for="opt in typeOptions"
            :key="opt.value"
            :class="['chip', { active: form.examType === opt.value }]"
            @tap="form.examType = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">考试时间 *</text>
        <picker mode="date" :value="examDateStr" @change="onDateChange">
          <view class="picker-display">
            <text :class="['picker-text', { placeholder: !examDateStr }]">
              {{ examDateStr || '选择考试日期' }}
            </text>
            <Icon name="calendar_month" :size="18" color="#4A90E2" />
          </view>
        </picker>
        <view class="time-range-row">
          <picker mode="time" :value="startTimeStr" @change="onStartTimeChange" class="time-picker-half">
            <view class="picker-display">
              <text :class="['picker-text', { placeholder: !startTimeStr }]">
                {{ startTimeStr || '开始时间' }}
              </text>
              <Icon name="schedule" :size="18" color="#4A90E2" />
            </view>
          </picker>
          <text class="time-sep">—</text>
          <picker mode="time" :value="endTimeStr" @change="onEndTimeChange" class="time-picker-half">
            <view class="picker-display">
              <text :class="['picker-text', { placeholder: !endTimeStr }]">
                {{ endTimeStr || '结束时间' }}
              </text>
              <Icon name="schedule" :size="18" color="#4A90E2" />
            </view>
          </picker>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">考试地点</text>
        <input
          v-model="form.location"
          class="field-input"
          placeholder="例如：教学楼 A-301"
          maxlength="200"
        />
      </view>

      <view class="field-block">
        <text class="field-title">备注</text>
        <textarea
          v-model="form.notes"
          class="field-textarea"
          placeholder="考试范围、注意事项等"
          maxlength="2000"
        />
      </view>

      <view class="field-block">
        <view class="field-head">
          <text class="field-title">复习任务</text>
          <text class="field-tip">可选，分步复习更高效</text>
        </view>
        <view class="tasks-list">
          <view v-for="(task, idx) in tasks" :key="idx" class="task-row">
            <input
              v-model="task.title"
              class="task-input"
              :placeholder="`任务 ${idx + 1}`"
              maxlength="200"
            />
            <view class="task-remove" @tap="removeTask(idx)">
              <Icon name="close" :size="14" :color="iconColor" />
            </view>
          </view>
          <view class="add-task-btn" @tap="addTask">
            <Icon name="add" :size="16" color="#4A90E2" />
            <text class="add-task-text">添加任务</text>
          </view>
        </view>
      </view>

      <view class="submit-row">
        <view :class="['submit-btn', { disabled: submitting }]" @tap="handleSubmit">
          <text class="submit-text">{{ submitting ? '保存中...' : '保存计划' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import examPlansService from '@/services/exam-plans'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { ExamTask, ExamType } from '@/types/exam-plan'
import { requireAuth } from '@/utils/auth-guard'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const submitting = ref(false)
const editId = ref('')
const isEdit = computed(() => !!editId.value)

const form = reactive({
  subject: '',
  examType: 'final' as ExamType,
  location: '',
  notes: ''
})

const examDateStr = ref('')
const startTimeStr = ref('')
const endTimeStr = ref('')
const tasks = ref<ExamTask[]>([])

const typeOptions: { value: ExamType; label: string }[] = [
  { value: 'midterm', label: '期中' },
  { value: 'final', label: '期末' },
  { value: 'quiz', label: '小测' }
]

const onDateChange = (e: { detail: { value: string } }) => { examDateStr.value = e.detail.value }
const onStartTimeChange = (e: { detail: { value: string } }) => { startTimeStr.value = e.detail.value }
const onEndTimeChange = (e: { detail: { value: string } }) => { endTimeStr.value = e.detail.value }

const addTask = () => {
  if (tasks.value.length >= 20) {
    uni.showToast({ title: '最多 20 个任务', icon: 'none' })
    return
  }
  tasks.value.push({ title: '', done: false })
}
const removeTask = (idx: number) => { tasks.value.splice(idx, 1) }

const validate = () => {
  if (!form.subject.trim()) { uni.showToast({ title: '请输入科目名称', icon: 'none' }); return false }
  if (!examDateStr.value) { uni.showToast({ title: '请选择考试日期', icon: 'none' }); return false }
  return true
}

const handleSubmit = async () => {
  if (submitting.value) return
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  if (!validate()) return

  submitting.value = true
  try {
    const sTime = startTimeStr.value || '00:00'
    const examDate = new Date(`${examDateStr.value}T${sTime}:00`).toISOString()
    let examEndDate = ''
    if (endTimeStr.value) {
      examEndDate = new Date(`${examDateStr.value}T${endTimeStr.value}:00`).toISOString()
    }
    const validTasks = tasks.value.filter(t => t.title.trim())

    const payload = {
      subject: form.subject.trim(),
      examType: form.examType,
      examDate,
      examEndDate: examEndDate || undefined,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      tasks: validTasks.length ? validTasks : undefined
    }

    if (isEdit.value) {
      await examPlansService.updateExamPlan(editId.value, payload)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await examPlansService.createExamPlan(payload)
      uni.showToast({ title: '添加成功', icon: 'success' })
    }

    setTimeout(() => {
      uni.redirectTo({ url: '/pages/study/exam/index' })
    }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '保存失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/study/exam/index' })
  }
}

const parseDateTimeStr = (iso: string) => {
  const d = new Date(iso)
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { dateStr, timeStr }
}

const loadExam = async (id: string) => {
  try {
    const exam = await examPlansService.getExamPlan(id)
    form.subject = exam.subject
    form.examType = exam.examType
    form.location = exam.location || ''
    form.notes = exam.notes || ''
    const start = parseDateTimeStr(exam.examDate)
    examDateStr.value = start.dateStr
    startTimeStr.value = start.timeStr
    if (exam.examEndDate) {
      const end = parseDateTimeStr(exam.examEndDate)
      endTimeStr.value = end.timeStr
    }
    tasks.value = examPlansService.parseTasks(exam.tasks)
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

onLoad((query) => {
  if (query?.id) {
    editId.value = query.id as string
    loadExam(editId.value)
  }
})

onShow(() => {
  uiPreferencesStore.initFromSystem()
  requireAuth('/pages/study/exam/edit')
})
</script>

<style scoped lang="scss">
.exam-edit-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --line: rgba(74, 144, 226, 0.12);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(246, 246, 248, 0.92);
  --input-bg: rgba(74, 144, 226, 0.06);
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.72);
  --line: rgba(74, 144, 226, 0.24);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 28, 42, 0.92);
  --input-bg: rgba(74, 144, 226, 0.08);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  backdrop-filter: blur(14px);
  background: var(--topbar-bg);
}

.left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.hero-card {
  margin-top: 14rpx;
  border: 1px solid var(--line);
  border-radius: 26rpx;
  background: linear-gradient(130deg, rgba(74, 144, 226, 0.22), rgba(74, 144, 226, 0.08));
  padding: 30rpx 24rpx;
  position: relative;
  overflow: hidden;
}

.hero-content {
  width: 72%;
  position: relative;
  z-index: 2;
}

.hero-title {
  color: var(--text-main);
  font-size: 36rpx;
  line-height: 1.3;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 8rpx;
  color: var(--text-sub);
  font-size: 22rpx;
  line-height: 1.5;
}

.hero-icon {
  position: absolute;
  right: -12rpx;
  bottom: -14rpx;
}

.form-card {
  margin-top: 18rpx;
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  padding: 24rpx;
}

.field-block {
  margin-top: 20rpx;
}

.field-block:first-child {
  margin-top: 0;
}

.field-title {
  color: var(--text-sub);
  font-size: 24rpx;
  font-weight: 600;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-tip {
  color: var(--text-soft);
  font-size: 20rpx;
}

.field-input {
  margin-top: 10rpx;
  width: 100%;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: 14rpx;
  background: var(--input-bg);
  border: 1px solid var(--line);
  color: var(--text-main);
  font-size: 26rpx;
}

.field-textarea {
  margin-top: 10rpx;
  width: 100%;
  min-height: 160rpx;
  padding: 14rpx 18rpx;
  border-radius: 14rpx;
  background: var(--input-bg);
  border: 1px solid var(--line);
  color: var(--text-main);
  font-size: 26rpx;
}

.picker-display {
  margin-top: 10rpx;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: 14rpx;
  background: var(--input-bg);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-text {
  color: var(--text-main);
  font-size: 26rpx;
}

.picker-text.placeholder {
  color: var(--text-soft);
}

.time-range-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.time-picker-half {
  flex: 1;
}

.time-sep {
  color: var(--text-soft);
  font-size: 28rpx;
  flex-shrink: 0;
}

.chip-row {
  margin-top: 10rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.chip {
  min-height: 56rpx;
  border: 1px solid var(--line);
  border-radius: 999rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: var(--text-sub);
    font-size: 24rpx;
  }
}

.chip.active {
  background: rgba(74, 144, 226, 0.18);
  border-color: rgba(74, 144, 226, 0.45);

  text { color: #3a7bc8; }
}

.tasks-list {
  margin-top: 10rpx;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 10rpx;
}

.task-input {
  flex: 1;
  height: 64rpx;
  padding: 0 16rpx;
  border-radius: 12rpx;
  background: var(--input-bg);
  border: 1px solid var(--line);
  color: var(--text-main);
  font-size: 24rpx;
}

.task-remove {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.12);
  flex-shrink: 0;
}

.add-task-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 0;
}

.add-task-text {
  color: #4A90E2;
  font-size: 24rpx;
  font-weight: 600;
}

.submit-row {
  margin-top: 30rpx;
}

.submit-btn {
  height: 88rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #4A90E2, #3f7dcb);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 144, 226, 0.35);
}

.submit-btn.disabled {
  opacity: 0.72;
  box-shadow: none;
}

.submit-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
