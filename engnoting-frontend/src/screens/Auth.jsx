import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icons.jsx';

export default function Auth() {
  const { login, register, googleLogin } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setError('');
          setLoading(true);
          try {
            await googleLogin(response.credential);
          } catch (err) {
            setError(err.message || 'Google sign-in failed.');
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGoogle();
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-grid">
      <div className="auth-side">
        <div className="row" style={{ gap: 12 }}>
          <div className="brand-mark" style={{ background: '#fff', color: 'var(--accent-deep)', boxShadow: 'none' }}>
            e
          </div>
          <div style={{ color: '#fff', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
            Eng·noting
          </div>
        </div>

        <div>
          <div className="quote">Make every word yours.</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, marginTop: 18, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'oklch(1 0 0 / 0.78)', fontWeight: 700 }}>
            — Build your vocabulary, one word at a time
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, color: 'oklch(1 0 0 / 0.86)', fontSize: 13.5 }}>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34, color: '#fff', letterSpacing: '-0.025em' }}>9 min</div>
            a day, that's all
          </div>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34, color: '#fff', letterSpacing: '-0.025em' }}>74%</div>
            recall after 30 days
          </div>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34, color: '#fff', letterSpacing: '-0.025em' }}>0</div>
            apps to install
          </div>
        </div>
      </div>

      <div className="auth-form">
        <div className="kicker">{mode === 'signin' ? 'Welcome back' : 'Hello there'}</div>
        <h1 style={{ fontSize: 44, marginTop: 8, letterSpacing: '-0.028em', fontWeight: 800 }}>
          {mode === 'signin' ? 'Good to see you again.' : "Let's start your notebook."}
        </h1>

        <form onSubmit={submit} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--rose-soft)', borderRadius: 12, color: 'var(--rose)', fontSize: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ justifyContent: 'center', padding: '12px 16px', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Please wait…</>
            ) : (
              <>{mode === 'signin' ? 'Sign in' : 'Create account'} <Icon name="arrow" size={14} /></>
            )}
          </button>

          <div className="muted center" style={{ fontSize: 13.5, marginTop: 8 }}>
            {mode === 'signin' ? (
              <>New here?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(''); }}>
                  Start a notebook
                </a>.
              </>
            ) : (
              <>Already have one?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); setError(''); }}>
                  Sign in
                </a>.
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="muted" style={{ fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
        </form>
      </div>
    </div>
  );
}
