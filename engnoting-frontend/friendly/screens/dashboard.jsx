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
          <h1 style={{marginTop:8}}>Hey Maren.</h1>
          <div className="meta" style={{marginTop:10, fontSize:17}}>
            You've got <b style={{color:"var(--ink)"}}>8 words</b> waiting today — about <b style={{color:"var(--ink)"}}>9 minutes</b>. Let's do it.
          </div>
        </div>
        <button className="btn btn-primary" style={{padding:"14px 22px", fontSize:15}} onClick={() => setScreen("review")}>
          <Icon name="play" size={14} />
          Let's go
        </button>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:24}}>
        {/* Hero card: today's queue summary */}
        <div className="card-ink" style={{padding:32}}>
          <div className="kicker">Today's queue · ranked by priority</div>
          <h2 style={{fontSize:36, marginTop:10, color:"#fff", letterSpacing:"-0.025em"}}>
            Start with <span style={{fontStyle:"italic", textDecoration:"underline", textDecorationStyle:"wavy", textUnderlineOffset:6, textDecorationColor:"oklch(1 0 0 / 0.5)"}}>cogent</span>.
          </h2>
          <div style={{color:"oklch(1 0 0 / 0.86)", marginTop:10, fontSize:15.5, maxWidth:"42ch"}}>
            New and tricky — let's lock it in this week. Three more starred words follow.
          </div>

          <div style={{marginTop:26, display:"flex", flexDirection:"column", gap:6}}>
            {today.slice(0,5).map((w, i) => (
              <button key={w.id}
                onClick={() => openWord(w.id)}
                style={{
                  display:"grid", gridTemplateColumns:"28px 1fr auto auto", gap:14,
                  padding:"12px 16px",
                  background:"oklch(1 0 0 / 0.14)",
                  color:"#fff",
                  border:"none", borderRadius:14,
                  textAlign:"left", cursor:"pointer", alignItems:"center",
                  fontFamily:"inherit",
                  transition:"background .15s, transform .12s",
                }}
                onMouseEnter={(e)=>{e.currentTarget.style.background="oklch(1 0 0 / 0.22)"; e.currentTarget.style.transform="translateX(2px)";}}
                onMouseLeave={(e)=>{e.currentTarget.style.background="oklch(1 0 0 / 0.14)"; e.currentTarget.style.transform="none";}}
              >
                <span style={{fontFamily:"var(--mono)", fontSize:11, color:"oklch(1 0 0 / 0.7)", fontWeight:600}}>{String(i+1).padStart(2,"0")}</span>
                <span style={{fontFamily:"var(--display)", fontWeight:700, fontSize:19, letterSpacing:"-0.015em"}}>{w.text}</span>
                <span style={{fontFamily:"var(--mono)", fontSize:11, color:"oklch(1 0 0 / 0.78)"}}>MPS {w.mps}</span>
                <Icon name="chevR" size={14} />
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" style={{marginTop:16, color:"#fff", background:"oklch(1 0 0 / 0.16)"}} onClick={() => setScreen("review")}>
            See all 8 in queue <Icon name="arrow" size={13} />
          </button>
        </div>

        {/* Streak card */}
        <div className="card" style={{padding:28}}>
          <div className="between">
            <div className="kicker">Streak</div>
            <div className="row" style={{gap:6, color:"var(--butter-deep)", background:"var(--butter-soft)", padding:"4px 10px", borderRadius:99}}>
              <Icon name="flame" size={15} />
              <span style={{fontFamily:"var(--mono)", fontSize:13, fontWeight:700}}>{streakLen} days</span>
            </div>
          </div>
          <h3 style={{fontSize:30, marginTop:10, letterSpacing:"-0.025em", fontWeight:800}}>
            14 days in a row. Nice.
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
            <div className="kicker" style={{color:"var(--accent-deep)"}}>★ Needs love · 4</div>
            <span className="muted" style={{fontSize:13}}>MPS ≥ 75</span>
          </div>
          <h3 style={{fontSize:22, marginTop:10, fontWeight:800}}>Words that need a little love</h3>
          <div className="col" style={{marginTop:14, gap:10}}>
            {critical.map(w => (
              <button key={w.id} className="card-soft" onClick={() => openWord(w.id)}
                style={{display:"grid", gridTemplateColumns:"1.2fr 2fr auto", gap:14, padding:"14px 16px", textAlign:"left", border:"1.5px solid var(--paper-edge)", cursor:"pointer", alignItems:"center", boxShadow:"none", borderRadius:14, fontFamily:"inherit"}}
                onMouseEnter={(e)=>{e.currentTarget.style.background="var(--paper)"; e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.transform="translateY(-1px)";}}
                onMouseLeave={(e)=>{e.currentTarget.style.background=""; e.currentTarget.style.borderColor="var(--paper-edge)"; e.currentTarget.style.transform="none";}}>
                <div>
                  <div style={{fontFamily:"var(--display)", fontWeight:700, fontSize:19, letterSpacing:"-0.015em"}}>{w.text}</div>
                  <div className="faint" style={{fontSize:12, marginTop:2, fontWeight:600}}>{w.pos} · {w.cefr}</div>
                </div>
                <div style={{fontSize:13.5, color:"var(--ink-2)"}}>{w.reason}</div>
                <div style={{fontFamily:"var(--mono)", fontWeight:700, fontSize:14, color:"var(--accent-deep)", background:"var(--accent-soft)", padding:"4px 10px", borderRadius:99}}>{w.mps}</div>
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
          <h3 style={{fontSize:22, marginTop:10, fontWeight:800}}>This week's catch</h3>
          <div className="col" style={{marginTop:14, gap:4}}>
            {window.SAMPLE_WORDS.slice(0,5).map(w => (
              <button key={w.id} className="row" onClick={() => openWord(w.id)}
                style={{padding:"12px 14px", border:"none", background:"none", textAlign:"left", cursor:"pointer", borderRadius:12, justifyContent:"space-between", fontFamily:"inherit", transition:"background .12s"}}
                onMouseEnter={(e) => e.currentTarget.style.background="var(--accent-tint)"}
                onMouseLeave={(e) => e.currentTarget.style.background="transparent"}>
                <div className="row" style={{gap:14}}>
                  <span style={{fontFamily:"var(--display)", fontWeight:700, fontSize:18}}>{w.text}</span>
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
    <div style={{fontFamily:"var(--display)", fontWeight:800, fontSize:32, marginTop:4, letterSpacing:"-0.025em"}}>{value}</div>
    <div className="faint" style={{fontSize:12, fontWeight:600}}>{sub}</div>
  </div>
);

window.Dashboard = Dashboard;
