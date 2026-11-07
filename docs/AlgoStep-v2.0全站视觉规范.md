# AlgoStep v2.0 全站视觉规范

> 适用范围：首页、登录、注册、关于、算法展示页及后续新增页面。
> 基准实现：`css/`、`js/`、`index.html`、`login.html`、`register.html`、`about.html`、`algorithms/template.html`。

---

## 一、共享资源

| 文件 | 作用 |
| --- | --- |
| `css/base.css` | 设计令牌、全局重置、顶栏、页脚、Toast、图标基础 |
| `css/algo.css` | 算法页三栏布局与全部组件 |
| `css/algo-viz.css` | 跨页复用的算法可视化样式（柱状图、网格、数组条等） |
| `css/home.css` | 首页 Hero、分类卡片、更新日志 |
| `css/auth.css` | 登录 / 注册页卡片与表单 |
| `css/about.css` | 关于页 Hero、内容区块、时间线 |
| `js/icons.js` | 全站 SVG 图标 Sprite（放在 `<body>` 最前） |
| `js/site.js` | 顶部导航栏 + 底部信息栏统一注入 |
| `js/algo-core.js` | StepController / CodePanel / 播放、复制、字号、轨迹绑定 |
| `js/algo-nav.js` | 算法目录数据与面包屑下拉 |
| `js/algo-utils.js` | 输入解析与随机数组工具 |

新页面标准引入顺序：

```html
<link rel="stylesheet" href="./css/base.css">
<link rel="stylesheet" href="./css/<页面>.css">

<body class="...">
<script src="./js/icons.js"></script>
...
<script src="./js/site.js" data-base="./" data-auth="off" data-footer="simple"></script>
```

---

## 二、设计令牌

| 分类 | 变量 | 值 |
| --- | --- | --- |
| 页面 | `--v2-page` | `#eef2f8` |
| 光晕 | `--v2-glow-a` / `--v2-glow-b` | `rgba(99,102,241,.12)` / `rgba(14,165,233,.10)` |
| 主色 | `--v2-primary` | `#4f46e5` |
| 主色悬停 | `--v2-primary-hover` | `#4338ca` |
| 主色浅 | `--v2-primary-soft` | `#eef2ff` |
| 主色描边 | `--v2-primary-line` | `#c7d2fe` |
| 卡片 | `--v2-bg-card` | `#ffffff` |
| 边框 | `--v2-border` / `--v2-border-soft` | `#e2e8f0` / `#f1f5f9` |
| 文字 | `--v2-text-strong` | `#0f172a` |
| 文字 | `--v2-text` | `#1e293b` |
| 次要文字 | `--v2-text-secondary` | `#64748b` |
| 弱化文字 | `--v2-text-muted` | `#94a3b8` |
| 代码背景 | `--v2-code-bg` | `#0b1017` |
| 代码标题栏 | `--v2-code-bar` | `#121826` |
| 暂停色 | `--v2-pause` | `#F97316` |
| 重播色 | `--v2-replay` | `#B7E445` |
| 圆角 | `--v2-radius-panel` / `--v2-radius-card` | `16px` / `12px` |
| 阴影 | `--v2-shadow-panel` / `--v2-shadow-menu` | 面板阴影 / 浮层阴影 |

字体：

- 正文：`Inter, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui`
- 等宽：`JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas`

页面背景统一为浅灰蓝 `#eef2f8`，叠加左上靛蓝、右下青蓝两处低透明径向光晕。

---

## 三、页面骨架

| 页面类型 | `body` class | 主内容容器 | 说明 |
| --- | --- | --- | --- |
| 算法页 | `algo-page` | `.app-container`（三栏） | `height:100vh`，三栏内部各自滚动 |
| 首页 | `home-page` | `.home-main` | 最大宽度 `1180px` |
| 关于页 | `about-page` | `.about-main` | 最大宽度 `900px` |
| 登录 / 注册 | `auth-page` | `.auth-shell` + `.auth-card` | 垂直居中卡片 |

三栏布局比例固定：信息区 `flex:2` / 代码区 `flex:3` / 展示区 `flex:5`，最小宽度 `1180px`，窄屏横向滚动，不设响应式断点。

---

## 四、站点外壳

### 顶部导航栏

