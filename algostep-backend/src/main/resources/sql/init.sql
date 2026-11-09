-- AlgoStep 数据库初始化脚本
-- 由 docker-compose 在 MySQL 首次启动时自动执行

CREATE DATABASE IF NOT EXISTS algostep DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_general_ci;
USE algostep;

-- =============================================
-- 用户表
-- =============================================
CREATE TABLE IF NOT EXISTS `sys_user` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- =============================================
-- 算法信息表
-- =============================================
CREATE TABLE IF NOT EXISTS `algorithm` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL COMMENT '算法名称(英文)',
  `name_zh`     VARCHAR(100) NOT NULL COMMENT '中文名称',
  `category`    VARCHAR(20)  NOT NULL COMMENT '分类: sort/dp/search/graph',
  `difficulty`  VARCHAR(20)  NOT NULL COMMENT '难度: beginner/basic/advanced',
  `complexity`  VARCHAR(50)  DEFAULT NULL COMMENT '时间复杂度展示文案',
  `url`         VARCHAR(255) NOT NULL COMMENT '前端页面路径',
  `description` TEXT         DEFAULT NULL COMMENT '算法简介',
  `sort_order`  INT          NOT NULL DEFAULT 0 COMMENT '排序权重',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='算法信息表';

-- 幂等迁移：为已存在的旧版 algorithm 表补 complexity 列
-- （CREATE TABLE IF NOT EXISTS 不会修改已有表结构，MySQL 不支持 ADD COLUMN IF NOT EXISTS）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'algorithm' AND COLUMN_NAME = 'complexity'
);
SET @alter_sql := IF(@col_exists = 0,
  'ALTER TABLE `algorithm` ADD COLUMN `complexity` VARCHAR(50) DEFAULT NULL COMMENT ''时间复杂度展示文案'' AFTER `difficulty`',
  'SELECT 1');
PREPARE stmt_complexity FROM @alter_sql;
EXECUTE stmt_complexity;
DEALLOCATE PREPARE stmt_complexity;

-- =============================================
-- 学习进度表
-- =============================================
CREATE TABLE IF NOT EXISTS `learning_progress` (
  `id`            BIGINT      NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT      NOT NULL COMMENT '用户ID',
  `algorithm_id`  BIGINT      NOT NULL COMMENT '算法ID',
  `status`        VARCHAR(20) NOT NULL DEFAULT 'UNSTARTED' COMMENT 'UNSTARTED/LEARNING/MASTERED',
  `step_index`    INT         NOT NULL DEFAULT 0 COMMENT '上次看到第几步',
  `total_steps`   INT         NOT NULL DEFAULT 0 COMMENT '总步数',
  `study_time`    INT         NOT NULL DEFAULT 0 COMMENT '学习时长(秒)',
  `create_time`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_algo` (`user_id`, `algorithm_id`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习进度表';

-- =============================================
-- 收藏表
-- =============================================
CREATE TABLE IF NOT EXISTS `favorite` (
  `id`           BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT   NOT NULL,
  `algorithm_id` BIGINT   NOT NULL,
  `create_time`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_algo` (`user_id`, `algorithm_id`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='算法收藏表';

-- =============================================
-- 通知表
-- =============================================
CREATE TABLE IF NOT EXISTS `notification` (
  `id`          BIGINT      NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT      NOT NULL COMMENT '接收用户',
  `type`        VARCHAR(30) NOT NULL COMMENT 'SYSTEM/PROGRESS/ACHIEVEMENT',
  `title`       VARCHAR(100) NOT NULL,
  `content`     VARCHAR(500) NOT NULL,
  `is_read`     TINYINT     NOT NULL DEFAULT 0 COMMENT '0未读 1已读',
  `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';

-- =============================================
-- 初始算法数据
-- =============================================
INSERT INTO `algorithm` (`name`, `name_zh`, `category`, `difficulty`, `complexity`, `url`, `description`, `sort_order`) VALUES
('bubble-sort',      '冒泡排序',       'sort',   'beginner', 'O(n²)',     '/algorithms/sort/bubble-sort.html',     '相邻元素两两比较交换，最大值逐步浮到末尾，排序经典。', 1),
('selection-sort',   '选择排序',       'sort',   'beginner', 'O(n²)',     '/algorithms/sort/selection-sort.html',  '每轮从未排序部分选出最小值，放到已排序部分末尾。', 2),
('insertion-sort',   '插入排序',       'sort',   'beginner', 'O(n²)',     '/algorithms/sort/insertion-sort.html',  '将元素依次插入已排序部分的正确位置，稳定且简单。', 3),
('quick-sort',       '快速排序',       'sort',   'basic',    'O(nlog n)', '/algorithms/sort/quick-sort.html',      '选取基准值分区，递归排序左右两部分，分治经典。', 4),
('climb-stairs',     '爬楼梯',         'dp',     'beginner', 'O(n)',      '/algorithms/dp/climb-stairs.html',      '每次可上 1 或 2 级台阶，到达第 n 级有多少种走法。', 1),
('0-1knapsack',      '0-1背包',        'dp',     'basic',    'O(nW)',     '/algorithms/dp/0-1knapsack.html',       '每个物品最多选一次，在背包容量限制下最大化价值。', 2),
('complete-knapsack','完全背包',       'dp',     'advanced', 'O(nW)',     '/algorithms/dp/complete-knapsack.html', '每个物品可重复选取，比较与 0-1 背包的递推差异。', 3),
('lis',              '最长递增子序列', 'dp',     'basic',    'O(nlog n)', '/algorithms/dp/lis.html',               '求数组中最长递增子序列的长度，O(n log n) 优化。', 4),
('lcs',              '最长公共子序列', 'dp',     'advanced', 'O(mn)',     '/algorithms/dp/lcs.html',               '求两个字符串的最长公共子序列长度，经典二维 DP 问题。', 5),
('binary-search',    '二分查找',       'search', 'beginner', 'O(log n)',  '/algorithms/search/binary-search.html', '在有序数组中折半查找目标值，每次排除一半搜索空间。', 1),
('dfs',              '深度优先搜索',   'search', 'basic',    'O(V+E)',    '/algorithms/search/dfs.html',           '图与树遍历的核心算法，沿一条路径尽可能深地搜索，回溯后继续其他分支。', 2),
('bfs',              '广度优先搜索',   'search', 'basic',    'O(V+E)',    '/algorithms/search/bfs.html',           '按层遍历图的节点，适用于最短路径问题，通常使用队列实现。', 3)
ON DUPLICATE KEY UPDATE
  `name_zh`     = VALUES(`name_zh`),
  `complexity`  = VALUES(`complexity`),
  `url`         = VALUES(`url`),
  `description` = VALUES(`description`),
  `sort_order`  = VALUES(`sort_order`);
