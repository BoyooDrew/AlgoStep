/* =====================================================
 * api.js —— 统一请求层（S0）
 *
 *   - API_BASE 自动推导：本地开发直连 8080，线上默认同域 /api（Nginx 反代）
 *     可通过 window.ALGOSTEP_API_BASE 覆盖（在引入本文件前声明即可）
 *   - 自动携带 Token；401 时用 refreshToken 静默刷新并重放一次
 *   - 统一业务码判断（code === 200 为成功），失败统一 Toast 并 reject
 *   - 全局 loading 遮罩（引用计数，嵌套请求只显示一层）
 *   - 可选参数：{ silent: true } 不弹 Toast，{ noLoading: true } 不显示遮罩
 *   - 暴露 window.AlgoAPI.request / get / post / put / del
 * ===================================================== */
(function () {
  'use strict';

  var TOKEN_KEY = 'algostep_token';
  var REFRESH_KEY = 'algostep_refresh';
  var USER_KEY = 'algostep_user';

  var API_BASE = (function () {
    if (window.ALGOSTEP_API_BASE) return window.ALGOSTEP_API_BASE.replace(/\/$/, '');
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080/api';
    }
    return location.origin + '/api';
  })();

  var loadingCount = 0;
  var refreshing = null;

  /* ---------- 全局 loading ---------- */
  function showLoading() {
    loadingCount++;
    var mask = document.getElementById('api-loading');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'api-loading';
      mask.setAttribute('aria-hidden', 'true');
      mask.innerHTML = '<div class="api-loading-spinner"></div>';
      document.body.appendChild(mask);
    }
    mask.classList.add('show');
  }

  function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
      var mask = document.getElementById('api-loading');
      if (mask) mask.classList.remove('show');
    }
  }

  /* ---------- 统一提示 ---------- */
  function toast(msg) {
    if (typeof window.showToast === 'function') return window.showToast(msg);
    console.warn('[AlgoAPI]', msg);
  }

  /* ---------- 底层请求 ---------- */
  function raw(url, options, noLoading) {
    if (noLoading) return fetch(url, options);
    showLoading();
    return fetch(url, options).finally(hideLoading);
  }

  /* ---------- Token 静默刷新（并发去重） ---------- */
  function tryRefresh() {
    var refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return Promise.reject(new Error('no refresh token'));
    if (refreshing) return refreshing;

    refreshing = fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken })
    })
      .then(function (res) { return res.json(); })
      .then(function (body) {
        if (!body || body.code !== 200 || !body.data) {
          throw new Error('refresh failed');
        }
        localStorage.setItem(TOKEN_KEY, body.data.token);
        localStorage.setItem(REFRESH_KEY, body.data.refreshToken);
        return body.data.token;
      })
      .finally(function () { refreshing = null; });

    return refreshing;
  }

  function clearAuthAndRedirect() {
    [TOKEN_KEY, REFRESH_KEY, USER_KEY, 'algostep_unread'].forEach(function (k) {
      localStorage.removeItem(k);
    });
    var base = window.AlgoSite && window.AlgoSite.base ? window.AlgoSite.base : './';
    var redirect = location.pathname + location.hash;
    location.href = base + 'login.html?redirect=' + encodeURIComponent(redirect);
  }

  /* ---------- 统一入口 ---------- */
  function request(path, options) {
    options = options || {};
    var silent = !!options.silent;
    var noLoading = !!options.noLoading;

    var reqOpts = {
      method: options.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers || {})
    };
    if (options.body !== undefined) reqOpts.body = options.body;
    if (options.credentials) reqOpts.credentials = options.credentials;
    if (options.keepalive) reqOpts.keepalive = true;

    var token = localStorage.getItem(TOKEN_KEY);
    if (token) reqOpts.headers['Authorization'] = 'Bearer ' + token;

    function send(opts) {
      return raw(API_BASE + path, opts, noLoading).then(function (res) {
        if (res.status === 401) {
          return tryRefresh()
            .then(function (newToken) {
              var retryOpts = {
                method: opts.method,
                headers: Object.assign({}, opts.headers, { 'Authorization': 'Bearer ' + newToken })
              };
              if (opts.body !== undefined) retryOpts.body = opts.body;
              if (opts.keepalive) retryOpts.keepalive = true;
              return raw(API_BASE + path, retryOpts, noLoading);
            })
            .catch(function () {
              clearAuthAndRedirect();
              throw { code: 401, msg: '登录已过期，请重新登录' };
            });
        }
        return res;
      }).then(function (res) {
        return res.json();
      });
    }

    return send(reqOpts).then(function (body) {
      if (!body || typeof body.code === 'undefined') return body;
      if (body.code === 200) return body.data;
      if (!silent) toast(body.msg || '请求失败');
      return Promise.reject(body);
    });
  }

  window.AlgoAPI = {
    API_BASE: API_BASE,
    request: request,
    get: function (path, opts) { return request(path, Object.assign({}, opts, { method: 'GET' })); },
    post: function (path, data, opts) {
      return request(path, Object.assign({}, opts, { method: 'POST', body: JSON.stringify(data || {}) }));
    },
    put: function (path, data, opts) {
      return request(path, Object.assign({}, opts, { method: 'PUT', body: JSON.stringify(data || {}) }));
    },
    del: function (path, opts) { return request(path, Object.assign({}, opts, { method: 'DELETE' })); },
    clearAuthAndRedirect: clearAuthAndRedirect
  };
})();
