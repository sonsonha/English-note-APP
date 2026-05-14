import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icons.jsx';
import { listUsers, toggleAdmin, getStats } from '../api/admin.js';

const TABS = ['Dashboard', 'Users', 'Vocabulary', 'AI', 'Reviews'];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div className="kicker">{label}</div>
      <div style={{
        fontFamily: 'var(--display)', fontWeight: 800, fontSize: 32,
        letterSpacing: '-0.02em', marginTop: 6,
        color: accent ? 'var(--accent)' : 'var(--ink)',
      }}>
        {value}
      </div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Pct({ value }) {
  const pct = typeof value === 'number' ? value.toFixed(1) + '%' : '—';
  const color = value >= 60 ? 'var(--green, #22c55e)' : value >= 30 ? 'var(--accent)' : 'var(--rose, #f43f5e)';
  return <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 28, color }}>{pct}</span>;
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 12, marginTop: 28 }}>
      {children}
    </div>
  );
}

function SimpleTable({ headers, rows }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: headers.map(h => h.width || '1fr').join(' '),
        padding: '10px 20px',
        background: 'var(--paper-2)',
        borderBottom: '1.5px solid var(--paper-edge)',
      }}>
        {headers.map(h => (
          <div key={h.label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)' }}>
            {h.label}
          </div>
        ))}
      </div>
      {rows.length === 0 && (
        <div className="center muted" style={{ padding: 24 }}>No data yet.</div>
      )}
      {rows.map((row, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: headers.map(h => h.width || '1fr').join(' '),
          padding: '12px 20px',
          borderBottom: i < rows.length - 1 ? '1px solid var(--paper-edge)' : 'none',
          alignItems: 'center',
        }}>
          {row.map((cell, j) => (
            <div key={j} style={{ fontSize: 14, fontWeight: j === 0 ? 600 : 400, color: j === 0 ? 'var(--ink)' : 'var(--ink-mute)' }}>
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Tab: Dashboard ───────────────────────────────────────────────────────────
function DashboardTab({ stats }) {
  if (!stats) return <div className="center muted" style={{ padding: 48 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>;
  const d = stats.dashboard;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 4 }}>
        <StatCard label="Total users" value={d.total_users.toLocaleString()} accent />
        <StatCard label="DAU" value={d.dau.toLocaleString()} sub="active today" />
        <StatCard label="WAU" value={d.wau.toLocaleString()} sub="active last 7 days" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 4 }}>
        <StatCard label="MAU" value={d.mau.toLocaleString()} sub="active last 30 days" />
        <StatCard label="New signups today" value={d.new_signups_today.toLocaleString()} />
        <StatCard label="New signups this week" value={d.new_signups_week.toLocaleString()} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Words saved today" value={d.words_today.toLocaleString()} />
        <StatCard label="Reviews completed today" value={d.reviews_today.toLocaleString()} />
        <StatCard label="Avg words / user" value={d.avg_words_per_user.toFixed(1)} />
      </div>
    </>
  );
}

// ── Tab: Users ───────────────────────────────────────────────────────────────
function UsersTab({ users, loading, error, search, setSearch, me, toggling, handleToggle }) {
  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));
  const totalWords   = users.reduce((s, u) => s + u.word_count,   0);
  const totalReviews = users.reduce((s, u) => s + u.review_count, 0);
  const adminCount   = users.filter(u => u.is_admin).length;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total users"   value={users.length}                accent />
        <StatCard label="Total words"   value={totalWords.toLocaleString()}   />
        <StatCard label="Total reviews" value={totalReviews.toLocaleString()} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 340 }}
        />
      </div>

      {loading && <div className="center" style={{ padding: 48 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>}
      {error && <div style={{ padding: '14px 20px', background: 'var(--rose-soft)', borderRadius: 12, color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}

      {!loading && !error && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 1fr 0.9fr',
            padding: '10px 20px', background: 'var(--paper-2)', borderBottom: '1.5px solid var(--paper-edge)',
          }}>
            {['Email', 'Words', 'Reviews', 'Joined', 'Admin'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)' }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 && <div className="center muted" style={{ padding: 32 }}>No users found.</div>}

          {filtered.map(u => {
            const isSelf = u.email === me?.email;
            const isToggling = toggling === u.id;
            return (
              <div key={u.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 1fr 0.9fr',
                padding: '14px 20px', borderBottom: '1px solid var(--paper-edge)', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: u.is_admin ? 'var(--accent)' : 'var(--paper-2)',
                    border: '1.5px solid var(--paper-edge)',
                    display: 'grid', placeItems: 'center',
                    fontWeight: 700, fontSize: 12,
                    color: u.is_admin ? '#fff' : 'var(--ink-mute)', flexShrink: 0,
                  }}>
                    {u.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.email}</div>
                    {isSelf && <div style={{ fontSize: 11, color: 'var(--accent)' }}>you</div>}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15 }}>{u.word_count.toLocaleString()}</div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15 }}>{u.review_count.toLocaleString()}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div>
                  <button
                    className={u.is_admin ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ fontSize: 12, padding: '5px 14px', opacity: isSelf ? 0.4 : 1 }}
                    disabled={isToggling || isSelf}
                    onClick={() => handleToggle(u.id, u.is_admin)}
                    title={isSelf ? 'Cannot remove your own admin status' : (u.is_admin ? 'Remove admin' : 'Make admin')}
                  >
                    {isToggling
                      ? <span className="spinner" style={{ width: 12, height: 12 }} />
                      : u.is_admin ? <><Icon name="check" size={12} /> Admin</> : 'Set admin'
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && adminCount === 0 && (
        <div className="card-soft" style={{ marginTop: 20, padding: '16px 20px' }}>
          <b>No admins yet.</b> To set the first admin, run:
          <code style={{ display: 'block', marginTop: 8, fontSize: 13, background: 'var(--paper-2)', padding: '8px 12px', borderRadius: 8 }}>
            UPDATE users SET is_admin = true WHERE email = 'your@email.com';
          </code>
        </div>
      )}
    </>
  );
}

