import { apiJSON, setToken, clearToken } from './client.js';

export async function register(email, password) {
  return apiJSON('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email, password) {
  const data = await apiJSON('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function refresh() {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    setToken(data.access_token);
    return data;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await apiJSON('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}
