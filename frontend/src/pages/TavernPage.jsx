import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TavernScene, { TILE, WORLD_COLS, ROWS, WORLD_W, VIEW_W, HORIZON, FLOOR_H } from '../components/TavernScene';
import FurnitureSprite from '../components/FurnitureSprite';
import useTavernPresence from '../hooks/useTavernPresence';

// ── TavernPage ─────────────────────────────────────────────────────
// Walkable, multi-visitor tavern with a panning camera, placement ghost,
// rotation, and a custom-art furniture tray.
//
// Routes:
//   /tavern             — own tavern (full editor)
//   /tavern/:username   — visit (walk around, wave, sign guestbook)
//   /tavern/browse      — browse list of public taverns (handled by BrowseTavernsPage,
//                         this file ignores it)

const PLAYER_SPEED = 130;      // floor pixels per second
const CAMERA_LERP  = 0.18;     // 0..1 — how aggressively the camera follows
const PLAYER_BBOX  = 12;       // half-width of collision hitbox

export default function TavernPage() {
  const { username } = useParams();
  const { user } = useAuth();
  const isOwn = !username || (user && user.username && username.toLowerCase() === user.username.toLowerCase());
  return isOwn ? <OwnTavern /> : <VisitTavern username={username} />;
}

// ── Own tavern ─────────────────────────────────────────────────────
function OwnTavern() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [furnitureCatalog, setFurnitureCatalog] = useState([]);
  const [placingFurniture, setPlacingFurniture] = useState(null); // catalog entry
  const [ghostTile, setGhostTile] = useState(null);               // { x, y } | null
  const [ghostRotation, setGhostRotation] = useState(0);
  const [pieceMenu, setPieceMenu] = useState(null);               // selected placement for action menu
  const [interactNote, setInteractNote] = useState(null);         // floating tooltip { text, expiresAt }

  const showToast = (msg, kind = 'info') => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  };

  const load = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([
        api.tavern.me(),
        api.avatar.furniture().catch(() => ({ items: [] })),
      ]);
      setData(d);
      setFurnitureCatalog(f.items || []);
    } catch (err) { showToast(err.message, 'error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // The page is its own tavern, so the WS owner is the logged-in user.
  const ownerUsername = user?.username || null;
  const { peers, connected, sendMove } = useTavernPresence(ownerUsername);

  const tavernPlay = useTavernPlayer({
    placements: data?.placements || [],
    editing,
    placingFurniture,
    onMove: sendMove,
  });

  // R rotates the ghost while placing.
  useEffect(() => {
    if (!placingFurniture) return undefined;
    const onKey = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setGhostRotation(r => (r + 90) % 360);
      } else if (e.key === 'Escape') {
        setPlacingFurniture(null);
        setGhostTile(null);
        setGhostRotation(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placingFurniture]);

  const onTileClick = async (x, y) => {
    // Click during placement = commit; click outside placement = nothing
    if (!placingFurniture) return;
    try {
      const fresh = await api.tavern.place({
        furniture_id: placingFurniture.id,
        tile_x: x, tile_y: y,
        rotation: ghostRotation,
      });
      setData(fresh);
      showToast(`Placed ${placingFurniture.name}`);
      setPlacingFurniture(null);
      setGhostTile(null);
      setGhostRotation(0);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const onPlacementClick = (p) => {
    if (placingFurniture) return; // ignore in placement mode
    if (editing) {
      setPieceMenu(p);
    } else {
      // Out of edit mode: trigger interact-flavor text near the player.
      const note = FURNITURE_INTERACT[p.furniture.id] || `You inspect the ${p.furniture.name}.`;
      setInteractNote({ text: note, expiresAt: Date.now() + 1800 });
      setTimeout(() => setInteractNote(null), 1800);
    }
  };

  const rotatePlaced = async (p) => {
    try {
      const fresh = await api.tavern.place({
        furniture_id: p.furniture.id,
        tile_x: p.tile_x, tile_y: p.tile_y,
        rotation: ((p.rotation || 0) + 90) % 360,
        mounted_item: p.mounted_item?.id || null,
      });
      setData(fresh);
      setPieceMenu(null);
    } catch (err) { showToast(err.message, 'error'); }
  };
  const removePlaced = async (p) => {
    try {
      const fresh = await api.tavern.unplace(p.tile_x, p.tile_y);
      setData(fresh);
      setPieceMenu(null);
      showToast(`Removed ${p.furniture.name}`);
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Visitor list = WS peers + local player (only if we have profile data).
  const visitors = useMemo(() => {
    const list = [];
    if (user) {
      list.push({
        userId: user.id,
        username: user.username,
        level: user.level,
        appearance: user,
        equipped: data?.owner?.equipped || {},
        x: tavernPlay.pos.x,
        y: tavernPlay.pos.y,
        facing: tavernPlay.facing,
        moving: tavernPlay.moving,
      });
    }
    for (const p of peers.values()) list.push(p);
    return list;
  }, [user, peers, tavernPlay.pos.x, tavernPlay.pos.y, tavernPlay.facing, tavernPlay.moving, data]);

  if (!data) {
    return <div className="card" style={{ padding: 24, textAlign: 'center' }}>Loading your tavern...</div>;
  }

  const settings = data.settings || {};
  const placements = data.placements || [];

  // Owned-but-unplaced furniture for the tray.
  const placedIds = new Set(placements.map(p => p.furniture.id));
  const trayFurniture = (data.owned || [])
    .filter(id => !placedIds.has(id))
    .map(id => furnitureCatalog.find(f => f.id === id))
    .filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: 0, fontSize: 22 }}>
          🍺 Your Tavern
        </h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: connected ? '#86efac' : 'var(--text-muted)' }}>
            {connected ? '● Live' : '○ Connecting...'}
          </span>
          <Link to="/tavern/browse" className="btn btn-ghost" style={btn}>🗺 Browse</Link>
          <button className="btn btn-ghost" style={btn} onClick={() => setShowSettings(s => !s)}>⚙️ Settings</button>
          <button className="btn btn-primary" style={btn}
            onClick={() => {
              setEditing(e => !e);
              setPlacingFurniture(null); setGhostTile(null); setPieceMenu(null);
            }}>
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
            <SettingControl label="Greeting" type="text" value={settings.greeting}
              onChange={async (v) => setData(await api.tavern.settings({ greeting: v }))} />
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <TavernScene
          placements={placements}
          settings={settings}
          owner={data.owner}
          visitors={visitors}
          localUserId={user?.id}
          cameraX={tavernPlay.cameraX}
          editing={editing}
          ghost={placingFurniture && ghostTile
            ? { furniture: placingFurniture, tile_x: ghostTile.x, tile_y: ghostTile.y, rotation: ghostRotation }
            : null}
          onTileClick={onTileClick}
          onPlacementClick={onPlacementClick}
          onMouseTile={(x, y) => placingFurniture && setGhostTile({ x, y })}
          speech={interactNote && user ? {
            userId: user.id,
            text: interactNote.text,
          } : null}
        />
        {/* Mobile / no-keyboard D-pad */}
        <DPad onDir={tavernPlay.touchDir} />

        {/* Placement HUD */}
        {placingFurniture && (
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)', border: '1px solid var(--gold)',
            padding: '6px 12px', borderRadius: 8, fontSize: 12, color: '#fde047',
            display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <span>Placing <b>{placingFurniture.name}</b></span>
            <button onClick={() => setGhostRotation(r => (r + 90) % 360)}
              style={miniBtn}>↻ Rotate (R)</button>
            <button onClick={() => { setPlacingFurniture(null); setGhostTile(null); setGhostRotation(0); }}
              style={miniBtn}>Cancel (Esc)</button>
          </div>
        )}

        {/* Per-piece action menu (rotate / remove) */}
        {pieceMenu && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.9)', border: '1px solid var(--gold)',
            padding: 10, borderRadius: 8, fontSize: 12, minWidth: 160,
          }}>
            <div style={{ fontWeight: 600, color: '#fde047', marginBottom: 6 }}>
              {pieceMenu.furniture.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button style={miniBtn} onClick={() => rotatePlaced(pieceMenu)}>↻ Rotate</button>
              <button style={miniBtn} onClick={() => removePlaced(pieceMenu)}>🗑 Remove</button>
              <button style={miniBtn} onClick={() => setPieceMenu(null)}>Close</button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
            FURNITURE TRAY ({trayFurniture.length})
          </div>
          {trayFurniture.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              All your furniture is already placed.{' '}
              <Link to="/shop" style={{ color: 'var(--gold)' }}>Visit the shop</Link> to buy more.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
              {trayFurniture.map(f => (
                <button key={f.id}
                  onClick={() => {
                    setPlacingFurniture(f);
                    setGhostRotation(0);
                  }}
                  title={f.name}
                  style={{
                    padding: 6, borderRadius: 8, fontSize: 10,
                    background: placingFurniture?.id === f.id ? 'var(--bg3)' : 'var(--bg2)',
                    border: `1px solid ${placingFurniture?.id === f.id ? 'var(--gold)' : 'var(--border)'}`,
                    cursor: 'pointer', color: 'var(--text)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                  <FurnitureSprite id={f.id} size={f.size} rarity={f.rarity}
                    width={64} height={64} />
                  <span style={{
                    fontSize: 10, lineHeight: 1.2, textAlign: 'center',
                    color: rarityColor(f.rarity), fontWeight: 600,
                  }}>{f.name}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Tip: tap a piece, then click a tile to place. <b>R</b> rotates. Click a placed piece to rotate or remove.
          </div>
        </div>
      )}

      {!editing && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Move with <b>WASD</b> or arrow keys. Click any piece to inspect.
          {peers.size > 0 && <> · <b>{peers.size}</b> guest{peers.size === 1 ? '' : 's'} in your tavern</>}
        </div>
      )}

      <Guestbook data={data} isOwn={true} onPost={null} onWave={null} />
    </div>
  );
}

// ── Visiting another tavern ─────────────────────────────────────────
function VisitTavern({ username }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [waving, setWaving] = useState(false);
  const [waveBurst, setWaveBurst] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.tavern.visit(username)); setErr(null); }
    catch (e) { setErr(e.message); }
  }, [username]);
  useEffect(() => { load(); }, [load]);

  const { peers, connected, sendMove } = useTavernPresence(username);

  const tavernPlay = useTavernPlayer({
    placements: data?.placements || [],
    editing: false,
    placingFurniture: null,
    onMove: sendMove,
    spawn: { x: 30, y: HORIZON + FLOOR_H - 36 }, // at the doorway
  });

  const onWave = async () => {
    if (waving) return;
    setWaving(true);
    try {
      const res = await api.tavern.wave(username);
      setData(d => d ? { ...d, wave_count: res.wave_count } : d);
      setWaveBurst(true);
      setTimeout(() => setWaveBurst(false), 1400);
    } catch (e) { /* ignore */ }
    finally { setWaving(false); }
  };
  const onPost = async (message) => {
    try {
      const fresh = await api.tavern.guestbook(username, message);
      setData(fresh);
      return null;
    } catch (e) { return e.message; }
  };

  const visitors = useMemo(() => {
    const list = [];
    if (user) {
      list.push({
        userId: user.id,
        username: user.username,
        level: user.level,
        appearance: user,
        equipped: {},
        x: tavernPlay.pos.x,
        y: tavernPlay.pos.y,
        facing: tavernPlay.facing,
        moving: tavernPlay.moving,
      });
    }
    for (const p of peers.values()) list.push(p);
    return list;
  }, [user, peers, tavernPlay.pos.x, tavernPlay.pos.y, tavernPlay.facing, tavernPlay.moving]);

  if (err) {
    return <div className="card" style={{ padding: 24, textAlign: 'center', color: '#fca5a5' }}>{err}</div>;
  }
  if (!data) {
    return <div className="card" style={{ padding: 24, textAlign: 'center' }}>Knocking on the door...</div>;
  }

  // Owner speech bubble — shows their custom greeting for 4 seconds on load.
  const showGreeting = data.settings?.greeting && !waveBurst;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: 0, fontSize: 22 }}>
          🍺 {data.owner.username}'s Tavern
        </h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: connected ? '#86efac' : 'var(--text-muted)' }}>
            {connected ? `● Live · ${peers.size} other${peers.size === 1 ? '' : 's'} here` : '○ Connecting...'}
          </span>
          <Link to="/tavern/browse" className="btn btn-ghost" style={btn}>🗺 Browse</Link>
          <button className="btn btn-primary" style={btn} disabled={waving} onClick={onWave}>
            {waving ? '...' : '👋 Wave'}
          </button>
        </div>
      </header>

      <div style={{ position: 'relative' }}>
        <TavernScene
          placements={data.placements}
          settings={data.settings}
          owner={{ ...data.owner, userId: data.owner.id }}
          visitors={visitors}
          localUserId={user?.id}
          cameraX={tavernPlay.cameraX}
          speech={showGreeting && data.owner ? {
            userId: data.owner.id,
            text: data.settings.greeting,
          } : (waveBurst && user ? { userId: user.id, text: '👋' } : null)}
        />
        <DPad onDir={tavernPlay.touchDir} />
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        Move with <b>WASD</b> or arrow keys. Click any piece to inspect.
      </div>

      <Guestbook data={data} isOwn={false} onPost={onPost} onWave={onWave} />
    </div>
  );
}

