// Auth — sign in / sign up
const Auth = ({ onSignIn }) => {
  const [mode, setMode] = React.useState("signin");

  return (
    <div className="auth-grid">
      <div className="auth-side">
        <div className="row" style={{gap:10}}>
          <div className="brand-mark" style={{background:"var(--paper)", color:"var(--ink)"}}>e</div>
          <div className="brand" style={{color:"var(--paper)", fontFamily:"var(--serif)"}}>
            <span style={{fontStyle:"italic", color:"oklch(0.85 0.02 70)"}}>Eng·noting</span>
          </div>
        </div>

        <div>
          <div className="quote">
            "The notebook remembers — so I don't have to."
          </div>
          <div style={{fontFamily:"var(--mono)", fontSize:12, marginTop:18, letterSpacing:"0.16em", textTransform:"uppercase", color:"oklch(0.78 0.018 70)"}}>
            — Maren, B2 → C1 in 11 weeks
          </div>
        </div>

        <div style={{display:"flex", gap:32, color:"oklch(0.85 0.02 70)", fontSize:13.5}}>
          <div>
            <div className="serif" style={{fontSize:32, color:"var(--paper)", letterSpacing:"-0.02em"}}>9 min</div>
            average daily review
          </div>
          <div>
            <div className="serif" style={{fontSize:32, color:"var(--paper)", letterSpacing:"-0.02em"}}>74%</div>
            recall after 30 days
          </div>
          <div>
            <div className="serif" style={{fontSize:32, color:"var(--paper)", letterSpacing:"-0.02em"}}>0</div>
            apps to install
          </div>
        </div>
      </div>

      <div className="auth-form">
        <div className="kicker">{mode === "signin" ? "Welcome back" : "Start a notebook"}</div>
        <h1 className="serif" style={{fontSize:42, marginTop:6, letterSpacing:"-0.025em"}}>
          {mode === "signin" ? "Sign in to your notebook." : "Begin learning."}
        </h1>

        <div style={{marginTop:28, display:"flex", flexDirection:"column", gap:16}}>
          {mode === "signup" && (
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="Your name" />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" placeholder="you@university.edu" defaultValue="maren.hill@gmail.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••" defaultValue="••••••••" />
          </div>

          <button className="btn btn-primary" style={{justifyContent:"center", padding:"12px 16px", marginTop:8}}
            onClick={onSignIn}>
            {mode === "signin" ? "Sign in" : "Create account"} <Icon name="arrow" size={14} />
          </button>

          <div className="row" style={{justifyContent:"center", gap:14, color:"var(--ink-mute)", marginTop:6}}>
            <hr style={{flex:1, border:0, borderTop:"1px solid var(--rule)"}} />
            <span className="kicker">or</span>
            <hr style={{flex:1, border:0, borderTop:"1px solid var(--rule)"}} />
          </div>

          <button className="btn" style={{justifyContent:"center", padding:"12px 16px"}} onClick={onSignIn}>
            Continue with Google
          </button>

          <div className="muted center" style={{fontSize:13.5, marginTop:8}}>
            {mode === "signin" ? <>New here? <a onClick={(e)=>{e.preventDefault();setMode("signup")}} href="#">Start a notebook</a>.</>
                               : <>Already have one? <a onClick={(e)=>{e.preventDefault();setMode("signin")}} href="#">Sign in</a>.</>}
          </div>
        </div>
      </div>
    </div>
  );
};

window.Auth = Auth;
