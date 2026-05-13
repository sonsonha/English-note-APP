// Review session — 4 formats with swipe + keyboard
const formatLabels = {
  mcq: "Multiple choice",
  match: "Matching",
  typing: "Typing",
  fill_blank: "Fill in the blank",
};

const ReviewSession = ({ setScreen, openWord, finishSession, config }) => {
  const [idx, setIdx] = React.useState(0);
  const [results, setResults] = React.useState([]); // {id, correct}
  const [animOut, setAnimOut] = React.useState(null); // 'left' | 'right'

  // If a scoped config is provided, build a queue from window.DAYS scoped words; otherwise use the today queue.
  const queue = React.useMemo(() => {
    if (!config || !config.scope || config.scope.kind === "all" || !window.DAYS) {
      return window.TODAY_QUEUE.map(window.getWord);
    }
    const scope = config.scope;
    let days = [];
    if (scope.kind === "day")     days = window.DAYS.filter(d => d.iso === scope.value);
    else if (scope.kind === "week")    days = window.DAYS.slice(-7);
    else if (scope.kind === "month")   {
      const m = scope.value || window.TODAY_DATE;
      days = window.DAYS.filter(d => d.date.getMonth() === m.getMonth() && d.date.getFullYear() === m.getFullYear());
    }
    else if (scope.kind === "quarter") days = window.DAYS.slice(-90);
    // Map calendar words back to library cards by reusing real sample words for the cards.
    // Synthetic day words don't have full memory cards — surface them as lightweight cards by mapping into SAMPLE_WORDS round-robin so the review formats can render meaningfully.
    const all = days.flatMap(d => d.words);
    const lib = window.SAMPLE_WORDS;
    return all.slice(0, config.count || 10).map((w, i) => lib[i % lib.length]);
  }, [config]);

  const total = queue.length;
  const w = queue[idx];

  const scopeLabel = config?.label || (config?.scope?.kind === "day" ? "specific day"
                  : config?.scope?.kind === "week" ? "this week"
                  : config?.scope?.kind === "month" ? "this month"
                  : config?.scope?.kind === "quarter" ? "this quarter"
                  : "today's queue");

  // Pick format by mastery rules
  const pickFormat = (w) => {
    if (w.accuracy < 0.4 || w.reviews < 3) return "mcq";
    if (w.accuracy < 0.7) return "match";
    if (w.accuracy >= 0.8 && w.reviews >= 5) return "fill_blank";
    return "typing";
  };
  const format = w ? pickFormat(w) : null;

  const advance = (correct) => {
    setResults(r => [...r, { id: w.id, correct, format }]);
    setAnimOut(correct ? "right" : "left");
    setTimeout(() => {
      setAnimOut(null);
      if (idx + 1 >= total) {
        finishSession([...results, { id: w.id, correct, format }]);
      } else {
        setIdx(i => i + 1);
      }
    }, 350);
  };

  if (!w) return null;

  const pct = (idx / total) * 100;

  return (
    <div className="canvas fade-in" style={{maxWidth:760}}>
      <div className="row between" style={{marginBottom:14}}>
        <button className="btn btn-ghost" onClick={() => setScreen("dashboard")}>
          <Icon name="x" size={14} /> End session
        </button>
        <div className="row" style={{gap:14}}>
          <span className="muted serif" style={{fontStyle:"italic", fontSize:13}}>Reviewing · {scopeLabel}</span>
          <span className="mono faint" style={{fontSize:12}}>{idx+1} / {total}</span>
          <span className="tag tag-pos">{formatLabels[format]}</span>
        </div>
      </div>

      <div className="progress" style={{marginBottom:24}}>
        <span style={{width: pct + "%"}} />
      </div>

      <div className={"review-card" + (animOut ? " swipe-" + animOut : "")} key={idx}>
        {format === "mcq" && <MCQ word={w} onAnswer={advance} />}
        {format === "match" && <Match word={w} onAnswer={advance} />}
        {format === "typing" && <Typing word={w} onAnswer={advance} />}
        {format === "fill_blank" && <FillBlank word={w} onAnswer={advance} />}
      </div>

      <div className="row between" style={{marginTop:18, color:"var(--ink-mute)", fontSize:12.5}}>
        <div className="row" style={{gap:14}}>
          <span><span className="kbd">←</span> didn't know</span>
          <span><span className="kbd">→</span> got it</span>
          <span><span className="kbd">Space</span> reveal</span>
        </div>
        <button className="btn btn-ghost" style={{padding:"4px 10px"}} onClick={() => openWord(w.id)}>
          See full card <Icon name="arrow" size={13} />
        </button>
      </div>
    </div>
  );
};

