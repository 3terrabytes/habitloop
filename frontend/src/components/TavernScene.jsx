// Renders a tavern room as an SVG scene. Used by both /tavern (own) and
// /tavern/:username (visit). Pure renderer — all interactivity lives in
// the parent (TavernPage / VisitPage).
//
// Layout: 12x8 tile grid, each tile = 32x32px in viewBox coords.
// Stage: 384 (12*32) wide × 256 (8*32) tall, plus a horizon strip above
// for the windowed back wall (so the windows can sit above the floor
// tiles without claiming a grid slot).
//
// Props:
//   placements        — array from /tavern API
//   settings          — { wall_color, floor_color }
//   owner             — { appearance, equipped, username, level }
//   editing           — bool, draws the tile-grid overlay
//   selectedTile      — { x, y } | null, highlighted tile (placement preview)
//   onTileClick(x,y)  — called when a tile in the floor is clicked
//   onPlacementClick(placement) — clicked an existing placement
//   highlightedFurnitureSize — { w, h } | null, shows footprint of pending placement
//   localHour         — 0..23 used to colour the skybox; defaults to local time
//   petWander         — bool, animate the pet across the floor (default true)

import PixelCharacter, { PetSprite } from './PixelCharacter';

const TILE = 32;
const COLS = 12;
const ROWS = 8;
const STAGE_W = TILE * COLS;
const FLOOR_H = TILE * ROWS;
const HORIZON = 96; // height of the back wall above the floor

// Sky gradient stops keyed to hour-of-day buckets. The window panes sample
// from these so the room subtly shifts mood with real time.
const SKY = [
  { until: 5,  from: '#0b1c3a', to: '#1c1043' }, // deep night
  { until: 8,  from: '#fcd34d', to: '#fb923c' }, // dawn
  { until: 17, from: '#bae6fd', to: '#fef3c7' }, // day
  { until: 20, from: '#fb923c', to: '#7c3aed' }, // dusk
  { until: 24, from: '#1c1043', to: '#0b1c3a' }, // night
];
function skyFor(hour) {
  for (const s of SKY) if (hour < s.until) return s;
  return SKY[SKY.length - 1];
}

