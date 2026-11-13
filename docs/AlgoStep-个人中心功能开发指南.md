# AlgoStep 个人中心功能开发指南

> 文档定位：从零实现「个人中心」的完整开发手册，包含现状分析、方案设计、可复制代码、原理说明、联调测试与上线检查。
>
> 适用版本：前端 v2.0 静态站 + 后端 `algostep-backend`（Spring Boot 3.2 / MyBatis-Plus / JWT）
>
> 最后更新：2026-11-11
>
> 阅读建议：第一次开发按「第四章 → 第五章 → …… → 第十章」顺序阅读；只想快速看接口可跳到「附录 A」。

---

## 目录

1. 目标与范围
2. 现状盘点（开发前必读）
3. 总体设计
4. 开发步骤总览
5. Step 1：后端小改造
6. Step 2：扩展顶部导航与登录跳转
7. Step 3：搭建个人中心页面骨架
8. Step 4：实现 `profile.js`
9. Step 5：补全学习进度数据链路
10. 测试与联调
11. 上线前检查与后续演进
12. 附录

---

## 一、目标与范围

### 1.1 这次要做的功能

个人中心不是一个单独页面那么简单，它是一条完整链路：

```
登录 → 顶部头像出现入口 → 进入个人中心 → 读取后端数据 → 修改资料 / 密码
     → 查看学习进度 / 收藏 / 通知 → 数据回到算法页与顶栏
```

本次要交付的能力：

| 模块 | 能力 | 依赖接口 | 优先级 |
|---|---|---|---|
| 入口 | 登录后头像下拉菜单出现「个人中心 / 学习进度 / 我的收藏 / 消息通知 / 退出登录」 | 无 | P0 |
| 概览 | 展示已接触算法数、学习中、已掌握、累计学习时长、最近学习、最近收藏 | 进度、统计、收藏 | P0 |
| 个人资料 | 查看用户名/邮箱，修改昵称与头像 URL，顶栏同步更新 | `GET/PUT /api/user/profile` | P0 |
| 账号安全 | 修改密码，校验原密码、新密码长度与二次确认 | `PUT /api/user/password` | P0 |
| 学习进度 | 列表展示每条进度的状态、步数、学习时长，可跳回算法页 | `GET /api/progress`、`GET /api/progress/stats` | P0 |
| 我的收藏 | 展示收藏的算法，可取消收藏并跳转学习 | `GET /api/favorites`、`DELETE /api/favorites/{id}` | P0 |
| 消息通知 | 分页列表、只看未读、单条已读、全部已读、未读角标 | 通知 4 个接口 | P1 |
| 进度上报 | 算法页播放时自动写入学习进度，让个人中心有数据 | `PUT /api/progress` | P1（配套） |

### 1.2 本次不做的内容

以下内容容易把范围撑大，建议放到后续迭代：

- 头像文件上传（本次只支持图片 URL）。
- 修改邮箱、手机号、第三方登录绑定。
- 注销账号、导出个人数据。
- 管理员后台、通知的创建与推送。
- 收藏/进度的服务端分页（当前算法只有 12 个，前端一次拉完足够）。

### 1.3 完成后你应该能看到

1. 登录后，右上角头像下拉菜单不再只有「登出」，而是完整菜单。
2. 点击「个人中心」进入 `profile.html`，左侧六个标签可切换。
3. 修改昵称后，右上角昵称立即变化，刷新页面仍然生效。
4. 修改密码成功后自动退出登录；旧密码登录失败，新密码登录成功。
5. 学习进度页能看到算法名、状态、进度条、学习时长。
6. 收藏页能取消收藏，刷新后不会复活。
7. 通知页能标记已读，左上角未读角标同步减少。

---

## 二、现状盘点（开发前必读）

> 这一章的目的：让你知道哪些轮子已经有了，避免重复造；哪些地方是坑，需要先补。

### 2.1 前端架构

前端是**零构建纯静态站点**，没有 Vue/React，也没有打包工具。页面通过文件路径直接访问，例如：

```
/index.html
/about.html
/login.html
/register.html
/algorithms/sort/bubble-sort.html
```

共享能力由几个全局脚本提供：

| 文件 | 职责 | 与个人中心的关系 |
|---|---|---|
| `js/site.js` | 注入顶部导航栏与页脚 | 个人中心入口所在的顶栏由它生成 |
| `js/icons.js` | 注入内联 SVG 图标 Sprite | 页面图标通过 `<use href="#i-xxx">` 使用 |
| `js/api.js` | 统一请求层：Base URL、Token、401 刷新、业务码、Toast、Loading | 个人中心所有请求都走它 |
| `js/auth.js` | Token 存取、登录/注册/登出、登录态 UI | 需要扩展下拉菜单和用户缓存 |
| `js/algo-core.js` | 算法页的 `StepController` 等 | 进度上报需要在这里派发步骤事件 |

`js/api.js` 的关键行为（务必理解）：

```js
// 成功时直接返回 body.data，失败时 reject 整个 { code, msg }
return send(reqOpts).then(function (body) {
  if (!body || typeof body.code === 'undefined') return body;
  if (body.code === 200) return body.data;
  if (!silent) toast(body.msg || '请求失败');
  return Promise.reject(body);
});
```

所以业务代码里写：

```js
const user = await AlgoAPI.get('/user/profile'); // 拿到的就是 UserVO
```

而不是 `res.data.data`。失败时 `err.msg` 才是后端提示。

Token 存在 `localStorage`：

| Key | 内容 |
|---|---|
| `algostep_token` | Access Token |
| `algostep_refresh` | Refresh Token |
| `algostep_user` | 登录时缓存的用户信息（userId/username/nickname/role） |

`auth.js` 当前的下拉菜单只有一项：

```js
// js/auth.js 第 84-92 行（现状）
container.innerHTML = `
  <div class="user-badge" onclick="toggleUserMenu(event)">
    <span class="user-avatar">${user.username.charAt(0).toUpperCase()}</span>
    <span class="user-name">${user.nickname || user.username}</span>
    <div class="user-dropdown" id="user-dropdown">
      <a href="javascript:void(0)" onclick="handleLogout()">登出</a>
    </div>
  </div>
`;
```

### 2.2 后端架构

后端按业务模块分包：

```
com.algostep
├── common      // Result、ResultCode、异常、UserContext、JwtUtils、PasswordUtils
├── config      // SecurityConfig、MyBatisPlusConfig、WebConfig、Knife4jConfig
├── security    // JwtAuthenticationFilter、EntryPoint、AccessDeniedHandler
└── module
    ├── auth
    ├── user
    ├── algorithm
    ├── progress
    ├── favorite
    └── notification
```

请求身份链路：

```
Authorization: Bearer <token>
        ↓
JwtAuthenticationFilter 解析 token
        ↓
UserContext.set(userId, username, role)   // ThreadLocal
        ↓
Controller → Service 里 UserContext.getUserId()
        ↓
finally UserContext.clear()               // 防止线程复用串数据
```

**这意味着：前端不需要、也不应该传 `userId`。** 所有“我的数据”都由后端从 Token 中取，天然防越权。

统一响应结构：

```json
{ "code": 200, "msg": "操作成功", "data": { } }
```

`Result` 使用了 `@JsonInclude(NON_NULL)`，所以 `data` 为空时字段可能不出现。

### 2.3 可直接复用的接口

后端已经具备个人中心需要的全部接口，**不需要从零写 Controller**。

| 模块 | 方法 | 路径 | 入参 | 返回 `data` | 鉴权 |
|---|---|---|---|---|---|
| 认证 | POST | `/api/auth/login` | `{username,password}` | `LoginVO` | 白名单 |
| 认证 | POST | `/api/auth/logout` | 无 | `null` | 需 Token |
| 认证 | GET | `/api/auth/me` | 无 | `UserVO` | 需 Token |
| 用户 | GET | `/api/user/profile` | 无 | `UserVO` | 需 Token |
| 用户 | PUT | `/api/user/profile` | `{nickname,avatar}` | `UserVO` | 需 Token |
| 用户 | PUT | `/api/user/password` | `{oldPassword,newPassword}` | `null` | 需 Token |
| 算法 | GET | `/api/algorithms?category=` | 可选分类 | `AlgorithmVO[]` | 白名单 |
| 进度 | GET | `/api/progress` | 无 | `ProgressVO[]` | 需 Token |
| 进度 | GET | `/api/progress/{algorithmId}` | 路径参数 | `ProgressVO` | 需 Token |
| 进度 | PUT | `/api/progress` | `ProgressDTO` | `ProgressVO` | 需 Token |
| 进度 | GET | `/api/progress/stats` | 无 | `ProgressStatsVO` | 需 Token |
| 收藏 | GET | `/api/favorites` | 无 | `FavoriteVO[]` | 需 Token |
| 收藏 | POST | `/api/favorites/{algorithmId}` | 路径参数 | `null` | 需 Token |
| 收藏 | DELETE | `/api/favorites/{algorithmId}` | 路径参数 | `null` | 需 Token |
| 通知 | GET | `/api/notifications` | `pageNum/pageSize/unreadOnly` | `{list,total,pageNum,pageSize,unreadCount}` | 需 Token |
| 通知 | PUT | `/api/notifications/{id}/read` | 路径参数 | `null` | 需 Token |
| 通知 | PUT | `/api/notifications/read-all` | 无 | `null` | 需 Token |
| 通知 | GET | `/api/notifications/unread-count` | 无 | `{unreadCount}` | 需 Token |

字段结构：

```java
// 用户
UserVO      { id, username, email, nickname, avatar, role }

// 进度
ProgressVO  { id, algorithmId, algorithmName, algorithmNameZh,
              category, difficulty, status, stepIndex, totalSteps,
              studyTime, updateTime }
ProgressStatsVO { total, unstarted, learning, mastered, totalStudyTime }

// 收藏
FavoriteVO  { id, algorithmId, algorithmName, algorithmNameZh,
              category, difficulty, url, createTime }

// 通知
NotificationVO { id, type, title, content, isRead, createTime }
```

状态枚举：

```java
LearningStatus: UNSTARTED(未开始) / LEARNING(学习中) / MASTERED(已掌握)
NotificationType: SYSTEM(系统通知) / PROGRESS(进度通知) / ACHIEVEMENT(成就通知)
```

### 2.4 五个必须先知道的“坑”

#### 坑 1：`ProgressVO` 没有 `url`，进度列表无法直接跳转

`FavoriteVO` 有 `url`，但 `ProgressVO` 没有。前端可以先用 `GET /api/algorithms` 建立 `id → url` 映射兜底；更干净的做法是给后端 VO 补一个 `url` 字段（第五章）。

#### 坑 2：`MASTERED` 判定存在 off-by-one

后端当前逻辑：

```java
if (progress.getTotalSteps() > 0 && progress.getStepIndex() >= progress.getTotalSteps()) {
    progress.setStatus(LearningStatus.MASTERED.getCode());
}
```

但算法页的 `stepIndex` 是 **0 基下标**，范围 `0 ~ totalSteps-1`。例如总步数 10，最后一步是 9，`9 >= 10` 永远不成立，所以永远不会自动变成「已掌握」。

应在第五章修正为：

```java
progress.getStepIndex() >= progress.getTotalSteps() - 1
```

#### 坑 3：算法页目前不会写进度

12 个算法页只做本地演示，没有调用 `PUT /api/progress`。所以个人中心开发完成后，进度页大概率是空的。这不是个人中心的 bug，而是缺少“数据来源”。

第九章会给出一套低成本方案：在 `algo-core.js` 派发步骤事件 + 新增一个 `js/algo-progress.js` 统一上报。

#### 坑 4：修改密码后旧 Token 仍然有效

JWT 是无状态的：服务端只验签名和过期时间，不知道密码已经改过。当前：

- Access Token 有效期 2 小时；
- Refresh Token 有效期 7 天；
- 改密不会吊销任何 Token。

所以本次前端采用「改密成功后强制退出登录」的最低成本策略，并在第十一章说明生产级吊销方案。

#### 坑 5：头像空字符串无法清空

`UserServiceImpl.updateProfile()` 用的是：

```java
if (StringUtils.hasText(dto.getAvatar())) {
    user.setAvatar(dto.getAvatar());
}
```

传空字符串不会清空头像。如果希望支持“移除头像”，第五章会给出小改法。

---

## 三、总体设计

### 3.1 页面信息架构

个人中心采用「左侧导航 + 右侧内容」的单页多面板结构，避免创建六个 HTML 文件：

```
profile.html
├── 概览 overview
│   ├── 4 个统计卡片
│   ├── 最近学习（3 条）
│   └── 最近收藏（3 条）
├── 资料 profile
│   ├── 用户名 / 邮箱（只读）
│   ├── 昵称 / 头像 URL（可编辑）
│   └── 头像预览
├── 安全 security
│   └── 原密码 / 新密码 / 确认密码
├── 进度 progress
│   ├── 状态筛选
│   └── 进度列表 + 进度条 + 继续学习
├── 收藏 favorites
│   └── 收藏卡片 + 取消收藏
└── 通知 notifications
    ├── 只看未读 / 全部已读
    ├── 通知列表
    └── 分页
```

为什么用多面板而不是多页面？

- 共用同一份用户态与缓存，切换无刷新；
- 左侧导航固定，体验接近现代账号中心；
- 文件数量少，符合当前零构建静态站的项目风格；
- 通过 URL Hash（`#progress`）仍可深链到某个面板。

### 3.2 文件规划

| 文件 | 类型 | 作用 |
|---|---|---|
| `profile.html` | 新增 | 个人中心页面骨架 |
| `css/profile.css` | 新增 | 个人中心专属样式 |
| `js/profile.js` | 新增 | 页面逻辑：加载、渲染、表单、分页 |
| `js/auth.js` | 修改 | 下拉菜单增加入口、头像支持图片、用户缓存同步 |
| `login.html` | 修改 | 支持 `?redirect=` 登录后回到个人中心 |
| `css/base.css` | 修改 | 下拉菜单与头像图片样式 |
| `js/algo-core.js` | 修改（可选） | 派发 `algostep:step` 事件 |
| `js/algo-progress.js` | 新增（可选） | 算法页学习进度上报 |
| `ProgressVO.java` / `ProgressServiceImpl.java` | 修改（可选） | 补 `url`、修正掌握判定 |
| `UserServiceImpl.java` | 修改（可选） | 支持清空头像 |

### 3.3 一次完整请求发生了什么

以「打开个人中心」为例：

```
1. 浏览器请求 profile.html
2. 页面加载 base.css / profile.css
3. 加载 icons.js → 注入 SVG Sprite
4. 加载 site.js → 注入顶栏（含 #auth-area）
5. 加载 api.js → 暴露 window.AlgoAPI，推导 API_BASE
6. 加载 auth.js → 读取 localStorage 用户，渲染头像下拉
7. 加载 profile.js
8. profile.js 检查 isLoggedIn()
   ├─ 未登录 → location.replace('./login.html?redirect=./profile.html')
   └─ 已登录 → 并行请求
        GET /api/user/profile
        GET /api/algorithms
        GET /api/progress/stats
        GET /api/progress
        GET /api/favorites
        GET /api/notifications?pageNum=1&pageSize=8
9. 每个请求自动带 Authorization: Bearer <token>
10. 后端 Filter 解析 token → UserContext → Service 查询当前用户数据
11. 前端拿到 data，渲染各面板
```

