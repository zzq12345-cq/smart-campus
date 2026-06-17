<template>
  <view :class="['meta-chip', variant]">
    <Icon v-if="icon" :name="icon" :size="12" :color="iconColor" />
    <text><slot /></text>
  </view>
</template>

<script setup lang="ts">
/**
 * MetaChip — 帖子/评论上的元信息标签
 *
 * 用 type 区分视觉变体（topic/context/media/mood/risk/anonymous），
 * 由父组件通过 class 驱动配色，避免在每个页面重复 .meta-chip 样式。
 */
import { computed } from 'vue'
import Icon from '@/components/common/Icon.vue'

interface Props {
  variant?: string
  icon?: string
  iconColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'topic',
  icon: '',
  iconColor: '#94a3b8',
})

const iconColor = computed(() => props.iconColor || '#94a3b8')
</script>
