// MPS explainer
const MPSExplainer = ({ setScreen, openWord }) => {
  const [pickedId, setPicked] = React.useState("w-cogent");
  const w = window.getWord(pickedId);

  const factors = [
    { key: "time",       label: "Time since last review", weight: 30, value: w.mpsParts.time, hint: "Longer gaps push priority up." },
    { key: "accuracy",   label: "Past accuracy",          weight: 30, value: w.mpsParts.accuracy, hint: "Below-average accuracy raises priority." },
    { key: "confidence", label: "Your confidence",        weight: 15, value: w.mpsParts.confidence, hint: "Self-rated mastery (1–5)." },
    { key: "failure",    label: "Recent failure pattern", weight: 15, value: w.mpsParts.failure, hint: "Two misses in a row triggers a boost." },
    { key: "frequency",  label: "Word frequency",         weight: 10, value: w.mpsParts.frequency, hint: "More common words get nudged forward." },
  ];

  return (
    <div className="canvas fade-in">
      <div className="page-header">
        <div>
          <div className="kicker">Memory Priority Score</div>
          <h1 style={{marginTop:8}}>Why this word, today?</h1>
          <div className="meta" style={{marginTop:6, maxWidth:"60ch"}}>
            Every word in your queue is ranked by a deterministic 0–100 score.
            Same inputs, same output. No black box.
          </div>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:28}}>
        <div className="card" style={{padding:32}}>
          <div className="row between">
            <div className="kicker">Inspect a word</div>
            <select className="input" style={{width:"auto", padding:"6px 10px", fontSize:13}}
              value={pickedId} onChange={(e) => setPicked(e.target.value)}>
              {window.SAMPLE_WORDS.map(w => <option key={w.id} value={w.id}>{w.text}</option>)}
            </select>
          </div>

          <div className="row" style={{gap:14, marginTop:14, alignItems:"flex-end"}}>
            <h2 className="serif" style={{fontSize:54, letterSpacing:"-0.025em"}}>{w.text}</h2>
            <span className={"tag cefr-" + w.cefr}>{w.cefr}</span>
            <span className="tag tag-pos">{w.pos}</span>
          </div>

          <hr className="divider" />

          <div className="row between" style={{marginBottom:8}}>
            <div className="kicker">Score breakdown</div>
            <div className="serif" style={{fontSize:46, letterSpacing:"-0.025em"}}>
              {w.mps}<span className="faint mono" style={{fontSize:14, marginLeft:6}}>/100</span>
            </div>
          </div>

          {factors.map(f => (
            <div key={f.key} className="mps-row">
              <div>
                <div style={{fontSize:14, fontWeight:500}}>{f.label}</div>
                <div className="faint" style={{fontSize:12}}>weight · {f.weight}</div>
              </div>
              <div className="mps-bar">
                <span style={{width: (f.value / f.weight * 100) + "%"}} />
              </div>
              <div className="mono" style={{textAlign:"right"}}>+{f.value}</div>
            </div>
          ))}

          <hr className="divider" />

          <div className="card-soft">
            <div className="kicker">In plain language</div>
            <div className="serif" style={{fontSize:20, marginTop:6, lineHeight:1.4}}>
              {w.reason}
            </div>
            <button className="btn btn-ghost" style={{marginTop:10, padding:"6px 0", color:"var(--accent)"}}
              onClick={() => openWord(w.id)}>
              Open the card <Icon name="arrow" size={13} />
            </button>
          </div>
        </div>

        <aside>
          <div className="card" style={{padding:24}}>
            <div className="kicker">The formula</div>
            <pre className="mono" style={{
              marginTop:10, fontSize:13, lineHeight:1.55,
              background:"var(--paper-2)", border:"1px solid var(--rule)",
              padding:14, borderRadius:10, whiteSpace:"pre-wrap"
            }}>
{`MPS = time × 30
    + accuracy × 30
    + confidence × 15
    + failure × 15
    + frequency × 10`}
            </pre>
            <div className="muted" style={{fontSize:13, marginTop:10}}>
              Each factor is normalized 0–1 before its weight applies. Daily load is capped to avoid burnout.
            </div>
          </div>

          <div className="card" style={{padding:24, marginTop:16}}>
            <div className="kicker">How format is chosen</div>
            <ul style={{paddingLeft:18, marginTop:8, color:"var(--ink-2)", lineHeight:1.7}}>
              <li><b>Multiple choice</b> — new words or accuracy &lt; 40%</li>
              <li><b>Matching</b> — accuracy 40–70%</li>
              <li><b>Typing</b> — accuracy &gt; 70% with low urgency</li>
              <li><b>Fill in the blank</b> — accuracy &gt; 80% with ≥ 5 reviews</li>
            </ul>
          </div>

          <div className="card-ink" style={{padding:24, marginTop:16}}>
            <div className="kicker" style={{color:"oklch(0.78 0.018 70)"}}>Principle</div>
            <div className="serif" style={{fontSize:22, marginTop:8, lineHeight:1.3}}>
              "Explainable, deterministic, forgiving."
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

window.MPSExplainer = MPSExplainer;
