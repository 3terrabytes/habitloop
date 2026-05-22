import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      {/* Background stars */}
      <div style={styles.stars} aria-hidden>
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{
            ...styles.star,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
          }} />
        ))}
      </div>

      <div style={styles.card} className="animate-fade">
        <div style={styles.logo}>
          <div style={styles.logoIcon}>⚔️</div>
          <h1 style={styles.title}>Tickd</h1>
          <p style={styles.sub}>Descend. Slay. Ascend.</p>
        </div>

        <div style={styles.tabs}>
          {['login', 'register'].map(m => (
            <button
              key={m}
              style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
              onClick={() => { setMode(m); setError(''); }}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={styles.form}>
          {mode === 'register' && (
            <Field
              label="Username" type="text" placeholder="StreakMaster42"
              value={form.username}
              onChange={v => setForm(f => ({ ...f, username: v }))}
            />
          )}
          <Field
            label="Email" type="email" placeholder="hero@quest.com"
            value={form.email}
            onChange={v => setForm(f => ({ ...f, email: v }))}
          />
          <Field
            label="Password" type="password" placeholder="••••••••"
            value={form.password}
            onChange={v => setForm(f => ({ ...f, password: v }))}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            className="btn btn-gold"
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? '...' : mode === 'login' ? '⚔️ Enter the Quest' : '🌟 Begin Your Journey'}
          </button>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, type, placeholder, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
    <input
      type={type} placeholder={placeholder} value={value} required
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '12px 14px', color: 'var(--text)', fontSize: 14, outline: 'none',
        transition: 'border-color 0.15s'
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  </div>
);

const styles = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, position: 'relative', overflow: 'hidden',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(124,106,247,0.15) 0%, var(--bg) 60%)'
  },
  stars: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  star: {
    position: 'absolute', background: 'white', borderRadius: '50%',
    opacity: 0.4, animation: 'fadeIn 2s ease infinite alternate'
  },
  card: {
    width: '100%', maxWidth: 420,
    background: 'var(--bg2)', border: '1px solid var(--border-bright)',
    borderRadius: 16, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    zIndex: 1
  },
  logo: { textAlign: 'center', marginBottom: 28 },
  logoIcon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, color: 'var(--gold)', marginBottom: 6 },
  sub: { color: 'var(--text-muted)', fontSize: 14 },
  tabs: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    background: 'var(--bg3)', borderRadius: 8, padding: 4, marginBottom: 24
  },
  tab: {
    padding: '10px', borderRadius: 6, border: 'none',
    background: 'transparent', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500
  },
  tabActive: { background: 'var(--bg2)', color: 'var(--text)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  error: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13
  }
};
