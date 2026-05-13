import { useState, useEffect } from 'react';
import Icon from '../components/Icons.jsx';
import { getWord, updateWord, regenerateAI } from '../api/words.js';

export default function WordDetail({ wordId, setScreen, goToLibrary }) {
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const [editingContext, setEditingContext] = useState(false);
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [pollingAI, setPollingAI] = useState(false);

  useEffect(() => {
    if (!wordId) return;
    setLoading(true);
    setFlipped(false);
    getWord(wordId)
      .then((w) => {
        setWord(w);
        setContext(w.context || '');
        if (!w.definition) startPolling();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wordId]);

  const startPolling = () => {
    setPollingAI(true);
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      try {
        const fresh = await getWord(wordId);
        if (fresh.definition) {
          setWord(fresh);
          setPollingAI(false);
          clearInterval(timer);
        }
      } catch {}
      if (attempts >= 20) { clearInterval(timer); setPollingAI(false); }
    }, 3000);
  };

  const saveContext = async () => {
    if (!word) return;
    setSaving(true);
    try {
      await updateWord(word.id, word.text, context);
      setWord({ ...word, context });
      setEditingContext(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const triggerRegenerate = async () => {
    if (!word) return;
    try {
      await regenerateAI(word.id, word.text, word.context);
      startPolling();
    } catch {}
  };

  if (loading) {
    return (
      <div className="canvas" style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (error || !word) {
    return (
      <div className="canvas">
        <button className="btn btn-ghost" onClick={() => goToLibrary()}>
          <Icon name="chevL" size={14} /> Library
        </button>
        <div className="muted" style={{ marginTop: 24 }}>
          {error || 'Word not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="canvas fade-in">
      <div className="row" style={{ marginBottom: 18 }}>
        <button className="btn btn-ghost" onClick={() => goToLibrary()}>
          <Icon name="chevL" size={14} /> Library
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28 }}>
        {/* Flip card */}
        <div>
          <div className="kicker">Memory card</div>
          <div className="muted" style={{ fontSize: 13, margin: '4px 0 14px' }}>
            Click to flip · Press <span className="kbd">Space</span>
          </div>
          <div className="flip-wrap">
            <div
              className={'flip' + (flipped ? ' flipped' : '')}
              onClick={() => setFlipped(!flipped)}
              style={{ cursor: 'pointer' }}
              tabIndex={0}
              onKeyDown={(e) => e.key === ' ' && (e.preventDefault(), setFlipped(!flipped))}
            >
              <div className="flip-face flip-front">
                <div className="row" style={{ gap: 10 }}>
                  {word.cefr_level && <span className={`tag cefr-${word.cefr_level}`}>{word.cefr_level}</span>}
                  {word.part_of_speech && <span className="tag tag-pos">{word.part_of_speech}</span>}
                </div>
                <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                  <h1 style={{ fontSize: 72, letterSpacing: '-0.03em', fontFamily: 'var(--display)', fontWeight: 800 }}>
                    {word.text}
                  </h1>
                </div>
                <div className="row faint" style={{ fontSize: 12.5, justifyContent: 'space-between' }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Icon name="flip" size={13} /> Tap to reveal meaning
                  </div>
                </div>
              </div>

              <div className="flip-face flip-back">
                <div className="kicker" style={{ color: 'oklch(1 0 0 / 0.85)' }}>Meaning</div>
                {word.definition ? (
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, marginTop: 8, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                    {word.definition}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, color: 'oklch(1 0 0 / 0.65)', fontSize: 16 }}>
                    {pollingAI ? 'AI is generating…' : 'No definition yet.'}
                  </div>
                )}

                {word.example_good && (
                  <div style={{ marginTop: 18, padding: '16px 18px', background: 'oklch(1 0 0 / 0.18)', borderRadius: 12 }}>
                    <div className="kicker" style={{ color: 'oklch(1 0 0 / 0.85)' }}>Use it like this</div>
                    <div style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 17, marginTop: 6, color: 'var(--paper)', fontWeight: 500 }}>
                      "{word.example_good}"
                    </div>
                  </div>
                )}

                <div className="row faint" style={{ fontSize: 12.5, marginTop: 'auto', color: 'oklch(1 0 0 / 0.78)' }}>
                  <Icon name="flip" size={13} /> Tap to flip back
                </div>
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 18, gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setScreen('review')}>
              <Icon name="play" size={14} /> Practice now
            </button>
            {!word.definition && !pollingAI && (
              <button className="btn" onClick={triggerRegenerate}>
                <Icon name="refresh" size={14} /> Generate AI
              </button>
            )}
            {pollingAI && (
              <div className="row muted" style={{ fontSize: 13.5 }}>
                <span className="spinner" style={{ width: 14, height: 14 }} /> Generating AI…
              </div>
            )}
          </div>

          {/* Vietnamese meaning */}
          {(word.vi_meaning || word.definition) && (
            <div className="card" style={{ marginTop: 18, padding: 0, overflow: 'hidden', borderColor: showVi ? 'var(--accent)' : 'var(--paper-edge)' }}>
              <button
                onClick={() => setShowVi((v) => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 22px', background: showVi ? 'var(--accent-soft)' : 'var(--paper)',
                  border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'background .15s',
                }}
              >
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, background: 'var(--accent)', color: '#fff', padding: '3px 8px', borderRadius: 99 }}>
                    VI
                  </span>
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                    {showVi ? 'Vietnamese meaning' : 'View Vietnamese meaning'}
                  </span>
                </div>
                <span style={{ transform: showVi ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--ink-mute)' }}>
                  <Icon name="chevR" size={14} />
                </span>
              </button>
              {showVi && (
                <div style={{ padding: '18px 22px 22px', borderTop: '1.5px dashed var(--paper-edge)', background: 'var(--paper)' }}>
                  {word.vi_meaning ? (
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.015em' }}>
                      {word.vi_meaning}
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: 14 }}>
                      Vietnamese translation is being generated. Check back soon.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside>
          {/* Context / original sentence */}
          <div className="card" style={{ padding: 24 }}>
            <div className="kicker">Added</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {new Date(word.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>

            <hr className="divider" />

            <div className="between">
              <div className="kicker">Original context</div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => {
                  if (editingContext) saveContext();
                  else setEditingContext(true);
                }}
              >
                <Icon name={editingContext ? 'check' : 'edit'} size={13} />
              </button>
            </div>
            {editingContext ? (
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                autoFocus
                rows={3}
                className="input"
                style={{ marginTop: 8, fontStyle: 'italic', lineHeight: 1.5, resize: 'vertical' }}
              />
            ) : (
              <div style={{ marginTop: 8, color: 'var(--ink-2)', lineHeight: 1.5, fontStyle: word.context ? 'italic' : 'normal' }}>
                {word.context || <span className="faint">No context added.</span>}
              </div>
            )}
            {editingContext && (
              <div className="row" style={{ marginTop: 10, gap: 8 }}>
                <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={saveContext} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { setContext(word.context || ''); setEditingContext(false); }}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Confidence */}
          <div className="card" style={{ padding: 24, marginTop: 16 }}>
            <div className="between">
              <div className="kicker">Confidence</div>
              <span className="faint mono" style={{ fontSize: 11 }}>{word.confidence ?? 1} / 5</span>
            </div>
            <div className="row" style={{ gap: 6, marginTop: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const conf = word.confidence ?? 1;
                return (
                  <div
                    key={n}
                    title={['Just met it', 'Shaky', 'Getting it', 'Solid', 'Mastered'][n - 1]}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 10, textAlign: 'center',
                      border: n === conf ? '2px solid var(--ink)' : '1px solid var(--rule)',
                      background: n <= conf
                        ? `oklch(${0.96 - (n - 1) * 0.08} ${0.04 + (n - 1) * 0.02} ${145 - (5 - n) * 15})`
                        : 'var(--paper)',
                      color: n <= conf ? 'var(--ink)' : 'var(--ink-faint)',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--display)', fontSize: 20, lineHeight: 1, fontWeight: 700 }}>{n}</div>
                  </div>
                );
              })}
            </div>
            <div className="row between" style={{ marginTop: 10, fontSize: 12 }}>
              <span className="faint">1 · just met</span>
              <span className="faint">5 · mastered</span>
            </div>
          </div>

          {/* Source / context hint */}
          {word.source && (
            <div className="card" style={{ padding: 24, marginTop: 16 }}>
              <div className="kicker">Source</div>
              <div style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14 }}>{word.source}</div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--rose-soft)', borderRadius: 10, color: 'var(--rose)', fontSize: 13.5 }}>
              {error}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
