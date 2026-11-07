# AlgoStep v2.0 迁移与架构说明

> 本文记录「算法页 v2.0 全量迁移 + 资源目录扁平化 + 文件更名」这一轮改造的最终形态、约定与核查结论。
> 适用版本：v2.0（2026.11）

---

## 一、本轮变更概览

| 变更 | 内容 |
| --- | --- |
| 算法页迁移 | 排序 4 页（冒泡 / 选择 / 插入 / 快速）、查找 3 页（二分 / DFS / BFS）、动态规划 5 页（爬楼梯 / 0-1 背包 / 完全背包 / LCS / LIS）全部改为 v2.0 三栏结构 |
| 模板页 | `algorithms/template.html` 同步升级为 v2.0 基准模板 |
| 资源扁平化 | 取消 `css/v2/`、`js/v2/` 子目录，资源直接位于 `css/`、`js/` |
| 文件更名 | 迁移期间使用的 `*-test.html` 全部改回标准文件名，旧版同名页面已由新页面替换 |
| 样式提炼 | 新增 `css/algo-viz.css`，收纳 12 个算法页中跨页一致的 39 条可视化规则 |
| 工具统一 | 新增 `js/algo-utils.js`，统一 `parseNumArray` / `randomIntArray`，页面不再重复定义 |
| 组件增强 | `js/algo-core.js` 支持多行高亮 `setActiveLines(indices, variant)`；`js/algo-nav.js` 移除临时 `suffix` 选项 |

---

## 二、最终目录结构

```
AlgoStep/
├── index.html                 # 首页
├── login.html / register.html # 登录 / 注册
├── about.html                 # 关于
├── view.html                  # 统计页（独立内联样式）
├── css/
│   ├── base.css               # 设计令牌、重置、顶栏、页脚、Toast
│   ├── algo.css               # 算法页三栏布局与全部组件
│   ├── algo-viz.css           # 跨页复用的可视化样式
│   ├── home.css               # 首页
│   ├── auth.css               # 登录 / 注册
│   ├── about.css              # 关于页
│   ├── common.css             # [v1 保留备查]
│   ├── layout.css             # [v1 保留备查]
│   └── animations.css         # [v1 遗留，无引用]
├── js/
│   ├── icons.js               # SVG 图标 Sprite
│   ├── site.js                # 顶部导航 + 页脚注入
│   ├── algo-core.js           # StepController / CodePanel / 绑定工具
│   ├── algo-nav.js            # 算法目录与面包屑
│   ├── algo-utils.js          # 输入解析与随机数组
│   ├── auth.js                # 登录态
│   ├── goatcounter.js         # 统计脚本
│   ├── common.js              # [v1 保留：末尾统计注入仍被首页/关于页使用]
│   ├── code-panel.js          # [v1 保留备查]
│   └── controls.js            # [v1 保留备查]
└── algorithms/
    ├── template.html          # v2.0 基准模板
    ├── dp/{climb-stairs,0-1knapsack,complete-knapsack,lcs,lis}.html
    ├── search/{binary-search,dfs,bfs}.html
    └── sort/{bubble-sort,selection-sort,insertion-sort,quick-sort}.html
```

> v1 资源未删除，仅在文件头标注用途边界；新页面不得引用。

---

## 三、资源职责与引入顺序

### 3.1 算法页（位于 `algorithms/<分类>/`）

```html
<link rel="stylesheet" href="../../css/base.css" />
<link rel="stylesheet" href="../../css/algo.css" />
<link rel="stylesheet" href="../../css/algo-viz.css" />
```

```html
<script src="../../js/icons.js"></script>   <!-- body 最前 -->
...
<script src="../../js/algo-core.js"></script>
<script src="../../js/algo-utils.js"></script>
<script src="../../js/algo-nav.js"></script>
<script src="../../js/site.js" data-base="../../"></script>
```

- 根目录页面把 `../../` 换成 `./`，`algorithms/template.html` 换成 `../`。
- `algo-viz.css` 必须在页面 `<style>` 之前引入：页面内同名但语义不同的规则（如各页 `.cell` 状态色、`.snapshot-bar` 变体）依靠后加载覆盖共享包。

### 3.2 共享样式边界

