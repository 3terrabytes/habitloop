// Renders a tavern room as an SVG scene with a panning camera, walkable
// avatars, multi-visitor presence, and a 50% opacity placement ghost.
//
// The world is wider than the viewport so the camera scrolls horizontally
// to follow the player. World: 24 tiles wide × 8 tiles tall. Viewport: 15
// tiles wide × 8 tall, plus a back-wall horizon strip above.
//
// All interactivity (input, placement decisions) lives in the parent. The
// scene is a pure renderer that takes pre-computed state.
//
// Props:
//   placements   — array from /tavern API
//   settings     — { wall_color, floor_color }
//   owner        — { appearance, equipped, username, level }
//   visitors     — array of { userId, username, level, appearance, equipped, x, y, facing }
//                  including the local player. The local player's userId
//                  is signalled via `localUserId`.
//   localUserId  — the userId whose avatar should be "you" (highlight ring)
//   cameraX      — current camera x in world coords (clamped by parent)
//   editing      — bool, draws the tile-grid overlay
//   ghost        — { furniture, tile_x, tile_y, rotation } | null
//                  rendered at 50% opacity at the ghost tile; click to place
//   onTileClick  — (x, y) called when a floor tile is clicked
//   onPlacementClick — (placement) called when an existing piece is clicked
//   speech       — { userId, text, expiresAt } | null
//   localHour    — 0..23 used to colour the skybox; defaults to local time
//   onMouseTile  — (x, y) called as the mouse moves across floor tiles
//                  (used by the parent to update the ghost position)

import PixelCharacter, { PetSprite } from './PixelCharacter';
import FurnitureSprite from './FurnitureSprite';

export const TILE = 32;
export const WORLD_COLS = 24;
export const ROWS = 8;
export const VIEW_COLS = 15;
export const WORLD_W = TILE * WORLD_COLS;
export const VIEW_W  = TILE * VIEW_COLS;
export const FLOOR_H = TILE * ROWS;
export const HORIZON = 96;
export const TOTAL_H = FLOOR_H + HORIZON;

const SKY = [
  { until: 5,  from: '#0b1c3a', to: '#1c1043' },
  { until: 8,  from: '#fcd34d', to: '#fb923c' },
  { until: 17, from: '#bae6fd', to: '#fef3c7' },
  { until: 20, from: '#fb923c', to: '#7c3aed' },
  { until: 24, from: '#1c1043', to: '#0b1c3a' },
];
function skyFor(hour) {
  for (const s of SKY) if (hour < s.until) return s;
  return SKY[SKY.length - 1];
}