- 高度 `44px`，深色靛蓝渐变 `#1e1b4b → #312e81 → #4c1d95`。
- 左侧：`AS` 渐变 Logo（26px 圆角方块）+ `AlgoStep` + 分隔线 + `算法可视化实验室`。
- 右侧：可选认证区 + 首页 + 关于 + GitHub Star。
- 认证区按钮为半透明白色描边，注册按钮为靛蓝半透明底。

### 底部信息栏

- `flex:none`，不与主内容抢高度。
- 背景 `rgba(255,255,255,.55)`，上边框 `1px solid #e2e8f0`。
- **字体统一**：`font-family` 正文、`font-size: 11.5px`、`font-weight: 400`、`line-height: 1.7`、`letter-spacing: 0.01em`。
- 变体：
  - `simple`：单行版权，适合算法页 / 登录 / 注册。
  - `full`：品牌行 + 版权行 + Gitee / GitHub / 关于项目，适合首页 / 关于页。
  - 两种变体字号、字重、颜色层级保持一致，仅行数不同。

`site.js` 用法：

```html
<script src="../js/site.js"
        data-base="../"
        data-auth="off"
        data-footer="simple"></script>
```

- `data-base`：链接相对前缀（根目录 `./`，算法子目录 `../`）。
- `data-auth="on"`：渲染 `#auth-area`，由 `js/auth.js` 填充。
- `data-footer`：`simple` / `full` / `none`。

---

## 五、通用组件

### 卡片

- 白底、`1px solid #e2e8f0`、圆角 `16px`、`--v2-shadow-panel`。
- 首页算法卡：圆角 `12px`，悬停上移 `2px`，顶部 3px 靛蓝渐变线淡入。

### 按钮

| 类型 | 样式 |
| --- | --- |
| 主按钮 | `#4f46e5` 底、白字、圆角 8–10px，悬停 `#4338ca` |
| 次按钮 | 白底、`#e2e8f0` 描边、`#475569` 字 |
| 暂停 | `#F97316` 固定色，悬停不变化 |
| 重播 | `#B7E445` 固定色、深绿字 |
| 图标按钮 | 24×24，浅灰描边 |

### 徽标

- 难度：入门绿 / 基础琥珀 / 进阶玫红，均为浅底 + 深字 + 同色系描边。
- 分类：DP 琥珀、排序靛蓝、搜索紫、工具绿。
- 标签、版本号使用等宽字体。

### 提示

- `Toast`：深靛蓝底白字，底部居中，显示 1.6s。
- 表单错误：浅红底 `#fff1f2`，玫红字 `#be123c`。
- 表单成功：浅绿底 `#ecfdf5`，墨绿字 `#047857`。

### 图标

- 统一 24×24 线性图标，`stroke-width:2`，通过 `.ico` 控制尺寸（默认 14px）。
- 所有图标定义在 `js/icons.js`，页面使用 `<svg class="ico"><use href="#i-xxx"/></svg>`。

---

## 六、页面图标（Favicon）

全站统一使用 `AS` 渐变圆角图标，与顶栏 Logo 一致：

- 32×32 画布，圆角 7px。
- 渐变 `#6366f1 → #8b5cf6`。
- 白色 `AS` 粗体字母，水平居中。
- 内联 SVG，不依赖外部图片：

```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg ...>AS</svg>">
```

---

## 七、算法页派生步骤

1. 复制 `algorithms/template.html` 到目标目录。
2. 保留 `<body class="algo-page">` 与 `base.css` / `algo.css` 引用。
3. 调用 `AlgoNav.init({ current, base, home })` 设置面包屑与下拉高亮。
4. 填写 `EXAMPLE_CODE`、`buildSteps()`、`renderStep()` 业务逻辑。
5. 共享模块已覆盖播放、速度、键盘、字号、复制、轨迹跳转，无需在页面内重复实现。

---

## 八、页面自检清单

- [ ] 背景为浅灰蓝 + 双径向光晕，无深色整页背景。
- [ ] 顶栏、页脚与其它页面完全一致（页脚字号 11.5px）。
- [ ] Favicon 为 `AS` 渐变图标。
- [ ] 主色仅使用 `#4f46e5` 系，不混入其它品牌色。
- [ ] 卡片白底、浅描边、统一圆角与阴影。
- [ ] 算法页三栏齐全，控制条单行，底部信息栏可见。
- [ ] 图标全部来自 `js/icons.js`，无外部图标依赖。
