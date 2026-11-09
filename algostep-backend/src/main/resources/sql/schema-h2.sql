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
  complexity  VARCHAR(50)  DEFAULT NULL,
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

-- 初始算法数据（首页卡片由该表驱动）
INSERT INTO algorithm (name, name_zh, category, difficulty, complexity, url, description, sort_order) VALUES
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
('bfs',              '广度优先搜索',   'search', 'basic',    'O(V+E)',    '/algorithms/search/bfs.html',           '按层遍历图的节点，适用于最短路径问题，通常使用队列实现。', 3);