// ── Tab: Vocabulary ──────────────────────────────────────────────────────────
function VocabTab({ stats }) {
  if (!stats) return <div className="center muted" style={{ padding: 48 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>;
  const v = stats.vocab;

  return (
    <>
      <SectionTitle>Most saved words</SectionTitle>
      <SimpleTable
        headers={[{ label: 'Word', width: '2fr' }, { label: 'Saves', width: '1fr' }]}
        rows={(v.top_saved_words || []).map(w => [w.text, w.count.toLocaleString()])}
      />

      <SectionTitle>Most failed review words</SectionTitle>
      <SimpleTable
        headers={[
          { label: 'Word', width: '2fr' },
          { label: 'Accuracy', width: '1fr' },
          { label: 'Reviews', width: '1fr' },
        ]}
        rows={(v.top_failed_words || []).map(w => [
          w.text,
          (w.accuracy_rate * 100).toFixed(1) + '%',
          w.total_reviews.toLocaleString(),
        ])}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 28 }}>
        <div>
          <SectionTitle>CEFR distribution</SectionTitle>
          <SimpleTable
            headers={[{ label: 'Level', width: '1fr' }, { label: 'Words', width: '1fr' }]}
            rows={(v.cefr_distribution || []).map(b => [b.level.toUpperCase(), b.count.toLocaleString()])}
          />
        </div>
        <div>
          <SectionTitle>Context source</SectionTitle>
          <SimpleTable
            headers={[{ label: 'Source', width: '1fr' }, { label: 'Words', width: '1fr' }]}
            rows={(v.source_distribution || []).map(b => [b.source, b.count.toLocaleString()])}
          />
        </div>
      </div>
    </>
  );
}

