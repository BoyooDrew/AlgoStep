/* =====================================================
 * analytics.js —— GoatCounter 访问统计注入
 * 由首页 / 关于页引入，异步加载统计脚本。
 * ===================================================== */
(function () {
    'use strict';

    var s = document.createElement('script');
    s.setAttribute('data-goatcounter', 'https://algo-step.goatcounter.com/count');
    s.setAttribute('async', '');
    s.src = '/js/goatcounter.js';
    document.body.appendChild(s);
})();
