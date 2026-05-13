// Settings
const Settings = () => {
  const [reviewSize, setReviewSize] = React.useState(10);
  const [criticalRatio, setCritRatio] = React.useState("5/5");
  const [aiProvider, setAi] = React.useState("OpenAI · GPT-4o-mini");
  const [voice, setVoice] = React.useState("Standard British");
  const [t, setT] = React.useState({ sound: true, dailyEmail: false, mpsBadge: false, autoCapture: true });

  return (
    <div className="canvas fade-in" style={{maxWidth:780}}>
      <div className="page-header">
        <div>
          <div className="kicker">Settings</div>
          <h1 style={{marginTop:8}}>How Eng-noting works for you</h1>
        </div>
      </div>

      <div className="card" style={{padding:"4px 24px"}}>
        <Section title="Review">
          <Row title="Daily session size" desc="How many words to surface in a single session.">
            <select className="input" style={{width:"auto"}} value={reviewSize} onChange={(e) => setReviewSize(+e.target.value)}>
              <option value={5}>5 words</option>
              <option value={10}>10 words</option>
              <option value={15}>15 words</option>
              <option value={20}>20 words</option>
            </select>
          </Row>
          <Row title="Critical / normal split" desc="How aggressively to weight high-MPS words.">
            <select className="input" style={{width:"auto"}} value={criticalRatio} onChange={(e) => setCritRatio(e.target.value)}>
              <option>3/7</option><option>5/5</option><option>7/3</option>
            </select>
          </Row>
          <Row title="Pronunciation voice" desc="Used when you tap the speaker icon.">
            <select className="input" style={{width:"auto"}} value={voice} onChange={(e)=>setVoice(e.target.value)}>
              <option>Standard British</option>
              <option>American</option>
              <option>Australian</option>
            </select>
          </Row>
          <Row title="Show MPS badge in lists" desc="Hidden by default — meaning is shown via the reason string.">
            <Toggle on={t.mpsBadge} onClick={() => setT({...t, mpsBadge: !t.mpsBadge})} />
          </Row>
        </Section>

        <Section title="Capture">
          <Row title="Quick capture shortcut" desc="Open the capture modal from anywhere.">
            <span className="kbd">⌘</span><span className="kbd">K</span>
          </Row>
          <Row title="Auto-suggest while typing" desc="Show the AI preview before you confirm.">
            <Toggle on={t.autoCapture} onClick={() => setT({...t, autoCapture: !t.autoCapture})} />
          </Row>
          <Row title="AI provider" desc="Used to draft definitions and examples.">
            <select className="input" style={{width:"auto"}} value={aiProvider} onChange={(e)=>setAi(e.target.value)}>
              <option>OpenAI · GPT-4o-mini</option>
              <option>Gemini 1.5 Flash</option>
              <option>Off — manual only</option>
            </select>
          </Row>
        </Section>

        <Section title="Notifications">
          <Row title="Daily reminder email" desc="A gentle nudge at 8:00 if you haven't reviewed.">
            <Toggle on={t.dailyEmail} onClick={() => setT({...t, dailyEmail: !t.dailyEmail})} />
          </Row>
          <Row title="Sound on correct answer" desc="A soft chime when you nail one.">
            <Toggle on={t.sound} onClick={() => setT({...t, sound: !t.sound})} />
          </Row>
        </Section>

        <Section title="Account" last>
          <Row title="Email" desc="maren.hill@gmail.com">
            <button className="btn btn-ghost">Change</button>
          </Row>
          <Row title="Export your library" desc="Download every word as JSON or CSV.">
            <button className="btn">Export CSV</button>
          </Row>
          <Row title="Delete account" desc="This cannot be undone.">
            <button className="btn" style={{color:"var(--rose)", borderColor:"oklch(0.85 0.04 25)"}}>Delete</button>
          </Row>
        </Section>
      </div>
    </div>
  );
};

const Section = ({ title, children, last }) => (
  <div style={{padding:"22px 0", borderBottom: last ? "none" : "1px solid var(--rule)"}}>
    <div className="kicker">{title}</div>
    <div style={{marginTop:6}}>{children}</div>
  </div>
);
const Row = ({ title, desc, children }) => (
  <div className="set-row">
    <div>
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
    <div className="row" style={{gap:6}}>{children}</div>
  </div>
);
const Toggle = ({ on, onClick }) => <button className={"toggle" + (on ? " on" : "")} onClick={onClick} />;

window.Settings = Settings;
