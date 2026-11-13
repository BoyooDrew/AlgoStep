# AlgoStep 前后端联调与落地路线图

> 文档性质：工程落地方案 + 执行记录（可直接用于进度追溯与后续开发交接）
> 覆盖范围：前端 `/*.html`、`css/`、`js/`；后端 `algostep-backend/`（Spring Boot 3 + MyBatis-Plus）
> 版本基线：前端 v2.0 视觉体系；后端 1.0.0（23 个接口）
> 最后更新：2026-11-14（S0–S4 已完成，含 UI 验收修复）

---

## 〇、阅读指引

| 章节 | 内容 | 追溯用途 |
|---|---|---|
| 一 | 项目现状全量梳理（前端 / 后端 / 缺口明细） | 回答"现在有什么、缺什么" |
| 二 | 前后端联调方案（优先级、统一规范、测试用例） | 回答"怎么接、怎么验" |
| 三 | 管理员后台选型评估 | 回答"要不要引入开源后台" |
| 四 | 全维度质量审核问题清单 | 回答"哪里有问题、怎么改" |
| 五 | 落地路线图 S0–S6（含执行状态） | 回答"按什么顺序做、做到哪了" |
| 六 | 架构逻辑与开发模式问答 | 回答"之后怎么协作、页面怎么同步、能否后台配置" |
| 七 | 本轮（S0–S4）变更与验收记录 | 追溯每次改动的文件与验证结论 |
| 八 | 附录：接口总表 / 数据模型 / 术语 | 日常速查 |

---

## 一、项目现状全量梳理

### 1.1 前端侧盘点

前端为零构建纯静态站点，采用**文件路径路由**（无 SPA 路由表）。共享外壳由 `js/site.js`（顶栏/页脚注入）、`js/icons.js`（SVG Sprite）、`js/algo-nav.js`（算法目录树 + 面包屑）提供。

| 页面路由 | 页面组件 / 结构 | 已实现的用户交互 | 已调用接口 | 待调用接口 | 完成度 |
|---|---|---|---|---|---|
| `index.html` | Hero + 3 分类卡片区 + 更新日志 | 登录态导航、用户下拉菜单、**API 驱动卡片渲染（S1 新增）** | `POST /api/auth/login`（间接）、`GET /api/algorithms`（S1 新增） | — | 100% |
| `about.html` | Hero + 技术栈 + 时间线 | 登录态导航 | 无（仅认证 UI） | — | 100% |
| `login.html` | 登录卡片表单 | 表单校验、错误内联提示、登录跳转 | `POST /api/auth/login` | — | 100% |
| `register.html` | 注册卡片表单 | 两次密码一致性校验、成功提示、跳登录 | `POST /api/auth/register` | — | 100% |
| `profile.html` | 个人中心 | 资料修改、改密、学习统计、进度筛选、收藏管理、通知管理 | `/api/user/**`、`/api/progress/**`、`/api/favorites`、`/api/notifications/**` | — | 100%（S3） |
| `algorithms/template.html` | 三栏模板（信息 / 代码 / 舞台） | 已接入共享进度 / 收藏逻辑；无算法元数据时明确提示 | `GET /api/algorithms` | 无（模板不生成业务数据） | 模板已接入（S2） |
| `algorithms/sort/{bubble,selection,insertion,quick}-sort.html` | 同上 | 步骤播放、进度恢复 / 节流保存、收藏同步 | `/api/algorithms`、`/api/progress/**`、`/api/favorites/**` | — | 100%（S2） |
| `algorithms/dp/{climb-stairs,0-1knapsack,complete-knapsack,lcs,lis}.html` | 同上 | 同上 | 同上 | — | 100%（S2） |
| `algorithms/search/{binary-search,dfs,bfs}.html` | 同上 | 同上 | 同上 | — | 100%（S2） |
| `view.html` | GoatCounter 统计面板（`.gitignore` 排除） | 第三方数据查询 | GoatCounter API（非本项目后端） | — | 100% |

**前端共享模块现状**

| 文件 | 职责 | 本轮变化 |
|---|---|---|
| `js/api.js` | 统一请求层：BASE 推导、Token、401 静默刷新、业务码、Toast、loading | **S0 重写；S2 支持 keepalive，并修正子目录登录回跳** |
| `js/auth.js` | Token 存取、登录/注册/登出、登录态 UI | **S0 切换至 AlgoAPI；S3 增加个人中心入口与头像渲染** |
| `js/algo-core.js` | `StepController` / `CodePanel` / 播放、字号、复制、轨迹绑定 | **S2 增加步骤与进度生命周期钩子** |
| `js/algo-learning.js` | 算法 slug→id、进度恢复 / 节流保存、学习时长、收藏 | **S2 新增，13 个算法页共用** |
| `js/profile.js` | 个人中心资料、统计、进度、收藏、通知交互 | **S3 新增；S4 同步全站未读数** |
| `js/algo-nav.js` | 算法目录树与面包屑下拉 | 不变 |
| `js/algo-utils.js` | `parseNumArray` / `randomIntArray` | 不变 |
| `js/site.js` | 顶栏 / 页脚统一注入、通知铃铛与抽屉 | **S4 增加通知模块** |
| `css/base.css` | 设计令牌、外壳、Toast、全局 loading、通知抽屉 | **S0 + S4 追加** |
| `css/algo.css` | 算法页布局、收藏按钮与进度同步状态 | **S2 追加** |

### 1.2 后端侧盘点

技术栈：Spring Boot 3.2.5 / Java 17 / MyBatis-Plus 3.5.5 / JJWT 0.12.5 / Knife4j 4.4.0；开发默认 H2 内存库（`application-h2.yml`），生产可切 MySQL（`application-dev.yml`）。

**已实现接口（23 个，文档口径 22 个业务接口 + `/api/status`）**

