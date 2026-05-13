// Dashboard / Calendar screen
// ISO week helpers
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}
function isoWeeksInYear(year) {
  const last = new Date(year, 11, 31);
  const w = getISOWeek(last).week;
  return w === 1 ? getISOWeek(new Date(year, 11, 24)).week : w;
}
function startOfISOWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay() || 7; // Sun=0 -> 7
  d.setDate(d.getDate() - (dow - 1));
  return d;
}
function addDays(d, n) {const x = new Date(d);x.setDate(x.getDate() + n);return x;}

const stat = (days) => ({
  captured: days.reduce((a, d) => a + d.count, 0),
  reviewedPct: (() => {
    const total = days.reduce((a, d) => a + d.count, 0);
    const r = days.reduce((a, d) => a + d.words.filter((w) => w.reviewed).length, 0);
    return total ? Math.round(r / total * 100) : 0;
  })(),
  accuracy: (() => {
    const r = days.reduce((a, d) => a + d.words.filter((w) => w.reviewed).length, 0);
    const c = days.reduce((a, d) => a + d.words.filter((w) => w.correct).length, 0);
    return r ? Math.round(c / r * 100) : 0;
  })()
});

// Customize-and-review inline form, used by quarter-name click and detail panel
const Customizer = ({ max, onBegin, onCancel, accent }) => {
  const [count, setCount] = React.useState(Math.min(10, max));
  const [mode, setMode] = React.useState("priority");
  return (
    <div style={{ padding: 14, background: accent ? "var(--accent-soft)" : "var(--paper-2)", borderRadius: 10, border: accent ? "1.5px solid var(--accent)" : "1.5px solid var(--paper-edge)" }}>
      <div className="kicker" style={{ marginBottom: 8, color: accent ? "var(--accent-deep)" : undefined }}>Customize</div>
      <div className="row" style={{ gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {[
        { id: "priority", label: "By priority (MPS)" },
        { id: "all", label: "All in range" },
        { id: "custom", label: "Custom count" }].
        map((m) =>
        <button key={m.id} onClick={() => setMode(m.id)}
        className={"btn " + (mode === m.id ? "btn-primary" : "btn-ghost")}
        style={{ padding: "5px 10px", fontSize: 12.5, color: accent && mode !== m.id ? "var(--paper)" : undefined }}>
            {m.label}
          </button>
        )}
      </div>
      {mode !== "all" &&
      <div className="row" style={{ gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {[5, 10, 15, 20, 30, 50].map((n) =>
        <button key={n} onClick={() => setCount(Math.min(n, max))}
        className={"btn " + (count === n ? "btn-primary" : "btn-ghost")}
        style={{ padding: "4px 10px", fontSize: 12, minWidth: 38, color: accent && count !== n ? "var(--paper)" : undefined }}>
              {n}
            </button>
        )}
          <input type="number" value={count} onChange={(e) => setCount(Math.max(1, Math.min(max, +e.target.value || 1)))}
        min={1} max={max}
        className="input" style={{ width: 70, padding: "4px 8px", fontSize: 12 }} />
          <span className="faint" style={{ fontSize: 12, alignSelf: "center", color: accent ? "var(--accent-deep)" : undefined }}>of {max}</span>
        </div>
      }
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1, fontSize: 12.5, justifyContent: "center" }}
        disabled={!max}
        onClick={() => onBegin({ count: mode === "all" ? max : count, mode })}>
          <Icon name="play" size={12} /> Begin · {mode === "all" ? max : count} words
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 12.5, color: accent ? "var(--paper)" : undefined }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>);

};

const Legend = () =>
<div className="row" style={{ gap: 8, fontSize: 11.5 }}>
    {Object.entries(window.LABELS).map(([k, L]) =>
  <span key={k} className="row" style={{ gap: 5 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: L.bg, border: `1px solid ${L.color}` }} />
        <span className="faint">{L.name}</span>
      </span>
  )}
  </div>;


// ─── Summary card used below the calendar (week / month / quarter) ───
const SummaryCard = ({ title, days, kind, scope, startReview, goToLibrary }) => {
  const [customizing, setCustomizing] = React.useState(false);
  const s = stat(days);
  const r = window.labelForRange(days);
  const L = r ? window.LABELS[r.key] : null;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div>
          <div className="kicker">{kind} summary</div>
          <h3 className="serif" style={{ fontSize: 20, marginTop: 4, letterSpacing: "-0.01em" }}>{title}</h3>
        </div>
        {L &&
        <span className="tag" style={{ background: L.bg, color: L.color, padding: "4px 10px", border: "none", fontSize: 11 }}>
            {L.name}
          </span>
        }
      </div>
      <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
        <div className="serif" style={{ fontSize: 32, letterSpacing: "-0.025em" }}>{s.captured}</div>
        <div className="faint" style={{ fontSize: 12 }}>words captured</div>
      </div>
      <div className="row" style={{ gap: 14, marginTop: 6, fontSize: 12, color: "var(--ink-mute)" }}>
        <span>{s.reviewedPct}% reviewed</span>
        <span>·</span>
        <span>{s.accuracy}% accuracy</span>
      </div>
      <div className="row" style={{ gap: 6, marginTop: 14 }}>
        <button className="btn btn-primary" style={{ fontSize: 12.5 }}
        disabled={!s.captured}
        onClick={() => setCustomizing(true)}>
          <Icon name="play" size={12} /> Review this {kind}
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 12.5, color: "var(--accent)" }}
        onClick={() => goToLibrary && goToLibrary(scope)}>
          Open words <Icon name="arrow" size={12} />
        </button>
      </div>
      {customizing &&
      <div style={{ marginTop: 12 }}>
          <Customizer max={s.captured}
        onBegin={({ count, mode }) => {setCustomizing(false);startReview({ scope, count, mode, label: title });}}
        onCancel={() => setCustomizing(false)} />
        </div>
      }
    </div>);

};

