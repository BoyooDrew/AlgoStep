# AlgoStep 项目参考文档

> 本文档为 AI 辅助开发的精简参考，涵盖项目全貌、架构、规范、待办。
> 模型调用开发时读取本文件即可获取完整上下文，无需逐个读取源文件。

---

## 一、项目概要

| 项 | 值 |
|---|---|
| 项目名 | AlgoStep |
| 定位 | 面向 CSP-J/S 考生的算法可视化教学工具 |
| 在线地址 | https://algo-step.surge.sh |
| 仓库 | Gitee: boyoo/algo-step · GitHub: BoyooDrew/AlgoStep |
| 部署平台 | Surge.sh（国内访问稳定，已弃用 Vercel） |
| 许可证 | 源代码 MIT 开源，网站品牌设计保留权利 |
| 作者 | boyooDrew（赵博宇），天津武清，C++ 信息学奥赛教师 |
| 统计 | GoatCounter（algo-step.goatcounter.com） |
| 版本 | v1.0（2026.07 首次发布） |

---

## 二、技术栈

- 纯 HTML5 / CSS3 / 原生 JavaScript（ES6），零框架依赖
- CSS 变量设计系统 + 响应式布局 + @keyframes 动画
- Canvas 2D 绘图 + DOM/CSS 混合可视化
- 自研 StepController 步骤控制器、CodePanel 代码高亮组件
- GoatCounter 客户端访问统计（sendBeacon + 图片回退）
- 无构建工具，无 npm 依赖（部署用 npx surge）

---

## 三、文件结构

```
/workspace/
├── index.html              # 首页（Hero + 分类卡片 + Changelog + 作者徽章）
├── about.html              # 关于页（开发者介绍 + 技术栈 + 更新计划）
├── view.html               # 数据统计面板（.gitignore 排除，含 API Key）
├── algorithms/
│   ├── template.html       # 新算法页模板（四区块布局）
│   ├── sort/
│   │   ├── bubble-sort.html
│   │   ├── selection-sort.html
│   │   ├── insertion-sort.html
│   │   └── quick-sort.html
│   ├── dp/
│   │   ├── climb-stairs.html
│   │   ├── 0-1knapsack.html
│   │   ├── complete-knapsack.html
│   │   ├── lis.html
│   │   └── lcs.html
│   └── search/
│       ├── binary-search.html
│       ├── dfs.html
│       └── bfs.html
├── css/
│   ├── common.css          # 全局变量 + 四区块基础样式
│   ├── layout.css          # 布局模板 + 柱状图/网格/数组/指针
│   └── animations.css      # 6个关键帧动画 + 工具类
├── js/
│   ├── common.js           # StepController 类 + GoatCounter 加载
│   ├── controls.js         # bindControls() 事件绑定 + 滑块填充
│   ├── code-panel.js       # CodePanel 类 + 轻量正则语法着色
│   └── goatcounter.js      # GoatCounter SDK（第三方，不修改）
├── goatcounter-guide/      # GoatCounter 配置指南页面
├── .gitignore              # 排除 view.html/.uploads/IDE配置/系统文件
├── LICENSE.txt             # MIT 许可证
├── README.md
├── 部署指南.md
├── 算法开发提示词指南.md    # 含全部算法的开发规范和避坑清单
└── 项目问题跟踪.md          # Bug 跟踪（7轮已完成，P2工程健壮性待修复）
```

---

## 四、CSS 设计系统

### 4.1 颜色变量（common.css :root）

```css
--brand:   #3b82f6;   /* 控制区主色（蓝） */
--warn:    #f59e0b;   /* 步骤解释区（琥珀） */
--accent:  #8b5cf6;   /* 演示/代码区（紫） */
--success: #10b981;   /* 成功/已排序/找到 */
--danger:  #ef4444;   /* 危险/重置 */

--bg-page:    #020617;
--bg-card:    #0b1220;
--bg-card-2:  #111827;
--border:     #334155;
--text-strong: #f1f5f9;
--text:        #e2e8f0;
--text-muted:  #94a3b8;

--radius-sm: 8px / --radius-md: 12px / --radius-lg: 16px;
```

### 4.2 四区块布局

每个算法页统一结构：

