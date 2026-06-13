<template>
    <view class="semester-timeline">
        <view class="timeline-title-row">
            <text class="timeline-heading">{{ semesterName }}</text>
            <text class="timeline-caption">{{ isZh ? '学期时间线' : 'Semester Timeline' }}</text>
        </view>

        <view class="timeline-track">
            <view v-for="(milestone, index) in milestones" :key="index" class="timeline-node">
                <view class="node-rail">
                    <view class="node-dot" :style="{ background: milestone.color }" />
                    <view v-if="index < milestones.length - 1" class="node-line" />
                </view>
                <view class="node-content">
                    <text class="node-title">{{ milestone.title }}</text>
                    <text class="node-date">{{ milestone.dateLabel }}</text>
                    <text v-if="milestone.weekLabel" class="node-week">{{ milestone.weekLabel }}</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
    semesterName: string
    startDate: string
    isZh: boolean
}

const props = defineProps<Props>()

const COLOR_GREEN = '#22c55e'
const COLOR_BLUE = '#4A90E2'
const COLOR_ORANGE = '#f59e0b'

interface Milestone {
    title: string
    weekNumber: number
    dateLabel: string
    weekLabel: string
    color: string
}

const milestones = computed<Milestone[]>(() => {
    const base = new Date(props.startDate)
    if (isNaN(base.getTime())) return []

    const items = props.isZh
        ? [
            { title: '开学', week: 1, color: COLOR_GREEN },
            { title: '期中考试', week: 8, color: COLOR_ORANGE },
            { title: '期中结束', week: 9, color: COLOR_ORANGE },
            { title: '复习周', week: 16, color: COLOR_BLUE },
            { title: '复习结束', week: 17, color: COLOR_BLUE },
            { title: '期末考试', week: 18, color: COLOR_BLUE },
            { title: '考试结束', week: 19, color: COLOR_BLUE },
            { title: '学期结束', week: 20, color: COLOR_GREEN }
        ]
        : [
            { title: 'Semester Start', week: 1, color: COLOR_GREEN },
            { title: 'Midterm Exams Begin', week: 8, color: COLOR_ORANGE },
            { title: 'Midterm Exams End', week: 9, color: COLOR_ORANGE },
            { title: 'Review Week Begin', week: 16, color: COLOR_BLUE },
            { title: 'Review Week End', week: 17, color: COLOR_BLUE },
            { title: 'Final Exams Begin', week: 18, color: COLOR_BLUE },
            { title: 'Final Exams End', week: 19, color: COLOR_BLUE },
            { title: 'Semester End', week: 20, color: COLOR_GREEN }
        ]

    return items.map((item) => {
        const date = new Date(base.getTime() + (item.week - 1) * 7 * 24 * 60 * 60 * 1000)
        return {
            title: item.title,
            weekNumber: item.week,
            dateLabel: formatDate(date),
            weekLabel: props.isZh ? `第${item.week}周` : `Week ${item.week}`,
            color: item.color
        }
    })
})

function formatDate(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}
</script>

<style scoped lang="scss">
.semester-timeline {
    margin-top: 14rpx;
    padding: 22rpx;
    border-radius: 22rpx;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-card);
}

.timeline-title-row {
    display: flex;
    align-items: baseline;
    gap: 12rpx;
    margin-bottom: 24rpx;
}

.timeline-heading {
    color: var(--text-main);
    font-size: 30rpx;
    font-weight: 700;
}

.timeline-caption {
    color: var(--text-sub);
    font-size: 24rpx;
}

.timeline-track {
    padding-left: 8rpx;
}

.timeline-node {
    display: flex;
    gap: 20rpx;
    min-height: 100rpx;
}

.timeline-node:last-child {
    min-height: auto;
}

.node-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 24rpx;
    flex-shrink: 0;
}

.node-dot {
    width: 24rpx;
    height: 24rpx;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.node-line {
    width: 3rpx;
    flex: 1;
    background: var(--line-strong);
    margin: 6rpx 0;
}

.node-content {
    flex: 1;
    padding-bottom: 20rpx;
}

.node-title {
    display: block;
    color: var(--text-main);
    font-size: 26rpx;
    font-weight: 700;
    line-height: 1.4;
}

.node-date {
    display: block;
    margin-top: 4rpx;
    color: var(--text-sub);
    font-size: 24rpx;
}

.node-week {
    display: inline-block;
    margin-top: 6rpx;
    padding: 2rpx 14rpx;
    border-radius: 999rpx;
    background: var(--accent-soft);
    color: var(--accent-strong);
    font-size: 20rpx;
    font-weight: 600;
}
</style>