export default function TavernScene({
  placements = [],
  settings = { wall_color: '#4a3a2a', floor_color: '#7a5a3a' },
  owner = null,
  visitors = [],
  localUserId = null,
  cameraX = 0,
  editing = false,
  ghost = null,
  onTileClick = null,
  onPlacementClick = null,
  onMouseTile = null,
  speech = null,
  localHour,
}) {
  const hour = typeof localHour === 'number' ? localHour : new Date().getHours();
  const sky = skyFor(hour);
  const wallDark  = darken(settings.wall_color, 25);
  const floorDark = darken(settings.floor_color, 20);

  // Pre-build a placement lookup keyed by `${x},${y}` so the floor tile
  // renderer can mark occupied tiles in edit mode.
  const occupied = new Set();
  for (const p of placements) {
    const w = p.furniture?.size?.w || 1;
    const h = p.furniture?.size?.h || 1;
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        occupied.add(`${p.tile_x + dx},${p.tile_y + dy}`);
      }
    }
  }
  const ghostSet = new Set();
  if (ghost) {
    const w = ghost.furniture.size?.w || 1;
    const h = ghost.furniture.size?.h || 1;
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        ghostSet.add(`${ghost.tile_x + dx},${ghost.tile_y + dy}`);
      }
    }
  }
  const ghostBlocked = ghost && [...ghostSet].some(k => occupied.has(k));

  // Convert SVG client coords -> tile coords. Used by the parent to update
  // the ghost as the mouse moves. We attach the handler at the SVG level
  // and let it resolve which tile the cursor is over.
  const handleMouseMove = (e) => {
    if (!onMouseTile) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    // viewBox is VIEW_W wide and TOTAL_H tall, scaled to the rect.
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW_W + cameraX;
    const sy = ((e.clientY - rect.top)  / rect.height) * TOTAL_H;
    if (sy < HORIZON) return;
    const tx = Math.floor(sx / TILE);
    const ty = Math.floor((sy - HORIZON) / TILE);
    if (tx >= 0 && tx < WORLD_COLS && ty >= 0 && ty < ROWS) {
      onMouseTile(tx, ty);
    }
  };

  const handleClick = (e) => {
    if (!onTileClick) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW_W + cameraX;
    const sy = ((e.clientY - rect.top)  / rect.height) * TOTAL_H;
    if (sy < HORIZON) return;
    const tx = Math.floor(sx / TILE);
    const ty = Math.floor((sy - HORIZON) / TILE);
    if (tx < 0 || tx >= WORLD_COLS || ty < 0 || ty >= ROWS) return;
    onTileClick(tx, ty);
  };

  return (
    <div className="tavern-stage" style={{ position: 'relative', width: '100%', maxWidth: 720, margin: '0 auto' }}>
      <svg
        viewBox={`${cameraX} 0 ${VIEW_W} ${TOTAL_H}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: 'block', imageRendering: 'pixelated',
          borderRadius: 12, border: '1px solid var(--border)',
          background: '#0a0a14',
          cursor: ghost ? 'cell' : (editing ? 'crosshair' : 'default'),
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <defs>
          <linearGradient id="tavern-wall-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={settings.wall_color} />
            <stop offset="100%" stopColor={wallDark} />
          </linearGradient>
          <linearGradient id="tavern-floor-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={settings.floor_color} />
            <stop offset="100%" stopColor={floorDark} />
          </linearGradient>
          <linearGradient id="tavern-sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sky.from} />
            <stop offset="100%" stopColor={sky.to} />
          </linearGradient>
          <radialGradient id="tavern-warm-light" cx="50%" cy="70%" r="80%">
            <stop offset="0%" stopColor="rgba(252,211,77,0.15)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.0)" />
          </radialGradient>
        </defs>

        {/* Back wall spans the whole world so panning shows continuous wall */}
        <rect x="0" y="0" width={WORLD_W} height={HORIZON} fill="url(#tavern-wall-grad)" />

        {/* Windows along the back wall — every 4 tiles. */}
        {Array.from({ length: 6 }).map((_, i) => {
          const wx = 60 + i * 128;
          return (
            <g key={i}>
              <rect x={wx} y={20} width={48} height={56} fill="url(#tavern-sky-grad)" />
              <rect x={wx - 2} y={18} width={52} height={4}  fill={wallDark} />
              <rect x={wx - 2} y={74} width={52} height={4}  fill={wallDark} />
              <line x1={wx + 24} y1={20} x2={wx + 24} y2={76} stroke={wallDark} strokeWidth="2" />
              <line x1={wx} y1={48} x2={wx + 48} y2={48} stroke={wallDark} strokeWidth="2" />
              {(hour < 6 || hour >= 20) && (
                <>
                  <rect x={wx + 8}  y={28} width="1" height="1" fill="#fff" />
                  <rect x={wx + 18} y={36} width="1" height="1" fill="#fff" />
                  <rect x={wx + 36} y={30} width="1" height="1" fill="#fff" />
                </>
              )}
            </g>
          );
        })}

        {/* Wall torches every ~5 tiles */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Torch key={i} x={20 + i * 160} y={42} />
        ))}

        {/* Wall trim */}
        <rect x="0" y={HORIZON - 4} width={WORLD_W} height="4" fill={wallDark} />

        {/* Floor */}
        <rect x="0" y={HORIZON} width={WORLD_W} height={FLOOR_H} fill="url(#tavern-floor-grad)" />
        {Array.from({ length: ROWS }).map((_, r) => (
          <line key={r}
                x1={0} y1={HORIZON + r * TILE}
                x2={WORLD_W} y2={HORIZON + r * TILE}
                stroke={floorDark} strokeWidth="1" opacity="0.6" />
        ))}
        {/* Vertical plank seams every 3 tiles for texture */}
        {Array.from({ length: Math.ceil(WORLD_COLS / 3) }).map((_, i) => (
          <line key={`v${i}`}
                x1={i * TILE * 3} y1={HORIZON}
                x2={i * TILE * 3} y2={HORIZON + FLOOR_H}
                stroke={floorDark} strokeWidth="1" opacity="0.3" />
        ))}

        {/* Doorway on the left for visitor entry */}
        <g>
          <rect x="0" y={HORIZON - 32} width={TILE} height={32 + TILE * 2} fill="#1c1109" />
          <rect x="2" y={HORIZON - 26} width={TILE - 4} height={26 + TILE * 2} fill="#0a0606" />
          <rect x={TILE - 4} y={HORIZON - 32} width="4" height={TILE + 32} fill={wallDark} />
        </g>

        {/* Warm wash */}
        <rect x="0" y={HORIZON} width={WORLD_W} height={FLOOR_H} fill="url(#tavern-warm-light)" />

        {/* Edit-mode grid overlay (covers world width so it's visible on pan) */}
        {editing && Array.from({ length: WORLD_COLS * ROWS }).map((_, idx) => {
          const x = idx % WORLD_COLS, y = Math.floor(idx / WORLD_COLS);
          const isOcc = occupied.has(`${x},${y}`);
          const isGhost = ghostSet.has(`${x},${y}`);
          return (
            <rect key={idx}
                  x={x * TILE} y={HORIZON + y * TILE}
                  width={TILE} height={TILE}
                  fill={isGhost ? (ghostBlocked ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)') : 'transparent'}
                  stroke={isGhost ? (ghostBlocked ? '#ef4444' : '#22c55e') : isOcc ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth="1"
                  pointerEvents="none" />
          );
        })}

        {/* Placed furniture, sorted by tile_y so things further back render
            behind closer ones. */}
        {[...placements].sort((a, b) => a.tile_y - b.tile_y).map(p => (
          <Placement key={p.id} placement={p}
            onClick={onPlacementClick ? () => onPlacementClick(p) : null} />
        ))}

        {/* Ghost preview that follows the mouse during placement. */}
        {ghost && (
          <g transform={`translate(${ghost.tile_x * TILE} ${HORIZON + ghost.tile_y * TILE})`}
             opacity="0.55" pointerEvents="none">
            <FurnitureSprite
              id={ghost.furniture.id}
              size={ghost.furniture.size}
              rarity={ghost.furniture.rarity}
              rotation={ghost.rotation || 0}
              mountedItem={ghost.mounted_item}
              width={(ghost.furniture.size?.w || 1) * TILE}
              height={(ghost.furniture.size?.h || 1) * TILE}
            />
          </g>
        )}

        {/* ── Visitors / avatars ──────────────────────────────────────
            Sort by world y so people further back render behind. */}
        {[...visitors].sort((a, b) => a.y - b.y).map(v => (
          <VisitorAvatar
            key={v.userId}
            v={v}
            isLocal={v.userId === localUserId}
            speech={speech && speech.userId === v.userId ? speech : null}
          />
        ))}

        {/* ── Owner avatar at the bar (only when owner isn't a visitor) ── */}
        {owner && !visitors.some(v => v.userId === owner.userId) && (
          <foreignObject x={WORLD_W - 130} y={HORIZON + FLOOR_H - 110} width="110" height="120">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: '#fde047',
                background: 'rgba(0,0,0,0.6)', padding: '1px 6px',
                borderRadius: 8, marginBottom: 2,
              }}>👑 {owner.username}</div>
              <PixelCharacter
                appearance={owner.appearance || {}}
                equipped={{ ...(owner.equipped || {}), companion: null }}
                size={96}
              />
            </div>
          </foreignObject>
        )}

        {/* Pet — wanders if no one is moving it via follow */}
        {owner?.equipped?.companion && (
          <foreignObject x={WORLD_W - 200} y={HORIZON + FLOOR_H - 70}
            width="80" height="70" pointerEvents="none">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <PetSprite pet={owner.equipped.companion} playerSize={140} />
            </div>
          </foreignObject>
        )}

        <rect x="0" y="0" width={WORLD_W} height={TOTAL_H}
              fill="url(#tavern-warm-light)" opacity="0.4" pointerEvents="none" />
      </svg>

      {/* Camera-edge fade so the panning feels less abrupt */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, rgba(10,10,20,0.4), transparent 8%, transparent 92%, rgba(10,10,20,0.4))',
        borderRadius: 12,
      }} />
    </div>
  );
}

function Torch({ x, y }) {
  return (
    <g className="dungeon-torch">
      <rect x={x} y={y + 8} width="4" height="16" fill="#5c2a0a" />
      <ellipse cx={x + 2} cy={y + 4} rx="4" ry="6" fill="#fb923c" opacity="0.95">
        <animate attributeName="ry" values="6;5;6" dur="1.2s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={x + 2} cy={y + 2} rx="2.5" ry="4" fill="#fef08a" />
    </g>
  );
}

function Placement({ placement, onClick }) {
  const f = placement.furniture;
  const w = (f.size?.w || 1) * TILE;
  const h = (f.size?.h || 1) * TILE;
  const px = placement.tile_x * TILE;
  const py = HORIZON + placement.tile_y * TILE;

  return (
    <g
      className={`tavern-furn rarity-${f.rarity}${f.animated ? ' tavern-anim' : ''}`}
      transform={`translate(${px} ${py})`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      <title>{f.name}{placement.mounted_item ? ` · holds ${placement.mounted_item.name}` : ''}</title>
      <FurnitureSprite
        id={f.id}
        size={f.size}
        rarity={f.rarity}
        rotation={placement.rotation || 0}
        mountedItem={placement.mounted_item}
        width={w}
        height={h}
      />
    </g>
  );
}

function VisitorAvatar({ v, isLocal, speech }) {
  // Visitor world coords are in the same pixel space as the floor. Anchor
  // the avatar so feet sit at (x, y); name floats above the head.
  const AV_SIZE = 88;
  return (
    <foreignObject
      x={v.x - AV_SIZE / 2}
      y={v.y - AV_SIZE + 6}
      width={AV_SIZE} height={AV_SIZE + 28}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div xmlns="http://www.w3.org/1999/xhtml" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: v.facing === -1 ? 'scaleX(-1)' : 'none',
      }}>
        {/* Name floats above the head. Unflip when avatar is flipped. */}
        <div style={{
          transform: v.facing === -1 ? 'scaleX(-1)' : 'none',
          fontSize: 10, fontWeight: 600,
          color: isLocal ? '#6ee7b7' : '#fde047',
          background: 'rgba(0,0,0,0.65)', padding: '1px 6px',
          borderRadius: 8, marginBottom: 2, whiteSpace: 'nowrap',
        }}>{v.username}</div>
        {speech && (
          <div style={{
            transform: v.facing === -1 ? 'scaleX(-1)' : 'none',
            fontSize: 11, color: '#fff',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid var(--gold)',
            padding: '3px 8px', borderRadius: 8,
            marginBottom: 4, maxWidth: 180,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{speech.text}</div>
        )}
        <PixelCharacter
          appearance={v.appearance || {}}
          equipped={{ ...(v.equipped || {}), companion: null }}
          size={AV_SIZE}
        />
        {isLocal && (
          <div style={{
            transform: v.facing === -1 ? 'scaleX(-1)' : 'none',
            width: 16, height: 4, marginTop: -2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(110,231,183,0.6), transparent 70%)',
          }} />
        )}
      </div>
    </foreignObject>
  );
}

function darken(hex, amount = 20) {
  if (!hex || hex[0] !== '#') return hex;
  const v = hex.slice(1);
  const num = parseInt(v.length === 3 ? v.split('').map(c => c + c).join('') : v, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  r = Math.max(0, r - amount * 2);
  g = Math.max(0, g - amount * 2);
  b = Math.max(0, b - amount * 2);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