```
#stage
├── header                      区块1: 标题区（渐变蓝紫，左竖线 brand 色）
│   ├── h1 + .subtitle
│   └── .badge/.difficulty      难度标签
├── section.control-panel       区块2: 控制区（淡蓝底，左竖线 brand）
│   ├── .control-row × 3        参数行 / 按钮行 / 进度行
│   └── 按钮ID: btnGenerate/btnReset/btnStart/btnPause/btnPrev/btnNext/btnReplay
│       滑块ID: speed-slider/progress-slider
├── section.explanation-panel   区块3: 步骤解释区（淡黄底，左竖线 warn）
│   ├── .formula-box            公式 + #current-result
│   └── .step-info              #step-counter + #step-en + #step-zh
└── section.visualization-section  区块4: 演示+代码（紫色系，左右各50%）
    ├── .canvas-container       左：Canvas/DOM可视化
    └── .info-panel             右：.code-panel + .array-container
```

### 4.3 响应式断点

- `≤960px`：左右分栏 → 上下堆叠，DP网格 cell 缩小
- `≤600px`：body padding 缩小，slider 缩窄

### 4.4 按钮类名

| 类名 | 用途 | 颜色 |
|---|---|---|
| `.btn-primary` | 生成/播放 | 蓝色 #3b82f6 |
| `.btn-secondary` | 暂停 | 琥珀色 |
| `.btn-accent` | 上一步/下一步 | 紫色 |
| `.btn-danger` | 重置 | 红色 |
| `.btn-success` | 成功操作 | 绿色 |
| `.btn-trace` | 回溯按钮 | 洋红渐变 #ec4899→#db2777 |

### 4.5 动画工具类（animations.css）

```css
.anim-pop-in      /* scale(0.8→1) 弹出 */
.anim-fade-in     /* 淡入 */
.anim-slide-up    /* 向上滑入 */
.anim-blink       /* 闪烁 */
.anim-scale-bounce /* 缩放弹跳 */
.anim-glow        /* 呼吸发光 */
.anim-pulse       /* 脉冲高亮 */
.scrollbar-thin   /* 细滚动条 */
```

### 4.6 难度标签体系

| 中文 | 英文 | CSS类 | 含义 |
|---|---|---|---|
| 入门 | Beginner | `.difficulty.beginner` | 零基础可理解 |
| 基础 | Basic | `.difficulty.basic` | 需理解核心思想 |
| 进阶 | Advanced | `.difficulty.advanced` | 需多维度分析 |

---

## 五、JavaScript 架构

### 5.1 StepController（common.js）

核心步骤控制器，管理播放/暂停/进度/步骤切换。

```javascript
const controller = new StepController({
    steps: [{ en, zh, codeLines?, formula?, type? }, ...],
    autoSpeed: 800,           // 每步间隔ms
    statusElement: el,        // 可选
    onStep(step, index) {},   // 进入新步骤回调
    onFinish() {},
    onReset() {},
    onChangeSpeed(ms) {}
});

// API
controller.play() / pause() / toggle()
controller.prev() / next() / goTo(index)  // index从-1开始
controller.reset()
controller.setSpeed(ms)
controller.setSteps(stepsArray)  // 替换步骤并重置
controller.init()                 // 重置为"准备中"

// 只读属性
controller.step / currentStep / totalSteps / isPlaying
```

- `index` 从 `-1` 开始（-1 = 准备阶段）
- `onStep` 兼容两种签名：`(step, index)` 和 `(index)`
- common.js 末尾自动注入 GoatCounter 脚本

### 5.2 bindControls（controls.js）

统一绑定按钮/滑块/键盘快捷键。

```javascript
bindControls({
    controller,              // 必须
    onGenerate() {},         // 生成场景
    onReset() {},            // 重置
    onReplay() {},           // 重新播放
    onStep(step, index) {},  // 每步额外回调
    speedLabel: { 400:'很快', 800:'快', 1500:'中等', 3000:'慢' }
    // 或数组格式: [{ max:300, text:'很快' }, ...]
});
```

- 使用 `WeakMap` 管理监听器，重复绑定时自动解绑旧的
- 键盘：空格(播放/暂停)、←→(上/下一步)、R(重置)、G(生成)
- 兼容新版ID(btnStart)和旧版ID(btn-play)
- 滑块填充色用 CSS 变量 `--percent` + `linear-gradient`

### 5.3 CodePanel（code-panel.js）

代码面板组件，手写HTML自动语法着色。

