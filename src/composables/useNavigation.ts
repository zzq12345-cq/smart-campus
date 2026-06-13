export interface ToastOptions {
  title: string
  icon?: 'none' | 'success' | 'error' | 'loading'
  duration?: number
}

export interface ModalOptions {
  title: string
  content: string
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
}

export function useNavigation() {
  function showToast(options: ToastOptions) {
    uni.showToast({
      title: options.title,
      icon: options.icon ?? 'none',
      duration: options.duration ?? 1800
    })
  }

  function navigateTo(url: string, fallbackMessage = '页面暂不可用') {
    if (!url) {
      showToast({ title: fallbackMessage })
      return
    }

    uni.navigateTo({
      url,
      fail: () => {
        showToast({ title: fallbackMessage })
      }
    })
  }

  function switchTab(url: string, fallbackMessage = '页面暂不可用') {
    if (!url) {
      showToast({ title: fallbackMessage })
      return
    }

    uni.switchTab({
      url,
      fail: () => {
        showToast({ title: fallbackMessage })
      }
    })
  }

  function showModal(options: ModalOptions) {
    return new Promise<UniApp.ShowModalRes>((resolve) => {
      uni.showModal({
        title: options.title,
        content: options.content,
        showCancel: options.showCancel ?? true,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        success: (res) => resolve(res),
        fail: () => resolve({ cancel: true, confirm: false } as UniApp.ShowModalRes)
      })
    })
  }

  return {
    navigateTo,
    switchTab,
    showToast,
    showModal
  }
}

