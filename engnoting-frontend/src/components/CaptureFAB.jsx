import { useState, useEffect, useRef } from 'react';
import Icon from './Icons.jsx';
import { createWord } from '../api/words.js';

export default function CaptureFAB({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [ctx, setCtx] = useState('');
  const [stage, setStage] = useState('input');
  const [error, setError] = useState('');
  const [savedWord, setSavedWord] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && stage === 'input') {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, stage]);

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setStage('input');
      setText('');
      setCtx('');
      setError('');
      setSavedWord(null);
    }, 220);
  };

  const submit = async () => {
    if (!text.trim()) return;
    setStage('saving');
    setError('');
    try {
      const data = await createWord(text.trim(), ctx.trim() || undefined);
      setSavedWord({ id: data.word_id, text: text.trim() });
      setStage('saved');
    } catch (err) {
      setError(err.message || 'Failed to save word.');
      setStage('input');
    }
  };

  const handleSaved = () => {
    onSaved?.(savedWord);
    close();
  };

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} title="Capture a word (⌘K)">
        <Icon name="plus" size={22} />
      </button>

      {open && (
        <div className="modal-veil" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="modal" role="dialog" aria-label="Capture a word">
            <div className="modal-head">
              <div className="kicker">Capture</div>
              <h2 style={{ marginTop: 6 }}>Add a word to your notebook</h2>
            </div>

            {(stage === 'input' || stage === 'saving') && (
              <div className="modal-body">
                {error && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--rose-soft)', borderRadius: 10, color: 'var(--rose)', fontSize: 13.5 }}>
                    {error}
                  </div>
                )}
                <label className="label">The word</label>
                <input
                  ref={inputRef}
                  className="input input-lg"
                  placeholder="e.g. resilient"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  disabled={stage === 'saving'}
                />
                <div style={{ height: 18 }} />
                <label className="label">Where you found it <span className="faint">(optional)</span></label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="The full sentence, or a quick note about the source."
                  value={ctx}
                  onChange={(e) => setCtx(e.target.value)}
                  disabled={stage === 'saving'}
                />
                <div className="row faint" style={{ marginTop: 14, fontSize: 12.5 }}>
                  <Icon name="spark" size={14} />
                  <span>AI definition, examples, and CEFR level appear after saving.</span>
                </div>
              </div>
            )}

            {stage === 'saved' && savedWord && (
              <div className="modal-body center" style={{ padding: '32px 28px' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div className="kicker">Saved!</div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 32, marginTop: 8, letterSpacing: '-0.025em' }}>
                  {savedWord.text}
                </div>
                <div className="muted" style={{ marginTop: 10, fontSize: 13.5 }}>
                  AI explanation is being generated in the background.
                </div>
              </div>
            )}

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={close}>
                {stage === 'saved' ? 'Close' : 'Cancel'}
              </button>
              {(stage === 'input' || stage === 'saving') && (
                <button className="btn btn-primary" onClick={submit} disabled={!text.trim() || stage === 'saving'}>
                  {stage === 'saving' ? (
                    <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</>
                  ) : (
                    <>Save <Icon name="arrow" size={14} /></>
                  )}
                </button>
              )}
              {stage === 'saved' && (
                <button className="btn btn-primary" onClick={handleSaved}>
                  <Icon name="check" size={14} /> Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
