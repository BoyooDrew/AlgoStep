# AlgoStep 项目手册

> 面向 CSP-J/S 考生的算法可视化教学工具
> 前后端全栈项目 · Spring Boot 3 + HTML/CSS/JS

---

## 一、项目简介

AlgoStep 是一个算法可视化学习平台，通过**分步动画演示**帮助初学者理解排序、动态规划、搜索等核心算法的运行过程。前端提供交互式可视化页面，后端提供用户系统、学习进度跟踪、收藏夹等功能。

### 目标用户
- 准备 CSP-J/S（NOIP 初赛）的考生
- 算法初学者
- 需要复习算法原理的开发者

### 核心价值
- **可视化**：每个算法拆解为可单步执行的动画过程
- **可交互**：支持自定义输入数据、调节速度
- **有追踪**：登录后记录学习进度、掌握状态
- **低门槛**：纯前端可直接访问，无需安装

---

## 二、技术栈

### 前端
| 技术 | 说明 |
|---|---|
| HTML5 + CSS3 | 页面结构与样式 |
| JavaScript (ES6+) | 交互逻辑与动画 |
| Canvas / DOM | 算法可视化渲染 |

### 后端
| 技术 | 版本 | 说明 |
|---|---|---|
| Java | 17 (LTS) | 编程语言 |
| Spring Boot | 3.2.5 | 应用框架 |
| Spring Security | 6.2 | 安全认证 |
| MyBatis-Plus | 3.5.5 | ORM 框架 |
| MySQL | 8.0 | 关系型数据库 |
| JWT (jjwt) | 0.12.5 | 无状态认证 |
| Knife4j | 4.4.0 | API 文档 |
| Maven | 3.9.9 | 构建工具 |

### 待接入
| 技术 | 说明 | 计划 |
|---|---|---|
| Redis 7 | 缓存、Token 管理、限流 | Phase 2 |
| Kafka 3.6 | 异步进度写入、通知推送 | Phase 2 |
| Docker | 容器化部署 | Phase 2 |

---

## 三、项目结构

```
AlgoStep/                              ← 项目根目录 (Git 仓库)
├── docs/                              ← 项目手册（所有文档）
│   ├── AlgoStep项目手册.md             ← 本文件（总纲）
│   ├── AlgoStep-项目参考文档.md         ← 前端技术参考
│   ├── AlgoStep-开发任务与目标.md        ← 分阶段开发计划
│   └── AlgoStep后端开发规划.md          ← 后端架构与文件清单
│
├── index.html                          ← 前端首页
├── about.html                          ← 关于页
├── algorithms/                         ← 算法可视化页面
│   ├── sort/                           ← 排序算法
│   │   ├── bubble-sort.html
│   │   ├── selection-sort.html
│   │   ├── insertion-sort.html
│   │   └── quick-sort.html
│   ├── dp/                             ← 动态规划
│   │   ├── climb-stairs.html
│   │   ├── 0-1knapsack.html
│   │   ├── complete-knapsack.html
│   │   ├── lis.html
│   │   └── lcs.html
│   └── search/                        ← 搜索算法
│       ├── binary-search.html
│       ├── dfs.html
│       └── bfs.html
├── css/                                ← 样式文件
├── js/                                 ← 脚本文件
├── README.md                           ← 前端说明
│
└── algostep-backend/                   ← 后端项目 (Spring Boot)
    ├── pom.xml                         ← Maven 依赖
    ├── docker-compose.yml              ← 中间件编排（备用）
    ├── .gitignore
    ├── .env.example
    ├── src/main/java/com/algostep/
    │   ├── AlgoStepApplication.java   ← 启动类
    │   ├── common/                     ← 公共层
    │   │   ├── result/                 ← 统一响应 (Result, ResultCode)
    │   │   ├── exception/              ← 异常体系 (BusinessException, GlobalExceptionHandler)
    │   │   ├── constant/               ← 常量 (Security, Redis, Kafka)
    │   │   ├── enums/                  ← 枚举 (LearningStatus, NotificationType)
    │   │   └── utils/                  ← 工具 (JwtUtils, PasswordUtils, UserContext)
    │   ├── config/                     ← 配置层
    │   │   ├── SecurityConfig.java    ← Spring Security 过滤器链
    │   │   ├── CorsConfig.java         ← 跨域配置
    │   │   ├── MyBatisPlusConfig.java  ← 分页 + 自动填充
    │   │   └── Knife4jConfig.java      ← API 文档
    │   ├── security/                   ← 安全层
    │   │   ├── JwtAuthenticationFilter.java      ← JWT 认证过滤器
    │   │   ├── JwtAuthenticationEntryPoint.java  ← 401 响应
    │   │   ├── JwtAccessDeniedHandler.java       ← 403 响应
    │   │   └── UserDetailsServiceImpl.java       ← 用户加载
    │   └── module/                     ← 业务模块
    │       ├── auth/                   ← 认证（注册/登录/登出）
    │       ├── user/                   ← 用户信息
    │       ├── algorithm/              ← 算法信息
    │       ├── progress/               ← 学习进度
    │       ├── favorite/               ← 收藏
    │       └── notification/           ← 通知
    └── src/main/resources/
        ├── application.yml             ← 主配置
        ├── application-dev.yml          ← 开发环境
        ├── mapper/                     ← MyBatis XML
        └── sql/init.sql                ← 建库建表脚本
```