const Calendar = ({ setScreen, openWord, startReview, goToLibrary }) => {
  const [view, setView] = React.useState("month"); // week | month | quarter
  const [monthOffset, setMonthOffset] = React.useState(0);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [quarterOffset, setQuarterOffset] = React.useState(0);

  const today = window.TODAY_DATE;

  // Compute focused month
  const focusMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = focusMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Build month grid — Monday-first
  // JS getDay: Sun=0..Sat=6 ; we want Mon=0..Sun=6
  const rawDow = focusMonth.getDay();
  const firstDow = (rawDow + 6) % 7;
  const daysInMonth = new Date(focusMonth.getFullYear(), focusMonth.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(focusMonth.getFullYear(), focusMonth.getMonth(), d);
    const iso = date.toISOString().slice(0, 10);
    const dayData = window.DAYS.find((x) => x.iso === iso);
    cells.push({ date, iso, day: dayData });
  }
  while (cells.length % 7) cells.push(null);

  const monthDays = window.DAYS.filter((d) => d.date.getMonth() === focusMonth.getMonth() && d.date.getFullYear() === focusMonth.getFullYear());

  // Week summaries that fall within this view's month
  const weekStartsInMonth = (() => {
    const out = [];
    let cursor = startOfISOWeek(new Date(focusMonth.getFullYear(), focusMonth.getMonth(), 1));
    while (cursor.getMonth() <= focusMonth.getMonth() || cursor.getFullYear() < focusMonth.getFullYear() + (focusMonth.getMonth() === 11 ? 1 : 0) && cursor.getMonth() === focusMonth.getMonth()) {
      const end = addDays(cursor, 6);
      if (end >= new Date(focusMonth.getFullYear(), focusMonth.getMonth(), 1) && cursor <= new Date(focusMonth.getFullYear(), focusMonth.getMonth() + 1, 0)) {
        out.push({ start: new Date(cursor), end });
      } else if (cursor.getMonth() !== focusMonth.getMonth() && cursor > new Date(focusMonth.getFullYear(), focusMonth.getMonth() + 1, 0)) {
        break;
      }
      cursor = addDays(cursor, 7);
      if (out.length > 6) break;
    }
    return out;
  })();

  // ─── WEEK VIEW ───
  if (view === "week") {
    const refMonday = startOfISOWeek(today);
    const focusMonday = addDays(refMonday, weekOffset * 7);
    const focusSunday = addDays(focusMonday, 6);
    const isoInfo = getISOWeek(focusMonday);
    const totalWeeks = isoWeeksInYear(isoInfo.year);
    const days = window.DAYS.filter((d) => d.date >= focusMonday && d.date <= focusSunday);
    const label = `Week ${isoInfo.week} of ${totalWeeks} · ${isoInfo.year}`;
    const sub = `${window.fmtShort(focusMonday)} – ${window.fmtShort(focusSunday)}`;
    return (
      <div className="canvas fade-in">
        <Header view={view} setView={setView} />
        <WeekView title={label} sub={sub} days={days}
        scope={{ kind: "week", value: focusMonday.toISOString().slice(0, 10) }}
        onPrev={() => setWeekOffset((o) => o - 1)}
        onNext={() => setWeekOffset((o) => o + 1)} canNext={weekOffset < 0}
        openWord={openWord} startReview={startReview} goToLibrary={goToLibrary} />
      </div>);

  }

  // ─── QUARTER VIEW ───
  if (view === "quarter") {
    const baseQ = Math.floor(today.getMonth() / 3);
    const focusQ = baseQ + quarterOffset;
    const yearOffset = Math.floor(focusQ / 4);
    const qIdx = (focusQ % 4 + 4) % 4;
    const year = today.getFullYear() + yearOffset;
    const startM = qIdx * 3;
    const startD = new Date(year, startM, 1);
    const endD = new Date(year, startM + 3, 0);
    const days = window.DAYS.filter((d) => d.date >= startD && d.date <= endD);
    const label = `Q${qIdx + 1} ${year}`;
    const sub = `${window.fmtShort(startD)} – ${window.fmtShort(endD)}`;
    return (
      <div className="canvas fade-in">
        <Header view={view} setView={setView} />
        <QuarterView title={label} sub={sub} days={days} startM={startM} year={year}
        scope={{ kind: "quarter", value: `${year}-Q${qIdx + 1}` }}
        onPrev={() => setQuarterOffset((o) => o - 1)}
        onNext={() => setQuarterOffset((o) => o + 1)} canNext={quarterOffset < 0}
        openWord={openWord} startReview={startReview} goToLibrary={goToLibrary} />
      </div>);

  }

  // ─── MONTH VIEW (default) ───
  return (
    <div className="canvas fade-in">
      <Header view={view} setView={setView} />

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-icon btn-ghost" onClick={() => setMonthOffset((o) => o - 1)}><Icon name="chevL" size={14} /></button>
            <h2 className="serif" style={{ fontSize: 24, padding: "0 6px" }}>{monthLabel}</h2>
            <button className="btn btn-icon btn-ghost" onClick={() => setMonthOffset((o) => o + 1)} disabled={monthOffset >= 0}><Icon name="chevR" size={14} /></button>
          </div>
        </div>

        {/* Day-of-week header — Monday first, full names */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 8 }}>
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) =>
          <div key={i} className="kicker" style={{ textAlign: "center", fontSize: 10.5, letterSpacing: "0.08em" }}>{d}</div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const lbl = window.labelFor(c.day);
            const L = lbl ? window.LABELS[lbl] : null;
            const isToday = c.date.getTime() === today.getTime();
            const isFuture = c.date > today;
            return (
              <button key={i}
              onClick={() => !isFuture && c.day?.count && goToLibrary && goToLibrary({ kind: "day", value: c.iso })}
              disabled={isFuture}
              className="day-cell"
              style={{
                minHeight: 96,
                border: "1.5px solid var(--paper-edge)",
                borderRadius: 12,
                background: L ? L.bg : "var(--paper)",
                color: L ? L.color : "var(--ink-faint)",
                padding: 0,
                cursor: isFuture ? "default" : c.day?.count ? "pointer" : "default",
                opacity: isFuture ? 0.35 : 1,
                display: "flex", flexDirection: "column",
                textAlign: "left",
                position: "relative",
                overflow: "hidden",
                fontFamily: "inherit",
              }}>
                {/* Date pill — top-left, distinct frame */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 8px", borderBottom: L ? "1px solid rgba(0,0,0,0.08)" : "1px solid var(--rule)",
                  background: L ? "rgba(255,255,255,0.35)" : "var(--paper-2)"
                }}>
                  <span className="mono" style={{
                    fontSize: 11, fontWeight: isToday ? 700 : 500,
                    color: isToday ? "var(--accent)" : L ? L.color : "var(--ink-mute)",
                    letterSpacing: "0.04em"
                  }}>
                    {String(c.date.getDate()).padStart(2, "0")}
                  </span>
                  {isToday && <span className="mono" style={{ fontSize: 8.5, color: "var(--accent)", letterSpacing: "0.1em" }}>TODAY</span>}
                </div>
                {/* Word count — bottom, framed as a chip */}
                <div style={{
                  flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "flex-start",
                  padding: 8
                }}>
                  {c.day?.count > 0 &&
                  <span style={{
                    display: "inline-flex", alignItems: "baseline", gap: 4,
                    padding: "3px 8px",
                    background: "var(--paper)",
                    border: "1px solid var(--rule)",
                    borderRadius: 999,
                    fontSize: 11, lineHeight: 1,
                    color: "var(--ink)"
                  }}>
                      <span className="serif" style={{ fontSize: 14, fontWeight: 500 }}>{c.day.count}</span>
                      <span className="faint" style={{ fontSize: 10 }}>word{c.day.count === 1 ? "" : "s"}</span>
                    </span>
                  }
                </div>
              </button>);

          })}
        </div>
      </div>
    </div>);

};

