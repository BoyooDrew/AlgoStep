/* ============================================================
 * AlgoStep v2.0 · algo-nav.js
 * 算法页面包屑导航：首页 / 算法目录（二级下拉） / 当前页
 *
 * 用法（放在 </body> 前，页面已有对应 DOM）：
 *   AlgoNav.init({
 *       current: { category: 'dp', page: '爬楼梯' },
 *       base: '',              // 资源相对前缀，algorithms/ 下用 ''，子目录用 '../'
 *       home: '../index.html'  // 首页链接
 *   });
 * ============================================================ */
(function () {
    'use strict';

    var NAV_TREE = {
        sort: { label: '排序算法', items: [
            ['冒泡排序', 'sort/bubble-sort.html'],
            ['选择排序', 'sort/selection-sort.html'],
            ['插入排序', 'sort/insertion-sort.html'],
            ['快速排序', 'sort/quick-sort.html']
        ]},
        search: { label: '查找与遍历', items: [
            ['二分查找', 'search/binary-search.html'],
            ['广度优先搜索', 'search/bfs.html'],
            ['深度优先搜索', 'search/dfs.html']
        ]},
        dp: { label: '动态规划', items: [
            ['爬楼梯', 'dp/climb-stairs.html'],
            ['0-1 背包', 'dp/0-1knapsack.html'],
            ['完全背包', 'dp/complete-knapsack.html'],
            ['最长公共子序列', 'dp/lcs.html'],
            ['最长递增子序列', 'dp/lis.html']
        ]},
        template: { label: '开发模板', items: [
            ['模板页', 'template.html']
        ]}
    };

    function $(id) { return document.getElementById(id); }

    function init(options) {
        options = options || {};
        var current = options.current || {};
        var base = options.base || '';
        var toggle = $(options.toggleId || 'navToggle');
        if (!toggle) return;

        var keys = Object.keys(NAV_TREE);

        // 两级面板：左「大类」→ 右「该类的具体算法」
        var menu = document.createElement('div');
        menu.className = 'nav-menu';
        menu.id = options.menuId || 'navMenu';
        menu.setAttribute('role', 'menu');
        menu.innerHTML = '<div class="nav-pane nav-pane--root" id="navRoot"></div>'
                       + '<div class="nav-pane nav-pane--sub" id="navSub"></div>';
        document.body.appendChild(menu);

        var rootPane = menu.querySelector('#navRoot');
        var subPane = menu.querySelector('#navSub');

        rootPane.innerHTML = keys.map(function (key) {
            return '<button class="nav-cat" type="button" role="menuitem" data-cat="' + key + '">'
                + '<span>' + NAV_TREE[key].label + '</span>'
                + '<svg class="ico" aria-hidden="true"><use href="#i-chevron-right"/></svg>'
                + '</button>';
        }).join('');

        function renderSub(key) {
            var group = NAV_TREE[key];
            if (!group) return;

            rootPane.querySelectorAll('.nav-cat').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-cat') === key);
            });

            subPane.innerHTML = '<div class="nav-group-title">' + group.label + '</div>'
                + group.items.map(function (it) {
                    var cur = (key === current.category && it[0] === current.page);
                    return '<a class="nav-item' + (cur ? ' current' : '') + '" href="' + base + it[1] + '" role="menuitem">'
                        + '<span>' + it[0] + '</span>'
                        + (cur ? '<span class="nav-item-tag">当前</span>' : '')
                        + '</a>';
                }).join('');
        }

        rootPane.addEventListener('mouseover', function (e) {
            var btn = e.target.closest('.nav-cat');
            if (btn) renderSub(btn.getAttribute('data-cat'));
        });
        rootPane.addEventListener('focusin', function (e) {
            var btn = e.target.closest('.nav-cat');
            if (btn) renderSub(btn.getAttribute('data-cat'));
        });
        rootPane.addEventListener('click', function (e) {
            var btn = e.target.closest('.nav-cat');
            if (btn) {
                renderSub(btn.getAttribute('data-cat'));
                e.stopPropagation();
            }
        });

        var cat = NAV_TREE[current.category];
        var categoryEl = $(options.categoryId || 'navCategory');
        var currentEl = $(options.currentId || 'navCurrent');
        if (categoryEl) categoryEl.textContent = cat ? cat.label : '算法目录';
        if (currentEl) currentEl.textContent = current.page || '—';

        var homeEl = $(options.homeId || 'navHome');
        if (homeEl && options.home) homeEl.setAttribute('href', options.home);

        renderSub(cat ? current.category : keys[0]);

        function place() {
            var r = toggle.getBoundingClientRect();
            var w = menu.offsetWidth;
            var left = r.left;
            if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
            menu.style.left = Math.max(8, left) + 'px';
            menu.style.top = (r.bottom + 6) + 'px';
        }

        function openMenu() {
            menu.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
            place();
        }

        function closeMenu() {
            menu.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            menu.classList.contains('open') ? closeMenu() : openMenu();
        });
        document.addEventListener('click', function (e) {
            if (!menu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
        });
        window.addEventListener('scroll', closeMenu);
        window.addEventListener('resize', function () {
            if (menu.classList.contains('open')) place();
        });
    }

    window.AlgoNav = { TREE: NAV_TREE, init: init };
})();
