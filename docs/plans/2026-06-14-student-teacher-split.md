# 学生端 / 教师端拆分 Implementation Plan

> **For agentic workers:** 按任务逐个实现。Steps 用 checkbox（`- [ ]`）追踪。本项目用 **vitest**（happy-dom，`globals: true`），测试放 `src/**/__tests__/*.spec.ts`，运行 `npm run test:unit:run`。单位用 `rpx`。

**Goal:** 按账号 `role`（student/teacher）拆分学生端与教师端：教学模块归教师端，学习模块归学生端，生活/心理/我的两端共享。

**Architecture:** 最小改造。`role` 复用现有 `teacherSubject` 的「localStorage 优先 + dbUser 兜底 + best-effort DB 同步」模式（后端无关）。保留 `uni.switchTab` 与 pages.json 全部 tabBar 页注册，差异仅在自定义 `AppTabBar` 的渲染过滤层 + 登录落地分流 + 两个首页的错端 `reLaunch` 守卫。

**Tech Stack:** Vue 3 + Pinia + uni-app（H5/小程序/App）+ tdesign-uniapp + vitest。

**关键约束：** `AppTabBar` 用 `uni.switchTab`，只能跳 pages.json `tabBar.list` 内的页面 → study 与 teaching 必须**都保留**在 list 中（pages.json **不改**），按角色只在自定义栏过滤渲染。

---

## File Structure

| 文件 | 动作 | 职责 |
|------|------|------|
| `src/types/auth.ts` | Modify | 增加 `UserRole` 类型与 `DbUser.role` 字段 |
| `src/stores/auth.ts` | Modify | `role` / `isTeacher` 计算属性、`setRole()`、init 恢复、ROLE_KEY |
| `src/utils/auth-guard.ts` | Modify | 纯函数 `roleHomeUrl(isTeacher)` |
| `src/components/common/AppTabBar.vue` | Modify | `list` 按角色过滤（学生去教学、教师去学习） |
| `src/pages/mine/register.vue` | Modify | 身份单选 UI + 注册后 `setRole` + 落地角色首页 |
| `src/pages/mine/login.vue` | Modify | 登录后按角色落地 |
| `src/pages/study/index.vue` | Modify | onShow 守卫：教师 reLaunch 教学 |
| `src/pages/teaching/index.vue` | Modify | onShow 守卫：学生 reLaunch 学习 |
| `tests/setup-vitest.ts` | Modify | uni mock 增加 `reLaunch` |
| `src/stores/__tests__/auth-role.spec.ts` | Create | role/isTeacher/setRole 测试 |
| `src/utils/__tests__/auth-guard-role.spec.ts` | Create | roleHomeUrl 测试 |
| `src/components/common/__tests__/AppTabBar.role.spec.ts` | Create | 过滤渲染测试 |

---

## Task 1: 角色类型 + auth store role 能力

**Files:**
- Modify: `src/types/auth.ts`
- Modify: `src/stores/auth.ts`
- Modify: `tests/setup-vitest.ts`
- Test: `src/stores/__tests__/auth-role.spec.ts`

- [ ] **Step 1: 在 types/auth.ts 增加 UserRole 与 DbUser.role**

在 `src/types/auth.ts` 顶部（`export interface AuthUser` 之前）加入：

```typescript
export type UserRole = 'student' | 'teacher'
```

在 `DbUser` 接口内、`teacherSubject?: string` 之后加入：

```typescript
  /** 用户角色：student（学生端）/ teacher（教师端）；缺省视为 student */
  role?: UserRole
```

- [ ] **Step 2: 给 vitest uni mock 补 reLaunch**

修改 `tests/setup-vitest.ts` 的 `Object.assign((globalThis as Record<string, any>).uni, { ... })` 块，在 `navigateTo: vi.fn()` 后加（注意给 `navigateTo` 行补逗号）。补 `reLaunch`（守卫用）与 storage（role 读写用）：

```typescript
  navigateTo: vi.fn(),
  reLaunch: vi.fn(),
  getStorageSync: vi.fn(() => ''),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn()
```

- [ ] **Step 3: 写失败测试 auth-role.spec.ts**

