import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'

// 渐进式质量门禁：
// - 现存 any/console 较多，统一降为 warn，不阻断提交
// - vue 仅启用 essential（捕获真实 bug，不含格式规则，避免与 prettier 冲突）
// - 空 catch 暂时允许（存量约 20 处，后续专项清理）
export default tseslint.config(
  {
    ignores: [
      '.claude/**',
      '.superpowers/**',
      'docs/**',
      'dist/**',
      'unpackage/**',
      'node_modules/**',
      'src/uni_modules/**',
      'src/static/**',
      'server/**',
      '**/*.d.ts',
      'pnpm-lock.yaml',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      // TS 项目由 TS 自身处理未定义引用
      'no-undef': 'off',
      // 渐进收敛：存量问题降级为 warn
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // uni-app 页面/组件常用单词名，关闭多词组件名要求
      'vue/multi-word-component-names': 'off',
      // 正则多余转义存量较多，渐进收敛
      'no-useless-escape': 'warn',
      // 以下规则存量少量真实问题（共约 10 处），暂降 warn，待专项修复后收回 error
      'prefer-spread': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-useless-assignment': 'warn',
      'vue/no-unused-vars': 'warn',
      'vue/no-v-text-v-html-on-component': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
  prettierConfig,
)