| 模块 | 接口 | 鉴权 |
|---|---|---|
| 公共 | `GET /`、`GET /health`、`GET /api/status` | 白名单 |
| 认证 | `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/refresh` | 白名单 |
| 认证 | `POST /api/auth/logout`、`GET /api/auth/me` | 需 Token |
| 用户 | `GET /api/user/profile`、`PUT /api/user/profile`、`PUT /api/user/password` | 需 Token |
| 算法 | `GET /api/algorithms?category=`、`GET /api/algorithms/{id}` | 白名单 |
| 进度 | `GET /api/progress`、`GET /api/progress/{algorithmId}`、`PUT /api/progress`、`GET /api/progress/stats` | 需 Token |
| 收藏 | `GET /api/favorites`、`POST /api/favorites/{algorithmId}`、`DELETE /api/favorites/{algorithmId}` | 需 Token |
| 通知 | `GET /api/notifications`（分页）、`PUT /api/notifications/{id}/read`、`PUT /api/notifications/read-all`、`GET /api/notifications/unread-count` | 需 Token |

**数据模型（5 张表）**

| 表 | 关键字段 | 约束 / 状态 |
|---|---|---|
| `sys_user` | id, username, password(BCrypt), email, nickname, avatar, role, status | `uk_username`、`uk_email`；role=USER/ADMIN；status 1 正常 / 0 禁用 |
| `algorithm` | id, name(slug), name_zh, category, difficulty, **complexity**, url, description, sort_order | `uk_name`；seed 12 条（S1 补齐 complexity / description） |
| `learning_progress` | user_id, algorithm_id, status, step_index, total_steps, study_time | `uk_user_algo`；状态机 UNSTARTED → LEARNING → MASTERED |
| `favorite` | user_id, algorithm_id | `uk_user_algo`（天然幂等） |
| `notification` | user_id, type, title, content, is_read | `idx_user_read` |

**权限控制体系**

- 认证链路：`JwtAuthenticationFilter`（解析 `Bearer` → 校验 → 写入 `UserContext` + `SecurityContext` 的 `ROLE_*`）→ `SecurityFilterChain`（STATELESS、白名单 `SecurityConstant.WHITELIST`）→ `JwtAuthenticationEntryPoint`（401）/ `JwtAccessDeniedHandler`（403）。
- 角色建模：`sys_user.role` + JWT `role` claim 已贯通；`@EnableMethodSecurity` 已于 S0 开启，`@PreAuthorize` 具备生效前提。
- **现状约束**：尚未有 `@PreAuthorize` 使用点，ADMIN 与 USER 能力完全相同（管理接口落地时补齐，见第三章）。
- 全局异常：`GlobalExceptionHandler` 覆盖业务、认证、权限、参数校验（MethodArgumentNotValid / Bind / ConstraintViolation）、缺参、405、404、兜底，统一返回 `Result{code, msg, data}`。

### 1.3 前后端未对接缺口明细清单

| # | 缺口模块 | 涉及接口 | 当前状态 | 阻塞点 |
|---|---|---|---|---|
| G1 | 首页算法卡片 | `GET /api/algorithms` | **已闭环（S1）**：卡片由接口渲染，失败保留静态兜底 | 无（历史阻塞点为前端无渲染逻辑） |
| G2 | 算法页学习进度 | `PUT/GET /api/progress` | **已闭环（S2）**：slug→id、5 秒节流、最后一步立即保存、刷新恢复、离页 keepalive | 无 |
| G3 | 算法页收藏 | `POST/DELETE /api/favorites/{id}` | **已闭环（S2）**：13 页共享按钮与收藏状态同步，未登录引导登录 | 无 |
| G4 | 学习统计看板 | `GET /api/progress/stats` | **已闭环（S3）**：个人中心展示总数、各状态数量与学习时长 | 无 |
| G5 | 个人中心 | `/api/user/profile`、`/api/user/password` | **已闭环（S3）**：资料、改密、进度、收藏与通知页面可用 | 无 |
| G6 | 站内通知 | 通知 4 接口 | **已闭环（S4）**：注册欢迎通知、全站铃铛、未读角标、抽屉与已读操作 | 无 |
| G7 | Token 续期 | `POST /api/auth/refresh` | **已闭环（S0）**：401 自动刷新并重放一次 | 无（历史阻塞点为 refreshToken 存而不用） |
| G8 | API 地址环境化 | 全部 | **已闭环（S0）**：`js/api.js` 统一推导 / 可覆盖 | 无 |
| G9 | 管理后台 | 尚无管理接口 | 完全空白 | 后端无 `/api/admin/**`，前端无 admin 页面 |
| G10 | 页面配置开关 | 尚无配置接口 | 全部写死在 HTML | 需 `site_config` 表 + 公开配置接口 |

---

## 二、前后端联调方案

### 2.1 接口对接优先级排序（核心业务优先 + 依赖排序）

| 优先级 | 批次 | 内容 | 前置依赖 | 理由 |
|---|---|---|---|---|
| **P0** | 批次 1 | 统一请求层 `js/api.js`（BASE 推导、Token、401 静默刷新、错误拦截、loading）+ auth 模块切换 | 无 | 一切对接的地基；**S0 已完成** |
| **P0** | 批次 2 | 首页卡片由 `/api/algorithms` 驱动（失败回退硬编码） | 批次 1 | 零鉴权、最快验证 CORS 与响应规范；**S1 已完成** |
| **P1** | 批次 3 | 算法页进度上报 / 恢复 + 收藏 | 批次 1、slug→id 映射 | 核心教学价值闭环（登录页承诺"保存学习进度"） |
| **P1** | 批次 4 | 个人中心页（资料 / 改密 / 学习统计） | 批次 1 | 复用同一请求层，纯新增页面 |
| **P2** | 批次 5 | 站内通知（注册欢迎通知 + 顶栏铃铛） | 批次 1 | 体验增强，非核心链路 |
| **P3** | 批次 6 | 管理后台 + 配置化开关 | 业务稳定后 | 见第三章 |

