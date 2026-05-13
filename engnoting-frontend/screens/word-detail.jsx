// Word detail — flip card + editable meaning/context/note + confidence
const WordDetail = ({ wordId, setScreen }) => {
  const w = window.getWord(wordId);
  const [flipped, setFlipped] = React.useState(false);

  // Editable fields with localStorage persistence
  const key = "engnoting:word:" + (w?.id || "x");
  const stored = (() => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } })();

  const [meaning, setMeaning]     = React.useState(stored.meaning   ?? w?.definition ?? "");
  const [context, setContext]     = React.useState(stored.context   ?? w?.context    ?? "");
  const [note,    setNote]        = React.useState(stored.note      ?? "");
  const [confidence, setConfidence] = React.useState(stored.confidence ?? w?.confidence ?? 2);

  const [editingMeaning, setEditingMeaning] = React.useState(false);
  const [editingContext, setEditingContext] = React.useState(false);

  React.useEffect(() => {
    if (!w) return;
    localStorage.setItem(key, JSON.stringify({ meaning, context, note, confidence }));
  }, [meaning, context, note, confidence]);

  if (!w) return <div className="canvas">Word not found.</div>;

  const confidenceLabel = ["", "Just met it", "Shaky", "Getting it", "Solid", "Mastered"][confidence] || "";

  return (
    <div className="canvas fade-in">
      <div className="row" style={{marginBottom:18}}>
        <button className="btn btn-ghost" onClick={() => setScreen("library")}>
          <Icon name="chevL" size={14} /> Library
        </button>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:28}}>
        {/* Flip card */}
        <div>
          <div className="kicker">Memory card</div>
          <div className="muted" style={{fontSize:13, margin:"4px 0 14px"}}>
            Click the card to flip · Press <span className="kbd">Space</span>
          </div>
          <div className="flip-wrap">
            <div className={"flip" + (flipped ? " flipped" : "")}
                 onClick={() => setFlipped(!flipped)}
                 style={{cursor:"pointer"}}
                 tabIndex={0}
                 onKeyDown={(e) => e.key === " " && (e.preventDefault(), setFlipped(!flipped))}>
              <div className="flip-face flip-front">
                <div className="row" style={{gap:10}}>
                  <span className={"tag cefr-" + w.cefr}>{w.cefr}</span>
                  <span className="tag tag-pos">{w.pos}</span>
                  <button className="btn btn-ghost btn-icon" style={{marginLeft:"auto"}}
                    onClick={(e) => e.stopPropagation()} title="Pronounce">
                    <Icon name="sound" size={16} />
                  </button>
                </div>
                <div style={{marginTop:"auto", marginBottom:"auto"}}>
                  <h1 className="serif" style={{fontSize:78, letterSpacing:"-0.03em"}}>{w.text}</h1>
                  <div className="mono faint" style={{marginTop:8, fontSize:14}}>{w.phonetic}</div>
                </div>
                <div className="row faint" style={{fontSize:12.5, justifyContent:"space-between"}}>
                  <div className="row" style={{gap:8}}>
                    <Icon name="flip" size={13} /> Tap to reveal meaning
                  </div>
                  <span className="mono">card · 1 of 2</span>
                </div>
              </div>

              <div className="flip-face flip-back">
                <div className="row between">
                  <div className="kicker" style={{color:"oklch(0.78 0.018 70)"}}>Your meaning</div>
                  <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); setEditingMeaning(v=>!v); }}
                    style={{color:"oklch(0.78 0.018 70)"}} title="Edit">
                    <Icon name={editingMeaning ? "check" : "edit"} size={14} />
                  </button>
                </div>
                {editingMeaning ? (
                  <textarea
                    value={meaning}
                    onChange={(e) => setMeaning(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    rows={2}
                    style={{
                      marginTop:8, width:"100%", background:"oklch(0.30 0.02 60)",
                      border:"1px solid oklch(0.42 0.02 60)", borderRadius:8, padding:"10px 12px",
                      fontFamily:"inherit", fontSize:24, color:"var(--paper)", letterSpacing:"-0.015em",
                      resize:"vertical",
                    }}
                  />
                ) : (
                  <div className="serif" style={{fontSize:30, marginTop:8, letterSpacing:"-0.02em"}}>
                    {meaning}
                  </div>
                )}

                <div style={{marginTop:18, padding:"16px 18px", background:"oklch(0.30 0.02 60)", borderRadius:12}}>
                  <div className="kicker" style={{color:"oklch(0.78 0.018 70)"}}>Use it like this</div>
                  <div className="serif" style={{fontSize:19, fontStyle:"italic", marginTop:6, color:"var(--paper)"}}>
                    "{w.exampleGood}"
                  </div>
                </div>

                <div className="row faint" style={{fontSize:12.5, marginTop:"auto", justifyContent:"space-between", color:"oklch(0.7 0.02 70)"}}>
                  <div className="row" style={{gap:8}}>
                    <Icon name="flip" size={13} /> Tap to flip back
                  </div>
                  <span className="mono">card · 2 of 2</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row" style={{marginTop:18, gap:10}}>
            <button className="btn btn-primary" onClick={() => setScreen("review")}>
              <Icon name="play" size={14} /> Practice now
            </button>
            <button className="btn"><Icon name="bookmark" size={14} /> Save to deck</button>
            <button className="btn btn-ghost" style={{marginLeft:"auto", color:"var(--rose)"}}>
              <Icon name="trash" size={14} /> Remove
            </button>
          </div>
        </div>

        {/* Side: source + editable context + note + confidence */}
        <aside>
          <div className="card" style={{padding:24}}>
            <div className="kicker">Captured from</div>
            <div className="serif" style={{fontSize:18, marginTop:6, fontStyle:"italic"}}>{w.addedFrom}</div>
            <div className="muted" style={{fontSize:13, marginTop:2}}>added {w.addedAt}</div>
            <hr className="divider" />
            <div className="row between">
              <div className="kicker">Original sentence</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditingContext(v=>!v)} title="Edit">
                <Icon name={editingContext ? "check" : "edit"} size={13} />
              </button>
            </div>
            {editingContext ? (
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                autoFocus
                rows={3}
                className="input"
                style={{marginTop:6, fontFamily:"inherit", fontStyle:"italic"}}
              />
            ) : (
              <div style={{marginTop:6, color:"var(--ink-2)", lineHeight:1.5}}>"{context}"</div>
            )}
          </div>

          {/* Confidence */}
          <div className="card" style={{padding:24, marginTop:16}}>
            <div className="row between">
              <div className="kicker">Confidence</div>
              <span className="mono faint" style={{fontSize:11}}>default 2 · you set</span>
            </div>
            <div className="row" style={{gap:6, marginTop:12}}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setConfidence(n)}
                  title={["Just met it","Shaky","Getting it","Solid","Mastered"][n-1]}
                  style={{
                    flex:1, padding:"14px 0", borderRadius:10,
                    border: n === confidence ? "2px solid var(--ink)" : "1px solid var(--rule)",
                    background: n <= confidence ? `oklch(${0.96 - (n-1)*0.08} ${0.04 + (n-1)*0.02} ${145 - (5-n)*15})` : "var(--paper)",
                    color: n <= confidence ? "var(--ink)" : "var(--ink-faint)",
                    cursor:"pointer", fontFamily:"inherit",
                    transition:"all .15s",
                  }}>
                  <div className="serif" style={{fontSize:22, lineHeight:1}}>{n}</div>
                </button>
              ))}
            </div>
            <div className="row between" style={{marginTop:10, fontSize:12}}>
              <span className="faint">1 · just met</span>
              <span className="serif" style={{fontSize:14, color:"var(--ink)"}}>{confidenceLabel}</span>
              <span className="faint">5 · mastered</span>
            </div>
            <hr className="divider" />
            <div className="kicker">Today's reason</div>
            <div className="serif" style={{fontSize:17, marginTop:6, lineHeight:1.4}}>{w.reason}</div>
            <button className="btn btn-ghost" style={{marginTop:10, padding:"6px 0", color:"var(--accent)"}} onClick={() => setScreen("mps")}>
              How is this calculated? <Icon name="arrow" size={13} />
            </button>
          </div>

          {/* Personal note */}
          <div className="card" style={{padding:24, marginTop:16}}>
            <div className="row between">
              <div className="kicker">Your note</div>
              <span className="mono faint" style={{fontSize:11}}>optional</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A mnemonic, a story, where you'll use it… anything that makes this word yours."
              rows={4}
              className="input"
              style={{marginTop:8, fontFamily:"inherit", lineHeight:1.5, fontSize:14}}
            />
          </div>

          <div className="card" style={{padding:24, marginTop:16}}>
            <div className="kicker">Synonyms</div>
            <div className="row" style={{gap:6, flexWrap:"wrap", marginTop:8}}>
              {w.synonyms.map(s => <span key={s} className="tag">{s}</span>)}
            </div>
            <div className="kicker" style={{marginTop:14}}>Antonyms</div>
            <div className="row" style={{gap:6, flexWrap:"wrap", marginTop:8}}>
              {w.antonyms.map(s => <span key={s} className="tag">{s}</span>)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

window.WordDetail = WordDetail;
