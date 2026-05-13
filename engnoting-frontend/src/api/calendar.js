import { apiJSON } from './client.js';

export async function getCalendarStats(from, to) {
  return apiJSON(`/api/v1/words/calendar-stats?from=${from}&to=${to}`);
}

export async function getCalendarSummary(from, to) {
  return apiJSON(`/api/v1/words/calendar-summary?from=${from}&to=${to}`);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthRange(offsetMonths = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  const year = d.getFullYear();
  const month = d.getMonth();
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
  return { from, to };
}