### 2.2 跨域与统一数据格式规范

**跨域（CORS）**：`SecurityConfig#corsConfigurationSource` 已由通配 `*` 收紧为白名单：

```
http://localhost:*      # 本地开发
http://127.0.0.1:*      # 本地开发
https://algo-step.surge.sh   # 线上静态站
```

放行方法 `GET/POST/PUT/DELETE/OPTIONS`，请求头 `*`，`maxAge=3600`，`allowCredentials=true`。新增部署域名时只改这一处。

**统一响应**（后端已固化）：

```json
{ "code": 200, "msg": "操作成功", "data": { } }
```

- `code === 200` 为唯一成功判据；业务错误码段位：`400/401/403/404/405` 通用、`1001-1008` 认证与用户、`2001-2004` 算法/进度/收藏、`9001` 限流。
- 前端成功时**只拿到 `data`**（由 `AlgoAPI` 解包），失败一律 `reject`。

**统一请求约定**

| 项 | 规则 |
|---|---|
| Content-Type | `application/json`（由 api.js 统一注入） |
| 鉴权 | `Authorization: Bearer <accessToken>` |
| 分页 | 查询参数 `pageNum`（默认 1）、`pageSize`（默认 10）；返回 `{ list, total, pageNum, pageSize }` |
| 时间 | 后端 Jackson 统一 `yyyy-MM-dd HH:mm:ss` + `Asia/Shanghai` |
| 空值 | `default-property-inclusion: non_null`（不返回 null 字段） |

### 2.3 全局错误拦截与 Loading 方案

`js/api.js` 采用三层拦截：

1. **HTTP 层**：`res.status === 401` → 取 `algostep_refresh` 调 `/auth/refresh` → 成功后以新 Token **重放一次**原请求；刷新失败 → 清空本地凭证并跳 `login.html`，同时 `reject({code:401})`。
2. **业务层**：非 `code === 200` → 统一 `showToast(msg)`（`silent: true` 时不弹，供表单内联提示）并 `reject(body)`。
3. **调用层**：页面只需 `try/catch` 或 `.catch()`，无成功分支之外的判断负担。

**Loading**：`#api-loading` 全屏遮罩 + `api-loading-spinner`，**引用计数**实现（嵌套请求只在计数归零时隐藏）；`{ noLoading: true }` 可跳过（如首页首屏渲染）。样式位于 `css/base.css`「全局请求 Loading」段。

### 2.4 联调测试用例（T01–T26，覆盖全部接口）

| 编号 | 接口 | 场景 | 输入要点 | 预期 |
|---|---|---|---|---|
| T01 | register | 正常注册 | 合法 username/password/email | `code=200`，`data=null` |
| T02 | register | 异常-重复用户名 / 邮箱 | 已存在值 | `code=1001` / `1002`，msg 明确 |
| T03 | register | 边界-参数 | username 2 位 / 21 位、password 5 位、非法 email | `code=400`，逐字段 msg |
| T04 | login | 正常登录 | 正确凭据 | data 含 token/refreshToken/userId/username/nickname/role |
| T05 | login | 异常-密码错误 / 用户不存在 / 账号禁用 | 错误凭据、status=0 | `code=1004` / `1003` / `1005` |
| T06 | login | 边界-空 body / 非 JSON | `{}`、纯文本 | `code=400`，不出现 500 |
| T07 | login | 异常-连续失败触发限流 | 同 IP+用户名 60s 内失败 5 次 | 第 6 次返回 `code=9001`（S0 新增） |
| T08 | refresh | 正常刷新 | 有效 refreshToken | 返回新 access + refresh |
| T09 | refresh | 异常-伪造 / 过期 | 篡改值 | `code=1006` / `1008` |
| T10 | logout | 已登录登出 | 带 Token | `code=200`；前端清空 localStorage |
| T11 | auth/me | 正常 / 无 Token / 过期 Token | — | 用户信息 / 401 JSON / 401 触发前端静默刷新 |
| T12 | profile | 查询 + 修改 nickname/avatar | 合法值 | 修改后 GET 返回新值 |
| T13 | password | 正常改密链路 | 旧密码正确 | 旧密码登录失败、新密码登录成功 |
| T14 | password | 异常 | 旧密码错误 / 新密码 < 6 位 | `code=400` |
| T15 | algorithms | 正常列表 / 分类筛选 / 非法分类 | `?category=sort\|dp\|search\|xxx` | 12 条 / 4·5·3 条 / 空数组且 `code=200` |
| T16 | algorithms/{id} | 正常 / 边界 0、999999、非数字 | — | 详情 / `code=2001` / `code=400` |
| T17 | algorithms | 字段完整性 | — | 每条含 `complexity`、`description`（S1 新增字段） |
| T18 | progress PUT | 正常保存 | `stepIndex=5,totalSteps=12` | 返回 `status=LEARNING` |
| T19 | progress PUT | 边界-状态机与幂等 | 0-based `stepIndex=0` / `stepIndex=totalSteps-1` / 回到 0 / 重复 PUT | UNSTARTED / MASTERED / 回到 UNSTARTED / 幂等不报错 |
| T20 | progress PUT | 异常 | 未登录 / algorithmId 不存在 | 401 / 业务错误 |
| T21 | progress GET | 从未学习 | 新算法 | 返回默认 UNSTARTED（不 404） |
| T22 | progress/stats | 空数据 / 混合状态 | — | 各状态之和 = total；studyTime 累加正确 |
| T23 | favorites | 完整幂等链路 | 添加→列表→重复添加→取消→重复取消 | 重复操作返回业务提示，不 500 |
| T24 | notifications | 空列表 / 分页 / unreadOnly / 越界 | `pageNum=1,2,0` | 字段完整含 `unreadCount`；越界空列表 |
| T25 | notifications | 已读幂等 + 计数 | 单条已读×2、read-all | 幂等，`unread-count` 归零 |
| T26 | 鉴权横切 | 全部认证接口不带 Token | 21 个需鉴权接口 | 全部 401 JSON（非重定向、非 HTML） |
| T27 | CORS | 三类来源跨域 | localhost / surge.sh / 恶意域 | 前两者通过，恶意域被拒 |

