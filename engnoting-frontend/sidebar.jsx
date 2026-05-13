// Sidebar nav
const Sidebar = ({ screen, setScreen, todayCount }) => {
  const Item = ({ id, icon, label, badge, badgeAccent }) => (
    <button
      className={"nav-item" + (screen === id ? " active" : "") + (badgeAccent ? " accent" : "")}
      onClick={() => setScreen(id)}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {badge != null && <span className="nav-badge">{badge}</span>}
    </button>
  );
  return (
    <aside className="nav">
      <div className="brand">
        <div className="brand-mark">e</div>
        <div className="brand-name"><b>Eng</b><span>·noting</span></div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Today</div>
        <Item id="dashboard" icon="cards" label="Dashboard" />
        <Item id="review" icon="play" label="Review session" badge={todayCount} badgeAccent />
      </div>

      <div className="nav-section">
        <div className="nav-label">Library</div>
        <Item id="library" icon="book" label="Words" badge={window.SAMPLE_WORDS.length} />
        <Item id="mps" icon="spark" label="Why this word?" />
      </div>

      <div className="nav-section">
        <div className="nav-label">Account</div>
        <Item id="settings" icon="settings" label="Settings" />
        <Item id="auth" icon="user" label="Sign in / out" />
      </div>

      <div className="nav-foot">
        <div className="avatar">M</div>
        <div style={{lineHeight:1.2}}>
          <div style={{fontWeight:500, fontSize:13.5}}>Maren Hill</div>
          <div className="faint" style={{fontSize:12}}>B2 → C1 · 142 words</div>
        </div>
      </div>
    </aside>
  );
};

window.Sidebar = Sidebar;
