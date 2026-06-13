import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['tests/setup-vitest.ts'],
    include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts', 'functions/**/*.spec.js', 'functions/**/*.spec.ts'],
    exclude: ['tests/e2e/**'],
    clearMocks: true,
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}', 'tests/**/*.ts', 'functions/**/*.js'],
      exclude: ['src/main.js', 'src/manifest.json', 'src/pages.json']
    }
  }
})
