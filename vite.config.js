import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import uni from '@dcloudio/vite-plugin-uni'

const appwriteCompatModules = ['appwrite', 'json-bigint', 'bignumber.js']

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true, // 暴露到局域网，方便手机访问
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    uni(),
  ],
  resolve: {
    alias: {
      'json-bigint': resolve(__dirname, 'node_modules/json-bigint/index.js'),
      'bignumber.js': resolve(__dirname, 'node_modules/bignumber.js/bignumber.js')
    }
  },
  optimizeDeps: {
    include: appwriteCompatModules
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /appwrite/, /json-bigint/, /bignumber\.js/],
      transformMixedEsModules: true
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // Use modern Sass API to eliminate deprecation warning
        additionalData: `@import "@/uni-variables.scss";`, // Auto-inject SCSS variables/mixins to all components
        silenceDeprecations: ['legacy-js-api', 'import'], // Suppress expected deprecation warnings
      },
    },
  },
})
