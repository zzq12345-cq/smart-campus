# 部署文档

本文档说明智慧校园 UniSmart 的前端构建、后端部署、Appwrite 与云函数配置，以及生产环境注意事项。

---

## 架构总览

```
┌─────────────────┐     /api/*      ┌──────────────────┐
│  前端（H5/小程序/App）│ ──────────────▶ │  Express 后端 API  │ :3001
│  uni-app + Vue3  │                 │  TypeScript + tsx │
└────────┬────────┘                 └────────┬─────────┘
         │                                   │
         │  Appwrite Client SDK              │ Appwrite Server SDK
         ▼                                   ▼
┌──────────────────────────────────────────────────────┐
│            Appwrite（BaaS）                          │
│  项目 rainbowrain · 数据库 mindguard · 5 个云函数      │
│  Auth / DB / Storage / Realtime / Functions          │
└──────────────────────────┬───────────────────────────┘
                           │ AI 调用
                           ▼
                 ┌────────────────────┐
                 │  智谱 AI / BigModel  │
                 │  GLM 系列            │
                 └────────────────────┘
```

前端通过两条路径访问数据：(1) 直接用 Appwrite Client SDK 读写（受行级权限约束）；(2) 经后端 API（`/api/*`，JWT 鉴权，处理需要服务端权限或聚合的逻辑，如 AI、PPT、私密消息）。

---

## 前端构建

uni-app 支持三端，产物不同：

| 目标 | 命令 | 产物 |
| --- | --- | --- |
| H5（Web） | `pnpm build:h5` | `dist/build/h5/`（静态文件，部署到任意静态托管 / Nginx） |
| 微信小程序 | `pnpm build:mp-weixin` | `dist/build/mp-weixin/`（用微信开发者工具打开上传） |
| App | `pnpm build:app` | App 包（经 HBuilderX 或原生打包） |

### H5 部署示例（Nginx）

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/unismart-h5;   # dist/build/h5 的内容
  index index.html;

  # uni-app H5 是 SPA，需 history fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # 反向代理后端 API
  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

> 开发环境下，Vite 已在 `vite.config.js` 配置 `/api` 代理到 `http://localhost:3001`，无需手动处理跨域。

---

## 后端部署（`server/`）

后端是独立的 Node.js 子项目（`server/package.json`，包名 `unismart-server`），用 `tsx` 运行 TypeScript，无需预编译。

### 环境变量

复制 `server/.env.example` 为 `server/.env`，按下表配置：

