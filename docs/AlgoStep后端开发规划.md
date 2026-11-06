# AlgoStep 后端开发规划

> 面向 CSP-J/S 考生的算法可视化教学工具 —— 后端 Phase 1
> 技术栈：Spring Boot 3 + MyBatis-Plus + MySQL 8 + Redis 7 + Kafka 3
> 定位：求职级完整项目，覆盖后端核心知识点，可面试展示

---

## 一、技术选型与版本

| 层面 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| 语言 | Java | 17 (LTS) | 长期支持版本，主流企业级 |
| 框架 | Spring Boot | 3.2.x | 自动配置、starter 生态 |
| 安全 | Spring Security | 6.2.x | 与 Boot 3 深度集成 |
| 认证 | JWT (jjwt) | 0.12.x | 无状态 token，前后端分离标准方案 |
| ORM | MyBatis-Plus | 3.5.5 | 简化 CRUD，保留 SQL 灵活性 |
| 数据库 | MySQL | 8.0 | 主流关系型数据库 |
| 缓存 | Redis | 7.2 | token 管理、热点缓存、限流 |
| 消息队列 | Kafka | 3.6 | 异步事件驱动（进度写入、通知推送） |
| API 文档 | Knife4j | 4.4.x | Swagger 增强，中文友好，面试加分项 |
| 构建 | Maven | 3.9.x | 依赖管理标准化 |
| 容器 | Docker + Compose | 24.x | 一键启动 MySQL/Redis/Kafka |

---

## 二、整体架构

```
                    ┌─────────────────────────────────────────┐
                    │            前端 (AlgoStep)               │
                    │     HTML/CSS/JS · Surge.sh 部署          │
                    └────────────────┬────────────────────────┘
                                     │ HTTPS / RESTful API
                                     ▼
                    ┌─────────────────────────────────────────┐
                    │         Spring Boot 后端                  │
                    │  ┌─────────────────────────────────┐    │
                    │  │       Controller 层 (API)         │    │
                    │  │  Auth / User / Algorithm /         │    │
                    │  │  Progress / Favorite / Notification│   │
                    │  └──────────┬──────────────────────┘    │
                    │  ┌──────────▼──────────────────────┐    │
                    │  │    Service 层 (业务逻辑)          │    │
                    │  │  + Spring Security 过滤器链       │    │
                    │  │  + JWT 校验 / 限流拦截器           │    │
                    │  └──────┬──────────┬───────────────┘    │
                    │         │          │                     │
                    │  ┌──────▼──┐  ┌───▼──────────┐          │
                    │  │ Redis   │  │ Kafka Producer │          │
                    │  │ 缓存层   │  │ 事件发送       │          │
                    │  └─────────┘  └───┬──────────┘          │
                    └──────┬──────────────┼───────────────────┘
                           │              │
                    ┌──────▼──────┐  ┌───▼──────────┐
                    │   MySQL 8   │  │   Kafka 3.6   │
                    │   持久化     │  │  消息中间件     │
                    └─────────────┘  └───┬──────────┘
                                         │
                                    ┌────▼──────────┐
                                    │ Kafka Consumer │
                                    │ 异步写DB / 推送  │
                                    └───────────────┘
```

### 请求流转示例（保存学习进度）

```
前端 PUT /api/progress/bubble-sort
  → JwtAuthFilter 校验 token
  → RateLimitInterceptor 限流检查
  → ProgressController.update()
  → ProgressService.update()
    → Redis: 写入进度缓存（立即生效）
    → Kafka: 发送 "progress-update" 事件（异步落库）
  → 返回 Result.success()
    ↓ (异步)
  → ProgressConsumer 消费消息
    → ProgressMapper 写入 MySQL
```

---

## 三、完整文件清单

