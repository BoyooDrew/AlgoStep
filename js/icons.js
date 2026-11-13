/* ============================================================
 * AlgoStep v2.0 · icons.js
 * 全站统一内联 SVG Sprite（24×24 线性风格）
 * 用法：<svg class="ico"><use href="#i-play"/></svg>
 * 建议放在 <body> 最前面，保证后续脚本同步可用
 * ============================================================ */
(function () {
    'use strict';

    if (document.getElementById('algo-icon-sprite')) return;
    if (!document.body) return;

    var sprite = ''
        + '<svg id="algo-icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" '
        + 'style="position:absolute;width:0;height:0;overflow:hidden">'
        + '<symbol id="i-play" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></symbol>'
        + '<symbol id="i-pause" viewBox="0 0 24 24"><rect x="14" y="5" width="4" height="14" rx="1"/><rect x="6" y="5" width="4" height="14" rx="1"/></symbol>'
        + '<symbol id="i-step-back" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></symbol>'
        + '<symbol id="i-step-next" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></symbol>'
        + '<symbol id="i-replay" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></symbol>'
        + '<symbol id="i-reset" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></symbol>'
        + '<symbol id="i-generate" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15.5-6.2"/><path d="M21 12a9 9 0 0 1-15.5 6.2"/><polyline points="18 3 18.5 8.5 13 9"/><polyline points="6 21 5.5 15.5 11 15"/></symbol>'
        + '<symbol id="i-database" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></symbol>'
        + '<symbol id="i-layout" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></symbol>'
        + '<symbol id="i-keyboard" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="7" y1="10" x2="7" y2="10"/><line x1="11" y1="10" x2="11" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></symbol>'
        + '<symbol id="i-code" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></symbol>'
        + '<symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>'
        + '<symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>'
        + '<symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>'
        + '<symbol id="i-star" viewBox="0 0 24 24"><polygon points="12 2 15.1 8.6 22 9.3 17 14 18.2 21 12 17.6 5.8 21 7 14 2 9.3 8.9 8.6 12 2"/></symbol>'
        + '<symbol id="i-link" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></symbol>'
        + '<symbol id="i-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></symbol>'
        + '<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></symbol>'
        + '<symbol id="i-cube" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/></symbol>'
        + '<symbol id="i-home" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 21 9 12 15 12 15 21"/></symbol>'
        + '<symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></symbol>'
        + '<symbol id="i-close" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></symbol>'
        + '</svg>';

    document.body.insertAdjacentHTML('afterbegin', sprite);
})();