**验收口径**：T01–T27 全绿，且核心链路「注册 → 登录 → 首页渲染 → 进入算法页 → 播放 → 保存进度 → 刷新恢复 → 收藏 → 个人中心改密 → 登出」端到端无阻断。

---

## 三、管理员后台方案评估与选型

### 3.1 方案对比

| 维度 | 方案A：基于现有栈自研轻量后台 | 方案B：接入 RuoYi / Ant Design Pro |
|---|---|---|
| 开发人天（首次落地） | **3~5 人天** | RuoYi 5~8；AntD Pro 6~10（前端栈重写） |
| 长期维护成本 | **低**：单仓库、零新框架 | 高：RuoYi 自带用户/角色/菜单/代码生成体系，需持续跟版本与安全补丁；AntD Pro 引入 React + Umi 全工具链 |
| 现有功能匹配度 | **高**：管理对象仅 4 类（算法元数据、用户、通知广播、数据看板） | RuoYi 匹配度高但 80%+ 自带能力用不上；AntD Pro 仅为空壳，业务仍须全写 |
| 二次开发灵活性 | **最高**：无黑盒，改动即所见 | RuoYi 代码生成风格与现有 module 分层不一致，需双向迁就 |
| 与当前项目适配成本 | **零**：Spring Boot 3 + MyBatis-Plus 就绪，可复用 `base.css` 令牌与 `js/api.js` | RuoYi 生态偏 Spring Boot 2.x，与 3.2.5 有摩擦；AntD Pro 与"零构建静态前端"理念冲突 |
| 安全隔离 | `/api/admin/**` + `hasRole('ADMIN')`，前端独立 `admin.html` | RuoYi 权限粒度更细，但本项目用不到 |

### 3.2 选型结论

**采用方案 A（自研轻量管理后台）。**

判断依据：管理面仅 4 个实体、无复杂审批流；方案 B 的"能力冗余比"超过 80%，其引入的工具链与版本维护负担，与收益严重不匹配。

### 3.3 分阶段落地

| 阶段 | 内容 | 产出 |
|---|---|---|
| A1 | 后端 `/api/admin/**`：用户分页与禁用/启用、算法 CRUD、通知广播、概览统计；全部标注 `@PreAuthorize("hasRole('ADMIN')")`（S0 已开启 `@EnableMethodSecurity`，可直接生效） | 管理接口组 + Knife4j 文档 |
| A2 | 新建 `admin.html`：登录态校验 `role === 'ADMIN'`，非管理员跳首页；左侧菜单 + 右侧表格/表单，复用 `base.css` + `js/api.js` | 可用的管理页面 |
| A3 | 数据看板（聚合 `/api/progress/stats`）、通知广播表单、可选操作审计（AOP） | 完整管理能力 |

---

## 四、项目全维度质量审核问题清单

| 等级 | 问题 | 位置 | 优化建议 | 状态 |
|---|---|---|---|---|
| **P0** | JWT 密钥明文硬编码且已入 Git | `application.yml` | 改为 `${JWT_SECRET:...}` 环境变量注入；上线前更换密钥 | **已修复（S0）** |
| **P0** | CORS 通配 `*` 且 `allowCredentials=true` | `SecurityConfig` | 收紧为域名白名单 | **已修复（S0）** |
| **P0** | 登录无防爆破 | `AuthController` | 同 IP+用户名 60s 内失败 5 次即拒绝 | **已修复（S0）** |
| **P0** | 角色体系空转（无任何 `@PreAuthorize`） | 全局 | 开启方法级鉴权 + 管理接口标注 `hasRole('ADMIN')` | **部分修复（S0 已开启 `@EnableMethodSecurity`，接口标注随 A1）** |
| P1 | 旧 `authFetch` 在 401 时 `return undefined`，调用方 `res.json()` 崩溃 | `js/auth.js` | 由 `js/api.js` 统一处理 401 与 reject | **已修复（S0）** |
| P1 | refresh 无服务端失效（登出后 refreshToken 7 天仍有效） | `AuthServiceImpl` | 短期接受；中期接 Redis 黑名单 | 待排期 |
| P1 | `algorithm` 表无 `template.html` 记录，但首页有模板入口 | `index.html` / seed | 首页移除开发者工具区块（模板仍保留文件，供开发派生） | **已修复（S1）** |
| P1 | MyBatis-Plus SQL 全量打印 `StdOutImpl` | `application.yml` | 生产 profile 改 `NoLoggingImpl` | 待排期 |
| P1 | 通知分页返回 `Map<String,Object>` | `NotificationController` | 抽 `NotificationPageVO`，提升文档可读性 | 待排期 |
| P1 | 算法卡片缺 description / complexity，无法纯 API 渲染 | `algorithm` 表 | 增加 `complexity` 列并补齐 seed | **已修复（S1）** |
| P2 | 无单元/集成测试 | 全工程 | 补 Auth / Progress 模块 `@SpringBootTest`（H2 profile 可跑） | 待排期 |
| P2 | Token 存 localStorage（XSS 可窃取） | `js/api.js` | 静态站阶段接受；上线用 Nginx 同域反代后可评估 HttpOnly Cookie | 已知风险 |
| P2 | 接口命名风格（`/api/user/profile` 单数、`favorites` 复数） | 各 Controller | 与既有风格一致，冻结现状并写入规范，不做无收益重构 | 不处理 |
| P2 | `GET /api/progress/{algorithmId}` 未学习返回默认值而非 404 | `ProgressController` | 属前端友好设计，固化契约 | 不处理 |
| 性能 | 列表查询均单表 + 覆盖索引（`uk_user_algo`、`idx_user_read`） | `init.sql` | 保持；进度上报前端做 5s 节流 | 计划内 |
| 结构 | 后端 `module/xxx/{controller,service,mapper,entity,vo,dto}` 分层清晰 | — | 保持，新增管理模块沿用同结构 | 无问题 |

