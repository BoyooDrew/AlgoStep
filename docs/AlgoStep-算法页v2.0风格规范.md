# AlgoStep 算法实验室 · 算法页 v2.0 风格规范

> 基准实现：[`algorithms/template-test.html`](../algorithms/template-test.html)
> 后续所有 v2.0 算法可视化页面均从该模板派生，本规范为其唯一视觉与结构依据。

---

## 1. 适用范围

- 所有放在 `algorithms/` 下的算法演示页（排序、查找、动态规划、图论等）
- 页面形态：左侧信息面板 + 中间代码面板 + 右侧舞台面板的**三栏联动**结构
- 技术要求：单文件、零外部依赖（CSS/JS 全部内联，图标用内联 SVG）

---

## 2. 设计令牌

### 2.1 颜色

| 角色 | 色值 | 用途 |
|---|---|---|
| 页面底色 | `#eef2f8` | `body` 背景 |
| 背景光晕 A | `rgba(99,102,241,.12)` | 左上角径向渐变 |
| 背景光晕 B | `rgba(14,165,233,.10)` | 右下角径向渐变 |
| 主色 | `#4f46e5` | 主按钮、选中态、当前行高亮 |
| 主色 hover | `#4338ca` | 主按钮悬停 |
| 主色浅 | `#818cf8` | 次级高亮、进度、描边 |
| 主色超浅底 | `#eef2ff` | 选中卡片底色 |
| 主色浅描边 | `#c7d2fe` | 卡片 hover 边框 |
| 主色选中描边 | `#a5b4fc` | 卡片 active 边框 |
| 标题渐变 | `#1e1b4b → #312e81 → #4c1d95`（135°） | 标题圆角卡 |
| 文本主色 | `#1e293b` | 正文 |
| 文本次色 | `#64748b` | 说明文字、未激活图标 |
| 文本弱色 | `#94a3b8` | 分组标题、辅助值 |
| 分隔线 | `#e2e8f0` | 卡片边框、分隔线 |
| 极浅分隔 | `#f1f5f9` | 菜单内部分隔 |
| 代码区底 | `#0b1017 / #121826` | 深色代码面板 |
| 暂停态 | `#F97316`（hover 同色） | 播放中的暂停按钮 |
| 重播态 | `#B7E445`，文字 `#1A2E05`（hover 同色） | 播放结束的重播按钮 |

**规则：暂停态与重播态为固定色，禁止添加 hover 变色规则。**

### 2.2 字体

```
font-family: "Inter", "PingFang SC", "Hiragino Sans GB",
             "Microsoft YaHei", system-ui, -apple-system, sans-serif;
代码字体: "JetBrains Mono", Consolas, monospace;
```

字号梯度：标题 18px / 区块标题 14px / 正文 11.5px / 说明 9.5–10.5px / 代码 14px（行高 1.95）。

### 2.3 圆角与阴影

| 元素 | 圆角 |
|---|---|
| 面板卡片 | 16px |
| 标题卡 / 子卡片 / 面包屑小卡 | 12px |
| 菜单 / 输入框 / 小按钮 | 6–10px |

阴影：`0 4px 14px -8px rgba(49,46,129,.55)`（标题卡）、`0 14px 34px -10px rgba(15,23,42,.32)`（下拉菜单）。

---

## 3. 页面骨架

```
<div class="app-container">            ← 横向三栏，gap 10px，padding 10px
  <section class="panel-card panel-info">   flex: 2
  <section class="panel-card panel-code">   flex: 3
  <section class="panel-card panel-stage">  flex: 5
</div>
<div>底部版权（flex:none）</div>
```

- `body` 为纵向 flex，`min-height: 100vh`，不锁死高度
- `app-container`：`min-height: calc(100vh - 52px)`、**`min-width: 1180px`**
- v2.0 **不使用媒体查询**：窗口变窄时保持三栏比例并横向滚动，避免内容被压扁
- 每个 `panel-card` 为 `display:flex; flex-direction:column; overflow:hidden`

