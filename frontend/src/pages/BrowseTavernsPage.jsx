import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

// Browse a list of public taverns. Includes a search box and surfaces
// the owner's level, greeting, piece count, and wave count so visitors
// can pick somewhere interesting to drop into.

export default function BrowseTavernsPage() {
  const [taverns, setTaverns] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = async (query = '') => {
    setLoading(true);
    try {
      const data = await api.tavern.browse(query);
      setTaverns(data);
      setErr(null);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(''); }, []);

  // Debounce search by 250ms so typing isn't spammy.
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: 0, fontSize: 22 }}>
          🗺 Browse Taverns
        </h2>
        <Link to="/tavern" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
          ← My Tavern
        </Link>
      </header>

      <input
        placeholder="Search by username..."
        value={q} onChange={e => setQ(e.target.value)}
        style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          color: 'var(--text)', fontSize: 14,
        }}
      />

      {err && <div style={{ color: '#fca5a5', fontSize: 12 }}>{err}</div>}
      {loading && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>}

      {!loading && taverns.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>🍺</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            No public taverns found{q ? ' matching that name.' : ' yet.'}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {taverns.map(t => (
          <Link key={t.id} to={`/tavern/${encodeURIComponent(t.username)}`}
            className="card"
            style={{
              padding: 12, textDecoration: 'none', color: 'var(--text)',
              display: 'flex', flexDirection: 'column', gap: 4,
              transition: 'transform 0.15s, border-color 0.15s',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{t.username}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lv {t.level}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)',
              fontStyle: 'italic',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              "{t.greeting || 'Welcome!'}"
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              🪑 {t.piece_count} piece{t.piece_count === 1 ? '' : 's'} · 👋 {t.wave_count} wave{t.wave_count === 1 ? '' : 's'}
              {t.privacy === 'friends' && <> · <span style={{ color: '#a5b4fc' }}>friends only</span></>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