---

## 五、落地路线图（含执行状态）

| 阶段 | 工作内容 | 交付物标准 | 验收条件 | 状态 |
|---|---|---|---|---|
| **S0 基础设施** | `js/api.js` 落地；`base.css` loading；`api.js` 全站引入；auth 模块切换；CORS 收紧；JWT 密钥环境变量化；方法级鉴权开启；登录限流 | 统一请求层可用、安全项生效 | 登录/注册/登出回归正常；T07 限流生效；JS 语法与后端编译通过 | **已完成** |
| **S1 首页联调** | 首页卡片由 `/api/algorithms` 渲染；失败回退静态兜底；过滤模板入口；补齐算法元数据（complexity / description） | 首页 DB 驱动 | T15/T16/T17 通过；后端未启动时首页仍完整可用 | **已完成** |
| **S2 算法页进度 + 收藏** | 算法页注入 slug→id 映射（首屏并行取 `/api/algorithms`）；`StepController` 步骤节流上报；初始化拉取进度并 `goTo(stepIndex)` 恢复；收藏按钮与状态同步 | 13 页统一行为 | T18–T23 通过；「播放→保存→刷新→恢复」闭环 | **已完成（2026-11-13）** |
| **S3 个人中心** | `profile.html`：资料修改、改密、学习统计、收藏列表 | 页面完整可用 | T12–T14、T22 通过 | **已完成并核验（2026-11-13）** |
| **S4 站内通知** | 注册成功写欢迎通知；顶栏铃铛 + 未读红点 + 通知抽屉 | 通知链路可用 | T24/T25 通过 | **已完成（2026-11-13）** |
| **S5 管理后台** | 第三章 A1 → A2 → A3 | `admin.html` + `/api/admin/**` | 非 ADMIN 访问管理接口返回 403；算法元数据后台增删改后首页同步 | 待执行 |
| **S6 发布准备** | MySQL profile 验证、`docker-compose` 部署、Surge 前端 + 服务器后端、Nginx 同域反代 `/api`、全量回归 | 上线包 + 回归报告 | T01–T27 全绿；线上注册登录进度链路实测通过 | 待执行 |

---

## 六、架构逻辑与开发模式说明

### Q1：联调完成后，标准开发协作流程与开发状态

进入「**契约驱动、双端并行**」模式：

1. 后端以 Knife4j（`/doc.html`）为唯一接口契约源，先改契约再写实现；
2. 前端只通过 `js/api.js` 访问后端，**不感知部署形态**（本地直连 8080 / 线上同域反代）；
3. 每次接口变更后跑对应测试用例子集（T 编号可定位）；
4. 前端为纯静态、后端为独立 JVM 进程，**互不阻塞**：同一 monorepo 内前端在根目录、后端在 `algostep-backend/`，各自独立提交即可。

### Q2：算法页开发完成后的部署与同步机制

- **页面文件本身不需要同步到后端**：算法页是静态资源，链路为「Git → 静态托管（Surge）」。
- **元数据必须同步**：新增算法页后需在 `algorithm` 表登记 `name / name_zh / category / difficulty / complexity / url / description / sort_order`，否则首页列表、学习进度、收藏都无法关联该页。
  - S1 前：在 `init.sql` / `schema-h2.sql` 追加 seed；
  - S5 后：直接在管理后台「算法管理」录入，无需改代码。
- **唯一数据契约**：算法页 `url` 中的 slug 与 `algorithm.name` 一致；首页卡片已输出 `data-algorithm="<slug>"`，供 S2 建立 slug→id 映射。

### Q3：页面展示、功能开关能否由后台配置控制

可以，分两级：

1. **内容级（S1 已生效）**：首页算法卡片由 `GET /api/algorithms` 驱动，后台增删改 `algorithm` 记录即控制首页展示内容；后续可加 `visible` 字段实现上下架。
2. **开关级（S5 落地）**：新增 `site_config` 表（`config_key / config_value / remark`）+ 公开接口 `GET /api/config`（加入白名单），`js/site.js` 启动拉取并挂到 `window.SiteConfig`，页面按开关渲染。建议键名：`notice-banner`、`enable-favorite`、`enable-notification`、`maintenance-mode`。前端必须对配置接口失败做默认值兜底，保证后端宕机时页面仍可用。

---

## 七、本轮（S0–S4）变更与验收记录

### 7.1 变更明细