---

## 4. 组件规范

### 4.1 导航栏（面包屑小卡 + 二级下拉）

结构：

```html
<nav class="algo-nav-bar">
  <a class="crumb">🏠 AlgoStep 算法实验室</a>
  <span class="nav-sep">›</span>
  <button class="crumb" id="navToggle">算法目录 ▾</button>
  <span class="nav-sep">›</span>
  <span class="crumb crumb-current">当前算法</span>
</nav>
```

- 容器仅负责布局：横向 flex、`gap: 4px`、`margin: 8px 10px 2px`、无边框无底纹
- 每个面包屑是独立小卡：`padding: 6px 10px`、`border-radius: 12px`、`border: 1px solid #e2e8f0`、白底
- hover：边框 `#c7d2fe` + 底色 `#f8fafc`
- 当前页：边框 `#a5b4fc` + 底色 `rgba(238,242,255,.7)` + 轻阴影，`cursor: default`
- 下拉菜单为**两级结构**：左列一级大类，右侧即时切换该类算法；悬停 / 聚焦 / 点击均可切换
- 面板用 `position: fixed` 挂到 `body`，避免被 `overflow:hidden` 裁切；越界自动左移

### 4.2 标题圆角卡

- 独立圆角卡：`margin: 6px 10px 0`、`border-radius: 12px`、靛蓝 135° 渐变
- 内部：算法中文名（18px，700）+ 英文简称小标签（`ALGO·TPL`，等宽、半透明底）+ 一行简介 + 难度/考察内容标签行 + 虚线分隔的复杂度行（时间/空间，图标 + 等宽数值）
- 标签分两层：难度/考察内容用 `.info-badge` 胶囊（难度用 `--level` 暖色变体）；时间/空间复杂度单独一行 `.info-complexity`，与标签之间用 `1px dashed rgba(255,255,255,.2)` 分隔
- `::before / ::after` 两个模糊光晕装饰，靠 `overflow:hidden` 收在圆角内
- 标题区高度需控制在 ~120px 内，保证左侧面板不滚动

### 4.3 左侧子卡片（`.info-section`）

- 标题行：`div.info-section-title` > `h2`（14px，含 24×24 图标容器）+ 右侧 `.section-meta`
- 禁止出现 `<h2><h2>` 嵌套（会触发浏览器默认 margin，造成大块空白）
- 内边距 `6px 8px`，卡片间距 `5px`，`.info-body` 为 `overflow-y:auto` + 5px 细滚动条

### 4.4 视图模式选项（`.mode-option`）

- 整行按钮：`display:flex`、`gap:8px`、`padding:6px 10px`、`border-radius:12px`、白底 + `1px solid #e2e8f0`
- 左侧图标 + 标题（可带 `.mode-option-badge` 推荐标签）+ 说明文字
- active：边框 `#a5b4fc`、底色 `rgba(238,242,255,.7)`、阴影、图标变主色

### 4.5 快捷键列表（`.shortcut-item`）

- 每行：左「图标组 + 文案」，右 `kbd` 键帽（`padding 5px 8px`，圆角 6px，浅底）
- 播放/暂停为同一行，两个图标并排（`▶ ⏸ 播放 / 暂停` + `Space`）
- 不显示「输入框内快捷键失效」等提示性说明

### 4.6 播放控制条（`.stage-controls`）

单行顺序固定：

```
[上一步] [播放/暂停/重播] [下一步] [重置] [倍速 0.5/1/2/3] [第 X / N 步]
```

- 所有控件 `gap: 8px`，不设 `margin-left:auto` 分隔
- 倍速固定四档：`0.5× / 1× / 2× / 3×`
- 进度**只显示文本**，不渲染可点击的横向进度点
- 主按钮三态：播放 `#4f46e5` → 暂停 `#F97316` → 重播 `#B7E445`；图标与文案同步切换

### 4.7 代码面板