```
algostep-backend/
│
├── pom.xml                                          # Maven 依赖管理
├── docker-compose.yml                               # 本地一键启动 MySQL/Redis/Kafka
├── Dockerfile                                       # 后端容器镜像
├── .env.example                                     # 环境变量模板（不含真实密码）
├── .gitignore
│
├── src/main/java/com/algostep/
│   │
│   ├── AlgoStepApplication.java                     # 启动类
│   │
│   ├── common/                                      # ========== 公共层 ==========
│   │   ├── result/
│   │   │   ├── Result.java                          # 统一响应体 {code, msg, data}
│   │   │   └── ResultCode.java                      # 响应码枚举 (200/400/401/403/404/500...)
│   │   ├── exception/
│   │   │   ├── BusinessException.java               # 业务异常 (可预期)
│   │   │   ├── SystemException.java                 # 系统异常 (不可预期)
│   │   │   └── GlobalExceptionHandler.java          # @RestControllerAdvice 全局捕获
│   │   ├── constant/
│   │   │   ├── RedisConstant.java                   # Redis key 前缀常量
│   │   │   ├── KafkaConstant.java                   # Kafka topic/group 常量
│   │   │   └── SecurityConstant.java                # 白名单路径、Token Header 名
│   │   ├── enums/
│   │   │   ├── LearningStatus.java                  # 学习状态枚举(UNSTARTED/LEARNING/MASTERED)
│   │   │   └── NotificationType.java                # 通知类型枚举
│   │   ├── annotation/
│   │   │   ├── @RateLimit.java                      # 限流注解
│   │   │   └── @RequireAuth.java                    # 需登录注解(可选)
│   │   └── utils/
│   │       ├── JwtUtils.java                        # JWT 生成/解析/校验
│   │       ├── RedisUtils.java                      # Redis 操作封装
│   │       ├── PasswordUtils.java                   # BCrypt 加盐哈希
│   │       └── UserContext.java                     # ThreadLocal 当前用户上下文
│   │
│   ├── config/                                      # ========== 配置层 ==========
│   │   ├── SecurityConfig.java                      # Spring Security 过滤器链
│   │   ├── RedisConfig.java                         # RedisTemplate 序列化
│   │   ├── MyBatisPlusConfig.java                   # 分页插件 + 自动填充
│   │   ├── KafkaConfig.java                         # Producer/Consumer 工厂
│   │   ├── CorsConfig.java                          # 跨域配置
│   │   ├── WebMvcConfig.java                        # 拦截器注册
│   │   ├── Knife4jConfig.java                       # API 文档配置
│   │   └── KafkaProducerListener.java               # Kafka 生产者发送回调
│   │
│   ├── security/                                    # ========== 安全层 ==========
│   │   ├── JwtAuthenticationFilter.java             # JWT 认证过滤器
│   │   ├── JwtAuthenticationEntryPoint.java         # 未认证 → 401 JSON
│   │   ├── JwtAccessDeniedHandler.java              # 权限不足 → 403 JSON
│   │   └── UserDetailsServiceImpl.java              # 加载用户信息(Spring Security)
│   │
│   ├── interceptor/
│   │   └── RateLimitInterceptor.java                # Redis 令牌桶限流
│   │
│   ├── module/                                      # ========== 业务模块 ==========
│   │   │
│   │   ├── auth/                                    # --- 认证模块 ---
│   │   │   ├── controller/
│   │   │   │   └── AuthController.java              # 注册/登录/登出/刷新
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java                 # 接口
│   │   │   │   └── impl/AuthServiceImpl.java        # 实现
│   │   │   ├── dto/
│   │   │   │   ├── LoginDTO.java                    # 登录请求 {username, password}
│   │   │   │   └── RegisterDTO.java                 # 注册请求 {username, password, email}
│   │   │   └── vo/
│   │   │       └── LoginVO.java                     # 登录响应 {token, refreshToken, 用户信息}
│   │   │
│   │   ├── user/                                    # --- 用户模块 ---
│   │   │   ├── controller/
│   │   │   │   └── UserController.java              # 查询/修改个人信息
│   │   │   ├── service/
│   │   │   │   ├── UserService.java
│   │   │   │   └── impl/UserServiceImpl.java
│   │   │   ├── mapper/
│   │   │   │   └── UserMapper.java                  # MyBatis-Plus Mapper
│   │   │   ├── entity/
│   │   │   │   └── User.java                        # 用户实体
│   │   │   ├── dto/
│   │   │   │   └── UserProfileDTO.java              # 修改请求 {nickname, avatar}
│   │   │   └── vo/
│   │   │       └── UserVO.java                      # 用户信息响应(脱敏)
│   │   │
│   │   ├── algorithm/                               # --- 算法模块 ---
│   │   │   ├── controller/
│   │   │   │   └── AlgorithmController.java        # 算法列表/详情
│   │   │   ├── service/
│   │   │   │   ├── AlgorithmService.java
│   │   │   │   └── impl/AlgorithmServiceImpl.java
│   │   │   ├── mapper/
│   │   │   │   └── AlgorithmMapper.java
│   │   │   ├── entity/
│   │   │   │   └── Algorithm.java                  # 算法实体
│   │   │   └── vo/
│   │   │       └── AlgorithmVO.java                # 算法卡片信息
│   │   │
│   │   ├── progress/                                # --- 学习进度模块 ---
│   │   │   ├── controller/
│   │   │   │   └── ProgressController.java          # 获取/保存进度
│   │   │   ├── service/
│   │   │   │   ├── ProgressService.java
│   │   │   │   └── impl/ProgressServiceImpl.java
│   │   │   ├── mapper/
│   │   │   │   └── ProgressMapper.java
│   │   │   ├── entity/
│   │   │   │   └── LearningProgress.java           # 进度实体
│   │   │   ├── dto/
│   │   │   │   └── ProgressDTO.java                # {algorithmId, stepIndex, status}
│   │   │   ├── vo/
│   │   │   │   └── ProgressVO.java                  # 进度响应
│   │   │   ├── producer/
│   │   │   │   └── ProgressProducer.java            # Kafka 发送进度事件
│   │   │   └── consumer/
│   │   │       └── ProgressConsumer.java            # Kafka 消费 → 写 MySQL
│   │   │
│   │   ├── favorite/                                # --- 收藏模块 ---
│   │   │   ├── controller/
│   │   │   │   └── FavoriteController.java          # 收藏/取消/列表
│   │   │   ├── service/
│   │   │   │   ├── FavoriteService.java
│   │   │   │   └── impl/FavoriteServiceImpl.java
│   │   │   ├── mapper/
│   │   │   │   └── FavoriteMapper.java
│   │   │   ├── entity/
│   │   │   │   └── Favorite.java                   # 收藏实体
│   │   │   └── vo/
│   │   │       └── FavoriteVO.java
│   │   │
│   │   └── notification/                            # --- 通知模块 ---
│   │       ├── controller/
│   │       │   └── NotificationController.java      # 通知列表/已读
│   │       ├── service/
│   │       │   ├── NotificationService.java
│   │       │   └── impl/NotificationServiceImpl.java
│   │       ├── mapper/
│   │       │   └── NotificationMapper.java
│   │       ├── entity/
│   │       │   └── Notification.java                # 通知实体
│   │       ├── producer/
│   │       │   └── NotificationProducer.java        # Kafka 发送通知事件
│   │       └── consumer/
│   │           └── NotificationConsumer.java         # Kafka 消费 → 写DB + 可扩展推送
│   │
│   └── aspect/                                      # ========== AOP 切面 ==========
│       ├── RateLimitAspect.java                     # @RateLimit 注解切面
│       └── OperationLogAspect.java                  # 操作日志切面(可选)
│
├── src/main/resources/
│   ├── application.yml                              # 主配置
│   ├── application-dev.yml                          # 开发环境(MySQL/Redis/Kafka 本地)
│   ├── application-prod.yml                         # 生产环境
│   ├── mapper/                                      # MyBatis XML 映射
│   │   ├── UserMapper.xml
│   │   ├── AlgorithmMapper.xml
│   │   ├── ProgressMapper.xml
│   │   ├── FavoriteMapper.xml
│   │   └── NotificationMapper.xml
│   └── sql/
│       └── init.sql                                 # 建库建表 + 初始数据
│
└── src/test/java/com/algostep/
    ├── AlgoStepApplicationTests.java                # 启动测试
    └── module/
        ├── auth/AuthServiceTest.java                # 登录注册单元测试
        ├── user/UserServiceTest.java
        ├── progress/ProgressServiceTest.java
        └── favorite/FavoriteServiceTest.java
```

