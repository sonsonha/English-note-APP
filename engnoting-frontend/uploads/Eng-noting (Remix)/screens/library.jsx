// Word library — list view
const Library = ({ openWord, scope, setScope }) => {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [sort, setSort] = React.useState("recent");
  const [localScope, setLocalScope] = React.useState(scope || { kind: "all" });
  React.useEffect(() => { if (scope) setLocalScope(scope); }, [scope]);

  // Resolve scope → words
  const scopedWords = React.useMemo(() => {
    if (!localScope || localScope.kind === "all") return window.DAYS.flatMap(d => d.words);
    if (localScope.kind === "day") {
      const d = window.DAYS.find(x => x.iso === localScope.value);
      return d ? d.words : [];
    }
    if (localScope.kind === "week") {
      const start = typeof localScope.value === "string" && localScope.value.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(localScope.value) : new Date(window.DAYS.at(-7).iso);
      const end = new Date(start); end.setDate(end.getDate()+6);
      return window.DAYS.filter(x => x.date >= start && x.date <= end).flatMap(d => d.words);
    }
    if (localScope.kind === "month") {
      const m = typeof localScope.value === "string" && localScope.value.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(localScope.value) : new Date();
      return window.DAYS.filter(x => x.date.getMonth() === m.getMonth() && x.date.getFullYear() === m.getFullYear()).flatMap(d => d.words);
    }
    if (localScope.kind === "quarter") {
      const v = localScope.value;
      const match = typeof v === "string" ? v.match(/^(\d{4})-Q([1-4])$/) : null;
      if (match) {
        const year = +match[1], qIdx = +match[2]-1;
        const startD = new Date(year, qIdx*3, 1);
        const endD   = new Date(year, qIdx*3+3, 0);
        return window.DAYS.filter(x => x.date >= startD && x.date <= endD).flatMap(d => d.words);
      }
      return window.DAYS.slice(-90).flatMap(d => d.words);
    }
    return window.DAYS.flatMap(d => d.words);
  }, [localScope]);

  // Enrich each scoped word with its own fields, falling back to SAMPLE_WORDS template by text
  const enriched = scopedWords.map(w => {
    const tmpl = window.SAMPLE_WORDS.find(s => s.text === w.text);
    const base = tmpl || {};
    return {
      ...base,
      ...w,
      id: w.id,
      text: w.text,
      cefr: w.cefr,
      pos: w.pos || base.pos || "n.",
      definition: w.meaning || base.definition || "",
      mps: w.mps ?? base.mps ?? 60,
      accuracy: w.correct ? 0.85 : (w.reviewed ? 0.35 : (base.accuracy ?? 0)),
      addedAt: w.addedAt || base.addedAt || "",
    };
  });

  let words = enriched;
  if (q) words = words.filter(w => w.text.includes(q.toLowerCase()) || (w.definition || "").toLowerCase().includes(q.toLowerCase()));
  if (filter !== "all") words = words.filter(w => w.cefr === filter);
  if (sort === "recent")    words.sort((a,b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
  if (sort === "priority")  words.sort((a,b) => (b.mps||0) - (a.mps||0));
  if (sort === "alpha")     words.sort((a,b) => a.text.localeCompare(b.text));

  const scopeLabel = (() => {
    if (!localScope || localScope.kind === "all") return "All time";
    if (localScope.kind === "day") {
      const d = window.DAYS.find(x => x.iso === localScope.value);
      return d ? window.fmtLong(d.date) : localScope.value;
    }
    if (localScope.kind === "week")    return "Last 7 days";
    if (localScope.kind === "month")   return "Last 30 days";
    if (localScope.kind === "quarter") return "Last quarter";
    return "All time";
  })();

  return (
    <div className="canvas fade-in">
      <div className="page-header">
        <div>
          <div className="kicker">Library · {scopeLabel}</div>
          <h1 style={{marginTop:8}}>Your words</h1>
          <div className="meta" style={{marginTop:6}}>
            {words.length} in scope · {window.SAMPLE_WORDS.length} all-time
          </div>
        </div>
        <div className="row">
          <div className="row" style={{position:"relative"}}>
            <Icon name="search" size={14} />
            <input className="input" placeholder="Search words or meanings…"
              value={q} onChange={(e)=>setQ(e.target.value)}
              style={{paddingLeft:36, width:280, marginLeft:-26}} />
          </div>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="row" style={{gap:6, marginBottom:14, padding:4, background:"var(--paper-2)", borderRadius:10, border:"1px solid var(--rule)", display:"inline-flex"}}>
        {[
          { id: "all",     label: "All time" },
          { id: "day",     label: "Today",      val: window.DAYS.at(-1).iso },
          { id: "week",    label: "Last 7 days", val: "last-7" },
          { id: "month",   label: "Last 30 days", val: "last-30" },
          { id: "quarter", label: "Last 90 days", val: "last-90" },
        ].map(s => {
          const active = (localScope?.kind || "all") === s.id;
          return (
            <button key={s.id}
              onClick={() => { const next = s.id === "all" ? { kind:"all" } : { kind: s.id, value: s.val }; setLocalScope(next); setScope && setScope(next); }}
              className={"btn " + (active ? "btn-primary" : "btn-ghost")}
              style={{padding:"6px 12px", fontSize:12.5}}>
              {s.label}
            </button>
          );
        })}
        {localScope?.kind === "day" && !["last-7","last-30","last-90"].includes(localScope.value) && (
          <span className="tag" style={{padding:"6px 10px", fontSize:11.5}}>{scopeLabel}</span>
        )}
      </div>

      <div className="card" style={{padding:0, overflow:"hidden"}}>
        <div className="row between" style={{padding:"14px 18px", borderBottom:"1px solid var(--rule)", background:"var(--paper-2)"}}>
          <div className="row" style={{gap:6}}>
            {["all","A2","B1","B2","C1","C2"].map(f => (
              <button key={f}
                onClick={()=>setFilter(f)}
                className={"btn " + (filter===f ? "btn-primary" : "btn-ghost")}
                style={{padding:"6px 12px", fontSize:13}}>
                {f === "all" ? "All levels" : f}
              </button>
            ))}
          </div>
          <div className="row" style={{gap:8}}>
            <span className="kicker">Sort</span>
            <select className="input" style={{padding:"6px 10px", width:"auto", fontSize:13}}
              value={sort} onChange={(e)=>setSort(e.target.value)}>
              <option value="recent">Recently added</option>
              <option value="priority">Priority (MPS)</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1.6fr 2.4fr 0.7fr 0.7fr 0.6fr", gap:18, padding:"10px 18px", background:"var(--paper-2)"}}>
          <div className="kicker">Word</div>
          <div className="kicker">Meaning</div>
          <div className="kicker">CEFR</div>
          <div className="kicker">Mastery</div>
          <div className="kicker" style={{textAlign:"right"}}>MPS</div>
        </div>

        {words.map(w => (
          <div key={w.id} className="word-row" onClick={() => openWord(w.id)}>
            <div className="w-text">
              {w.text}
              <small>{w.pos}</small>
            </div>
            <div className="w-def">{w.definition}</div>
            <div><span className={"tag cefr-" + w.cefr}>{w.cefr}</span></div>
            <div>
              <div className="bar"><span style={{transform:`scaleX(${w.accuracy})`}} /></div>
              <div className="faint mono" style={{fontSize:11, marginTop:4}}>{Math.round(w.accuracy*100)}%</div>
            </div>
            <div className="mono" style={{textAlign:"right", fontSize:14}}>{w.mps}</div>
          </div>
        ))}

        {words.length === 0 && (
          <div className="center muted" style={{padding:"40px 20px"}}>No words match.</div>
        )}
      </div>
    </div>
  );
};

window.Library = Library;
