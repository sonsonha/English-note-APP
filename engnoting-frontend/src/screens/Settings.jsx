import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icons.jsx';

function SettingRow({ title, description, control }) {
  return (
    <div className="set-row">
      <div>
        <h4>{title}</h4>
        {description && <p>{description}</p>}
      </div>
      <div>{control}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button className={'toggle' + (value ? ' on' : '')} onClick={() => onChange(!value)} />
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!confirm('Sign out of Eng·noting?')) return;
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  };

  return (
    <div className="canvas fade-in">
      <div className="page-header">
        <div>
          <div className="kicker">Account</div>
          <h1 style={{ marginTop: 8 }}>Settings</h1>
          <div className="meta" style={{ marginTop: 6 }}>
            Manage your preferences and account.
          </div>
        </div>
      </div>

      {/* Account section */}
      <div className="card" style={{ padding: '8px 24px', marginBottom: 24 }}>
        <div style={{ padding: '18px 0', borderBottom: '1px dashed var(--paper-edge)' }}>
          <div className="kicker">Signed in as</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, marginTop: 6 }}>
            {user?.email || '—'}
          </div>
        </div>

        <SettingRow
          title="Sign out"
          description="You'll need to sign in again to access your words."
          control={
            <button
              className="btn"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{ color: 'var(--rose)', borderColor: 'var(--rose-soft)' }}
            >
              {loggingOut ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Signing out…</>
              ) : (
                <><Icon name="logout" size={14} /> Sign out</>
              )}
            </button>
          }
        />
      </div>

      {/* Preferences */}
      <div className="card" style={{ padding: '8px 24px', marginBottom: 24 }}>
        <div style={{ padding: '14px 0 6px' }}>
          <div className="kicker">Preferences</div>
        </div>

        <SettingRow
          title="Daily reminders"
          description="Get a nudge when you haven't reviewed today."
          control={<Toggle value={notifications} onChange={setNotifications} />}
        />

        <SettingRow
          title="Sound effects"
          description="Play sounds on correct / incorrect answers."
          control={<Toggle value={sound} onChange={setSound} />}
        />
      </div>

      {/* About */}
      <div className="card-soft" style={{ padding: 24 }}>
        <div className="kicker">About</div>
        <div style={{ marginTop: 10, color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>
          <b style={{ color: 'var(--ink)', fontFamily: 'var(--display)' }}>Eng·noting</b> helps you build
          your English vocabulary by capturing words in context, generating AI explanations,
          and reinforcing them with spaced-repetition reviews.
        </div>
        <div className="row" style={{ marginTop: 16, gap: 16, color: 'var(--ink-mute)', fontSize: 13 }}>
          <span>v0.1.0</span>
          <span>·</span>
          <span>Built with ♥ for learners</span>
        </div>
      </div>
    </div>
  );
}
