import App from './App'
import '@material-symbols/font-400/outlined.css'
import '@/uni_modules/tdesign-uniapp/components/common/style/theme/index.css'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import Icon from './components/common/Icon.vue'
import BaseCard from './components/common/BaseCard.vue'
import QuickAccessCard from './components/common/QuickAccessCard.vue'
import FeedCard from './components/common/FeedCard.vue'
import FloatingAiButton from './components/common/FloatingAiButton.vue'
import authPlugin from '@/plugins/auth'
import { useUiPreferencesStore } from './stores/ui-preferences'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(authPlugin)

  // Register Icon component globally
  app.component('Icon', Icon)
  app.component('BaseCard', BaseCard)

  // Register reusable UI components globally
  app.component('QuickAccessCard', QuickAccessCard)
  app.component('FeedCard', FeedCard)
  app.component('FloatingAiButton', FloatingAiButton)

  const uiPreferencesStore = useUiPreferencesStore(pinia)
  uiPreferencesStore.initFromSystem()

  return {
    app
  }
}
// #endif
