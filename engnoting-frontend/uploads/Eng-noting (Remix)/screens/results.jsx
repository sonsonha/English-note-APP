// Session results
const Results = ({ results, setScreen }) => {
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = total ? Math.round((correct/total) * 100) : 0;
  const minutes = Math.max(1, Math.round(total * 1.1));

  let headline = "Solid session.";
  if (pct >= 90) headline = "Brilliant.";
  else if (pct >= 75) headline = "Strong work.";
  else if (pct >= 50) headline = "Good progress.";
  else headline = "Today was for stretching.";

  return (
    <div className="canvas fade-in" style={{maxWidth:820}}>
      <div className="kicker">Session complete</div>
      <h1 className="serif celebrate" style={{marginTop:8}}>{headline}</h1>

      <div style={{display:"grid", gridTemplateColumns:"auto 1fr", gap:32, marginTop:32, alignItems:"center"}}>
        <div className="donut" style={{"--p": pct}}>
          <span>{pct}%</span>
        </div>
        <div>
          <div className="serif" style={{fontSize:22, letterSpacing:"-0.01em"}}>
            {correct} of {total} correct · {minutes} minute{minutes === 1 ? "" : "s"}
          </div>
          <div className="muted" style={{marginTop:6}}>
            Your streak is now <b style={{color:"var(--gold-deep)"}}>14 days</b>. The queue rebuilds tonight at midnight.
          </div>
          <div className="row" style={{gap:10, marginTop:18}}>
            <button className="btn btn-primary" onClick={() => setScreen("dashboard")}>
              <Icon name="check" size={14} /> Done for today
            </button>
            <button className="btn" onClick={() => setScreen("library")}>
              Browse library
            </button>
          </div>
        </div>
      </div>

      <hr className="divider" style={{margin:"32px 0"}} />

      <div className="kicker">Word by word</div>
      <div className="card" style={{padding:0, marginTop:14, overflow:"hidden"}}>
        {results.map((r, i) => {
          const w = window.getWord(r.id);
          return (
            <div key={i} className="word-row" style={{gridTemplateColumns:"40px 1.4fr 2fr 0.8fr 0.6fr"}}>
              <div className="mono faint" style={{fontSize:12}}>{String(i+1).padStart(2,"0")}</div>
              <div className="w-text">{w.text}<small>{w.pos}</small></div>
              <div className="w-def">{w.definition}</div>
              <div><span className="tag">{r.format.replace("_"," ")}</span></div>
              <div style={{textAlign:"right"}}>
                {r.correct
                  ? <span style={{color:"var(--leaf)"}}><Icon name="check" size={18} /></span>
                  : <span style={{color:"var(--rose)"}}><Icon name="x" size={18} /></span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-soft" style={{marginTop:24, padding:24}}>
        <div className="kicker">Tomorrow</div>
        <div className="serif" style={{fontSize:22, marginTop:8, letterSpacing:"-0.01em"}}>
          We'll resurface <b>{Math.max(3, total - correct + 2)}</b> words — including the ones that tripped you up today.
        </div>
        <div className="muted" style={{marginTop:6, fontSize:14}}>
          Eng-noting caps daily load to keep this gentle.
        </div>
      </div>
    </div>
  );
};

window.Results = Results;
