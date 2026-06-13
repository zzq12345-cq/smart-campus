<template>
    <view v-if="visible" class="course-form-mask" @tap="handleClose">
        <view class="course-form-popup" @tap.stop>
            <view class="form-header">
                <text class="form-title">{{ isEdit ? editTitle : addTitle }}</text>
                <view class="close-btn" @tap="handleClose">
                    <Icon name="close" :size="18" color="var(--text-sub)" />
                </view>
            </view>

            <scroll-view class="form-body" scroll-y>
                <view class="form-group">
                    <text class="form-label">{{ courseNameLabel }}</text>
                    <input class="form-input" :value="form.courseName" @input="form.courseName = ($event as any).detail.value"
                        :placeholder="courseNamePlaceholder" />
                </view>

                <view class="form-group">
                    <text class="form-label">{{ teacherInputLabel }}</text>
                    <input class="form-input" :value="form.teacher" @input="form.teacher = ($event as any).detail.value"
                        :placeholder="teacherPlaceholder" />
                </view>

                <view class="form-group">
                    <text class="form-label">{{ locationInputLabel }}</text>
                    <input class="form-input" :value="form.location" @input="form.location = ($event as any).detail.value"
                        :placeholder="locationPlaceholder" />
                </view>

                <view class="form-row">
                    <view class="form-group half">
                        <text class="form-label">{{ dayOfWeekLabel }}</text>
                        <picker :range="dayOptions" :range-key="'label'" :value="form.dayOfWeek - 1"
                            @change="form.dayOfWeek = Number(($event as any).detail.value) + 1">
                            <view class="form-picker">
                                <text>{{ dayOptions[form.dayOfWeek - 1]?.label || '' }}</text>
                                <Icon name="expand_more" :size="16" color="var(--text-sub)" />
                            </view>
                        </picker>
                    </view>
                </view>

                <view class="form-row">
                    <view class="form-group half">
                        <text class="form-label">{{ startSlotLabel }}</text>
                        <picker :range="slotOptions" :range-key="'label'" :value="form.startSlot - 1"
                            @change="handleStartSlotChange(Number(($event as any).detail.value) + 1)">
                            <view class="form-picker">
                                <text>{{ slotOptions[form.startSlot - 1]?.label || '' }}</text>
                                <Icon name="expand_more" :size="16" color="var(--text-sub)" />
                            </view>
                        </picker>
                    </view>

                    <view class="form-group half">
                        <text class="form-label">{{ endSlotLabel }}</text>
                        <picker :range="slotOptions" :range-key="'label'" :value="form.endSlot - 1"
                            @change="form.endSlot = Math.max(form.startSlot, Number(($event as any).detail.value) + 1)">
                            <view class="form-picker">
                                <text>{{ slotOptions[form.endSlot - 1]?.label || '' }}</text>
                                <Icon name="expand_more" :size="16" color="var(--text-sub)" />
                            </view>
                        </picker>
                    </view>
                </view>
            </scroll-view>

            <view class="form-footer">
                <view class="footer-btn cancel-btn" @tap="handleClose">
                    <text>{{ cancelLabel }}</text>
                </view>
                <view class="footer-btn save-btn" @tap="handleSave">
                    <text>{{ saveLabel }}</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

export interface ManualCourse {
    id: string
    courseName: string
    teacher: string
    location: string
    dayOfWeek: number
    startSlot: number
    endSlot: number
}

interface Props {
    visible: boolean
    editCourse?: ManualCourse | null
}

const props = withDefaults(defineProps<Props>(), {
    editCourse: null
})

const emit = defineEmits<{
    close: []
    save: [course: ManualCourse]
}>()

const uiPreferencesStore = useUiPreferencesStore()
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const addTitle = computed(() => (isZh.value ? '添加课程' : 'Add Course'))
const editTitle = computed(() => (isZh.value ? '编辑课程' : 'Edit Course'))
const courseNameLabel = computed(() => (isZh.value ? '课程名称' : 'Course Name'))
const courseNamePlaceholder = computed(() => (isZh.value ? '请输入课程名称' : 'Enter course name'))
const teacherInputLabel = computed(() => (isZh.value ? '教师' : 'Teacher'))
const teacherPlaceholder = computed(() => (isZh.value ? '请输入教师姓名' : 'Enter teacher name'))
const locationInputLabel = computed(() => (isZh.value ? '上课地点' : 'Location'))
const locationPlaceholder = computed(() => (isZh.value ? '请输入上课地点' : 'Enter location'))
const dayOfWeekLabel = computed(() => (isZh.value ? '星期' : 'Day'))
const startSlotLabel = computed(() => (isZh.value ? '开始节次' : 'Start'))
const endSlotLabel = computed(() => (isZh.value ? '结束节次' : 'End'))
const cancelLabel = computed(() => (isZh.value ? '取消' : 'Cancel'))
const saveLabel = computed(() => (isZh.value ? '保存' : 'Save'))

