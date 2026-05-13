import { useState, useEffect } from 'react';
import Icon from '../components/Icons.jsx';
import {
  getCalendarStats, isoInTZ, getTimezone,
  weekRange, monthRange, quarterRange,
} from '../api/calendar.js';

const STATUS_STYLES = {
  fallow:   { bg: 'var(--rose-soft)',    color: 'var(--rose)',         name: 'Fallow'   },
  tending:  { bg: 'var(--butter-soft)', color: 'var(--butter-deep)',  name: 'Tending'  },
  steady:   { bg: 'var(--mint-soft)',   color: 'var(--mint-deep)',    name: 'Steady'   },
  mastered: { bg: 'var(--forest-soft)', color: 'var(--forest-deep)',  name: 'Mastered' },
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_ABBR  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_FULL    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function aggregateStats(dailyStats) {
  const days = (dailyStats || []).filter(Boolean);
  if (!days.length) return null;
  const totalAdded    = days.reduce((a, s) => a + (s.AddedWordsCount ?? 0), 0);
  const totalReviewed = days.reduce((a, s) => a + (s.ReviewedWordsCount ?? 0), 0);
  const activeDays    = days.filter(s => s.AddedWordsCount > 0);
  const avgAccuracy   = activeDays.length
    ? activeDays.reduce((a, s) => a + (s.AccuracyRate ?? 0), 0) / activeDays.length
    : 0;
  const reviewRate = totalAdded > 0 ? Math.min(totalReviewed / totalAdded, 1) : 0;
  let status = 'fallow';
  if (totalAdded > 0 && totalReviewed === 0) status = 'tending';
  else if (totalAdded > 0 && avgAccuracy >= 0.8) status = 'mastered';
  else if (totalAdded > 0 && avgAccuracy >= 0.6) status = 'steady';
  else if (totalAdded > 0) status = 'tending';
  return { totalAdded, totalReviewed, avgAccuracy, reviewRate, status };
}

function pct(n) { return `${Math.round((n || 0) * 100)}%`; }

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ── Reusable period summary card ──────────────────────────────────────────────
function PeriodSummary({ agg, label, from, to, goToReview, goToLibrary, libraryScope }) {
  const sty = agg?.status && agg.status !== 'fallow' ? STATUS_STYLES[agg.status] : null;
  return (
    <div className="card" style={{
      padding: 24,
      background: sty ? sty.bg : 'var(--paper)',
      border: `1.5px solid ${sty ? sty.color : 'var(--paper-edge)'}`,
    }}>
      <div className="row between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <span className="kicker" style={{ color: sty?.color || 'var(--ink-mute)' }}>{label}</span>
        {agg?.status && agg.status !== 'fallow' && (
          <span style={{
            fontSize: 11, padding: '2px 10px', borderRadius: 999,
            border: `1px solid ${sty?.color}`, color: sty?.color,
            background: 'rgba(255,255,255,0.35)',
          }}>
            {STATUS_STYLES[agg.status].name}
          </span>
        )}
      </div>
      {(!agg || agg.totalAdded === 0) ? (
        <p className="faint" style={{ margin: 0 }}>No words added yet.</p>
      ) : (
        <>
          <div className="row between" style={{ flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
            <div className="row" style={{ gap: 28, flexWrap: 'wrap' }}>
              {[
                { n: agg.totalAdded,       lbl: 'words'    },
                { n: pct(agg.reviewRate),  lbl: 'reviewed' },
                { n: pct(agg.avgAccuracy), lbl: 'accuracy' },
              ].map(({ n, lbl }) => (
                <div key={lbl}>
                  <div style={{
                    fontFamily: 'var(--display)', fontWeight: 800, fontSize: 32,
                    letterSpacing: '-0.02em', color: sty?.color || 'var(--ink)', lineHeight: 1,
                  }}>{n}</div>
                  <div className="faint" style={{ fontSize: 11, fontWeight: 600, marginTop: 3 }}>{lbl}</div>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 10, flexShrink: 0 }}>
              {goToLibrary && libraryScope && (
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}
                  onClick={() => goToLibrary(libraryScope)}>
                  Open library →
                </button>
              )}
              {goToReview && (
                <button className="btn btn-primary" style={{ fontSize: 13 }}
                  onClick={() => goToReview({ from, to, label, limit: Math.min(agg.totalAdded, 30) })}>
                  <Icon name="play" size={13} /> Review
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthView({
  stats, info, todayISO, tz,
  goToReview, goToLibrary, jumpTo,
  periodLabel, onPrev, onNext, canNext, onToday, showToday,
}) {
  const { year, month } = info;

  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const iso  = isoInTZ(date, tz);
    const stat = stats.find(s => (s.StatDate || '').slice(0, 10) === iso);
    cells.push({ date, iso, stat });
  }
  while (cells.length % 7) cells.push(null);

  const weeks    = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const monthAgg = aggregateStats(stats);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PeriodSummary
        agg={monthAgg}
        label={`${MONTH_NAMES[month]} ${year} summary`}
        from={info.from}
        to={info.to}
        goToReview={goToReview}
        goToLibrary={goToLibrary}
        libraryScope={{ kind: 'month', value: info.from }}
      />

      <div className="card" style={{ padding: 24 }}>
        {/* Navigation */}
        <div className="row" style={{ gap: 8, marginBottom: 20, alignItems: 'center' }}>
          <button className="btn btn-icon btn-ghost" onClick={onPrev}>
            <Icon name="chevL" size={14} />
          </button>
          <h2 style={{
            fontSize: 22, fontFamily: 'var(--display)', fontWeight: 700,
            letterSpacing: '-0.01em', padding: '0 4px',
          }}>
            {periodLabel}
          </h2>
          <button className="btn btn-icon btn-ghost" onClick={onNext} disabled={!canNext}>
            <Icon name="chevR" size={14} />
          </button>
          {showToday && (
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, marginLeft: 4 }}
              onClick={onToday}>
              Today
            </button>
          )}
        </div>

        {/* Header row: week column + day names */}
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingLeft: 6 }}>
            <div style={{ width: 3, height: 10, borderRadius: 2, background: 'var(--ink-faint)', opacity: 0.4 }} />
            <span className="kicker" style={{ fontSize: 10, letterSpacing: '0.07em', color: 'var(--ink-faint)' }}>WK</span>
          </div>
          {DAY_FULL.map(d => (
            <div key={d} className="kicker" style={{
              textAlign: 'center', fontSize: 10, letterSpacing: '0.07em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, wi) => {
          const firstCell = week.find(c => c !== null);
          let weekNum = null;
          let mondayISO = null;
          if (firstCell) {
            const dow    = (firstCell.date.getDay() + 6) % 7;
            const monday = new Date(firstCell.date.getFullYear(), firstCell.date.getMonth(), firstCell.date.getDate() - dow);
            weekNum   = getISOWeek(monday);
            mondayISO = isoInTZ(monday, tz);
          }
          const weekAgg = aggregateStats(week.filter(Boolean).map(c => c.stat));
          const weekSty = weekAgg?.status && weekAgg.status !== 'fallow' ? STATUS_STYLES[weekAgg.status] : null;

          return (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
              {/* Week label cell */}
              <div
                role={mondayISO ? 'button' : undefined}
                tabIndex={mondayISO ? 0 : -1}
                title={weekNum ? `Week ${weekNum} — open week view` : undefined}
                onClick={() => mondayISO && jumpTo('week', mondayISO)}
                onKeyDown={e => e.key === 'Enter' && mondayISO && jumpTo('week', mondayISO)}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between', alignItems: 'center',
                  borderRadius: 10, minHeight: 100,
                  background: 'var(--paper)',
                  border: '1.5px solid var(--rule)',
                  cursor: mondayISO ? 'pointer' : 'default',
                  padding: '10px 5px 9px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.12s',
                }}
              >
                {/* Left accent stripe — primary visual differentiator */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                  background: weekSty?.color || 'var(--ink-faint)',
                  opacity: weekSty ? 1 : 0.25,
                  borderRadius: '10px 0 0 10px',
                }} />

                {/* Week label */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: weekSty?.color || 'var(--ink-faint)',
                    marginBottom: 2,
                  }}>
                    WEEK
                  </div>
                  <div style={{
                    fontFamily: 'var(--display)', fontWeight: 800, fontSize: 17, lineHeight: 1,
                    color: weekSty?.color || 'var(--ink-mute)',
                  }}>
                    {weekNum ?? '–'}
                  </div>
                </div>

                {/* Stats */}
                {weekAgg && weekAgg.totalAdded > 0 ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16, lineHeight: 1,
                      color: weekSty?.color || 'var(--ink-2)',
                    }}>
                      {weekAgg.totalAdded}
                    </div>
                    <div style={{
                      fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                      color: weekSty?.color || 'var(--ink-faint)', marginTop: 2,
                    }}>
                      WDS
                    </div>
                  </div>
                ) : <div />}

                {/* Footer */}
                <div style={{ fontSize: 9, color: weekSty?.color || 'var(--ink-faint)', textAlign: 'center' }}>
                  {weekAgg && weekAgg.totalAdded > 0
                    ? pct(weekAgg.avgAccuracy)
                    : <span style={{ opacity: 0.4, fontSize: 11 }}>↗</span>
                  }
                </div>
              </div>

              {/* Day cells */}
              {week.map((c, i) => {
                if (!c) return <div key={i} style={{ minHeight: 100 }} />;
                const status = c.stat?.Status;
                const sty    = status ? STATUS_STYLES[status] : null;
                const today_ = c.iso === todayISO;
                const future = c.iso > todayISO;
                const count  = c.stat?.AddedWordsCount ?? 0;

                return (
                  <div
                    key={i}
                    role={!future && count > 0 ? 'button' : undefined}
                    tabIndex={!future && count > 0 ? 0 : -1}
                    onClick={() => !future && count > 0 && goToLibrary({ kind: 'day', value: c.iso })}
                    onKeyDown={e => e.key === 'Enter' && !future && count > 0 && goToLibrary({ kind: 'day', value: c.iso })}
                    style={{
                      minHeight: 100,
                      borderRadius: 12,
                      background: sty ? sty.bg : 'var(--paper-2)',
                      border: today_ ? '2px solid var(--accent)' : `1.5px solid ${sty ? sty.color + '55' : 'var(--paper-edge)'}`,
                      cursor: !future && count > 0 ? 'pointer' : 'default',
                      opacity: future ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden',
                      transition: 'transform 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px 0' }}>
                      <span style={{
                        fontSize: 14, fontWeight: today_ ? 700 : 400, lineHeight: 1,
                        color: today_ ? 'var(--accent)' : sty ? sty.color : 'var(--ink-mute)',
                      }}>
                        {String(c.date.getDate()).padStart(2, '0')}
                      </span>
                      {today_ && (
                        <span className="mono" style={{ fontSize: 8, color: 'var(--accent)', letterSpacing: '0.12em', fontWeight: 700 }}>
                          TODAY
                        </span>
                      )}
                    </div>

                    {count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px 10px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'baseline', gap: 3,
                          padding: '3px 9px', borderRadius: 999,
                          background: 'rgba(255,255,255,0.65)',
                          border: '1px solid rgba(0,0,0,0.07)',
                          fontSize: 12, lineHeight: 1,
                        }}>
                          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13 }}>{count}</span>
                          <span style={{ color: 'var(--ink-mute)', fontSize: 11 }}>
                            {count === 1 ? 'word' : 'words'}
                          </span>
                        </span>
                        {!future && goToReview && (
                          <button
                            title="Review this day"
                            onClick={e => { e.stopPropagation(); goToReview({ from: c.iso, to: c.iso, label: c.iso, limit: count }); }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 22, height: 22, borderRadius: 999, border: 'none',
                              background: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                              color: sty?.color || 'var(--ink-mute)', flexShrink: 0,
                            }}
                          >
                            <Icon name="play" size={9} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Legend */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--paper-edge)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="kicker" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>Legend</span>
          {Object.entries(STATUS_STYLES).map(([key, sty]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 11, height: 11, borderRadius: 3, flexShrink: 0,
                background: sty.bg, border: `1.5px solid ${sty.color}`,
              }} />
              <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600 }}>{sty.name}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Quarter view ──────────────────────────────────────────────────────────────
function QuarterView({ stats, info, todayISO, goToReview, jumpTo }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      {[0, 1, 2].map(i => {
        const m   = info.startMonth + i;
        const mm  = String(m + 1).padStart(2, '0');
        const lastDay = new Date(info.year, m + 1, 0).getDate();
        const from = `${info.year}-${mm}-01`;
        const to   = `${info.year}-${mm}-${String(lastDay).padStart(2, '0')}`;

        const monthStats = stats.filter(s => (s.StatDate || '').slice(0, 7) === `${info.year}-${mm}`);
        const agg = aggregateStats(monthStats);
        const sty = agg?.status && agg.status !== 'fallow' ? STATUS_STYLES[agg.status] : null;
        const past = to < todayISO;
        const curr = from <= todayISO && todayISO <= to;

        return (
          <div
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => jumpTo('month', from)}
            onKeyDown={e => e.key === 'Enter' && jumpTo('month', from)}
            className="card"
            style={{
              padding: 20, cursor: 'pointer',
              background: sty ? sty.bg : 'var(--paper)',
              border: `1.5px solid ${sty ? sty.color : 'var(--paper-edge)'}`,
              opacity: !past && !curr ? 0.45 : 1,
              display: 'flex', flexDirection: 'column',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
          >
            <div className="row" style={{ gap: 8, marginBottom: 6 }}>
              <span className="kicker" style={{ fontSize: 10, color: sty?.color || 'var(--ink-mute)' }}>
                MONTH {i + 1}
              </span>
              {agg?.status && agg.status !== 'fallow' && (
                <span style={{ fontSize: 11, color: sty?.color, fontWeight: 600 }}>
                  {STATUS_STYLES[agg.status].name}
                </span>
              )}
            </div>
            <div style={{
              fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20,
              color: sty?.color || 'var(--ink)', marginBottom: 14,
            }}>
              {MONTH_NAMES[m]} {info.year}
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{
                fontFamily: 'var(--display)', fontWeight: 800, fontSize: 44,
                letterSpacing: '-0.02em', color: sty?.color || 'var(--ink)', lineHeight: 1,
              }}>
                {agg?.totalAdded ?? 0}
              </span>
              <span className="faint" style={{ fontSize: 13, marginLeft: 6 }}>words</span>
            </div>
            <div style={{
              fontSize: 13, color: sty?.color || 'var(--ink-mute)', marginBottom: 16,
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              <span>{pct(agg?.reviewRate)} rev</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{pct(agg?.avgAccuracy)} acc</span>
            </div>
            <div style={{ marginTop: 'auto' }}>
              {(past || curr) && (agg?.totalAdded ?? 0) > 0 && (
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '5px 12px', marginBottom: 8, width: '100%' }}
                  onClick={e => {
                    e.stopPropagation();
                    goToReview({ from, to, label: `${MONTH_NAMES[m]} ${info.year}`, limit: Math.min(agg.totalAdded, 30) });
                  }}
                >
                  <Icon name="play" size={12} /> Review
                </button>
              )}
              <div style={{ fontSize: 12, color: sty?.color || 'var(--ink-faint)', fontWeight: 600 }}>
                View month →
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────
function WeekView({ stats, info, todayISO, tz, goToReview, goToLibrary }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(info.monday.getFullYear(), info.monday.getMonth(), info.monday.getDate() + i);
    const iso  = isoInTZ(date, tz);
    const stat = stats.find(s => (s.StatDate || '').slice(0, 10) === iso);
    return { date, iso, stat };
  });

  const weekAgg = aggregateStats(stats);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Week summary — above the day grid */}
      <PeriodSummary
        agg={weekAgg}
        label={`WEEK ${info.weekNum} · ${info.year}`}
        from={info.from}
        to={info.to}
        goToReview={goToReview}
        goToLibrary={goToLibrary}
        libraryScope={{ kind: 'week', value: info.from }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
        {days.map(({ date, iso, stat }, i) => {
          const status = stat?.Status;
          const sty    = status ? STATUS_STYLES[status] : null;
          const count  = stat?.AddedWordsCount ?? 0;
          const future = iso > todayISO;
          const today_ = iso === todayISO;

          return (
            <div
              key={i}
              role={count > 0 && !future ? 'button' : undefined}
              tabIndex={count > 0 && !future ? 0 : -1}
              onClick={() => count > 0 && !future && goToLibrary({ kind: 'day', value: iso })}
              onKeyDown={e => e.key === 'Enter' && count > 0 && !future && goToLibrary({ kind: 'day', value: iso })}
              style={{
                borderRadius: 12, overflow: 'hidden',
                background: sty ? sty.bg : 'var(--paper-2)',
                border: today_ ? '2px solid var(--accent)' : `1.5px solid ${sty ? sty.color + '55' : 'var(--paper-edge)'}`,
                opacity: future ? 0.4 : 1,
                cursor: count > 0 && !future ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', minHeight: 120,
              }}
            >
              <div style={{ padding: '12px 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="kicker" style={{ fontSize: 9, color: sty?.color || 'var(--ink-faint)', marginBottom: 4 }}>
                    {DAY_FULL[i]}
                  </div>
                  <div style={{
                    fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22,
                    color: today_ ? 'var(--accent)' : sty?.color || 'var(--ink-mute)', lineHeight: 1,
                  }}>
                    {date.getDate()}
                  </div>
                </div>
                {today_ && (
                  <span className="mono" style={{ fontSize: 8, color: 'var(--accent)', letterSpacing: '0.12em', fontWeight: 700 }}>
                    TODAY
                  </span>
                )}
              </div>

              {count > 0 && (
                <div style={{ marginTop: 'auto', padding: '0 10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'baseline', gap: 2,
                    padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.65)',
                    border: '1px solid rgba(0,0,0,0.07)',
                    fontSize: 12, lineHeight: 1,
                  }}>
                    <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13 }}>{count}</span>
                    <span style={{ color: 'var(--ink-mute)', fontSize: 11 }}>{count === 1 ? 'word' : 'words'}</span>
                  </span>
                  {!future && goToReview && (
                    <button
                      onClick={e => { e.stopPropagation(); goToReview({ from: iso, to: iso, label: iso, limit: count }); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 999, border: 'none',
                        background: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                        color: sty?.color || 'var(--ink-mute)',
                      }}
                    >
                      <Icon name="play" size={9} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Calendar ─────────────────────────────────────────────────────────────
export default function Calendar({ goToLibrary, goToReview }) {
  const [view,    setView]    = useState('month');
  const [offset,  setOffset]  = useState(0);
  const [stats,   setStats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tz,      setTz]      = useState(getTimezone);

  useEffect(() => {
    const handler = () => setTz(getTimezone());
    window.addEventListener('tz-change', handler);
    return () => window.removeEventListener('tz-change', handler);
  }, []);

  const changeView = v => { setView(v); setOffset(0); };

  const jumpTo = (newView, anchorISO) => {
    const todayStr = isoInTZ(new Date(), tz);
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const [ay, am, ad] = anchorISO.split('-').map(Number);

    if (newView === 'month') {
      setOffset((ay - ty) * 12 + (am - tm));
    } else if (newView === 'week') {
      const todayDate  = new Date(ty, tm - 1, td);
      const anchorDate = new Date(ay, am - 1, ad);
      const todayMon   = new Date(ty, tm - 1, td - (todayDate.getDay()  + 6) % 7);
      const anchorMon  = new Date(ay, am - 1, ad - (anchorDate.getDay() + 6) % 7);
      setOffset(Math.round((anchorMon - todayMon) / (7 * 86400000)));
    }
    setView(newView);
  };

  const info = view === 'week'    ? weekRange(offset, tz)
             : view === 'quarter' ? quarterRange(offset, tz)
             :                      monthRange(offset, tz);

  useEffect(() => {
    setLoading(true);
    getCalendarStats(info.from, info.to)
      .then(data => setStats(data?.Stats || []))
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [view, offset, tz]);

  const todayISO_ = isoInTZ(new Date(), tz);

  let periodLabel = '';
  let subtitle    = '';
  if (view === 'quarter') {
    const end     = info.startMonth + 2;
    const lastDay = new Date(info.year, end + 1, 0).getDate();
    periodLabel = `Q${info.quarter} ${info.year}`;
    subtitle    = `${MONTH_ABBR[info.startMonth]} 1 – ${MONTH_ABBR[end]} ${lastDay}`;
  } else if (view === 'week') {
    const { monday: mo, sunday: su } = info;
    periodLabel = `Week ${info.weekNum}`;
    subtitle    = mo.getMonth() === su.getMonth()
      ? `${MONTH_ABBR[mo.getMonth()]} ${mo.getDate()} – ${su.getDate()}, ${su.getFullYear()}`
      : `${MONTH_ABBR[mo.getMonth()]} ${mo.getDate()} – ${MONTH_ABBR[su.getMonth()]} ${su.getDate()}, ${su.getFullYear()}`;
  } else {
    periodLabel = `${MONTH_NAMES[info.month]} ${info.year}`;
  }

  // Month view handles its own navigation inside the card
  const navProps = {
    periodLabel,
    onPrev:    () => setOffset(o => o - 1),
    onNext:    () => setOffset(o => o + 1),
    canNext:   offset < 0,
    onToday:   () => setOffset(0),
    showToday: offset < 0,
  };

  return (
    <div className="canvas fade-in">
      <div className="page-header">
        <div>
          <div className="kicker">Calendar</div>
          <h1 style={{ marginTop: 8 }}>Your activity</h1>
        </div>

        {/* View tabs */}
        <div style={{
          display: 'flex', padding: 4,
          background: 'var(--paper-2)', border: '1.5px solid var(--paper-edge)',
          borderRadius: 14,
        }}>
          {['Week', 'Month', 'Quarter'].map(v => (
            <button key={v} onClick={() => changeView(v.toLowerCase())} style={{
              padding: '6px 16px', border: 'none', borderRadius: 10,
              fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', transition: 'all 0.15s',
              background: view === v.toLowerCase() ? 'var(--accent)' : 'transparent',
              color: view === v.toLowerCase() ? '#fff' : 'var(--ink-mute)',
            }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation row — only for Week and Quarter views */}
      {view !== 'month' && (
        <div className="row" style={{ gap: 6, marginBottom: 24, alignItems: 'center' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => setOffset(o => o - 1)}>
            <Icon name="chevL" size={14} />
          </button>
          <div style={{ minWidth: 160 }}>
            <h2 style={{
              fontSize: 26, fontFamily: 'var(--display)', fontWeight: 800,
              letterSpacing: '-0.02em', lineHeight: 1.15,
            }}>
              {periodLabel}
            </h2>
            {subtitle && <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button className="btn btn-icon btn-ghost" onClick={() => setOffset(o => o + 1)} disabled={offset >= 0}>
            <Icon name="chevR" size={14} />
          </button>
          {offset < 0 && (
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => setOffset(0)}>
              Today
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="center" style={{ padding: 60 }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
        </div>
      ) : view === 'quarter' ? (
        <QuarterView stats={stats} info={info} todayISO={todayISO_}
          goToReview={goToReview} jumpTo={jumpTo} />
      ) : view === 'week' ? (
        <WeekView stats={stats} info={info} todayISO={todayISO_} tz={tz}
          goToReview={goToReview} goToLibrary={goToLibrary} />
      ) : (
        <MonthView stats={stats} info={info} todayISO={todayISO_} tz={tz}
          goToReview={goToReview} goToLibrary={goToLibrary} jumpTo={jumpTo}
          {...navProps} />
      )}
    </div>
  );
}
