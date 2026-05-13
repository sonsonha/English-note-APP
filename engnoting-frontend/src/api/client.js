let accessToken = null;

export function setToken(token) {
  accessToken = token;
}

export function clearToken() {
  accessToken = null;
}

export function getToken() {
  return accessToken;
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

let refreshPromise = null;

async function doRefresh() {
  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return false;
  const data = await res.json();
  accessToken = data.access_token;
  return true;
}

async function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401 && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return fetch(path, {
        ...options,
        credentials: 'include',
        headers: {
          ...headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    }
    clearToken();
    throw new AuthError('Session expired');
  }

  return res;
}

export async function apiJSON(path, options = {}) {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const body = await res.json(); msg = body.error || msg; } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}
