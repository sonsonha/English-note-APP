import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icons.jsx';

function NavItem({ id, screen, setScreen, icon, label, badge }) {
  return (
    <button
      className={'nav-item' + (screen === id ? ' active' : '')}
      onClick={() => setScreen(id)}
    >
      <Icon name={icon} size={17} />
      <span>{label}</span>
      {badge != null && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

export default function Sidebar({ screen, setScreen, wordCount }) {
  const { user } = useAuth();
  const initial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <aside className="nav">
      <div className="brand">
        <div className="brand-mark">e</div>
        <div className="brand-name">
          <b>Eng</b><span>·noting</span>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Today</div>
        <NavItem id="calendar" screen={screen} setScreen={setScreen} icon="calendar" label="Dashboard" />
        <NavItem id="review"   screen={screen} setScreen={setScreen} icon="play"     label="Review session" />
      </div>

      <div className="nav-section">
        <div className="nav-label">Explore</div>
        <NavItem id="library" screen={screen} setScreen={setScreen} icon="book"     label="My Library" badge={wordCount || undefined} />
        <NavItem id="topics"  screen={screen} setScreen={setScreen} icon="bookmark" label="Topics" />
      </div>

      <div className="nav-section">
        <div className="nav-label">Account</div>
        <NavItem id="settings" screen={screen} setScreen={setScreen} icon="settings" label="Settings" />
      </div>

      <div className="nav-foot">
        <div className="avatar">{initial}</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>
            {user?.email || 'You'}
          </div>
          <div className="faint" style={{ fontSize: 12 }}>
            {wordCount} word{wordCount === 1 ? '' : 's'} saved
          </div>
        </div>
      </div>
    </aside>
  );
}
