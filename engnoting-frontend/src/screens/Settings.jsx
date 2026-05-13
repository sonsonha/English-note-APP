import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icons.jsx';
import { getTimezone, setTimezone, backfillStats } from '../api/calendar.js';

const TIMEZONES = [
  { label: 'Việt Nam (UTC+7)',       value: 'Asia/Ho_Chi_Minh' },
  { label: 'Bangkok (UTC+7)',        value: 'Asia/Bangkok' },
  { label: 'Singapore (UTC+8)',      value: 'Asia/Singapore' },
  { label: 'China (UTC+8)',          value: 'Asia/Shanghai' },
  { label: 'Japan (UTC+9)',          value: 'Asia/Tokyo' },
  { label: 'Korea (UTC+9)',          value: 'Asia/Seoul' },
  { label: 'UTC',                    value: 'UTC' },
  { label: 'London (UTC+0/+1)',      value: 'Europe/London' },
  { label: 'Paris (UTC+1/+2)',       value: 'Europe/Paris' },
  { label: 'New York (UTC-5/-4)',    value: 'America/New_York' },
  { label: 'Los Angeles (UTC-8/-7)', value: 'America/Los_Angeles' },
];

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
  const [tz, setTz] = useState(getTimezone);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState(null);

  const handleLogout = async () => {
    if (!confirm('Sign out of Eng·noting?')) return;
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  };

  const handleTzChange = (e) => {
    setTz(e.target.value);
    setTimezone(e.target.value);
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      await backfillStats();
      setBackfillMsg('success');
    } catch {
      setBackfillMsg('error');
    } finally {
      setBackfilling(false);
    }
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

        <SettingRow
          title="Timezone"
          description="Used to align the calendar to your local day."
          control={
            <select
              value={tz}
              onChange={handleTzChange}
              style={{
                padding: '6px 10px', borderRadius: 8, fontSize: 13,
                border: '1.5px solid var(--paper-edge)', background: 'var(--paper)',
                color: 'var(--ink)', cursor: 'pointer',
              }}
            >
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          }
        />
      </div>

      {/* Data */}
      <div className="card" style={{ padding: '8px 24px', marginBottom: 24 }}>
        <div style={{ padding: '14px 0 6px' }}>
          <div className="kicker">Data</div>
        </div>
        <SettingRow
          title="Sync historical stats"
          description="Rebuild calendar data from all your words and reviews. Run this if the calendar is missing past activity."
          control={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {backfillMsg === 'success' && (
                <span style={{ fontSize: 12, color: 'var(--mint-deep)' }}>Done!</span>
              )}
              {backfillMsg === 'error' && (
                <span style={{ fontSize: 12, color: 'var(--rose)' }}>Failed</span>
              )}
              <button
                className="btn"
                onClick={handleBackfill}
                disabled={backfilling}
              >
                {backfilling
                  ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Syncing…</>
                  : <><Icon name="refresh" size={14} /> Sync now</>
                }
              </button>
            </div>
          }
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
