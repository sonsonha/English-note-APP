import { useEffect } from 'react';
import Icon from '../components/Icons.jsx';

const LAST_REVIEW_KEY = 'engnoting_last_review';

function getEvaluation(pct) {
  if (pct >= 95) return { word: 'Flawless',       message: "You nailed every word. Your memory is razor-sharp right now." };
  if (pct >= 80) return { word: 'Excellent',       message: "Nearly perfect. A few more sessions and the remaining words will be locked in." };
  if (pct >= 65) return { word: 'Strong',          message: "Solid work — you know most of these well. Keep at the tricky ones." };
  if (pct >= 50) return { word: 'Decent',          message: "Real progress. Revisiting the missed words will push you forward quickly." };
  if (pct >= 30) return { word: 'Keep at it',      message: "Challenging session — that's where learning happens. Come back tomorrow." };
  return          { word: 'Just starting',          message: "Every expert started here. Your first step is already done." };
}

export function saveLastReview(data) {
  try { localStorage.setItem(LAST_REVIEW_KEY, JSON.stringify(data)); } catch {}
}

export function loadLastReview() {
  try { return JSON.parse(localStorage.getItem(LAST_REVIEW_KEY) || 'null'); } catch { return null; }
}

export default function Results({ results, setScreen, openWord }) {
  const correct   = results.filter((r) => r.correct).length;
  const incorrect = results.length - correct;
  const total     = results.length;
  const pct       = total ? Math.round((correct / total) * 100) : 0;
  const { word: evalWord, message } = getEvaluation(pct);

  const incorrectWords = results
    .filter((r) => !r.correct)
    .sort((a, b) => (a.accuracy_rate ?? 0) - (b.accuracy_rate ?? 0));

  const correctWords = results
    .filter((r) => r.correct)
    .sort((a, b) => (b.accuracy_rate ?? 0) - (a.accuracy_rate ?? 0));

  useEffect(() => {
    if (total === 0) return;
    saveLastReview({
      date: new Date().toISOString(),
      total,
      correct,
      pct,
      evaluation: evalWord,
      message,
      incorrectWords: incorrectWords.map((r) => ({ word_id: r.word_id, word_text: r.word_text, accuracy_rate: r.accuracy_rate ?? 0 })),
      correctWords:   correctWords.map((r)   => ({ word_id: r.word_id, word_text: r.word_text, accuracy_rate: r.accuracy_rate ?? 0 })),
    });
  }, []);

  return (
    <div className="canvas fade-in" style={{ maxWidth: 820 }}>
      <div className="kicker">Session complete</div>
      <h1 style={{ marginTop: 8, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 64, letterSpacing: '-0.030em', lineHeight: 1 }}>
        {evalWord}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, marginTop: 32, alignItems: 'center' }}>
        <div className="donut" style={{ '--p': pct }}>
          <span>{pct}%</span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em' }}>
            {correct} correct · {incorrect} missed · {total} total
          </div>
          <div className="muted" style={{ marginTop: 6 }}>{message}</div>
          <div className="row" style={{ gap: 10, marginTop: 18 }}>
            <button className="btn btn-primary" onClick={() => setScreen('calendar')}>
              <Icon name="check" size={14} /> Done
            </button>
            <button className="btn" onClick={() => setScreen('review')}>
              Review again
            </button>
            <button className="btn" onClick={() => setScreen('library')}>
              Browse library
            </button>
          </div>
        </div>
      </div>

      {incorrectWords.length > 0 && (
        <>
          <hr className="divider" style={{ margin: '32px 0 24px' }} />
          <div className="kicker" style={{ color: 'var(--rose)' }}>Missed · {incorrectWords.length} word{incorrectWords.length !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4, marginBottom: 12 }}>sorted by accuracy — lowest first</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {incorrectWords.map((r, i) => (
              <WordRow key={i} index={i} r={r} openWord={openWord} accentColor="var(--rose)" />
            ))}
          </div>
        </>
      )}

      {correctWords.length > 0 && (
        <>
          <hr className="divider" style={{ margin: '32px 0 24px' }} />
          <div className="kicker" style={{ color: 'var(--leaf)' }}>Correct · {correctWords.length} word{correctWords.length !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4, marginBottom: 12 }}>sorted by accuracy — highest first</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {correctWords.map((r, i) => (
              <WordRow key={i} index={i} r={r} openWord={openWord} accentColor="var(--leaf)" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WordRow({ index, r, openWord, accentColor }) {
  const accPct = Math.round((r.accuracy_rate ?? 0) * 100);
  return (
    <div
      className="word-row"
      style={{ gridTemplateColumns: '36px 1.6fr 1fr 0.6fr', cursor: 'pointer' }}
      onClick={() => r.word_id && openWord(r.word_id)}
    >
      <div className="faint mono" style={{ fontSize: 12 }}>{String(index + 1).padStart(2, '0')}</div>
      <div className="w-text">{r.word_text}</div>
      <div className="w-def" />
      <div style={{ textAlign: 'right', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: accentColor }}>
        {accPct}%
      </div>
    </div>
  );
}