### 3.4 状态管理原则

原生 JS 没有响应式框架，建议用一个集中式 `state` 对象 + 分区渲染函数：

```js
const state = {
  user: null,          // 当前用户
  algorithms: [],      // 算法字典（用于 id → url/名称）
  algorithmMap: {},
  stats: null,         // 统计
  progress: [],        // 进度列表
  favorites: [],       // 收藏列表
  notifications: { list: [], total: 0, pageNum: 1, pageSize: 8, unreadCount: 0 },
  progressFilter: 'ALL',
  notifyUnreadOnly: false,
  notifyPage: 1,
  activeTab: 'overview'
};
```

原则：

1. **请求层只负责拿数据**，拿到后写入 `state`；
2. **渲染层只读 `state`**，不直接发请求；
3. 一个数据源只对应一个加载函数，避免多处刷新导致状态不一致；
4. 用户可见的 API 文本一律转义后再拼 HTML；
5. 后台加载使用 `{ silent: true, noLoading: true }`，避免页面一打开满屏 loading。

### 3.5 安全原则

| 风险 | 处理方式 |
|---|---|
| XSS | 所有 `innerHTML` 拼接前调用 `escapeHtml()`；不要直接插入昵称、通知内容 |
| 开放重定向 | `?redirect=` 只允许站内 `.html` 相对路径 |
| 越权 | 请求体不传 `userId`，后端从 Token 取 |
| 密码泄露 | 不在 localStorage 存密码；改密后强制重新登录 |
| 头像 URL | 只允许 `http/https/相对路径/base64 图片`，拒绝 `javascript:` |
| Token 存储 | localStorage 方便但有 XSS 风险；生产可评估 HttpOnly Cookie |
| 重复收藏 | 后端唯一索引 + 业务校验，前端错误提示直接展示 `err.msg` |

---

## 四、开发步骤总览

建议按下面的顺序做，每一步都能独立验证，不要一口气全写完再调。

| 步骤 | 做什么 | 主要文件 | 完成标准 |
|---|---|---|---|
| 0 | 启动后端，确认 22 个接口可用 | 无 | `http://localhost:8080/doc.html` 能打开 |
| 1 | 后端补 `url`、修掌握判定、支持清空头像 | `ProgressVO`、`ProgressServiceImpl`、`UserServiceImpl` | Knife4j 调用返回符合预期 |
| 2 | 扩展顶栏下拉菜单与登录跳转 | `auth.js`、`login.html`、`base.css` | 登录后能看到「个人中心」 |
| 3 | 搭 `profile.html` + `profile.css` | 新文件 | 页面布局正确，六个面板可切换 |
| 4 | 写 `profile.js`：资料、密码 | `profile.js` | 修改昵称顶栏同步，改密后重新登录 |
| 5 | 写 `profile.js`：进度、收藏 | `profile.js` | 列表渲染、取消收藏成功 |
| 6 | 写 `profile.js`：通知、分页、角标 | `profile.js` | 已读状态与角标同步 |
| 7 | 补进度上报链路 | `algo-core.js`、`algo-progress.js`、算法页 | 播放几步后个人中心出现进度 |
| 8 | 全量测试 | 无 | 第十章用例全部通过 |
| 9 | 上线前检查 | 无 | 第十一章清单全部确认 |

每一步做完先刷新页面看效果，再进入下一步。遇到 401/404 先看第十章排查表。

---

## 五、Step 1：后端小改造

> 这一章不是必须，但强烈建议做。改动很小，能显著提升个人中心的完整度。

### 5.1 给 `ProgressVO` 补充 `url`

**文件**：`algostep-backend/src/main/java/com/algostep/module/progress/vo/ProgressVO.java`

```java
@Data
public class ProgressVO {

    private Long id;
    private Long algorithmId;
    private String algorithmName;
    private String algorithmNameZh;
    private String category;
    private String difficulty;
    private String url;          // 新增：算法页路径，供“继续学习”跳转
    private String status;
    private Integer stepIndex;
    private Integer totalSteps;
    private Integer studyTime;
    private LocalDateTime updateTime;
}
```

**文件**：`algostep-backend/src/main/java/com/algostep/module/progress/service/impl/ProgressServiceImpl.java`

在 `toVO()` 的 `if (algorithm != null)` 块里补一行：

```java
if (algorithm != null) {
    vo.setAlgorithmName(algorithm.getName());
    vo.setAlgorithmNameZh(algorithm.getNameZh());
    vo.setCategory(algorithm.getCategory());
    vo.setDifficulty(algorithm.getDifficulty());
    vo.setUrl(algorithm.getUrl());   // 新增
}
```

**原理**：`learning_progress` 表只存 `algorithm_id`，算法名称、分类、URL 都在 `algorithm` 表。Service 已经批量查了算法并组装 VO，补一个字段即可，不需要改 SQL。

> 前端仍会保留「用 `/api/algorithms` 建映射」的兜底逻辑，这样即使后端没改也能跳转。

### 5.2 修正「已掌握」判定

**文件**：`ProgressServiceImpl.java` 的 `save()` 方法。

把：

```java
if (progress.getTotalSteps() > 0 && progress.getStepIndex() >= progress.getTotalSteps()) {
    progress.setStatus(LearningStatus.MASTERED.getCode());
}
```

改为：

```java
if (progress.getTotalSteps() > 0
        && progress.getStepIndex() >= progress.getTotalSteps() - 1) {
    progress.setStatus(LearningStatus.MASTERED.getCode());
}
```

**原理**：

- `stepIndex` 表示“当前看到第几步”，从 0 开始；
- `totalSteps` 表示总步数，例如 10；
- 最后一步的下标是 9；
- 因此“看到最后一步”应写成 `stepIndex >= totalSteps - 1`。

修正后，算法页上报到最后一步时会自动流转为 `MASTERED`，个人中心统计才准确。

### 5.3 支持清空头像（可选）

当前 `UserProfileDTO` 的 `avatar` 允许为空，但 Service 用 `StringUtils.hasText` 判断，空字符串会被忽略。

**文件**：`UserServiceImpl.java` 的 `updateProfile()`。

```java
if (StringUtils.hasText(dto.getNickname())) {
    user.setNickname(dto.getNickname());
}

// 原逻辑：空字符串不会清空头像
// if (StringUtils.hasText(dto.getAvatar())) {
//     user.setAvatar(dto.getAvatar());
// }

// 新逻辑：null 表示“不修改”，空字符串表示“清空”
if (dto.getAvatar() != null) {
    String avatar = dto.getAvatar().trim();
    user.setAvatar(avatar.isEmpty() ? null : avatar);
}
```

**原理**：用 `null` 和空字符串表达不同语义，是 PUT 局部更新里常见的做法。前端不传某个字段就是 `null`，传 `""` 就是明确清空。

### 5.4 改密后的 Token 失效（本轮只做前端兜底）

这是 JWT 的经典问题，先理解再决定做到哪一层。

**现状**：

```
用户 A 登录 → 拿到 token（2 小时有效）
用户 A 修改密码
旧 token 仍然能访问所有接口，直到 2 小时后过期
```

**方案对比**：

| 方案 | 做法 | 优点 | 缺点 | 建议 |
|---|---|---|---|---|
| 前端强制重登 | 改密成功后清空本地 Token | 零后端改动 | 只影响当前浏览器，被盗 Token 仍有效 | 本轮采用 |
| 密码修改时间 | 用户表加 `pwd_changed_at`，JWT 带 `iat`，Filter 比较 | 无状态、实现简单 | 每个请求要查一次用户（可缓存） | 下一阶段推荐 |
| Token 版本号 | 用户表加 `token_version`，JWT 带版本，改密时 +1 | 可精确吊销 | 每个请求要查版本 | Redis 化后推荐 |
| Redis 黑名单 | JWT 带 `jti`，登出/改密写入黑名单直到过期 | 可精确吊销 | 依赖 Redis | 引入 Redis 后做 |

本轮前端策略：

```js
// 改密成功后
// 1. 显示成功提示
// 2. 调用 /auth/logout（失败也无所谓）
// 3. clearAuth() 清空 localStorage
// 4. 跳转登录页
```

文档会在第八章给出完整代码。

### 5.5 用 Knife4j 自测

启动后端：

```powershell
cd algostep-backend
mvn spring-boot:run
```

打开 `http://localhost:8080/doc.html`：

1. 调 `POST /api/auth/login` 拿 `token`；
2. 点右上角「Authorize」，填入 `Bearer <token>`；
3. 依次调：
   - `GET /api/user/profile`
   - `PUT /api/user/profile`，body `{"nickname":"测试昵称","avatar":""}`
   - `GET /api/progress`
   - `GET /api/progress/stats`
   - `GET /api/favorites`
   - `GET /api/notifications?pageNum=1&pageSize=8`

确认返回的 `code` 都是 200，再开始写前端。

## 六、Step 2：扩展顶部导航与登录跳转

### 6.1 扩展 `js/auth.js`

个人中心入口在顶栏头像下拉菜单里，所以先改 `auth.js`。

#### 6.1.1 新增常量与转义函数

在文件顶部的三个 Key 后面加一个未读缓存 Key：

```js
const TOKEN_KEY = 'algostep_token';
const REFRESH_KEY = 'algostep_refresh';
const USER_KEY = 'algostep_user';
const UNREAD_KEY = 'algostep_unread';   // 新增：顶栏未读角标缓存
```

再加一个 HTML 转义函数。昵称是用户输入，直接拼进 `innerHTML` 会有 XSS 风险：

```js
function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

**原理**：浏览器解析 `innerHTML` 时会把字符串当 HTML。如果昵称是 `<img src=x onerror=alert(1)>`，不转义就会执行脚本。转义后它只是一段普通文字。

#### 6.1.2 登录时清空旧未读缓存，登出时清理干净

```js
function setAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify({
    userId: data.userId,
    username: data.username,
    nickname: data.nickname,
    role: data.role
  }));
  localStorage.removeItem(UNREAD_KEY);   // 新增
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(UNREAD_KEY);   // 新增
}
```

#### 6.1.3 新增“更新本地用户缓存”函数

个人中心保存资料后，顶栏要立即变化，不能等下次登录。加一个函数：

```js
/**
 * 局部更新 localStorage 中的用户信息，并刷新顶栏
 * @param {Object} partial 例如 { nickname: '新昵称', avatar: 'https://...' }
 */
function updateCachedUser(partial) {
  const current = getUser() || {};
  const next = Object.assign({}, current, partial || {});
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  updateAuthUI();
  return next;
}
```

**原理**：`algostep_user` 只是登录时的一份快照，不是服务端实时数据。修改资料成功后，用后端返回的最新 `UserVO` 覆盖快照，顶栏重新渲染即可。

#### 6.1.4 重写 `updateAuthUI()`

把原来的 `updateAuthUI()` 整体替换为：

```js
function updateAuthUI() {
  const user = getUser();
  const container = document.getElementById('auth-area');
  if (!container) return;

  if (user) {
    const displayName = user.nickname || user.username || '用户';
    const initial = String(displayName).trim().charAt(0).toUpperCase() || 'U';
    const avatar = typeof user.avatar === 'string' ? user.avatar.trim() : '';

    // 有头像 URL 时渲染图片；图片加载失败自动移除，露出首字母
    const avatarHtml = avatar
      ? '<span class="user-avatar">' +
          '<span class="avatar-fallback">' + escapeHtml(initial) + '</span>' +
          '<img src="' + escapeHtml(avatar) + '" alt="" onerror="this.remove()">' +
        '</span>'
      : '<span class="user-avatar">' + escapeHtml(initial) + '</span>';

    const unread = Number(localStorage.getItem(UNREAD_KEY) || 0);
    const unreadHtml = unread > 0
      ? '<span class="dropdown-badge">' + (unread > 99 ? '99+' : unread) + '</span>'
      : '';

    container.innerHTML = `
      <div class="user-badge" onclick="toggleUserMenu(event)">
        ${avatarHtml}
        <span class="user-name">${escapeHtml(displayName)}</span>
        <div class="user-dropdown" id="user-dropdown">
          <a href="./profile.html">个人中心</a>
          <a href="./profile.html#progress">学习进度</a>
          <a href="./profile.html#favorites">我的收藏</a>
          <a href="./profile.html#notifications">消息通知${unreadHtml}</a>
          <a href="javascript:void(0)" class="danger" onclick="handleLogout()">退出登录</a>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <a href="./login.html" class="auth-btn login-btn">登录</a>
      <a href="./register.html" class="auth-btn register-btn">注册</a>
    `;
  }
}
```

要点：

1. `avatar` 从 `user.avatar` 读取，但登录接口 `LoginVO` 不返回头像。所以第一次登录后的顶栏仍然是首字母；进入个人中心调用 `GET /user/profile` 后，`updateCachedUser({ avatar })` 才会把头像补进缓存。
2. 未读角标读 `algostep_unread`，不额外发请求。这样每个页面加载不会多一次网络请求。
3. 下拉链接使用 `./profile.html`，因为 `auth.js` 目前只在根目录页面（`index.html`、`about.html`）引入。如果以后算法页也要引入，需要把路径改成基于 `data-base` 的动态路径。

### 6.2 补充 `css/base.css`

现有 `.user-dropdown a:hover` 把所有菜单项都变成红色，不适合“个人中心 / 学习进度”这类普通入口。替换为中性色，并给退出登录单独加 `.danger`。

```css
/* 头像支持图片：图片绝对定位覆盖在首字母上 */
.user-avatar {
    position: relative;
    overflow: hidden;
}
.user-avatar .avatar-fallback {
    position: relative;
    z-index: 0;
}
.user-avatar img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    z-index: 1;
}

/* 下拉菜单加宽，容纳“消息通知 + 角标” */
.user-dropdown {
    min-width: 142px;
}
.user-dropdown a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

/* 普通菜单项 hover：浅灰；危险项 hover：浅红 */
.user-dropdown a:hover {
    background: #f8fafc;
    color: var(--v2-text);
}
.user-dropdown a.danger {
    color: #e11d48;
}
.user-dropdown a.danger:hover {
    background: #fff1f2;
    color: #be123c;
}

