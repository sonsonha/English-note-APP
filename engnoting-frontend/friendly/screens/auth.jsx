// Auth — sign in / sign up
const Auth = ({ onSignIn }) => {
  const [mode, setMode] = React.useState("signin");

  return (
    <div className="auth-grid">
      <div className="auth-side">
        <div className="row" style={{gap:12}}>
          <div className="brand-mark" style={{background:"#fff", color:"var(--accent-deep)", boxShadow:"none"}}>e</div>
          <div style={{color:"#fff", fontFamily:"var(--display)", fontWeight:800, fontSize:22, letterSpacing:"-0.02em"}}>
            Eng·noting
          </div>
        </div>

        <div>
          <div className="quote">
            Make every word yours.
          </div>
          <div style={{fontFamily:"var(--mono)", fontSize:12, marginTop:18, letterSpacing:"0.14em", textTransform:"uppercase", color:"oklch(1 0 0 / 0.78)", fontWeight:700}}>
            — Maren, B2 → C1 in 11 weeks
          </div>
        </div>

        <div style={{display:"flex", gap:32, color:"oklch(1 0 0 / 0.86)", fontSize:13.5}}>
          <div>
            <div style={{fontFamily:"var(--display)", fontWeight:800, fontSize:34, color:"#fff", letterSpacing:"-0.025em"}}>9 min</div>
            a day, that's all
          </div>
          <div>
            <div style={{fontFamily:"var(--display)", fontWeight:800, fontSize:34, color:"#fff", letterSpacing:"-0.025em"}}>74%</div>
            recall after 30 days
          </div>
          <div>
            <div style={{fontFamily:"var(--display)", fontWeight:800, fontSize:34, color:"#fff", letterSpacing:"-0.025em"}}>0</div>
            apps to install
          </div>
        </div>
      </div>

      <div className="auth-form">
        <div className="kicker">{mode === "signin" ? "Welcome back" : "Hello there"}</div>
        <h1 style={{fontSize:44, marginTop:8, letterSpacing:"-0.028em", fontWeight:800}}>
          {mode === "signin" ? "Good to see you again." : "Let's start your notebook."}
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