| 变量 | 说明 | 是否敏感 | 默认值 |
| --- | --- | --- | --- |
| `PORT` | 监听端口 | 否 | `3001` |
| `NODE_ENV` | 环境（`production` 时影响日志等） | 否 | `development` |
| `JWT_SECRET` | **JWT 签名密钥**，生产必须改为强随机 | **是** | 开发占位值 |
| `JWT_EXPIRES_IN` | Token 有效期（ms 语法） | 否 | `7d` |
| `CORS_ORIGINS` | 允许的前端来源（逗号分隔） | 否 | `http://localhost:5173,http://localhost:5174` |
| `APPWRITE_ENDPOINT` | Appwrite 端点 | 否 | `https://sgp.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Appwrite 项目 ID | 否 | `rainbowrain` |
| `APPWRITE_API_KEY` | **Appwrite 服务端 API Key**（绕过行级权限） | **是** | — |
| `APPWRITE_DATABASE_ID` | 数据库 ID | 否 | `mindguard` |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI 对话配置（智谱） | **AI_API_KEY 是** | — |
| `ZHIPU_API_KEY` / `ZHIPU_BASE_URL` | **PPT 生成**配置（智谱） | **ZHIPU_API_KEY 是** | — |
| `PPT_OUTLINE_MODEL` / `PPT_RENDER_MODEL` | PPT 大纲 / 渲染模型 | 否 | `glm-5.1` / `glm-5v-turbo` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `RATE_LIMIT_AI_MAX` | 限流配置 | 否 | 见 `.env.example` |

> 此外 `server/config/index.ts` 为每张数据表（users / posts / comments / follows ...）定义了 `*_TABLE_ID` 环境变量覆盖项，均有合理默认值。仅在 Appwrite 中重命名了表时才需覆盖。

> 表 ID 默认值（`users`、`posts`、`comments`、`post_interactions`、`follows`、`notifications`、`conversations`、`conversation_members`、`messages`、`checkins`、`journals`、`study_checkins`、`study_materials`、`exam_plans`、`market_items`、`events`、`event_registrations`、`job_listings`、`venues`、`point_balances`、`point_transactions`、`user_sessions`）已预设，通常无需改动。

### 启动方式

```bash
cd server
pnpm install --frozen-lockfile
pnpm start        # 生产：tsx index.ts
# 或用进程管理器（推荐）：
# pm2 start "tsx index.ts" --name unismart-server
```

生产建议用 **PM2** / **Docker** / systemd 守护进程，并配置反向代理（Nginx）做 TLS 终止与 `/api` 转发。

### 类型检查

后端有独立 tsconfig（`moduleResolution: bundler`，`strict: true`）。提交前 / CI 中运行：

```bash
cd server && pnpm run type-check   # tsc --noEmit
```

---

## ⚠️ 密钥安全

| 密钥 | 用途 | 轮换建议 |
| --- | --- | --- |
| `JWT_SECRET` | 签发用户登录 Token | 至少 32 位强随机；泄露后需轮换并强制所有用户重新登录 |
| `APPWRITE_API_KEY` | 后端以服务端身份读写 Appwrite 数据 | 在 Appwrite 控制台按需创建/吊销；遵循最小权限 |
| `AI_API_KEY` / `ZHIPU_API_KEY` | 智谱 AI 计费调用 | 在智谱后台管理；泄露会被盗刷额度 |

**硬性要求**：

1. `.env` / `server/.env` 已在 `.gitignore` 中，**切勿** `git add -f` 强制提交。
2. 生产密钥通过环境变量或密钥管理服务注入，不写入镜像 / 仓库。
3. 发现泄露立即在各平台轮换，而非仅删除文件。

---

## Appwrite 前置

部署前需准备一个 Appwrite 实例（自建或 Cloud），并完成：

1. **创建项目**（本项目默认 `rainbowrain`）与**数据库**（默认 `mindguard`）。
2. **创建数据表**：见上「表 ID 默认值」列表，表名与属性需与 `src/types/` 中的接口对应。
3. **配置行级权限**：用户表（users）需按 `buildUserPermissions(userId)` 设置读 / 写权限（见 `server/services/auth.service.ts`）。
4. **创建 Storage Bucket**：用于头像、帖子图片、学习资料等（见 `src/services/storage.ts` 的 bucket ID）。
5. **部署云函数**（见下）。

前端连接配置硬编码在 `src/config/appwrite.ts`（`projectId` / `endpoint`），如需切换实例请修改此处。

---

## Appwrite 云函数

`functions/` 下有 5 个云函数，按需在 Appwrite 控制台部署：

| 函数 | 运行时 | 说明 |
| --- | --- | --- |
| `follows` | Node | 关注 / 取消关注操作 |
| `private-messaging` | Node | 私信会话创建与消息发送 |
| `geoip-enrich-user-sessions` | Node | 用户会话的 GeoIP 地理信息 enrichment（跳过内网/本地 IP） |
| `mental-health-pipeline` | Node | 心理健康风险评估 + 干预派发（规则引擎 + AI 结构化评估；触发于帖子/日记/打卡/考试计划） |
| `education-jw` | **Python 3.12** | 教务系统（`jw.xujc.com`）对接 PoC：验证码登录、课表、成绩（无 OCR、无代理池） |

部署步骤（以 Node 函数为例）：

1. 在 `functions/<name>/` 下 `pnpm install`（Python 函数用 `pip install -r requirements.txt`）。
2. 在 Appwrite 控制台「Functions」新建函数，选择对应运行时与入口。
3. 上传代码或关联仓库，配置触发事件（如 `databases.*.collections.posts.documents.create`）。
4. 按需配置函数级环境变量（如 Appwrite endpoint、AI key）。

---

## CI / 质量门禁

`.github/workflows/ci.yml` 在 push 到 `main` 与所有 PR 上并行运行：

| Job | 内容 |
| --- | --- |
| **Lint** | `pnpm run lint`（ESLint，0 errors 为通过） |
| **Unit Test** | `pnpm run test:unit:run`（Vitest） |
| **Type Check** | 前端 `vue-tsc --noEmit` + 后端 `server/` 的 `tsc --noEmit` |

本地提交前建议完整跑一遍：

```bash
pnpm lint && pnpm type-check && pnpm test:unit:run
cd server && pnpm run type-check && pnpm test && cd ..
```

---

## 测试

| 类型 | 工具 | 命令 | 说明 |
| --- | --- | --- | --- |
| 单元测试（前端） | Vitest + happy-dom | `pnpm test:unit:run` | 覆盖 stores / composables / services / utils / 页面交互 |
| 单元测试（后端） | Vitest | `cd server && pnpm test` | API 路由集成测试 |
| 覆盖率 | Vitest + v8 | `pnpm test:coverage` | 报告 `text` + `html` |
| E2E | Playwright | 手动 | `tests/e2e/ui-verify.spec.ts` 存在冒烟用例，但**未接入 CI**（无 `playwright.config`） |

运行 E2E 前需手动启动 `pnpm dev:h5`，再用 Playwright CLI 指向 `http://localhost:5173` 执行。