```javascript
// 方式A（推荐）：HTML手写 .code-line，JS只做着色
const panel = new CodePanel('#codePanel');
panel.highlight(2);           // 高亮第3行（0-based）
panel.highlight([2, 6]);      // 多行高亮
panel.highlight(2, 'recursion'); // 带变体高亮
panel.clearHighlight();

// 方式B：JS构造
new CodePanel('#codePanel', lines, 'cpp');
new CodePanel('#codePanel', { language:'cpp', code:'...' });
```

- 支持 cpp / javascript / java / python 关键字高亮
- 色值：cp-kw(紫#c678dd) / cp-str(绿#98c379) / cp-num(橙#d19a66) / cp-op(青#56b6c2) / cp-com(灰#5c6370)
- `.code-line.active` = 紫色高亮
- `.code-line.active-recursion` = 洋红高亮（递归调用行）
- highlight 后自动 scrollIntoView

### 5.4 算法页加载顺序

```html
<!-- CSS -->
<link rel="stylesheet" href="../../css/common.css" />
<link rel="stylesheet" href="../../css/layout.css" />
<style> /* 页面专属样式 */ </style>

<!-- JS（顺序固定） -->
<script src="../../js/common.js"></script>
<script src="../../js/code-panel.js"></script>
<script src="../../js/controls.js"></script>
<script> /* 页面业务脚本 */ </script>
```

路径规则：算法页在 `/algorithms/sort/` 等，CSS/JS 在根目录 → 用 `../../`

---

## 六、算法可视化规范

### 6.1 步骤对象结构

```javascript
{
    type: 'compare',         // 步骤类型（见下表）
    en: 'Comparing...',     // 英文描述
    zh: '比较中...',         // 中文描述
    formula: 'dp[i]=...',   // 公式（可选）
    codeLines: [5],         // 高亮代码行号（0-based）
    // 可视化数据字段（各算法自定义）
    dp: [...], highlight: 3, value: 42, etc.
}
```

### 6.2 步骤类型枚举

| 类型 | 说明 | 适用算法 |
|---|---|---|
| `intro` | 介绍，不显示数值 | DP类 |
| `init`/`setup` | 初始化边界 | DP/搜索 |
| `focus` | 聚焦当前位置，显示`?` | DP类 |
| `compare` | 比较过程，不高亮赋值行 | DP类 |
| `decide`/`update_dp` | 写入最终值 | DP类 |
| `update_ans` | 更新全局最优 | LIS |
| `finish` | 计算/遍历完成 | 全部 |
| `backtrack` | 回溯（洋红高亮） | 背包/LIS/LCS |
| `mark` | 节点状态变化 | DFS/BFS |
| `traverse` | 遍历邻居 | DFS/BFS |
| `check` | 条件检查 | 二分查找 |

### 6.3 颜色规范（全局强制）

#### DP类

| 用途 | 颜色 |
|---|---|
| 当前计算位置 | 金色 `#fbbf24` |
| 比较参考（不选/跳过） | 蓝色 `#3b82f6` |
| 比较参考（选/有效） | 绿色 `#10b981` |
| 已完成 | 灰色 `#475569` |
| 回溯选中 | **洋红 `#ec4899`**（绝对不用绿色） |

#### 排序类

| 用途 | 颜色 |
|---|---|
| 默认柱子 | 紫色渐变 `#6366f1→#4338ca` |
| 当前比较 | 橙色 `#f59e0b` |
| 交换/移动 | 红色 `#ef4444` |
| 已排序 | 绿色 `#10b981` |
| 快排pivot | 金色 `#fbbf24` |
| 快排递归范围 | 洋红 `#ec4899` |
| 插入排序key | 紫色 `#8b5cf6` |

#### 搜索类

| 用途 | 颜色 |
|---|---|
| 当前焦点/mid | 金色 `#fbbf24` |
| 搜索范围/当前路径 | 洋红 `#ec4899` |
| 在栈/队列中 | 蓝色 `#3b82f6`（DFS）/ 橙色 `#f59e0b`（BFS） |
| 已排除/已访问 | 灰色/绿色 |

### 6.4 DP 表格规范

- 列数 = `W + 3`（空白列 + i\j + 0..W）
- 每行开头有空白占位格
- `gridTemplateColumns: repeat(W + 3, auto)`
- DP 数值三层分离：`calcDp`（计算用）/ `dp`（展示用，undefined初始）/ `fullDp`（完整结果，供回溯）
- compare 步骤当前格显示 `?` 不是旧值
- compare 步骤 codeLines **不含赋值行**
- intro 步骤无 value 字段
- decide 步骤才写入 dp 展示数组
- 已填格子保持 finished 状态（灰色），下一步不清空

### 6.5 回溯规范

- 回溯只高亮**真正选中/匹配**的元素
- 颜色统一洋红 `#ec4899`
- 按钮统一洋红渐变，id 为 `btnTrace`
- 回溯后将 `controller.index` 设为最后一步
- `tracePath()` 中用 `controller.steps` 不是 `controller.config.steps`

### 6.6 公共文件约束

**绝对禁止修改：**
- `css/common.css` / `css/layout.css` / `css/animations.css`
- `js/common.js` / `js/code-panel.js` / `js/controls.js`

如需修改公共文件，必须先在项目问题跟踪中记录并审核。

---

## 七、各算法页面要点

### 7.1 排序类（4个）

| 算法 | 难度 | 可视化 | 要点 |
|---|---|---|---|
| 冒泡排序 | 入门 | 柱状图 | 相邻比较交换，每轮最大值冒泡到末尾 |
| 选择排序 | 入门 | 柱状图 | 每轮找最小值，与首元素交换 |
| 插入排序 | 入门 | 柱状图 | 取元素向前比较插入，key用紫色 |
| 快速排序 | 基础 | 柱状图 | 分治，pivot金色，递归范围洋红 |

### 7.2 DP类（5个）

| 算法 | 难度 | 可视化 | 要点 |
|---|---|---|---|
| 爬楼梯 | 入门 | Canvas柱状图+dp卡片 | dp[i]=dp[i-1]+dp[i-2] |
| 0-1背包 | 基础 | 二维表格 | 选vs不选，回溯洋红，calcDp/dp/fullDp三层分离 |
| 完全背包 | 进阶 | 二维表格 | 与0-1唯一区别：dp[i][j-wi]而非dp[i-1][j-wi] |
| LIS | 基础 | 一维卡片+序列 | 向前查找更小元素，回溯LIS序列 |
| LCS | 进阶 | 二维网格 | match/mismatch颜色区分，回溯路径 |

### 7.3 搜索类（3个）

| 算法 | 难度 | 可视化 | 要点 |
|---|---|---|---|
| 二分查找 | 入门 | 柱状图+指针 | left/right指针，mid金色，排除变灰 |
| DFS | 基础 | SVG图+递归栈 | 节点三态（未访问/访问中蓝/已访问绿），回溯路径，栈底栈顶标签 |
| BFS | 基础 | SVG图+队列 | 节点三态（未访问/队列中橙/已访问绿），队列可视化 |

### DFS/BFS 特殊布局

DFS和BFS页面有专属覆盖样式：
- `.visualization-section` 取消内部滚动条，顶部对齐
- 左侧 canvas-container 包含：图例 + SVG图 + 递归栈/队列 + 邻接矩阵
- 右侧 info-panel 包含：代码面板 + 紫色高亮提示
- CSS优先级：后定义覆盖先定义（visited > in-queue > neighbor > unvisited）
- 图节点用 SVG circle，class切换状态
- 重置按钮必须重建SVG清空所有残余状态

---

## 八、首页与品牌

### 8.1 首页结构（index.html）

- Hero区：AlgoStep标题 + tagline + 统计（12算法/3分类） + 作者徽章（hover展开社交链接）
- 分类区：DP(5) / 排序(4) / 搜索(3) / 开发工具(1)
- 卡片网格：auto-fill minmax(280px, 1fr)，hover上浮+顶部渐变线
- Changelog区：版本+日期+描述
- 页脚：版权 + Gitee/GitHub链接
- 首页只引 common.css（不引 layout.css），有 `!important` 防御样式
- 引入 common.js（含 GoatCounter）

### 8.2 OG / 社交标签

所有页面已添加：
- `og:title` / `og:description` / `og:type` / `og:url` / `og:site_name`
- `twitter:card` / `twitter:title` / `twitter:description`
- `<link rel="canonical">` 指向 surge.sh 对应路径
- favicon: DB字母 SVG data URI

### 8.3 版权页脚（所有页面统一）

```html
© 2026 boyooDrew. AlgoStep 网站设计保留所有权利，源代码以 MIT 许可证开源。
```

---

## 九、统计系统

### GoatCounter 配置

- 端点：`https://algo-step.goatcounter.com/count`
- 加载方式：common.js 末尾自动注入 script 标签
- 禁用个人统计：URL加 `#toggle-goatcounter` 哈希
- 本地 file:// 访问自动过滤不上报
- view.html：自定义统计面板，调用 GoatCounter API 获取 JSON 数据，.gitignore 排除

---

## 十、部署流程

```
修改代码 → git add . → git commit -m "描述" → git push → npx surge . algo-step.surge.sh
```

- Git 配置已完成：user.name="赵博宇" user.email="BoyooDrew@163.com"
- Gitee 主仓库，GitHub 镜像同步
- Surge 部署命令：`npx surge . algo-step.surge.sh`（注意目录和域名间有空格）
- PowerShell 不支持 `&&` 链接命令，需分步执行

---

## 十一、待修复问题

### P2：工程健壮性（待修复）

| # | 问题 | 文件 |
|---|---|---|
| P2-1 | CSS三重重复定义（语法高亮色值三处） | common.css/layout.css/code-panel.js |
| P2-2 | 变量化不彻底（大量硬编码颜色） | layout.css/animations.css |
| P2-3 | code-panel.js 注释误判（URL中的//被当注释） | code-panel.js |
| P2-4 | 快排 codeVariant 死参数 | quick-sort.html |
| P2-5 | 首页可能缺 layout.css | index.html |

### 可选改进（长期）

| # | 问题 | 状态 |
|---|---|---|
| O-2 | 缺少404页面 | 待做 |
| O-4 | 移动端体验未验证 | 待验证 |
| O-5 | 代码面板小屏可读性（13px偏小） | 待做 |
| O-6 | 快排步骤密度偏高（n=8可达60-100步） | 待优化 |
| O-7 | 无障碍性不足（无prefers-reduced-motion） | 待做 |
| O-14 | 0-1背包finish步骤绿色阴影不一致 | 待修正 |

---

## 十二、后端扩展规划（未来方向）

当前为纯前端项目，未来计划用 Spring Boot 添加后端：

### 第一阶段：用户系统 + 学习进度（最小可用后端）
- Spring Boot + JWT + BCrypt 用户认证
- MySQL + MyBatis 学习进度持久化
- 算法收藏夹
- RESTful API 设计

### 第二阶段：后台管理 + 数据仪表盘
- RBAC 权限模型
- Spring AOP 操作日志
- MyBatis 分页查询优化

### 第三阶段：算法笔记 + 步骤分享（轻量互动）
- Markdown 笔记
- 步骤回放分享链接
- 讨论区
- 学习路径推荐

### 不做：在线判题系统
- 代码沙箱难度过高，未来可用 Judge0 开源方案接入

---

## 十三、开发避坑清单

### 新建算法页必查

- [ ] 引用路径正确（算法页 `../../`，首页 `./`）
- [ ] footer 版权信息正确
- [ ] 有 favicon（DB SVG）
- [ ] 难度标签正确（入门/基础/进阶）
- [ ] 中英文双语步骤描述
- [ ] 步骤类型命名与现有算法一致
- [ ] 代码面板有紫色高亮提示 legend
- [ ] 回溯颜色为洋红不是绿色
- [ ] 回溯按钮为洋红渐变 btnTrace
- [ ] compare 步骤不含赋值行
- [ ] intro 步骤无 value 字段
- [ ] reset() 清除所有状态（包括 SVG 重建、fullDp 清空、header inline style 清理）
- [ ] generate() 重置 isTraceMode

### DP 表格类额外必查

- [ ] 列数 W+3 不是 W+2
- [ ] 每行开头有空白占位格
- [ ] calcDp/dp/fullDp 三层分离
- [ ] compare 当前格显示 `?`
- [ ] 已填格子保持 finished 状态
- [ ] tracePath 用 controller.steps 不是 controller.config.steps
- [ ] tracePath 末尾更新 controller.index 到最后一步

### 搜索类额外必查

- [ ] DFS/BFS 节点三态颜色正确
- [ ] CSS 优先级：后定义覆盖先定义
- [ ] 重置按钮重建 SVG 清空残余状态
- [ ] DFS 有栈底/栈顶标签
- [ ] BFS 有队列可视化
- [ ] 邻居发现用虚线/虚线圈标记
