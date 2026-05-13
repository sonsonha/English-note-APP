import { useState, useEffect } from 'react';
import Icon from '../components/Icons.jsx';
import { listWords } from '../api/words.js';
import { getCalendarSummary, monthRange } from '../api/calendar.js';

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="kicker">{label}</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 32, marginTop: 4, letterSpacing: '-0.025em' }}>
        {value}
      </div>
      <div className="faint" style={{ fontSize: 12, fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard({ setScreen, openWord, goToLibrary, onWordCount }) {
  const [words, setWords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { from, to } = monthRange(0);
    Promise.all([
      listWords(50, 0),
      getCalendarSummary(from, to).catch(() => null),
    ]).then(([wData, sData]) => {
      setWords(wData?.words || []);
      onWordCount?.(wData?.total || 0);
      setSummary(sData);
    }).finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const recent = words.slice(0, 5);
  const needsReview = words.filter(w => !w.definition);

  if (loading) {
    return (
      <div className="canvas" style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  return (
    <div className="canvas fade-in">
      <div className="page-header">
        <div>
          <div className="kicker">{dayName} · {dateLabel}</div>
          <h1 style={{ marginTop: 8 }}>Your notebook.</h1>
          <div className="meta" style={{ marginTop: 10, fontSize: 17 }}>
            {words.length > 0
              ? <>You have <b style={{ color: 'var(--ink)' }}>{words.length} word{words.length !== 1 ? 's' : ''}</b> saved. Keep it up.</>
              : <>Start by adding your first word with the <b style={{ color: 'var(--ink)' }}>+ button</b> below.</>
            }
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ padding: '14px 22px', fontSize: 15 }}
          onClick={() => setScreen('review')}
          disabled={words.length === 0}
        >
          <Icon name="play" size={14} /> Let's go
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* Hero card */}
        <div className="card-ink" style={{ padding: 32 }}>
          <div className="kicker">Words waiting for you</div>
          {words.length === 0 ? (
            <div style={{ marginTop: 16, color: 'oklch(1 0 0 / 0.86)' }}>
              No words yet. Press{' '}
              <span style={{ fontFamily: 'var(--mono)', background: 'oklch(1 0 0 / 0.20)', padding: '2px 8px', borderRadius: 6 }}>
                ⌘K
              </span>{' '}
              or tap + to capture your first word.
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 30, marginTop: 10, color: '#fff', letterSpacing: '-0.025em' }}>
                Start with{' '}
                <span style={{ fontStyle: 'italic', textDecoration: 'underline', textDecorationStyle: 'wavy', textUnderlineOffset: 6, textDecorationColor: 'oklch(1 0 0 / 0.5)' }}>
                  {recent[0]?.text ?? 'your first word'}
                </span>.
              </h2>
              <div style={{ color: 'oklch(1 0 0 / 0.86)', marginTop: 10, fontSize: 15 }}>
                Review and strengthen your vocabulary. About 9 minutes.
              </div>
              <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recent.map((w, i) => (
                  <button
                    key={w.id}
                    onClick={() => openWord(w.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '28px 1fr auto',
                      gap: 14, padding: '12px 16px',
                      background: 'oklch(1 0 0 / 0.14)', color: '#fff',
                      border: 'none', borderRadius: 14,
                      textAlign: 'left', cursor: 'pointer', alignItems: 'center',
                      fontFamily: 'inherit', transition: 'background .15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'oklch(1 0 0 / 0.22)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'oklch(1 0 0 / 0.14)'}
                  >
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'oklch(1 0 0 / 0.7)', fontWeight: 600 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.015em' }}>
                      {w.text}
                    </span>
                    <Icon name="chevR" size={14} />
                  </button>
                ))}
              </div>
              <button
                className="btn btn-ghost"
                style={{ marginTop: 16, color: '#fff', background: 'oklch(1 0 0 / 0.16)' }}
                onClick={() => setScreen('review')}
              >
                Start review <Icon name="arrow" size={13} />
              </button>
            </>
          )}
        </div>

        {/* Stats card */}
        <div className="card" style={{ padding: 28 }}>
          <div className="between">
            <div className="kicker">This month</div>
          </div>
          <h3 style={{ fontSize: 26, marginTop: 10, letterSpacing: '-0.025em', fontWeight: 800 }}>
            {summary ? `${summary.TotalWordsAdded} words added.` : 'No stats yet.'}
          </h3>

          <hr className="divider" style={{ margin: '20px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Stat
              label="Words added"
              value={summary?.TotalWordsAdded ?? words.length}
              sub="this month"
            />
            <Stat
              label="Reviewed"
              value={summary ? `${summary.PercentageOfWordsReviewed}%` : '—'}
              sub="of your words"
            />
            <Stat
              label="Accuracy"
              value={summary ? `${Math.round((summary.AccuracyRate ?? 0) * 100)}%` : '—'}
              sub="correct answers"
            />
            <Stat
              label="Status"
              value={summary?.Status ?? '—'}
              sub={summary ? 'current streak' : 'start reviewing'}
            />
          </div>
        </div>
      </div>

      {/* Recent captures + needs AI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <div className="between">
            <div className="kicker">Recently added</div>
            <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => goToLibrary()}>
              All words <Icon name="arrow" size={13} />
            </button>
          </div>
          <h3 style={{ fontSize: 22, marginTop: 10, fontWeight: 800 }}>Latest captures</h3>
          <div className="col" style={{ marginTop: 14, gap: 4 }}>
            {recent.length === 0 && (
              <div className="muted" style={{ fontSize: 14 }}>No words yet.</div>
            )}
            {recent.map((w) => (
              <button
                key={w.id}
                className="row"
                onClick={() => openWord(w.id)}
                style={{
                  padding: '12px 14px', border: 'none', background: 'none',
                  textAlign: 'left', cursor: 'pointer', borderRadius: 12,
                  justifyContent: 'space-between', fontFamily: 'inherit', transition: 'background .12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-tint)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className="row" style={{ gap: 12 }}>
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>{w.text}</span>
                  {w.cefr_level && (
                    <span className={`tag cefr-${w.cefr_level}`} style={{ fontSize: 10 }}>{w.cefr_level}</span>
                  )}
                </div>
                <span className="faint" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                  {fmtDate(w.created_at)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="between">
            <div className="kicker" style={{ color: 'var(--accent-deep)' }}>
              Awaiting AI · {needsReview.length}
            </div>
          </div>
          <h3 style={{ fontSize: 22, marginTop: 10, fontWeight: 800 }}>AI generating…</h3>
          <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>
            {needsReview.length === 0
              ? 'All your words have AI explanations.'
              : `${needsReview.length} word${needsReview.length > 1 ? 's are' : ' is'} still awaiting AI explanation. Check back in a moment.`}
          </div>
          {needsReview.length > 0 && (
            <div className="col" style={{ marginTop: 14, gap: 6 }}>
              {needsReview.slice(0, 4).map((w) => (
                <button
                  key={w.id}
                  className="card-soft"
                  onClick={() => openWord(w.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                    borderRadius: 12, fontFamily: 'inherit', border: '1.5px dashed var(--paper-edge)',
                  }}
                >
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17 }}>{w.text}</span>
                </button>
              ))}
            </div>
          )}
          <button
            className="btn btn-ghost"
            style={{ marginTop: 14, color: 'var(--accent)', padding: '8px 0' }}
            onClick={() => setScreen('calendar')}
          >
            View calendar <Icon name="arrow" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