/* 未读角标 */
.dropdown-badge {
    min-width: 16px;
    height: 16px;
    padding: 0 5px;
    border-radius: 999px;
    background: #ef4444;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
```

**原理**：`.user-avatar` 原本是 18×18 的圆形首字母。加上图片后，用一个绝对定位的 `<img>` 覆盖，首字母作为兜底保留在下层；图片 `onerror` 时移除自己，首字母自然露出。

### 6.3 让登录页支持 `?redirect=`

个人中心有登录守卫：未登录访问 `profile.html` 会跳到登录页。登录成功后应该回到个人中心，而不是首页。

**文件**：`login.html`

把底部的 `<script>` 改成：

```html
<script>
  // 只允许站内 .html 相对路径，防止开放重定向
  function getSafeRedirect() {
    const raw = new URLSearchParams(location.search).get('redirect');
    if (!raw) return './index.html';
    // 允许 ./profile.html、../index.html、/profile.html，可带 #hash
    if (!/^\.{0,2}\/[A-Za-z0-9._\-\/]*\.html(?:#[A-Za-z0-9_-]+)?$/.test(raw)) {
      return './index.html';
    }
    return raw;
  }

  const REDIRECT = getSafeRedirect();

  // 已登录则直接去目标页
  if (isLoggedIn()) {
    window.location.href = REDIRECT;
  }

  async function handleLogin(event) {
    event.preventDefault();

    const btn = document.getElementById('btn-login');
    const errEl = document.getElementById('error-msg');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    errEl.classList.remove('visible');
    btn.disabled = true;
    btn.textContent = '登录中...';

    try {
      const data = await loginAPI(username, password);
      setAuth(data);
      window.location.href = REDIRECT;   // 关键：回到来源页
    } catch (err) {
      errEl.textContent = (err && err.msg) || '网络错误，请检查后端服务是否启动';
      errEl.classList.add('visible');
      btn.disabled = false;
      btn.textContent = '登录';
    }
  }
</script>
```

同时把“立即注册”链接改成携带 redirect：

```html
<a id="registerLink" href="./register.html">立即注册</a>
<script>
  if (REDIRECT !== './index.html') {
    document.getElementById('registerLink').href =
      './register.html?redirect=' + encodeURIComponent(REDIRECT);
  }
</script>
```

`register.html` 里注册成功后一般跳登录页，也读取一次 `redirect` 并带给登录页即可：

```js
const redirect = new URLSearchParams(location.search).get('redirect');
const loginUrl = './login.html' + (redirect ? '?redirect=' + encodeURIComponent(redirect) : '');
window.location.href = loginUrl;
```

> 安全说明：如果直接 `window.location.href = raw`，攻击者可以构造 `?redirect=https://evil.com` 做钓鱼跳转。正则只允许站内 `.html`，并拒绝 `http://`、`//`、`javascript:`。

### 6.4 验收

1. 登录后刷新首页，右上角出现头像/昵称。
2. 点开下拉菜单，看到五项：个人中心、学习进度、我的收藏、消息通知、退出登录。
3. 直接访问 `profile.html`（未登录）→ 跳到 `login.html?redirect=./profile.html`。
4. 登录成功后回到 `profile.html`，而不是首页。
5. 昵称包含 `<`、`>` 等字符时，顶栏原样显示，不弹窗、不破坏布局。

---

## 七、Step 3：搭建个人中心页面骨架

### 7.1 `profile.html` 完整代码

新建 `d:\啵啵\Trae\Project\Java\AlgoStep\profile.html`。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>个人中心 · AlgoStep</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='asg' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%236366f1'/><stop offset='1' stop-color='%238b5cf6'/></linearGradient></defs><rect width='32' height='32' rx='7' fill='url(%23asg)'/><text x='16' y='22.5' font-size='15' font-weight='700' fill='white' text-anchor='middle' font-family='Inter,Arial,sans-serif'>AS</text></svg>">
  <link rel="stylesheet" href="./css/base.css">
  <link rel="stylesheet" href="./css/profile.css">
</head>
<body class="profile-page">

<!-- 全站图标库 -->
<script src="./js/icons.js"></script>

<!-- 个人中心补充图标（内联 Sprite，避免修改公共 icons.js） -->
<svg class="profile-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <symbol id="p-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></symbol>
  <symbol id="p-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></symbol>
  <symbol id="p-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></symbol>
  <symbol id="p-logout" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></symbol>
  <symbol id="p-mail" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 7 12 13 2 7"/></symbol>
  <symbol id="p-trash" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></symbol>
  <symbol id="p-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></symbol>
  <symbol id="p-edit" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></symbol>
</svg>

<main class="profile-shell">

  <!-- ==================== 左侧栏 ==================== -->
  <aside class="profile-sidebar">
    <section class="profile-card">
      <div class="profile-avatar avatar-box" id="sidebarAvatar">
        <span class="avatar-fallback">A</span>
      </div>
      <h1 class="profile-name" id="sidebarName">加载中…</h1>
      <p class="profile-email" id="sidebarEmail">—</p>
      <span class="profile-role" id="sidebarRole">USER</span>
    </section>

    <nav class="profile-nav" aria-label="个人中心导航">
      <button class="profile-nav-item is-active" data-tab="overview" type="button">
        <svg class="ico"><use href="#i-home"/></svg><span>概览</span>
      </button>
      <button class="profile-nav-item" data-tab="profile" type="button">
        <svg class="ico"><use href="#i-layout"/></svg><span>个人资料</span>
      </button>
      <button class="profile-nav-item" data-tab="security" type="button">
        <svg class="ico"><use href="#p-shield"/></svg><span>账号安全</span>
      </button>
      <button class="profile-nav-item" data-tab="progress" type="button">
        <svg class="ico"><use href="#i-clock"/></svg><span>学习进度</span>
      </button>
      <button class="profile-nav-item" data-tab="favorites" type="button">
        <svg class="ico"><use href="#i-star"/></svg><span>我的收藏</span>
      </button>
      <button class="profile-nav-item" data-tab="notifications" type="button">
        <svg class="ico"><use href="#p-bell"/></svg><span>消息通知</span>
        <span class="nav-badge hidden" id="navNotifBadge">0</span>
      </button>
    </nav>

    <button class="profile-logout" id="btnLogout" type="button">
      <svg class="ico"><use href="#p-logout"/></svg><span>退出登录</span>
    </button>
  </aside>

  <!-- ==================== 右侧内容 ==================== -->
  <section class="profile-main">

    <!-- ---------- 概览 ---------- -->
    <section class="profile-panel is-active" data-panel="overview">
      <header class="panel-head">
        <div>
          <h2>学习概览</h2>
          <p>汇总你的学习进度与收藏，数据来自 AlgoStep 后端。</p>
        </div>
        <a class="panel-action" href="./index.html">去探索算法</a>
      </header>

      <div class="stat-grid">
        <article class="stat-card">
          <span class="stat-label">已接触算法</span>
          <strong class="stat-value" id="statTotal">0</strong>
          <span class="stat-foot" id="statTotalFoot">共 0 个算法</span>
        </article>
        <article class="stat-card">
          <span class="stat-label">学习中</span>
          <strong class="stat-value" id="statLearning">0</strong>
          <span class="stat-foot">继续完成未掌握的算法</span>
        </article>
        <article class="stat-card">
          <span class="stat-label">已掌握</span>
          <strong class="stat-value" id="statMastered">0</strong>
          <span class="stat-foot" id="statMasteredFoot">完成率 0%</span>
        </article>
        <article class="stat-card">
          <span class="stat-label">累计学习</span>
          <strong class="stat-value stat-value--sm" id="statTime">0 分钟</strong>
          <span class="stat-foot">按算法页实际上报累计</span>
        </article>
      </div>

      <div class="overview-grid">
        <article class="panel-card">
          <header class="card-head">
            <h3>最近学习</h3>
            <button class="text-link" data-tab-link="progress" type="button">查看全部</button>
          </header>
          <div class="mini-list" id="recentProgress"></div>
        </article>

        <article class="panel-card">
          <header class="card-head">
            <h3>最近收藏</h3>
            <button class="text-link" data-tab-link="favorites" type="button">查看全部</button>
          </header>
          <div class="mini-list" id="recentFavorites"></div>
        </article>
      </div>
    </section>

    <!-- ---------- 个人资料 ---------- -->
    <section class="profile-panel" data-panel="profile">
      <header class="panel-head">
        <div>
          <h2>个人资料</h2>
          <p>昵称会显示在右上角，头像支持图片 URL。</p>
        </div>
      </header>

      <div class="alert" id="profileAlert" role="status"></div>

      <form class="profile-form" id="profileForm" novalidate>
        <div class="form-row">
          <div class="form-field">
            <label for="inputUsername">用户名</label>
            <input id="inputUsername" type="text" disabled>
            <p class="form-hint">用户名注册后不可修改</p>
          </div>
          <div class="form-field">
            <label for="inputEmail">邮箱</label>
            <input id="inputEmail" type="email" disabled>
            <p class="form-hint">邮箱暂不支持修改</p>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="inputNickname">昵称</label>
            <input id="inputNickname" type="text" maxlength="50" placeholder="给自己起个昵称">
            <p class="form-hint">最多 50 个字符</p>
          </div>
          <div class="form-field">
            <label for="inputAvatar">头像 URL</label>
            <input id="inputAvatar" type="text" maxlength="255" placeholder="https://example.com/avatar.png">
            <p class="form-hint">留空则使用昵称首字母头像</p>
          </div>
        </div>

        <div class="avatar-preview">
          <div class="profile-avatar avatar-box" id="formAvatarPreview">
            <span class="avatar-fallback">A</span>
          </div>
          <div class="avatar-preview-text">
            <strong>头像预览</strong>
            <p>支持 http/https 图片地址，加载失败自动回退首字母。</p>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-primary" id="btnSaveProfile" type="submit">保存修改</button>
          <button class="btn-ghost" id="btnResetProfile" type="button">重置</button>
        </div>
      </form>
    </section>

    <!-- ---------- 账号安全 ---------- -->
    <section class="profile-panel" data-panel="security">
      <header class="panel-head">
        <div>
          <h2>账号安全</h2>
          <p>修改密码前需要验证原密码，新密码长度 6–50 位。</p>
        </div>
      </header>

      <div class="alert" id="pwdAlert" role="status"></div>

      <form class="profile-form profile-form--narrow" id="passwordForm" novalidate>
        <div class="form-field">
          <label for="oldPassword">原密码</label>
          <input id="oldPassword" type="password" autocomplete="current-password" placeholder="请输入当前密码">
        </div>
        <div class="form-field">
          <label for="newPassword">新密码</label>
          <input id="newPassword" type="password" autocomplete="new-password" placeholder="6–50 位新密码">
          <p class="form-hint">修改成功后需要使用新密码重新登录</p>
        </div>
        <div class="form-field">
          <label for="confirmPassword">确认新密码</label>
          <input id="confirmPassword" type="password" autocomplete="new-password" placeholder="再次输入新密码">
        </div>
        <div class="form-actions">
          <button class="btn-primary" id="btnChangePassword" type="submit">确认修改</button>
        </div>
      </form>

      <aside class="security-note">
        <strong>安全提示</strong>
        <p>JWT 是无状态令牌。后端当前不会在改密后主动吊销已签发的 Token，因此本页在修改成功后强制退出登录；生产环境建议增加 Token 版本号或 Redis 黑名单。</p>
      </aside>
    </section>

    <!-- ---------- 学习进度 ---------- -->
    <section class="profile-panel" data-panel="progress">
      <header class="panel-head">
        <div>
          <h2>学习进度</h2>
          <p>进度由算法页上报；状态分为未开始、学习中、已掌握。</p>
        </div>
        <div class="segmented" id="progressFilter">
          <button class="is-active" data-filter="ALL" type="button">全部</button>
          <button data-filter="LEARNING" type="button">学习中</button>
          <button data-filter="MASTERED" type="button">已掌握</button>
        </div>
      </header>
      <div class="progress-list" id="progressList"></div>
    </section>

    <!-- ---------- 我的收藏 ---------- -->
    <section class="profile-panel" data-panel="favorites">
      <header class="panel-head">
        <div>
          <h2>我的收藏</h2>
          <p>收藏按加入时间倒序排列，可直接跳回算法页。</p>
        </div>
        <a class="panel-action" href="./index.html">发现更多</a>
      </header>
      <div class="favorite-grid" id="favoriteList"></div>
    </section>

    <!-- ---------- 消息通知 ---------- -->
    <section class="profile-panel" data-panel="notifications">
      <header class="panel-head">
        <div>
          <h2>消息通知 <span class="title-badge hidden" id="notifUnreadBadge">0</span></h2>
          <p>系统通知、进度提醒与成就消息。</p>
        </div>
        <div class="notify-actions">
          <label class="switch">
            <input id="unreadOnly" type="checkbox">
            <span>只看未读</span>
          </label>
          <button class="btn-ghost btn-sm" id="btnReadAll" type="button">全部已读</button>
        </div>
      </header>
      <div class="notification-list" id="notificationList"></div>
      <footer class="pager" id="notifyPager">
        <button class="btn-ghost btn-sm" id="btnPrevPage" type="button">上一页</button>
        <span id="pageInfo">第 1 / 1 页</span>
        <button class="btn-ghost btn-sm" id="btnNextPage" type="button">下一页</button>
      </footer>
    </section>

  </section>
</main>

<script src="./js/site.js" data-base="./" data-auth="on" data-footer="full"></script>
<script src="./js/api.js"></script>
<script src="./js/auth.js"></script>
<script src="./js/profile.js"></script>
</body>
</html>
```

### 7.2 `css/profile.css` 完整代码

新建 `d:\啵啵\Trae\Project\Java\AlgoStep\css\profile.css`。

```css
/* ============================================================
 * AlgoStep v2.0 · profile.css
 * 个人中心 · 依赖 base.css
 * ============================================================ */

.profile-sprite {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
}

.profile-page {
    min-height: 100vh;
}

.profile-shell {
    flex: 1 0 auto;
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding: 24px 20px 36px;
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 20px;
    align-items: start;
}

/* ---------------- 左侧栏 ---------------- */
.profile-sidebar {
    position: sticky;
    top: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.profile-card {
    padding: 24px 20px 20px;
    border: 1px solid var(--v2-border);
    border-radius: var(--v2-radius-panel);
    background: var(--v2-bg-card);
    box-shadow: var(--v2-shadow-panel);
    text-align: center;
}

.profile-avatar {
    position: relative;
    width: 64px;
    height: 64px;
    margin: 0 auto 12px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #ffffff;
    font-size: 24px;
    font-weight: 700;
    display: grid;
    place-items: center;
    overflow: hidden;
    box-shadow: 0 8px 20px -10px rgba(99, 102, 241, 0.8);
}

.profile-avatar .avatar-fallback {
    position: relative;
    z-index: 0;
}

.profile-avatar img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
}

.profile-name {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
    color: var(--v2-text-strong);
    word-break: break-all;
}

.profile-email {
    margin: 0 0 10px;
    font-size: 11px;
    color: var(--v2-text-muted);
    word-break: break-all;
}

.profile-role {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--v2-primary-soft);
    color: var(--v2-primary);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
}

.profile-nav {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px;
    border: 1px solid var(--v2-border);
    border-radius: var(--v2-radius-panel);
    background: var(--v2-bg-card);
    box-shadow: var(--v2-shadow-panel);
}

.profile-nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: var(--v2-text-secondary);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.profile-nav-item:hover {
    background: #f8fafc;
    color: var(--v2-text);
}

.profile-nav-item.is-active {
    background: var(--v2-primary-soft);
    color: var(--v2-primary);
}

.profile-nav-item .ico {
    width: 15px;
    height: 15px;
}

.nav-badge {
    margin-left: auto;
    min-width: 17px;
    height: 17px;
    padding: 0 5px;
    border-radius: 999px;
    background: #ef4444;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.profile-logout {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px;
    border: 1px solid #fecdd3;
    border-radius: 12px;
    background: #ffffff;
    color: #e11d48;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}

.profile-logout:hover {
    background: #fff1f2;
    border-color: #fda4af;
}

/* ---------------- 右侧面板 ---------------- */
.profile-main {
    min-width: 0;
}

.profile-panel {
    display: none;
    padding: 26px 28px 30px;
    border: 1px solid var(--v2-border);
    border-radius: var(--v2-radius-panel);
    background: var(--v2-bg-card);
    box-shadow: var(--v2-shadow-panel);
}

.profile-panel.is-active {
    display: block;
    animation: profileFade 0.22s ease;
}

@keyframes profileFade {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: none; }
}

.panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 22px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--v2-border-soft);
}