// ===== MCQ =====
const MCQ = ({ word, onAnswer }) => {
  const [picked, setPicked] = React.useState(null);
  const [reveal, setReveal] = React.useState(false);

  const choices = React.useMemo(() => {
    const arr = [
      { text: word.definition, correct: true },
      ...(window.DISTRACTORS[word.id] || []).slice(0,3).map(t => ({ text: t, correct: false })),
    ];
    return arr.sort(() => Math.random() - 0.5);
  }, [word.id]);

  const select = (i) => {
    if (reveal) return;
    setPicked(i);
    setReveal(true);
    const correct = choices[i].correct;
    setTimeout(() => onAnswer(correct), 800);
  };

  return (
    <>
      <div className="row" style={{gap:10, marginBottom:18}}>
        <span className={"tag cefr-" + word.cefr}>{word.cefr}</span>
        <span className="tag tag-pos">{word.pos}</span>
        <span className="muted serif" style={{fontStyle:"italic", fontSize:14, marginLeft:"auto"}}>
          choose the correct meaning
        </span>
      </div>

      <h1 className="serif" style={{fontSize:64, letterSpacing:"-0.025em"}}>{word.text}</h1>
      <div className="muted mono" style={{fontSize:13, marginTop:4}}>{word.phonetic}</div>

      <div className="col" style={{marginTop:28, gap:10}}>
        {choices.map((c, i) => {
          const cls =
            reveal && c.correct ? "choice correct" :
            reveal && i === picked && !c.correct ? "choice wrong" :
            i === picked ? "choice selected" : "choice";
          return (
            <button key={i} className={cls} onClick={() => select(i)}>
              <span className="choice-key">{["A","B","C","D"][i]}</span>
              <span>{c.text}</span>
              {reveal && c.correct && <span style={{marginLeft:"auto"}}><Icon name="check" size={16} /></span>}
            </button>
          );
        })}
      </div>
    </>
  );
};

