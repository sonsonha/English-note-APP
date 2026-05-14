const loginView    = document.getElementById('login-view');
const loggedinView = document.getElementById('loggedin-view');
const emailInput   = document.getElementById('email');
const passwordInput= document.getElementById('password');
const loginBtn     = document.getElementById('login-btn');
const loginError   = document.getElementById('login-error');
const logoutBtn    = document.getElementById('logout-btn');
const userEmailEl  = document.getElementById('user-email');
const userAvatarEl = document.getElementById('user-avatar');
const apiBaseInput = document.getElementById('api-base-input');
const apiSaveBtn   = document.getElementById('api-save-btn');
const apiSavedEl   = document.getElementById('api-saved');

function showLoggedIn(email) {
  loginView.style.display = 'none';
  loggedinView.style.display = 'block';
  userEmailEl.textContent = email;
  userAvatarEl.textContent = email ? email[0].toUpperCase() : '?';
}

function showLogin() {
  loginView.style.display = 'block';
  loggedinView.style.display = 'none';
  loginError.textContent = '';
}

// ── Init: check auth state ────────────────────────────────────────────────
chrome.runtime.sendMessage({ type: 'getStatus' }, (res) => {
  if (res && res.loggedIn) {
    showLoggedIn(res.email);
  } else {
    showLogin();
  }
});

// ── Load saved API base ───────────────────────────────────────────────────
chrome.storage.local.get('apiBase', ({ apiBase }) => {
  apiBaseInput.value = apiBase || 'http://localhost:8080';
});

// ── Login ─────────────────────────────────────────────────────────────────
loginBtn.addEventListener('click', async () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    loginError.textContent = 'Email and password are required.';
    return;
  }
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in…';
  loginError.textContent = '';

  chrome.runtime.sendMessage({ type: 'login', email, password }, (res) => {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log in';
    if (res && res.success) {
      showLoggedIn(email);
    } else {
      loginError.textContent = (res && res.error) || 'Login failed.';
    }
  });
});

// Allow Enter key to submit login
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});
emailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') passwordInput.focus();
});

// ── Logout ────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'logout' }, () => showLogin());
});

// ── Save API base URL ─────────────────────────────────────────────────────
apiSaveBtn.addEventListener('click', () => {
  const val = apiBaseInput.value.trim().replace(/\/$/, '');
  if (!val) return;
  chrome.storage.local.set({ apiBase: val }, () => {
    apiSavedEl.textContent = 'Saved!';
    setTimeout(() => { apiSavedEl.textContent = ''; }, 2000);
  });
});
