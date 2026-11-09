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
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function isLoggedIn() {
  return !!getToken();
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
    container.innerHTML = `
      <div class="user-badge" onclick="toggleUserMenu(event)">
        <span class="user-avatar">${user.username.charAt(0).toUpperCase()}</span>
        <span class="user-name">${user.nickname || user.username}</span>
        <div class="user-dropdown" id="user-dropdown">
          <a href="javascript:void(0)" onclick="handleLogout()">登出</a>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <a href="./login.html" class="auth-btn login-btn">登录</a>
      <a href="./register.html" class="auth-btn register-btn">注册</a>
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
  window.location.href = './index.html';
}

/* ====== 页面加载时自动更新 ====== */
document.addEventListener('DOMContentLoaded', updateAuthUI);