---

## 四、环境配置

### 4.1 已安装环境

| 组件 | 路径 | 环境变量 |
|---|---|---|
| JDK 17.0.2 | `D:\啵啵\Trae\Project\Java\jdk-17.0.2` | JAVA_HOME ✓ |
| Maven 3.9.9 | `D:\啵啵\Trae\Project\Java\apache-maven-3.9.9` | MAVEN_HOME ✓ |
| Maven 仓库 | `C:\Users\张张\.m2\repository` | 阿里云镜像 ✓ |

### 4.2 待安装

| 组件 | 用途 | 安装方式 |
|---|---|---|
| MySQL 8 | 数据库 | Docker 或本地安装 |
| Docker Desktop | 容器化中间件 | 浏览器下载安装 |

### 4.3 验证命令

```powershell
# 验证 JDK
java -version          # → 17.0.2

# 验证 Maven
mvn -version           # → 3.9.9

# 验证后端编译
cd D:\啵啵\Trae\Project\Java\AlgoStep\algostep-backend
mvn compile            # → BUILD SUCCESS
```

---

## 五、数据库设计

### 5.1 表结构概览

| 表名 | 说明 | 关键字段 |
|---|---|---|
| user | 用户 | id, username, password(BCrypt), email, role, status |
| algorithm | 算法信息 | id, name, name_zh, category, difficulty, url |
| learning_progress | 学习进度 | user_id, algorithm_id, status, step_index, study_time |
| favorite | 收藏 | user_id, algorithm_id |
| notification | 通知 | user_id, type, title, content, is_read |

### 5.2 初始数据

算法表预置 12 个算法（4 排序 + 5 动态规划 + 3 搜索），与前端页面一一对应。

### 5.3 建表脚本

详见 [init.sql](computer://D:\啵啵\Trae\Project\Java\AlgoStep\algostep-backend\src\main\resources\sql\init.sql)

---

## 六、API 设计

### 6.1 统一响应格式

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": { ... }
}
```

### 6.2 接口清单

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| POST | /api/auth/register | 否 | 注册 |
| POST | /api/auth/login | 否 | 登录 |
| POST | /api/auth/logout | 是 | 登出 |
| POST | /api/auth/refresh | 是 | 刷新 Token |
| GET | /api/user/profile | 是 | 查看个人信息 |
| PUT | /api/user/profile | 是 | 修改个人信息 |
| GET | /api/algorithms | 否 | 算法列表 |
| GET | /api/algorithms/{id} | 否 | 算法详情 |
| GET | /api/progress | 是 | 全部进度 |
| GET | /api/progress/{algorithmId} | 是 | 单个进度 |
| PUT | /api/progress/{algorithmId} | 是 | 保存进度 |
| GET | /api/progress/stats | 是 | 学习统计 |
| GET | /api/favorites | 是 | 收藏列表 |
| POST | /api/favorites/{algorithmId} | 是 | 添加收藏 |
| DELETE | /api/favorites/{algorithmId} | 是 | 取消收藏 |
| GET | /api/notifications | 是 | 通知列表 |
| PUT | /api/notifications/{id}/read | 是 | 标记已读 |
| PUT | /api/notifications/read-all | 是 | 全部已读 |

### 6.3 API 文档

启动后端后访问 `http://localhost:8080/doc.html` 查看 Knife4j 在线文档。

