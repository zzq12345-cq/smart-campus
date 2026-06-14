# 学生端 / 教师端拆分设计

- 日期：2026-06-14
- 状态：已确认需求，待评审
- 范围：将「教学」模块归入教师端，按角色拆分学生端与教师端导航
- 改造深度：最小（按角色过滤导航 + 默认落地页 + 兜底守卫）

## 1. 背景与目标

智慧校园当前为「单一入口、5 模块全员可见」：自定义 `AppTabBar` 对所有用户显示 学习 / 生活 / 教学 / 心理 / 我的，无任何角色区分。`src/teacher/`（教师类型与服务）与 `src/pages/teaching/`（9 个教学页）已成形，但「教学」面向教师、其余面向学生，混在同一导航里语义混乱。

**目标**：按用户角色拆分为学生端与教师端，把「教学」收进教师端，学生看不到教学、教师看不到学习；其余模块（生活 / 心理 / 我的）两端共享。

## 2. 已确认需求

| 需求轴 | 决定 |
|--------|------|
| 角色识别 | 账号新增显式 `role` 字段：`'student' \| 'teacher'` |
| 角色赋值 | **注册时由用户选择**身份 |
| 存量用户 | **一律默认学生**（无 `role` 字段视为 `student`） |
| 模块归属 | 仅 **学习 ⇄ 教学** 按角色互斥；生活 / 心理 / 我的两端共享 |
| 身份切换 | **角色固定**，一个账号只属于一端，不可在端间切换 |
| 改造深度 | 最小：按角色过滤 `AppTabBar` + 登录后默认落地页 + 错端兜底守卫 |

**导航结果**：
- 学生端 Tab：**学习** · 生活 · 心理 · 我的
- 教师端 Tab：**教学** · 生活 · 心理 · 我的
- 仅第一格在 学习（蓝）/ 教学（红）之间随角色互换，后三格两端一致。

## 3. 关键技术约束

`AppTabBar`（`components/common/AppTabBar.vue:138`）使用 **`uni.switchTab`** 切页。`switchTab` 只能跳转到 `pages.json` 的 `tabBar.list` 中注册的页面。study 与 teaching 当前均已在 `tabBar.list` 内。

**推论**：`tabBar.list` 必须**保留全部 5 个页面**（否则 switchTab 失效），按角色的差异只发生在**自定义 `AppTabBar` 的渲染层**——这正是「最小改造」的落点，无需改动原生 tabBar 结构、无需改导航语义。

## 4. 方案（已选定：自定义 TabBar 按角色过滤）

保留 switchTab 与全部 tabBar 页注册，差异只在自定义栏的渲染与登录后的路由分流。已否决的替代方案（改用 reLaunch 移除 tabBar 依赖）改动更大、丢失 tab 切换体验，偏离最小原则。

## 5. 设计细节

### 5.1 数据模型

- `types/auth.ts`：用户 profile 增加 `role?: 'student' | 'teacher'`。可选 + 缺省语义为 `student`，自动覆盖存量用户。
- `stores/auth.ts`：
  - 暴露 `role` 计算属性：`computed(() => dbUser.value?.role === 'teacher' ? 'teacher' : 'student')`（任何非 `'teacher'` 值均归一为 `student`）。
  - 暴露 `isTeacher` 计算属性。
- 后端（Appwrite 用户表）：新增 `role` 字段，与现有 `teacherSubject` 平级（参照 `teacherSubject` 的读写方式）。本 spec 不引入新的持久化机制，仅复用现有 profile 字段通道。

### 5.2 导航：AppTabBar 按角色过滤

- 现有 `tabItems` 列表改为按 `authStore.role` 计算：
  - 第一格：`teacher` → 教学（`/pages/teaching/index`，红 `#C00000`）；`student` → 学习（`/pages/study/index`，蓝 `#4A90E2`）。
  - 后三格固定：生活 / 心理 / 我的。
- `TAB_COLORS` 与激活态图标随之适配（教学红 / 学习蓝）。
- `pages.json` 的 `tabBar.list` **不改**（5 页全保留，供 switchTab）。

### 5.3 登录 / 注册

- `pages/mine/register.vue`：
  - 增加身份单选（学生 / 教师），随注册写入 `role`。
  - 教师选项**不在注册时强制设置 `teacherSubject`**：注册仅写入 `role='teacher'`；学科在首次进入教学首页时补选，复用现有 `teaching/index.vue:203` 的补选守卫逻辑。（如需改为注册时强制选学科，在评审时提出。）
- 登录成功后：按 `role` `reLaunch` 到对应首页（学生 → `/pages/study/index`，教师 → `/pages/teaching/index`），替代当前固定落地。

### 5.4 角色守卫（兜底）

- `pages/study/index.vue` 与 `pages/teaching/index.vue` 的 `onShow`：
  - 若已登录用户角色与本页不符（学生进教学 / 教师进学习），`reLaunch` 跳回其本端首页。
  - 未登录用户维持现有 `requireAuth` 行为不变。
- 目的：兜底直达 URL / `switchTab` / 历史栈导致的错端进入，保证导航过滤的一致性。

### 5.5 不改动的部分

- 生活 / 心理 / 我的三页：零改动（两端共享同一套页面）。
- `pages/teaching/` 的 9 个子页业务逻辑：零改动。
- `teacherSubject` 现有读写流程：保持不变，仅与新增 `role` 并存。

## 6. 边界与异常

- **无 `role` 字段的存量用户**：归一为 `student`，正常进入学生端。
- **教师未设 `teacherSubject`**：进入教学首页时维持现有补选流程（`teaching/index.vue` 已有 `if (!authStore.teacherSubject)` 守卫），不阻断登录。
- **直达 teaching URL 的学生 / 直达 study 的教师**：被 5.4 守卫 `reLaunch` 回本端首页。
- **退出登录**：清除 `role`，回到登录页；游客态不展示需鉴权的端内页。
- **多端编译**（H5 / 微信小程序 / App）：仅涉及 Vue 逻辑与 switchTab，三端行为一致，无平台分支。

## 7. 测试策略

- **单元测试**（vitest）：
  - auth store `role` / `isTeacher` 计算：`teacher` / `student` / 缺省 / 异常值（非法字符串归一为 student）。
  - AppTabBar items 过滤：教师 / 学生分别得到正确的 4 项与首格。
- **守卫逻辑**：study/teaching onShow 守卫在错端角色下触发 reLaunch（对 `uni.reLaunch` 打桩断言目标 URL）。
- **手动验证**（H5）：注册学生 / 教师两类账号，分别核对 tab 组成、默认落地、错端直达 URL 的回跳。

## 8. 不在本次范围（Out of Scope）

- 身份切换 / 双重身份账号。
- 存量教师的批量迁移与后台指定（本次存量一律学生）。
- 教师端独立的首页框架 / 视觉重设计（沿用现有 teaching 页）。
- 角色权限的服务端强校验（本次为前端导航分流；服务端数据权限按现有 Appwrite 规则，不在此改）。

## 9. 验收标准

1. 学生账号登录后落地学习页，tab = 学习 · 生活 · 心理 · 我的，看不到教学。
2. 教师账号登录后落地教学页，tab = 教学 · 生活 · 心理 · 我的，看不到学习。
3. 注册页可选学生 / 教师并正确写入 `role`。
4. 学生直达 `/pages/teaching/index` 被回跳学习页；教师直达 `/pages/study/index` 被回跳教学页。
5. 存量（无 role）账号按学生端正常工作。
6. 生活 / 心理 / 我的三页在两端表现一致、无回归。
7. 相关单元测试通过。
