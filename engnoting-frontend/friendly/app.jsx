// Main App — orchestrates screens, tweaks, capture
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 35,
  "paperWarmth": 85,
  "density": "comfortable",
  "showStreakRow": true,
  "display": "Plus Jakarta Sans"
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  // Coral-family accent, hue tweakable. Keep chroma + lightness as friendly defaults.
  root.style.setProperty("--accent",      `oklch(0.70 0.150 ${t.accentHue})`);
  root.style.setProperty("--accent-deep", `oklch(0.55 0.150 ${t.accentHue})`);
  root.style.setProperty("--accent-soft", `oklch(0.94 0.055 ${t.accentHue + 5})`);
  root.style.setProperty("--accent-tint", `oklch(0.97 0.030 ${t.accentHue + 10})`);
  // Paper warmth — keep very light + low-chroma so it stays creamy.
  root.style.setProperty("--paper",     `oklch(0.985 0.010 ${t.paperWarmth})`);
  root.style.setProperty("--paper-2",   `oklch(0.965 0.014 ${t.paperWarmth - 5})`);
  root.style.setProperty("--paper-edge",`oklch(0.93 0.018 ${t.paperWarmth - 10})`);
  root.style.setProperty("--rule",      `oklch(0.91 0.020 ${t.paperWarmth - 15})`);

  if (t.display === "Plus Jakarta Sans") root.style.setProperty("--display", `"Plus Jakarta Sans", system-ui, sans-serif`);
  if (t.display === "Quicksand")         root.style.setProperty("--display", `"Quicksand", system-ui, sans-serif`);
  if (t.display === "DM Sans")           root.style.setProperty("--display", `"DM Sans", system-ui, sans-serif`);
  document.body.style.fontSize = t.density === "compact" ? "14px" : "15px";
}

const App = () => {
  const [screen, setScreen] = useState("dashboard");
  const [signedIn, setSignedIn] = useState(true);
  const [activeWord, setActiveWord] = useState(null);
  const [sessionResults, setSessionResults] = useState([]);

  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  useEffect(() => { applyTweaks(tweaks); }, [tweaks]);

  const [reviewConfig, setReviewConfig] = useState(null);
  const [libraryScope, setLibraryScope] = useState(null);
  const openWord = (id) => { setActiveWord(id); setScreen("word"); };
  const finishSession = (results) => { setSessionResults(results); setScreen("results"); };
  const startReview = (cfg) => { setReviewConfig(cfg || null); setScreen("review"); };

  // Auth gate
  if (!signedIn || screen === "auth") {
    return (
      <>
        <window.Auth onSignIn={() => { setSignedIn(true); setScreen("dashboard"); }} />
        <Tweaks tweaks={tweaks} setTweak={setTweak} />
      </>
    );
  }

  let content;
  switch (screen) {
    case "dashboard": content = <window.Calendar setScreen={setScreen} openWord={openWord} startReview={startReview} goToLibrary={(scope) => { setLibraryScope(scope); setScreen("library"); }} />; break;
    case "library":   content = <window.Library openWord={openWord} scope={libraryScope} setScope={setLibraryScope} />; break;
    case "calendar":  content = <window.Calendar setScreen={setScreen} openWord={openWord} startReview={startReview} goToLibrary={(scope) => { setLibraryScope(scope); setScreen("library"); }} />; break;
    case "word":      content = <window.WordDetail wordId={activeWord || "w-resilient"} setScreen={setScreen} />; break;
    case "review":    content = <window.ReviewSession setScreen={setScreen} openWord={openWord} finishSession={finishSession} config={reviewConfig} />; break;
    case "results":   content = <window.Results results={sessionResults} setScreen={setScreen} />; break;
    case "mps":       content = <window.MPSExplainer setScreen={setScreen} openWord={openWord} />; break;
    case "settings":  content = <window.Settings />; break;
    default:          content = <window.Dashboard setScreen={setScreen} openWord={openWord} />;
  }

  return (
    <>
      <div className="app">
        <window.Sidebar screen={screen} setScreen={setScreen} todayCount={window.TODAY_QUEUE.length} />
        <main>{content}</main>
      </div>
      <window.CaptureFab />
      <Tweaks tweaks={tweaks} setTweak={setTweak} />
    </>
  );
};

const Tweaks = ({ tweaks, setTweak }) => {
  const { TweaksPanel, TweakSection, TweakRadio, TweakSlider, TweakToggle, TweakSelect } = window;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Aesthetics" />
      <TweakSlider label="Accent hue" value={tweaks.accentHue} onChange={v => setTweak("accentHue", v)} min={0} max={360} step={1} />
      <TweakSlider label="Paper warmth" value={tweaks.paperWarmth} onChange={v => setTweak("paperWarmth", v)} min={50} max={110} step={1} />
      <TweakSelect label="Display font" value={tweaks.display} onChange={v => setTweak("display", v)}
        options={["Plus Jakarta Sans","Quicksand","DM Sans"]} />
      <TweakSection label="Layout" />
      <TweakRadio label="Density" value={tweaks.density} onChange={v => setTweak("density", v)} options={["compact","comfortable"]} />
      <TweakToggle label="Show streak row on dashboard" value={tweaks.showStreakRow} onChange={v => setTweak("showStreakRow", v)} />
    </TweaksPanel>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
