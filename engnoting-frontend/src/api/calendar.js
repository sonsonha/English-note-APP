import { apiJSON } from './client.js';

const TZ_KEY = 'eng_tz';

export function getTimezone() {
  return localStorage.getItem(TZ_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function setTimezone(tz) {
  localStorage.setItem(TZ_KEY, tz);
  window.dispatchEvent(new CustomEvent('tz-change', { detail: tz }));
}

// Format a Date as YYYY-MM-DD in the given timezone (defaults to user preference)
export function isoInTZ(date, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || getTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function getCalendarStats(from, to) {
  return apiJSON(`/api/v1/words/calendar-stats?from=${from}&to=${to}`);
}

export async function getCalendarSummary(from, to) {
  return apiJSON(`/api/v1/words/calendar-summary?from=${from}&to=${to}`);
}

export async function backfillStats() {
  return apiJSON('/api/v1/stats/backfill', { method: 'POST' });
}

export function todayISO(tz) {
  return isoInTZ(new Date(), tz);
}

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7),
    year: d.getUTCFullYear(),
  };
}

export function dayRange(offsetDays = 0, tz) {
  const resolvedTZ = tz || getTimezone();
  const base = isoInTZ(new Date(), resolvedTZ);
  const [y, m, d] = base.split('-').map(Number);
  const date = new Date(y, m - 1, d + offsetDays);
  const iso = isoInTZ(date, resolvedTZ);
  return { from: iso, to: iso, iso, date };
}

export function weekRange(offsetWeeks = 0, tz) {
  const resolvedTZ = tz || getTimezone();
  const base = isoInTZ(new Date(), resolvedTZ);
  const [y, m, d] = base.split('-').map(Number);
  const today = new Date(y, m - 1, d);
  const daysToMon = (today.getDay() + 6) % 7;
  const monday = new Date(y, m - 1, d - daysToMon + offsetWeeks * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const from = isoInTZ(monday, resolvedTZ);
  const to   = isoInTZ(sunday, resolvedTZ);
  const { week: weekNum, year } = isoWeekNumber(monday);
  return { from, to, weekNum, year, monday, sunday };
}

export function quarterRange(offsetQuarters = 0, tz) {
  const resolvedTZ = tz || getTimezone();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTZ, year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  let year  = parseInt(parts.find(p => p.type === 'year').value);
  let month = parseInt(parts.find(p => p.type === 'month').value) - 1;

  let q = Math.floor(month / 3) + offsetQuarters;
  while (q > 3) { q -= 4; year++; }
  while (q < 0) { q += 4; year--; }

  const startMonth = q * 3;
  const endMonth   = startMonth + 2;
  const lastDay    = new Date(year, endMonth + 1, 0).getDate();
  const fromMM     = String(startMonth + 1).padStart(2, '0');
  const toMM       = String(endMonth + 1).padStart(2, '0');
  return {
    from: `${year}-${fromMM}-01`,
    to:   `${year}-${toMM}-${String(lastDay).padStart(2, '0')}`,
    year,
    quarter: q + 1,
    startMonth,
  };
}

export function monthRange(offsetMonths = 0, tz) {
  const resolvedTZ = tz || getTimezone();
  const now = new Date();
  // Get year/month in the target timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  let year = parseInt(parts.find(p => p.type === 'year').value);
  let month = parseInt(parts.find(p => p.type === 'month').value) - 1; // 0-indexed

  month += offsetMonths;
  while (month > 11) { month -= 12; year++; }
  while (month < 0)  { month += 12; year--; }

  const mm = String(month + 1).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${mm}-01`,
    to:   `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    year,
    month,
  };
}