.panel-head h2 {
    margin: 0 0 5px;
    font-size: 19px;
    font-weight: 700;
    color: var(--v2-text-strong);
}

.panel-head p {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--v2-text-secondary);
}

.panel-action {
    flex: none;
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    border-radius: 8px;
    background: var(--v2-primary-soft);
    color: var(--v2-primary);
    font-size: 11px;
    font-weight: 600;
    text-decoration: none;
}

.panel-action:hover {
    background: #e0e7ff;
}

/* ---------------- 概览统计 ---------------- */
.stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 20px;
}

.stat-card {
    padding: 16px 16px 14px;
    border: 1px solid var(--v2-border-soft);
    border-radius: var(--v2-radius-card);
    background: linear-gradient(180deg, #ffffff, #f8fafc);
}

.stat-label {
    display: block;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--v2-text-muted);
    letter-spacing: 0.04em;
}

.stat-value {
    display: block;
    margin: 6px 0 4px;
    font-family: var(--v2-font-mono);
    font-size: 24px;
    font-weight: 700;
    color: var(--v2-text-strong);
    line-height: 1.2;
}

.stat-value--sm {
    font-size: 18px;
}

.stat-foot {
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--v2-text-muted);
}

.overview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.panel-card {
    padding: 16px;
    border: 1px solid var(--v2-border);
    border-radius: var(--v2-radius-card);
    background: #ffffff;
}

.card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
}

.card-head h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--v2-text-strong);
}

.text-link {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--v2-primary);
    font-family: inherit;
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
}

.text-link:hover {
    text-decoration: underline;
}

.mini-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.mini-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 6px;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
    transition: background 0.15s;
}

.mini-item:hover {
    background: #f8fafc;
}

.mini-icon {
    width: 28px;
    height: 28px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: var(--v2-primary-soft);
    color: var(--v2-primary);
    font-size: 11px;
    font-weight: 700;
}

.mini-body {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.mini-body strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--v2-text);
}

.mini-body small {
    font-size: 9.5px;
    color: var(--v2-text-muted);
}

.mini-arrow {
    flex: none;
    color: var(--v2-text-muted);
}

.mini-arrow .ico {
    width: 12px;
    height: 12px;
}

/* ---------------- 表单 ---------------- */
.profile-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.profile-form--narrow {
    max-width: 440px;
}

.form-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

.form-field {
    min-width: 0;
}

.form-field label {
    display: block;
    margin-bottom: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: #475569;
}

.form-field input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--v2-border);
    border-radius: 10px;
    background: #f8fafc;
    font-family: var(--v2-font);
    font-size: 12.5px;
    color: var(--v2-text);
    outline: none;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.form-field input:focus {
    border-color: var(--v2-primary-light);
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
}

.form-field input:disabled {
    background: #f1f5f9;
    color: var(--v2-text-muted);
    cursor: not-allowed;
}

.form-hint {
    margin: 5px 0 0;
    font-size: 10px;
    line-height: 1.5;
    color: var(--v2-text-muted);
}

.avatar-preview {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    border: 1px dashed var(--v2-border);
    border-radius: var(--v2-radius-card);
    background: #f8fafc;
}

.avatar-preview .profile-avatar {
    width: 52px;
    height: 52px;
    margin: 0;
    font-size: 20px;
}

.avatar-preview-text strong {
    display: block;
    margin-bottom: 3px;
    font-size: 11.5px;
    color: var(--v2-text);
}

.avatar-preview-text p {
    margin: 0;
    font-size: 10px;
    line-height: 1.5;
    color: var(--v2-text-muted);
}

.form-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
}

.btn-primary,
.btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 16px;
    border-radius: 9px;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}

.btn-primary {
    border: none;
    background: var(--v2-primary);
    color: #ffffff;
    box-shadow: 0 8px 18px -12px rgba(79, 70, 229, 0.85);
}

.btn-primary:hover:not(:disabled) {
    background: var(--v2-primary-hover);
}

.btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
}

.btn-ghost {
    border: 1px solid var(--v2-border);
    background: #ffffff;
    color: var(--v2-text-secondary);
}

.btn-ghost:hover:not(:disabled) {
    background: #f8fafc;
    border-color: var(--v2-primary-line);
    color: var(--v2-primary);
}

.btn-ghost:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.btn-sm {
    height: 30px;
    padding: 0 11px;
    font-size: 10.5px;
}

/* ---------------- 提示条 ---------------- */
.alert {
    display: none;
    margin-bottom: 16px;
    padding: 9px 12px;
    border: 1px solid transparent;
    border-radius: 9px;
    font-size: 11px;
    line-height: 1.5;
}

.alert.is-visible {
    display: block;
}

.alert-error {
    border-color: #fecdd3;
    background: #fff1f2;
    color: #be123c;
}

.alert-success {
    border-color: #a7f3d0;
    background: #ecfdf5;
    color: #047857;
}

.security-note {
    margin-top: 22px;
    padding: 14px 16px;
    border: 1px solid #fde68a;
    border-radius: var(--v2-radius-card);
    background: #fffbeb;
}

.security-note strong {
    display: block;
    margin-bottom: 4px;
    font-size: 11.5px;
    color: #92400e;
}

.security-note p {
    margin: 0;
    font-size: 10.5px;
    line-height: 1.65;
    color: #a16207;
}

/* ---------------- 学习进度 ---------------- */
.segmented {
    flex: none;
    display: inline-flex;
    padding: 3px;
    border: 1px solid var(--v2-border);
    border-radius: 9px;
    background: #f8fafc;
}

.segmented button {
    padding: 6px 10px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--v2-text-secondary);
    font-family: inherit;
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.segmented button.is-active {
    background: #ffffff;
    color: var(--v2-primary);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.progress-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.progress-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    align-items: center;
    padding: 14px 16px;
    border: 1px solid var(--v2-border-soft);
    border-radius: var(--v2-radius-card);
    background: #ffffff;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.progress-item:hover {
    border-color: var(--v2-primary-line);
    box-shadow: 0 8px 20px -18px rgba(79, 70, 229, 0.5);
}

.item-title {
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 700;
    color: var(--v2-text-strong);
}

.item-en {
    font-family: var(--v2-font-mono);
    font-size: 9.5px;
    font-weight: 400;
    color: var(--v2-text-muted);
}

.item-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 9.5px;
    color: var(--v2-text-muted);
}

.chip {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 7px;
    border-radius: 999px;
    font-size: 9.5px;
    font-weight: 600;
    background: #f1f5f9;
    color: #64748b;
}

.chip.beginner { background: #ecfdf5; color: #047857; }
.chip.basic    { background: #eff6ff; color: #1d4ed8; }
.chip.advanced { background: #fdf2f8; color: #be185d; }

.chip.status-learning  { background: #fff7ed; color: #c2410c; }
.chip.status-mastered  { background: #ecfdf5; color: #047857; }
.chip.status-unstarted { background: #f1f5f9; color: #64748b; }

.progress-right {
    display: flex;
    align-items: center;
    gap: 10px;
}

.progress-bar {
    width: 150px;
    height: 7px;
    border-radius: 999px;
    background: #eef2f8;
    overflow: hidden;
}

.progress-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    transition: width 0.3s ease;
}

.progress-percent {
    width: 36px;
    font-family: var(--v2-font-mono);
    font-size: 10px;
    font-weight: 700;
    color: var(--v2-primary);
    text-align: right;
}

.item-link {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 10px;
    border-radius: 7px;
    background: var(--v2-primary-soft);
    color: var(--v2-primary);
    font-size: 10px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
}

.item-link:hover {
    background: #e0e7ff;
}

.item-link.is-disabled {
    background: #f1f5f9;
    color: var(--v2-text-muted);
    pointer-events: none;
}

/* ---------------- 收藏 ---------------- */
.favorite-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.favorite-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--v2-border);
    border-radius: var(--v2-radius-card);
    background: #ffffff;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.favorite-card:hover {
    border-color: var(--v2-primary-line);
    box-shadow: 0 10px 24px -20px rgba(79, 70, 229, 0.6);
}

.favorite-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}

.favorite-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px dashed var(--v2-border-soft);
}

.btn-icon {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border: 1px solid var(--v2-border);
    border-radius: 7px;
    background: #ffffff;
    color: var(--v2-text-muted);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.btn-icon:hover {
    border-color: #fecdd3;
    background: #fff1f2;
    color: #e11d48;
}

.btn-icon .ico {
    width: 13px;
    height: 13px;
}

/* ---------------- 通知 ---------------- */
.notify-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: none;
}

.switch {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10.5px;
    color: var(--v2-text-secondary);
    cursor: pointer;
    user-select: none;
}

.switch input {
    width: 14px;
    height: 14px;
    accent-color: var(--v2-primary);
}

.title-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #ef4444;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 700;
    vertical-align: middle;
}

.notification-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.notification-item {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 13px 14px;
    border: 1px solid var(--v2-border-soft);
    border-radius: var(--v2-radius-card);
    background: #ffffff;
}

.notification-item.unread {
    border-color: var(--v2-primary-line);
    background: #f8faff;
}

.notif-dot {
    width: 7px;
    height: 7px;
    margin-top: 5px;
    border-radius: 50%;
    background: #cbd5e1;
}

.notification-item.unread .notif-dot {
    background: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.notif-title {
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    color: var(--v2-text-strong);
}

.notif-content {
    font-size: 10.5px;
    line-height: 1.65;
    color: var(--v2-text-secondary);
    word-break: break-word;
}

.notif-meta {
    margin-top: 6px;
    font-size: 9.5px;
    color: var(--v2-text-muted);
}

.notif-read {
    padding: 4px 8px;
    border: 1px solid var(--v2-border);
    border-radius: 6px;
    background: #ffffff;
    color: var(--v2-primary);
    font-family: inherit;
    font-size: 9.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}

.notif-read:hover {
    background: var(--v2-primary-soft);
    border-color: var(--v2-primary-line);
}

.pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px dashed var(--v2-border-soft);
    font-size: 10.5px;
    color: var(--v2-text-muted);
}

/* ---------------- 空状态 ---------------- */
.empty-state {
    padding: 34px 20px;
    text-align: center;
    border: 1px dashed var(--v2-border);
    border-radius: var(--v2-radius-card);
    background: #f8fafc;
}

.empty-icon {
    width: 38px;
    height: 38px;
    margin: 0 auto 10px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: var(--v2-primary-soft);
    color: var(--v2-primary);
}

.empty-icon .ico {
    width: 18px;
    height: 18px;
}

.empty-state strong {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--v2-text);
}

.empty-state p {
    margin: 0 0 12px;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--v2-text-muted);
}

.empty-state a {
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    border-radius: 8px;
    background: var(--v2-primary);
    color: #ffffff;
    font-size: 10.5px;
    font-weight: 600;
    text-decoration: none;
}

.empty-state a:hover {
    background: var(--v2-primary-hover);
}

/* ---------------- 响应式 ---------------- */
@media (max-width: 960px) {
    .profile-shell {
        grid-template-columns: 1fr;
    }

    .profile-sidebar {
        position: static;
    }

    .profile-nav {
        flex-direction: row;
        overflow-x: auto;
    }

    .profile-nav-item {
        width: auto;
        white-space: nowrap;
    }

    .nav-badge {
        margin-left: 2px;
    }

    .profile-logout {
        display: none;
    }
}

