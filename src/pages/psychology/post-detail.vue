<template>
  <PostDetail module="psychology">
    <!-- 心理区使用 topic + mood + risk + anonymous chips，替代默认的 badge + context -->
    <template #meta-chips="{ post }">
      <view class="meta-chip topic">{{ post.topicLabel }}</view>
      <view v-if="post.moodLabel" class="meta-chip mood">{{ post.moodLabel }}</view>
      <view class="meta-chip risk" :class="post.riskTone">{{ post.riskLabel }}</view>
      <view v-if="post.isAnonymous" class="meta-chip anonymous">{{ post.anonymousLabel }}</view>
    </template>
  </PostDetail>
</template>

<script setup lang="ts">
/**
 * 心理区树洞详情页（薄壳）
 *
 * 全部逻辑、模板、样式收敛在 src/components/post/PostDetail.vue。
 * 心理区独有 mood / risk / anonymous 标签，通过 #meta-chips slot 注入；
 * 其余（评论、点赞、收藏、私信）与 study/life 完全共享。
 */
import PostDetail from '@/components/post/PostDetail.vue'
</script>
