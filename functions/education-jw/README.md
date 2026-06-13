# Education JW Function

这个 Appwrite Function 用于以 PoC 方式接入 `jw.xujc.com` 教务系统，当前支持：

- `getCaptcha`
- `getLoginLink`
- `submitLogin`
- `checkLoginLink`
- `confirmLoginLink`
- `getScheduleSemesters`
- `getSchedule`
- `getGrades`

## 运行时

- Runtime：`python-3.12`
- Entrypoint：`src/main.py`
- Build command：`pip install -r requirements.txt`

## 必填环境变量

- `APPWRITE_ENDPOINT`（可回退到 `APPWRITE_FUNCTION_API_ENDPOINT`）
- `APPWRITE_PROJECT_ID`（可回退到 `APPWRITE_FUNCTION_PROJECT_ID`）
- `APPWRITE_DATABASE_ID`，默认 `mindguard`
- `APPWRITE_JW_LOGIN_CHALLENGES_TABLE_ID`，默认 `jw_login_challenges`

## 可选环境变量

- `APPWRITE_API_KEY`，未显式提供时回退到运行时注入的 `x-appwrite-key`
- `JW_BASE_URL`，默认 `http://jw.xujc.com`
- `JW_REQUEST_TIMEOUT`，默认 `15`
- `JW_CHALLENGE_TTL_SECONDS`，默认 `300`

## 说明

- 当前支持手动验证码登录与扫码链接登录，不启用 OCR。
- 不使用代理池 / MySQL / 本地持久化目录。
- challenge 会临时写入 Appwrite TablesDB，用于串联验证码与登录提交。
- `getScheduleSemesters` 会按前端传入的 `cookieBundle` 仅抓取学期列表，并为每个学期返回 `startDate`（第一学期默认 `9/1`，第二学期默认 `2/24`）。
- `getSchedule` 改为按需抓取单个学期课表；前端可在传入 `semesterId` 后只拉取当前选中学期的课程数据。
