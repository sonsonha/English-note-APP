import { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icons.jsx';
import { startSession, getCurrentItem, submitReview, advanceSession } from '../api/reviews.js';
import { getTimezone, isoInTZ, dayRange, weekRange, monthRange, getCalendarStats, getCalendarSummary } from '../api/calendar.js';

const MONTH_ABBR  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_STYLES = {
  fallow:   { bg: 'var(--rose-soft)',    color: 'var(--rose)'        },
  tending:  { bg: 'var(--butter-soft)', color: 'var(--butter-deep)' },
  steady:   { bg: 'var(--mint-soft)',   color: 'var(--mint-deep)'   },
  mastered: { bg: 'var(--forest-soft)', color: 'var(--forest-deep)' },
};

function aggregateStats(dailyStats) {
  const days = (dailyStats || []).filter(s => s && (s.AddedWordsCount ?? 0) > 0);
  if (!days.length) return null;
  const totalAdded  = days.reduce((a, s) => a + s.AddedWordsCount, 0);
  const avgAccuracy = days.reduce((a, s) => a + (s.AccuracyRate ?? 0), 0) / days.length;
  let status = 'tending';
  if (avgAccuracy >= 0.8) status = 'mastered';
  else if (avgAccuracy >= 0.6) status = 'steady';
  return { totalAdded, avgAccuracy, status };
}

function fmtISO(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_ABBR[m - 1]} ${d}`;
}

const FORMAT_LABELS = {
  word_meaning_mcq: 'Word → Meaning',
  context_fill_mcq: 'Fill the blank',
  phrase_match:     'Phrase match',
  reverse_mcq:      'Reverse recall',
  recall_typing:    'Active recall',
  context_typing:   'Context typing',
  // legacy types
  mcq:        'Multiple choice',
  match:      'Matching',
  typing:     'Typing',
  fill_blank:  'Fill in the blank',
};

// Which quiz types show word_text prominently (others show question prominently)
const WORD_HEADER_TYPES = new Set(['word_meaning_mcq', 'phrase_match', 'mcq']);
// Which quiz types are MCQ (have choices)
const MCQ_TYPES     = new Set(['word_meaning_mcq', 'context_fill_mcq', 'phrase_match', 'reverse_mcq', 'mcq', 'match']);
// Which quiz types are typing with a blank sentence
const FILL_TYPES    = new Set(['context_typing', 'fill_blank']);
// Which quiz types are free-typing
const TYPING_TYPES  = new Set(['recall_typing', 'typing']);

// ── MCQ (all multiple-choice quiz types) ─────────────────────────────────────
function MCQ({ item, onAnswer }) {
  const { quiz, word_text } = item;
  const format = item.review_type || quiz?.quiz_type || '';
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);

  const correctAnswer = quiz?.answer ?? '';
  const [choices] = useState(() => [...(quiz?.choices ?? [])].sort(() => Math.random() - 0.5));
  const showWordHeader = WORD_HEADER_TYPES.has(format);

  const select = (i) => {
    if (reveal) return;
    setPicked(i);
    setReveal(true);
    const isCorrect = choices[i] === correctAnswer;
    setTimeout(() => onAnswer(isCorrect), 900);
  };

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 18 }}>
        <span className="tag tag-pos">{FORMAT_LABELS[format] ?? format}</span>
        <span className="muted" style={{ fontSize: 14, marginLeft: 'auto', fontStyle: 'italic' }}>
          {WORD_HEADER_TYPES.has(format) ? 'choose the correct meaning' : 'choose the correct word'}
        </span>
      </div>

      {showWordHeader ? (
        <>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 60, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {word_text}
          </h1>
          {quiz?.question && (
            <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>{quiz.question}</div>
          )}
        </>
      ) : (
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, lineHeight: 1.35, letterSpacing: '-0.015em', marginTop: 8, marginBottom: 4 }}>
          {quiz?.question}
        </div>
      )}

      <div className="col" style={{ marginTop: 24, gap: 10 }}>
        {choices.map((c, i) => {
          const isCorrect = c === correctAnswer;
          const cls = reveal && isCorrect ? 'choice correct'
            : reveal && i === picked && !isCorrect ? 'choice wrong'
            : i === picked ? 'choice selected' : 'choice';
          return (
            <button key={i} className={cls} onClick={() => select(i)}>
              <span className="choice-key">{['A', 'B', 'C', 'D'][i]}</span>
              <span>{c}</span>
              {reveal && isCorrect && <span style={{ marginLeft: 'auto' }}><Icon name="check" size={16} /></span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Recall typing (given meaning, type the word) ──────────────────────────────
function RecallTyping({ item, onAnswer }) {
  const { quiz, word_text } = item;
  const format = item.review_type || quiz?.quiz_type || '';
  const [val, setVal] = useState('');
  const [reveal, setReveal] = useState(false);
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const answer = quiz?.answer ?? word_text;

  const submit = () => {
    if (reveal || !val.trim()) return;
    setReveal(true);
    const correct = val.trim().toLowerCase() === answer.toLowerCase();
    setTimeout(() => onAnswer(correct), 900);
  };

  const isCorrect = val.trim().toLowerCase() === answer.toLowerCase();

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 18 }}>
        <span className="tag tag-pos">{FORMAT_LABELS[format] ?? format}</span>
        <span className="muted" style={{ fontSize: 14, marginLeft: 'auto', fontStyle: 'italic' }}>type the English word</span>
      </div>
      <div className="kicker">Vietnamese meaning</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 30, lineHeight: 1.25, letterSpacing: '-0.015em', marginTop: 8 }}>
        {quiz?.question ?? word_text}
      </div>
      <div style={{ marginTop: 24 }}>
        <input
          ref={ref}
          className="input input-lg"
          placeholder="Type the English word…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          disabled={reveal}
          style={reveal ? (isCorrect
            ? { borderColor: 'var(--leaf)', background: 'oklch(0.96 0.04 145)' }
            : { borderColor: 'var(--rose)', background: 'oklch(0.96 0.04 25)' }) : {}}
        />
        {reveal && !isCorrect && (
          <div className="muted" style={{ marginTop: 10, fontSize: 14 }}>
            The answer was <b style={{ fontFamily: 'var(--display)' }}>{answer}</b>.
          </div>
        )}
      </div>
      <div className="row" style={{ marginTop: 'auto', paddingTop: 24, justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={submit} disabled={!val.trim() || reveal}>
          Check <Icon name="check" size={14} />
        </button>
      </div>
    </>
  );
}

// ── Context typing (sentence with blank, type the word) ───────────────────────
function ContextTyping({ item, onAnswer }) {
  const { quiz, word_text } = item;
  const format = item.review_type || quiz?.quiz_type || '';
  const [val, setVal] = useState('');
  const [reveal, setReveal] = useState(false);
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const answer = quiz?.answer ?? word_text;
  const sentence = quiz?.question ?? `Fill in the blank: _____.`;

  // Split on ___ placeholder
  const parts = sentence.split('___');

  const submit = () => {
    if (reveal || !val.trim()) return;
    setReveal(true);
    const correct = val.trim().toLowerCase() === answer.toLowerCase();
    setTimeout(() => onAnswer(correct), 900);
  };

  const isCorrect = val.trim().toLowerCase() === answer.toLowerCase();

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 18 }}>
        <span className="tag tag-pos">{FORMAT_LABELS[format] ?? format}</span>
        <span className="muted" style={{ fontSize: 14, marginLeft: 'auto', fontStyle: 'italic' }}>fill in the blank</span>
      </div>
      <div className="kicker">Complete the sentence</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, lineHeight: 1.5, letterSpacing: '-0.01em', marginTop: 12 }}>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                ref={i === 0 ? ref : undefined}
                className="input"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                disabled={reveal}
                placeholder="_____"
                style={{
                  display: 'inline-block',
                  width: Math.max(120, answer.length * 16),
                  fontFamily: 'var(--display)', fontSize: 24,
                  padding: '3px 10px', borderRadius: 8, margin: '0 4px',
                  ...(reveal ? (isCorrect
                    ? { borderColor: 'var(--leaf)', background: 'oklch(0.96 0.04 145)' }
                    : { borderColor: 'var(--rose)', background: 'oklch(0.96 0.04 25)' }) : {}),
                }}
              />
            )}
          </span>
        ))}
      </div>
      {reveal && !isCorrect && (
        <div className="muted" style={{ marginTop: 18, fontSize: 14 }}>
          The answer was <b style={{ fontFamily: 'var(--display)' }}>{answer}</b>.
        </div>
      )}
      <div className="row" style={{ marginTop: 'auto', paddingTop: 24, justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={submit} disabled={!val.trim() || reveal}>
          Check <Icon name="check" size={14} />
        </button>
      </div>
    </>
  );
}

// ── Mini pickers ──────────────────────────────────────────────────────────────
function DayPicker({ selected, onSelect, tz }) {
  const todayISO = dayRange(0, tz).iso;
  const [vy, setVy] = useState(parseInt((selected?.from || todayISO).slice(0, 4)));
  const [vm, setVm] = useState(parseInt((selected?.from || todayISO).slice(5, 7)) - 1);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const mm = String(vm + 1).padStart(2, '0');
    const last = new Date(vy, vm + 1, 0).getDate();
    getCalendarStats(`${vy}-${mm}-01`, `${vy}-${mm}-${String(last).padStart(2, '0')}`)
      .then(d => setStats(d?.Stats || [])).catch(() => setStats([]));
  }, [vy, vm]);

  const todayY = parseInt(todayISO.slice(0, 4));
  const todayM = parseInt(todayISO.slice(5, 7)) - 1;
  const canNext = vy < todayY || (vy === todayY && vm < todayM);
  const prevM = () => { if (vm === 0) { setVy(y => y - 1); setVm(11); } else setVm(m => m - 1); };
  const nextM = () => { if (!canNext) return; if (vm === 11) { setVy(y => y + 1); setVm(0); } else setVm(m => m + 1); };

  const firstDow = (new Date(vy, vm, 1).getDay() + 6) % 7;
  const daysInM  = new Date(vy, vm + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) {
    const date = new Date(vy, vm, d);
    const iso  = isoInTZ(date, tz);
    cells.push({ date, iso, stat: stats.find(s => (s.StatDate || '').slice(0, 10) === iso) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div style={{ background: 'var(--paper-2)', borderRadius: 14, padding: '14px 16px', border: '1.5px solid var(--paper-edge)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <button className="btn btn-icon btn-ghost" style={{ width: 26, height: 26, padding: 0 }} onClick={prevM}>
          <Icon name="chevL" size={11} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13 }}>
          {MONTH_NAMES[vm]} {vy}
        </span>
        <button className="btn btn-icon btn-ghost" style={{ width: 26, height: 26, padding: 0 }} onClick={nextM} disabled={!canNext}>
          <Icon name="chevR" size={11} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--ink-faint)', fontWeight: 700 }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
          {week.map((c, ci) => {
            if (!c) return <div key={ci} />;
            const sty      = c.stat?.Status ? STATUS_STYLES[c.stat.Status] : null;
            const isSel    = selected?.from === c.iso;
            const isToday  = c.iso === todayISO;
            const isFuture = c.iso > todayISO;
            return (
              <button key={ci}
                onClick={() => !isFuture && onSelect({ id: c.iso, from: c.iso, to: c.iso, label: isToday ? 'Today' : fmtISO(c.iso) })}
                disabled={isFuture}
                style={{
                  padding: '6px 0', borderRadius: 6, border: 'none',
                  cursor: isFuture ? 'default' : 'pointer',
                  background: isSel ? 'var(--accent)' : sty ? sty.bg : 'transparent',
                  color: isSel ? '#fff' : isToday ? 'var(--accent)' : sty ? sty.color : 'var(--ink-mute)',
                  fontFamily: 'var(--display)', fontWeight: isSel || isToday ? 700 : 400,
                  fontSize: 12, textAlign: 'center', lineHeight: 1,
                  outline: isToday && !isSel ? '1.5px solid var(--accent)' : 'none',
                  opacity: isFuture ? 0.3 : 1, transition: 'all 0.1s',
                }}>
                {c.date.getDate()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WeekPicker({ selected, onSelect, tz }) {
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState([]);
  const weeks = Array.from({ length: 12 }, (_, i) => weekRange(-(i + page * 12), tz));
  const from  = weeks[11].from;
  const to    = weeks[0].to;

  useEffect(() => {
    getCalendarStats(from, to).then(d => setStats(d?.Stats || [])).catch(() => setStats([]));
  }, [from, to]);

  const currWeek = weekRange(0, tz);

  return (
    <div style={{ background: 'var(--paper-2)', borderRadius: 14, padding: '14px 16px', border: '1.5px solid var(--paper-edge)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <button className="btn btn-icon btn-ghost" style={{ width: 26, height: 26, padding: 0 }} onClick={() => setPage(p => p + 1)}>
          <Icon name="chevL" size={11} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12 }}>
          {fmtISO(from)} – {fmtISO(to)}
        </span>
        <button className="btn btn-icon btn-ghost" style={{ width: 26, height: 26, padding: 0 }}
          onClick={() => setPage(p => p - 1)} disabled={page === 0}>
          <Icon name="chevR" size={11} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
        {weeks.map(w => {
          const wStats = stats.filter(s => { const iso = (s.StatDate || '').slice(0, 10); return iso >= w.from && iso <= w.to; });
          const agg    = aggregateStats(wStats);
          const sty    = agg ? STATUS_STYLES[agg.status] : null;
          const isSel  = selected?.from === w.from;
          const isCurr = w.from === currWeek.from;
          return (
            <button key={w.from}
              onClick={() => onSelect({ id: w.from, from: w.from, to: w.to, label: isCurr ? 'This week' : `W${w.weekNum}` })}
              style={{
                padding: '10px 8px', borderRadius: 10, border: 'none',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s',
                background: isSel ? 'var(--accent)' : sty ? sty.bg : 'var(--paper)',
                color: isSel ? '#fff' : sty ? sty.color : 'var(--ink-mute)',
                outline: isSel ? 'none' : sty ? `1.5px solid ${sty.color}44` : '1.5px solid var(--paper-edge)',
              }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12 }}>
                {isCurr ? 'This week' : `W${w.weekNum}`}
              </div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: isSel ? 0.85 : 0.65 }}>
                {fmtISO(w.from)} – {fmtISO(w.to)}
              </div>
              {agg && (
                <div style={{ fontSize: 9, marginTop: 3, fontWeight: 700, opacity: 0.85 }}>{agg.totalAdded} wds</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthPicker({ selected, onSelect, tz }) {
  const todayISO = dayRange(0, tz).iso;
  const currY    = parseInt(todayISO.slice(0, 4));
  const currM    = parseInt(todayISO.slice(5, 7)) - 1;
  const [viewY, setViewY] = useState(currY);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    getCalendarStats(`${viewY}-01-01`, `${viewY}-12-31`)
      .then(d => setStats(d?.Stats || [])).catch(() => setStats([]));
  }, [viewY]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const mm      = String(i + 1).padStart(2, '0');
    const lastDay = new Date(viewY, i + 1, 0).getDate();
    const from    = `${viewY}-${mm}-01`;
    const to      = `${viewY}-${mm}-${String(lastDay).padStart(2, '0')}`;
    const mStats  = stats.filter(s => (s.StatDate || '').slice(0, 7) === `${viewY}-${mm}`);
    const agg     = aggregateStats(mStats);
    const sty     = agg ? STATUS_STYLES[agg.status] : null;
    return { from, to, label: MONTH_NAMES[i], agg, sty, isFuture: viewY > currY || (viewY === currY && i > currM) };
  });

  return (
    <div style={{ background: 'var(--paper-2)', borderRadius: 14, padding: '14px 16px', border: '1.5px solid var(--paper-edge)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <button className="btn btn-icon btn-ghost" style={{ width: 26, height: 26, padding: 0 }} onClick={() => setViewY(y => y - 1)}>
          <Icon name="chevL" size={11} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13 }}>{viewY}</span>
        <button className="btn btn-icon btn-ghost" style={{ width: 26, height: 26, padding: 0 }}
          onClick={() => setViewY(y => y + 1)} disabled={viewY >= currY}>
          <Icon name="chevR" size={11} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
        {months.map(m => {
          const isSel = selected?.from === m.from;
          return (
            <button key={m.from}
              onClick={() => !m.isFuture && onSelect({ id: m.from, from: m.from, to: m.to, label: `${m.label} ${viewY}` })}
              disabled={m.isFuture}
              style={{
                padding: '12px 6px', borderRadius: 10, border: 'none',
                cursor: m.isFuture ? 'default' : 'pointer',
                textAlign: 'center', transition: 'all 0.12s',
                background: isSel ? 'var(--accent)' : m.sty ? m.sty.bg : 'var(--paper)',
                color: isSel ? '#fff' : m.sty ? m.sty.color : 'var(--ink-mute)',
                outline: isSel ? 'none' : m.sty ? `1.5px solid ${m.sty.color}44` : '1.5px solid var(--paper-edge)',
                opacity: m.isFuture ? 0.3 : 1,
              }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12 }}>{m.label}</div>
              {m.agg && (
                <div style={{ fontSize: 9, marginTop: 3, fontWeight: 700, opacity: 0.85 }}>{m.agg.totalAdded} wds</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeSummary({ from, to }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from) { setSummary(null); return; }
    setLoading(true);
    getCalendarSummary(from, to || from)
      .then(d => setSummary(d)).catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [from, to]);

  if (!from) return (
    <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--ink-faint)' }}>
      All words in your library will be included.
    </p>
  );
  if (loading) return (
    <div style={{ marginBottom: 18, height: 40, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-faint)', fontSize: 13 }}>
      <div className="spinner" style={{ width: 14, height: 14 }} /> Loading stats…
    </div>
  );
  if (!summary) return null;

  const total    = summary.TotalWordsAdded ?? 0;
  const reviewed = summary.PercentageOfWordsReviewed ?? 0;
  const accuracy = Math.round((summary.AccuracyRate ?? 0) * 100);

  return (
    <div style={{
      marginBottom: 20, padding: '14px 18px', borderRadius: 12,
      background: 'var(--paper-2)', border: '1.5px solid var(--paper-edge)',
      display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
    }}>
      {[{ n: total, lbl: 'WORDS' }, { n: `${reviewed}%`, lbl: 'REVIEWED' }, { n: `${accuracy}%`, lbl: 'ACCURACY' }].map(({ n, lbl }) => (
        <div key={lbl} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 26, lineHeight: 1, color: 'var(--ink)' }}>{n}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: '0.07em', marginTop: 3 }}>{lbl}</div>
        </div>
      ))}
      <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-mute)' }}>
        {total === 0
          ? <span style={{ color: 'var(--ink-faint)' }}>No words in this range</span>
          : <><b style={{ color: 'var(--ink)' }}>{total}</b> word{total !== 1 ? 's' : ''} available</>}
      </div>
    </div>
  );
}

// ── Pre-session config ────────────────────────────────────────────────────────
function ReviewConfig({ config, onStart, onBack }) {
  const tz = getTimezone();
  const isTopic = !!config?.topic;

  const initType = () => {
    if (isTopic || !config?.from) return 'month';
    if (config.from === config.to) return 'day';
    return config.from.endsWith('-01') ? 'month' : 'week';
  };

  const [rangeType, setRangeType] = useState(initType);
  const [selected, setSelected]   = useState(() => {
    const type = initType();
    if (type === 'day') {
      const d = dayRange(0, tz);
      return config?.from ? { id: config.from, from: config.from, to: config.to, label: config.label || config.from }
        : { id: d.iso, from: d.iso, to: d.iso, label: 'Today' };
    }
    if (type === 'week') {
      const w = weekRange(0, tz);
      return config?.from ? { id: config.from, from: config.from, to: config.to, label: config.label || 'This week' }
        : { id: w.from, from: w.from, to: w.to, label: 'This week' };
    }
    const m = monthRange(0, tz);
    return config?.from ? { id: config.from, from: config.from, to: config.to, label: config.label || config.from }
      : { id: m.from, from: m.from, to: m.to, label: `${MONTH_NAMES[m.month]} ${m.year}` };
  });
  const [limit, setLimit] = useState(config?.limit || 20);

  const TABS  = [{ id: 'day', label: 'Day' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'all', label: 'All time' }];
  const QUICK = [5, 10, 20, 30, 50];

  const switchType = (type) => {
    setRangeType(type);
    if (type === 'day')        { const d = dayRange(0, tz);   setSelected({ id: d.iso, from: d.iso, to: d.iso, label: 'Today' }); }
    else if (type === 'week')  { const w = weekRange(0, tz);  setSelected({ id: w.from, from: w.from, to: w.to, label: 'This week' }); }
    else if (type === 'month') { const m = monthRange(0, tz); setSelected({ id: m.from, from: m.from, to: m.to, label: `${MONTH_NAMES[m.month]} ${m.year}` }); }
    else setSelected(null);
  };

  return (
    <div className="canvas fade-in" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <div>
          <div className="kicker">Custom review</div>
          <h1 style={{ marginTop: 8 }}>Set up your session</h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isTopic ? (
          <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 32 }}>📂</div>
            <div>
              <div className="kicker">Reviewing topic</div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, marginTop: 4 }}>
                {config.label || config.topic}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
                Words from this topic only
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 28 }}>
            <div className="kicker" style={{ marginBottom: 14 }}>Time range</div>
            <div style={{ display: 'flex', padding: 4, marginBottom: 20, gap: 2, background: 'var(--paper-2)', border: '1.5px solid var(--paper-edge)', borderRadius: 14 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => switchType(t.id)} style={{
                  flex: 1, padding: '7px 0', border: 'none', borderRadius: 10,
                  fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: rangeType === t.id ? 'var(--accent)' : 'transparent',
                  color: rangeType === t.id ? '#fff' : 'var(--ink-mute)',
                }}>
                  {t.label}
                </button>
              ))}
            </div>
            {rangeType === 'day'   && <DayPicker   selected={selected} onSelect={setSelected} tz={tz} />}
            {rangeType === 'week'  && <WeekPicker  selected={selected} onSelect={setSelected} tz={tz} />}
            {rangeType === 'month' && <MonthPicker selected={selected} onSelect={setSelected} tz={tz} />}
            {rangeType === 'all'   && (
              <div style={{ padding: '18px', borderRadius: 12, textAlign: 'center', background: 'var(--paper-2)', border: '1.5px solid var(--paper-edge)', color: 'var(--ink-mute)', fontSize: 14 }}>
                All words across your entire library will be included.
              </div>
            )}
          </div>
        )}

        <div className="card" style={{ padding: 28 }}>
          {!isTopic && <RangeSummary from={selected?.from} to={selected?.to} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
            <div className="kicker">Words per session</div>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 44, letterSpacing: '-0.025em', lineHeight: 1, color: 'var(--accent)' }}>
              {limit}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {QUICK.map(n => {
              const active = limit === n;
              return (
                <button key={n} onClick={() => setLimit(n)} style={{
                  padding: '7px 20px', borderRadius: 999, border: 'none',
                  fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.12s',
                  background: active ? 'var(--accent)' : 'var(--paper-2)',
                  color: active ? '#fff' : 'var(--ink-mute)',
                  outline: active ? 'none' : '1.5px solid var(--paper-edge)',
                }}>
                  {n}
                </button>
              );
            })}
          </div>
          <input type="range" min={1} max={50} value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
            <span>1 word</span><span>50 words</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={onBack}>
            <Icon name="chevL" size={14} /> Back
          </button>
          <button className="btn btn-primary" style={{ padding: '14px 28px', fontSize: 15 }}
            onClick={() => onStart({
              from: isTopic ? null : (selected?.from || null),
              to:   isTopic ? null : (selected?.to   || null),
              topic: isTopic ? config.topic : null,
              limit,
              label: isTopic ? (config.label || config.topic) : (selected?.label || 'All time'),
            })}>
            <Icon name="play" size={14} /> Start {limit} word{limit !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Review screen ────────────────────────────────────────────────────────
export default function Review({ setScreen, openWord, finishSession, reviewConfig }) {
  const [sessionId, setSessionId] = useState(null);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [animOut, setAnimOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const answering = useRef(false);

  const launch = ({ limit, from, to, topic }) => {
    setShowConfig(false);
    setLoading(true);
    const opts = { limit };
    if (from)  opts.from  = from;
    if (to)    opts.to    = to;
    if (topic) opts.topic = topic;
    startSession(opts)
      .then((data) => {
        setSessionId(data.session_id);
        setItems(data.items || []);
        if (!data.items || data.items.length === 0) setDone(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const currentItem = items[idx];
  const total = items.length;
  const pct = total ? (idx / total) * 100 : 0;

  const handleAnswer = async (correct) => {
    if (!currentItem || !sessionId || answering.current) return;
    answering.current = true;
    const reviewType = currentItem.review_type || currentItem.quiz?.quiz_type || 'word_meaning_mcq';

    setAnimOut(correct ? 'right' : 'left');

    const newResults = [...results, {
      word_id: currentItem.word_id,
      word_text: currentItem.word_text,
      review_type: reviewType,
      correct,
    }];
    setResults(newResults);

    try {
      await submitReview(sessionId, currentItem.word_id, reviewType, correct);
    } catch {}

    setTimeout(async () => {
      setAnimOut(null);
      answering.current = false;
      try {
        const next = await getCurrentItem(sessionId);
        if (next?.done) {
          finishSession(newResults);
        } else {
          setIdx((i) => i + 1);
        }
      } catch {
        if (idx + 1 >= total) {
          finishSession(newResults);
        } else {
          setIdx((i) => i + 1);
        }
      }
    }, 380);
  };

  const handleSkip = async () => {
    if (!sessionId || answering.current) return;
    try { await advanceSession(sessionId); } catch {}
    if (idx + 1 >= total) {
      finishSession(results);
    } else {
      setIdx((i) => i + 1);
    }
  };

  // Keyboard shortcuts: ← = didn't know, → = got it
  useEffect(() => {
    if (showConfig || !currentItem) return;
    const onKey = (e) => {
      // Don't trigger when focused in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')  handleAnswer(false);
      if (e.key === 'ArrowRight') handleAnswer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfig, currentItem, idx, sessionId]);

  if (showConfig) {
    return (
      <ReviewConfig
        config={reviewConfig}
        onStart={launch}
        onBack={() => setScreen('calendar')}
      />
    );
  }

  if (loading) {
    return (
      <div className="canvas" style={{ maxWidth: 760, display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="canvas fade-in" style={{ maxWidth: 760 }}>
        <div style={{ padding: '20px 24px', background: 'var(--rose-soft)', borderRadius: 16, color: 'var(--rose)' }}>
          <b>Could not start session:</b> {error}
        </div>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => setScreen('calendar')}>
          <Icon name="chevL" size={14} /> Back to dashboard
        </button>
      </div>
    );
  }

  if (done || !currentItem) {
    return (
      <div className="canvas fade-in" style={{ maxWidth: 760 }}>
        <div className="center" style={{ padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2>No words to review right now!</h2>
          <div className="muted" style={{ marginTop: 8 }}>
            Add new words to start building your queue.
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 24, gap: 12 }}>
            <button className="btn btn-primary" onClick={() => setScreen('calendar')}>
              <Icon name="home" size={14} /> Dashboard
            </button>
            <button className="btn" onClick={() => setScreen('library')}>
              Browse library
            </button>
          </div>
        </div>
      </div>
    );
  }

  const format = currentItem.review_type || currentItem.quiz?.quiz_type || 'word_meaning_mcq';

  return (
    <div className="canvas fade-in" style={{ maxWidth: 760 }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="btn btn-ghost" onClick={() => setScreen('calendar')}>
          <Icon name="x" size={14} /> End session
        </button>
        <div className="row" style={{ gap: 14 }}>
          <span className="muted" style={{ fontStyle: 'italic', fontSize: 13 }}>Reviewing</span>
          <span className="faint mono" style={{ fontSize: 12 }}>{idx + 1} / {total}</span>
          <span className="tag tag-pos">{FORMAT_LABELS[format] ?? format}</span>
        </div>
      </div>

      <div className="progress" style={{ marginBottom: 24 }}>
        <span style={{ width: pct + '%' }} />
      </div>

      <div className={'review-card' + (animOut ? ' swipe-' + animOut : '')} key={idx}>
        {MCQ_TYPES.has(format) && <MCQ item={currentItem} onAnswer={handleAnswer} />}
        {TYPING_TYPES.has(format) && <RecallTyping item={currentItem} onAnswer={handleAnswer} />}
        {FILL_TYPES.has(format) && <ContextTyping item={currentItem} onAnswer={handleAnswer} />}
      </div>

      {/* Action bar: didn't know / got it buttons + skip / see card */}
      <div className="row between" style={{ marginTop: 18 }}>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ gap: 6, color: 'var(--rose)', borderColor: 'var(--rose-soft)', fontSize: 13 }}
            onClick={() => handleAnswer(false)}
          >
            <span className="kbd">←</span> didn't know
          </button>
          <button
            className="btn btn-ghost"
            style={{ gap: 6, color: 'var(--leaf)', borderColor: 'var(--mint-soft)', fontSize: 13 }}
            onClick={() => handleAnswer(true)}
          >
            <span className="kbd">→</span> got it
          </button>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={handleSkip}>
            Skip
          </button>
          {currentItem.word_id && (
            <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => openWord(currentItem.word_id)}>
              See card <Icon name="arrow" size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
