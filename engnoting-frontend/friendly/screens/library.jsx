// Word library — list view

// Date-range picker: choose All time, or a specific day / week / month.
const RangePicker = ({ scope, onChange }) => {
  const kind = scope?.kind || "all";
  const today = window.TODAY_DATE || new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const isoMonth = isoToday.slice(0, 7);
  const startOfWeek = (d) => {
    const x = new Date(d);
    const dow = x.getDay() || 7;
    x.setDate(x.getDate() - (dow - 1));
    return x.toISOString().slice(0, 10);
  };

  const dayVal   = kind === "day"   && /^\d{4}-\d{2}-\d{2}$/.test(scope.value) ? scope.value : isoToday;
  const weekVal  = kind === "week"  && /^\d{4}-\d{2}-\d{2}$/.test(scope.value) ? scope.value : startOfWeek(today);
  const monthVal = kind === "month" && /^\d{4}-\d{2}-\d{2}$/.test(scope.value) ? scope.value.slice(0, 7) : isoMonth;

  // HTML <input type="week"> uses YYYY-Www format. Convert.
  const toIsoWeekString = (isoDate) => {
    const d = new Date(isoDate);
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  };
  const fromIsoWeekString = (s) => {
    const m = s && s.match(/^(\d{4})-W(\d{2})$/);
    if (!m) return startOfWeek(today);
    const year = +m[1], week = +m[2];
    const jan4 = new Date(year, 0, 4);
    const jan4Dow = jan4.getDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setDate(jan4.getDate() - (jan4Dow - 1));
    const monday = new Date(mondayWeek1);
    monday.setDate(mondayWeek1.getDate() + (week - 1) * 7);
    return monday.toISOString().slice(0, 10);
  };

  const Chip = ({ active, children, onClick }) => (
    <button onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 999,
        border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--paper-edge)",
        background: active ? "var(--accent)" : "var(--paper)",
        color: active ? "#fff" : "var(--ink)",
        fontSize: 13.5, fontWeight: 700, fontFamily: "inherit",
        cursor: "pointer", transition: "all .15s",
        boxShadow: active ? "var(--shadow-pop)" : "none",
      }}>{children}</button>
  );

  const inputStyle = {
    padding: "8px 12px",
    border: "1.5px solid var(--paper-edge)",
    borderRadius: 12,
    background: "var(--paper)",
    fontFamily: "inherit",
    fontSize: 13.5,
    color: "var(--ink)",
    fontWeight: 600,
  };

  return (
    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <Chip active={kind === "all"}   onClick={() => onChange({ kind: "all" })}>All time</Chip>
        <Chip active={kind === "day"}   onClick={() => onChange({ kind: "day",   value: dayVal })}>Day</Chip>
        <Chip active={kind === "week"}  onClick={() => onChange({ kind: "week",  value: weekVal })}>Week</Chip>
        <Chip active={kind === "month"} onClick={() => onChange({ kind: "month", value: monthVal + "-01" })}>Month</Chip>
      </div>

      {kind === "day" && (
        <div className="row" style={{ gap: 10 }}>
          <span className="kicker">Date</span>
          <input type="date" value={dayVal} max={isoToday} style={inputStyle}
            onChange={(e) => onChange({ kind: "day", value: e.target.value })} />
        </div>
      )}
      {kind === "week" && (
        <div className="row" style={{ gap: 10 }}>
          <span className="kicker">Week</span>
          <input type="week" value={toIsoWeekString(weekVal)} style={inputStyle}
            onChange={(e) => onChange({ kind: "week", value: fromIsoWeekString(e.target.value) })} />
          <span className="faint" style={{ fontSize: 12.5 }}>
            ({window.fmtShort(new Date(weekVal))} – {window.fmtShort(new Date(new Date(weekVal).getTime() + 6 * 864e5))})
          </span>
        </div>
      )}
      {kind === "month" && (
        <div className="row" style={{ gap: 10 }}>
          <span className="kicker">Month</span>
          <input type="month" value={(scope?.value || monthVal + "-01").slice(0, 7)} max={isoMonth} style={inputStyle}
            onChange={(e) => onChange({ kind: "month", value: e.target.value + "-01" })} />
        </div>
      )}
    </div>
  );
};

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
      return d ? window.fmtLong(d.date) : (localScope.value ? window.fmtLong(new Date(localScope.value)) : "a specific day");
    }
    if (localScope.kind === "week") {
      if (typeof localScope.value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(localScope.value)) {
        const s = new Date(localScope.value);
        const e = new Date(s); e.setDate(e.getDate()+6);
        return `Week of ${window.fmtShort(s)} – ${window.fmtShort(e)}`;
      }
      return "A week";
    }
    if (localScope.kind === "month") {
      if (typeof localScope.value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(localScope.value)) {
        return new Date(localScope.value).toLocaleDateString("en-US", { month:"long", year:"numeric" });
      }
      return "A month";
    }
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

      {/* Scope: All time or pick a specific day / week / month */}
      <RangePicker scope={localScope} onChange={(next) => { setLocalScope(next); setScope && setScope(next); }} />

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
