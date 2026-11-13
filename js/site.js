/* ============================================================
 * AlgoStep v2.0 · site.js
 * 站点外壳：顶部导航栏 + 底部信息栏，统一注入
 *
 * 用法（放在 </body> 前）：
 *   <script src="../js/site.js"
 *           data-base="../"        相对路径前缀（根目录用 "./"）
 *           data-auth="on"          在顶栏渲染登录/注册/用户区（默认 off）
 *           data-footer="simple"    simple | full | none
 *   ></script>
 *
 * 依赖：css/base.css、js/icons.js
 * ============================================================ */
(function () {
    'use strict';

    var script = document.currentScript || (function () {
        var list = document.getElementsByTagName('script');
        return list[list.length - 1];
    })();

    var ds = (script && script.dataset) || {};
    var BASE = ds.base || './';
    var SHOW_AUTH = ds.auth === 'on';
    var FOOTER_KIND = ds.footer || 'simple';

    function icon(id) {
        return '<svg class="ico" aria-hidden="true"><use href="#' + id + '"/></svg>';
    }

    function buildHeader() {
        return ''
            + '<header class="topbar">'
            +   '<a class="topbar-brand" href="' + BASE + 'index.html">'
            +     '<span class="topbar-logo">AS</span>'
            +     '<span class="topbar-name">AlgoStep</span>'
            +     '<span class="topbar-divider"></span>'
            +     '<span class="topbar-tagline">算法实验室</span>'
            +   '</a>'
            +   '<div class="topbar-actions">'
            +     (SHOW_AUTH
                    ? '<button class="topbar-btn site-notification-button" id="siteNotificationBtn" type="button"'
                        + ' aria-label="消息通知" aria-expanded="false" aria-controls="siteNotificationLayer">'
                        + icon('i-bell')
                        + '<span class="site-notification-badge hidden" id="siteNotificationBadge">0</span>'
                        + '</button>'
                        + '<div class="auth-area" id="auth-area"></div>'
                    : '')
            +     '<a class="topbar-btn" href="' + BASE + 'index.html">' + icon('i-home') + '首页</a>'
            +     '<a class="topbar-btn" href="' + BASE + 'about.html">关于</a>'
            +     '<a class="topbar-btn topbar-btn-primary" href="https://github.com/BoyooDrew/AlgoStep"'
            +       ' target="_blank" rel="noopener">' + icon('i-star') + 'GitHub Star</a>'
            +   '</div>'
            + '</header>';
    }

    function buildFooter() {
        if (FOOTER_KIND === 'none') return '';

        if (FOOTER_KIND === 'full') {
            return ''
                + '<footer class="site-footer site-footer--full">'
                +   '<div class="site-footer-brand">AlgoStep · 算法实验室</div>'
                +   '<div class="site-footer-copy">© 2026 boyooDrew · AlgoStep 算法实验室 · MIT License</div>'
                + '</footer>';
        }

        return '<footer class="site-footer">© 2026 boyooDrew · AlgoStep 算法实验室 · MIT License</footer>';
    }

    /* =======================================================
     * 站内通知：顶栏未读角标 + 共享抽屉（S4）
     * ======================================================= */
    var notificationsMounted = false;
    var notificationState = {
        list: [],
        unread: Number(localStorage.getItem('algostep_unread') || 0),
        loading: false,
        error: ''
    };

    function hasToken() {
        return !!localStorage.getItem('algostep_token');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatTime(value) {
        if (!value) return '';
        return String(value).replace('T', ' ').slice(0, 16);
    }

    function setUnread(value) {
        var count = Math.max(0, Number(value) || 0);
        notificationState.unread = count;
        localStorage.setItem('algostep_unread', String(count));

        var badge = document.getElementById('siteNotificationBadge');
        if (badge) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.classList.toggle('hidden', count <= 0);
        }
        var readAll = document.getElementById('siteNotificationReadAll');
        if (readAll) readAll.disabled = count <= 0;
    }

    function refreshUnread() {
        if (!window.AlgoAPI || !hasToken()) {
            setUnread(0);
            return Promise.resolve(0);
        }
        return AlgoAPI.get('/notifications/unread-count', { silent: true, noLoading: true })
            .then(function (data) {
                var count = data && Number(data.unreadCount) || 0;
                setUnread(count);
                return count;
            })
            .catch(function () { return notificationState.unread; });
    }

    function renderNotificationList() {
        var list = document.getElementById('siteNotificationList');
        if (!list) return;

        if (notificationState.loading) {
            list.innerHTML = '<div class="site-notification-empty">正在加载通知…</div>';
            return;
        }
        if (notificationState.error) {
            list.innerHTML = '<div class="site-notification-empty">' +
                '<p>' + escapeHtml(notificationState.error) + '</p>' +
                '<button type="button" data-notification-retry>重新加载</button></div>';
            return;
        }
        if (!notificationState.list.length) {
            list.innerHTML = '<div class="site-notification-empty">' + icon('i-bell') +
                '<p>暂无通知</p><span>系统消息和学习提醒会出现在这里。</span></div>';
            return;
        }

        list.innerHTML = notificationState.list.map(function (item) {
            var unread = Number(item.isRead) !== 1;
            return '<article class="site-notification-item' + (unread ? ' is-unread' : '') + '">' +
                '<span class="site-notification-dot" aria-hidden="true"></span>' +
                '<div class="site-notification-content">' +
                    '<strong>' + escapeHtml(item.title || '系统通知') + '</strong>' +
                    '<p>' + escapeHtml(item.content || '') + '</p>' +
                    '<time>' + escapeHtml(formatTime(item.createTime)) + '</time>' +
                '</div>' +
                (unread
                    ? '<button class="site-notification-read" type="button" data-notification-read="' +
                        escapeHtml(item.id) + '">标为已读</button>'
                    : '') +
                '</article>';
        }).join('');
    }

    function loadNotifications() {
        if (!window.AlgoAPI || !hasToken() || notificationState.loading) return Promise.resolve();
        notificationState.loading = true;
        notificationState.error = '';
        renderNotificationList();

        return AlgoAPI.get('/notifications?pageNum=1&pageSize=6', { silent: true, noLoading: true })
            .then(function (data) {
                data = data || {};
                notificationState.list = Array.isArray(data.list) ? data.list : [];
                setUnread(data.unreadCount);
            })
            .catch(function (err) {
                notificationState.error = (err && err.msg) || '通知加载失败，请稍后重试';
            })
            .finally(function () {
                notificationState.loading = false;
                renderNotificationList();
            });
    }

    function openNotifications() {
        var layer = document.getElementById('siteNotificationLayer');
        var button = document.getElementById('siteNotificationBtn');
        if (!layer || !button) return;
        if (!hasToken()) {
            location.href = BASE + 'login.html?redirect=' + encodeURIComponent(location.pathname + location.hash);
            return;
        }
        layer.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
        var close = document.getElementById('siteNotificationClose');
        if (close) close.focus();
        refreshUnread();
        loadNotifications();
    }

    function closeNotifications() {
        var layer = document.getElementById('siteNotificationLayer');
        var button = document.getElementById('siteNotificationBtn');
        if (layer) layer.classList.add('hidden');
        if (button) {
            button.setAttribute('aria-expanded', 'false');
            button.focus();
        }
    }

    function markNotificationRead(id) {
        var target = notificationState.list.filter(function (item) {
            return Number(item.id) === Number(id);
        })[0];
        if (!target || Number(target.isRead) === 1) return;

        AlgoAPI.put('/notifications/' + id + '/read', {}, { silent: true, noLoading: true })
            .then(function () {
                target.isRead = 1;
                setUnread(notificationState.unread - 1);
                renderNotificationList();
            })
            .catch(function (err) {
                notificationState.error = (err && err.msg) || '标记已读失败';
                renderNotificationList();
            });
    }

    function markAllNotificationsRead() {
        if (!notificationState.unread) return;
        var button = document.getElementById('siteNotificationReadAll');
        if (button) button.disabled = true;

        AlgoAPI.put('/notifications/read-all', {}, { silent: true, noLoading: true })
            .then(function () {
                notificationState.list.forEach(function (item) { item.isRead = 1; });
                setUnread(0);
                renderNotificationList();
            })
            .catch(function (err) {
                notificationState.error = (err && err.msg) || '全部已读失败';
                renderNotificationList();
            })
            .finally(function () {
                if (button) button.disabled = notificationState.unread <= 0;
            });
    }

    function mountNotifications() {
        if (!SHOW_AUTH || notificationsMounted || document.getElementById('siteNotificationLayer')) return;
        notificationsMounted = true;

        document.body.insertAdjacentHTML('beforeend',
            '<div class="site-notification-layer hidden" id="siteNotificationLayer">' +
                '<aside class="site-notification-drawer" role="dialog" aria-modal="true" aria-labelledby="siteNotificationTitle">' +
                    '<header class="site-notification-head">' +
                        '<div><h2 id="siteNotificationTitle">消息通知</h2><p>系统消息与学习提醒</p></div>' +
                        '<button class="site-notification-close" id="siteNotificationClose" type="button" aria-label="关闭通知">' +
                            icon('i-close') + '</button>' +
                    '</header>' +
                    '<div class="site-notification-toolbar">' +
                        '<span>最近消息</span>' +
                        '<button id="siteNotificationReadAll" type="button">全部已读</button>' +
                    '</div>' +
                    '<div class="site-notification-list" id="siteNotificationList"></div>' +
                    '<a class="site-notification-more" href="' + BASE + 'profile.html#notifications">查看全部通知' +
                        icon('i-chevron-right') + '</a>' +
                '</aside>' +
            '</div>');

        var button = document.getElementById('siteNotificationBtn');
        var layer = document.getElementById('siteNotificationLayer');
        var list = document.getElementById('siteNotificationList');
        button.classList.toggle('hidden', !hasToken());
        button.addEventListener('click', openNotifications);
        document.getElementById('siteNotificationClose').addEventListener('click', closeNotifications);
        document.getElementById('siteNotificationReadAll').addEventListener('click', markAllNotificationsRead);
        layer.addEventListener('click', function (event) {
            if (event.target === layer) closeNotifications();
        });
        list.addEventListener('click', function (event) {
            var readButton = event.target.closest('[data-notification-read]');
            if (readButton) {
                markNotificationRead(Number(readButton.getAttribute('data-notification-read')));
                return;
            }
            if (event.target.closest('[data-notification-retry]')) loadNotifications();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !layer.classList.contains('hidden')) closeNotifications();
        });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && hasToken()) refreshUnread();
        });

        setUnread(notificationState.unread);
        renderNotificationList();
        refreshUnread();
    }

    window.AlgoNotifications = {
        setUnread: setUnread,
        refreshUnread: refreshUnread,
        open: openNotifications,
        close: closeNotifications
    };

    /* =======================================================
     * 通用确认对话框（替代浏览器原生 confirm）
     * 用法：
     *   AlgoDialog.confirm({
     *       title: '取消收藏',
     *       message: '确定取消收藏「冒泡排序」吗？',
     *       confirmText: '取消收藏',
     *       danger: true
     *   }).then(function (ok) { if (ok) { ... } });
     * ======================================================= */
    var dialog = null;

    function closeDialog(result) {
        if (!dialog) return;
        var current = dialog;
        dialog = null;
        current.layer.classList.remove('is-open');
        document.removeEventListener('keydown', current.onKeydown);
        window.setTimeout(function () {
            if (current.layer.parentNode) current.layer.parentNode.removeChild(current.layer);
        }, 180);
        if (current.previous && typeof current.previous.focus === 'function') {
            current.previous.focus();
        }
        current.resolve(result);
    }

    function confirmDialog(options) {
        options = options || {};
        if (dialog) closeDialog(false);

        return new Promise(function (resolve) {
            var previous = document.activeElement;
            var layer = document.createElement('div');
            layer.className = 'algo-dialog-layer';
            layer.innerHTML = ''
                + '<div class="algo-dialog" role="dialog" aria-modal="true"'
                +   ' aria-labelledby="algoDialogTitle" aria-describedby="algoDialogMessage">'
                +   '<h3 class="algo-dialog-title" id="algoDialogTitle">'
                +     escapeHtml(options.title || '确认操作')
                +   '</h3>'
                +   '<p class="algo-dialog-message" id="algoDialogMessage">'
                +     escapeHtml(options.message || '')
                +   '</p>'
                +   '<div class="algo-dialog-actions">'
                +     '<button class="algo-dialog-btn" type="button" data-dialog-cancel>'
                +       escapeHtml(options.cancelText || '取消')
                +     '</button>'
                +     '<button class="algo-dialog-btn ' + (options.danger ? 'is-danger' : 'is-primary')
                +       '" type="button" data-dialog-confirm>'
                +       escapeHtml(options.confirmText || '确定')
                +     '</button>'
                +   '</div>'
                + '</div>';

            function onKeydown(event) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeDialog(false);
                }
            }

            layer.addEventListener('click', function (event) {
                if (event.target.closest('[data-dialog-confirm]')) {
                    closeDialog(true);
                } else if (event.target === layer || event.target.closest('[data-dialog-cancel]')) {
                    closeDialog(false);
                }
            });
            document.addEventListener('keydown', onKeydown);

            document.body.appendChild(layer);
            dialog = { layer: layer, resolve: resolve, previous: previous, onKeydown: onKeydown };
            window.requestAnimationFrame(function () {
                layer.classList.add('is-open');
                var button = layer.querySelector('[data-dialog-confirm]');
                if (button) button.focus();
            });
        });
    }

    window.AlgoDialog = { confirm: confirmDialog };

    function mount() {
        var body = document.body;
        if (!body) return;

        // 顶部导航栏：始终位于 body 第一个视觉元素
        if (!body.querySelector('.topbar')) {
            body.insertAdjacentHTML('afterbegin', buildHeader());
        }

        // 底部信息栏：追加到 body 末尾
        if (!body.querySelector('.site-footer')) {
            var footer = buildFooter();
            if (footer) body.insertAdjacentHTML('beforeend', footer);
        }

        mountNotifications();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }

    window.AlgoSite = { mount: mount, base: BASE };
})();
