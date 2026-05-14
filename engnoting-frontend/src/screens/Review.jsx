import { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icons.jsx';
import { startSession, getCurrentItem, submitReview, advanceSession } from '../api/reviews.js';
import { loadLastReview } from './Results.jsx';

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

// ── Pre-session config ────────────────────────────────────────────────────────
function ReviewConfig({ config, onStart, onBack }) {
  const isTopic = !!config?.topic;
  const [limit, setLimit] = useState(config?.limit || 20);
  const QUICK = [5, 10, 20, 30, 50];
  const last = loadLastReview();

  return (
    <div className="canvas fade-in" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <div>
          <div className="kicker">Review session</div>
          <h1 style={{ marginTop: 8 }}>Set up your session</h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isTopic && (
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
        )}

        {!isTopic && config?.label && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent-deep)', fontSize: 13, padding: '5px 12px' }}>
              {config.label}
            </span>
          </div>
        )}

        <div className="card" style={{ padding: 28 }}>
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
              from: isTopic ? null : (config?.from || null),
              to:   isTopic ? null : (config?.to   || null),
              topic: isTopic ? config.topic : null,
              limit,
              label: config?.label || 'All time',
            })}>
            <Icon name="play" size={14} /> Start {limit} word{limit !== 1 ? 's' : ''}
          </button>
        </div>

        {last && <LastReviewCard last={last} />}
      </div>
    </div>
  );
}

function LastReviewCard({ last }) {
  const date = new Date(last.date);
  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const scoreColor = last.pct >= 80 ? 'var(--leaf)' : last.pct >= 50 ? 'var(--accent)' : 'var(--rose)';

  return (
    <div style={{ borderTop: '1.5px solid var(--paper-edge)', paddingTop: 28, marginTop: 8 }}>
      <div className="kicker" style={{ marginBottom: 14 }}>Last session · {dateLabel}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center', marginBottom: 18 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          border: `4px solid ${scoreColor}`,
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20,
          color: scoreColor,
        }}>
          {last.pct}%
        </div>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>
            {last.evaluation}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{last.message}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>
            {last.correct} correct · {last.total - last.correct} missed · {last.total} total
          </div>
        </div>
      </div>

      {last.incorrectWords?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--rose)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Missed ({last.incorrectWords.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {last.incorrectWords.map((w, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 999,
                background: 'oklch(0.96 0.03 25)',
                color: 'var(--rose)',
                fontSize: 13, fontFamily: 'var(--display)', fontWeight: 600,
              }}>
                {w.word_text}
              </span>
            ))}
          </div>
        </div>
      )}

      {last.correctWords?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--leaf)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Correct ({last.correctWords.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {last.correctWords.map((w, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 999,
                background: 'oklch(0.96 0.04 145)',
                color: 'var(--leaf)',
                fontSize: 13, fontFamily: 'var(--display)', fontWeight: 600,
              }}>
                {w.word_text}
              </span>
            ))}
          </div>
        </div>
      )}
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
      accuracy_rate: currentItem.accuracy_rate ?? 0,
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
