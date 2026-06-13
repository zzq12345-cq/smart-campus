<template>
  <view class="chat-input" :class="accentTheme">
    <view class="chat-input__inner">
      <view v-if="localImages.length" class="preview-list">
        <view v-for="(item, index) in localImages" :key="`${item}-${index}`" class="preview-item">
          <image class="preview-image" :src="item" mode="aspectFill" />
          <view class="remove-btn" @tap.stop="removeImage(index)">
            <Icon name="close" :size="12" color="#ffffff" />
          </view>
        </view>
      </view>

      <view class="input-row">
        <view class="action-btn" @tap="chooseImages">
          <Icon name="image" :size="20" :color="accentColor" />
        </view>

        <view class="text-input-shell">
          <textarea class="text-input" v-model="content" auto-height maxlength="2000" :placeholder="resolvedPlaceholder" />
        </view>

        <view class="send-btn" :class="[{ disabled: sendDisabled }, accentTheme]" @tap="handleSend">
          <Icon v-if="uploading" name="hourglass_top" :size="18" />
          <Icon v-else name="send" :size="18" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { uploadPostImage } from '@/services/storage'
import type { MessageType } from '@/types/message'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

const props = withDefaults(
  defineProps<{
    conversationId: string
    placeholder?: string
    submitting?: boolean
    /** 'psychology' uses purple accent to match psychology section */
    accentTheme?: 'default' | 'psychology'
  }>(),
  {
    placeholder: '输入消息...',
    submitting: false,
    accentTheme: 'default'
  }
)

const accentColor = computed(() =>
  props.accentTheme === 'psychology' ? '#886fde' : '#6fde81'
)

const emit = defineEmits<{
  (event: 'send', payload: { content: string; attachments: string[]; messageType: MessageType }): void
}>()

const uiStore = useUiPreferencesStore()
const locale = computed(() => uiStore.locale)
const resolvedPlaceholder = computed(() => props.placeholder || t(I18N_KEYS.chatInputPlaceholder, locale.value))

const content = ref('')
const localImages = ref<string[]>([])
const uploading = ref(false)

const sendDisabled = computed(() => {
  const text = String(content.value || '').trim()
  return uploading.value || props.submitting || (!text && localImages.value.length === 0)
})

const chooseImages = async () => {
  if (uploading.value) {
    return
  }
  try {
    const result = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({
        count: Math.max(1, 6 - localImages.value.length),
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      })
    })

    const nextImages = Array.isArray(result.tempFilePaths)
      ? result.tempFilePaths.map((item) => String(item || '').trim()).filter(Boolean)
      : []
    localImages.value = [...localImages.value, ...nextImages].slice(0, 6)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '')
    if (/cancel/i.test(message)) {
      return
    }
    uni.showToast({
      title: message || t(I18N_KEYS.chatChooseImageFailed, locale.value),
      icon: 'none'
    })
  }
}

const removeImage = (index: number) => {
  if (index < 0 || index >= localImages.value.length) {
    return
  }
  localImages.value.splice(index, 1)
}

const uploadAttachments = async () => {
  const attachments: string[] = []
  for (const localPath of localImages.value) {
    if (/^https?:\/\//i.test(localPath)) {
      attachments.push(localPath)
      continue
    }
    const uploaded = await uploadPostImage({ localPath })
    const url = String(uploaded || '').trim()
    if (url) {
      attachments.push(url)
    }
  }
  return attachments
}

const resolveMessageType = (text: string, attachments: string[]): MessageType => {
  if (text && attachments.length) {
    return 'mixed'
  }
  if (attachments.length) {
    return 'image'
  }
  return 'text'
}

const handleSend = async () => {
  if (sendDisabled.value) {
    return
  }
  uploading.value = true
  try {
    const text = String(content.value || '').trim()
    const attachments = await uploadAttachments()
    if (!text && attachments.length === 0) {
      return
    }
    emit('send', {
      content: text,
      attachments,
      messageType: resolveMessageType(text, attachments)
    })
    content.value = ''
    localImages.value = []
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '')
    uni.showToast({
      title: message || t(I18N_KEYS.chatSendFailed, locale.value),
      icon: 'none'
    })
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped lang="scss">
.chat-input {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 10rpx 24rpx calc(10rpx + env(safe-area-inset-bottom));
  background: var(--topbar-bg, rgba(246, 248, 246, 0.9));
  border-top: 1px solid var(--line, rgba(111, 222, 129, 0.18));
}

.chat-input__inner {
  --composer-height: 64rpx;

  max-width: 860rpx;
  margin: 0 auto;
}

.preview-list {
  margin-bottom: 6rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.preview-item {
  position: relative;
  width: 76rpx;
  height: 76rpx;
}

.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 18rpx;
  border: 1px solid var(--line, rgba(111, 222, 129, 0.18));
}

.remove-btn {
  position: absolute;
  right: -6rpx;
  top: -6rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.74);
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10rpx;
  justify-content: center;
}

.action-btn,
.send-btn {
  width: var(--composer-height);
  height: var(--composer-height);
  min-height: var(--composer-height);
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-btn {
  border: 1px solid var(--line, rgba(111, 222, 129, 0.18));
  background: rgba(111, 222, 129, 0.08);
}

.text-input-shell {
  flex: 1 1 auto;
  max-width: 560rpx;
  min-height: var(--composer-height);
  padding: 14rpx 18rpx;
  border-radius: 22rpx;
  border: 1px solid var(--composer-field-line, rgba(111, 222, 129, 0.16));
  background: var(--composer-field, rgba(111, 222, 129, 0.04));
  box-sizing: border-box;
}

.text-input {
  width: 100%;
  min-height: 36rpx;
  max-height: 152rpx;
  color: var(--text-main, #0f172a);
  font-size: 28rpx;
  line-height: 36rpx;
}

.send-btn {
  background: linear-gradient(135deg, var(--bubble-mine-start, #95ec69), var(--bubble-mine-end, #95ec69));
  box-shadow: 0 10rpx 22rpx rgba(111, 222, 129, 0.18);
  color: var(--send-icon-color, #000000);
}

.send-btn.disabled {
  opacity: 0.52;
}

/* Psychology theme: purple accent to match psychology section (#886fde) */
.chat-input.psychology {
  background: rgba(255, 252, 255, 0.95);
  border-top-color: rgba(136, 111, 222, 0.2);
}

.chat-input.psychology .preview-image {
  border-color: rgba(136, 111, 222, 0.25);
}

.chat-input.psychology .action-btn {
  border-color: rgba(136, 111, 222, 0.25);
  background: rgba(136, 111, 222, 0.08);
}

.chat-input.psychology .text-input-shell {
  border-color: rgba(136, 111, 222, 0.2);
  background: rgba(136, 111, 222, 0.04);
}

.chat-input.psychology .send-btn {
  background: linear-gradient(135deg, #886fde, #a08ae8);
  box-shadow: 0 10rpx 22rpx rgba(136, 111, 222, 0.25);
  color: #fff;
}
</style>
