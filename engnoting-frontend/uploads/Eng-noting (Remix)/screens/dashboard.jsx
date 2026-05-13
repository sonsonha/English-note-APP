// Dashboard — the hero
const Dashboard = ({ setScreen, openWord }) => {
  const today = window.TODAY_QUEUE.map(window.getWord);
  const critical = today.filter(w => w.mps >= 75);
  const normal   = today.filter(w => w.mps < 75);
  const streakLen = window.STREAK.filter(s => s.state === "done" || s.state === "today").length;

  return (
    <div className="canvas fade-in">
      <div className="page-header">
        <div>
          <div className="kicker">Saturday · May 10</div>
          <h1 style={{marginTop:8}}>Good morning, Maren.</h1>
          <div className="meta" style={{marginTop:8, fontSize:16}}>
            8 words are asking for your attention today — about <b>9 minutes</b>.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setScreen("review")}>
          <Icon name="play" size={14} />
          Begin today's review
        </button>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:24}}>
        {/* Hero card: today's queue summary */}
        <div className="card-ink" style={{padding:32, position:"relative", overflow:"hidden"}}>
          <div className="kicker" style={{color:"oklch(0.78 0.018 70)"}}>Today's queue · ranked by priority</div>
          <h2 className="serif" style={{fontSize:34, marginTop:10, color:"var(--paper)"}}>
            Start with <em>cogent</em>.
          </h2>
          <div style={{color:"oklch(0.85 0.02 70)", marginTop:8, fontSize:15, maxWidth:"42ch"}}>
            New and tricky — let's lock it in this week. Three more critical words follow.
          </div>

          <div style={{marginTop:26, display:"flex", flexDirection:"column", gap:1, background:"oklch(0.32 0.02 60)", borderRadius:10, overflow:"hidden"}}>
            {today.slice(0,5).map((w, i) => (
              <button key={w.id}
                onClick={() => openWord(w.id)}
                style={{
                  display:"grid", gridTemplateColumns:"22px 1fr auto auto", gap:14,
                  padding:"12px 14px", background:"var(--ink)", color:"var(--paper)",
                  border:"none", textAlign:"left", cursor:"pointer", alignItems:"center",
                }}>
                <span className="mono" style={{fontSize:11, color:"oklch(0.65 0.02 70)"}}>{String(i+1).padStart(2,"0")}</span>
                <span className="serif" style={{fontSize:18}}>{w.text}</span>
                <span className="mono" style={{fontSize:11, color:"oklch(0.78 0.018 70)"}}>MPS {w.mps}</span>
                <Icon name="chevR" size={14} />
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" style={{marginTop:14, color:"var(--paper)"}} onClick={() => setScreen("review")}>
            See all 8 in queue <Icon name="arrow" size={13} />
          </button>
        </div>

        {/* Streak card */}
        <div className="card" style={{padding:28}}>
          <div className="between">
            <div className="kicker">Streak</div>
            <div className="row" style={{gap:6, color:"var(--gold-deep)"}}>
              <Icon name="flame" size={15} />
              <span className="mono" style={{fontSize:13}}>{streakLen} days</span>
            </div>
          </div>
          <h3 className="serif" style={{fontSize:32, marginTop:8, letterSpacing:"-0.02em"}}>
            Two weeks of small, kept promises.
          </h3>
          <div style={{marginTop:18}}>
            <div className="streak-row">
              {window.STREAK.map((s, i) => (
                <div key={i} className={"streak-cell " + s.state} title={s.day}>
                  {i === window.STREAK.length - 1 ? "·" : ""}
                </div>
              ))}
            </div>
            <div className="row between faint" style={{marginTop:10, fontSize:11.5, fontFamily:"var(--mono)"}}>
              <span>Apr 27</span><span>May 10</span>
            </div>
          </div>

          <hr className="divider" />

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14}}>
            <Stat label="Reviewed" value="312" sub="this month" />
            <Stat label="Accuracy" value="74%" sub="trending up" />
            <Stat label="New words" value="18" sub="this week" />
          </div>
        </div>
      </div>

      {/* Strip: focus + recent capture */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginTop:24}}>
        <div className="card">
          <div className="between">
            <div className="kicker">Critical · 4</div>
            <span className="muted" style={{fontSize:13}}>MPS ≥ 75</span>
          </div>
          <h3 className="serif" style={{fontSize:22, marginTop:8}}>Words that are slipping</h3>
          <div className="col" style={{marginTop:14, gap:10}}>
            {critical.map(w => (
              <button key={w.id} className="card-soft" onClick={() => openWord(w.id)}
                style={{display:"grid", gridTemplateColumns:"1.2fr 2fr auto", gap:14, padding:"14px 16px", textAlign:"left", border:"1px solid var(--rule)", cursor:"pointer", alignItems:"center"}}>
                <div>
                  <div className="serif" style={{fontSize:18}}>{w.text}</div>
                  <div className="faint" style={{fontSize:12, fontStyle:"italic", marginTop:2}}>{w.pos} · {w.cefr}</div>
                </div>
                <div style={{fontSize:13.5, color:"var(--ink-2)"}}>{w.reason}</div>
                <div className="mono" style={{fontSize:13, color:"var(--ink)"}}>{w.mps}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="between">
            <div className="kicker">Recently captured</div>
            <button className="btn btn-ghost" style={{padding:"6px 10px"}} onClick={() => setScreen("library")}>
              All words <Icon name="arrow" size={13} />
            </button>
          </div>
          <h3 className="serif" style={{fontSize:22, marginTop:8}}>This week's harvest</h3>
          <div className="col" style={{marginTop:14, gap:6}}>
            {window.SAMPLE_WORDS.slice(0,5).map(w => (
              <button key={w.id} className="row" onClick={() => openWord(w.id)}
                style={{padding:"10px 12px", border:"none", background:"none", textAlign:"left", cursor:"pointer", borderRadius:8, justifyContent:"space-between"}}
                onMouseEnter={(e) => e.currentTarget.style.background="var(--paper-2)"}
                onMouseLeave={(e) => e.currentTarget.style.background="transparent"}>
                <div className="row" style={{gap:14}}>
                  <span className="serif" style={{fontSize:18}}>{w.text}</span>
                  <span className="faint" style={{fontSize:13}}>{w.addedFrom}</span>
                </div>
                <span className="mono faint" style={{fontSize:11.5}}>{w.addedAt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, sub }) => (
  <div>
    <div className="kicker">{label}</div>
    <div className="serif" style={{fontSize:30, marginTop:4, letterSpacing:"-0.02em"}}>{value}</div>
    <div className="faint" style={{fontSize:12}}>{sub}</div>
  </div>
);

window.Dashboard = Dashboard;