| # | 文件 | 变更 | 归属 |
|---|---|---|---|
| 1 | `js/api.js` | 重写：`API_BASE` 自动推导且支持 `window.ALGOSTEP_API_BASE` 覆盖；`silent` / `noLoading` 选项；401 刷新失败改为正确 `reject`（修复旧版返回 `undefined` 的隐患） | S0 |
| 2 | `css/base.css` | 追加 `#api-loading`、`.api-loading-spinner`、`@keyframes api-spin` | S0 |
| 3 | `js/auth.js` | 删除硬编码 `AUTH_API` 与旧 `authFetch` 实现，改为调用 `AlgoAPI`；`authFetch` 保留为兼容薄封装 | S0 |
| 4 | `login.html` | 引入 `js/api.js`；登录回调改为 `try/catch` + 使用 `err.msg` 内联提示 | S0 |
| 5 | `register.html` | 引入 `js/api.js`；注册回调改为 `try/catch` + `err.msg` | S0 |
| 6 | `about.html` | 引入 `js/api.js` | S0 |
| 7 | `algostep-backend/.../config/SecurityConfig.java` | CORS 白名单收紧；新增 `@EnableMethodSecurity` | S0 |
| 8 | `algostep-backend/.../resources/application.yml` | `jwt.secret` 改为 `${JWT_SECRET:本地默认}` | S0 |
| 9 | `algostep-backend/.../common/guard/LoginAttemptGuard.java` | 新增：登录失败计数（5 次 / 60s 窗口，成功后清零） | S0 |
| 10 | `algostep-backend/.../module/auth/controller/AuthController.java` | 登录接入限流守卫；新增 `clientIp()` 兼容 `X-Forwarded-For` | S0 |
| 11 | `algostep-backend/.../module/algorithm/entity/Algorithm.java` | 新增 `complexity` 字段 | S1 |
| 12 | `algostep-backend/.../module/algorithm/vo/AlgorithmVO.java` | 新增 `complexity` 字段 | S1 |
| 13 | `algostep-backend/.../module/algorithm/service/impl/AlgorithmServiceImpl.java` | `toVO` 填充 `complexity` | S1 |
| 14 | `algostep-backend/.../resources/sql/init.sql` | `algorithm` 表加 `complexity` 列；seed 补 `description` / `complexity`；`ON DUPLICATE KEY UPDATE` 扩展为 5 字段 | S1 |
| 15 | `algostep-backend/.../resources/sql/schema-h2.sql` | 同上（H2 版本） | S1 |
| 16 | `index.html` | 三个分类 section 加 `data-category`；移除"开发工具 / 模板"入口；新增 API 驱动卡片渲染脚本（失败保留静态兜底），卡片输出 `data-algorithm` | S1 |
| 17 | `docs/AlgoStep-前后端联调与落地路线图.md` | 新建（本文档） | 文档 |
| 18 | `README.md` | 开发文档区补充本文档链接 | 文档 |
| 19 | `css/home.css` | 删除已无引用的 `.category-block.dev-block` 虚线卡片样式 | S1 |
| 20 | `algostep-backend/.../resources/application-h2.yml` | 增加 `spring.sql.init.encoding: UTF-8`（修复 H2 seed 中文乱码） | S1（验证中发现） |
| 21 | `js/algo-learning.js` | 新增算法页共享学习模块：slug→id 映射、进度恢复、5 秒节流保存、最后一步立即保存、学习时长统计、离页 `keepalive`、收藏与登录引导 | S2 |
| 22 | `js/algo-core.js` | `StepController` 增加 `onStepsChange` / `onProgressChange` 钩子，保留各算法页原有渲染与播放逻辑 | S2 |
| 23 | `algorithms/template.html` 及 12 个正式算法页 | 统一引入认证、请求与学习模块，并调用 `AlgoLearning.attach(controller)`；模板页无元数据时不生成业务记录 | S2 |
| 24 | `css/algo.css` | 新增收藏按钮、已收藏状态及进度保存状态样式 | S2 |
| 25 | `ProgressServiceImpl.java`、`ProgressDTO.java`、`ProgressVO.java` | 修正 0-based 状态机；校验算法存在与 `totalSteps >= 1`；返回算法页 `url` 供继续学习 | S2 / S3 |
| 26 | `profile.html`、`js/profile.js` | S3 已实现资料、改密、统计、进度、收藏和通知管理；本轮核验，并补齐全站未读角标同步 | S3 / S4 |
| 27 | `login.html`、`register.html` | 修复注册页自动跳转与登录页初始化顺序；登录、注册均保留来源页，并拒绝站外及协议相对重定向 | S3（核验修复） |
| 28 | `js/auth.js`、`js/api.js` | 修正算法子目录中的登录、个人中心和登出路径；增加头像 URL 过滤、离页请求 `keepalive` 与未读缓存清理 | S2 / S3 |
| 29 | `NotificationService.java`、`NotificationServiceImpl.java`、`AuthServiceImpl.java` | 新增内部通知创建能力；注册事务内写入欢迎通知，用户与通知同时提交或回滚 | S4 |
| 30 | `js/site.js`、`css/base.css`、`js/icons.js` | 新增全站铃铛、未读角标、通知抽屉、单条/全部已读、空态与失败重试，并挂载到公共顶栏 | S4 |
| 31 | `js/profile.js` | 进度百分比改按 0-based 最后一步判断：已掌握或到达 `totalSteps - 1` 显示 100% | S2 / S3（验收修复） |
| 32 | `js/site.js`、`css/base.css` | 新增通用确认对话框 `AlgoDialog.confirm()`（Promise、遮罩、Escape、焦点还原），收藏删除不再使用浏览器原生 `confirm` | 全站公共组件 |
| 33 | `css/base.css` | 全站 `.toast` 提示从页面底部移至顶部居中（顶栏下方），供前台与后续管理后台复用 | 全站公共组件 |
| 34 | `css/profile.css` | 个人中心内容区 1180 → 1320px，侧栏 250 → 268px，标题、统计、进度、表单等字号整体上调 | S3（验收修复） |

### 7.2 验收记录