@media (max-width: 720px) {
    .profile-shell {
        padding: 16px 12px 28px;
    }

    .profile-panel {
        padding: 20px 16px 24px;
    }

    .panel-head {
        flex-direction: column;
    }

    .stat-grid,
    .overview-grid,
    .favorite-grid,
    .form-row {
        grid-template-columns: 1fr;
    }

    .progress-item {
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .progress-right {
        justify-content: space-between;
    }

    .progress-bar {
        flex: 1;
        width: auto;
    }

    .notify-actions {
        flex-wrap: wrap;
    }
}
```

### 7.3 布局原理说明

**为什么用 CSS Grid？**

```css
.profile-shell {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 20px;
}
```

- 第一列固定 250px，放导航；
- 第二列 `minmax(0, 1fr)`，占满剩余空间；
- `minmax(0, …)` 而不是 `1fr` 是为了防止长英文算法名把网格撑破（`min-width: auto` 的经典问题）。

**为什么侧栏 `position: sticky`？**

内容很长时，左侧导航跟随滚动，用户随时可以切换标签。`top: 20px` 留出与顶栏的呼吸空间。

**面板如何切换？**

HTML 里六个 `.profile-panel` 默认 `display: none`，只有 `.is-active` 显示。JS 只切换类名，不销毁 DOM，所以表单里已经填的内容不会丢。

**为什么不用 `hidden` 属性？**

`hidden` 容易被 CSS 的 `display: flex` 覆盖。用类名控制更可控，也方便加过渡动画。

### 7.4 图标策略

- 顶栏、首页已有的图标通过 `js/icons.js` 的 Sprite 使用，例如 `#i-home`、`#i-star`。
- 个人中心需要但公共图标库没有的（铃铛、盾牌、退出、垃圾桶），在本页顶部内联 `<symbol>`，前缀 `p-`，避免污染公共图标库。
- 所有 `<svg>` 都带 `class="ico"`，复用 `base.css` 里统一的 `stroke-width: 2`、`fill: none`，视觉一致。

### 7.5 先验证静态布局

此时 `profile.js` 还没写，页面应该：

1. 顶栏正常注入，右侧有登录态菜单；
2. 左侧头像卡、六个导航按钮、退出按钮排列正常；
3. 右侧只显示「概览」面板，其他面板隐藏；
4. 浏览器缩到 900px 以下，布局变为上下结构；
5. 控制台没有 404（`profile.css` 路径正确）。

确认布局没问题，再进入第八章写逻辑。

## 八、Step 4：实现 `profile.js`

### 8.1 先理解执行顺序

`profile.js` 在 `api.js`、`auth.js` 之后加载，因此可以直接使用：

| 全局能力 | 来源 | 用途 |
|---|---|---|
| `AlgoAPI.get/post/put/del` | `api.js` | 所有请求 |
| `isLoggedIn()` / `getUser()` | `auth.js` | 登录守卫、读取缓存用户 |
| `updateCachedUser(partial)` | 第六章新增 | 保存资料后同步顶栏 |
| `logoutAPI()` / `handleLogout()` | `auth.js` | 退出登录 |
| `showToast` | `profile.js` 自己注册 | 轻提示 |

`profile.js` 整体包在 IIFE 里，避免污染全局：

```js
(function () {
  'use strict';
  // ...
})();
```

### 8.2 完整代码

新建 `d:\啵啵\Trae\Project\Java\AlgoStep\js\profile.js`，整份复制下面的代码：

```js
/* ============================================================
 * AlgoStep v2.0 · profile.js
 * 个人中心：登录守卫、资料、密码、进度、收藏、通知
 * 依赖：api.js、auth.js
 * ============================================================ */
(function () {
    'use strict';

    /* ---------------- 常量 ---------------- */
    var TABS = ['overview', 'profile', 'security', 'progress', 'favorites', 'notifications'];

    var STATUS_LABEL = {
        UNSTARTED: '未开始',
        LEARNING: '学习中',
        MASTERED: '已掌握'
    };
    var STATUS_CLASS = {
        UNSTARTED: 'status-unstarted',
        LEARNING: 'status-learning',
        MASTERED: 'status-mastered'
    };
    var DIFFICULTY_LABEL = {
        beginner: '入门',
        basic: '基础',
        advanced: '进阶'
    };
    var CATEGORY_LABEL = {
        sort: '排序',
        dp: '动态规划',
        search: '搜索',
        graph: '图论'
    };
    var TYPE_LABEL = {
        SYSTEM: '系统通知',
        PROGRESS: '进度通知',
        ACHIEVEMENT: '成就通知'
    };

    /* ---------------- 集中状态 ---------------- */
    var state = {
        user: null,
        algorithms: [],
        algorithmMap: {},
        stats: null,
        progress: [],
        favorites: [],
        notifications: {
            list: [],
            total: 0,
            pageNum: 1,
            pageSize: 8,
            unreadCount: 0
        },
        progressFilter: 'ALL',
        notifyUnreadOnly: false,
        activeTab: 'overview'
    };

    var toastTimer = null;

    /* ============================================================
     * 工具函数
     * ============================================================ */

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function initialOf(text) {
        var value = String(text == null ? '' : text).trim();
        return value ? value.charAt(0).toUpperCase() : 'A';
    }

    function nameOf(item) {
        return item.algorithmNameZh || item.algorithmName || '未命名算法';
    }

    function formatTime(value) {
        if (!value) return '—';
        var text = String(value).replace('T', ' ');
        return text.length >= 16 ? text.slice(0, 16) : text;
    }

    function formatDuration(value) {
        var seconds = Math.max(0, Number(value) || 0);
        if (seconds < 60) return seconds + ' 秒';
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + ' 分钟';
        var hours = Math.floor(minutes / 60);
        var rest = minutes % 60;
        return hours + ' 小时' + (rest ? ' ' + rest + ' 分钟' : '');
    }

    function percentOf(progress) {
        var total = Number(progress.totalSteps) || 0;
        var current = Number(progress.stepIndex) || 0;
        if (total <= 0) return 0;
        return Math.max(0, Math.min(100, Math.round(current / total * 100)));
    }

    /**
     * 只允许 http/https/协议相对/站内相对/base64 图片
     * 阻止 javascript:、vbscript: 等危险协议
     */
    function safeImageUrl(raw) {
        var url = String(raw == null ? '' : raw).trim();
        if (!url) return '';
        if (/^(https?:\/\/|\/\/)/i.test(url)) return url;
        if (/^\.{0,2}\//.test(url)) return url;
        if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url)) return url;
        return '';
    }

    /**
     * 后端返回的 url 形如 /algorithms/sort/bubble-sort.html
     * profile.html 在根目录，因此转成 ./algorithms/...
     */
    function hrefOf(url) {
        var text = String(url == null ? '' : url).trim();
        if (!text) return '';
        if (/^(https?:)?\/\//i.test(text)) return text;
        return text.charAt(0) === '/' ? '.' + text : text;
    }

    function setBusy(button, busy, text) {
        if (!button) return;
        button.disabled = busy;
        button.textContent = text;
    }

    function toast(message) {
        var el = document.getElementById('profileToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'profileToast';
            el.className = 'toast';
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.remove('show');
        }, 2200);
    }

    // 让 AlgoAPI 的非 silent 错误也复用本页 Toast
    window.showToast = toast;

    function showAlert(id, message, type) {
        var el = $(id);
        if (!el) return;
        el.textContent = message;
        el.className = 'alert is-visible ' + (type === 'success' ? 'alert-success' : 'alert-error');
    }

    function hideAlert(id) {
        var el = $(id);
        if (!el) return;
        el.className = 'alert';
        el.textContent = '';
    }

    function emptyState(icon, title, desc, href, action) {
        return '' +
            '<div class="empty-state">' +
                '<div class="empty-icon"><svg class="ico"><use href="#' + icon + '"/></svg></div>' +
                '<strong>' + escapeHtml(title) + '</strong>' +
                '<p>' + escapeHtml(desc) + '</p>' +
                (href
                    ? '<a href="' + escapeHtml(href) + '">' + escapeHtml(action) + '</a>'
                    : '') +
            '</div>';
    }

    /* ============================================================
     * 头像与用户信息
     * ============================================================ */

    function avatarInner(user) {
        var display = (user && (user.nickname || user.username)) || 'A';
        var initial = escapeHtml(initialOf(display));
        var url = safeImageUrl(user && user.avatar);
        if (!url) {
            return '<span class="avatar-fallback">' + initial + '</span>';
        }
        return '' +
            '<span class="avatar-fallback">' + initial + '</span>' +
            '<img src="' + escapeHtml(url) + '" alt="" onerror="this.remove()">';
    }

    function renderAvatar(box, user) {
        if (!box) return;
        box.innerHTML = avatarInner(user);
    }

    function renderSidebar() {
        var user = state.user || (typeof getUser === 'function' ? getUser() : null) || {};
        renderAvatar($('sidebarAvatar'), user);
        $('sidebarName').textContent = user.nickname || user.username || '未登录';
        $('sidebarEmail').textContent = user.email || '—';
        $('sidebarRole').textContent = user.role || 'USER';
    }

    /**
     * 把服务端 UserVO 写回 localStorage，顶栏立即刷新
     */
    function cacheUser(user) {
        if (!user) return;
        var partial = {
            userId: user.id != null ? user.id : user.userId,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            avatar: user.avatar,
            email: user.email
        };
        if (typeof updateCachedUser === 'function') {
            updateCachedUser(partial);
        } else {
            localStorage.setItem('algostep_user', JSON.stringify(partial));
            if (typeof updateAuthUI === 'function') updateAuthUI();
        }
    }

    function fillProfileForm() {
        var user = state.user || {};
        $('inputUsername').value = user.username || '';
        $('inputEmail').value = user.email || '';
        $('inputNickname').value = user.nickname || '';
        $('inputAvatar').value = user.avatar || '';
        renderAvatar($('formAvatarPreview'), user);
    }

    function previewAvatar() {
        renderAvatar($('formAvatarPreview'), {
            nickname: $('inputNickname').value,
            username: state.user && state.user.username,
            avatar: $('inputAvatar').value
        });
    }

    /* ============================================================
     * Tab 切换
     * ============================================================ */

    function switchTab(tab, updateHash) {
        if (TABS.indexOf(tab) === -1) tab = 'overview';
        state.activeTab = tab;

        document.querySelectorAll('.profile-nav-item').forEach(function (item) {
            item.classList.toggle('is-active', item.getAttribute('data-tab') === tab);
        });
        document.querySelectorAll('.profile-panel').forEach(function (panel) {
            panel.classList.toggle('is-active', panel.getAttribute('data-panel') === tab);
        });

        if (updateHash !== false && location.hash !== '#' + tab) {
            history.replaceState(null, '', '#' + tab);
        }
    }

    function initTab() {
        var hash = String(location.hash || '').replace('#', '');
        switchTab(TABS.indexOf(hash) !== -1 ? hash : 'overview', false);
    }

    /* ============================================================
     * 数据加载
     * ============================================================ */

    function loadProfile() {
        return AlgoAPI.get('/user/profile', { silent: true, noLoading: true })
            .then(function (user) {
                state.user = user || {};
                cacheUser(state.user);
                renderSidebar();
                fillProfileForm();
            })
            .catch(function (err) {
                state.user = (typeof getUser === 'function' ? getUser() : null) || {};
                renderSidebar();
                fillProfileForm();
                toast((err && err.msg) || '个人信息加载失败');
            });
    }

    function loadAlgorithms() {
        if (state.algorithms.length) {
            return Promise.resolve(state.algorithms);
        }
        return AlgoAPI.get('/algorithms', { silent: true, noLoading: true })
            .then(function (list) {
                state.algorithms = Array.isArray(list) ? list : [];
                state.algorithms.forEach(function (item) {
                    if (item && item.id != null) {
                        state.algorithmMap[String(item.id)] = item;
                    }
                });
                return state.algorithms;
            })
            .catch(function () {
                return [];
            });
    }

    function loadStats() {
        return AlgoAPI.get('/progress/stats', { silent: true, noLoading: true })
            .then(function (stats) {
                state.stats = stats || {};
                renderStats();
                return state.stats;
            })
            .catch(function () {
                state.stats = {};
                renderStats();
                return state.stats;
            });
    }

    function loadProgress() {
        return AlgoAPI.get('/progress', { silent: true, noLoading: true })
            .then(function (list) {
                state.progress = Array.isArray(list) ? list : [];
                renderProgress();
                renderRecentProgress();
                return state.progress;
            })
            .catch(function () {
                state.progress = [];
                renderProgress();
                renderRecentProgress();
                return state.progress;
            });
    }

    function loadFavorites() {
        return AlgoAPI.get('/favorites', { silent: true, noLoading: true })
            .then(function (list) {
                state.favorites = Array.isArray(list) ? list : [];
                renderFavorites();
                renderRecentFavorites();
                return state.favorites;
            })
            .catch(function () {
                state.favorites = [];
                renderFavorites();
                renderRecentFavorites();
                return state.favorites;
            });
    }

    function loadOverview() {
        return Promise.all([
            loadAlgorithms(),
            loadStats(),
            loadProgress(),
            loadFavorites()
        ]).then(function () {
            renderStats();
            renderRecentProgress();
            renderRecentFavorites();
        });
    }

    function loadNotifications(page) {
        state.notifications.pageNum = Math.max(1, Number(page) || 1);

        var query = '?pageNum=' + state.notifications.pageNum +
            '&pageSize=' + state.notifications.pageSize +
            (state.notifyUnreadOnly ? '&unreadOnly=true' : '');

        return AlgoAPI.get('/notifications' + query, { silent: true, noLoading: true })
            .then(function (data) {
                var payload = data || {};
                state.notifications.list = Array.isArray(payload.list) ? payload.list : [];
                state.notifications.total = Number(payload.total) || 0;
                state.notifications.pageNum = Number(payload.pageNum) || state.notifications.pageNum;
                state.notifications.pageSize = Number(payload.pageSize) || state.notifications.pageSize;
                state.notifications.unreadCount = Number(payload.unreadCount) || 0;
                renderNotifications();
            })
            .catch(function (err) {
                state.notifications.list = [];
                state.notifications.total = 0;
                // 保留上一次的未读数，避免网络抖动把角标清空
                renderNotifications();
                if (!err || err.code !== 401) {
                    toast((err && err.msg) || '通知加载失败');
                }
            });
    }

    /* ============================================================
     * 渲染：统计与概览
     * ============================================================ */

    function renderStats() {
        var stats = state.stats || {};
        var total = Number(stats.total) || 0;
        var learning = Number(stats.learning) || 0;
        var mastered = Number(stats.mastered) || 0;
        var algorithmTotal = state.algorithms.length || total;
        var rate = algorithmTotal > 0 ? Math.round(mastered / algorithmTotal * 100) : 0;

        $('statTotal').textContent = total;
        $('statTotalFoot').textContent = '共 ' + algorithmTotal + ' 个算法';
        $('statLearning').textContent = learning;
        $('statMastered').textContent = mastered;
        $('statMasteredFoot').textContent = '完成率 ' + rate + '%';
        $('statTime').textContent = formatDuration(stats.totalStudyTime);
    }

    function urlOfProgress(progress) {
        if (progress.url) return hrefOf(progress.url);
        var algorithm = state.algorithmMap[String(progress.algorithmId)];
        return algorithm && algorithm.url ? hrefOf(algorithm.url) : '';
    }

    function renderRecentProgress() {
        var box = $('recentProgress');
        if (!box) return;

        var list = state.progress.slice(0, 3);
        if (!list.length) {
            box.innerHTML = emptyState(
                'i-clock',
                '还没有学习记录',
                '完成一次算法演示后，这里会出现最近学习。',
                './index.html',
                '去学习'
            );
            return;
        }

        box.innerHTML = list.map(function (item) {
            var url = urlOfProgress(item) || './index.html';
            var percent = percentOf(item);
            return '' +
                '<a class="mini-item" href="' + escapeHtml(url) + '">' +
                    '<span class="mini-icon">' + escapeHtml(initialOf(nameOf(item))) + '</span>' +
                    '<span class="mini-body">' +
                        '<strong>' + escapeHtml(nameOf(item)) + '</strong>' +
                        '<small>' + escapeHtml(STATUS_LABEL[item.status] || item.status || '未开始') +
                            ' · ' + percent + '%</small>' +
                    '</span>' +
                    '<span class="mini-arrow"><svg class="ico"><use href="#i-chevron-right"/></svg></span>' +
                '</a>';
        }).join('');
    }

    function renderRecentFavorites() {
        var box = $('recentFavorites');
        if (!box) return;

        var list = state.favorites.slice(0, 3);
        if (!list.length) {
            box.innerHTML = emptyState(
                'i-star',
                '还没有收藏',
                '在算法页收藏后，这里会显示最近收藏。',
                './index.html',
                '去逛逛'
            );
            return;
        }

        box.innerHTML = list.map(function (item) {
            var url = hrefOf(item.url) || './index.html';
            return '' +
                '<a class="mini-item" href="' + escapeHtml(url) + '">' +
                    '<span class="mini-icon">' + escapeHtml(initialOf(nameOf(item))) + '</span>' +
                    '<span class="mini-body">' +
                        '<strong>' + escapeHtml(nameOf(item)) + '</strong>' +
                        '<small>' + escapeHtml(DIFFICULTY_LABEL[item.difficulty] || '未分类') +
                            ' · ' + escapeHtml(CATEGORY_LABEL[item.category] || item.category || '') +
                        '</small>' +
                    '</span>' +
                    '<span class="mini-arrow"><svg class="ico"><use href="#i-chevron-right"/></svg></span>' +
                '</a>';
        }).join('');
    }

    /* ============================================================
     * 渲染：学习进度
     * ============================================================ */

    function progressRow(item) {
        var status = item.status || 'UNSTARTED';
        var percent = percentOf(item);
        var url = urlOfProgress(item);
        var diffClass = DIFFICULTY_LABEL[item.difficulty] ? item.difficulty : '';
        var statusClass = STATUS_CLASS[status] || 'status-unstarted';

        var link = url
            ? '<a class="item-link" href="' + escapeHtml(url) + '">继续学习</a>'
            : '<span class="item-link is-disabled">暂无入口</span>';

        return '' +
            '<article class="progress-item">' +
                '<div class="progress-info">' +
                    '<div class="item-title">' +
                        escapeHtml(nameOf(item)) +
                        '<span class="item-en">' + escapeHtml(item.algorithmName || '') + '</span>' +
                    '</div>' +
                    '<div class="item-meta">' +
                        '<span class="chip ' + diffClass + '">' +
                            escapeHtml(DIFFICULTY_LABEL[item.difficulty] || '未分类') +
                        '</span>' +
                        '<span class="chip ' + statusClass + '">' +
                            escapeHtml(STATUS_LABEL[status] || status) +
                        '</span>' +
                        '<span>' + escapeHtml(CATEGORY_LABEL[item.category] || item.category || '') + '</span>' +
                        '<span>更新于 ' + escapeHtml(formatTime(item.updateTime)) + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="progress-right">' +
                    '<div class="progress-bar"><span style="width:' + percent + '%"></span></div>' +
                    '<span class="progress-percent">' + percent + '%</span>' +
                    link +
                '</div>' +
            '</article>';
    }

    function renderProgress() {
        var box = $('progressList');
        if (!box) return;

        var list = state.progress.slice();
        if (state.progressFilter !== 'ALL') {
            list = list.filter(function (item) {
                return item.status === state.progressFilter;
            });
        }

        if (!list.length) {
            var filtered = state.progressFilter !== 'ALL';
            box.innerHTML = emptyState(
                'i-clock',
                filtered ? '当前筛选下没有记录' : '还没有学习进度',
                filtered
                    ? '切换到“全部”看看其他记录。'
                    : '去算法页体验一次，播放进度会自动保存。',
                filtered ? '' : './index.html',
                filtered ? '' : '去学习算法'
            );
            return;
        }

        box.innerHTML = list.map(progressRow).join('');
    }

    /* ============================================================
     * 渲染：收藏
     * ============================================================ */

    function favoriteCard(item) {
        var url = hrefOf(item.url) || './index.html';
        var diffClass = DIFFICULTY_LABEL[item.difficulty] ? item.difficulty : '';

        return '' +
            '<article class="favorite-card">' +
                '<div class="favorite-head">' +
                    '<div>' +
                        '<div class="item-title">' +
                            escapeHtml(nameOf(item)) +
                            '<span class="item-en">' + escapeHtml(item.algorithmName || '') + '</span>' +
                        '</div>' +
                        '<div class="item-meta">' +
                            '<span class="chip ' + diffClass + '">' +
                                escapeHtml(DIFFICULTY_LABEL[item.difficulty] || '未分类') +
                            '</span>' +
                            '<span>' + escapeHtml(CATEGORY_LABEL[item.category] || item.category || '') + '</span>' +
                            '<span>收藏于 ' + escapeHtml(formatTime(item.createTime)) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="favorite-actions">' +
                    '<a class="item-link" href="' + escapeHtml(url) + '">去学习</a>' +
                    '<button class="btn-icon" type="button" title="取消收藏" data-remove-fav="' +
                        escapeHtml(item.algorithmId) + '">' +
                        '<svg class="ico"><use href="#p-trash"/></svg>' +
                    '</button>' +
                '</div>' +
            '</article>';
    }

    function renderFavorites() {
        var box = $('favoriteList');
        if (!box) return;

        if (!state.favorites.length) {
            box.innerHTML = emptyState(
                'i-star',
                '收藏夹还是空的',
                '在算法页点击收藏，就能在这里快速找到它。',
                './index.html',
                '去发现算法'
            );
            return;
        }

        box.innerHTML = state.favorites.map(favoriteCard).join('');
    }

    function removeFavorite(algorithmId) {
        var target = state.favorites.filter(function (item) {
            return Number(item.algorithmId) === Number(algorithmId);
        })[0];
        if (!target) return;

        if (!window.confirm('确定取消收藏「' + nameOf(target) + '」吗？')) {
            return;
        }

        AlgoAPI.del('/favorites/' + algorithmId)
            .then(function () {
                state.favorites = state.favorites.filter(function (item) {
                    return Number(item.algorithmId) !== Number(algorithmId);
                });
                renderFavorites();
                renderRecentFavorites();
                toast('已取消收藏');
            })
            .catch(function (err) {
                toast((err && err.msg) || '取消收藏失败');
            });
    }

    /* ============================================================
     * 渲染：通知
     * ============================================================ */

    function notificationRow(item) {
        var read = Number(item.isRead) === 1;
        return '' +
            '<article class="notification-item ' + (read ? '' : 'unread') + '">' +
                '<span class="notif-dot"></span>' +
                '<div class="notif-body">' +
                    '<div class="notif-title">' + escapeHtml(item.title || '通知') + '</div>' +
                    '<div class="notif-content">' + escapeHtml(item.content || '') + '</div>' +
                    '<div class="notif-meta">' +
                        escapeHtml(TYPE_LABEL[item.type] || '系统通知') +
                        ' · ' + escapeHtml(formatTime(item.createTime)) +
                    '</div>' +
                '</div>' +
                (read
                    ? ''
                    : '<button class="notif-read" type="button" data-read-id="' +
                        escapeHtml(item.id) + '">标为已读</button>') +
            '</article>';
    }

    function renderNotifications() {
        var box = $('notificationList');
        if (!box) return;

        if (!state.notifications.list.length) {
            box.innerHTML = emptyState(
                'p-bell',
                state.notifyUnreadOnly ? '没有未读通知' : '暂无通知',
                state.notifyUnreadOnly
                    ? '取消“只看未读”即可查看全部消息。'
                    : '系统消息、学习提醒与成就通知会出现在这里。'
            );
        } else {
            box.innerHTML = state.notifications.list.map(notificationRow).join('');
        }

        renderPager();
        updateUnreadBadge(state.notifications.unreadCount);
    }

    function renderPager() {
        var pageSize = Number(state.notifications.pageSize) || 8;
        var total = Number(state.notifications.total) || 0;
        var pageNum = Number(state.notifications.pageNum) || 1;
        var totalPages = Math.max(1, Math.ceil(total / pageSize));

        $('pageInfo').textContent = '第 ' + pageNum + ' / ' + totalPages + ' 页';
        $('btnPrevPage').disabled = pageNum <= 1;
        $('btnNextPage').disabled = pageNum >= totalPages;
    }

    function updateUnreadBadge(count) {
        var value = Math.max(0, Number(count) || 0);
        var text = value > 99 ? '99+' : String(value);

        // 缓存给顶栏用，避免每个页面都请求一次未读数
        localStorage.setItem('algostep_unread', String(value));

        ['navNotifBadge', 'notifUnreadBadge', 'nav-unread-badge'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.textContent = text;
            el.classList.toggle('hidden', value <= 0);
        });
    }

    function markRead(id) {
        AlgoAPI.put('/notifications/' + id + '/read', {}, { silent: true })
            .then(function () {
                var target = state.notifications.list.filter(function (item) {
                    return Number(item.id) === Number(id);
                })[0];

                if (target && Number(target.isRead) !== 1) {
                    target.isRead = 1;
                    state.notifications.unreadCount = Math.max(
                        0,
                        state.notifications.unreadCount - 1
                    );
                }
                renderNotifications();
            })
            .catch(function (err) {
                toast((err && err.msg) || '标记失败');
            });
    }

    function markAllRead() {
        if (!state.notifications.unreadCount) {
            toast('没有未读通知');
            return;
        }

        var button = $('btnReadAll');
        setBusy(button, true, '处理中...');

        AlgoAPI.put('/notifications/read-all', {}, { silent: true })
            .then(function () {
                toast('已全部标为已读');
                return loadNotifications(state.notifications.pageNum);
            })
            .catch(function (err) {
                toast((err && err.msg) || '操作失败');
            })
            .finally(function () {
                setBusy(button, false, '全部已读');
            });
    }

    /* ============================================================
     * 表单：资料与密码
     * ============================================================ */

    function saveProfile(event) {
        event.preventDefault();
        hideAlert('profileAlert');

        var nickname = $('inputNickname').value.trim();
        var avatar = $('inputAvatar').value.trim();

        if (nickname.length > 50) {
            showAlert('profileAlert', '昵称不能超过 50 个字符', 'error');
            return;
        }
        if (avatar.length > 255) {
            showAlert('profileAlert', '头像地址不能超过 255 个字符', 'error');
            return;
        }
        if (avatar && !safeImageUrl(avatar)) {
            showAlert('profileAlert', '头像地址格式不正确，请填写 http/https 图片地址', 'error');
            return;
        }

        var button = $('btnSaveProfile');
        setBusy(button, true, '保存中...');

        AlgoAPI.put('/user/profile', {
            nickname: nickname,
            avatar: avatar
        }, { silent: true })
            .then(function (user) {
                state.user = user || {};
                cacheUser(state.user);
                renderSidebar();
                fillProfileForm();
                showAlert('profileAlert', '资料已保存', 'success');
                toast('资料已保存');
            })
            .catch(function (err) {
                showAlert('profileAlert', (err && err.msg) || '保存失败，请稍后重试', 'error');
            })
            .finally(function () {
                setBusy(button, false, '保存修改');
            });
    }

    function changePassword(event) {
        event.preventDefault();
        hideAlert('pwdAlert');

        var oldPassword = $('oldPassword').value;
        var newPassword = $('newPassword').value;
        var confirmPassword = $('confirmPassword').value;

        if (!oldPassword) {
            showAlert('pwdAlert', '请输入原密码', 'error');
            return;
        }
        if (newPassword.length < 6 || newPassword.length > 50) {
            showAlert('pwdAlert', '新密码长度需要在 6–50 位之间', 'error');
            return;
        }
        if (newPassword === oldPassword) {
            showAlert('pwdAlert', '新密码不能与原密码相同', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert('pwdAlert', '两次输入的新密码不一致', 'error');
            return;
        }

        var button = $('btnChangePassword');
        setBusy(button, true, '提交中...');

        AlgoAPI.put('/user/password', {
            oldPassword: oldPassword,
            newPassword: newPassword
        }, { silent: true })
            .then(function () {
                showAlert('pwdAlert', '密码修改成功，正在退出登录…', 'success');
                toast('密码修改成功，请重新登录');

                setTimeout(function () {
                    // logoutAPI 内部已兼容网络失败并 clearAuth
                    logoutAPI().then(function () {
                        location.replace(
                            './login.html?redirect=' + encodeURIComponent('./profile.html')
                        );
                    });
                }, 900);
            })
            .catch(function (err) {
                showAlert('pwdAlert', (err && err.msg) || '修改失败，请检查原密码', 'error');
                setBusy(button, false, '确认修改');
            });
    }

    /* ============================================================
     * 事件绑定与初始化
     * ============================================================ */

    function bindEvents() {
        document.querySelectorAll('.profile-nav-item').forEach(function (item) {
            item.addEventListener('click', function () {
                switchTab(item.getAttribute('data-tab'), true);
            });
        });

        document.querySelectorAll('[data-tab-link]').forEach(function (item) {
            item.addEventListener('click', function () {
                switchTab(item.getAttribute('data-tab-link'), true);
            });
        });

        window.addEventListener('hashchange', initTab);

        $('btnLogout').addEventListener('click', function () {
            if (typeof handleLogout === 'function') {
                handleLogout();
            }
        });

        $('profileForm').addEventListener('submit', saveProfile);
        $('btnResetProfile').addEventListener('click', fillProfileForm);
        $('inputAvatar').addEventListener('input', previewAvatar);
        $('inputNickname').addEventListener('input', previewAvatar);
        $('passwordForm').addEventListener('submit', changePassword);

        $('progressFilter').addEventListener('click', function (event) {
            var button = event.target.closest('[data-filter]');
            if (!button) return;

            state.progressFilter = button.getAttribute('data-filter');
            document.querySelectorAll('#progressFilter button').forEach(function (item) {
                item.classList.toggle('is-active', item === button);
            });
            renderProgress();
        });

        $('favoriteList').addEventListener('click', function (event) {
            var button = event.target.closest('[data-remove-fav]');
            if (!button) return;
            removeFavorite(Number(button.getAttribute('data-remove-fav')));
        });

        $('unreadOnly').addEventListener('change', function () {
            state.notifyUnreadOnly = this.checked;
            loadNotifications(1);
        });

        $('btnReadAll').addEventListener('click', markAllRead);

        $('btnPrevPage').addEventListener('click', function () {
            if (state.notifications.pageNum > 1) {
                loadNotifications(state.notifications.pageNum - 1);
            }
        });

        $('btnNextPage').addEventListener('click', function () {
            var totalPages = Math.max(
                1,
                Math.ceil(state.notifications.total / state.notifications.pageSize)
            );
            if (state.notifications.pageNum < totalPages) {
                loadNotifications(state.notifications.pageNum + 1);
            }
        });

        $('notificationList').addEventListener('click', function (event) {
            var button = event.target.closest('[data-read-id]');
            if (!button) return;
            markRead(Number(button.getAttribute('data-read-id')));
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        // 登录守卫：未登录跳登录页，并带回来路
        if (typeof isLoggedIn !== 'function' || !isLoggedIn()) {
            location.replace(
                './login.html?redirect=' + encodeURIComponent('./profile.html')
            );
            return;
        }

        bindEvents();
        initTab();
        renderSidebar();

        loadProfile();
        loadOverview();
        loadNotifications(1);
    });
})();
```

### 8.3 关键函数讲解

| 函数 | 作用 | 关键点 |
|---|---|---|
| `escapeHtml` | 转义 5 个 HTML 特殊字符 | 所有服务端文本拼 HTML 前必须调用 |
| `safeImageUrl` | 校验头像地址协议 | 拒绝 `javascript:`，允许 http/https/相对/base64 图片 |
| `hrefOf` | 把 `/algorithms/...` 转成 `./algorithms/...` | 个人中心在根目录，后端 URL 是站内绝对路径 |
| `percentOf` | 计算进度百分比 | `stepIndex / totalSteps`，限制 0–100 |
| `cacheUser` | 服务端用户信息写回 localStorage | 调 `updateCachedUser()` 让顶栏立即刷新 |
| `loadAlgorithms` | 拉算法字典并建 `id → 算法` 映射 | 作为 `ProgressVO.url` 缺失时的兜底 |
| `loadOverview` | 并行加载四份数据 | `Promise.all` 减少总等待时间 |
| `renderProgress` | 按筛选条件渲染进度列表 | 空状态区分“真的没有”和“筛选后没有” |
| `renderFavorites` | 渲染收藏卡片 | 使用事件委托绑定取消收藏 |
| `renderNotifications` | 渲染通知列表与分页 | 每次渲染同步未读角标 |
| `updateUnreadBadge` | 同步三处角标 + localStorage | 三处：侧栏、标题、顶栏下拉 |
| `markRead` | 单条已读 | 成功后本地递减未读数，不整页重载 |
| `markAllRead` | 全部已读 | 成功后重新拉当前页，保证分页总数正确 |
| `saveProfile` | 保存昵称/头像 | 前后端双重校验；成功后同步顶栏 |
| `changePassword` | 修改密码 | 成功后强制登出，规避旧 Token 仍有效的问题 |

#### 为什么请求都加 `silent: true` / `noLoading: true`？

- `silent: true`：不让 `api.js` 自动弹 Toast。个人中心希望把错误显示在表单旁的 `.alert` 里，位置更明确。
- `noLoading: true`：个人中心一进来会并发 6 个请求（资料、算法、统计、进度、收藏、通知），如果每个都触发全局 loading，页面会闪烁。
- 但 `removeFavorite`、`markAllRead` 这类用户主动操作没有加 `silent`，让 `api.js` 自动提示也可以；本实现仍统一用本地 `toast`，行为更可控。

#### 为什么进度百分比用 `stepIndex / totalSteps`？

假设 10 步的算法，用户看到第 5 步（下标 4），进度是 `4 / 10 = 40%`。看到最后一步（下标 9）是 90%，只有后端把状态改成 `MASTERED`。如果你希望最后一步显示 100%，可以在 `percentOf()` 里改成：

```js
if (current >= total - 1) return 100;
```

当前实现保留真实步数比例，掌握状态由后端判定，二者不混用。

#### 为什么 `cacheUser` 里要兼容 `user.id` 和 `user.userId`？

`UserVO` 的字段叫 `id`，而 `localStorage` 里的缓存字段叫 `userId`（登录接口 `LoginVO` 用的是 `userId`）。统一映射成 `userId`，避免顶栏或其他页面读不到。

#### 为什么通知已读不直接重新请求列表？

单条已读是高频小操作。本地把 `isRead` 改成 1、未读数减 1、重新渲染即可，响应更快。只有“全部已读”会影响分页总数，所以重新拉当前页。

#### 为什么改密后要 `location.replace` 而不是 `href`？

`replace` 不会在浏览器历史里留下个人中心页面，用户按后退不会回到一个 Token 已清空的页面。

### 8.4 数据流总结

```
用户操作
  ├─ 切换 Tab ──────────────→ 只切 DOM 类名，不发请求
  ├─ 保存资料 ── PUT ───────→ state.user 更新 → 本地缓存 → 侧栏/顶栏重绘
  ├─ 修改密码 ── PUT ───────→ 清空 Token → 跳登录页
  ├─ 取消收藏 ── DELETE ────→ state.favorites 过滤 → 收藏/概览重绘
  └─ 标记已读 ── PUT ───────→ 当前项 isRead=1 → 未读数-1 → 角标重绘
```

### 8.5 验收

1. 打开 `profile.html`，Network 面板能看到 6 个请求，全部 200。
2. 概览四个数字与后端 `/progress/stats` 一致。
3. 修改昵称为「算法小白」，保存后左侧卡、右上角同时变化。
4. 头像填一个不存在的地址，图片不显示，但首字母仍在。
5. 原密码输错，表单下方红条显示后端返回的「原密码不正确」。
6. 新密码两次不一致，前端直接拦截，不发请求。
7. 改密成功后回到登录页，使用新密码能登录。
8. 收藏页点垃圾桶，确认后卡片消失；刷新页面仍然消失。
9. 通知页点「标为已读」，红点消失、角标数字减 1。
10. 昵称输入 `<img src=x onerror=alert(1)>`，页面只显示文本，不执行脚本。

## 九、Step 5：补全学习进度数据链路（配套，推荐）

> 如果你只做个人中心，这一章可以暂时跳过；但那样进度页会一直是空的。要让「学习进度」真正有数据，需要算法页把进度上报给后端。

### 9.1 为什么进度页会空

个人中心只是“读”：

```
profile.html → GET /api/progress → learning_progress 表
```

但 12 个算法页目前只做本地演示，没有任何代码调用 `PUT /api/progress`。表里没有数据，个人中心自然读不到。

### 9.2 方案：事件驱动 + 一个共享脚本

不要在每个算法页复制一遍上报逻辑。正确做法是：

```
StepController.goTo(index)
        ↓ 派发自定义事件
document: algostep:step { index, total }
        ↓ 监听 + 防抖
js/algo-progress.js
        ↓ PUT /api/progress
learning_progress（按 user_id + algorithm_id 唯一）
        ↓
profile.html 读取并展示
```

优点：

- 算法页只加两行 `<script>`，不改业务代码；
- 上报逻辑集中在一个文件，方便统一节流、统计时长；
- 以后新增算法页，只要引入同一个脚本即可；
- 与个人中心完全解耦，互不依赖。

### 9.3 在 `StepController` 里派发事件

**文件**：`js/algo-core.js`，`StepController.prototype.goTo`（第 44–57 行）。

在 `onStep` 之后、`onFinish` 之前加一段：

```js
StepController.prototype.goTo = function (i) {
    if (!this.steps.length) return;
    var clamped = Math.max(-1, Math.min(this.steps.length - 1, i));
    if (clamped === this.index) return;
    this.index = clamped;

    if (this.index >= 0) {
        try { this.onStep(this.steps[this.index], this.index); }
        catch (e) { console.error('[StepController] onStep:', e); }
    }

    // 新增：把“当前步 / 总步数”广播给页面上的其他模块
    document.dispatchEvent(new CustomEvent('algostep:step', {
        detail: {
            index: this.index,
            total: this.steps.length
        }
    }));

    if (this.index >= this.steps.length - 1) {
        try { this.onFinish(); } catch (_) {}
    }
};
```

**原理**：

- `CustomEvent` 是浏览器原生的事件机制，任何脚本都可以 `document.addEventListener('algostep:step', ...)` 监听；
- `detail` 里带 `index` 和 `total`，监听者不需要知道 `StepController` 的实例在哪里；
- 使用事件而不是直接改每个算法页的 `onStep`，避免侵入业务逻辑。

### 9.4 新增 `js/algo-progress.js`

新建 `d:\啵啵\Trae\Project\Java\AlgoStep\js\algo-progress.js`：

```js
/* ============================================================
 * AlgoStep · 算法页学习进度上报
 * 用法：在算法页 </body> 前引入
 *   <script src="../../js/api.js"></script>
 *   <script src="../../js/algo-progress.js"></script>
 * 未登录时自动跳过
 * ============================================================ */
(function () {
    'use strict';

    if (!window.AlgoAPI) return;

    var TOKEN_KEY = 'algostep_token';

    var algorithmId = null;
    var totalSteps = 0;
    var maxStep = 0;
    var baseStudyTime = 0;
    var ready = false;

    var saveTimer = null;
    var activeSince = Date.now();
    var activeSeconds = 0;

    function loggedIn() {
        return !!localStorage.getItem(TOKEN_KEY);
    }

    /**
     * 用当前页面路径匹配 /api/algorithms 里的 url
     * 例如 /algorithms/sort/bubble-sort.html
     */
    function findAlgorithm() {
        return AlgoAPI.get('/algorithms', { silent: true, noLoading: true })
            .then(function (list) {
                var path = location.pathname;
                var matched = (list || []).filter(function (item) {
                    if (!item || !item.url) return false;
                    return path.slice(-item.url.length) === item.url;
                })[0];

                if (!matched) return null;

                algorithmId = matched.id;

                return AlgoAPI.get('/progress/' + algorithmId, {
                    silent: true,
                    noLoading: true
                }).then(function (progress) {
                    baseStudyTime = Number(progress && progress.studyTime) || 0;
                    maxStep = Math.max(0, Number(progress && progress.stepIndex) || 0);
                    totalSteps = Math.max(0, Number(progress && progress.totalSteps) || 0);
                    ready = true;
                });
            })
            .catch(function () {
                // 拉不到已有进度就不上报，避免把累计时长覆盖成 0
                ready = false;
            });
    }

    function currentSessionSeconds() {
        var running = document.hidden ? 0 : (Date.now() - activeSince) / 1000;
        return Math.max(0, Math.round(activeSeconds + running));
    }

    /**
     * 完成哨兵：看到最后一步时上报 totalSteps
     * - 旧后端条件 stepIndex >= totalSteps 成立
     * - 修正后的条件 stepIndex >= totalSteps - 1 也成立
     */
    function normalizedStep() {
        if (totalSteps > 0 && maxStep >= totalSteps - 1) {
            return totalSteps;
        }
        return maxStep;
    }

    function buildPayload() {
        return {
            algorithmId: algorithmId,
            stepIndex: normalizedStep(),
            totalSteps: totalSteps,
            studyTime: baseStudyTime + currentSessionSeconds()
        };
    }

    /**
     * 页面隐藏/关闭时用 keepalive，尽量把最后一次进度送出去
     * 注意：跨域时自定义 Authorization 头仍可能触发预检失败，这里是尽力而为
     */
    function saveWithKeepalive() {
        if (!ready || !algorithmId) return;

        var token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            fetch(AlgoAPI.API_BASE + '/progress', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(buildPayload()),
                keepalive: true
            }).catch(function () {});
        } catch (e) {
            // 忽略：页面正在卸载
        }
    }

    function save() {
        if (!ready || !algorithmId) return;

        AlgoAPI.put('/progress', buildPayload(), {
            silent: true,
            noLoading: true
        }).catch(function () {});
    }

    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 1200);
    }

    // 步骤变化 → 防抖保存
    document.addEventListener('algostep:step', function (event) {
        if (!loggedIn()) return;

        var detail = event.detail || {};

        if (detail.total) {
            totalSteps = detail.total;
        }
        if (typeof detail.index === 'number' && detail.index >= 0) {
            maxStep = Math.max(maxStep, detail.index);
        }

        scheduleSave();
    });

    // 切到后台：停止计时并保存
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            activeSeconds += (Date.now() - activeSince) / 1000;
            activeSince = Date.now();
            saveWithKeepalive();
        } else {
            activeSince = Date.now();
        }
    });

    // 关闭/刷新页面：尽力保存
    window.addEventListener('pagehide', saveWithKeepalive);

    if (loggedIn()) {
        findAlgorithm();
    }
})();
```

### 9.5 在 13 个算法页引入

在页面底部、页面自己的 `<script>` 之后、`</body>` 之前加：

```html
<script src="../../js/api.js"></script>
<script src="../../js/algo-progress.js"></script>
```

需要引入的页面：

| 目录 | 页面 |
|---|---|
| `algorithms/sort/` | `bubble-sort.html`、`selection-sort.html`、`insertion-sort.html`、`quick-sort.html` |
| `algorithms/dp/` | `climb-stairs.html`、`0-1knapsack.html`、`complete-knapsack.html`、`lis.html`、`lcs.html` |
| `algorithms/search/` | `binary-search.html`、`dfs.html`、`bfs.html` |
| `algorithms/` | `template.html`（模板页路径是 `../js/...`） |

> 注意：`template.html` 在 `algorithms/` 根目录，相对路径是 `../js/api.js`，不要写成 `../../`。

### 9.6 关键设计说明

#### 为什么要防抖 1200ms？

用户可能连续点「下一步」十几次。如果每次 `goTo` 都发请求，会产生大量重复写入。防抖的意思是“最后一次操作后 1.2 秒才发请求”，既保证最终一致，又减少请求量。

#### 为什么用 `maxStep` 而不是当前 `index`？

用户可能后退回看。如果上报当前 `index`，进度会从第 8 步退回第 3 步，体验很差。`maxStep` 记录“看到过的最远一步”，只增不减。

#### 为什么学习时长要 `baseStudyTime + 本次会话`？

后端 `learning_progress.study_time` 是覆盖式更新，不是累加。如果每次只传“本次会话秒数”，刷新页面后历史时长会被覆盖成很小的值。所以：

1. 进入页面先 `GET /progress/{id}` 拿到历史 `studyTime`；
2. 每次上报 `历史 + 本次会话`；
3. 下次进入页面，历史已经包含上一次的累计。

#### 为什么用 `keepalive`？

页面关闭时普通 `fetch` 可能被浏览器中断。`keepalive: true` 允许请求在页面卸载后继续完成一小段时间，适合“最后一把保存”。

#### 为什么未登录要跳过？

未登录请求会 401，`api.js` 可能触发刷新/跳登录，影响算法页体验。直接判断 `localStorage` 有没有 Token，没有就完全不上报。

#### 为什么不做“自动恢复到上次步骤”？

`StepController` 实例是算法页内部的局部变量，个人中心/上报脚本拿不到。要实现恢复，需要算法页暴露实例或增加 `algostep:restore` 事件监听。建议作为下一阶段优化，不影响个人中心主线。

### 9.7 验收

1. 登录后打开 `bubble-sort.html`，点「下一步」几步。
2. Network 里出现 `PUT /api/progress`，请求体包含 `algorithmId`、`stepIndex`、`totalSteps`、`studyTime`。
3. 打开个人中心，进度页出现该算法，百分比与步数一致。
4. 看到最后一步，状态变为「已掌握」。
5. 关闭页面再打开算法页，重新播放几步，`studyTime` 在原有基础上增加，而不是归零。
6. 未登录打开算法页，Network 里没有 `/progress` 请求。

---

## 十、测试与联调

### 10.1 启动方式

**方式 A：后端同时托管前端（推荐）**

```powershell
cd d:\啵啵\Trae\Project\Java\AlgoStep\algostep-backend
mvn spring-boot:run
```

然后访问：

```
http://localhost:8080/index.html
http://localhost:8080/profile.html
http://localhost:8080/doc.html
```

后端 `WebConfig` 会把前端根目录注册为静态资源目录，`profile.html` 放在项目根目录即可访问。

**方式 B：前端静态服务器 + 后端 8080**

例如 VS Code Live Server 跑在 `http://127.0.0.1:5500`。`api.js` 在本地开发时会指向 `http://localhost:8080/api`，需要确认后端 CORS 允许该来源。

### 10.2 造测试数据

#### 10.2.1 通过 Knife4j 造进度和收藏

1. 登录拿 Token；
2. Authorize 填 `Bearer <token>`；
3. 调 `PUT /api/progress`：

```json
{
  "algorithmId": 1,
  "stepIndex": 6,
  "totalSteps": 12,
  "studyTime": 300
}
```

4. 调 `POST /api/favorites/1` 收藏冒泡排序；
5. 再调 `POST /api/favorites/4` 收藏快速排序。

#### 10.2.2 通过 H2 控制台造通知

地址：`http://localhost:8080/h2-console`

连接信息（来自 `application-h2.yml`）：

```
JDBC URL: jdbc:h2:mem:algostep;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
User Name: sa
Password: （留空）
```

先查用户 id：

```sql
SELECT id, username, nickname FROM sys_user;
```

再插入通知（把 `1` 换成你的用户 id）：

```sql
INSERT INTO notification (user_id, type, title, content, is_read)
VALUES (1, 'SYSTEM', '欢迎来到 AlgoStep', '个人中心已上线，完善资料后开始你的算法之旅。', 0);

INSERT INTO notification (user_id, type, title, content, is_read)
VALUES (1, 'PROGRESS', '继续学习快速排序', '你已经看到第 6 步，再坚持一下就能掌握。', 0);

INSERT INTO notification (user_id, type, title, content, is_read)
VALUES (1, 'ACHIEVEMENT', '解锁成就：初见算法', '完成第一个算法演示，获得“初见算法”徽章。', 1);
```

> H2 是内存数据库，重启后端后数据会清空，需要重新注册/造数。生产环境用 MySQL 的 `init.sql`。

### 10.3 手工测试用例

| # | 场景 | 操作 | 预期 |
|---|---|---|---|
| 1 | 未登录访问 | 直接打开 `/profile.html` | 跳到 `/login.html?redirect=./profile.html` |
| 2 | 登录回跳 | 在登录页输入正确账号 | 回到 `profile.html`，不是首页 |
| 3 | 已登录访问登录页 | 登录状态下打开 `/login.html` | 自动跳回 `redirect` 或首页 |
| 4 | 概览统计 | 登录后进入概览 | 四个数字与接口一致 |
| 5 | 最近学习 | 有进度数据 | 最多显示 3 条，可点击跳转 |
| 6 | 最近收藏 | 有收藏数据 | 最多显示 3 条，可点击跳转 |
| 7 | 修改昵称 | 改成「算法小白」并保存 | 左侧、顶栏、刷新后都变化 |
| 8 | 昵称超长 | 输入 51 个字符 | 前端提示，不发请求 |
| 9 | 头像地址非法 | 输入 `javascript:alert(1)` | 前端拦截，提示格式错误 |
| 10 | 头像地址 404 | 输入不存在的 https 图片 | 显示首字母兜底，不破图 |
| 11 | 原密码错误 | 原密码乱填 | 红条显示「原密码不正确」 |
| 12 | 新密码过短 | 输入 5 位 | 前端提示 6–50 位 |
| 13 | 两次密码不一致 | 新密码与确认不同 | 前端提示不一致 |
| 14 | 改密成功 | 正确原密码 + 合法新密码 | 提示成功 → 退出登录 → 新密码可登录 |
| 15 | 进度筛选 | 切「学习中 / 已掌握」 | 列表按状态过滤 |
| 16 | 进度为空 | 新账号无进度 | 显示空状态和「去学习算法」 |
| 17 | 取消收藏 | 点垃圾桶 → 确认 | 卡片消失，刷新后仍消失 |
| 18 | 取消收藏取消 | 点垃圾桶 → 取消 | 卡片保留，不发请求 |
| 19 | 通知未读 | 有未读通知 | 红点、角标、下拉角标都显示 |
| 20 | 单条已读 | 点「标为已读」 | 红点消失，角标 -1 |
| 21 | 全部已读 | 点「全部已读」 | 当前页全部变已读，角标 0 |
| 22 | 只看未读 | 勾选复选框 | 只显示未读，分页重置到第 1 页 |
| 23 | 分页 | 通知超过 8 条 | 上一页/下一页可用，页码正确 |
| 24 | XSS 昵称 | 昵称填 `<img src=x onerror=alert(1)>` | 只显示文本，无弹窗 |
| 25 | Token 过期 | 手动改坏 `algostep_token` 后刷新 | `api.js` 尝试刷新，失败后回登录页 |
| 26 | 后端未启动 | 关闭后端后打开个人中心 | 页面不白屏，有错误提示/空状态 |
| 27 | 手机宽度 | 浏览器缩到 375px | 单列布局，导航可横向滚动 |
| 28 | 刷新保持 Tab | 在 `#favorites` 刷新 | 仍停留在收藏面板 |

### 10.4 常见问题排查

| 现象 | 可能原因 | 处理 |
|---|---|---|
| `/profile.html` 404 | 文件没放在前端根目录；静态资源根目录探测失败 | 确认文件在 `AlgoStep/profile.html`；用后端启动访问 8080 |
| 页面样式全无 | `profile.css` 路径错 | 根目录页面用 `./css/profile.css` |
| `AlgoAPI is not defined` | 脚本顺序错 | 必须是 `api.js` → `auth.js` → `profile.js` |
| `isLoggedIn is not defined` | 没引入 `auth.js` | 补上 `<script src="./js/auth.js"></script>` |
| 所有请求 401 | Token 缺失/过期 | 重新登录；检查 `localStorage.algostep_token` |
| 请求被 CORS 拦截 | 前端来源不在后端白名单 | 在 `SecurityConfig`/CORS 配置中加入该来源并重启 |
| 进度页一直空 | 算法页没有上报 | 做第九章；用 Knife4j 手动 `PUT /api/progress` 验证 |
| 通知页一直空 | 没有通知数据 | 用 H2 控制台插入测试通知 |
| 收藏页一直空 | 没有收藏数据 | 用 Knife4j 调 `POST /api/favorites/1` |
| 头像不显示 | 图片是 http，页面是 https（混合内容） | 换成 https 图片或相对路径 |
| 保存资料后顶栏没变 | 没加 `updateCachedUser` 或脚本顺序错 | 检查第六章和 `cacheUser` |
| 登录后没回个人中心 | `login.html` 没应用 redirect 补丁 | 检查 `getSafeRedirect()` 和登录成功跳转 |
| 改密后旧 Token 还能用 | JWT 无状态，后端未吊销 | 已知问题，见 5.4；生产加 Token 版本号/Redis |
| 日期显示成数组 | 后端 Jackson 未按字符串序列化 | 在 `formatTime` 里兼容数组，或统一配置日期格式 |
| `.finally is not a function` | 浏览器过旧 | 用 `.then(...).catch(...)` 替代，或引入 polyfill |
| 通知角标不显示 | `auth.js` 未更新下拉菜单 | 确认存在 `nav-unread-badge` 或 `navNotifBadge` |
| 进度百分比不动 | `totalSteps` 为 0 | 检查 `algostep:step` 事件是否派发、`total` 是否有值 |
| 学习时长归零 | `baseStudyTime` 没取到就上报 | 确认 `GET /progress/{id}` 成功后才 `ready = true` |

### 10.5 联调时看什么

打开 DevTools：

1. **Network**：每个请求的 `Authorization` 是否有值；响应 `code` 是否 200；失败时看 `msg`。
2. **Application → Local Storage**：`algostep_token`、`algostep_user`、`algostep_unread` 是否存在。
3. **Console**：有没有 `AlgoAPI is not defined`、`Cannot read properties of null`。
4. **Elements**：`.profile-panel.is-active` 是否只有当前面板。
5. **Lighthouse/设备模拟**：375px、768px、1440px 三档布局。

---

## 十一、上线前检查与后续演进

### 11.1 安全清单

- [ ] 所有服务端文本都经过 `escapeHtml`，没有裸 `innerHTML` 拼接用户输入。
- [ ] `?redirect=` 只允许站内 `.html`，拒绝 `http://`、`//`、`javascript:`。
- [ ] 请求体不包含 `userId`，越权由后端 `UserContext` 保证。
- [ ] 密码输入框使用 `autocomplete="current-password"` / `"new-password"`。
- [ ] 改密成功后清空 Token 并重新登录。
- [ ] 不在前端日志、URL、localStorage 中记录密码。
- [ ] 头像 URL 只允许安全协议。
- [ ] 后端 CORS 白名单没有使用 `*`。
- [ ] JWT 密钥来自环境变量，不在仓库硬编码。
- [ ] 登录接口有失败次数限制（项目已有 `LoginAttemptGuard`）。

### 11.2 性能清单

- [ ] 概览页使用 `Promise.all` 并行加载。
- [ ] 后台请求使用 `noLoading`，避免全局 loading 闪烁。
- [ ] 算法字典只拉一次，后续复用 `state.algorithmMap`。
- [ ] 进度上报防抖 1.2 秒，避免连续点击打爆接口。
- [ ] 收藏/通知使用事件委托，不为每个按钮单独绑定。
- [ ] 通知分页每页 8 条，避免一次性渲染过多 DOM。
- [ ] 昵称、通知内容等长文本有 `word-break`，不会撑破布局。

### 11.3 可选进阶

#### A. 头像文件上传

当前只支持 URL。要做上传，至少需要：

1. 后端新增 `POST /api/user/avatar`，参数 `MultipartFile file`；
2. 校验 MIME 与大小（例如 ≤ 2MB，只允许 png/jpg/webp）；
3. 用 UUID 重命名，存到可配置目录（不要存进源码目录）；
4. 配置 `WebMvcConfigurer` 把 `/uploads/**` 映射到该目录；
5. 返回可访问 URL，前端保存到 `avatar` 字段；
6. `application.yml` 配置 `spring.servlet.multipart.max-file-size`。

安全要点：校验扩展名 + MIME + 文件头；不要信任原始文件名；禁止上传可执行脚本；生产环境建议使用对象存储。

#### B. 通知的创建

当前只读取通知，没有创建入口。可以在以下时机写入 `notification` 表：

- 收藏成功：`FAVORITE` 类型；
- 进度达到 `MASTERED`：`ACHIEVEMENT` 类型；
- 系统公告：后台手动插入。

推荐用 Spring 事件 + `@TransactionalEventListener`，避免业务代码里到处 `notificationService.insert()`。

#### C. 服务端分页

当前 `/api/favorites`、`/api/progress` 返回全量列表。算法数量少时没问题；数据量大时改成：

```
GET /api/favorites?pageNum=1&pageSize=10
GET /api/progress?pageNum=1&pageSize=10&status=LEARNING
```

返回结构复用通知的 `{ list, total, pageNum, pageSize }`。

#### D. Token 吊销

第十一章面试点之一。生产级做法：

- 用户表加 `token_version`；
- JWT payload 加 `ver`；
- 改密/登出时 `token_version + 1`；
- `JwtAuthenticationFilter` 校验 `ver` 与当前用户版本一致；
- 版本号放 Redis，避免每请求查库。

### 11.4 部署清单（Surge 静态站）

项目前端是独立部署到 Surge 的，发布目录只复制白名单文件。新增个人中心后，必须把以下文件加入发布清单：

```
profile.html
css/profile.css
js/profile.js
```

以及本次修改过的：

```
js/auth.js
login.html
css/base.css
```

如果做了第九章，还要加：

```
js/algo-progress.js
js/algo-core.js
```

算法页本身也要重新发布（因为加了两个 `<script>`）。

如果前端部署在 Surge、后端部署在另一台服务器，`api.js` 默认会请求 `https://algo-step.surge.sh/api`，这是没有后端的。需要在引入 `api.js` 之前显式指定后端地址：

```html
<script>
  window.ALGOSTEP_API_BASE = 'https://your-backend-domain.com/api';
</script>
<script src="./js/api.js"></script>
```

同时把 `https://algo-step.surge.sh` 加入后端 CORS 白名单，并确认 HTTPS 页面不要请求 HTTP 接口（混合内容会被浏览器拦截）。

> 绝对不要在项目根目录直接执行 `surge .`。必须构建单独的 `dist/` 目录，只复制前端白名单文件，避免后端源码、配置、Git 历史被公开访问。

### 11.5 面试可讲点

做完这个功能，你可以围绕以下问题展开：

1. **JWT 无状态带来的改密问题**：为什么改密后旧 Token 还能用？Token 版本号/Redis 黑名单怎么设计？
2. **ThreadLocal 用户上下文**：为什么不在请求里传 `userId`？Filter 里 `set` 之后为什么必须 `clear`？
3. **统一响应与异常**：`Result` + `BusinessException` + `GlobalExceptionHandler` 如何减少 Controller 重复代码？
4. **前端请求层**：401 自动刷新、并发刷新去重、请求重放是怎么做的？
5. **XSS 与开放重定向**：为什么昵称要转义？`?redirect=` 为什么不能直接跳？
6. **幂等与唯一索引**：收藏表 `uk_fav_user_algo` 如何防止重复收藏？
7. **性能优化**：`Promise.all`、防抖、事件委托、分页、缓存字典。
8. **数据一致性**：进度上报覆盖式更新如何避免学习时长归零？为什么用 `base + session`？

---

## 附录 A：接口速查

### A.1 请求头

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### A.2 PowerShell 调试示例

```powershell
# 1. 登录
$login = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8080/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"username":"demo","password":"123456"}'

$token = $login.data.token

# 2. 当前用户
Invoke-RestMethod -Uri "http://localhost:8080/api/user/profile" `
  -Headers @{ Authorization = "Bearer $token" }

# 3. 修改昵称
Invoke-RestMethod -Method Put `
  -Uri "http://localhost:8080/api/user/profile" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"nickname":"算法小白","avatar":""}'

# 4. 修改密码
Invoke-RestMethod -Method Put `
  -Uri "http://localhost:8080/api/user/password" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"oldPassword":"123456","newPassword":"654321"}'