---

## 七、后端开发进度

### 当前状态：Step 8 完成（通知模块）✅ 基础 CRUD 全部完成

| Step | 内容 | 状态 | 关键产出 |
|---|---|---|---|
| 1 | 项目初始化 | ✅ 完成 | pom.xml, application.yml, init.sql, docker-compose.yml |
| 2 | 公共层 + 安全层 | ✅ 完成 | Result, 异常体系, JWT, Security, Knife4j, MyBatis-Plus |
| 3 | 认证模块 | ✅ 完成 | AuthController(注册/登录/登出/刷新), H2 内存数据库 |
| 4 | 用户模块 | ✅ 完成 | UserController(查询/修改信息/修改密码) |
| 5 | 算法模块 | ✅ 完成 | AlgorithmController(列表/详情/按分类筛选) |
| 6 | 学习进度模块 | ✅ 完成 | ProgressController(列表/单个/保存/统计) + 状态流转 |
| 7 | 收藏模块 | ✅ 完成 | FavoriteController(收藏/取消/列表) + 联合唯一索引 |
| **8** | **通知模块** | **✅ 完成** | **NotificationController(分页列表/标记已读/全部已读/未读数量)** |
| 9 | Redis + Kafka 接入 | 待开发 | 缓存 + 异步进度写入 |
| 10 | Docker 部署 | 待开发 | Dockerfile + Compose 一键启动 |

### Step 8 新增文件（通知模块，6 个文件）

```
module/notification/
├── entity/Notification.java          ← 通知实体（userId/type/title/content/isRead）
├── mapper/NotificationMapper.java    ← MyBatis-Plus Mapper
├── vo/NotificationVO.java            ← 通知响应 VO
├── service/NotificationService.java  ← 通知接口
├── service/impl/NotificationServiceImpl.java ← 实现（分页列表/标记已读/全部已读/未读数量）
└── controller/NotificationController.java ← 4个接口：分页列表 / 标记已读 / 全部已读 / 未读数量
```

**核心逻辑：**
- 分页查询：MyBatis-Plus 分页插件，支持按未读筛选，按创建时间倒序
- 标记已读：校验通知归属（只能读自己的通知），防止越权
- 全部已读：批量更新未读通知
- 未读数量：返回未读通知总数，用于前端红点提示
- 列表返回中附带 unreadCount，前端一次请求拿全数据

**已完成接口数：22 / 22**
**6 个业务模块全部打通：认证 / 用户 / 算法 / 进度 / 收藏 / 通知**

---

## 十二、后端启动与测试指南

### 12.1 环境要求

| 组件 | 要求 | 验证命令 |
|---|---|---|
| JDK | 17+ | `java -version` |
| Maven | 3.9+ | `mvn -version` |

> 无需安装 MySQL/Redis/Kafka，开发环境使用 H2 内存数据库。

### 12.2 启动后端

**方式一：命令行启动（推荐）**

```powershell
# 1. 打开 PowerShell
# 2. 设置环境变量（首次使用需要，重启终端后需重新设置）
$env:JAVA_HOME = "D:\啵啵\Trae\Project\Java\jdk-17.0.2"
$env:PATH = "$env:JAVA_HOME\bin;D:\啵啵\Trae\Project\Java\apache-maven-3.9.9\bin;" + $env:PATH

# 3. 进入后端目录
cd "D:\啵啵\Trae\Project\Java\AlgoStep\algostep-backend"

# 4. 启动（使用 H2 内存数据库，无需安装任何中间件）
mvn spring-boot:run
```

**方式二：IDEA 启动**

