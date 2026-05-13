import { apiJSON } from './client.js';

export async function startSession() {
  return apiJSON('/api/v1/reviews/session', { method: 'POST' });
}

export async function getCurrentItem(sessionId) {
  return apiJSON(`/api/v1/reviews/session/current?session_id=${sessionId}`);
}

export async function submitReview(sessionId, wordId, reviewType, result) {
  return apiJSON('/api/v1/reviews/submit', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      word_id: wordId,
      review_type: reviewType,
      result,
    }),
  });
}

export async function advanceSession(sessionId) {
  return apiJSON('/api/v1/reviews/session/advance', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}
