---
name: 智慧校园 UniSmart
description: 一站式校园服务 App——温暖且现代的学习、生活、心理与教学入口
colors:
  study-blue: "#4A90E2"
  life-gold: "#f49d25"
  teaching-red: "#C00000"
  psychology-purple: "#886fde"
  mine-green: "#6fde81"
  bg-light: "#f6f6f8"
  bg-dark: "#15131f"
  surface-light: "#ffffff"
  surface-dark: "#181927"
  ink-strong: "#1e293b"
  ink-muted: "#64748b"
  ink-soft: "#94a3b8"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, -apple-system, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Plus Jakarta Sans, -apple-system, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Plus Jakarta Sans, -apple-system, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, -apple-system, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.psychology-purple}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    typography: "{typography.title}"
  card-glass:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.lg}"
    padding: "16px"
  quick-access-card:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.lg}"
    padding: "12px"
    size: "40px"
  input-search:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  fab-ai:
    backgroundColor: "{colors.psychology-purple}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.full}"
    size: "56px"
---

# Design System: 智慧校园 UniSmart

## 1. Overview

**Creative North Star: "The Sunlit Campus（阳光校园）"**

智慧校园的视觉语言像清晨的阳光透过教学楼的窗户：柔和、明亮、有呼吸感。它把校园生活里原本割裂的五件事——学习、生活、心理、教学、个人——收进一个温暖的入口。每个模块拥有自己的主题色，像不同朝向的房间各有光线，而玻璃拟态是贯穿全屋的通用材质：半透明的表面让色彩柔化地透出来，而非生硬地块面堆叠。这是一个 uni-app 多端产品（H5 / 微信小程序 / App），所有尺寸以 `rpx` 表达（375px 设计稿下 1px = 2rpx）。

这套系统服务两类用户：学生需要被陪伴的黏性，教师需要办完即走的效率。它们共享同一套组件语言，通过节奏与密度而非两套视觉体系来区分。温暖来自柔和的多彩主题、有呼吸感的留白与恰到好处的微交互；现代来自克制的玻璃质感、清晰的层级与流畅自然的动效。

这套系统**明确拒绝**：冷冰冰的企业后台 / SaaS 仪表盘观感（深蓝 + 高饱和绿、密集数据卡片墙）；儿童化 / 游戏化的花哨装饰（强烈渐变、满屏贴纸）；千篇一律的通用模板卡片网格；以及臃肿的传统教务系统（信息密度过高、操作路径绕、层层菜单嵌套）。

**Key Characteristics:**
- 五模块彩色身份：颜色是导航锚点，不是装饰
- 克制的玻璃拟态：仅在真正提升层级感时使用
- 柔软亲和的组件手感：大圆角、柔和阴影、细腻微交互
- 内建暗色模式，对比度全程满足 WCAG AA
- 移动端优先，`rpx` 响应式单位

## 2. Colors

调色板由五个模块主题色 + 一组冷调中性灰构成；主题色明亮饱和，中性色克制偏冷，让彩色得以主导情绪。

