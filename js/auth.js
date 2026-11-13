/**
 * auth.js —— 前端认证工具
 *
 * 依赖：js/api.js（统一请求层，须在本文件之前引入）
 *
 * 功能：
 *   - 登录 / 注册 / 登出 API 调用
 *   - JWT Token 管理（localStorage）
 *   - 登录状态检测与 UI 更新
 */

const TOKEN_KEY = 'algostep_token';
const REFRESH_KEY = 'algostep_refresh';
const USER_KEY = 'algostep_user';
const UNREAD_KEY = 'algostep_unread';   // 新增：顶栏未读角标缓存

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ====== Token 管理 ====== */
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

function setAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify({
    userId: data.userId,
    username: data.username,
    nickname: data.nickname,
    role: data.role
  }));
  localStorage.removeItem(UNREAD_KEY);   // 新增：清除未读角标缓存
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(UNREAD_KEY);   // 新增：清除未读角标缓存
}

function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * 局部更新 localStorage 中的用户信息，并刷新顶栏
 * @param {Object} partial 例如 { nickname: '新昵称', avatar: 'https://...' }
 */
function updateCachedUser(partial) {
  const current = getUser() || {};
  const next = Object.assign({}, current, partial || {});
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  updateAuthUI();
  return next;
}

function isLoggedIn() {
  return !!getToken();
}

function siteUrl(path) {
  const base = window.AlgoSite && window.AlgoSite.base ? window.AlgoSite.base : './';
  return base + path;
}

function safeAvatarUrl(raw) {
  const url = typeof raw === 'string' ? raw.trim() : '';
  return /^(https?:\/\/|\/\/|\.{0,2}\/)/i.test(url) ? url : '';
}

/* ====== API 调用（统一走 js/api.js） ====== */
async function loginAPI(username, password) {
  return AlgoAPI.post('/auth/login', { username, password }, { silent: true });
}

async function registerAPI(username, email, password) {
  return AlgoAPI.post('/auth/register', { username, email, password }, { silent: true });
}

async function logoutAPI() {
  if (getToken()) {
    try {
      await AlgoAPI.post('/auth/logout', {}, { silent: true, noLoading: true });
    } catch (e) {
      // 网络错误不影响前端登出
    }
  }
  clearAuth();
}

/* ====== 通用请求封装（带 Token，401 由 api.js 统一处理） ====== */
function authFetch(path, options = {}) {
  return AlgoAPI.request(path, options);
}

/* ====== UI 更新 ====== */
function updateAuthUI() {
  const user = getUser();
  const container = document.getElementById('auth-area');
  if (!container) return;

  if (user) {
    const displayName = user.nickname || user.username || '用户';
    const initial = String(displayName).trim().charAt(0).toUpperCase() || 'U';
    const avatar = safeAvatarUrl(user.avatar);

    // 有头像 URL 时渲染图片；图片加载失败自动移除，露出首字母
    const avatarHtml = avatar
      ? '<span class="user-avatar">' +
          '<span class="avatar-fallback">' + escapeHtml(initial) + '</span>' +
          '<img src="' + escapeHtml(avatar) + '" alt="" onerror="this.remove()">' +
        '</span>'
      : '<span class="user-avatar">' + escapeHtml(initial) + '</span>';

    const unread = Number(localStorage.getItem(UNREAD_KEY) || 0);
    const unreadHtml = unread > 0
      ? '<span class="dropdown-badge">' + (unread > 99 ? '99+' : unread) + '</span>'
      : '';

    container.innerHTML = `
      <div class="user-badge" onclick="toggleUserMenu(event)">
        ${avatarHtml}
        <span class="user-name">${escapeHtml(displayName)}</span>
        <div class="user-dropdown" id="user-dropdown">
          <a href="${siteUrl('profile.html')}">个人中心</a>
          <a href="${siteUrl('profile.html#progress')}">学习进度</a>
          <a href="${siteUrl('profile.html#favorites')}">我的收藏</a>
          <a href="${siteUrl('profile.html#notifications')}">消息通知${unreadHtml}</a>
          <a href="javascript:void(0)" class="danger" onclick="handleLogout()">退出登录</a>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <a href="${siteUrl('login.html')}" class="auth-btn login-btn">登录</a>
      <a href="${siteUrl('register.html')}" class="auth-btn register-btn">注册</a>
    `;
  }
}

function toggleUserMenu(event) {
  if (event) event.stopPropagation();
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.toggle('show');
}

document.addEventListener('click', function() {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.remove('show');
});

async function handleLogout() {
  await logoutAPI();
  window.location.href = siteUrl('index.html');
}

/* ====== 页面加载时自动更新 ====== */
document.addEventListener('DOMContentLoaded', updateAuthUI);
