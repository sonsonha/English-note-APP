import { apiJSON } from './client.js';

export async function getTopics() {
  return apiJSON('/api/v1/topics');
}

export async function getTopicWords(topic, limit = 50, offset = 0) {
  return apiJSON(`/api/v1/topics/${encodeURIComponent(topic)}/words?limit=${limit}&offset=${offset}`);
}
