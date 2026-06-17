# 智慧校园 UniSmart

> 一站式校园服务 App——温暖且现代的学习、生活、心理与教学入口。
> uni-app 多端（H5 / 微信小程序 / App），把原本分散在多个系统的学习、生活、心理、教学整合进一个入口。

五大模块各有专属主题色与场景：

| 模块 | 主题色 | 定位 |
| --- | --- | --- |
| 学习 | 蓝 `#4A90E2` | 课表、打卡、资料、考试、帖子 |
| 生活 | 金 `#f49d25` | 信息流、活动、兼职、二手、场馆 |
| 心理 | 紫 `#886fde` | 树洞、心情、日记、评估、咨询（差异化重点） |
| 教学 | 红 `#C00000` | 教学管理、备课、PPT 生成、出题、分析 |
| 我的 | 绿 `#6fde81` | 个人中心、积分、收藏、登录注册 |

> 想了解设计语言与品牌人格，见 [PRODUCT.md](./PRODUCT.md) 与 [DESIGN.md](./DESIGN.md)。

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | uni-app 3.0 · Vue 3 · Pinia · TDesign uniapp · Vite 5 |
| 后端 API | Node.js · Express · TypeScript（`server/`，端口 3001） |
| BaaS | Appwrite（项目 `rainbowrain` @ `sgp.cloud.appwrite.io`，数据库 `mindguard`） |
| 云函数 | Appwrite Functions（5 个，见 [部署文档](./docs/DEPLOYMENT.md#appwrite-云函数)） |
| AI | 智谱 AI / BigModel（GLM 系列，PPT 生成 + AI 对话） |

---

## 环境要求

- **Node.js** `22`（与 CI 一致）
- **pnpm** `10`（包管理器，前端与后端各一份 lockfile）
- 一个可访问的 **Appwrite** 实例（自建或 Cloud）
- 一个 **智谱 AI** API Key（用于 PPT 生成与 AI 对话）

> 后端 `server/` 是独立子项目，有自己的 `package.json` 与 `pnpm-lock.yaml`。
> `functions/education-jw` 云函数额外需要 **Python 3.12**。

---

## 快速开始

### 1. 安装依赖

```bash
# 前端（项目根目录）
pnpm install

# 后端
cd server && pnpm install && cd ..
```

### 2. 配置环境变量

前端根目录与后端各需要一份 `.env`（**已被 gitignore，不会提交**）：

```bash
# 后端：从模板复制并填入真实值
cp server/.env.example server/.env
# 然后编辑 server/.env，至少填入 JWT_SECRET / APPWRITE_API_KEY / AI_API_KEY

# 前端（PPT 生成相关，可选）
# 根目录新建 .env，参考下方「环境变量」表
```

> ⚠️ **安全提示**：`JWT_SECRET`、`APPWRITE_API_KEY`、`AI_API_KEY`、`ZHIPU_API_KEY` 均为敏感密钥。
> 生产环境务必使用强随机值，**切勿**提交到版本库或贴入聊天工具。完整说明见 [部署文档](./docs/DEPLOYMENT.md#环境变量)。

### 3. 启动开发服务

```bash
# 同时启动后端 API（3001）+ 前端 H5（5173）
pnpm dev:all

# 或分开启动
pnpm dev:server   # 后端：tsx watch，端口 3001
pnpm dev:h5       # 前端：H5 开发服务器，端口 5173
```

前端 H5 启动后访问 `http://localhost:5173`，API 请求经 Vite 代理转发到 `http://localhost:3001/api`。

### 环境变量速查

**后端 `server/.env`**（完整模板见 `server/.env.example`）：

| 变量 | 说明 | 是否敏感 |
| --- | --- | --- |
| `PORT` | 后端端口（默认 3001） | 否 |
| `JWT_SECRET` | JWT 签名密钥 | **是** |
| `CORS_ORIGINS` | 允许的前端来源（逗号分隔） | 否 |
| `APPWRITE_ENDPOINT` | Appwrite 端点 | 否 |
| `APPWRITE_PROJECT_ID` | Appwrite 项目 ID | 否 |
| `APPWRITE_API_KEY` | Appwrite 服务端 API Key | **是** |
| `APPWRITE_DATABASE_ID` | 数据库 ID（默认 `mindguard`） | 否 |
| `AI_API_KEY` | 智谱 AI Key（AI 对话） | **是** |
| `ZHIPU_API_KEY` | 智谱 AI Key（PPT 生成） | **是** |

**前端根目录 `.env`**（可选，PPT 生成相关）：

| 变量 | 说明 |
| --- | --- |
| `VITE_PPT_API_URL` | PPT 后端地址（默认 `http://localhost:3001`） |
| `ZHIPU_API_KEY` / `ZHIPU_BASE_URL` / `PPT_*_MODEL` | PPT 生成模型配置 |

> 前端 Appwrite 配置（`projectId`、`endpoint`）硬编码在 `src/config/appwrite.ts`，非环境变量驱动。

---

## 目录结构

```
智慧校园/
├── src/              # uni-app 前端（Vue 3 + Pinia）
│   ├── pages/        # 页面路由（按模块组织：study/life/psychology/teaching/mine）
│   ├── components/   # 可复用组件（common/、study/、life/、message/...）
│   ├── services/     # API 服务层（~30 个模块，对接 Appwrite / 后端 / 云函数）
│   ├── stores/       # Pinia 状态（auth / points / ui-preferences）
│   ├── composables/  # 组合式函数（useTheme / useFeed / useMessages ...）
│   ├── utils/        # 工具（Appwrite SDK 封装 / auth-guard / 缓存 ...）
│   ├── types/        # TypeScript 类型定义
│   ├── i18n/         # 中英双语（keys / messages）
│   └── config/       # Appwrite 配置
├── server/           # Express + TS 后端 API（端口 3001，独立子项目）
├── functions/        # 5 个 Appwrite 云函数（4 Node + 1 Python）
├── tests/            # 根级 vitest 测试 + e2e/
├── docs/             # 设计 spec / 实现计划 / 部署文档
├── PRODUCT.md        # 产品简介
├── DESIGN.md         # 设计体系（色板 / 字体 / 组件 / 无障碍）
└── package.json      # unismart（前端工作区根）
```

---

## 常用脚本

在项目根目录执行：

| 命令 | 作用 |
| --- | --- |
| `pnpm dev:h5` | 启动 H5 开发服务器（端口 5173） |
| `pnpm dev:server` | 启动后端 API（watch 模式，端口 3001） |
| `pnpm dev:all` | 同时启动后端 + 前端 |
| `pnpm build:h5` | 生产构建 H5 |
| `pnpm dev:mp-weixin` / `pnpm build:mp-weixin` | 微信小程序开发 / 构建 |
| `pnpm dev:app` / `pnpm build:app` | App 开发 / 构建 |
| `pnpm test:unit:run` | 运行单元测试（单次，CI 使用） |
| `pnpm test` | 单元测试（watch 模式） |
| `pnpm test:coverage` | 单元测试 + 覆盖率报告（v8） |
| `pnpm lint` | ESLint 检查 |
| `pnpm lint:fix` | ESLint 自动修复 |
| `pnpm type-check` | vue-tsc 类型检查（`src/`） |
| `pnpm format` / `pnpm format:check` | Prettier 格式化 / 检查 |

后端（`server/`）额外脚本：`pnpm test`（vitest）、`pnpm type-check`（tsc）、`pnpm dev` / `pnpm start`。

---

## 质量门禁

提交时会触发 husky `pre-commit` 钩子，对暂存文件运行 lint-staged（ESLint + Prettier）。

GitHub Actions CI（`.github/workflows/ci.yml`）在 push 到 `main` 和所有 PR 上运行三道门禁：

1. **Lint** — `pnpm run lint`
2. **Unit Test** — `pnpm run test:unit:run`
3. **Type Check** — 前端 `pnpm run type-check`（vue-tsc）+ 后端 `server/` 的 `tsc --noEmit`

---

## 测试

- **单元测试**：Vitest + happy-dom，`pnpm test:unit:run`。测试与源码就近放在 `__tests__/` 目录，覆盖 stores、composables、services、utils、页面交互。
- **覆盖率**：`pnpm test:coverage`（v8 provider）。
- **E2E**：`tests/e2e/ui-verify.spec.ts` 存在一个 Playwright 冒烟用例，但目前**未接入 npm 脚本与 CI**（无 `playwright.config`）。如需运行，手动启动 `pnpm dev:h5` 后用 Playwright CLI 执行。

> 更多部署、云函数、生产配置说明见 **[部署文档](./docs/DEPLOYMENT.md)**。
