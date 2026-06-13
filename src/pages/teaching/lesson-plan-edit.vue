<template>
  <view :class="['lesson-edit-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="title">{{ isEditing ? (isZh ? '编辑教案' : 'Edit Plan') : (isZh ? '新建教案' : 'New Plan') }}</text>
      <view class="icon-btn" @tap="savePlan">
        <Icon name="save" :size="20" :color="subjectColor" />
      </view>
    </view>

    <scroll-view class="form-scroll" scroll-y>
      <!-- 课题名称 -->
      <view class="form-group">
        <text class="form-label">{{ isZh ? '课题名称' : 'Title' }} *</text>
        <input v-model="form.title" class="form-input" :placeholder="isZh ? '输入课题名称' : 'Enter title'" />
      </view>

      <!-- 科目 & 年级 -->
      <view class="form-row">
        <view class="form-group half">
          <text class="form-label">{{ isZh ? '科目' : 'Subject' }}</text>
          <view class="form-select" @tap="showSubjectPicker = true">
            <text :class="['form-select-text', { placeholder: !form.subject }]">
              {{ form.subject ? subjectDisplayName : (isZh ? '选择科目' : 'Select') }}
            </text>
            <Icon name="expand_more" :size="16" color="#94a3b8" />
          </view>
        </view>
        <view class="form-group half">
          <text class="form-label">{{ isZh ? '年级/班级' : 'Grade' }}</text>
          <input v-model="form.grade" class="form-input" :placeholder="isZh ? '如：高一(3)班' : 'e.g. Grade 10'" />
        </view>
      </view>

      <!-- 课时 & 教学方法 -->
      <view class="form-row">
        <view class="form-group half">
          <text class="form-label">{{ isZh ? '课时(分钟)' : 'Duration(min)' }}</text>
          <input v-model.number="form.duration" class="form-input" type="number" placeholder="45" />
        </view>
        <view class="form-group half">
          <text class="form-label">{{ isZh ? '教学方法' : 'Method' }}</text>
          <input v-model="form.teachingMethod" class="form-input" :placeholder="isZh ? '如：讲授+讨论' : 'e.g. Lecture'" />
        </view>
      </view>

      <!-- 教学目标 -->
      <view class="form-group">
        <text class="form-label">{{ isZh ? '教学目标' : 'Objectives' }}</text>
        <textarea
          v-model="form.objectives"
          class="form-textarea"
          :placeholder="isZh ? '描述本节课的教学目标' : 'Describe learning objectives'"
          :maxlength="2000"
          auto-height
        />
      </view>

      <!-- 教学内容 -->
      <view class="form-group">
        <text class="form-label">{{ isZh ? '教学内容' : 'Content' }}</text>
        <textarea
          v-model="form.content"
          class="form-textarea tall"
          :placeholder="isZh ? '详细的教学内容' : 'Detailed teaching content'"
          :maxlength="5000"
          auto-height
        />
      </view>

      <!-- 教学重难点 -->
      <view class="form-group">
        <text class="form-label">{{ isZh ? '教学重难点' : 'Key Points' }}</text>
        <textarea
          v-model="form.keyPoints"
          class="form-textarea"
          :placeholder="isZh ? '本节课的重点和难点' : 'Key and difficult points'"
          :maxlength="2000"
          auto-height
        />
      </view>

      <!-- 课后作业 -->
      <view class="form-group">
        <text class="form-label">{{ isZh ? '课后作业' : 'Homework' }}</text>
        <textarea
          v-model="form.homework"
          class="form-textarea"
          :placeholder="isZh ? '布置给学生的作业或练习' : 'Homework assignments'"
          :maxlength="2000"
          auto-height
        />
      </view>

      <!-- 教学反思 -->
      <view class="form-group">
        <text class="form-label">{{ isZh ? '教学反思' : 'Reflection' }}</text>
        <textarea
          v-model="form.reflection"
          class="form-textarea"
          :placeholder="isZh ? '课后教学反思与改进' : 'Post-class reflection'"
          :maxlength="2000"
          auto-height
        />
      </view>

      <!-- 备注 -->
      <view class="form-group last">
        <text class="form-label">{{ isZh ? '备注' : 'Notes' }}</text>
        <textarea
          v-model="form.notes"
          class="form-textarea"
          :placeholder="isZh ? '其他补充说明' : 'Additional notes'"
          :maxlength="1000"
          auto-height
        />
      </view>
    </scroll-view>

    <!-- 底部操作 -->
    <view class="bottom-bar">
      <view class="save-btn outline" @tap="saveDraft">
        <text class="save-btn-text outline-text">{{ saving ? '...' : (isZh ? '保存草稿' : 'Save Draft') }}</text>
      </view>
      <view class="save-btn primary" :style="{ background: subjectColor }" @tap="saveAndPublish">
        <text class="save-btn-text">{{ saving ? '...' : (isZh ? '保存并发布' : 'Publish') }}</text>
      </view>
    </view>

    <!-- 科目选择弹窗 -->
    <view v-if="showSubjectPicker" class="picker-mask" @tap="showSubjectPicker = false">
      <view class="picker-sheet" @tap.stop>
        <text class="picker-title">{{ isZh ? '选择科目' : 'Select Subject' }}</text>
        <view
          v-for="s in subjectOptions"
          :key="s.id"
          :class="['picker-item', { active: form.subject === s.id }]"
          @tap="pickSubject(s.id)"
        >
          <Icon :name="s.icon" :size="20" :color="s.color" />
          <text :style="form.subject === s.id ? { color: s.color, fontWeight: '600' } : {}">
            {{ isZh ? s.name : s.nameEn }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { SUBJECT_LIST, getSubjectConfig } from '@/teacher/types/subjects'
import type { TeacherSubject } from '@/teacher/types/subjects'
import lessonPlansService from '@/teacher/services/lesson-plans'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8')
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const currentSubject = computed(() => getSubjectConfig(authStore.teacherSubject) || SUBJECT_LIST[3])
const subjectColor = computed(() => currentSubject.value.color)

const form = reactive({
  title: '',
  subject: authStore.teacherSubject || 'politics',
  grade: '',
  objectives: '',
  content: '',
  keyPoints: '',
  duration: 45,
  teachingMethod: '',
  homework: '',
  reflection: '',
  notes: ''
})

const planId = ref('')
const isEditing = computed(() => Boolean(planId.value))
const saving = ref(false)
const showSubjectPicker = ref(false)
const subjectOptions = SUBJECT_LIST

const subjectDisplayName = computed(() => {
  const config = getSubjectConfig(form.subject)
  return config ? (isZh.value ? config.name : config.nameEn) : form.subject
})

function pickSubject(id: TeacherSubject) {
  form.subject = id
  showSubjectPicker.value = false
}

async function loadPlan(id: string) {
  try {
    const plan = await lessonPlansService.getLessonPlan(id)
    form.title = plan.title || ''
    form.subject = plan.subject || authStore.teacherSubject || 'politics'
    form.grade = plan.grade || ''
    form.objectives = plan.objectives || ''
    form.content = plan.content || ''
    form.keyPoints = plan.keyPoints || ''
    form.duration = plan.duration || 45
    form.teachingMethod = plan.teachingMethod || ''
    form.homework = plan.homework || ''
    form.reflection = plan.reflection || ''
    form.notes = plan.notes || ''

    // 如果各字段为空但 content 有内容（AI 生成的整段文本），自动解析拆分
    if (form.content && !form.objectives && !form.keyPoints && !form.homework) {
      parseAiContent(form.content)
    }
  } catch (e) {
    console.error('Load plan failed:', e)
    uni.showToast({ title: isZh.value ? '加载失败' : 'Load failed', icon: 'none' })
  }
}

/** 从 AI 生成的整段教案文本中提取各字段 */
function parseAiContent(raw: string) {
  const extract = (patterns: RegExp[]): string => {
    for (const re of patterns) {
      const m = raw.match(re)
      if (m?.[1]?.trim()) return m[1].trim()
    }
    return ''
  }

  // 提取年级
  if (!form.grade) {
    form.grade = extract([
      /[【\[]年级[】\]]\s*[:：]?\s*(.+?)(?=\n[【\[]|$)/s,
      /##\s*年级\s*\n([\s\S]+?)(?=\n##|$)/
    ])
  }

  // 提取教学目标
  if (!form.objectives) {
    form.objectives = extract([
      /[【\[]教学目标[】\]]\s*[:：]?\s*([\s\S]+?)(?=\n[【\[]|$)/,
      /##\s*教学目标\s*\n([\s\S]+?)(?=\n##|$)/
    ])
  }

  // 提取教学重难点
  if (!form.keyPoints) {
    form.keyPoints = extract([
      /[【\[]教学重难点[】\]]\s*[:：]?\s*([\s\S]+?)(?=\n[【\[]|$)/,
      /[【\[]重[点难]+[】\]]\s*[:：]?\s*([\s\S]+?)(?=\n[【\[]|$)/,
      /##\s*教学重难点\s*\n([\s\S]+?)(?=\n##|$)/
    ])
  }

  // 提取课时
  if (form.duration === 45) {
    const durStr = extract([
      /[【\[]课时[】\]]\s*[:：]?\s*(.+?)(?=\n|$)/,
      /(\d+)\s*分钟/
    ])
    const durNum = parseInt(durStr)
    if (durNum > 0 && durNum <= 300) form.duration = durNum
  }

  // 提取教学方法
  if (!form.teachingMethod) {
    form.teachingMethod = extract([
      /[【\[]教学方法[】\]]\s*[:：]?\s*(.+?)(?=\n[【\[]|$)/,
      /##\s*教学方法\s*\n([\s\S]+?)(?=\n##|$)/
    ])
  }

  // 提取课后作业
  if (!form.homework) {
    form.homework = extract([
      /[【\[]课后作业[】\]]\s*[:：]?\s*([\s\S]+?)(?=\n[【\[]|$)/,
      /##\s*课后作业\s*\n([\s\S]+?)(?=\n##|$)/
    ])
  }

  // 提取教学反思
  if (!form.reflection) {
    form.reflection = extract([
      /[【\[]教学反思[】\]]\s*[:：]?\s*([\s\S]+?)(?=\n[【\[]|$)/,
      /##\s*教学反思\s*\n([\s\S]+?)(?=\n##|$)/
    ])
  }

  // 提取教学内容/步骤（如果原始 content 被拆分后，保留主体）
  const mainContent = extract([
    /[【\[]教学内容[】\]]\s*[:：]?\s*([\s\S]+?)(?=\n[【\[]|$)/,
    /[【\[]教学步骤[】\]]\s*[:：]?\s*([\s\S]+?)(?=\n[【\[]|$)/,
    /##\s*教学(?:内容|步骤)\s*\n([\s\S]+?)(?=\n##|$)/
  ])
  if (mainContent) form.content = mainContent
}

async function savePlan() {
  await saveDraft()
}

async function saveDraft() {
  if (!form.title.trim()) {
    uni.showToast({ title: isZh.value ? '请输入课题名称' : 'Title required', icon: 'none' })
    return
  }
  saving.value = true
  try {
    if (isEditing.value) {
      await lessonPlansService.updateLessonPlan(planId.value, { ...form })
    } else {
      const created = await lessonPlansService.createLessonPlan({ ...form })
      planId.value = created.$id
    }
    uni.showToast({ title: isZh.value ? '已保存' : 'Saved', icon: 'success' })
  } catch (e) {
    console.error('Save failed:', e)
    uni.showToast({ title: isZh.value ? '保存失败' : 'Save failed', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function saveAndPublish() {
  if (!form.title.trim()) {
    uni.showToast({ title: isZh.value ? '请输入课题名称' : 'Title required', icon: 'none' })
    return
  }
  saving.value = true
  try {
    if (isEditing.value) {
      await lessonPlansService.updateLessonPlan(planId.value, { ...form, status: 'published' })
    } else {
      const created = await lessonPlansService.createLessonPlan({ ...form })
      planId.value = created.$id
      await lessonPlansService.publishLessonPlan(created.$id)
    }
    uni.showToast({ title: isZh.value ? '已发布' : 'Published', icon: 'success' })
    setTimeout(() => goBack(), 800)
  } catch (e) {
    console.error('Publish failed:', e)
    uni.showToast({ title: isZh.value ? '发布失败' : 'Publish failed', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/teaching/index' })
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> } | undefined
  const id = currentPage?.options?.id
  if (id) {
    planId.value = id
    loadPlan(id)
  }
})
</script>

<style lang="scss" scoped>
.lesson-edit-page {
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
  --input-bg: #fafafa;
}

.theme-dark {
  --page-bg: #1a1315;
  --surface: rgba(26, 19, 21, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.24);
  --input-bg: rgba(30, 25, 27, 0.6);
}

.top-bar {
  padding: 16rpx 24rpx;
  height: 88rpx;
  display: flex; align-items: center; justify-content: space-between;
  .title { color: var(--text-main); font-size: 34rpx; font-weight: 700; }
  .icon-btn {
    width: 64rpx; height: 64rpx; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    &:active { opacity: 0.7; }
  }
}

.form-scroll {
  flex: 1;
  padding: 0 24rpx;
  padding-bottom: 180rpx;
}

.form-group {
  margin-bottom: 24rpx;
  &.half { flex: 1; }
  &.last { margin-bottom: 100rpx; }
}

.form-row {
  display: flex;
  gap: 16rpx;
}

.form-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-sub);
  margin-bottom: 10rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  background: var(--input-bg);
  font-size: 28rpx;
  color: var(--text-main);
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  background: var(--input-bg);
  font-size: 28rpx;
  color: var(--text-main);
  line-height: 1.6;

  &.tall { min-height: 200rpx; }
}

.form-select {
  display: flex; align-items: center; justify-content: space-between;
  height: 80rpx; padding: 0 20rpx;
  border-radius: 16rpx; border: 1px solid var(--line); background: var(--input-bg);
  &:active { opacity: 0.7; }
}

.form-select-text {
  font-size: 28rpx; color: var(--text-main);
  &.placeholder { color: var(--text-soft); }
}

.bottom-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom, 0px));
  display: flex; gap: 16rpx;
  background: var(--page-bg);
  border-top: 1px solid var(--line);
}

.save-btn {
  flex: 1; height: 88rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
  &:active { transform: scale(0.97); }

  &.outline {
    background: transparent; border: 1px solid var(--line);
  }
}

.save-btn-text {
  font-size: 28rpx; font-weight: 600; color: #fff;
  &.outline-text { color: var(--text-sub); }
}

.picker-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); z-index: 999;
  display: flex; align-items: flex-end;
}

.picker-sheet {
  width: 100%; padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom, 0px));
  background: var(--surface); border-radius: 32rpx 32rpx 0 0;
}

.picker-title {
  font-size: 30rpx; font-weight: 700; color: var(--text-main); margin-bottom: 24rpx; display: block;
}

.picker-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx 16rpx; border-radius: 16rpx; margin-bottom: 4rpx;
  &:active { opacity: 0.7; }
  &.active { background: var(--input-bg); }
  text { font-size: 28rpx; color: var(--text-main); }
}
</style>
