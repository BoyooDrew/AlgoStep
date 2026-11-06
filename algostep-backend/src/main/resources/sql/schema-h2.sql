-- H2 兼容建表脚本（开发环境内存数据库）
-- H2 MODE=MySQL 模式下执行

-- 用户表
CREATE TABLE IF NOT EXISTS sys_user (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  username    VARCHAR(50)  NOT NULL,
  password    VARCHAR(100) NOT NULL,
  email       VARCHAR(100) NOT NULL,
  nickname    VARCHAR(50)  DEFAULT NULL,
  avatar      VARCHAR(255) DEFAULT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'USER',
  status      TINYINT      NOT NULL DEFAULT 1,
  create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_username UNIQUE (username),
  CONSTRAINT uk_email UNIQUE (email)
);

-- 算法信息表
CREATE TABLE IF NOT EXISTS algorithm (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  name_zh     VARCHAR(100) NOT NULL,
  category    VARCHAR(20)  NOT NULL,
  difficulty  VARCHAR(20)  NOT NULL,
  url         VARCHAR(255) NOT NULL,
  description TEXT         DEFAULT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_name UNIQUE (name)
);

-- 学习进度表
CREATE TABLE IF NOT EXISTS learning_progress (
  id            BIGINT      NOT NULL AUTO_INCREMENT,
  user_id       BIGINT      NOT NULL,
  algorithm_id  BIGINT      NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'UNSTARTED',
  step_index    INT         NOT NULL DEFAULT 0,
  total_steps   INT         NOT NULL DEFAULT 0,
  study_time    INT         NOT NULL DEFAULT 0,
  create_time   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_progress_user_algo UNIQUE (user_id, algorithm_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON learning_progress (user_id);

-- 收藏表
CREATE TABLE IF NOT EXISTS favorite (
  id           BIGINT   NOT NULL AUTO_INCREMENT,
  user_id      BIGINT   NOT NULL,
  algorithm_id BIGINT   NOT NULL,
  create_time  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_fav_user_algo UNIQUE (user_id, algorithm_id)
);
CREATE INDEX IF NOT EXISTS idx_favorite_user ON favorite (user_id);

-- 通知表
CREATE TABLE IF NOT EXISTS notification (
  id          BIGINT      NOT NULL AUTO_INCREMENT,
  user_id     BIGINT      NOT NULL,
  type        VARCHAR(30) NOT NULL,
  title       VARCHAR(100) NOT NULL,
  content     VARCHAR(500) NOT NULL,
  is_read     TINYINT     NOT NULL DEFAULT 0,
  create_time DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notification (user_id, is_read);

-- 初始算法数据
INSERT INTO algorithm (name, name_zh, category, difficulty, url, sort_order) VALUES
('bubble-sort',      '冒泡排序',       'sort',   'beginner', '/algorithms/sort/bubble-sort.html',     1),
('selection-sort',    '选择排序',       'sort',   'beginner', '/algorithms/sort/selection-sort.html',  2),
('insertion-sort',    '插入排序',       'sort',   'beginner', '/algorithms/sort/insertion-sort.html',  3),
('quick-sort',       '快速排序',       'sort',   'basic',    '/algorithms/sort/quick-sort.html',      4),
('climb-stairs',     '爬楼梯',         'dp',     'beginner', '/algorithms/dp/climb-stairs.html',     1),
('0-1knapsack',      '0-1背包',        'dp',     'basic',    '/algorithms/dp/0-1knapsack.html',       2),
('complete-knapsack', '完全背包',       'dp',     'advanced', '/algorithms/dp/complete-knapsack.html', 3),
('lis',              '最长递增子序列', 'dp',     'basic',    '/algorithms/dp/lis.html',              4),
('lcs',              '最长公共子序列', 'dp',     'advanced', '/algorithms/dp/lcs.html',              5),
('binary-search',    '二分查找',       'search', 'beginner', '/algorithms/search/binary-search.html', 1),
('dfs',              '深度优先搜索',   'search', 'basic',    '/algorithms/search/dfs.html',           2),
('bfs',              '广度优先搜索',   'search', 'basic',    '/algorithms/search/bfs.html',           3);
