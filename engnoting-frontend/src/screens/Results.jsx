import Icon from '../components/Icons.jsx';

export default function Results({ results, setScreen, openWord }) {
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const minutes = Math.max(1, Math.round(total * 1.1));

  let headline = 'Solid session.';
  if (pct >= 90) headline = 'Brilliant.';
  else if (pct >= 75) headline = 'Strong work.';
  else if (pct >= 50) headline = 'Good progress.';
  else headline = 'Today was for stretching.';

  return (
    <div className="canvas fade-in" style={{ maxWidth: 820 }}>
      <div className="kicker">Session complete</div>
      <h1 style={{ marginTop: 8, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 64, letterSpacing: '-0.030em', lineHeight: 1 }}>
        {headline}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, marginTop: 32, alignItems: 'center' }}>
        <div className="donut" style={{ '--p': pct }}>
          <span>{pct}%</span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em' }}>
            {correct} of {total} correct · {minutes} minute{minutes === 1 ? '' : 's'}
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Great effort. The queue rebuilds for your next session.
          </div>
          <div className="row" style={{ gap: 10, marginTop: 18 }}>
            <button className="btn btn-primary" onClick={() => setScreen('dashboard')}>
              <Icon name="check" size={14} /> Done for today
            </button>
            <button className="btn" onClick={() => setScreen('library')}>
              Browse library
            </button>
          </div>
        </div>
      </div>

      <hr className="divider" style={{ margin: '32px 0' }} />

      <div className="kicker">Word by word</div>
      <div className="card" style={{ padding: 0, marginTop: 14, overflow: 'hidden' }}>
        {results.length === 0 && (
          <div className="center muted" style={{ padding: '24px' }}>No answers recorded.</div>
        )}
        {results.map((r, i) => (
          <div
            key={i}
            className="word-row"
            style={{ gridTemplateColumns: '36px 1.6fr 1fr 0.8fr 0.5fr', cursor: 'pointer' }}
            onClick={() => r.word_id && openWord(r.word_id)}
          >
            <div className="faint mono" style={{ fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</div>
            <div className="w-text">{r.word_text}</div>
            <div className="w-def" />
            <div><span className="tag">{(r.review_type || '').replace('_', ' ')}</span></div>
            <div style={{ textAlign: 'right' }}>
              {r.correct
                ? <span style={{ color: 'var(--leaf)' }}><Icon name="check" size={18} /></span>
                : <span style={{ color: 'var(--rose)' }}><Icon name="x" size={18} /></span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card-soft" style={{ marginTop: 24, padding: 24 }}>
        <div className="kicker">Next session</div>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, marginTop: 8, letterSpacing: '-0.01em' }}>
          We'll resurface <b>{Math.max(3, total - correct + 2)}</b> words — including the ones that tripped you up.
        </div>
        <div className="muted" style={{ marginTop: 6, fontSize: 14 }}>
          Eng-noting spaces reviews to keep learning gentle and effective.
        </div>
      </div>
    </div>
  );
}