创建 `src/stores/__tests__/auth-role.spec.ts`：

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    isLoggedIn: vi.fn(() => false),
    getStoredUser: vi.fn(() => null),
    getStoredDbUser: vi.fn(() => null),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('@/services/auth', () => ({ default: mockAuthService }))

import { useAuthStore } from '@/stores/auth'

describe('auth store role', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('缺省（无 role）视为 student', () => {
    const store = useAuthStore()
    expect(store.role).toBe('student')
    expect(store.isTeacher).toBe(false)
  })

  it('dbUser.role=teacher 时为 teacher', () => {
    const store = useAuthStore()
    store.dbUser = { $id: 'u1', email: 'a@b.c', name: 'T', role: 'teacher' }
    expect(store.role).toBe('teacher')
    expect(store.isTeacher).toBe(true)
  })

  it('非法 role 值归一为 student', () => {
    const store = useAuthStore()
    store.dbUser = { $id: 'u1', email: 'a@b.c', name: 'X', role: 'admin' as never }
    expect(store.role).toBe('student')
  })

  it('setRole 写入本地状态并即时反映到 role', () => {
    const store = useAuthStore()
    store.setRole('teacher')
    expect(store.role).toBe('teacher')
    expect(uni.setStorageSync).toHaveBeenCalledWith('user.role', 'teacher')
  })

  it('logout 清除角色，回落为 student', async () => {
    const store = useAuthStore()
    store.setRole('teacher')
    expect(store.role).toBe('teacher')
    await store.logout()
    expect(store.role).toBe('student')
    expect(uni.removeStorageSync).toHaveBeenCalledWith('user.role')
  })
})
```

- [ ] **Step 4: 运行测试确认失败**

Run: `npm run test:unit:run -- src/stores/__tests__/auth-role.spec.ts`
Expected: FAIL（`store.role` / `store.isTeacher` / `store.setRole` 未定义）

- [ ] **Step 5: 在 auth store 实现 role 能力**

修改 `src/stores/auth.ts`：

(a) 顶部 import 增加 `UserRole`：

```typescript
import type { DbUser, LoginResult, ProfileUpdateInput, RegisterResult, Session, UserRole } from '@/types/auth'
```

(b) 在 `const TEACHER_SUBJECT_KEY = 'teacher.subject'` 下一行增加：

```typescript
const USER_ROLE_KEY = 'user.role'
```

(c) 在 `teacherSubject` 计算属性块（`const teacherSubject = computed(...)` 之后）增加：

```typescript
  // role: 优先 localStorage，其次 dbUser；任何非 teacher 值归一为 student
  const _localRole = ref<UserRole | ''>('')
  const role = computed<UserRole>(() => {
    const raw = _localRole.value || String(dbUser.value?.role || '')
    return raw === 'teacher' ? 'teacher' : 'student'
  })
  const isTeacher = computed(() => role.value === 'teacher')
```

(d) 在 `init()` 内、恢复教师科目的 `try {...}` 块之后增加角色恢复：

```typescript
    // 恢复角色
    try {
      const storedRole = uni.getStorageSync(USER_ROLE_KEY)
      if (storedRole === 'teacher' || storedRole === 'student') {
        _localRole.value = storedRole
      }
    } catch {}
```

(e) 在 `setTeacherSubject` 函数之后增加 `setRole`（mirror setTeacherSubject + best-effort DB 同步）：

```typescript
  /** 设置角色：localStorage 优先，best-effort 同步到 DB（字段可能不存在，失败不影响） */
  function setRole(nextRole: UserRole) {
    _localRole.value = nextRole
    try { uni.setStorageSync(USER_ROLE_KEY, nextRole) } catch {}
    if (dbUser.value) {
      dbUser.value = { ...dbUser.value, role: nextRole }
    }
    // Promise.resolve 包裹：兼容同步/异步返回，避免非 Promise 时 .catch 抛错
    Promise.resolve(authService.updateProfile({ role: nextRole } as ProfileUpdateInput)).catch((e) => {
      console.warn('[Auth] role sync to DB failed (field may not exist):', e)
    })
  }
```

(f) 在 `logout()` 函数内、`dbUser.value = null` 之后增加角色清理（spec §6：登出清除 role）：

```typescript
      _localRole.value = ''
      try { uni.removeStorageSync(USER_ROLE_KEY) } catch {}