# 5. 学习进度
Invoke-RestMethod -Uri "http://localhost:8080/api/progress" `
  -Headers @{ Authorization = "Bearer $token" }

# 6. 收藏
Invoke-RestMethod -Uri "http://localhost:8080/api/favorites" `
  -Headers @{ Authorization = "Bearer $token" }

# 7. 通知
Invoke-RestMethod -Uri "http://localhost:8080/api/notifications?pageNum=1&pageSize=8" `
  -Headers @{ Authorization = "Bearer $token" }
```

### A.3 错误码排查

后端统一返回：

```json
{ "code": 40001, "msg": "用户名或密码错误" }
```

前端处理原则：

```js
.catch(function (err) {
    // err.code 业务码，err.msg 用户可读提示
    showAlert('profileAlert', (err && err.msg) || '操作失败', 'error');
});
```

不要用 `err.message`，那是 JS `Error` 的字段，不是后端响应的字段。

---

## 附录 B：文件变更清单

| 文件 | 操作 | 关键内容 |
|---|---|---|
| `profile.html` | 新增 | 左侧导航 + 六个面板 |
| `css/profile.css` | 新增 | 个人中心全部样式 + 响应式 |
| `js/profile.js` | 新增 | 登录守卫、加载、渲染、表单、分页 |
| `js/auth.js` | 修改 | 下拉菜单、`updateCachedUser`、头像图片、未读缓存 |
| `login.html` | 修改 | `?redirect=` 安全回跳 |
| `css/base.css` | 修改 | 头像图片、下拉 hover、未读角标 |
| `js/algo-core.js` | 修改（可选） | 派发 `algostep:step` |
| `js/algo-progress.js` | 新增（可选） | 算法页进度上报 |
| `algorithms/**/*.html` | 修改（可选） | 引入 `api.js` + `algo-progress.js` |
| `ProgressVO.java` | 修改（可选） | 增加 `url` |
| `ProgressServiceImpl.java` | 修改（可选） | 补 `url`、修正 `MASTERED` 判定 |
| `UserServiceImpl.java` | 修改（可选） | 支持清空头像 |

