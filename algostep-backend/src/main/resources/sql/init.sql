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
  `url`         VARCHAR(255) NOT NULL COMMENT '前端页面路径',
  `description` TEXT         DEFAULT NULL COMMENT '算法简介',
  `sort_order`  INT          NOT NULL DEFAULT 0 COMMENT '排序权重',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='算法信息表';

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
INSERT INTO `algorithm` (`name`, `name_zh`, `category`, `difficulty`, `url`, `sort_order`) VALUES
('bubble-sort',     '冒泡排序',       'sort',   'beginner', '/algorithms/sort/bubble-sort.html',     1),
('selection-sort',   '选择排序',       'sort',   'beginner', '/algorithms/sort/selection-sort.html',  2),
('insertion-sort',   '插入排序',       'sort',   'beginner', '/algorithms/sort/insertion-sort.html',  3),
('quick-sort',      '快速排序',       'sort',   'basic',    '/algorithms/sort/quick-sort.html',      4),
('climb-stairs',    '爬楼梯',         'dp',     'beginner', '/algorithms/dp/climb-stairs.html',     1),
('0-1knapsack',     '0-1背包',        'dp',     'basic',    '/algorithms/dp/0-1knapsack.html',       2),
('complete-knapsack','完全背包',       'dp',     'advanced', '/algorithms/dp/complete-knapsack.html', 3),
('lis',             '最长递增子序列',   'dp',     'basic',    '/algorithms/dp/lis.html',              4),
('lcs',             '最长公共子序列',   'dp',     'advanced', '/algorithms/dp/lcs.html',              5),
('binary-search',   '二分查找',        'search', 'beginner', '/algorithms/search/binary-search.html', 1),
('dfs',             '深度优先搜索',     'search', 'basic',    '/algorithms/search/dfs.html',           2),
('bfs',             '广度优先搜索',     'search', 'basic',    '/algorithms/search/bfs.html',           3)
ON DUPLICATE KEY UPDATE `name_zh` = VALUES(`name_zh`);
