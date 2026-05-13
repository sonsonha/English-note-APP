import { useState, useEffect } from 'react';
import Icon from '../components/Icons.jsx';
import { getCalendarStats, monthRange } from '../api/calendar.js';

const STATUS_STYLES = {
  fallow:   { bg: 'var(--paper-2)',      color: 'var(--ink-faint)', name: 'Fallow' },
  tending:  { bg: 'var(--rose-soft)',    color: 'var(--rose)',      name: 'Tending' },
  steady:   { bg: 'var(--butter-soft)',  color: 'var(--butter-deep)', name: 'Steady' },
  mastered: { bg: 'var(--mint-soft)',    color: 'var(--mint-deep)', name: 'Mastered' },
};

function fmtMonth(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Calendar({ setScreen, openWord, goToLibrary }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = monthRange(monthOffset);
    getCalendarStats(from, to)
      .then((data) => setStats(data?.Stats || []))
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [monthOffset]);

  const today = new Date();
  const focusMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = fmtMonth(focusMonth);

  // Build month grid (Monday-first)
  const rawDow = focusMonth.getDay();
  const firstDow = (rawDow + 6) % 7;
  const daysInMonth = new Date(focusMonth.getFullYear(), focusMonth.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(focusMonth.getFullYear(), focusMonth.getMonth(), d);
    const iso = date.toISOString().slice(0, 10);
    const stat = stats.find((s) => (s.StatDate || '').slice(0, 10) === iso);
    cells.push({ date, iso, stat });
  }
  while (cells.length % 7) cells.push(null);

  const isToday = (date) =>
    date && date.toDateString() === today.toDateString();

  const isFuture = (date) => date && date > today;

  return (
    <div className="canvas fade-in">
      <div className="page-header">
        <div>
          <div className="kicker">Calendar</div>
          <h1 style={{ marginTop: 8 }}>Your activity</h1>
          <div className="meta" style={{ marginTop: 6 }}>
            Every day is a story. Every dot counts.
          </div>
        </div>
        {/* Legend */}
        <div className="row" style={{ gap: 10, fontSize: 12 }}>
          {Object.entries(STATUS_STYLES).map(([k, s]) => (
            <span key={k} className="row" style={{ gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, border: `1px solid ${s.color}`, display: 'inline-block' }} />
              <span className="faint">{s.name}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {/* Month nav */}
        <div className="row between" style={{ marginBottom: 20 }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-icon btn-ghost" onClick={() => setMonthOffset((o) => o - 1)}>
              <Icon name="chevL" size={14} />
            </button>
            <h2 style={{ fontSize: 22, padding: '0 6px', fontFamily: 'var(--display)', fontWeight: 700 }}>
              {monthLabel}
            </h2>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setMonthOffset((o) => o + 1)}
              disabled={monthOffset >= 0}
            >
              <Icon name="chevR" size={14} />
            </button>
          </div>
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setMonthOffset(0)}>
            Today
          </button>
        </div>

        {/* Day-of-week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="kicker" style={{ textAlign: 'center', fontSize: 10.5 }}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="center" style={{ padding: 40 }}>
            <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {cells.map((c, i) => {
              if (!c) return <div key={i} />;
              const status = c.stat?.Status;
              const style = status ? STATUS_STYLES[status] : null;
              const today_ = isToday(c.date);
              const future = isFuture(c.date);
              const count = c.stat?.AddedWordsCount ?? 0;

              return (
                <button
                  key={i}
                  className="day-cell"
                  disabled={future}
                  onClick={() => !future && count > 0 && goToLibrary({ kind: 'day', value: c.iso })}
                  style={{
                    border: today_ ? '2px solid var(--accent)' : '1.5px solid var(--paper-edge)',
                    background: style ? style.bg : 'var(--paper)',
                    color: style ? style.color : 'var(--ink-faint)',
                    cursor: future ? 'default' : count > 0 ? 'pointer' : 'default',
                    opacity: future ? 0.35 : 1,
                  }}
                >
                  {/* Date header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderBottom: style ? '1px solid rgba(0,0,0,0.08)' : '1px solid var(--rule)',
                    background: style ? 'rgba(255,255,255,0.35)' : 'var(--paper-2)',
                  }}>
                    <span className="mono" style={{
                      fontSize: 11, fontWeight: today_ ? 700 : 500,
                      color: today_ ? 'var(--accent)' : style ? style.color : 'var(--ink-mute)',
                    }}>
                      {String(c.date.getDate()).padStart(2, '0')}
                    </span>
                    {today_ && (
                      <span className="mono" style={{ fontSize: 8, color: 'var(--accent)', letterSpacing: '0.1em' }}>TODAY</span>
                    )}
                  </div>

                  {/* Word count */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', padding: 8 }}>
                    {count > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'baseline', gap: 3,
                        padding: '2px 7px', background: 'var(--paper)',
                        border: '1px solid var(--rule)', borderRadius: 999,
                        fontSize: 10, lineHeight: 1,
                      }}>
                        <span style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 13 }}>{count}</span>
                        <span className="faint" style={{ fontSize: 9 }}>word{count !== 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Month summary */}
      {!loading && (
        <div className="card-soft" style={{ marginTop: 24, padding: 24 }}>
          <div className="kicker">{monthLabel} summary</div>
          <div className="row" style={{ gap: 32, marginTop: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.025em' }}>
                {stats.reduce((a, s) => a + (s.AddedWordsCount ?? 0), 0)}
              </div>
              <div className="faint" style={{ fontSize: 12, fontWeight: 600 }}>words added</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.025em' }}>
                {stats.filter((s) => s.ReviewedWordsCount > 0).length}
              </div>
              <div className="faint" style={{ fontSize: 12, fontWeight: 600 }}>active days</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.025em' }}>
                {stats.length
                  ? Math.round((stats.reduce((a, s) => a + (s.AccuracyRate ?? 0), 0) / stats.length) * 100)
                  : 0}%
              </div>
              <div className="faint" style={{ fontSize: 12, fontWeight: 600 }}>avg accuracy</div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setScreen('review')}>
            <Icon name="play" size={14} /> Start a review session
          </button>
        </div>
      )}
    </div>
  );
}