### Primary
- **Knowledge Blue / 学习蓝** (#4A90E2)：学习模块的锚点色——课表、帖子、考试、资料。代表知识与专注。
- **Warmth Gold / 生活金** (#f49d25)：生活模块的锚点色——服务、信息流、打卡。代表温暖与日常烟火气。
- **Calm Purple / 心理紫** (#886fde)：心理模块的锚点色，也是全局通用强调色（AI 按钮、主按钮、玻璃描边）。代表平静与陪伴，是差异化重点模块的灵魂色。

### Secondary
- **Passion Red / 教学红** (#C00000)：教学模块的锚点色——面向教师的教学管理。代表热情与重点，因其强度仅用于教学场景。
- **Personal Green / 我的绿** (#6fde81)：个人中心模块的锚点色。代表生长与归属。

### Neutral
- **Page Light / 浅色页面底** (#f6f6f8)：浅色模式页面背景，常叠加各模块的微弱渐变光晕。
- **Page Dark / 暗色页面底** (#15131f)：暗色模式页面背景，偏紫调的深色而非纯黑。
- **Surface / 卡片表面** (#ffffff 浅 / #181927 暗)：玻璃卡片的基底，实际渲染时带半透明与模糊。
- **Ink Strong / 主文本** (#1e293b, slate-900)：标题与正文主色，浅底上稳过 4.5:1。
- **Ink Muted / 次文本** (#64748b, slate-500)：副标题、说明文字。
- **Ink Soft / 弱文本** (#94a3b8, slate-400)：仅用于大字号或非关键辅助信息，禁止用作正文。

### Named Rules
**The Color-as-Place Rule（彩色即定位）。** 每个模块的主题色是用户「我在哪个房间」的直觉锚点。一个页面以其所属模块的主题色为唯一强调色，禁止在学习页里出现教学红、在生活页里出现心理紫。跨模块的通用元素（AI 按钮、全局主按钮）统一用心理紫。颜色服务于定位，不滥用为装饰。

**The Soft-Ink Floor Rule（弱文本下限）。** Ink Soft (#94a3b8) 在浅底上达不到正文 4.5:1，**禁止用于正文或占位符**。正文与占位符至少用 Ink Muted (#64748b)。玻璃半透明表面叠加彩色光晕时，文本对比度必须逐一实测。

## 3. Typography

**Display / Body Font:** Plus Jakarta Sans（西文）+ PingFang SC / Microsoft YaHei（中文回退）

**Character:** 单一家族多字重策略。Plus Jakarta Sans 是一款几何人文混合无衬线，圆润的字形契合「柔软亲和」气质，又不失现代精致。中文走系统字体保证多端一致与渲染性能。层级靠字重（400/500/600/700）与字号拉开，不引入第二个相似字体。

### Hierarchy
- **Display** (700, 22px / 44rpx, line-height 1.2)：页面 Hero 主标题，如生活页「self improvement」横幅标题。字间距 -0.01em。
- **Headline** (700, 17px / 34rpx, line-height 1.3)：区块标题、Hero 副区。
- **Title** (700, 14px / 28rpx, line-height 1.4)：卡片标题、列表项主文。
- **Body** (400, 14px / 28rpx, line-height 1.6)：正文与说明。中文段落控制在舒适阅读宽度内。
- **Label** (600, 11px / 22rpx, line-height 1.4)：徽标数字、标签、次要元信息。

### Named Rules
**The Weight-Over-Family Rule（字重优于多字体）。** 层级只用 Plus Jakarta Sans 的四个字重拉开，**禁止**为了「设计感」引入第二款相似的无衬线。要对比，靠字重与字号，不靠字体混搭。

## 4. Elevation

混合策略：以**玻璃拟态 + 柔和投影**共同表达层级。表面通过 `backdrop-filter: blur(12px)` 的半透明玻璃材质浮于带渐变光晕的页面背景之上，再叠加低强度的柔和投影。投影是氛围性的（柔化边界、营造漂浮感），不是结构性的硬边界。模块主按钮 / FAB 使用带主题色的彩色投影强化呼吸感。

### Shadow Vocabulary
- **Card / 卡片** (`box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)`)：默认卡片浮起。
- **Lg / 中浮起** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`)：弹层、突出卡片。
- **Xl / 高浮起** (`box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`)：模态、Hero。
- **Colored / 彩色投影** (`box-shadow: 0 10px 15px -3px rgba(136,111,222,0.2)`)：主按钮、FAB，投影染上模块主题色。
- **Glass / 玻璃投影** (light: `0 4rpx 14rpx rgba(31,38,135,0.05)`; dark: `0 4rpx 16rpx rgba(0,0,0,0.20)`)：玻璃卡片专用极柔投影。

### Named Rules
**The Purposeful-Glass Rule（玻璃须有理由）。** 玻璃拟态是品牌资产，但**仅在真正提升层级感时使用**——浮于内容之上的卡片、顶栏、弹层。禁止把模糊半透明当作默认背景特效铺满全页；那是 AI slop 的写法。

## 5. Components

整体气质：**柔软亲和**——大圆角、柔和投影、细腻微交互。按钮、卡片、输入框都偏圆润有温度，避免硬朗冷峻的边角。

### Buttons
- **Shape:** 全圆角胶囊为主（9999rpx / `rounded.full`），中等元素用 16px（`rounded.lg`）。
- **Primary:** 心理紫底 (#886fde) + 白字，padding 12px 24px，叠加彩色投影。
- **Hover / Active:** 轻微下压 `translateY` + 投影增强，200ms ease。tap 态用 0.96 缩放给柔软反馈。

### Cards / Containers
- **Corner Style:** 16px（`rounded.lg`），Hero 横幅用 18px（36rpx）更圆润。
- **Background:** 玻璃表面 `var(--glass-bg)`（浅 rgba(255,255,255,0.68) / 暗 rgba(30,41,59,0.55)）+ `backdrop-filter: blur(12px)`。
- **Shadow Strategy:** 见 Elevation 的 Glass / Card 投影。
- **Border:** 1px 玻璃描边（浅 rgba(255,255,255,0.78) / 暗 rgba(255,255,255,0.10)）。
- **Internal Padding:** 16px（`spacing.lg`）。

### Inputs / Fields
- **Style:** 玻璃表面 + 全圆角胶囊（`rounded.full`），padding 8px 16px。
- **Focus:** 描边转为当前模块主题色 + 轻微外发光。
- **Placeholder:** 至少 Ink Muted (#64748b)，禁止用 Ink Soft，确保占位符 ≥4.5:1。

### Navigation
- **底部 TabBar** (`AppTabBar.vue`)：高度 56px，玻璃顶层。当前模块图标点亮为该模块主题色，未选为 Ink Muted。**状态不单靠颜色**——选中态同时有图标填充 / 文字加粗，兼顾色弱用户。
- **顶栏** (header-height 56px)：玻璃半透明，支持 `safe-area-inset-top`。

### Floating AI Button (signature)
心理紫 FAB（56px）固定于 right 24px / bottom 96px，是全局 AI 助手入口。带彩色投影与轻微呼吸动效，是产品「陪伴感」的标志性元素。

## 6. Do's and Don'ts

### Do:
- **Do** 让每个页面只用其所属模块的主题色作为唯一强调色；跨模块通用元素统一用心理紫 (#886fde)。
- **Do** 正文与占位符至少用 Ink Muted (#64748b)；在玻璃 + 彩色光晕叠加处逐一实测对比度，确保 ≥4.5:1。
- **Do** 用大圆角（16px 卡片 / 胶囊按钮）与柔和投影维持「柔软亲和」手感。
- **Do** 给所有状态（TabBar 选中、focus、错误）配合图标 / 字重 / 形状，**不单靠颜色**传达。
- **Do** 为所有动效提供 `prefers-reduced-motion` 降级（淡入或瞬时切换）。
- **Do** 暗色模式用偏紫深色 (#15131f) 而非纯黑，保持温暖基调。

### Don't:
- **Don't** 把界面做成企业后台 / SaaS 仪表盘——禁止冷蓝 + 高饱和绿的指标墙、密集数据卡片堆砌。
- **Don't** 用儿童化 / 游戏化花哨装饰——禁止强烈渐变滥用、满屏贴纸、拟物图标。
- **Don't** 堆砌千篇一律的「图标 + 标题 + 文字」等大卡片网格；那是通用模板的 AI slop。
- **Don't** 做成臃肿的传统教务系统——禁止信息密度过高、操作路径绕、层层菜单嵌套。
- **Don't** 用 Ink Soft (#94a3b8) 作正文或占位符（达不到 4.5:1）。
- **Don't** 把玻璃模糊当默认背景特效铺满全页；玻璃须有层级理由。
- **Don't** 用 `border-left` / `border-right` 大于 1px 的彩色侧边条做卡片强调；用整边框、背景微染或前导图标替代。
- **Don't** 在标题上使用 `background-clip: text` 渐变文字；强调靠字重与字号。