---

## 附录 C：术语表

| 术语 | 解释 |
|---|---|
| JWT | JSON Web Token，服务端签名后交给客户端保存，请求时放在 `Authorization` 头 |
| Access Token | 短期访问令牌，本项目 2 小时 |
| Refresh Token | 刷新令牌，用于 Access Token 过期后换新，本项目 7 天 |
| ThreadLocal | 线程本地变量，`UserContext` 用它保存当前请求的用户，请求结束必须清理 |
| DTO | Data Transfer Object，接收前端入参 |
| VO | View Object，返回给前端展示的数据 |
| 越权 | 用户 A 通过修改参数访问用户 B 的数据；本项目后端从 Token 取用户，天然避免 |
| XSS | 跨站脚本，把用户输入当 HTML 执行；通过 `escapeHtml` 防御 |
| 开放重定向 | 登录后跳到攻击者指定的外部站点；通过 `redirect` 白名单防御 |
| 幂等 | 同一个操作执行多次，结果一致；收藏唯一索引是典型例子 |
| 防抖 | 连续触发时只执行最后一次，用于进度上报 |
| keepalive | `fetch` 选项，允许请求在页面卸载后继续完成 |
| 覆盖式更新 | 后端用新值直接覆盖旧值，不是累加；所以学习时长要传累计值 |

---

## 结语

建议你按这个顺序落地：

1. 先做后端三个小改造，用 Knife4j 验证；
2. 再改 `auth.js` 和 `login.html`，确保入口和回跳可用；
3. 然后静态搭 `profile.html` + `profile.css`，先看布局；
4. 接着写 `profile.js`，从「资料 → 密码 → 进度 → 收藏 → 通知」逐个函数验证；
5. 最后做第九章的进度上报，让数据真正流动起来；
6. 按第十章用例全量回归，再按第十一章清单发布。

每完成一步就提交一次 Git，提交信息写清楚「做了什么、为什么」，后续排查会轻松很多。



