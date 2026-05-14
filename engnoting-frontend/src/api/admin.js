import { apiJSON } from './client.js';

export async function listUsers() {
  return apiJSON('/api/v1/admin/users');
}

export async function toggleAdmin(userId, isAdmin) {
  return apiJSON(`/api/v1/admin/users/${userId}/toggle-admin`, {
    method: 'POST',
    body: JSON.stringify({ is_admin: isAdmin }),
  });
}

export async function getStats() {
  return apiJSON('/api/v1/admin/stats');
}
