import { apiJSON } from './client.js';

// opts: { limit?: number, from?: string (YYYY-MM-DD), to?: string, label?: string }
export async function startSession(opts = {}) {
  const body = {};
  if (opts.limit > 0) body.limit = opts.limit;
  if (opts.from)      body.from  = opts.from;
  if (opts.to)        body.to    = opts.to;
  return apiJSON('/api/v1/reviews/session', {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