// ── Tab: AI / Cost ───────────────────────────────────────────────────────────
function AITab({ stats }) {
  if (!stats) return <div className="center muted" style={{ padding: 48 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>;
  const ai = stats.ai;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Pending jobs"   value={ai.pending_jobs.toLocaleString()} sub="queue backlog" />
        <StatCard label="Failed jobs"    value={ai.failed_jobs.toLocaleString()}  sub="need attention" accent={ai.failed_jobs > 0} />
        <StatCard label="Done jobs"      value={ai.done_jobs.toLocaleString()}    sub="completed" />
        <StatCard label="Total jobs"     value={ai.total_jobs.toLocaleString()}   sub="all time" />
      </div>

      {ai.failed_jobs > 0 && (
        <div style={{
          marginTop: 24, padding: '14px 20px',
          background: 'var(--rose-soft, #fff1f2)',
          borderRadius: 12, color: 'var(--rose, #f43f5e)',
          fontSize: 14,
        }}>
          <b>{ai.failed_jobs} failed job{ai.failed_jobs !== 1 ? 's' : ''}</b> in the AI queue.
          These are words that could not be processed after max retries.
        </div>
      )}

      {ai.pending_jobs === 0 && ai.failed_jobs === 0 && (
        <div style={{ marginTop: 24, padding: '14px 20px', background: 'var(--paper-2)', borderRadius: 12, fontSize: 14, color: 'var(--ink-mute)' }}>
          AI queue is clear — all jobs processed.
        </div>
      )}
    </>
  );
}

// ── Tab: Reviews ─────────────────────────────────────────────────────────────
function ReviewsTab({ stats }) {
  if (!stats) return <div className="center muted" style={{ padding: 48 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>;
  const rv = stats.reviews;

  return (
    <>
      <SectionTitle>Review completion rate</SectionTitle>
      <div className="card" style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <Pct value={rv.completion_rate} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Words reviewed at least once</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            % of all saved words that have entered the review queue
          </div>
        </div>
      </div>

      <SectionTitle>Review retention</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '24px 28px', textAlign: 'center' }}>
          <div className="kicker">Day 1</div>
          <div style={{ marginTop: 8 }}><Pct value={rv.d1_retention} /></div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>reviewed within 2 days of signup</div>
        </div>
        <div className="card" style={{ padding: '24px 28px', textAlign: 'center' }}>
          <div className="kicker">Day 7</div>
          <div style={{ marginTop: 8 }}><Pct value={rv.d7_retention} /></div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>reviewed within 8 days of signup</div>
        </div>
        <div className="card" style={{ padding: '24px 28px', textAlign: 'center' }}>
          <div className="kicker">Day 30</div>
          <div style={{ marginTop: 8 }}><Pct value={rv.d30_retention} /></div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>reviewed within 31 days of signup</div>
        </div>
      </div>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Admin({ setScreen }) {
  const { user: me } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Users tab state
  const [users, setUsers]     = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError]     = useState('');
  const [search, setSearch]   = useState('');
  const [toggling, setToggling] = useState(null);

  // Stats state
  const [stats, setStats]         = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    listUsers()
      .then(data => setUsers(data.users || []))
      .catch(e => setUsersError(e.message))
      .finally(() => setLoadingUsers(false));

    getStats()
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  const handleToggle = async (userId, currentIsAdmin) => {
    setToggling(userId);
    try {
      await toggleAdmin(userId, !currentIsAdmin);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u));
    } catch (e) {
      alert(e.message);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="canvas fade-in" style={{ maxWidth: 960 }}>
      <div className="page-header">
        <div>
          <div className="kicker">Admin panel</div>
          <h1 style={{ marginTop: 8 }}>Dashboard</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '1.5px solid var(--paper-edge)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px',
              fontSize: 14, fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--accent)' : 'var(--ink-mute)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1.5,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && <DashboardTab stats={loadingStats ? null : stats} />}
      {activeTab === 'Users' && (
        <UsersTab
          users={users} loading={loadingUsers} error={usersError}
          search={search} setSearch={setSearch}
          me={me} toggling={toggling} handleToggle={handleToggle}
        />
      )}
      {activeTab === 'Vocabulary' && <VocabTab stats={loadingStats ? null : stats} />}
      {activeTab === 'AI'         && <AITab    stats={loadingStats ? null : stats} />}
      {activeTab === 'Reviews'    && <ReviewsTab stats={loadingStats ? null : stats} />}
    </div>
  );
}
