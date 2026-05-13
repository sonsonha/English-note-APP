// Capture FAB + modal
const CaptureFab = ({ onAdd }) => {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [ctx, setCtx] = React.useState("");
  const [stage, setStage] = React.useState("input"); // input | thinking | preview
  const [preview, setPreview] = React.useState(null);
  const inputRef = React.useRef(null);

  // Cmd/Ctrl + K
  React.useEffect(() => {
    const k = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  React.useEffect(() => {
    if (open && stage === "input") setTimeout(() => inputRef.current?.focus(), 60);
  }, [open, stage]);

  const close = () => {
    setOpen(false);
    setTimeout(() => { setStage("input"); setText(""); setCtx(""); setPreview(null); }, 220);
  };

  const submit = () => {
    if (!text.trim()) return;
    setStage("thinking");
    // Fake AI explanation
    setTimeout(() => {
      const guesses = {
        "obfuscate": { definition: "To deliberately make something unclear or hard to understand.", pos: "verb", cefr: "C1", exampleGood: "The contract was written to obfuscate its real meaning." },
        "lucid":     { definition: "Expressed clearly; easy to understand.", pos: "adj.", cefr: "B2", exampleGood: "Her lucid explanation calmed the room." },
        "verbose":   { definition: "Using more words than needed.", pos: "adj.", cefr: "B2", exampleGood: "His verbose emails took ages to read." },
      };
      const g = guesses[text.toLowerCase()] || {
        definition: "An AI-generated explanation will appear here within a moment.",
        pos: "—", cefr: "B1",
        exampleGood: ctx || `A clear sentence using "${text}" goes here.`,
      };
      setPreview({ text: text.trim(), context: ctx, ...g });
      setStage("preview");
    }, 900);
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
              <h2 className="serif" style={{marginTop:6}}>Add a word to your notebook</h2>
            </div>

            {stage === "input" && (
              <div className="modal-body">
                <label className="label">The word</label>
                <input
                  ref={inputRef}
                  className="input input-lg"
                  placeholder="e.g. resilient"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                <div style={{height:18}} />
                <label className="label">Where you found it (optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="The full sentence, or a quick note about the source."
                  value={ctx}
                  onChange={(e) => setCtx(e.target.value)}
                />
                <div className="row faint" style={{marginTop:14, fontSize:12.5}}>
                  <Icon name="spark" size={14} />
                  <span>The AI definition, examples, and CEFR level appear after you save.</span>
                </div>
              </div>
            )}

            {stage === "thinking" && (
              <div className="modal-body center" style={{padding:"40px 26px"}}>
                <div className="kicker">Thinking…</div>
                <div className="serif" style={{fontSize:32, marginTop:10, letterSpacing:"-0.02em"}}>
                  Drafting a card for <em>{text}</em>
                </div>
                <div className="muted" style={{marginTop:10, fontSize:13.5}}>
                  Pulling a definition, an example, and a CEFR level…
                </div>
                <div className="progress" style={{marginTop:22, maxWidth:280, marginInline:"auto"}}>
                  <span style={{width:"66%", animation:"none"}} />
                </div>
              </div>
            )}

            {stage === "preview" && preview && (
              <div className="modal-body">
                <div className="row" style={{gap:10, marginBottom:6}}>
                  <span className={"tag cefr-" + preview.cefr}>{preview.cefr}</span>
                  <span className="tag tag-pos">{preview.pos}</span>
                </div>
                <h2 className="serif" style={{fontSize:38, letterSpacing:"-0.025em"}}>{preview.text}</h2>
                <p style={{marginTop:8, fontSize:16, color:"var(--ink-2)"}}>{preview.definition}</p>
                <div className="card-soft" style={{marginTop:14}}>
                  <div className="kicker" style={{marginBottom:6}}>Example</div>
                  <div className="serif" style={{fontSize:18, fontStyle:"italic"}}>"{preview.exampleGood}"</div>
                </div>
                <div className="row faint" style={{marginTop:12, fontSize:12.5}}>
                  <Icon name="info" size={13} /> You can edit any of this from the word page.
                </div>
              </div>
            )}

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              {stage === "input" && (
                <button className="btn btn-primary" onClick={submit} disabled={!text.trim()}>
                  Capture <Icon name="arrow" size={14} />
                </button>
              )}
              {stage === "preview" && (
                <button className="btn btn-primary" onClick={() => { onAdd?.(preview); close(); }}>
                  Save to library <Icon name="check" size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

window.CaptureFab = CaptureFab;