- 深色底 `#0b1017 / #121826`，等宽字体，当前执行行整行高亮（主色系）
- 滚动条统一自定义：8px 宽、圆角 thumb、半透明主色，hover 提亮；需同时覆盖 WebKit 与 `scrollbar-width/color`
- 底部状态栏为**单条合并信息**：`第 X 行 · 当前执行语句`，不再单独放静态提示块

### 4.8 舞台面板

- 画布 / 柱状图 / 网格自适应容器尺寸（`devicePixelRatio` 缩放）
- 图例放舞台底部，用形状 + 文字 + 颜色三重编码

### 4.9 底部版权

- 单行：`© 2026 boyooDrew · AlgoStep 算法实验室 · MIT License`
- `flex:none`，不与主内容抢高度；不放置 Gitee/GitHub 等外链

---

## 5. 图标系统

- 内联 SVG Sprite，`<symbol>` 定义在 `body` 顶部，24×24 viewBox，`stroke-width: 2`
- 引用：`<svg class="ico" aria-hidden="true"><use href="#i-play"/></svg>`
- `.ico` 默认 14px；按钮内 13px；子卡片标题 15px；面包屑 12px（`width: 14px; height: 14px` 可覆盖）
- 现有图标：`i-play / i-pause / i-step-back / i-step-next / i-replay / i-reset / i-generate / i-database / i-layout / i-keyboard / i-code / i-home / i-chevron-down / i-chevron-right`
- 新增图标只需在 Sprite 中追加 `<symbol>`，全站复用；**禁止混用 emoji、`▶` `⏸` `↻` 等字符图标**

---

## 6. 算法可视化配色语义

1. 每屏语义色不超过 3 类：默认态（蓝 / 中性）、当前态（高亮主色或荧光）、完成/已处理态（低饱和灰绿）
2. 颜色语义全局固定，同一颜色不得在不同算法页表达相反含义
3. 状态区分必须「颜色 + 形状/描边/光晕/标签」双编码，不能只靠颜色
4. 避免红—绿作为唯一对比，改用蓝—橙或加入明度差
5. 正文与背景对比度 ≥ 4.5:1；荧光色（`#B7E445`）只用于小面积焦点

---

## 7. 新算法页派生步骤

1. 复制 `algorithms/template-test.html` 到目标目录，如 `algorithms/dp/climb-stairs.html`
2. 改 `<title>`：`AlgoStep 算法实验室 · 爬楼梯`
3. 改 `NAV_CURRENT = { category: 'dp', page: '爬楼梯' }`，导航面包屑与下拉高亮自动对应
4. 改标题区：算法中文名、英文简称、简介、复杂度徽标（`infoTitle / infoSubtitle / infoBadges`）
5. 改「数据与查询」表单控件，适配该算法参数；删掉不用的输入项
6. 替换示例代码为 `EXAMPLE_CODE`，并保证 `codeLine` 与实际行号一一对应
7. 编写 `buildSteps()`：每步给出 `{ codeLine, 说明文字, 状态快照 }`
8. 在 `onStep` 中绘制舞台、刷新侧栏数据、更新 `progressLabel`
9. 自检：左侧面板不滚动、控制条单行、底部版权可见、无响应式断点

---

## 8. 验收清单

- [ ] 页面标题与导航均显示「AlgoStep 算法实验室」
- [ ] 三栏比例 2:3:5，`min-width: 1180px`，无媒体查询
- [ ] 导航为独立面包屑小卡，二级下拉两列可用
- [ ] 标题为独立圆角渐变卡
- [ ] 左侧三个子卡片标题无 `<h2>` 嵌套、间距 5px
- [ ] 所有界面图标来自 Sprite，无字符图标残留
- [ ] 控制条：重置在倍速左、步骤文本在倍速右
- [ ] 播放三态颜色互斥（靛蓝 / 琥珀 / 荧光绿），暂停与重播无 hover 变色
- [ ] 代码区滚动条自定义，底部状态为单条合并信息
- [ ] 底部版权单行可见，无外部链接
- [ ] 正文对比度 ≥ 4.5:1，状态不止依赖颜色