const Header = ({ view, setView }) =>
<div className="page-header">
    <div>
      <div className="kicker">Dashboard · May 11, 2026</div>
      <h1 style={{ marginTop: 8 }}>Good morning, Maren.</h1>
      <div className="meta" style={{ marginTop: 6, maxWidth: "60ch" }}>
        Every dot is a day. Every label is a story — Make every word yours.
      </div>
    </div>
    <div className="row" style={{ gap: 6, background: "var(--paper-2)", padding: 4, borderRadius: 10, border: "1px solid var(--rule)" }}>
      {["week", "month", "quarter"].map((v) =>
    <button key={v} onClick={() => setView(v)}
    className={"btn " + (view === v ? "btn-primary" : "btn-ghost")}
    style={{ padding: "6px 14px", fontSize: 13, textTransform: "capitalize" }}>
          {v}
        </button>
    )}
    </div>
  </div>;


// ─── Week view ───
const WeekView = ({ title, sub, days, scope, onPrev, onNext, canNext, openWord, startReview, goToLibrary }) => {
  const allWords = days.flatMap((d) => d.words);
  return (
    <div>
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-icon btn-ghost" onClick={onPrev}><Icon name="chevL" size={14} /></button>
            <div>
              <h2 className="serif" style={{ fontSize: 24 }}>{title}</h2>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{sub}</div>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onNext} disabled={!canNext}><Icon name="chevR" size={14} /></button>
          </div>
        </div>

        {/* Day strip — Monday→Sunday */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((n, i) => {
            const d = days[i];
            const k = d ? window.labelFor(d) : null;
            const dl = k ? window.LABELS[k] : null;
            return (
              <button key={i}
              onClick={() => d && d.count && goToLibrary && goToLibrary({ kind: "day", value: d.iso })}
              disabled={!d || !d.count}
              style={{
                textAlign: "left",
                padding: 0, borderRadius: 10,
                background: dl ? dl.bg : "var(--paper)",
                color: dl ? dl.color : "var(--ink-faint)",
                border: "1px solid var(--rule)",
                cursor: d && d.count ? "pointer" : "default",
                minHeight: 110,
                display: "flex", flexDirection: "column",
                overflow: "hidden",
                fontFamily: "inherit"
              }}>
                <div style={{ padding: "8px 10px", background: dl ? "rgba(255,255,255,0.35)" : "var(--paper-2)", borderBottom: "1px solid var(--rule)" }}>
                  <div className="kicker" style={{ fontSize: 9.5 }}>{n}</div>
                  <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>{d ? window.fmtShort(d.date) : "—"}</div>
                </div>
                <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div className="serif" style={{ fontSize: 24, lineHeight: 1 }}>{d?.count ?? "—"}</div>
                  <div className="faint" style={{ fontSize: 10.5, marginTop: 2 }}>{d?.count ? "words" : ""}</div>
                </div>
              </button>);

          })}
        </div>
      </div>
    </div>);

};

