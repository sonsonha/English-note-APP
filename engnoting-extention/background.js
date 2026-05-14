const DEFAULT_API_BASE = 'http://localhost:8080';

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get('apiBase');
  return apiBase || DEFAULT_API_BASE;
}

async function getToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken || null;
}

async function apiFetch(path, options = {}) {
  const base = await getApiBase();
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  return res;
}

async function handleLogin({ email, password }) {
  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Login failed' };
    await chrome.storage.local.set({ authToken: data.access_token, userEmail: email });
    return { success: true, email };
  } catch (e) {
    return { success: false, error: 'Cannot reach server' };
  }
}

async function handleLogout() {
  await chrome.storage.local.remove(['authToken', 'userEmail']);
  return { success: true };
}

async function handleGetStatus() {
  const { authToken, userEmail } = await chrome.storage.local.get(['authToken', 'userEmail']);
  return { loggedIn: !!authToken, email: userEmail || null };
}

async function handleSaveWord({ word, sentence, pageUrl }) {
  const token = await getToken();
  if (!token) return { success: false, error: 'not_authenticated' };
  try {
    const res = await apiFetch('/api/v1/words', {
      method: 'POST',
      body: JSON.stringify({ text: word, context: sentence, source: pageUrl }),
    });
    const data = await res.json();
    if (res.status === 409) return { success: false, error: 'already_saved' };
    if (!res.ok) return { success: false, error: data.error || 'Failed to save' };
    return { success: true, wordId: data.word_id };
  } catch (e) {
    return { success: false, error: 'Cannot reach server' };
  }
}

async function handleGetWordsBySource({ url }) {
  const token = await getToken();
  if (!token) return { success: false, error: 'not_authenticated', words: [] };
  try {
    const res = await apiFetch(`/api/v1/words/by-source?url=${encodeURIComponent(url)}`);
    if (!res.ok) return { success: false, error: 'Failed to fetch', words: [] };
    const data = await res.json();
    return { success: true, words: data.words || [] };
  } catch (e) {
    return { success: false, error: 'Cannot reach server', words: [] };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const dispatch = async () => {
    switch (message.type) {
      case 'login':         return handleLogin(message);
      case 'logout':        return handleLogout();
      case 'getStatus':     return handleGetStatus();
      case 'saveWord':      return handleSaveWord(message);
      case 'getWordsBySource': return handleGetWordsBySource(message);
      default:              return { success: false, error: 'unknown message type' };
    }
  };
  dispatch().then(sendResponse);
  return true; // keep channel open for async response
});
