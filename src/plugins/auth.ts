import type { App } from 'vue'
import { useAuthStore } from '@/stores/auth'

export const authPlugin = {
  install(app: App) {
    const authStore = useAuthStore()
    app.provide('auth', authStore)
    app.config.globalProperties.$auth = authStore
    void authStore.init()
  }
}

export default authPlugin
