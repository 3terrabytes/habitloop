import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TavernScene from '../components/TavernScene';

// ── Tavern page ─────────────────────────────────────────────────────
// Three modes:
//   1. /tavern             — own tavern, full editor + settings + guestbook
//   2. /tavern/:username   — visit, read-only + wave button + leave message
//   3. Empty state         — bootstrapped server-side on first load
//
// Editor flow (own tavern only):
//   - Click "Decorate" to enter edit mode.
//   - Click a furniture in the right-side tray. Tiles light up.
//   - Click a tile. The piece snaps to that tile (server validates bounds).
//   - Click an existing placement to either remove it or assign a mount.
//   - Click "Done" to leave edit mode.
//
// All mutations refresh the tavern state via the route response.

const RARITY = {
  common: '#94a3b8', rare: '#60a5fa', epic: '#a78bfa',
  legendary: '#fde047', mythic: '#f0abfc',
};

export default function TavernPage() {
  const { username } = useParams(); // undefined when viewing own
  const { user } = useAuth();
  const isOwn = !username || (user && user.username && username.toLowerCase() === user.username.toLowerCase());
  return isOwn ? <OwnTavern /> : <VisitTavern username={username} />;
}

// ── Own tavern ─────────────────────────────────────────────────────
function OwnTavern() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState(null); // id of piece pending placement
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [waveBurst, setWaveBurst] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.tavern.me()); }
    catch (err) { showToast(err.message, 'error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const showToast = (msg, kind = 'info') => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  };

  // When in edit mode and a furniture is selected, clicking a tile places.
  const onTileClick = async (x, y) => {
    if (!editing || !selectedFurniture) return;
    try {
      const fresh = await api.tavern.place({
        furniture_id: selectedFurniture, tile_x: x, tile_y: y,
      });
      setData(fresh);
      showToast(`Placed at (${x}, ${y})`);
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Clicking an existing placement in edit mode removes it. Outside edit
  // mode, clicking a mount opens the mount-item picker.
  const onPlacementClick = async (p) => {
    if (editing) {
      try {
        const fresh = await api.tavern.unplace({ tile_x: p.tile_x, tile_y: p.tile_y });
        setData(fresh);
        showToast(`Removed ${p.furniture.name}`);
      } catch (err) { showToast(err.message, 'error'); }
    }
  };

  const settings = data?.settings || {};
  const placements = data?.placements || [];
  const ownedFurniture = useMemo(() => {
    if (!data) return [];
    // Resolve owned ids → furniture catalog from any placement that uses
    // them, plus we synthesise minimal records by recombining from owned
    // list + placements (catalog itself isn't sent — we already have
    // every needed bit in placements + the catalog ids in `owned`).
    // Simpler: only show what's NOT currently placed, to keep the tray clean.
    const placedIds = new Set(placements.map(p => p.furniture.id));
    return (data.owned || []).filter(id => !placedIds.has(id));
  }, [data, placements]);

  const selectedFurnitureSize = useMemo(() => {
    if (!selectedFurniture || !data) return null;
    // We may not have the size in client memory because backend only sends
    // placements' furniture details. Fall back to 1x1 — server will validate
    // bounds when actually placing.
    return { w: 1, h: 1 };
  }, [selectedFurniture, data]);

  if (!data) {
    return <div className="card" style={{ padding: 24, textAlign: 'center' }}>Loading your tavern...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: 0, fontSize: 22 }}>
          🍺 Your Tavern
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" style={btn} onClick={() => setShowSettings(s => !s)}>⚙️ Settings</button>
          <button className="btn btn-primary" style={btn}
            onClick={() => { setEditing(e => !e); setSelectedFurniture(null); }}>
            {editing ? 'Done' : '🛠 Decorate'}
          </button>
        </div>
      </header>

      {toast && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 13,
          background: toast.kind === 'error' ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)',
          color: toast.kind === 'error' ? '#fca5a5' : '#86efac',
        }}>{toast.msg}</div>
      )}

      {showSettings && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
            ROOM SETTINGS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <SettingControl label="Privacy" type="select" value={settings.privacy}
              options={[
                { v: 'public',  label: 'Public — anyone can visit' },
                { v: 'friends', label: 'Friends only' },
                { v: 'private', label: 'Private — only you' },
              ]}
              onChange={async (v) => setData(await api.tavern.settings({ privacy: v }))} />
            <SettingControl label="Wall colour" type="color" value={settings.wall_color}
              onChange={async (v) => setData(await api.tavern.settings({ wall_color: v }))} />
            <SettingControl label="Floor colour" type="color" value={settings.floor_color}
              onChange={async (v) => setData(await api.tavern.settings({ floor_color: v }))} />
          </div>
        </div>
      )}

      <TavernScene
        placements={placements}
        settings={settings}
        owner={data.owner}
        editing={editing}
        selectedTile={null}
        onTileClick={onTileClick}
        onPlacementClick={onPlacementClick}
        highlightedFurnitureSize={selectedFurnitureSize}
      />

      {editing && (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
            FURNITURE TRAY
          </div>
          {ownedFurniture.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              All your furniture is already placed.{' '}
              <Link to="/shop" style={{ color: 'var(--gold)' }}>Visit the shop</Link> to buy more.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ownedFurniture.map(id => (
                <button key={id} onClick={() => setSelectedFurniture(id)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 12,
                    background: selectedFurniture === id ? 'var(--bg3)' : 'var(--bg2)',
                    border: `1px solid ${selectedFurniture === id ? 'var(--gold)' : 'var(--border)'}`,
                    cursor: 'pointer', color: 'var(--text)',
                  }}>
                  {id.replace('fn_', '').replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Tip: pick a piece from the tray, then click a tile to place. Click placed pieces to remove.
          </div>
        </div>
      )}

      <Guestbook data={data} isOwn={true} onPost={null} onWave={null} />
    </div>
  );
}

// ── Visiting a friend's tavern ─────────────────────────────────────
function VisitTavern({ username }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [waving, setWaving] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.tavern.visit(username)); setErr(null); }
    catch (e) { setErr(e.message); }
  }, [username]);
  useEffect(() => { load(); }, [load]);

  const onWave = async () => {
    if (waving) return;
    setWaving(true);
    try {
      const res = await api.tavern.wave(username);
      setData(d => d ? { ...d, wave_count: res.wave_count } : d);
    } catch (e) { /* show via err? skip */ }
    finally { setWaving(false); }
  };

  const onPost = async (message) => {
    try {
      const fresh = await api.tavern.guestbook(username, { message });
      setData(fresh);
      return null;
    } catch (e) { return e.message; }
  };

  if (err) {
    return <div className="card" style={{ padding: 24, textAlign: 'center', color: '#fca5a5' }}>{err}</div>;
  }
  if (!data) {
    return <div className="card" style={{ padding: 24, textAlign: 'center' }}>Knocking on the door...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: 0, fontSize: 22 }}>
          🍺 {data.owner.username}'s Tavern
        </h2>
        <button className="btn btn-primary" style={btn} disabled={waving} onClick={onWave}>
          {waving ? '...' : '👋 Wave'}
        </button>
      </header>

      <TavernScene
        placements={data.placements}
        settings={data.settings}
        owner={data.owner}
      />

      <Guestbook data={data} isOwn={false} onPost={onPost} onWave={onWave} />
    </div>
  );
}