| 检查项 | 方法 | 结果 |
|---|---|---|
| 前端 JS 语法 | `node --check` 校验关键共享 JS；解析 13 个算法页及登录、注册页内联脚本 | 通过 |
| 后端测试 | `mvn test` | 通过（exit 0） |
| 接口契约 | `GET /api/algorithms` → 12 条；`?category=dp` → 5 条；`?category=sort` → 4 条；非法分类 → `code=200` 且 `count=0` | 通过 |
| 元数据完整性 | 响应含 `complexity`（`O(n)` / `O(nW)` …）与中文 `description` | 通过 |
| 中文编码 | 原始响应为 UTF-8：`"nameZh":"爬楼梯"`、`"description":"每次可上 1 或 2 级台阶…"` | 通过（见 7.4 修复） |
| 未授权访问 | 无 Token 请求 `/api/progress` | 401（JSON） |
| 登录限流 | 同 IP+用户名连续失败 5 次后第 6 次 | 第 1–5 次 `1003`，第 6 次 `9001` |
| CORS 白名单 | `Origin: http://localhost:5500` / `https://evil.example` | 前者回显允许源；后者 403 |
| 认证链路 | 注册 → 登录 → `/auth/me` → `/auth/refresh` | 依次 `200 / 200(role=USER, 有 refreshToken) / 200 / 200(返回新 token)` |
| 首页兜底 | 后端未启动时保留静态卡片与统计数字 | 逻辑保证（`catch` 内不修改 DOM） |
| S0–S4 接口集成 | 使用独立 H2 实例执行注册、登录、刷新、资料、改密、进度、统计、收藏、通知等检查 | **32 项全部通过** |
| 进度状态机 | 总步数 12：依次保存步骤 `0 / 5 / 11 / 0`；另测 `totalSteps=0` 与无效算法 ID | `UNSTARTED / LEARNING / MASTERED / UNSTARTED`；异常分别返回 400 / 2001 |
| 收藏与通知 | 收藏添加、重复添加、取消、重复取消；欢迎通知、未读筛选、单条/全部已读、越界分页 | 全部符合业务码与幂等约定 |
| 浏览器主链路 | 注册登录 → 欢迎通知 → 收藏冒泡排序 → 保存进度 → 刷新恢复 → 个人中心查看 → 修改昵称 → 全部已读 | 通过；顶栏昵称、收藏、进度与未读角标同步 |
| 自动播放 | 播放/暂停、连续自动保存、学习时长累计与暂停后最终保存 | 通过 |
| 安全回跳 | 合法站内算法页地址原样返回；`//evil.com`、完整站外 URL、`javascript:` 与无 `./` 的地址回退首页 | 登录、注册页均通过 |
| 进度百分比 | 边界数据：`stepIndex=11/12`、`status=MASTERED, 8/9`、`0/12`、`totalSteps=0` | 依次 `100% / 100% / 0% / 0%`，脚本用例通过 |
| UI 验收修复 | 进度 100%、自定义确认弹窗、提示移至顶部、个人中心放大 | 已按反馈修改，交由用户复核 |

### 7.3 运行态验证命令（可复现）

```powershell
# 后端（H2 内存库，自动建表 + seed）
$env:JAVA_HOME="<jdk17>"
$env:SPRING_PROFILES_ACTIVE="h2"
$env:JWT_SECRET="<至少 32 字节的随机串>"
mvn -o spring-boot:run
```

- 列表：`GET http://localhost:8080/api/algorithms` → `data.length === 12`
- 分类：`?category=sort` → 4；`?category=dp` → 5；`?category=search` → 3
- 首页：浏览器打开 `index.html`（后端启动时卡片由接口渲染；关闭后端时显示静态兜底）

### 7.4 验证中发现并修复的问题