// ─── Quarter view ───
const QuarterView = ({ title, sub, days, startM, year, scope, onPrev, onNext, canNext, openWord, startReview, goToLibrary }) => {
  const [customizingTop, setCustomizingTop] = React.useState(false);
  const allWords = days.flatMap((d) => d.words);
  const r = window.labelForRange(days);
  const L = r ? window.LABELS[r.key] : null;

  const months = [0, 1, 2].map((i) => {
    const m = new Date(year, startM + i, 1);
    const mDays = window.DAYS.filter((d) => d.date.getMonth() === m.getMonth() && d.date.getFullYear() === m.getFullYear());
    return { date: m, days: mDays };
  });

  return (
    <div>
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-icon btn-ghost" onClick={onPrev}><Icon name="chevL" size={14} /></button>
            <div>
              {/* Quarter name is the click target for top-level customize */}
              <button onClick={() => setCustomizingTop((v) => !v)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              title="Click to customize a review of this quarter">
                <h2 className="serif" style={{ fontSize: 24, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 5, color: "var(--ink)" }}>{title}</h2>
              </button>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{sub} · click name to customize</div>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onNext} disabled={!canNext}><Icon name="chevR" size={14} /></button>
          </div>
        </div>

        {customizingTop &&
        <div style={{ marginBottom: 18 }}>
            <Customizer max={allWords.length || 1}
          onBegin={({ count, mode }) => {setCustomizingTop(false);startReview({ scope, count, mode, label: title });}}
          onCancel={() => setCustomizingTop(false)} />
          </div>
        }

        {/* Three month boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {months.map(({ date, days: mDays }, i) => {
            const s = stat(mDays);
            const mr = window.labelForRange(mDays);
            const ML = mr ? window.LABELS[mr.key] : null;
            const monthName = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            return (
              <div key={i} className="card" style={{ padding: 18, background: ML ? ML.bg : "var(--paper)", border: "1px solid var(--rule)" }}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <div className="kicker" style={{ color: ML ? ML.color : undefined }}>Month {i + 1}</div>
                  {ML && <span className="mono" style={{ fontSize: 10, color: ML.color }}>{ML.name}</span>}
                </div>
                <h3 className="serif" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>{monthName}</h3>
                <div className="row" style={{ alignItems: "baseline", gap: 6, marginTop: 8 }}>
                  <div className="serif" style={{ fontSize: 28, letterSpacing: "-0.025em" }}>{s.captured}</div>
                  <div className="faint" style={{ fontSize: 11 }}>words</div>
                </div>
                <div className="row" style={{ gap: 10, marginTop: 4, fontSize: 11.5, color: "var(--ink-mute)" }}>
                  <span>{s.reviewedPct}% rev</span>
                  <span>·</span>
                  <span>{s.accuracy}% acc</span>
                </div>
                <button className="btn btn-ghost" style={{ marginTop: 10, padding: "4px 0", color: "var(--accent)", fontSize: 12 }}
                onClick={() => goToLibrary && goToLibrary({ kind: "month", value: date.toISOString().slice(0, 10) })}>
                  Open words <Icon name="arrow" size={11} />
                </button>
              </div>);

          })}
        </div>
      </div>
    </div>);

};

window.Calendar = Calendar;