// ── Player movement + camera hook ──────────────────────────────────
// Owns the local player position in world coords + handles input + camera
// + tile collision. Calls onMove(x, y, facing) ~10/sec.
function useTavernPlayer({ placements, editing, placingFurniture, onMove, spawn }) {
  const initial = spawn || { x: WORLD_W - 200, y: HORIZON + FLOOR_H - 36 };
  const [pos, setPos] = useState(initial);
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [cameraX, setCameraX] = useState(Math.max(0, initial.x - VIEW_W / 2));
  const heldRef = useRef(new Set());
  const touchRef = useRef({ x: 0, y: 0 }); // -1/0/1 each
  const lastTickRef = useRef(performance.now());
  const movingClearRef = useRef(0); // timestamp until which `moving` stays true after last input
  const posRef = useRef(initial);
  const facingRef = useRef(1);
  const movingRef = useRef(false);
  const cameraXRef = useRef(cameraX);

  // Build collision grid from placements.
  const occupied = useMemo(() => {
    const set = new Set();
    for (const p of placements) {
      const w = p.furniture?.size?.w || 1;
      const h = p.furniture?.size?.h || 1;
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          set.add(`${p.tile_x + dx},${p.tile_y + dy}`);
        }
      }
    }
    return set;
  }, [placements]);

  const canStand = useCallback((x, y) => {
    // Clamp to floor bounds
    if (x - PLAYER_BBOX < 0 || x + PLAYER_BBOX > WORLD_W) return false;
    if (y < HORIZON + 8 || y > HORIZON + FLOOR_H - 2) return false;
    // Check the 4 corners of the hitbox against tile occupancy.
    for (const [dx, dy] of [[-PLAYER_BBOX, -2], [PLAYER_BBOX, -2], [-PLAYER_BBOX, 2], [PLAYER_BBOX, 2]]) {
      const tx = Math.floor((x + dx) / TILE);
      const ty = Math.floor((y + dy - HORIZON) / TILE);
      if (occupied.has(`${tx},${ty}`)) return false;
    }
    return true;
  }, [occupied]);

  // Keyboard listeners — typing in a text field should NOT move the player.
  useEffect(() => {
    const onDown = (e) => {
      if (isTyping(e.target)) return;
      heldRef.current.add(normalizeKey(e.key));
    };
    const onUp = (e) => { heldRef.current.delete(normalizeKey(e.key)); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // RAF physics loop.
  useEffect(() => {
    let raf;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      const held = heldRef.current;
      const td = touchRef.current;
      let vx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0) + td.x;
      let vy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0) + td.y;
      const len = Math.hypot(vx, vy);
      if (len > 1) { vx /= len; vy /= len; }

      if (vx !== 0 || vy !== 0) {
        const nextX = posRef.current.x + vx * PLAYER_SPEED * dt;
        const nextY = posRef.current.y + vy * PLAYER_SPEED * dt;
        // Axis-by-axis so sliding along walls works.
        let newX = posRef.current.x;
        let newY = posRef.current.y;
        if (canStand(nextX, posRef.current.y)) newX = nextX;
        if (canStand(newX, nextY))           newY = nextY;
        posRef.current = { x: newX, y: newY };
        if (vx !== 0) {
          facingRef.current = vx > 0 ? 1 : -1;
          setFacing(facingRef.current);
        }
        setPos({ x: newX, y: newY });
        movingClearRef.current = now + 140;
        if (!movingRef.current) { movingRef.current = true; setMoving(true); }
        if (onMove) onMove(newX, newY, facingRef.current, true);
      } else if (movingRef.current && now >= movingClearRef.current) {
        movingRef.current = false; setMoving(false);
        if (onMove) onMove(posRef.current.x, posRef.current.y, facingRef.current, false);
      }

      // Camera lerps toward player x.
      const target = clamp(posRef.current.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
      cameraXRef.current += (target - cameraXRef.current) * CAMERA_LERP;
      setCameraX(cameraXRef.current);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canStand, onMove]);

  const touchDir = (dx, dy) => { touchRef.current = { x: dx, y: dy }; };

  return { pos, facing, moving, cameraX, touchDir };
}

// ── D-pad ─────────────────────────────────────────────────────────
function DPad({ onDir }) {
  const press = (dx, dy) => (e) => { e.preventDefault(); onDir(dx, dy); };
  const release = (e) => { e.preventDefault(); onDir(0, 0); };
  const btnStyle = {
    width: 44, height: 44, borderRadius: 8,
    background: 'rgba(0,0,0,0.7)', border: '1px solid var(--gold)',
    color: '#fde047', fontSize: 18, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
  };
  // Only render if pointer is coarse (touch).
  if (typeof window !== 'undefined' && !window.matchMedia?.('(pointer: coarse)').matches) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 12, left: '50%',
      transform: 'translateX(-50%)',
      display: 'grid', gridTemplateColumns: '44px 44px 44px',
      gap: 4, opacity: 0.85, zIndex: 5,
    }}>
      <div />
      <button style={btnStyle} onPointerDown={press(0,-1)} onPointerUp={release} onPointerLeave={release}>▲</button>
      <div />
      <button style={btnStyle} onPointerDown={press(-1,0)} onPointerUp={release} onPointerLeave={release}>◀</button>
      <button style={btnStyle} onPointerDown={press(0,1)} onPointerUp={release} onPointerLeave={release}>▼</button>
      <button style={btnStyle} onPointerDown={press(1,0)} onPointerUp={release} onPointerLeave={release}>▶</button>
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
          style={input}>
          {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      )}
      {type === 'color' && (
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          style={{ ...input, height: 32, padding: 0, cursor: 'pointer' }} />
      )}
      {type === 'text' && (
        <input value={value || ''} maxLength={140}
          onBlur={e => e.target.value !== value && onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          defaultValue={value || ''}
          style={input} />
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────
function normalizeKey(k) {
  switch (k) {
    case 'ArrowUp': case 'w': case 'W': return 'up';
    case 'ArrowDown': case 's': case 'S': return 'down';
    case 'ArrowLeft': case 'a': case 'A': return 'left';
    case 'ArrowRight': case 'd': case 'D': return 'right';
    default: return k;
  }
}
function isTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rarityColor(r) {
  return { common: '#94a3b8', rare: '#60a5fa', epic: '#a78bfa',
           legendary: '#fde047', mythic: '#f0abfc' }[r] || '#94a3b8';
}

const btn = { padding: '6px 14px', fontSize: 12 };
const miniBtn = { padding: '4px 10px', fontSize: 11, borderRadius: 6,
  background: 'var(--bg2)', border: '1px solid var(--border)',
  color: 'var(--text)', cursor: 'pointer' };
const input = { width: '100%', padding: '6px 8px', borderRadius: 6,
  background: 'var(--bg2)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 13 };

// ── Interact flavor text ───────────────────────────────────────────
const FURNITURE_INTERACT = {
  fn_simple_chair:  'You sit on the chair. Cozy.',
  fn_padded_chair:  'The cushion sighs as you sit.',
  fn_gilded_throne: 'You sit on the throne. You feel important.',
  fn_levitating:    'The throne hovers expectantly.',
  fn_void_throne:   'A whisper from the void greets you.',
  fn_fireplace:     'The fireplace crackles warmly.',
  fn_ornate_fp:     'The flames dance in patterns you almost recognize.',
  fn_hearthstone:   'Ancient runes glow as you approach.',
  fn_eternal_flame: 'The flame burns without fuel. It always has.',
  fn_void_portal:   'You glimpse other realms through the swirl.',
  fn_mirror_realm:  'Your reflection waves at you. You did not wave back.',
  fn_mini_dragon:   'The statue blinks. You decide not to mention it.',
  fn_tome:          'The tome turns a page on its own.',
  fn_reflection:    'The water shimmers but never ripples.',
  fn_starry_window: 'The stars wheel overhead.',
  fn_dragon_skull:  'The skull is older than the tavern itself.',
  fn_treasure_chest:'A single gold coin clinks inside.',
  fn_oak_table:     'You knock on the table. Solid.',
  fn_wine_cask:     'You sniff the cask. Aged well.',
  fn_basic_shelf:   'You skim the spines. Adventure tales, mostly.',
  fn_tall_shelf:    'Books from floors you have not reached yet.',
  fn_gilded_shelf:  'Books bound in gold. You feel rich just looking.',
  fn_wall_torch:    'The flame crackles.',
  fn_hanging_lant:  'The lantern sways gently.',
  fn_oil_lamp:      'The wick is freshly trimmed.',
  fn_crystal_lant:  'The crystal pulses with cool light.',
  fn_gem_chand:     'The chandelier scatters tiny rainbows on the floor.',
  fn_music_stand:   'A simple folk tune. Stuck in your head now.',
  fn_painting_self: 'It looks just like you. Too much like you.',
  fn_painting_myst: 'The figure was looking the other way last time.',
  fn_painting_land: 'A pleasant landscape. The clouds are moving.',
  fn_banner_mount:  'A banner from your collection.',
  fn_weapon_rack:   'You take down the weapon. You put it back.',
  fn_armor_stand:   'The armor stands proudly.',
  fn_trophy_stand:  'Your companion looks at peace in the dome.',
};