| 问题 | 现象 | 根因 | 修复 |
|---|---|---|---|
| H2 seed 中文乱码 | 接口返回 `"nameZh":"鐖ゼ姊"`，前端卡片将显示乱码 | `spring.sql.init.encoding` 未显式指定，Windows 下按平台编码读取 `schema-h2.sql` | `application-h2.yml` 增加 `spring.sql.init.encoding: UTF-8`，重启后验证为正确 UTF-8 |
| dev(MySQL) 启动失败 | `Unknown column 'complexity' in 'field list'`，ApplicationContext 启动失败，首页请求接口 500/连接拒绝 | 已有 MySQL 的 `algorithm` 表为旧结构，`CREATE TABLE IF NOT EXISTS` 不会给已有表加列，而 INSERT 引用了新列 | `init.sql` 在 algorithm 建表语句后追加幂等迁移：`information_schema` 探测 + `PREPARE` 条件执行 `ALTER TABLE ADD COLUMN` |
| dev(MySQL) seed 乱码 | 启动日志中 INSERT 语句中文显示为 `鍐掓场鎺掑簭`，且会真实写入库 | Java 17 中文 Windows 默认平台编码为 GBK，dev profile 未指定 SQL 脚本编码 | `application-dev.yml` 增加 `spring.sql.init.encoding: UTF-8`；存量乱码行由 `ON DUPLICATE KEY UPDATE` 自愈 |
| IDE 启动后所有页面 500 | 直接运行 `AlgoStepApplication` main（工作目录=项目根）后访问 `/index.html`、`/login.html` 等全部返回 `{"code":500,"msg":"服务器内部错误"}`，日志 `No static resource index.html` | `algostep.frontend.path: file:../` 相对 JVM 工作目录：IDE 启动时指向项目根的上级目录导致找不到文件；且 Spring 对 `file:./` 相对位置的处理不可靠（实测 cwd 正确、文件存在仍 NoResourceFoundException），必须绝对路径 | `WebConfig.resolveFrontendLocation()`：按「配置值 → `file:./` → `file:../`」探测首个含 `index.html` 的目录，用 `getCanonicalPath()` 转绝对路径后再注册；`mvn spring-boot:run` 与 IDE 直跑两种方式均验证通过（12 项页面/资源/接口全 200） |
| 注册页无法正常注册 | 打开注册页立即跳回登录页 | 顶层脚本无条件执行跳转 | 删除自动跳转，仅注册成功后延时跳登录；已登录用户访问时回安全目标页 |
| 登录页脚本初始化异常 | 注册链接处理先于 `REDIRECT` 初始化，触发暂时性死区 | 常量声明与使用顺序错误 | 将注册链接处理移动到 `REDIRECT` 初始化之后 |
| 算法子目录链接错误 | 登录、个人中心或登出后跳到不存在的路径 | 子目录页面直接使用根目录相对地址 | `auth.js` / `api.js` 根据 `AlgoSite.base` 统一生成站内地址，并保留当前页回跳 |
| 进度状态判断偏差 | 最后一步不能稳定判定已掌握，回到首步后状态未回退 | 将 0-based 索引误按 `stepIndex >= totalSteps` 判断，且缺少首步分支 | 改为 `stepIndex >= totalSteps - 1`，并补齐 `UNSTARTED`；增加算法存在性与 `totalSteps >= 1` 校验 |
| 通知入口不可见 | 通知逻辑已定义但顶栏没有可用抽屉，样式也不完整 | `mountNotifications()` 未挂载，公共 CSS 与图标未补齐 | 在公共顶栏挂载通知模块，补齐铃铛、角标、抽屉、列表样式与图标 |
| 已读后角标不同步 | 个人中心已读操作后，其他公共顶栏仍可能显示旧未读数 | 页面内角标与全站通知状态未联动 | 通过 `AlgoNotifications.setUnread()` 同步本地缓存和顶栏角标 |
| 回跳地址校验过宽 | `//evil.com/x.html` 可能被当作合法路径 | 旧正则未排除协议相对 URL | 登录、注册页明确禁止 `//` 开头，并回归合法站内地址与站外地址 |
| 最后一步进度仍为 99% | 个人中心进度条到达最后一步仍不满，状态却已是已掌握 | `stepIndex` 为 0-based，旧算法按 `current / total` 计算 | 已掌握或 `current >= total - 1` 直接按 100% 展示，首步仍为 0% |
| 收藏删除出现浏览器弹窗 | 点击垃圾桶图标弹出浏览器原生确认框，样式割裂且无法复用 | 直接使用了 `window.confirm` | 新增 `AlgoDialog.confirm()` 公共组件并替换调用，供后续管理后台复用 |
| 提示信息位于页面底部 | Toast 出现在底部，容易被忽略 | `.toast` 固定为 `bottom: 28px` | 改为顶部居中（`top: 60px`，位于顶栏下方），全站统一 |
| 个人中心内容偏小、留白过多 | 宽屏下整体偏小，视觉重心不足 | 容器 1180px、字号 9.5–13px 偏小 | 容器放宽至 1320px 并整体上调字号与关键控件尺寸，移动端响应式保持不变 |

> 附：PowerShell 控制台中 Spring 日志中文显示乱码仅为控制台代码页（GBK）与日志 UTF-8 不匹配的显示问题，不影响数据；如需消除可在启动前执行 `chcp 65001`。同理 MyBatis 的 SQL 行日志（如 `O(n²)` 显示为 `O(n?)`）也仅是控制台显示问题，HTTP 响应字节为正确 UTF-8。

---

## 八、附录

### 8.1 接口总表（含本轮验证状态）

| 方法 | 路径 | 鉴权 | 前端调用方 | 状态 |
|---|---|---|---|---|
| GET | `/api/algorithms` | 否 | `index.html`、`js/algo-learning.js`、`js/profile.js` | 已对接 |
| GET | `/api/algorithms/{id}` | 否 | 当前以列表建立 slug→id 映射 | 已验证，页面暂未直接调用 |
| POST | `/api/auth/register` | 否 | `register.html` | 已对接 |
| POST | `/api/auth/login` | 否 | `login.html` | 已对接 |
| POST | `/api/auth/refresh` | 否 | `js/api.js` | 已对接 |
| POST | `/api/auth/logout` | 是 | `js/auth.js` | 已对接 |
| GET | `/api/auth/me` | 是 | 页面使用登录缓存与 `/api/user/profile` | 已验证，页面暂未直接调用 |
| GET/PUT | `/api/user/profile` | 是 | `js/profile.js` | 已对接 |
| PUT | `/api/user/password` | 是 | `js/profile.js` | 已对接 |
| GET/PUT | `/api/progress`、`/api/progress/{id}`、`/api/progress/stats` | 是 | `js/algo-learning.js`、`js/profile.js` | 已对接 |
| GET/POST/DELETE | `/api/favorites`、`/api/favorites/{algorithmId}` | 是 | `js/algo-learning.js`、`js/profile.js` | 已对接 |
| GET/PUT | `/api/notifications`（含单条已读、全部已读、未读数） | 是 | `js/site.js`、`js/profile.js` | 已对接 |

### 8.2 数据模型速查

```
sys_user 1 ──< learning_progress >── 1 algorithm
              favorite            >── 1 algorithm
              notification
```

- `learning_progress.status`：`totalSteps >= 1`；`stepIndex=0 → UNSTARTED`；`0 < stepIndex < totalSteps-1 → LEARNING`；`stepIndex >= totalSteps-1 → MASTERED`
- `favorite`、`learning_progress` 均以 `(user_id, algorithm_id)` 唯一，天然幂等

### 8.3 术语

| 术语 | 含义 |
|---|---|
| S0 / S1 … | 落地路线图阶段编号，与第五章一致 |
| T01–T27 | 联调测试用例编号，与 2.4 节一致 |
| G1–G10 | 前后端缺口编号，与 1.3 节一致 |
| slug | `algorithm.name`，如 `bubble-sort`，用于页面与数据关联 |