const isEdit = computed(() => Boolean(props.editCourse))

const WEEKDAY_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const WEEKDAY_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const dayOptions = computed(() => {
    const labels = isZh.value ? WEEKDAY_ZH : WEEKDAY_EN
    return labels.map((label, i) => ({ value: i + 1, label }))
})

const slotOptions = computed(() =>
    Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: isZh.value ? `第${i + 1}节` : `Period ${i + 1}`
    }))
)

const form = reactive<Omit<ManualCourse, 'id'>>({
    courseName: '',
    teacher: '',
    location: '',
    dayOfWeek: 1,
    startSlot: 1,
    endSlot: 1
})

watch(
    () => props.visible,
    (val) => {
        if (!val) return
        if (props.editCourse) {
            form.courseName = props.editCourse.courseName
            form.teacher = props.editCourse.teacher
            form.location = props.editCourse.location
            form.dayOfWeek = props.editCourse.dayOfWeek
            form.startSlot = props.editCourse.startSlot
            form.endSlot = props.editCourse.endSlot
        } else {
            form.courseName = ''
            form.teacher = ''
            form.location = ''
            form.dayOfWeek = 1
            form.startSlot = 1
            form.endSlot = 1
        }
    }
)

function handleStartSlotChange(slot: number) {
    form.startSlot = slot
    if (form.endSlot < slot) {
        form.endSlot = slot
    }
}

function handleClose() {
    emit('close')
}

function handleSave() {
    if (!form.courseName.trim()) {
        uni.showToast({ title: isZh.value ? '请输入课程名称' : 'Course name required', icon: 'none' })
        return
    }
    emit('save', {
        id: props.editCourse?.id || `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        courseName: form.courseName.trim(),
        teacher: form.teacher.trim(),
        location: form.location.trim(),
        dayOfWeek: form.dayOfWeek,
        startSlot: form.startSlot,
        endSlot: form.endSlot
    })
}
</script>

<style scoped lang="scss">
.course-form-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-end;
    justify-content: center;
}

.course-form-popup {
    width: 100%;
    max-height: 85vh;
    border-radius: 28rpx 28rpx 0 0;
    background: var(--surface);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 30rpx 18rpx;
    border-bottom: 1px solid var(--line);
}

.form-title {
    color: var(--text-main);
    font-size: 30rpx;
    font-weight: 700;
}

.close-btn {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--surface-muted);
}

.form-body {
    flex: 1;
    padding: 20rpx 30rpx 10rpx;
    max-height: 60vh;
}

.form-group {
    margin-bottom: 24rpx;
}

.form-label {
    display: block;
    margin-bottom: 10rpx;
    color: var(--text-sub);
    font-size: 24rpx;
    font-weight: 600;
}

.form-input {
    width: 100%;
    height: 80rpx;
    padding: 0 20rpx;
    border-radius: 16rpx;
    border: 1px solid var(--line);
    background: var(--surface-soft);
    color: var(--text-main);
    font-size: 26rpx;
    box-sizing: border-box;
}

.form-picker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 80rpx;
    padding: 0 20rpx;
    border-radius: 16rpx;
    border: 1px solid var(--line);
    background: var(--surface-soft);

    text {
        color: var(--text-main);
        font-size: 26rpx;
    }
}

.form-row {
    display: flex;
    gap: 20rpx;
}

.half {
    flex: 1;
}

.form-footer {
    display: flex;
    gap: 20rpx;
    padding: 18rpx 30rpx 40rpx;
    border-top: 1px solid var(--line);
}

.footer-btn {
    flex: 1;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16rpx;
}

.cancel-btn {
    border: 1px solid var(--line);
    background: var(--surface-soft);

    text {
        color: var(--text-main);
        font-size: 26rpx;
        font-weight: 600;
    }
}

.save-btn {
    background: #4A90E2;
    box-shadow: 0 8rpx 18rpx rgba(74, 144, 226, 0.22);

    text {
        color: #ffffff;
        font-size: 26rpx;
        font-weight: 700;
    }
}
</style>