```

(g) 在 `return { ... }` 中增加导出（在 `teacherSubject,` 后、`setTeacherSubject` 同侧）：

```typescript
    role,
    isTeacher,
    setRole,
```

(h) 在 `src/types/auth.ts` 的 `ProfileUpdateInput` 接口内增加可选 `role`（供 setRole 的 DB 同步类型通过）：

```typescript
  /** 用户角色 */
  role?: UserRole
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm run test:unit:run -- src/stores/__tests__/auth-role.spec.ts`
Expected: PASS（5 个用例）

- [ ] **Step 7: 提交**

```bash
git add src/types/auth.ts src/stores/auth.ts tests/setup-vitest.ts src/stores/__tests__/auth-role.spec.ts
git commit -m "feat(auth): 新增用户角色 role 字段与 store 能力

- 增加 UserRole 类型与 DbUser.role / ProfileUpdateInput.role
- auth store 暴露 role / isTeacher 计算属性与 setRole()
- 复用 teacherSubject 的 localStorage 优先 + best-effort DB 同步模式
- 缺省与非法值归一为 student（覆盖存量用户）"
```

---

## Task 2: auth-guard 角色首页纯函数

**Files:**
- Modify: `src/utils/auth-guard.ts`
- Test: `src/utils/__tests__/auth-guard-role.spec.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/utils/__tests__/auth-guard-role.spec.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import { roleHomeUrl } from '@/utils/auth-guard'

