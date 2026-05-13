import { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icons.jsx';
import { startSession, getCurrentItem, submitReview, advanceSession } from '../api/reviews.js';

const FORMAT_LABELS = {
  mcq: 'Multiple choice',
  match: 'Matching',
  typing: 'Typing',
  fill_blank: 'Fill in the blank',
};

// ── MCQ ──────────────────────────────────────────────────────────────────────
function MCQ({ item, onAnswer }) {
  const { quiz, word_text } = item;
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);

  const choices = quiz?.choices ?? [];
  const correctAnswer = quiz?.answer ?? '';

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
        <span className="tag tag-pos">{FORMAT_LABELS.mcq}</span>
        <span className="muted" style={{ fontSize: 14, marginLeft: 'auto', fontStyle: 'italic' }}>
          choose the correct meaning
        </span>
      </div>
      <h1 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 64, letterSpacing: '-0.025em' }}>
        {word_text}
      </h1>
      {quiz?.question && (
        <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>{quiz.question}</div>
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

// ── Typing ────────────────────────────────────────────────────────────────────
function Typing({ item, onAnswer }) {
  const { quiz, word_text } = item;
  const [val, setVal] = useState('');
  const [reveal, setReveal] = useState(false);
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    if (reveal || !val.trim()) return;
    setReveal(true);
    const correct = val.trim().toLowerCase() === (quiz?.answer ?? word_text).toLowerCase();
    setTimeout(() => onAnswer(correct), 900);
  };

  const isCorrect = val.trim().toLowerCase() === (quiz?.answer ?? word_text).toLowerCase();

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 18 }}>
        <span className="tag tag-pos">{FORMAT_LABELS.typing}</span>
        <span className="muted" style={{ fontSize: 14, marginLeft: 'auto', fontStyle: 'italic' }}>type the word</span>
      </div>
      <div className="kicker">Question</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, lineHeight: 1.25, letterSpacing: '-0.015em', marginTop: 8 }}>
        {quiz?.question ?? `What word means this?`}
      </div>
      <div style={{ marginTop: 24 }}>
        <input
          ref={ref}
          className="input input-lg"
          placeholder="Type the word…"
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
            The answer was <b style={{ fontFamily: 'var(--display)' }}>{quiz?.answer ?? word_text}</b>.
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

// ── Fill in the blank ─────────────────────────────────────────────────────────
function FillBlank({ item, onAnswer }) {
  const { quiz, word_text } = item;
  const [val, setVal] = useState('');
  const [reveal, setReveal] = useState(false);
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const sentence = quiz?.question ?? `Fill in the blank: _____.`;
  const answer = quiz?.answer ?? word_text;
  const re = new RegExp(`(${answer})`, 'i');
  const parts = sentence.split(re);

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
        <span className="tag tag-pos">{FORMAT_LABELS.fill_blank}</span>
        <span className="muted" style={{ fontSize: 14, marginLeft: 'auto', fontStyle: 'italic' }}>fill in the blank</span>
      </div>
      <div className="kicker">Complete the sentence</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, lineHeight: 1.4, letterSpacing: '-0.01em', marginTop: 12 }}>
        {parts.map((p, i) =>
          re.test(p) ? (
            <input
              key={i} ref={ref}
              className="input"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              disabled={reveal}
              placeholder="_____"
              style={{
                display: 'inline-block', width: Math.max(120, answer.length * 16),
                fontFamily: 'var(--display)', fontSize: 26, padding: '4px 10px', borderRadius: 8,
                ...(reveal ? (isCorrect
                  ? { borderColor: 'var(--leaf)', background: 'oklch(0.96 0.04 145)' }
                  : { borderColor: 'var(--rose)', background: 'oklch(0.96 0.04 25)' }) : {}),
              }}
            />
          ) : <span key={i}>{p}</span>
        )}
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

// ── Main Review screen ────────────────────────────────────────────────────────
export default function Review({ setScreen, openWord, finishSession }) {
  const [sessionId, setSessionId] = useState(null);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [animOut, setAnimOut] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setLoading(true);
    startSession()
      .then((data) => {
        setSessionId(data.session_id);
        setItems(data.items || []);
        if (!data.items || data.items.length === 0) setDone(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const currentItem = items[idx];
  const total = items.length;
  const pct = total ? (idx / total) * 100 : 0;

  const handleAnswer = async (correct) => {
    if (!currentItem || !sessionId) return;
    const reviewType = currentItem.review_type || currentItem.quiz?.quiz_type || 'mcq';

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
    if (!sessionId) return;
    try { await advanceSession(sessionId); } catch {}
    if (idx + 1 >= total) {
      finishSession(results);
    } else {
      setIdx((i) => i + 1);
    }
  };

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
        <button className="btn" style={{ marginTop: 16 }} onClick={() => setScreen('dashboard')}>
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
            <button className="btn btn-primary" onClick={() => setScreen('dashboard')}>
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

  const format = currentItem.review_type || currentItem.quiz?.quiz_type || 'mcq';
  const hasChoices = format === 'mcq' && (currentItem.quiz?.choices?.length ?? 0) > 0;

  return (
    <div className="canvas fade-in" style={{ maxWidth: 760 }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="btn btn-ghost" onClick={() => setScreen('dashboard')}>
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
        {format === 'mcq' && hasChoices && <MCQ item={currentItem} onAnswer={handleAnswer} />}
        {(format === 'typing' || (format === 'mcq' && !hasChoices)) && (
          <Typing item={currentItem} onAnswer={handleAnswer} />
        )}
        {format === 'fill_blank' && <FillBlank item={currentItem} onAnswer={handleAnswer} />}
        {format === 'match' && <Typing item={currentItem} onAnswer={handleAnswer} />}
      </div>

      <div className="row between" style={{ marginTop: 18, color: 'var(--ink-mute)', fontSize: 12.5 }}>
        <div className="row" style={{ gap: 14 }}>
          <span><span className="kbd">←</span> didn't know</span>
          <span><span className="kbd">→</span> got it</span>
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