**文件统计：约 55-60 个文件**

---

## 四、数据库设计

### 4.1 ER 关系

```
user (1) ──── (N) learning_progress
user (1) ──── (N) favorite
user (1) ──── (N) notification
algorithm (1) ── (N) learning_progress
algorithm (1) ── (N) favorite
```

### 4.2 建表语句 (init.sql)

```sql
CREATE DATABASE IF NOT EXISTS algostep DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_general_ci;
USE algostep;

-- 用户表
CREATE TABLE `user` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `username`    VARCHAR(50)  NOT NULL COMMENT '用户名',
  `password`    VARCHAR(100) NOT NULL COMMENT 'BCrypt加密密码',
  `email`       VARCHAR(100) NOT NULL COMMENT '邮箱',
  `nickname`    VARCHAR(50)  DEFAULT NULL COMMENT '昵称',
  `avatar`      VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  `role`        VARCHAR(20)  NOT NULL DEFAULT 'USER' COMMENT '角色: USER/ADMIN',
  `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 0禁用',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB COMMENT='用户表';

-- 算法表
CREATE TABLE `algorithm` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL COMMENT '算法名称(英文)',
  `name_zh`     VARCHAR(100) NOT NULL COMMENT '中文名称',
  `category`    VARCHAR(20)  NOT NULL COMMENT '分类: sort/dp/search/graph',
  `difficulty`  VARCHAR(20)  NOT NULL COMMENT '难度: beginner/basic/advanced',
  `url`         VARCHAR(255) NOT NULL COMMENT '前端页面路径',
  `description` TEXT         DEFAULT NULL COMMENT '算法简介',
  `sort_order`  INT          NOT NULL DEFAULT 0 COMMENT '排序权重',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB COMMENT='算法信息表';