// ── Guestbook ──────────────────────────────────────────────────────
function Guestbook({ data, isOwn, onPost, onWave }) {
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const res = await onPost(draft.trim());
    if (res) setErr(res);
    else { setDraft(''); setErr(null); }
    setBusy(false);
  };

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          GUESTBOOK
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>👋 {data.wave_count || 0} waves</div>
      </div>

      {!isOwn && onPost && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="Leave a note..." maxLength={140}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13 }} />
          <button className="btn btn-primary" style={btn} disabled={busy || !draft.trim()} onClick={submit}>
            Sign
          </button>
        </div>
      )}
      {err && <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 8 }}>{err}</div>}

      {(data.guestbook || []).length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 2px' }}>
          {isOwn ? 'No visitors yet. Share your tavern!' : 'Be the first to sign.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.guestbook.map(g => (
            <div key={g.id} style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--bg2)', fontSize: 12 }}>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{g.visitor_name}</span>{' '}
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                · {new Date(g.created_at).toLocaleDateString()}
              </span>
              <div style={{ marginTop: 2 }}>{g.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingControl({ label, type, value, options, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {type === 'select' && (
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13 }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      )}
      {type === 'color' && (
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', height: 32, padding: 0, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }} />
      )}
    </div>
  );
}

const btn = { padding: '6px 14px', fontSize: 12 };