describe('roleHomeUrl', () => {
  it('教师 → 教学首页', () => {
    expect(roleHomeUrl(true)).toBe('/pages/teaching/index')
  })
  it('学生 → 学习首页', () => {
    expect(roleHomeUrl(false)).toBe('/pages/study/index')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm run test:unit:run -- src/utils/__tests__/auth-guard-role.spec.ts`
Expected: FAIL（`roleHomeUrl` 未导出）

- [ ] **Step 3: 实现 roleHomeUrl**

在 `src/utils/auth-guard.ts` 末尾增加：

```typescript
/** 按角色返回该端首页 tab 路径（学生→学习，教师→教学） */
export function roleHomeUrl(isTeacher: boolean): string {
  return isTeacher ? '/pages/teaching/index' : '/pages/study/index'
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm run test:unit:run -- src/utils/__tests__/auth-guard-role.spec.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/auth-guard.ts src/utils/__tests__/auth-guard-role.spec.ts
git commit -m "feat(auth): 增加 roleHomeUrl 角色首页解析纯函数"
```

---

## Task 3: AppTabBar 按角色过滤

**Files:**
- Modify: `src/components/common/AppTabBar.vue`
- Test: `src/components/common/__tests__/AppTabBar.role.spec.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/components/common/__tests__/AppTabBar.role.spec.ts`：

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    isLoggedIn: vi.fn(() => true),
    getStoredUser: vi.fn(() => null),
    getStoredDbUser: vi.fn(() => null),
    updateProfile: vi.fn()
  }
}))
vi.mock('@/services/auth', () => ({ default: mockAuthService }))

import AppTabBar from '@/components/common/AppTabBar.vue'
import { useAuthStore } from '@/stores/auth'

function mountBar(value: string) {
  return mount(AppTabBar, { props: { value } })
}

describe('AppTabBar 角色过滤', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('学生：含学习、不含教学', () => {
    useAuthStore().setRole('student')
    const wrapper = mountBar('/pages/study/index')
    expect(wrapper.vm.list.map((i: { value: string }) => i.value)).toEqual([
      '/pages/study/index',
      '/pages/life/index',
      '/pages/psychology/index',
      '/pages/mine/index'
    ])
  })

  it('教师：含教学、不含学习', () => {
    useAuthStore().setRole('teacher')
    const wrapper = mountBar('/pages/teaching/index')
    expect(wrapper.vm.list.map((i: { value: string }) => i.value)).toEqual([
      '/pages/teaching/index',
      '/pages/life/index',
      '/pages/psychology/index',
      '/pages/mine/index'
    ])
  })
})
```

> 注：`wrapper.vm.list` 可访问，需在 `<script setup>` 中通过 `defineExpose({ list })` 暴露（见 Step 3）。

- [ ] **Step 2: 运行确认失败**

Run: `npm run test:unit:run -- src/components/common/__tests__/AppTabBar.role.spec.ts`
Expected: FAIL（`wrapper.vm.list` 为 undefined / 含全部 5 项）

- [ ] **Step 3: 实现角色过滤**

修改 `src/components/common/AppTabBar.vue`：

(a) `import { computed } from 'vue'` 下方增加 store import：

```typescript
import { useAuthStore } from '@/stores/auth'
```

(b) 在 `const uiPreferencesStore = useUiPreferencesStore()` 下一行增加：

```typescript
const authStore = useAuthStore()
```

(c) 把现有 `const list = computed<TabBarItemConfig[]>(() => [ ...5项... ])` 整体替换为：先构造全量，再按角色过滤。将原数组赋给 `allItems`，并在末尾 `.filter`：

```typescript
const list = computed<TabBarItemConfig[]>(() => {
  const allItems: TabBarItemConfig[] = [
    {
      value: '/pages/study/index',
      icon: props.value === '/pages/study/index' ? 'ai-education-filled' : 'ai-education',
      ariaLabel: t(I18N_KEYS.tabStudy, uiPreferencesStore.locale),
      label: t(I18N_KEYS.tabStudy, uiPreferencesStore.locale)
    },
    {
      value: '/pages/life/index',
      icon: props.value === '/pages/life/index' ? 'app-filled' : 'app',
      ariaLabel: t(I18N_KEYS.tabLife, uiPreferencesStore.locale),
      label: t(I18N_KEYS.tabLife, uiPreferencesStore.locale)
    },
    {
      value: '/pages/teaching/index',
      icon: props.value === '/pages/teaching/index' ? 'ai-book-open-filled' : 'ai-book-open',
      ariaLabel: uiPreferencesStore.locale === 'zh-CN' ? '教学' : 'Teaching',
      label: uiPreferencesStore.locale === 'zh-CN' ? '教学' : 'Teaching'
    },
    {
      value: '/pages/psychology/index',
      icon: props.value === '/pages/psychology/index' ? 'heart-filled' : 'heart',
      ariaLabel: t(I18N_KEYS.tabPsychology, uiPreferencesStore.locale),
      label: t(I18N_KEYS.tabPsychology, uiPreferencesStore.locale)
    },
    {
      value: '/pages/mine/index',
      icon: props.value === '/pages/mine/index' ? 'user-filled' : 'user',
      ariaLabel: t(I18N_KEYS.tabMine, uiPreferencesStore.locale),
      label: t(I18N_KEYS.tabMine, uiPreferencesStore.locale)
    }
  ]
  const teacher = authStore.isTeacher
  return allItems.filter((item) => {
    if (item.value === '/pages/teaching/index') return teacher
    if (item.value === '/pages/study/index') return !teacher
    return true
  })
})
```

(d) 在 `</script>` 之前（`onChange` 函数之后）增加 expose 供测试访问：

```typescript
defineExpose({ list })
```

- [ ] **Step 4: 运行确认通过**

Run: `npm run test:unit:run -- src/components/common/__tests__/AppTabBar.role.spec.ts`
Expected: PASS（学生 4 项含学习不含教学；教师 4 项含教学不含学习）

- [ ] **Step 5: 提交**

```bash
git add src/components/common/AppTabBar.vue src/components/common/__tests__/AppTabBar.role.spec.ts
git commit -m "feat(nav): AppTabBar 按角色过滤标签

学生端显示学习不显示教学，教师端显示教学不显示学习；
生活/心理/我的两端共享。pages.json tabBar.list 保持不变。"
```

---

## Task 4: 注册页身份选择 + 落地角色首页

**Files:**
- Modify: `src/pages/mine/register.vue`

> 页面级集成改动，依赖 Task 1/2 的单元能力，本任务以实现 + 手动验证为主。

- [ ] **Step 1: 增加 role ref 与导入**

在 `src/pages/mine/register.vue` `<script setup>` 中，`import { useAuthStore } ...` 之后增加：

```typescript
import { roleHomeUrl } from '@/utils/auth-guard'
import type { UserRole } from '@/types/auth'
```

在 `const confirmPassword = ref('')` 之后增加：

```typescript
const role = ref<UserRole>('student')
```

在文案 computed 区（`const registerLabel ...` 附近）增加身份文案：

```typescript
const roleLabel = computed(() => (isZh.value ? '我是' : 'I am a'))
const studentLabel = computed(() => (isZh.value ? '学生' : 'Student'))
const teacherLabel = computed(() => (isZh.value ? '教师' : 'Teacher'))
```

- [ ] **Step 2: 增加身份单选 UI**

在模板中昵称 `input-group`（`<text class="input-label">{{ nameLabel }}</text>` 所在块）之前插入身份选择块：

```html
      <view class="input-group">
        <text class="input-label">{{ roleLabel }}</text>
        <view class="role-row">
          <view
            :class="['role-chip', { active: role === 'student' }]"
            @tap="role = 'student'"
          >
            <text class="role-chip-text">{{ studentLabel }}</text>
          </view>
          <view
            :class="['role-chip', { active: role === 'teacher' }]"
            @tap="role = 'teacher'"
          >
            <text class="role-chip-text">{{ teacherLabel }}</text>
          </view>
        </view>
      </view>
```

在 `<style scoped>` 末尾增加样式（沿用现有 `--line`/绿色注册主题，对比度达标）：

```scss
.role-row {
  margin-top: 8rpx;
  display: flex;
  gap: 16rpx;
}

.role-chip {
  flex: 1;
  min-height: 84rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.role-chip.active {
  border-color: #2cbb63;
  background: rgba(111, 222, 129, 0.16);
}

.role-chip-text {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 600;
}
```

- [ ] **Step 3: 注册成功后写入 role 并落地角色首页**

在 `handleRegister` 内，把：

```typescript
    await authStore.register(normalizedEmail, password.value, normalizedName)
```

改为（注册成功后立即写入角色）：

```typescript
    await authStore.register(normalizedEmail, password.value, normalizedName)
    authStore.setRole(role.value)
```

并把 `redirectAfterAuth` 函数替换为角色感知版本（默认落地用角色首页，显式 redirect 时仍尊重）：

```typescript
function redirectAfterAuth() {
  const explicit = redirectUrl.value && redirectUrl.value !== '/pages/mine/index'
  const target = explicit ? redirectUrl.value : roleHomeUrl(authStore.isTeacher)
  const tabPages = [
    '/pages/study/index',
    '/pages/teaching/index',
    '/pages/life/index',
    '/pages/psychology/index',
    '/pages/mine/index'
  ]
  const targetPath = target.split('?')[0]
  if (tabPages.includes(targetPath)) {
    uni.switchTab({
      url: targetPath,
      fail: () => {
        uni.switchTab({ url: '/pages/mine/index' })
      }
    })
    return
  }
  uni.redirectTo({
    url: target,
    fail: () => {
      uni.switchTab({ url: '/pages/mine/index' })
    }
  })
}
```

- [ ] **Step 4: 类型检查 + 手动验证**

Run: `npm run test:unit:run`（确保无回归）
Expected: 全部 PASS

手动（`npm run dev:h5`）：注册一个「教师」账号 → 落地教学首页、tab 含教学不含学习；注册「学生」→ 落地学习首页、tab 含学习不含教学。

- [ ] **Step 5: 提交**

```bash
git add src/pages/mine/register.vue
git commit -m "feat(auth): 注册页增加学生/教师身份选择并落地对应端首页"
```

---

## Task 5: 登录页按角色落地

**Files:**
- Modify: `src/pages/mine/login.vue`

- [ ] **Step 1: 增加导入**

在 `src/pages/mine/login.vue` `<script setup>` 中，`import { useAuthStore } ...` 之后增加：

```typescript
import { roleHomeUrl } from '@/utils/auth-guard'
```

- [ ] **Step 2: 替换 redirectAfterAuth 为角色感知版本**

把 `login.vue` 的 `redirectAfterAuth` 函数整体替换为（与 register 一致）：

```typescript
function redirectAfterAuth() {
  const explicit = redirectUrl.value && redirectUrl.value !== '/pages/mine/index'
  const target = explicit ? redirectUrl.value : roleHomeUrl(authStore.isTeacher)
  const tabPages = [
    '/pages/study/index',
    '/pages/teaching/index',
    '/pages/life/index',
    '/pages/psychology/index',
    '/pages/mine/index'
  ]
  const targetPath = target.split('?')[0]
  if (tabPages.includes(targetPath)) {
    uni.switchTab({
      url: targetPath,
      fail: () => {
        uni.switchTab({ url: '/pages/mine/index' })
      }
    })
    return
  }
  uni.redirectTo({
    url: target,
    fail: () => {
      uni.switchTab({ url: '/pages/mine/index' })
    }
  })
}
```

> 注：登录时 role 来自 `authStore.init()`（localStorage 恢复）或 `dbUser.role`。同设备此前注册过的账号 role 会从 localStorage 恢复；跨设备依赖 DB 同步（best-effort，与 teacherSubject 同限制）。

- [ ] **Step 3: 验证**

Run: `npm run test:unit:run`
Expected: 全部 PASS

手动：同设备登录已注册的教师/学生账号，分别落地教学/学习首页。

- [ ] **Step 4: 提交**

```bash
git add src/pages/mine/login.vue
git commit -m "feat(auth): 登录后按角色落地对应端首页"
```

---

## Task 6: study / teaching 首页错端守卫

**Files:**
- Modify: `src/pages/study/index.vue`
- Modify: `src/pages/teaching/index.vue`

- [ ] **Step 1: study 首页 onShow 加教师守卫**

在 `src/pages/study/index.vue` 的 `onShow(async () => {` 内，第一行 `isTabBarVisible.value = true` **之前**插入：

```typescript
  if (authStore.isLoggedIn && authStore.isTeacher) {
    uni.reLaunch({ url: '/pages/teaching/index' })
    return
  }
```

- [ ] **Step 2: teaching 首页 onShow 加学生守卫**

在 `src/pages/teaching/index.vue` 的 `onShow(async () => {` 内，第一行 `isTabBarVisible.value = true` **之前**插入：

```typescript
  if (authStore.isLoggedIn && !authStore.isTeacher) {
    uni.reLaunch({ url: '/pages/study/index' })
    return
  }
```

> 两页均已 `import { useAuthStore }` 并持有 `authStore`（study 见现有 `const authStore = useAuthStore()`；teaching 同），无需新增导入。**实现前用 grep 确认**：`grep -n "useAuthStore" src/pages/teaching/index.vue`，若未引入则补 `import { useAuthStore } from '@/stores/auth'` 与 `const authStore = useAuthStore()`。

- [ ] **Step 3: 验证**

Run: `npm run test:unit:run`
Expected: 全部 PASS（无回归）

手动：
- 学生账号浏览器直达 `/pages/teaching/index` → 自动跳回学习首页。
- 教师账号直达 `/pages/study/index` → 自动跳回教学首页。
- 未登录用户访问两页：行为不变（不触发守卫）。

- [ ] **Step 4: 提交**

```bash
git add src/pages/study/index.vue src/pages/teaching/index.vue
git commit -m "feat(nav): study/teaching 首页增加错端角色守卫

错端角色直达页面时 reLaunch 回本端首页，兜底直达 URL 与 switchTab。
未登录用户行为不变。"
```

---

## 验收对照（对应 spec §9）

1. 学生登录落地学习页，tab=学习·生活·心理·我的 → Task 3 + 5
2. 教师登录落地教学页，tab=教学·生活·心理·我的 → Task 3 + 5
3. 注册可选学生/教师并写入 role → Task 4
4. 错端直达被回跳 → Task 6
5. 存量（无 role）账号按学生端工作 → Task 1（缺省 student）
6. 生活/心理/我的两端一致无回归 → 零改动 + Task 全程 test:unit:run
7. 单元测试通过 → Task 1/2/3 测试

## 范围外（spec §8）

身份切换、存量教师批量迁移、教师端独立视觉、服务端角色强校验，均不在本计划。

## 已知限制

- `role` 跨设备一致性依赖 best-effort DB 同步（Appwrite users 表需有 `role` 字段才能持久化；否则仅本设备 localStorage 生效）——与现有 `teacherSubject` 同限制，符合 spec「最小改造」。
- `register.vue` 的 `.submit-btn`（`#6fde81` + 白字，1.69:1）是既有对比度问题，**不在本计划范围**（与角色拆分无关），建议后续 `/impeccable colorize` 一并处理。