// ===== Matching (drag would be lovely but click-pair is faster + works with prompt) =====
const Match = ({ word, onAnswer }) => {
  const pairs = React.useMemo(() => {
    // Build pairs: word, 2 synonyms, 1 distractor
    const left = [
      { id: "w", label: word.text, kind: "headword" },
      { id: "s1", label: word.synonyms[0], kind: "syn" },
      { id: "s2", label: word.synonyms[1] || word.synonyms[0], kind: "syn" },
    ];
    const right = [
      { id: "w", label: word.definition },
      { id: "s1", label: "synonym", note: word.synonyms[0] },
      { id: "s2", label: "synonym", note: word.synonyms[1] || word.synonyms[0] },
    ];
    const matches = {
      "w": "Definition",
      "s1": "Synonym",
      "s2": "Synonym",
    };
    return { left, matches };
  }, [word.id]);

  const [selectedLeft, setSelectedLeft] = React.useState(null);
  const [done, setDone] = React.useState({}); // leftId -> rightLabel

  const right = ["Definition", "Synonym", "Antonym (decoy)"];

  React.useEffect(() => {
    if (Object.keys(done).filter(k => done[k] === pairs.matches[k]).length >= 2 ||
        Object.keys(done).length === pairs.left.length) {
      const allCorrect = pairs.left.every(l => done[l.id] === pairs.matches[l.id]);
      setTimeout(() => onAnswer(allCorrect), 700);
    }
  }, [done]);

  const tryMatch = (rightLabel) => {
    if (!selectedLeft) return;
    setDone(d => ({...d, [selectedLeft]: rightLabel }));
    setSelectedLeft(null);
  };

  return (
    <>
      <div className="row" style={{gap:10, marginBottom:18}}>
        <span className={"tag cefr-" + word.cefr}>{word.cefr}</span>
        <span className="muted serif" style={{fontStyle:"italic", fontSize:14, marginLeft:"auto"}}>
          tap a word, then its match
        </span>
      </div>
      <h2 className="serif" style={{fontSize:32, letterSpacing:"-0.02em"}}>Pair each with the right side.</h2>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:24}}>
        <div className="col" style={{gap:10}}>
          {pairs.left.map(l => {
            const matched = done[l.id];
            const correct = matched && matched === pairs.matches[l.id];
            const cls =
              correct ? "choice correct" :
              matched ? "choice wrong" :
              selectedLeft === l.id ? "choice selected" : "choice";
            return (
              <button key={l.id} className={cls}
                onClick={() => !matched && setSelectedLeft(l.id)}>
                <span className="serif" style={{fontSize:18}}>{l.label}</span>
              </button>
            );
          })}
        </div>
        <div className="col" style={{gap:10}}>
          {right.map(r => (
            <button key={r} className="choice" onClick={() => tryMatch(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// ===== Typing =====
const Typing = ({ word, onAnswer }) => {
  const [val, setVal] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    if (reveal || !val.trim()) return;
    setReveal(true);
    const correct = val.trim().toLowerCase() === word.text.toLowerCase();
    setTimeout(() => onAnswer(correct), 900);
  };

  return (
    <>
      <div className="row" style={{gap:10, marginBottom:18}}>
        <span className={"tag cefr-" + word.cefr}>{word.cefr}</span>
        <span className="tag tag-pos">{word.pos}</span>
        <span className="muted serif" style={{fontStyle:"italic", fontSize:14, marginLeft:"auto"}}>
          type the word
        </span>
      </div>

      <div className="kicker">Definition</div>
      <div className="serif" style={{fontSize:30, lineHeight:1.2, letterSpacing:"-0.02em", marginTop:8}}>
        {word.definition}
      </div>

      <div className="card-soft" style={{marginTop:18, fontStyle:"italic", color:"var(--ink-2)"}}>
        "{word.exampleGood.replace(new RegExp(word.text, "gi"), "_____")}"
      </div>

      <div style={{marginTop:24}}>
        <input
          ref={ref}
          className="input input-lg"
          placeholder="Type the word…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={reveal}
          style={reveal ?
            (val.trim().toLowerCase() === word.text.toLowerCase()
              ? { borderColor:"var(--leaf)", background:"oklch(0.96 0.04 145)"}
              : { borderColor:"var(--rose)", background:"oklch(0.96 0.04 25)"})
            : {}
          }
        />
        {reveal && val.trim().toLowerCase() !== word.text.toLowerCase() && (
          <div className="muted" style={{marginTop:10, fontSize:14}}>
            The word was <b className="serif">{word.text}</b>.
          </div>
        )}
      </div>

      <div className="row" style={{marginTop:"auto", paddingTop:24, justifyContent:"flex-end"}}>
        <button className="btn btn-primary" onClick={submit} disabled={!val.trim() || reveal}>
          Check <Icon name="check" size={14} />
        </button>
      </div>
    </>
  );
};

// ===== Fill in the blank =====
const FillBlank = ({ word, onAnswer }) => {
  const [val, setVal] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => { ref.current?.focus(); }, []);

  const sentence = word.exampleGood;
  const re = new RegExp(`(${word.text})`, "i");
  const parts = sentence.split(re);

  const submit = () => {
    if (reveal || !val.trim()) return;
    setReveal(true);
    const correct = val.trim().toLowerCase() === word.text.toLowerCase();
    setTimeout(() => onAnswer(correct), 900);
  };

  return (
    <>
      <div className="row" style={{gap:10, marginBottom:18}}>
        <span className={"tag cefr-" + word.cefr}>{word.cefr}</span>
        <span className="muted serif" style={{fontStyle:"italic", fontSize:14, marginLeft:"auto"}}>
          fill in the blank
        </span>
      </div>

      <div className="kicker">Definition</div>
      <div style={{fontSize:14, color:"var(--ink-2)", marginTop:6, marginBottom:18}}>{word.definition}</div>

      <div className="serif" style={{fontSize:32, lineHeight:1.35, letterSpacing:"-0.01em"}}>
        {parts.map((p, i) =>
          re.test(p) ? (
            <input
              key={i}
              ref={ref}
              className="input"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={reveal}
              placeholder="_____"
              style={{
                display:"inline-block", width: Math.max(120, word.text.length*16),
                fontFamily:"var(--serif)", fontSize:30,
                padding:"4px 10px", borderRadius:8,
                ...(reveal ? (val.trim().toLowerCase() === word.text.toLowerCase()
                    ? { borderColor:"var(--leaf)", background:"oklch(0.96 0.04 145)" }
                    : { borderColor:"var(--rose)", background:"oklch(0.96 0.04 25)" }) : {})
              }}
            />
          ) : <span key={i}>{p}</span>
        )}
      </div>

      {reveal && val.trim().toLowerCase() !== word.text.toLowerCase() && (
        <div className="muted" style={{marginTop:18, fontSize:14}}>
          The word was <b className="serif">{word.text}</b>.
        </div>
      )}

      <div className="row" style={{marginTop:"auto", paddingTop:24, justifyContent:"flex-end"}}>
        <button className="btn btn-primary" onClick={submit} disabled={!val.trim() || reveal}>
          Check <Icon name="check" size={14} />
        </button>
      </div>
    </>
  );
};

window.ReviewSession = ReviewSession;
