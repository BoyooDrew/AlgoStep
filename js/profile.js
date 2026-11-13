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
        // stepIndex 从 0 开始，最后一步（totalSteps - 1）即代表全部完成
        if (progress.status === 'MASTERED' || current >= total - 1) return 100;
        if (current <= 0) return 0;
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

        AlgoDialog.confirm({
            title: '取消收藏',
            message: '确定取消收藏「' + nameOf(target) + '」吗？',
            confirmText: '取消收藏',
            danger: true
        }).then(function (ok) {
            if (!ok) return;

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
        if (window.AlgoNotifications) {
            window.AlgoNotifications.setUnread(value);
        }

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