| 文件 | 收录内容 | 说明 |
| --- | --- | --- |
| `algo.css` | 三栏骨架、面板、代码面板、控制条、播放按钮 | 只放结构与通用组件 |
| `algo-viz.css` | 按钮补充（`.btn-ghost` / `.btn-row` / `.btn-magenta`）、`.bar.sorted`、`.cell` 公共态、`.current-item`、`.array-*`、`.snapshot-bar`、`.graph-*` / `.matrix-*` | 仅收录跨页定义完全一致的规则 |
| 页面 `<style>` | 本页独有的可视化结构、同名异义的状态色、`explain-tag` 自定义色变体 | 不再保留已提炼到共享包的重复规则 |

---

## 四、算法页结构与 JS 约定

### 4.1 三区骨架

| 区域 | 关键容器 | 内容 |
| --- | --- | --- |
| 信息区 | `.panel-info` | 面包屑、标题/副标题/难度与复杂度徽标、相关题目、数据与查询表单、视图模式切换 |
| 代码区 | `.panel-code` | 代码头部、`#codeBody`、行号信息、字号 / 复制、快捷键提示 |
| 舞台区 | `.panel-stage` | 图例条、`stage-body-main` 若干 `stage-card`、`stage-aside` 执行轨迹、播放控制条 |

### 4.2 页面脚本统一写法

```js
(function () {
    'use strict';

    const state = { steps: [], index: -1, speed: 1, codeFont: 14, viewMode: 'all' };
    const STEP_META = { /* 步骤类型 → 标签/配色/图标 */ };

    const codePanel = new AlgoV2.CodePanel('#codeBody');
    const controller = new AlgoV2.StepController({
        baseDelay: 800,
        onStep: renderStep,
        onPlayChange: onPlayChange
    });

    AlgoV2.bindPlayback({ controller, playBtn, prevBtn, nextBtn, resetBtn, speedGroup });
    AlgoV2.bindFontControls(codePanel);
    AlgoV2.bindTraceList($('traceList'), controller);
    AlgoV2.bindCopyButton($('copyBtn'), () => PAGE_CODE.join('\n'), { labelEl: $('copyBtnText') });

    AlgoNav.init({
        current: { category: 'dp', page: '爬楼梯' },
        base: '../',
        home: '../../index.html'
    });

    generate();   // 页面加载即生成默认场景
})();
```

约定：

1. 步骤对象保留 `type / en / zh / formula / codeLines` 及全部可视化字段；`codeLines` 为 **0-based** 行号，必须与 `PAGE_CODE` 数组下标逐条对应。
2. 视图模式、字号、速度、轨迹跳转全部走共享组件，页面内不重复实现。
3. 回溯路径：先 `pause()`，再 `goTo(steps.length - 1)` 并 `updateControls()`，然后叠加回溯视觉与文案。
4. 输入解析与随机数据统一调用 `parseNumArray` / `randomIntArray`，禁止页面内自定义同名函数。

---

## 五、迁移保真原则

- 算法逻辑、步骤生成（内容 / 顺序 / 字段）、渲染函数、演示流程与交互能力逐字保留，只做 DOM 引用局部化与 v2 外壳适配。
- 迁移完成后逐函数机器比对（去空白逐字符）验证：`buildSteps` / `generateSteps` / `renderStepVisual` / `renderArrayInfo` / `drawConnection` / `tracePath` 与旧版一致。
- 唯一允许的业务差异：完全背包按任务要求将输入范围设为 N∈[2,5]、W∈[1,10]，默认 N=3 / W=7，w 与 v 默认 `2,3,4`。

---

## 六、核查结论（本轮）

| 检查项 | 结果 |
| --- | --- |
| 本地 css / js / html 链接可解析 | 全部通过 |
| `js/*.js` 语法（node --check） | 全部通过 |
| 13 个算法页内联脚本语法 | 全部通过 |
| 9 个 CSS 文件花括号平衡 | 全部通过 |
| 算法页必需 DOM id 与资源引用 | 全部通过（模板页不含输入工具，属预期） |
| 残留 `css/v2`、`js/v2`、`*-test.html`、`suffix` 引用 | 代码与页面无残留；文档已同步 |

> 本轮未做浏览器交互自测；如需验收，建议逐页打开检查播放、步进、回溯与视图切换。

---

## 七、后续新增算法页

1. 复制 `algorithms/template.html` 到目标分类目录并改名。
2. 按分类调整相对路径（`../../`）与 `AlgoNav.init` 的 `category` / `page`。
3. 只改三处业务：`PAGE_CODE`、`buildSteps`（或 `generateSteps`）、`renderStep` / `renderTrace`。
4. 若出现新的跨页一致样式，优先补进 `algo-viz.css`；本页独有或同名异义规则留在页面 `<style>`。
