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
            +     (SHOW_AUTH ? '<div class="auth-area" id="auth-area"></div>' : '')
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }

    window.AlgoSite = { mount: mount, base: BASE };
})();