1. 用 IntelliJ IDEA 打开 `algostep-backend` 目录
2. 等待 Maven 自动下载依赖
3. 运行 `AlgoStepApplication.java` 的 main 方法

### 12.3 访问地址

启动成功后，以下地址可用：

| 地址 | 说明 |
|---|---|
| http://localhost:8080/doc.html | Knife4j API 文档（在线调试） |
| http://localhost:8080/h2-console | H2 数据库控制台（查看数据） |

H2 控制台连接信息：
- JDBC URL: `jdbc:h2:mem:algostep`
- User: `sa`
- Password: （空）

### 12.4 测试流程（Knife4j 在线调试）

**第 1 步：注册用户**

打开 http://localhost:8080/doc.html → 找到「认证管理」→ `POST /api/auth/register`

```json
{
  "username": "testuser",
  "password": "123456",
  "email": "test@example.com"
}
```

**第 2 步：登录获取 Token**

`POST /api/auth/login`

```json
{
  "username": "testuser",
  "password": "123456"
}
```

返回：
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "userId": 1,
    "username": "testuser",
    "nickname": "testuser",
    "role": "USER"
  }
}
```

**第 3 步：设置 Token 认证**

在 Knife4j 右上角点击「Authorize」→ 输入 `Bearer {token}` → 确认

**第 4 步：访问受保护接口**

`GET /api/auth/me` → 返回当前登录用户信息

**第 5 步：刷新 Token**

`POST /api/auth/refresh`

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

### 12.5 切换到 MySQL 环境（可选）

当你安装了 MySQL 后，可以切换到 `dev` 配置：

```powershell
# 修改 application.yml 中的 profile
# spring.profiles.active: dev

# 或启动时指定
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

dev 配置使用 MySQL（localhost:3306），需要先执行 `init.sql` 建库建表。

### 12.6 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `mvn: command not found` | Maven 未配置 PATH | 设置 `$env:PATH` 环境变量 |
| `java: not found` | JDK 未配置 | 设置 `$env:JAVA_HOME` |
| 端口 8080 被占 | 其他程序占用 | 修改 `application.yml` 中 `server.port` |
| H2 控制台空白页 | Frame 被拦截 | 已在 SecurityConfig 中禁用 frame options |
| 注册返回 1001 | 用户名已存在 | 换一个用户名 |

### Step 1-2 产出文件（23 个 Java 源文件）

```
common/
├── result/Result.java                    ← 统一响应体 {code, msg, data}
├── result/ResultCode.java                ← 响应码枚举（含业务错误码）
├── exception/BusinessException.java      ← 业务异常
├── exception/GlobalExceptionHandler.java ← 全局异常处理 @RestControllerAdvice
├── constant/SecurityConstant.java        ← 安全常量（白名单路径、Token Header）
├── constant/RedisConstant.java          ← Redis Key 前缀常量（备用）
├── constant/KafkaConstant.java           ← Kafka Topic 常量（备用）
├── enums/LearningStatus.java             ← 学习状态枚举
├── enums/NotificationType.java            ← 通知类型枚举
├── utils/JwtUtils.java                   ← JWT 生成/解析/校验
├── utils/PasswordUtils.java              ← BCrypt 密码加密/校验
└── utils/UserContext.java                ← ThreadLocal 当前用户上下文

config/
├── SecurityConfig.java                   ← Security 过滤器链（白名单 + JWT）
├── CorsConfig.java                       ← 跨域配置
├── MyBatisPlusConfig.java                ← 分页插件 + 自动填充 createTime/updateTime
└── Knife4jConfig.java                    ← API 文档配置

security/
├── JwtAuthenticationFilter.java          ← 每次请求校验 JWT → 设置 UserContext
├── JwtAuthenticationEntryPoint.java      ← 未认证 → 401 JSON
├── JwtAccessDeniedHandler.java           ← 权限不足 → 403 JSON
└── UserDetailsServiceImpl.java           ← Spring Security 用户加载

module/user/
├── entity/User.java                      ← 用户实体
└── mapper/UserMapper.java                ← MyBatis-Plus Mapper
```

---

## 八、核心流程说明

### 8.1 JWT 认证流程