export default function TavernScene({
  placements = [],
  settings = { wall_color: '#4a3a2a', floor_color: '#7a5a3a' },
  owner = null,
  editing = false,
  selectedTile = null,
  onTileClick = null,
  onPlacementClick = null,
  highlightedFurnitureSize = null,
  localHour,
  petWander = true,
}) {
  const hour = typeof localHour === 'number' ? localHour : new Date().getHours();
  const sky = skyFor(hour);

  const totalH = FLOOR_H + HORIZON;
  const wallDark = darken(settings.wall_color, 25);
  const floorDark = darken(settings.floor_color, 20);

  // Pre-build a placement lookup keyed by `${x},${y}` so the floor tile
  // renderer can check if a tile is occupied.
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

  // Highlighted footprint for "about to place" preview.
  const highlightSet = new Set();
  if (selectedTile && highlightedFurnitureSize) {
    for (let dx = 0; dx < highlightedFurnitureSize.w; dx++) {
      for (let dy = 0; dy < highlightedFurnitureSize.h; dy++) {
        highlightSet.add(`${selectedTile.x + dx},${selectedTile.y + dy}`);
      }
    }
  }

  return (
    <div className="tavern-stage" style={{ position: 'relative', width: '100%', maxWidth: 720, margin: '0 auto' }}>
      <svg
        viewBox={`0 0 ${STAGE_W} ${totalH}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', imageRendering: 'pixelated', borderRadius: 12, border: '1px solid var(--border)' }}
      >
        {/* ── Back wall ────────────────────────────────────────────── */}
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

        <rect x="0" y="0" width={STAGE_W} height={HORIZON} fill="url(#tavern-wall-grad)" />

        {/* Window panes — three windows along the back wall showing the sky. */}
        {[80, 180, 280].map((wx, i) => (
          <g key={i}>
            <rect x={wx} y={20} width={48} height={56} fill="url(#tavern-sky-grad)" />
            <rect x={wx - 2} y={18} width={52} height={4}  fill={wallDark} />
            <rect x={wx - 2} y={74} width={52} height={4}  fill={wallDark} />
            {/* Cross frame */}
            <line x1={wx + 24} y1={20} x2={wx + 24} y2={76} stroke={wallDark} strokeWidth="2" />
            <line x1={wx} y1={48} x2={wx + 48} y2={48} stroke={wallDark} strokeWidth="2" />
            {/* Stars at night */}
            {(hour < 6 || hour >= 20) && (
              <>
                <rect x={wx + 8}  y={28} width="1" height="1" fill="#fff" />
                <rect x={wx + 18} y={36} width="1" height="1" fill="#fff" />
                <rect x={wx + 36} y={30} width="1" height="1" fill="#fff" />
                <rect x={wx + 42} y={60} width="1" height="1" fill="#fff" />
              </>
            )}
          </g>
        ))}

        {/* Wall torches — left and right of the back wall for warmth. */}
        <Torch x={20} y={42} />
        <Torch x={356} y={42} />

        {/* Wall trim (a wood band at the bottom of the back wall). */}
        <rect x="0" y={HORIZON - 4} width={STAGE_W} height="4" fill={wallDark} />

        {/* ── Floor ──────────────────────────────────────────────── */}
        <rect x="0" y={HORIZON} width={STAGE_W} height={FLOOR_H} fill="url(#tavern-floor-grad)" />
        {/* Plank lines */}
        {Array.from({ length: ROWS }).map((_, r) => (
          <line key={r}
                x1={0} y1={HORIZON + r * TILE}
                x2={STAGE_W} y2={HORIZON + r * TILE}
                stroke={floorDark} strokeWidth="1" opacity="0.6" />
        ))}
        {/* Warm overhead light wash */}
        <rect x="0" y={HORIZON} width={STAGE_W} height={FLOOR_H} fill="url(#tavern-warm-light)" />

        {/* ── Edit-mode tile grid overlay ─────────────────────────── */}
        {editing && Array.from({ length: COLS * ROWS }).map((_, idx) => {
          const x = idx % COLS, y = Math.floor(idx / COLS);
          const isOcc = occupied.has(`${x},${y}`);
          const isHl  = highlightSet.has(`${x},${y}`);
          return (
            <rect key={idx}
                  x={x * TILE} y={HORIZON + y * TILE}
                  width={TILE} height={TILE}
                  fill={isHl ? 'rgba(253,224,71,0.25)' : 'transparent'}
                  stroke={isHl ? '#fde047' : isOcc ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}
                  strokeWidth="1"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onTileClick && onTileClick(x, y)} />
          );
        })}

        {/* ── Furniture placements ────────────────────────────────── */}
        {placements.map(p => (
          <FurnitureSprite key={p.id} placement={p}
            tile={TILE} horizon={HORIZON}
            onClick={onPlacementClick ? () => onPlacementClick(p) : null} />
        ))}

        {/* ── Owner avatar — stands at the right side of the bar ──── */}
        {owner && (
          <foreignObject x={STAGE_W - 110} y={HORIZON + FLOOR_H - 110} width="100" height="110">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <PixelCharacter
                appearance={owner.appearance || {}}
                equipped={{ ...(owner.equipped || {}), companion: null }}
                size={96}
              />
            </div>
          </foreignObject>
        )}

        {/* ── Pet — wanders across the floor when present ─────────── */}
        {owner?.equipped?.companion && (
          <foreignObject x={20} y={HORIZON + FLOOR_H - 70}
            width="80" height="70"
            className={petWander ? 'tavern-pet-wander' : ''}>
            <div xmlns="http://www.w3.org/1999/xhtml">
              <PetSprite pet={owner.equipped.companion} playerSize={140} />
            </div>
          </foreignObject>
        )}

        {/* Soft outer vignette so the room feels warmer at the centre. */}
        <rect x="0" y="0" width={STAGE_W} height={totalH}
              fill="url(#tavern-warm-light)" opacity="0.6" pointerEvents="none" />
      </svg>
    </div>
  );
}

function Torch({ x, y }) {
  return (
    <g className="dungeon-torch">
      <rect x={x} y={y + 8} width="4" height="16" fill="#5c2a0a" />
      <ellipse cx={x + 2} cy={y + 4} rx="4" ry="6" fill="#fb923c" opacity="0.95" />
      <ellipse cx={x + 2} cy={y + 2} rx="2.5" ry="4" fill="#fef08a" />
    </g>
  );
}

// ── Furniture sprite ────────────────────────────────────────────────
// For MVP we render each furniture as a pixel-art tile with the catalog
// emoji on top, plus a rarity-coloured frame and (for mounts) the mounted
// item emoji overlaid. Animated pieces get a CSS class for shimmer.
function FurnitureSprite({ placement, tile, horizon, onClick }) {
  const f = placement.furniture;
  const w = (f.size?.w || 1) * tile;
  const h = (f.size?.h || 1) * tile;
  const px = placement.tile_x * tile;
  const py = horizon + placement.tile_y * tile;
  const rarityColor = RARITY_COLOR[f.rarity] || '#94a3b8';

  return (
    <g
      className={`tavern-furn rarity-${f.rarity}${f.animated ? ' tavern-anim' : ''}`}
      transform={`translate(${px} ${py})`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <title>{f.name}{placement.mounted_item ? ` · holds ${placement.mounted_item.name}` : ''}</title>
      {/* Tile platform */}
      <rect x={2} y={h - 8} width={w - 4} height={6} fill="rgba(0,0,0,0.4)" />
      {/* Rarity-coloured base glow for legendary+ */}
      {(f.rarity === 'legendary' || f.rarity === 'mythic') && (
        <ellipse cx={w / 2} cy={h - 4} rx={w / 2 - 4} ry={4} fill={rarityColor} opacity="0.45" />
      )}
      {/* Emoji block — sized to the piece's footprint. We render via
          foreignObject so emoji actually shows (SVG <text> emoji support
          is patchy across browsers). */}
      <foreignObject x="0" y="0" width={w} height={h - 6}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.min(w, h) * 0.7,
          lineHeight: 1,
          filter: `drop-shadow(0 1px 0 rgba(0,0,0,0.5))`,
        }}>
          {f.emoji}
        </div>
      </foreignObject>
      {/* Mounted item overlay */}
      {placement.mounted_item && (
        <foreignObject x={w * 0.35} y={2} width={w * 0.6} height={h * 0.5}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.min(w, h) * 0.45,
            filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.6))',
          }}>
            {placement.mounted_item.emoji || '✦'}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

const RARITY_COLOR = {
  common: '#94a3b8', rare: '#60a5fa', epic: '#a78bfa',
  legendary: '#fde047', mythic: '#f0abfc',
};

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
