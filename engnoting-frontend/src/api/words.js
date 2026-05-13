import { apiJSON } from './client.js';

export async function listWords(limit = 50, offset = 0) {
  return apiJSON(`/api/v1/words?limit=${limit}&offset=${offset}`);
}

export async function getWord(id) {
  return apiJSON(`/api/v1/words/${id}`);
}

export async function createWord(text, context) {
  const body = { text };
  if (context) body.context = context;
  return apiJSON('/api/v1/words', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateWord(id, text, context) {
  const body = { text };
  if (context !== undefined) body.context = context;
  return apiJSON(`/api/v1/words/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function regenerateAI(id, text, context) {
  const body = { text };
  if (context) body.context = context;
  return apiJSON(`/api/v1/ai-words/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getQuizzes(id, type) {
  const url = type
    ? `/api/v1/words/${id}/quizzes?type=${type}`
    : `/api/v1/words/${id}/quizzes`;
  return apiJSON(url);
}
