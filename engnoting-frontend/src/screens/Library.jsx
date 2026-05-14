import { useState, useEffect, useMemo } from 'react';
import Icon from '../components/Icons.jsx';
import { listWords } from '../api/words.js';
import { getCalendarStats } from '../api/calendar.js';

const STATUS_STYLES = {
  fallow:   { bg: 'var(--rose-soft)',    color: 'var(--rose)',         name: 'Fallow'   },
  tending:  { bg: 'var(--butter-soft)', color: 'var(--butter-deep)',  name: 'Tending'  },
  steady:   { bg: 'var(--mint-soft)',   color: 'var(--mint-deep)',    name: 'Steady'   },
  mastered: { bg: 'var(--forest-soft)', color: 'var(--forest-deep)',  name: 'Mastered' },
};

function pct(n) { return `${Math.round((n || 0) * 100)}%`; }

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
  return { totalAdded, avgAccuracy, reviewRate, status };
}

function scopeRange(scope) {
  if (!scope || scope.kind === 'all') return null;
  if (scope.kind === 'day') return { from: scope.value, to: scope.value };
  if (scope.kind === 'week') {
    const start = new Date(scope.value + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: scope.value, to: end.toISOString().slice(0, 10) };
  }
  if (scope.kind === 'month') {
    const ref = new Date(scope.value + 'T00:00:00');
    const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const mm = String(ref.getMonth() + 1).padStart(2, '0');
    return { from: scope.value, to: `${ref.getFullYear()}-${mm}-${String(lastDay).padStart(2, '0')}` };
  }
  return null;
}

function fmtDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Library({ openWord, scope, setScope, goToReview }) {
  const [allWords, setAllWords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cefrFilter, setCefrFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [scopeAgg, setScopeAgg] = useState(null);

  useEffect(() => {
    setLoading(true);
    listWords(200, 0)
      .then((data) => {
        setAllWords(data?.words || []);
        setTotal(data?.total || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const range = scopeRange(scope);
    if (!range) { setScopeAgg(null); return; }
    getCalendarStats(range.from, range.to)
      .then(data => setScopeAgg(aggregateStats(data?.Stats || [])))
      .catch(() => setScopeAgg(null));
  }, [scope]);

  const words = useMemo(() => {
    let list = [...allWords];

    // Scope filter by created_at date
    if (scope && scope.kind !== 'all') {
      list = list.filter((w) => {
        if (!w.created_at) return false;
        const d = new Date(w.created_at);
        if (scope.kind === 'day') {
          return w.created_at.slice(0, 10) === scope.value;
        }
        if (scope.kind === 'week') {
          const start = new Date(scope.value);
          const end = new Date(start); end.setDate(end.getDate() + 6);
          return d >= start && d <= end;
        }
        if (scope.kind === 'month') {
          const ref = new Date(scope.value);
          return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
        }
        return true;
      });
    }

    // Text / meaning search
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter(
        (w) => w.text.toLowerCase().includes(lq) || (w.definition || '').toLowerCase().includes(lq),
      );
    }

    // CEFR filter
    if (cefrFilter !== 'all') {
      list = list.filter((w) => w.cefr_level === cefrFilter);
    }

    // Sort
    if (sort === 'alpha') list.sort((a, b) => a.text.localeCompare(b.text));
    if (sort === 'recent') list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    if (sort === 'confidence') list.sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0));

    return list;
  }, [allWords, q, cefrFilter, sort, scope]);

  const scopeLabel = (() => {
    if (!scope || scope.kind === 'all') return 'All time';
    if (scope.kind === 'day') return scope.value ? new Date(scope.value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Day';
    if (scope.kind === 'week') return `Week of ${new Date(scope.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    if (scope.kind === 'month') return new Date(scope.value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return 'All time';
  })();

  return (
    <div className="canvas fade-in">
      <div className="page-header">
        <div>
          <div className="kicker">Library · {scopeLabel}</div>
          <h1 style={{ marginTop: 8 }}>Your words</h1>
          <div className="meta" style={{ marginTop: 6 }}>
            {words.length} shown · {total} total
          </div>
        </div>
        <div className="row">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 14, color: 'var(--ink-mute)' }}>
              <Icon name="search" size={14} />
            </span>
            <input
              className="input"
              placeholder="Search words or meanings…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 38, width: 280 }}
            />
          </div>
        </div>
      </div>

      {/* Scope quick-clear */}
      {scope && scope.kind !== 'all' && (
        <div className="row" style={{ marginBottom: 16, gap: 8 }}>
          <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent-deep)' }}>
            {scopeLabel}
          </span>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12.5 }} onClick={() => setScope({ kind: 'all' })}>
            Clear <Icon name="x" size={12} />
          </button>
        </div>
      )}

      {/* Period stats box */}
      {scope && scope.kind !== 'all' && scopeAgg && scopeAgg.totalAdded > 0 && (() => {
        const sty = scopeAgg.status !== 'fallow' ? STATUS_STYLES[scopeAgg.status] : null;
        const range = scopeRange(scope);
        return (
          <div className="card" style={{
            padding: '18px 24px', marginBottom: 20,
            background: sty ? sty.bg : 'var(--paper)',
            border: `1.5px solid ${sty ? sty.color : 'var(--paper-edge)'}`,
          }}>
            <div className="row between" style={{ flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <div className="row" style={{ gap: 28, flexWrap: 'wrap' }}>
                {[
                  { n: scopeAgg.totalAdded,       lbl: 'words'    },
                  { n: pct(scopeAgg.reviewRate),  lbl: 'reviewed' },
                  { n: pct(scopeAgg.avgAccuracy), lbl: 'accuracy' },
                ].map(({ n, lbl }) => (
                  <div key={lbl}>
                    <div style={{
                      fontFamily: 'var(--display)', fontWeight: 800, fontSize: 28,
                      letterSpacing: '-0.02em', color: sty?.color || 'var(--ink)', lineHeight: 1,
                    }}>{n}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: sty?.color || 'var(--ink-faint)', marginTop: 3 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                {sty && (
                  <span style={{
                    fontSize: 11, padding: '2px 10px', borderRadius: 999,
                    border: `1px solid ${sty.color}`, color: sty.color,
                    background: 'rgba(255,255,255,0.35)',
                  }}>
                    {STATUS_STYLES[scopeAgg.status].name}
                  </span>
                )}
                {goToReview && range && (
                  <button className="btn btn-primary" style={{ fontSize: 13 }}
                    onClick={() => goToReview({ from: range.from, to: range.to, label: scopeLabel, limit: Math.min(scopeAgg.totalAdded, 30) })}>
                    <Icon name="play" size={13} /> Review
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Filter / sort toolbar */}
        <div className="row between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
          <div className="row" style={{ gap: 6 }}>
            {['all', 'A2', 'B1', 'B2', 'C1', 'C2'].map((f) => (
              <button
                key={f}
                onClick={() => setCefrFilter(f)}
                className={'btn ' + (cefrFilter === f ? 'btn-primary' : 'btn-ghost')}
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                {f === 'all' ? 'All levels' : f}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="kicker">Sort</span>
            <select
              className="input"
              style={{ padding: '6px 10px', width: 'auto', fontSize: 13 }}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Recently added</option>
              <option value="alpha">Alphabetical</option>
              <option value="confidence">Confidence (low first)</option>
            </select>
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 2.4fr 0.7fr 0.7fr 0.8fr', gap: 18, padding: '10px 18px', background: 'var(--paper-2)', borderBottom: '1px solid var(--rule)' }}>
          <div className="kicker">Word</div>
          <div className="kicker">Meaning</div>
          <div className="kicker">CEFR</div>
          <div className="kicker">Confidence</div>
          <div className="kicker">Added</div>
        </div>

        {loading && (
          <div className="center muted" style={{ padding: '40px 20px' }}>
            <div className="spinner" style={{ width: 22, height: 22, margin: '0 auto' }} />
          </div>
        )}

        {!loading && words.map((w) => (
          <div key={w.id} className="word-row" onClick={() => openWord(w.id)}
            style={{ gridTemplateColumns: '1.6fr 2.4fr 0.7fr 0.7fr 0.8fr' }}>
            <div className="w-text">{w.text}</div>
            <div className="w-def">
              {w.definition
                ? w.definition
                : <span className="faint" style={{ fontSize: 12.5, fontStyle: 'italic' }}>AI generating…</span>}
            </div>
            <div>
              {w.cefr_level
                ? <span className={`tag cefr-${w.cefr_level}`}>{w.cefr_level}</span>
                : <span className="faint" style={{ fontSize: 12 }}>—</span>}
            </div>
            <div>
              <div className="bar">
                <span style={{ transform: `scaleX(${(w.confidence ?? 1) / 5})` }} />
              </div>
              <div className="faint mono" style={{ fontSize: 11, marginTop: 4 }}>
                {w.confidence ?? 1} / 5
              </div>
            </div>
            <div className="faint mono" style={{ fontSize: 11 }}>{fmtDate(w.created_at)}</div>
          </div>
        ))}

        {!loading && words.length === 0 && (
          <div className="center muted" style={{ padding: '40px 20px' }}>
            {q || cefrFilter !== 'all' ? 'No words match your filters.' : 'No words yet. Use ⌘K to capture your first.'}
          </div>
        )}
      </div>
    </div>
  );
}
