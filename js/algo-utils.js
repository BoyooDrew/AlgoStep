/* ============================================================
 * AlgoStep v2.0 · algo-utils.js
 * 算法展示页共享小工具（从各算法页提炼去重）：
 *   - parseNumArray(str)                 解析逗号/空白分隔的数字串
 *   - randomIntArray(minLen,maxLen,minVal,maxVal)  生成随机整数数组
 *
 * 用法：<script src="../js/algo-utils.js"></script>
 * 暴露全局函数，页面直接调用即可。
 * ============================================================ */
(function () {
    'use strict';

    /* 解析 "5,2,9,1" 或 "5 2 9 1" → [5,2,9,1]，非法片段自动丢弃 */
    function parseNumArray(str) {
        return String(str == null ? '' : str)
            .split(/[,\s]+/)
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; })
            .map(Number)
            .filter(function (n) { return !isNaN(n); });
    }

    /* 生成随机整数数组：长度 ∈ [minLen,maxLen]，值 ∈ [minVal,maxVal] */
    function randomIntArray(minLen, maxLen, minVal, maxVal) {
        var len = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
        var arr = [];
        for (var i = 0; i < len; i++) {
            arr.push(minVal + Math.floor(Math.random() * (maxVal - minVal + 1)));
        }
        return arr;
    }

    window.parseNumArray = parseNumArray;
    window.randomIntArray = randomIntArray;
})();