```
用户登录
  → AuthController.login()
  → PasswordUtils.matches() 校验密码
  → JwtUtils.generateAccessToken() 生成 Token
  → 返回 {token, 用户信息}

后续请求
  → JwtAuthenticationFilter 从 Header 提取 Token
  → JwtUtils.isTokenValid() 校验
  → JwtUtils.parseToken() 解析用户信息
  → UserContext.set() 写入 ThreadLocal
  → SecurityContextHolder 设置认证上下文
  → Controller 执行业务
  → finally: UserContext.clear() 清理 ThreadLocal
```

### 8.2 全局异常处理流程

```
任何层抛出异常
  → @RestControllerAdvice 捕获
  → 按异常类型匹配 @ExceptionHandler
  → BusinessException → 返回业务错误码
  → AuthenticationException → 返回 401
  → AccessDeniedException → 返回 403
  → MethodArgumentNotValidException → 返回参数校验错误
  → Exception → 返回 500
```

### 8.3 统一响应格式

```
成功：Result.success(data)       → {"code":200, "msg":"操作成功", "data":{...}}
创建：Result.created(data)       → {"code":201, "msg":"创建成功", "data":{...}}
失败：Result.error(ResultCode.XX) → {"code":1001, "msg":"用户名已存在"}
```

---

## 九、开发规范

### 9.1 代码结构
- **Controller** 只做参数接收和调用 Service，不含业务逻辑
- **Service** 接口 + Impl 实现分离
- **Mapper** 继承 BaseMapper，复杂 SQL 写在 XML 中
- **Entity** 纯数据类，不加业务方法
- **DTO** 接收请求参数，**VO** 返回响应数据

### 9.2 命名规范
- 类名：大驼峰 `AuthController`
- 方法名：小驼峰 `generateAccessToken`
- 常量：全大写 `TOKEN_HEADER`
- 数据库字段：下划线 `create_time` → Java 自动映射 `createTime`

### 9.3 安全规范
- 密码必须 BCrypt 加密存储
- Token 只通过 Header 传递，不放在 URL
- 敏感字段（password）不出现在 VO 中
- SQL 使用 MyBatis-Plus 参数化，防止注入

---

## 十、文档索引

| 文档 | 位置 | 说明 |
|---|---|---|
| **AlgoStep项目手册.md** | `docs/` | 本文件，项目总纲 |
| AlgoStep-项目参考文档.md | `docs/` | 前端技术参考、规范约束 |
| AlgoStep-开发任务与目标.md | `docs/` | 分阶段开发计划（A/B/C 三阶段） |
| AlgoStep后端开发规划.md | `docs/` | 后端架构设计、文件清单、面试亮点 |
| init.sql | `algostep-backend/src/main/resources/sql/` | 数据库建表脚本 |
| application.yml | `algostep-backend/src/main/resources/` | 主配置文件 |
| pom.xml | `algostep-backend/` | Maven 依赖管理 |

---

## 十一、下一步计划

**🎉 基础 CRUD 全部完成！** 6 个业务模块、22 个接口全部打通。

后续可选进阶方向（按优先级排列）：

**Phase 2-1：Redis 缓存接入**（提升性能）
- RedisConfig + RedisUtils 封装
- Token 管理（登录写 Redis、登出删 Redis）
- 算法列表缓存 + 用户信息缓存
- 进度缓存（读多写少，提升查询性能）

**Phase 2-2：Kafka 异步化**（面试亮点）
- KafkaConfig 配置
- ProgressProducer 发送进度更新事件
- ProgressConsumer 消费 → 异步写 DB
- NotificationProducer（掌握算法自动发成就通知）

**Phase 2-3：限流 + AOP**（高并发能力）
- @RateLimit 注解 + RateLimitAspect
- 登录接口限流（防暴力破解）
- 操作日志切面

**Phase 2-4：Docker 部署**（工程化能力）
- Dockerfile 多阶段构建
- docker-compose.yml 完整编排
- application-prod.yml 生产配置

> 建议先做 Redis 接入，再做 Kafka，最后 Docker 部署。每完成一个阶段，项目的"技术深度"和"面试价值"都会显著提升。