-- 学习进度表
CREATE TABLE `learning_progress` (
  `id`            BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT   NOT NULL COMMENT '用户ID',
  `algorithm_id`  BIGINT   NOT NULL COMMENT '算法ID',
  `status`        VARCHAR(20) NOT NULL DEFAULT 'UNSTARTED' COMMENT 'UNSTARTED/LEARNING/MASTERED',
  `step_index`    INT      NOT NULL DEFAULT 0 COMMENT '上次看到第几步',
  `total_steps`   INT      NOT NULL DEFAULT 0 COMMENT '总步数',
  `study_time`    INT      NOT NULL DEFAULT 0 COMMENT '学习时长(秒)',
  `create_time`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_algo` (`user_id`, `algorithm_id`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB COMMENT='学习进度表';

-- 收藏表
CREATE TABLE `favorite` (
  `id`          BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT   NOT NULL,
  `algorithm_id` BIGINT  NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_algo` (`user_id`, `algorithm_id`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB COMMENT='算法收藏表';

-- 通知表
CREATE TABLE `notification` (
  `id`          BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT   NOT NULL COMMENT '接收用户',
  `type`        VARCHAR(30) NOT NULL COMMENT 'SYSTEM/PROGRESS/ACHIEVEMENT',
  `title`       VARCHAR(100) NOT NULL,
  `content`     VARCHAR(500) NOT NULL,
  `is_read`     TINYINT  NOT NULL DEFAULT 0 COMMENT '0未读 1已读',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB COMMENT='通知表';

-- 初始算法数据
INSERT INTO `algorithm` (`name`, `name_zh`, `category`, `difficulty`, `url`, `sort_order`) VALUES
('bubble-sort',    '冒泡排序',     'sort',   'beginner', '/algorithms/sort/bubble-sort.html',    1),
('selection-sort',  '选择排序',     'sort',   'beginner', '/algorithms/sort/selection-sort.html', 2),
('insertion-sort',  '插入排序',     'sort',   'beginner', '/algorithms/sort/insertion-sort.html', 3),
('quick-sort',     '快速排序',     'sort',   'basic',    '/algorithms/sort/quick-sort.html',     4),
('climb-stairs',   '爬楼梯',       'dp',     'beginner', '/algorithms/dp/climb-stairs.html',     1),
('0-1knapsack',    '0-1背包',      'dp',     'basic',    '/algorithms/dp/0-1knapsack.html',       2),
('complete-knapsack','完全背包',     'dp',     'advanced', '/algorithms/dp/complete-knapsack.html', 3),
('lis',            '最长递增子序列', 'dp',     'basic',    '/algorithms/dp/lis.html',              4),
('lcs',            '最长公共子序列', 'dp',     'advanced', '/algorithms/dp/lcs.html',              5),
('binary-search',  '二分查找',      'search', 'beginner', '/algorithms/search/binary-search.html', 1),
('dfs',            '深度优先搜索',   'search', 'basic',    '/algorithms/search/dfs.html',          2),
('bfs',            '广度优先搜索',   'search', 'basic',    '/algorithms/search/bfs.html',           3);
```

---

## 五、Redis 设计

### 5.1 Key 规划

| 用途 | Key 格式 | TTL | 说明 |
|---|---|---|---|
| AccessToken | `auth:token:{userId}` | 2h | 存 token，登出时删除 |
| RefreshToken | `auth:refresh:{userId}` | 7d | 刷新 token |
| 登录限流 | `auth:limit:{ip}` | 1min | 最多 5 次/分钟 |
| 用户信息缓存 | `user:info:{userId}` | 30min | 减少 DB 查询 |
| 算法列表缓存 | `algo:list:{category}` | 1h | 首页卡片数据 |
| 进度缓存 | `progress:{userId}` | 10min | Hash, field=algoId, value=进度JSON |
| 收藏集合 | `favorite:{userId}` | 30min | Set, member=algoId |

### 5.2 缓存策略

```
读取进度:
  1. 查 Redis Hash progress:{userId}
  2. 命中 → 直接返回
  3. 未命中 → 查 MySQL → 写回 Redis → 返回

写入进度:
  1. 更新 Redis Hash（立即生效，用户无感）
  2. 发 Kafka 消息 → Consumer 异步写 MySQL
  3. 若 Redis 写入失败 → 降级同步写 MySQL
```

---

## 六、Kafka 设计

### 6.1 Topic 规划

| Topic | 用途 | 分区数 | 消费组 |
|---|---|---|---|
| `progress-update` | 学习进度变更事件 | 3 | `progress-consumer-group` |
| `notification-send` | 通知推送事件 | 2 | `notification-consumer-group` |
| `user-activity` | 用户行为日志 | 3 | `activity-consumer-group` |

### 6.2 消息格式

```json
// progress-update
{
  "userId": 1,
  "algorithmId": 5,
  "stepIndex": 12,
  "totalSteps": 20,
  "status": "LEARNING",
  "timestamp": 1716124800000
}

// notification-send
{
  "userId": 1,
  "type": "ACHIEVEMENT",
  "title": "学习成就",
  "content": "你已掌握「冒泡排序」！",
  "timestamp": 1716124800000
}
```

### 6.3 消费者幂等设计

- ProgressConsumer：用 `user_id + algorithm_id` 唯一索引做 upsert（ON DUPLICATE KEY UPDATE），天然幂等
- NotificationConsumer：消息体带 `timestamp`，消费时取最新，重复消息被覆盖

---

## 七、API 设计

### 7.1 统一响应格式

```json
{
  "code": 200,
  "msg": "success",
  "data": { ... }
}
```

### 7.2 接口清单

| 方法 | 路径 | 需认证 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 否 | 注册 |
| POST | `/api/auth/login` | 否 | 登录 |
| POST | `/api/auth/logout` | 是 | 登出 |
| POST | `/api/auth/refresh` | 是 | 刷新 token |
| GET | `/api/user/profile` | 是 | 查看个人信息 |
| PUT | `/api/user/profile` | 是 | 修改个人信息 |
| GET | `/api/algorithms` | 否 | 算法列表(可按分类筛选) |
| GET | `/api/algorithms/{id}` | 否 | 算法详情 |
| GET | `/api/progress` | 是 | 获取全部学习进度 |
| GET | `/api/progress/{algorithmId}` | 是 | 获取某算法进度 |
| PUT | `/api/progress/{algorithmId}` | 是 | 保存进度 |
| GET | `/api/progress/stats` | 是 | 学习统计(总数/已掌握/学习中) |
| GET | `/api/favorites` | 是 | 收藏列表 |
| POST | `/api/favorites/{algorithmId}` | 是 | 添加收藏 |
| DELETE | `/api/favorites/{algorithmId}` | 是 | 取消收藏 |
| GET | `/api/notifications` | 是 | 通知列表(分页) |
| PUT | `/api/notifications/{id}/read` | 是 | 标记已读 |
| PUT | `/api/notifications/read-all` | 是 | 全部已读 |

### 7.3 Knife4j 文档

启动后访问 `http://localhost:8080/doc.html`，自动生成全部接口文档，支持在线调试。

---

## 八、开发顺序（按步骤）

### Step 1：项目初始化（半天）

- [ ] 创建 Spring Initializr 项目（Maven, Java 17, Spring Boot 3.2）
- [ ] pom.xml 引入全部依赖
- [ ] application.yml 多环境配置
- [ ] docker-compose.yml（MySQL 8 + Redis 7 + Kafka 3 + Zookeeper）
- [ ] init.sql 建库建表
- [ ] 验证 `docker-compose up -d` 全部正常启动

### Step 2：公共层搭建（1 天）

- [ ] Result / ResultCode 统一响应
- [ ] BusinessException / GlobalExceptionHandler 异常体系
- [ ] 常量类（Redis / Kafka / Security）
- [ ] 枚举类（LearningStatus / NotificationType）
- [ ] JwtUtils / RedisUtils / PasswordUtils 工具类
- [ ] UserContext ThreadLocal

### Step 3：Spring Security + JWT（1.5 天）

- [ ] SecurityConfig 过滤器链配置（白名单路径放行）
- [ ] JwtAuthenticationFilter（每次请求校验 token）
- [ ] JwtAuthenticationEntryPoint（401 JSON 响应）
- [ ] JwtAccessDeniedHandler（403 JSON 响应）
- [ ] UserDetailsServiceImpl（加载用户权限）
- [ ] CorsConfig 跨域配置
- [ ] Knife4jConfig API 文档
- [ ] 验证：未登录访问受保护接口返回 401

### Step 4：认证模块（1 天）

- [ ] User 实体 + UserMapper
- [ ] AuthController（注册/登录/登出/刷新）
- [ ] AuthServiceImpl：
  - 注册：BCrypt 加密 → 写 MySQL
  - 登录：校验密码 → 生成 JWT → 写 Redis
  - 登出：删 Redis token
  - 刷新：校验 refreshToken → 发新 token
- [ ] 单元测试：注册/登录/密码错误/重复注册

### Step 5：用户模块（0.5 天）

- [ ] UserController（查询/修改个人信息）
- [ ] UserServiceImpl + Redis 缓存
- [ ] UserVO 脱敏（不返回 password）
- [ ] 单元测试

### Step 6：算法模块（0.5 天）

- [ ] Algorithm 实体 + AlgorithmMapper
- [ ] AlgorithmController（列表/详情，按分类筛选）
- [ ] AlgorithmServiceImpl + Redis 缓存算法列表
- [ ] init.sql 算法数据验证

### Step 7：学习进度模块（2 天）★ 核心亮点

- [ ] LearningProgress 实体 + ProgressMapper
- [ ] ProgressController（获取/保存/统计）
- [ ] ProgressServiceImpl：
  - 读取：Redis 缓存优先
  - 保存：写 Redis → 发 Kafka
  - 统计：聚合查询
- [ ] ProgressProducer（Kafka 发送）
- [ ] ProgressConsumer（Kafka 消费 → 写 MySQL，幂等 upsert）
- [ ] KafkaConfig（Producer/Consumer 工厂 + 序列化）
- [ ] 降级策略：Redis 写入失败 → 同步写 DB
- [ ] 单元测试

### Step 8：收藏模块（0.5 天）

- [ ] Favorite 实体 + FavoriteMapper
- [ ] FavoriteController（收藏/取消/列表）
- [ ] FavoriteServiceImpl + Redis Set 缓存
- [ ] 单元测试

### Step 9：通知模块（1 天）★ Kafka 亮点

- [ ] Notification 实体 + NotificationMapper
- [ ] NotificationController（列表分页/标记已读）
- [ ] NotificationServiceImpl
- [ ] NotificationProducer（Kafka 发送）
- [ ] NotificationConsumer（Kafka 消费 → 写 DB）
- [ ] 触发场景：掌握算法时自动发成就通知
- [ ] 单元测试

### Step 10：限流 + AOP（0.5 天）

- [ ] @RateLimit 注解 + RateLimitAspect
- [ ] RateLimitInterceptor（Redis 令牌桶）
- [ ] 登录接口限流 5 次/分钟
- [ ] 全局接口限流 60 次/分钟

### Step 11：Docker 部署（0.5 天）

- [ ] Dockerfile（多阶段构建）
- [ ] docker-compose.yml 完整编排（后端 + MySQL + Redis + Kafka）
- [ ] application-prod.yml 生产配置
- [ ] 验证一键启动

### Step 12：文档收尾（0.5 天）

- [ ] Knife4j 文档验证全部接口
- [ ] README.md 后端使用说明
- [ ] 核心流程验证：注册→登录→看算法→存进度→收藏→收通知

---

## 九、面试亮点与话术

### 9.1 技术亮点（简历可写）

| 亮点 | 涉及知识点 | 面试问答方向 |
|---|---|---|
| JWT + Redis 双层认证 | 无状态认证、Token 失效控制 | "如何实现登出后 token 立即失效？" → Redis 删除 |
| Kafka 异步写进度 | 消息队列、削峰填谷、最终一致性 | "为什么用 Kafka 不直接写 DB？" → 高频写入削峰 |
| Redis 缓存 + 降级策略 | 缓存穿透/击穿/雪崩、降级 | "Redis 挂了怎么办？" → 降级同步写 DB |
| 令牌桶限流 | 高并发限流、AOP | "如何防止恶意请求？" → @RateLimit 注解 |
| 全局异常 + 统一响应 | 工程规范 | "如何保证 API 格式统一？" → @RestControllerAdvice |
| 幂等消费 | 消息队列重复消费 | "Kafka 消费者如何保证幂等？" → UPSERT |
| Docker Compose | 容器化、环境一致性 | "本地怎么跑？" → docker-compose up -d |

### 9.2 可扩展话题

- "如果用户量增长到 10 万？" → Redis 集群、Kafka 分区、MySQL 读写分离
- "如果要做 OJ 在线判题？" → Judge0 沙箱、Kafka 任务队列
- "AI 编程方向怎么结合？" → 可用 AI 生成算法步骤数据、智能推荐学习路径

---

## 十、依赖清单 (pom.xml 核心依赖)

```xml
<!-- Spring Boot -->
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.2.5</version>
</parent>

<dependencies>
  <!-- Web -->
  <dependency>org.springframework.boot:spring-boot-starter-web</dependency>
  <!-- Security -->
  <dependency>org.springframework.boot:spring-boot-starter-security</dependency>
  <!-- JWT -->
  <dependency>io.jsonwebtoken:jjwt-api:0.12.5</dependency>
  <dependency>io.jsonwebtoken:jjwt-impl:0.12.5</dependency>
  <dependency>io.jsonwebtoken:jjwt-jackson:0.12.5</dependency>
  <!-- MyBatis-Plus -->
  <dependency>com.baomidou:mybatis-plus-spring-boot3-starter:3.5.5</dependency>
  <!-- MySQL -->
  <dependency>com.mysql:mysql-connector-j</dependency>
  <!-- Redis -->
  <dependency>org.springframework.boot:spring-boot-starter-data-redis</dependency>
  <!-- Kafka -->
  <dependency>org.springframework.kafka:spring-kafka</dependency>
  <!-- Knife4j (API文档) -->
  <dependency>com.github.xiaoymin:knife4j-openapi3-jakarta-spring-boot-starter:4.4.0</dependency>
  <!-- Lombok -->
  <dependency>org.projectlombok:lombok</dependency>
  <!-- 参数校验 -->
  <dependency>org.springframework.boot:spring-boot-starter-validation</dependency>
  <!-- 测试 -->
  <dependency>org.springframework.boot:spring-boot-starter-test</dependency>
  <dependency>org.springframework.kafka:spring-kafka-test</dependency>
</dependencies>
```

---

## 十一、环境要求

| 组件 | 版本 | 说明 |
|---|---|---|
| JDK | 17+ | 必须 |
| Maven | 3.9+ | 必须 |
| Docker | 24+ | 推荐（一键启动中间件） |
| IDE | IntelliJ IDEA | 推荐 |

> 不装本地 MySQL/Redis/Kafka，用 docker-compose 一键启动全部中间件。

---

## 十二、预估时间线

| 阶段 | 内容 | 预估 |
|---|---|---|
| Step 1-3 | 项目初始化 + 公共层 + Security | 3 天 |
| Step 4-6 | 认证 + 用户 + 算法 | 2 天 |
| Step 7-9 | 进度(核心) + 收藏 + 通知 | 3.5 天 |
| Step 10-12 | 限流 + Docker + 收尾 | 1.5 天 |
| **合计** | | **约 10 天**（含调试） |

> 建议按 Step 顺序逐步开发，每完成一个 Step 做一次 commit，保证可回溯。
```
