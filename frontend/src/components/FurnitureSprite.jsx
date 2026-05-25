// Pixel-art furniture sprites. Each piece renders as an inline SVG `<g>`
// built from small `<rect>` primitives, matching the visual language of
// PixelCharacter.jsx. No emoji are rendered in the tavern scene.
//
// Each sprite is drawn inside its furniture footprint expressed in tiles
// (1 tile = 32 viewBox units). The size hint matches the catalog entry
// in backend/src/data/furniture.js. Sprites center themselves so rotation
// works around the footprint center.
//
// API:
//   <FurnitureSprite id="fn_simple_chair" size={{w:1,h:1}} rotation={0}
//                    rarity="common" mountedItem={null} />

const TILE = 32;

// Shared palette helpers so identical pieces visually match.
const WOOD       = ['#6b4423', '#8b5a2b', '#a37439', '#c08f4a']; // dark→light
const STONE      = ['#3a3a3a', '#5a5a5a', '#7a7a7a', '#9a9a9a'];
const GOLD       = ['#a16207', '#d97706', '#f59e0b', '#fde047'];
const FABRIC_RED = ['#7f1d1d', '#b91c1c', '#dc2626', '#ef4444'];
const FABRIC_BLUE= ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa'];
const GLOW_CYAN  = ['#0e7490', '#22d3ee', '#67e8f9', '#cffafe'];
const GLOW_PURPLE= ['#581c87', '#7e22ce', '#a855f7', '#c4b5fd'];

const RARITY_GLOW = {
  rare:      '#60a5fa',
  epic:      '#a78bfa',
  legendary: '#fde047',
  mythic:    '#f0abfc',
};

export default function FurnitureSprite({
  id,
  size = { w: 1, h: 1 },
  rotation = 0,
  rarity = 'common',
  mountedItem = null,
  width,
  height,
  className = '',
}) {
  const w = (size?.w || 1) * TILE;
  const h = (size?.h || 1) * TILE;
  const renderW = width  ?? w;
  const renderH = height ?? h;

  // Rotation transform around the footprint center so 90° spins look right
  // when the piece isn't square.
  const cx = w / 2;
  const cy = h / 2;
  const glowColor = RARITY_GLOW[rarity];

  return (
    <svg
      width={renderW} height={renderH}
      viewBox={`0 0 ${w} ${h}`}
      className={`furniture-sprite furn-${id} rarity-${rarity} ${className}`}
      style={{
        imageRendering: 'pixelated',
        overflow: 'visible',
        display: 'block',
        filter: glowColor ? `drop-shadow(0 0 2px ${glowColor}66)` : undefined,
      }}
      shapeRendering="crispEdges"
    >
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        {renderPiece(id, w, h, mountedItem)}
      </g>
    </svg>
  );
}

// ── Sprite dispatch ─────────────────────────────────────────────────────
function renderPiece(id, w, h, mountedItem) {
  const r = SPRITES[id];
  if (r) return r(w, h, mountedItem);
  // Fallback for unknown ids: a plain crate so the scene never crashes.
  return Crate(w, h);
}

// All 55 sprites. Each function returns an SVG fragment that fills the
// footprint (0..w on x, 0..h on y). Shadows and ground anchors are baked
// in so each piece looks "set" rather than floating.

const SPRITES = {
  // ── Common (15) ──────────────────────────────────────────────────────
  fn_wooden_stool: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-4} rx={w/2-4} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-9}  y={h-22} width="18" height="4" fill={WOOD[2]} />
      <rect x={w/2-9}  y={h-22} width="18" height="1" fill={WOOD[3]} />
      <rect x={w/2-7}  y={h-18} width="2"  height="14" fill={WOOD[1]} />
      <rect x={w/2+5}  y={h-18} width="2"  height="14" fill={WOOD[1]} />
    </g>
  ),
  fn_plain_table: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-2} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x="3"  y={h-22} width={w-6} height="6" fill={WOOD[1]} />
      <rect x="3"  y={h-22} width={w-6} height="2" fill={WOOD[2]} />
      <rect x="6"  y={h-16} width="3"   height="12" fill={WOOD[0]} />
      <rect x={w-9}y={h-16} width="3"   height="12" fill={WOOD[0]} />
    </g>
  ),
  fn_simple_chair: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-6} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-8} y={h-26} width="16" height="3" fill={WOOD[2]} />
      <rect x={w/2-8} y={h-26} width="3"  height="22" fill={WOOD[1]} />
      <rect x={w/2-8} y={h-18} width="16" height="3" fill={WOOD[2]} />
      <rect x={w/2-8} y={h-7}  width="3"  height="3" fill={WOOD[0]} />
      <rect x={w/2+5} y={h-7}  width="3"  height="3" fill={WOOD[0]} />
    </g>
  ),
  fn_wall_torch: (w, h) => (
    <g>
      <rect x={w/2-2} y={h/2-2} width="4" height="14" fill={WOOD[0]} />
      <rect x={w/2-3} y={h/2-6} width="6" height="5" fill={GOLD[1]} />
      <rect x={w/2-2} y={h/2-10} width="4" height="5" fill={GOLD[3]}>
        <animate attributeName="opacity" values="1;0.6;1" dur="0.7s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-1} y={h/2-13} width="2" height="3" fill={GOLD[2]}>
        <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_hay_bale: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-2} rx={w/2-2} ry="2" fill="rgba(0,0,0,0.3)" />
      <rect x="3" y={h-18} width={w-6} height="14" fill={GOLD[2]} />
      <rect x="3" y={h-18} width={w-6} height="2"  fill={GOLD[3]} />
      <rect x="5" y={h-14} width="2" height="2" fill={GOLD[1]} />
      <rect x={w-8} y={h-10} width="2" height="2" fill={GOLD[1]} />
      <rect x={w/2} y={h-8} width="2" height="2" fill={GOLD[1]} />
    </g>
  ),
  fn_barrel: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-2} rx={w/2-4} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-9}  y={h-22} width="18" height="18" fill={WOOD[1]} />
      <rect x={w/2-10} y={h-22} width="20" height="2"  fill={STONE[1]} />
      <rect x={w/2-10} y={h-14} width="20" height="2"  fill={STONE[1]} />
      <rect x={w/2-10} y={h-6}  width="20" height="2"  fill={STONE[1]} />
      <rect x={w/2-3}  y={h-20} width="6"  height="2"  fill={WOOD[2]} />
    </g>
  ),
  fn_small_crate: (w, h) => Crate(w, h),
  fn_woven_rug: (w, h) => (
    <g>
      <rect x="2" y={h-10} width={w-4} height="6" fill={FABRIC_RED[1]} />
      <rect x="2" y={h-10} width={w-4} height="1" fill={FABRIC_RED[2]} />
      <rect x="4" y={h-8}  width={w-8} height="2" fill={FABRIC_RED[2]} />
      <rect x="6" y={h-6}  width={w-12} height="1" fill={FABRIC_RED[3]} />
    </g>
  ),
  fn_basic_shelf: (w, h) => (
    <g>
      <rect x="3"  y="4"  width={w-6} height="3" fill={WOOD[1]} />
      <rect x="3"  y="14" width={w-6} height="3" fill={WOOD[1]} />
      <rect x="3"  y="24" width={w-6} height="3" fill={WOOD[1]} />
      <rect x="3"  y="4"  width="2"   height={h-8} fill={WOOD[0]} />
      <rect x={w-5}y="4"  width="2"   height={h-8} fill={WOOD[0]} />
      {/* Tiny books */}
      <rect x="6"  y="8"  width="2" height="6" fill={FABRIC_BLUE[2]} />
      <rect x="9"  y="8"  width="2" height="6" fill={FABRIC_RED[2]} />
      <rect x="12" y="8"  width="2" height="6" fill={GLOW_PURPLE[2]} />
      <rect x="6"  y="18" width="2" height="6" fill={GOLD[2]} />
      <rect x="10" y="18" width="3" height="6" fill={FABRIC_RED[1]} />
    </g>
  ),
  fn_clay_vase: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="6" ry="1.5" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-5} y={h-18} width="10" height="14" fill="#a16207" />
      <rect x={w/2-4} y={h-22} width="8"  height="5"  fill="#a16207" />
      <rect x={w/2-5} y={h-22} width="10" height="2"  fill="#78350f" />
      <rect x={w/2-4} y={h-17} width="8"  height="1"  fill="#78350f" />
      <rect x={w/2-2} y={h-26} width="4"  height="4"  fill="#22c55e" />
    </g>
  ),
  fn_wooden_bucket: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="6" ry="1.5" fill="rgba(0,0,0,0.4)" />
      <path d={`M ${w/2-7} ${h-16} L ${w/2-6} ${h-4} L ${w/2+6} ${h-4} L ${w/2+7} ${h-16} Z`} fill={WOOD[1]} />
      <rect x={w/2-7} y={h-18} width="14" height="3"  fill={STONE[1]} />
      <rect x={w/2-7} y={h-22} width="14" height="2"  fill={STONE[2]} />
      <path d={`M ${w/2-6} ${h-22} L ${w/2-3} ${h-26} L ${w/2+3} ${h-26} L ${w/2+6} ${h-22}`}
            stroke={STONE[1]} strokeWidth="1" fill="none" />
    </g>
  ),
  fn_bench: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-3} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x="3" y={h-18} width={w-6} height="4" fill={WOOD[2]} />
      <rect x="3" y={h-18} width={w-6} height="1" fill={WOOD[3]} />
      <rect x="6"  y={h-14} width="3" height="10" fill={WOOD[0]} />
      <rect x={w-9}y={h-14} width="3" height="10" fill={WOOD[0]} />
    </g>
  ),
  fn_hanging_lant: (w, h) => (
    <g>
      <rect x={w/2-1} y="0" width="2" height="10" fill={STONE[0]} />
      <rect x={w/2-6} y="10" width="12" height="2" fill={STONE[1]} />
      <rect x={w/2-5} y="12" width="10" height="10" fill="#7f1d1d" />
      <rect x={w/2-4} y="14" width="8" height="6" fill={GOLD[2]}>
        <animate attributeName="opacity" values="0.85;1;0.85" dur="1.4s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-1} y="22" width="2" height="3" fill={STONE[1]} />
    </g>
  ),
  fn_dried_herbs: (w, h) => (
    <g>
      <rect x={w/2-1} y="2" width="2" height="6" fill={WOOD[0]} />
      <path d={`M ${w/2-5} 8 L ${w/2+5} 8 L ${w/2+3} 22 L ${w/2-3} 22 Z`} fill="#65a30d" />
      <rect x={w/2-3} y="10" width="2" height="2" fill="#86efac" />
      <rect x={w/2}   y="14" width="2" height="2" fill="#86efac" />
      <rect x={w/2-2} y="18" width="2" height="2" fill="#86efac" />
    </g>
  ),
  fn_wall_hook: (w, h) => (
    <g>
      <rect x={w/2-3} y="4" width="6" height="3" fill={STONE[1]} />
      <rect x={w/2-1} y="7" width="2" height="8" fill={STONE[2]} />
      <rect x={w/2-1} y="15" width="4" height="2" fill={STONE[2]} />
    </g>
  ),

  // ── Rare (15) ────────────────────────────────────────────────────────
  fn_padded_chair: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-6} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-10} y={h-28} width="20" height="6" fill={FABRIC_BLUE[1]} />
      <rect x={w/2-10} y={h-28} width="20" height="2" fill={FABRIC_BLUE[2]} />
      <rect x={w/2-10} y={h-22} width="20" height="6" fill={FABRIC_BLUE[2]} />
      <rect x={w/2-10} y={h-22} width="20" height="2" fill={FABRIC_BLUE[3]} />
      <rect x={w/2-9}  y={h-16} width="3"  height="12" fill={WOOD[0]} />
      <rect x={w/2+6}  y={h-16} width="3"  height="12" fill={WOOD[0]} />
    </g>
  ),
  fn_cushion_bench: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-3} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x="3" y={h-22} width={w-6} height="3" fill={WOOD[1]} />
      <rect x="3" y={h-18} width={w-6} height="6" fill={FABRIC_BLUE[2]} />
      <rect x="3" y={h-18} width={w-6} height="2" fill={FABRIC_BLUE[3]} />
      <rect x="6"  y={h-12} width="3" height="8" fill={WOOD[0]} />
      <rect x={w-9}y={h-12} width="3" height="8" fill={WOOD[0]} />
    </g>
  ),
  fn_iron_cand: (w, h) => (
    <g>
      <rect x={w/2-1} y={h-12} width="2" height="8" fill={STONE[0]} />
      <rect x={w/2-7} y={h-14} width="14" height="2" fill={STONE[0]} />
      <rect x={w/2-7} y={h-22} width="2" height="8" fill={STONE[0]} />
      <rect x={w/2+5} y={h-22} width="2" height="8" fill={STONE[0]} />
      <rect x={w/2-1} y={h-22} width="2" height="8" fill={STONE[0]} />
      {[-6, 0, 6].map((dx, i) => (
        <g key={i}>
          <rect x={w/2-1+dx} y={h-26} width="2" height="4" fill="#fef3c7" />
          <rect x={w/2-1+dx} y={h-29} width="2" height="3" fill={GOLD[3]}>
            <animate attributeName="opacity" values="1;0.55;1" dur={`${0.6+i*0.1}s`} repeatCount="indefinite" />
          </rect>
        </g>
      ))}
    </g>
  ),
  fn_large_rug: (w, h) => (
    <g>
      <rect x="3"  y={h-22} width={w-6} height={h-4-(h-22)+2} fill={FABRIC_RED[1]} />
      <rect x="5"  y={h-20} width={w-10} height="2" fill={GOLD[2]} />
      <rect x="5"  y={h-8}  width={w-10} height="2" fill={GOLD[2]} />
      <rect x={w/2-12} y={h-16} width="24" height="6" fill={FABRIC_RED[2]} />
      <rect x={w/2-2}  y={h-15} width="4"  height="4" fill={GOLD[3]} />
    </g>
  ),
  fn_tall_shelf: (w, h) => (
    <g>
      {[6, 18, 30, 42, 54].map((y, i) => (
        <rect key={i} x="3" y={y} width={w-6} height="2" fill={WOOD[1]} />
      ))}
      <rect x="3"   y="4" width="2" height={h-8} fill={WOOD[0]} />
      <rect x={w-5} y="4" width="2" height={h-8} fill={WOOD[0]} />
      {/* Books on the shelves */}
      {[10, 22, 34, 46].map((y, i) => (
        <g key={i}>
          <rect x="6"  y={y} width="2" height="6" fill={FABRIC_BLUE[2]} />
          <rect x="9"  y={y} width="3" height="6" fill={FABRIC_RED[2]} />
          <rect x="13" y={y} width="2" height="6" fill={GLOW_PURPLE[2]} />
          <rect x="16" y={y} width="3" height="6" fill={GOLD[2]} />
          <rect x="20" y={y} width="2" height="6" fill="#22c55e" />
        </g>
      ))}
    </g>
  ),
  fn_weapon_rack: (w, h, mounted) => (
    <g>
      <rect x="3"   y="6"  width={w-6} height="2"  fill={WOOD[1]} />
      <rect x="3"   y={h-8} width={w-6} height="2" fill={WOOD[1]} />
      <rect x="6"   y="8"  width="2" height={h-16} fill={WOOD[0]} />
      <rect x={w-8} y="8"  width="2" height={h-16} fill={WOOD[0]} />
      {/* Mounted item or default placeholder weapons */}
      {mounted ? MountedItem(w, h, mounted)
        : (<>
            <rect x={w/2-1} y="10" width="2" height={h-22} fill={STONE[1]} />
            <rect x={w/2-3} y="12" width="6" height="2"  fill={STONE[2]} />
          </>)}
    </g>
  ),
  fn_banner_mount: (w, h, mounted) => {
    const fill = mounted?.color || FABRIC_BLUE[2];
    const isGradient = typeof fill === 'string' && fill.startsWith('linear-gradient');
    const stops = isGradient ? fill.match(/#[0-9a-f]{6}/gi) : null;
    const id = `bm-${mounted?.id || 'def'}`;
    return (
      <g>
        <rect x={w/2-1} y="2" width="2" height="3" fill={STONE[0]} />
        <rect x="6"   y="4" width={w-12} height="3" fill={STONE[1]} />
        {isGradient && stops && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={stops[0]} />
              <stop offset="100%" stopColor={stops[1] || stops[0]} />
            </linearGradient>
          </defs>
        )}
        <rect x="8" y="7" width={w-16} height={h-14}
              fill={isGradient ? `url(#${id})` : fill} />
        {/* Bottom bunting cut */}
        <path d={`M 8 ${h-7} L ${w/2-3} ${h-3} L ${w/2} ${h-7} L ${w/2+3} ${h-3} L ${w-8} ${h-7} Z`}
              fill={isGradient ? `url(#${id})` : fill} />
      </g>
    );
  },
  fn_fireplace: (w, h) => (
    <g>
      {/* Hearth */}
      <rect x="0"  y={h-22} width={w} height="6" fill={STONE[1]} />
      <rect x="2"  y={h-16} width={w-4} height={h-4-(h-16)} fill={STONE[0]} />
      <rect x="2"  y={h-16} width="3"   height={h-4-(h-16)} fill={STONE[2]} />
      <rect x={w-5} y={h-16} width="3"  height={h-4-(h-16)} fill={STONE[2]} />
      {/* Logs */}
      <rect x={w/2-7} y={h-10} width="14" height="3" fill={WOOD[0]} />
      <rect x={w/2-7} y={h-7}  width="14" height="2" fill={WOOD[0]} />
      {/* Flames */}
      <rect x={w/2-5} y={h-15} width="10" height="5" fill={GOLD[1]}>
        <animate attributeName="opacity" values="0.9;1;0.9" dur="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-3} y={h-19} width="6" height="4" fill={GOLD[3]}>
        <animate attributeName="opacity" values="0.6;1;0.7" dur="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-1} y={h-22} width="2" height="3" fill="#fef3c7">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="0.4s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_antlers: (w, h) => (
    <g>
      <rect x={w/2-4} y={h/2}   width="8" height="4" fill={WOOD[1]} />
      <rect x={w/2-2} y={h/2+4} width="4" height="2" fill={WOOD[2]} />
      {/* Antlers */}
      <rect x={w/2-2} y={h/2-2} width="2" height="2" fill="#f5f5dc" />
      <rect x={w/2}   y={h/2-2} width="2" height="2" fill="#f5f5dc" />
      <rect x={w/2-6} y={h/2-4} width="2" height="3" fill="#f5f5dc" />
      <rect x={w/2+4} y={h/2-4} width="2" height="3" fill="#f5f5dc" />
      <rect x={w/2-8} y={h/2-8} width="2" height="4" fill="#f5f5dc" />
      <rect x={w/2+6} y={h/2-8} width="2" height="4" fill="#f5f5dc" />
      <rect x={w/2-10} y={h/2-12} width="2" height="4" fill="#f5f5dc" />
      <rect x={w/2+8}  y={h/2-12} width="2" height="4" fill="#f5f5dc" />
    </g>
  ),
  fn_music_stand: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="6" ry="1.5" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-1} y={h-22} width="2" height="18" fill={STONE[0]} />
      <rect x={w/2-3} y={h-4}  width="6" height="2"  fill={STONE[0]} />
      <rect x={w/2-9} y={h-30} width="18" height="10" fill="#f9fafb" />
      <rect x={w/2-9} y={h-30} width="18" height="2"  fill={STONE[1]} />
      <rect x={w/2-7} y={h-26} width="14" height="1" fill={STONE[1]} />
      <rect x={w/2-7} y={h-24} width="14" height="1" fill={STONE[1]} />
      <rect x={w/2-7} y={h-22} width="10" height="1" fill={STONE[1]} />
    </g>
  ),
  fn_wine_cask: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-2} rx={w/2-4} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x="4"  y={h-22} width={w-8} height="18" fill={WOOD[0]} />
      <rect x="3"  y={h-22} width={w-6} height="2"  fill={STONE[1]} />
      <rect x="3"  y={h-14} width={w-6} height="2"  fill={STONE[1]} />
      <rect x="3"  y={h-6}  width={w-6} height="2"  fill={STONE[1]} />
      <rect x={w/2-2} y={h-18} width="4" height="4" fill="#f0abfc" />
    </g>
  ),
  fn_ornate_vase: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="7" ry="1.5" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-6} y={h-20} width="12" height="16" fill={GLOW_PURPLE[1]} />
      <rect x={w/2-5} y={h-24} width="10" height="6"  fill={GLOW_PURPLE[1]} />
      <rect x={w/2-6} y={h-24} width="12" height="2"  fill={GOLD[2]} />
      <rect x={w/2-5} y={h-15} width="10" height="2"  fill={GOLD[2]} />
      <rect x={w/2-3} y={h-11} width="6" height="3"   fill={GOLD[3]} />
      <rect x={w/2-3} y={h-28} width="6" height="4"   fill="#86efac" />
    </g>
  ),
  fn_desk: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-2} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x="3"  y={h-22} width={w-6} height="5" fill={WOOD[1]} />
      <rect x="3"  y={h-22} width={w-6} height="2" fill={WOOD[2]} />
      <rect x={w/2-8} y={h-21} width="16" height="3" fill="#f9fafb" />
      <rect x={w/2+4} y={h-21} width="4"  height="3" fill={WOOD[0]} />
      <rect x="6"  y={h-17} width="3"  height="13" fill={WOOD[0]} />
      <rect x={w-9} y={h-17} width="3" height="13" fill={WOOD[0]} />
    </g>
  ),
  fn_oil_lamp: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="5" ry="1.5" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-5} y={h-12} width="10" height="6" fill={STONE[1]} />
      <rect x={w/2-3} y={h-16} width="6"  height="4" fill={STONE[2]} />
      <rect x={w/2-2} y={h-22} width="4"  height="6" fill={GOLD[2]}>
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-1} y={h-26} width="2"  height="4" fill={GOLD[3]}>
        <animate attributeName="opacity" values="0.6;1;0.6" dur="0.7s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_small_tapestry: (w, h) => (
    <g>
      <rect x="2" y="2" width={w-4} height={h-8} fill={FABRIC_BLUE[1]} />
      <rect x="2" y="2" width={w-4} height="2"   fill={STONE[1]} />
      <rect x="2" y={h-8} width={w-4} height="2" fill={STONE[1]} />
      <rect x={w/2-4} y="6" width="8" height="8" fill={GOLD[2]} />
      <rect x={w/2-1} y="9" width="2" height="2" fill={FABRIC_RED[2]} />
    </g>
  ),

  // ── Epic (12+3 paintings) ────────────────────────────────────────────
  fn_gilded_throne: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-4} ry="2" fill="rgba(0,0,0,0.5)" />
      <rect x={w/2-12} y="6"  width="24" height="22" fill={GOLD[0]} />
      <rect x={w/2-12} y="6"  width="24" height="3"  fill={GOLD[3]} />
      <rect x={w/2-10} y="9"  width="20" height="18" fill={FABRIC_RED[1]} />
      <rect x={w/2-10} y="9"  width="20" height="2"  fill={FABRIC_RED[3]} />
      <rect x={w/2-12} y="28" width="24" height="8"  fill={GOLD[1]} />
      <rect x={w/2-12} y="36" width="24" height="3"  fill={GOLD[0]} />
      <rect x={w/2-14} y="36" width="4"  height={h-36-4} fill={GOLD[0]} />
      <rect x={w/2+10} y="36" width="4"  height={h-36-4} fill={GOLD[0]} />
      <rect x={w/2-2}  y="3"  width="4"  height="4"  fill={GOLD[3]} />
    </g>
  ),
  fn_oak_table: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-3} ry="3" fill="rgba(0,0,0,0.5)" />
      <ellipse cx={w/2} cy={h-22} rx={w/2-4} ry="6" fill={WOOD[1]} />
      <ellipse cx={w/2} cy={h-23} rx={w/2-4} ry="5" fill={WOOD[2]} />
      <rect x={w/2-3} y={h-18} width="6" height="14" fill={WOOD[0]} />
      <rect x={w/2-7} y={h-7}  width="14" height="3" fill={WOOD[1]} />
    </g>
  ),
  fn_gem_chand: (w, h) => (
    <g>
      <rect x={w/2-1} y="0"  width="2"  height="6" fill={STONE[0]} />
      <rect x={w/2-9} y="6"  width="18" height="3" fill={GOLD[1]} />
      <rect x={w/2-9} y="6"  width="18" height="1" fill={GOLD[3]} />
      {[-7, -2, 3, 8].map((dx, i) => (
        <g key={i}>
          <rect x={w/2+dx-1} y="9"  width="2" height="3" fill={GOLD[0]} />
          <rect x={w/2+dx-1} y="12" width="2" height="4" fill={GLOW_CYAN[2]}>
            <animate attributeName="opacity" values="0.7;1;0.7" dur={`${1+i*0.15}s`} repeatCount="indefinite" />
          </rect>
        </g>
      ))}
    </g>
  ),
  fn_ornate_fp: (w, h) => (
    <g>
      <rect x="0"   y={h-30} width={w} height="6"  fill={STONE[2]} />
      <rect x="0"   y={h-30} width={w} height="2"  fill={GOLD[1]} />
      <rect x="3"   y={h-24} width="6" height={h-4-(h-24)} fill={STONE[1]} />
      <rect x={w-9} y={h-24} width="6" height={h-4-(h-24)} fill={STONE[1]} />
      <rect x={w/2-12} y={h-22} width="24" height="18" fill="#0c0a09" />
      <rect x={w/2-8}  y={h-10} width="16" height="3"  fill={WOOD[0]} />
      <rect x={w/2-8}  y={h-7}  width="16" height="2"  fill={WOOD[1]} />
      <rect x={w/2-6}  y={h-15} width="12" height="5"  fill={GOLD[1]}>
        <animate attributeName="opacity" values="0.85;1;0.85" dur="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-4}  y={h-19} width="8" height="4"  fill={GOLD[3]}>
        <animate attributeName="opacity" values="0.6;1;0.7" dur="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-1}  y={h-22} width="2" height="3" fill="#fef3c7">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="0.4s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_armor_stand: (w, h, mounted) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-6} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-1} y={h-30} width="2" height="22" fill={STONE[0]} />
      <rect x={w/2-9} y={h-8} width="18" height="4" fill={STONE[1]} />
      {mounted ? MountedItem(w, h-12, mounted)
        : (<>
            <rect x={w/2-5} y={h-26} width="10" height="8"  fill={STONE[1]} />
            <rect x={w/2-5} y={h-26} width="10" height="2"  fill={STONE[2]} />
            <rect x={w/2-3} y={h-32} width="6"  height="6"  fill={STONE[2]} />
          </>)}
    </g>
  ),
  fn_trophy_stand: (w, h, mounted) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-4} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-8} y={h-10} width="16" height="6" fill={STONE[1]} />
      <rect x={w/2-7} y={h-10} width="14" height="1" fill={STONE[2]} />
      <ellipse cx={w/2} cy={h-22} rx="8" ry="12" fill="rgba(167,139,250,0.18)" />
      <ellipse cx={w/2} cy={h-22} rx="8" ry="12" fill="none" stroke={GLOW_PURPLE[2]} strokeWidth="1" />
      {mounted ? MountedItem(w, h-10, mounted) : null}
    </g>
  ),
  fn_gilded_shelf: (w, h) => (
    <g>
      {[6, 18, 30, 42, 54].map((y, i) => (
        <rect key={i} x="3" y={y} width={w-6} height="2" fill={GOLD[1]} />
      ))}
      <rect x="3"   y="4" width="2" height={h-8} fill={GOLD[0]} />
      <rect x={w-5} y="4" width="2" height={h-8} fill={GOLD[0]} />
      {[10, 22, 34, 46].map((y, i) => (
        <g key={i}>
          <rect x="6"  y={y} width="3" height="6" fill={FABRIC_RED[2]} />
          <rect x="10" y={y} width="2" height="6" fill={GLOW_PURPLE[2]} />
          <rect x="13" y={y} width="3" height="6" fill={GOLD[3]} />
          <rect x="17" y={y} width="2" height="6" fill={FABRIC_BLUE[2]} />
        </g>
      ))}
    </g>
  ),
  fn_large_tap: (w, h) => (
    <g>
      <rect x="2" y="2" width={w-4} height={h-8} fill={GLOW_PURPLE[1]} />
      <rect x="2" y="2" width={w-4} height="3"   fill={STONE[1]} />
      <rect x="2" y={h-9} width={w-4} height="3" fill={STONE[1]} />
      <rect x={w/2-12} y="10" width="24" height="20" fill={GOLD[1]} />
      <rect x={w/2-8}  y="14" width="16" height="12" fill={FABRIC_RED[1]} />
      <rect x={w/2-3}  y="20" width="6"  height="6"  fill={GOLD[3]} />
    </g>
  ),
  fn_crystal_lant: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="5" ry="1.5" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-5} y={h-22} width="10" height="3" fill={GOLD[0]} />
      <rect x={w/2-3} y={h-19} width="6"  height="14" fill={GLOW_CYAN[2]}>
        <animate attributeName="opacity" values="0.7;1;0.7" dur="1.4s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-5} y={h-5}  width="10" height="3" fill={GOLD[0]} />
    </g>
  ),
  fn_treasure_chest: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-4} ry="2" fill="rgba(0,0,0,0.5)" />
      <rect x="4" y={h-14} width={w-8} height="10" fill={WOOD[0]} />
      <rect x="4" y={h-14} width={w-8} height="2"  fill={WOOD[1]} />
      <rect x="2" y={h-22} width={w-4} height="8"  fill={WOOD[0]} />
      <rect x="2" y={h-22} width={w-4} height="2"  fill={WOOD[2]} />
      <rect x={w/2-2} y={h-18} width="4" height="3" fill={GOLD[1]} />
      <rect x="4" y={h-16} width={w-8} height="1"  fill={GOLD[3]}>
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_velvet_rug: (w, h) => (
    <g>
      <rect x="3" y={h-22} width={w-6} height={h-4-(h-22)+2} fill="#5b21b6" />
      <rect x="5" y={h-20} width={w-10} height="2" fill={GOLD[2]} />
      <rect x="5" y={h-8}  width={w-10} height="2" fill={GOLD[2]} />
      <rect x={w/2-14} y={h-15} width="28" height="6" fill="#7e22ce" />
      <rect x={w/2-2}  y={h-14} width="4"  height="4" fill={GOLD[3]} />
    </g>
  ),
  fn_painting_land: (w, h) => (
    <g>
      <rect x="2" y="2" width={w-4} height={h-8} fill={GOLD[0]} />
      <rect x="4" y="4" width={w-8} height={h-12} fill="#0c4a6e" />
      <rect x="4" y={h-14} width={w-8} height="8"  fill="#16a34a" />
      <rect x={w/2-3} y={h-22} width="6" height="6" fill={GOLD[3]} />
      <rect x="6"  y={h-18} width="2" height="4" fill="#0c4a6e" />
      <rect x={w-8} y={h-18} width="2" height="4" fill="#0c4a6e" />
    </g>
  ),
  fn_painting_self: (w, h) => (
    <g>
      <rect x="2" y="2" width={w-4} height={h-8} fill={GOLD[0]} />
      <rect x="4" y="4" width={w-8} height={h-12} fill="#374151" />
      <rect x={w/2-4} y="9"  width="8" height="6" fill="#e8b88a" />
      <rect x={w/2-5} y="7"  width="10" height="3" fill={WOOD[1]} />
      <rect x={w/2-6} y="14" width="12" height={h-22} fill={FABRIC_BLUE[2]} />
    </g>
  ),
  fn_painting_myst: (w, h) => (
    <g>
      <rect x="2" y="2" width={w-4} height={h-8} fill={GOLD[0]} />
      <rect x="4" y="4" width={w-8} height={h-12} fill="#1c1917" />
      <rect x={w/2-3} y="8"  width="6" height="14" fill="#0f172a" />
      <rect x={w/2-1} y="11" width="2" height="2"  fill={GLOW_PURPLE[3]}>
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </rect>
    </g>
  ),

  // ── Legendary (8) ────────────────────────────────────────────────────
  fn_dragon_skull: (w, h) => (
    <g>
      <rect x={w/2-14} y={h/2-10} width="28" height="14" fill="#f8fafc" />
      <rect x={w/2-12} y={h/2-12} width="24" height="6"  fill="#f8fafc" />
      <rect x={w/2-16} y={h/2-2}  width="6"  height="6"  fill="#f8fafc" />
      <rect x={w/2+10} y={h/2-2}  width="6"  height="6"  fill="#f8fafc" />
      <rect x={w/2-8}  y={h/2-4}  width="4"  height="4"  fill="#0f172a" />
      <rect x={w/2+4}  y={h/2-4}  width="4"  height="4"  fill="#0f172a" />
      <rect x={w/2-7}  y={h/2-3}  width="2"  height="2"  fill={GOLD[3]}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2+5}  y={h/2-3}  width="2"  height="2"  fill={GOLD[3]}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-4}  y={h/2+4}  width="2"  height="3" fill="#f8fafc" />
      <rect x={w/2}    y={h/2+4}  width="2"  height="3" fill="#f8fafc" />
      <rect x={w/2+4}  y={h/2+4}  width="2"  height="3" fill="#f8fafc" />
    </g>
  ),
  fn_levitating: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-2} ry="3" fill="rgba(167,139,250,0.4)">
        <animate attributeName="rx" values={`${w/2-3};${w/2-1};${w/2-3}`} dur="2s" repeatCount="indefinite" />
      </ellipse>
      <g>
        <animateTransform attributeName="transform" type="translate"
          values="0,0; 0,-2; 0,0" dur="2s" repeatCount="indefinite" />
        <rect x={w/2-10} y="6"  width="20" height="22" fill={GLOW_PURPLE[1]} />
        <rect x={w/2-10} y="6"  width="20" height="2"  fill={GLOW_PURPLE[2]} />
        <rect x={w/2-8}  y="9"  width="16" height="18" fill={FABRIC_RED[1]} />
        <rect x={w/2-10} y="28" width="20" height="8"  fill={GLOW_PURPLE[1]} />
        <rect x={w/2-12} y="36" width="4"  height={h-40} fill={GLOW_PURPLE[1]} />
        <rect x={w/2+8}  y="36" width="4"  height={h-40} fill={GLOW_PURPLE[1]} />
        <rect x={w/2-2}  y="3"  width="4"  height="4"  fill={GLOW_PURPLE[3]} />
      </g>
    </g>
  ),
  fn_hearthstone: (w, h) => (
    <g>
      <rect x="0"   y={h-30} width={w} height="6"  fill={STONE[2]} />
      <rect x="0"   y={h-30} width={w} height="2"  fill={GLOW_PURPLE[3]} />
      <rect x="3"   y={h-24} width="6" height={h-4-(h-24)} fill={STONE[1]} />
      <rect x={w-9} y={h-24} width="6" height={h-4-(h-24)} fill={STONE[1]} />
      <rect x={w/2-12} y={h-22} width="24" height="18" fill="#0c0a09" />
      <rect x={w/2-8}  y={h-14} width="16" height="5" fill={GLOW_PURPLE[2]}>
        <animate attributeName="opacity" values="0.8;1;0.8" dur="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-4}  y={h-18} width="8"  height="4" fill={GLOW_PURPLE[3]}>
        <animate attributeName="opacity" values="0.5;1;0.6" dur="0.5s" repeatCount="indefinite" />
      </rect>
      {/* Glowing runes on the mantel */}
      <rect x={w/2-10} y={h-29} width="2" height="2" fill={GLOW_CYAN[3]}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-2} y={h-29} width="2" height="2" fill={GLOW_CYAN[3]}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2+8} y={h-29} width="2" height="2" fill={GLOW_CYAN[3]}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_pet_pedestal: (w, h, mounted) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-2} ry="2" fill="rgba(34,211,238,0.5)" />
      <rect x={w/2-9} y={h-8} width="18" height="4" fill={GLOW_CYAN[0]} />
      <rect x={w/2-7} y={h-12} width="14" height="4" fill={GLOW_CYAN[1]} />
      <rect x={w/2-5} y={h-16} width="10" height="4" fill={GLOW_CYAN[2]} />
      {/* Crystal dome */}
      <ellipse cx={w/2} cy={h-22} rx="9" ry="14" fill="rgba(207,250,254,0.25)" />
      <ellipse cx={w/2} cy={h-22} rx="9" ry="14" fill="none" stroke={GLOW_CYAN[2]} strokeWidth="1" />
      {mounted ? MountedItem(w, h-10, mounted) : null}
    </g>
  ),
  fn_gold_weapon: (w, h, mounted) => (
    <g>
      <rect x="3"   y="6"  width={w-6} height="3" fill={GOLD[0]} />
      <rect x="3"   y={h-10} width={w-6} height="3" fill={GOLD[0]} />
      <rect x="6"   y="9"  width="2" height={h-19} fill={GOLD[1]} />
      <rect x={w-8} y="9"  width="2" height={h-19} fill={GOLD[1]} />
      {mounted ? MountedItem(w, h, mounted)
        : (<>
            <rect x={w/2-1} y="12" width="2" height={h-22} fill={GOLD[3]}>
              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.4s" repeatCount="indefinite" />
            </rect>
            <rect x={w/2-3} y="14" width="6" height="2"  fill={GOLD[3]} />
          </>)}
    </g>
  ),
  fn_tome: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="8" ry="2" fill="rgba(0,0,0,0.5)" />
      <rect x={w/2-9} y={h-18} width="18" height="14" fill={WOOD[0]} />
      <rect x={w/2-9} y={h-18} width="18" height="2"  fill={WOOD[1]} />
      <rect x={w/2-9} y={h-18} width="2"  height="14" fill={WOOD[1]} />
      <rect x={w/2-7} y={h-15} width="14" height="8"  fill="#fef3c7" />
      <rect x={w/2-5} y={h-14} width="10" height="1"  fill="#92400e" />
      <rect x={w/2-5} y={h-12} width="10" height="1"  fill="#92400e" />
      <rect x={w/2-5} y={h-10} width="6"  height="1"  fill="#92400e" />
      <rect x={w/2-1} y={h-22} width="2" height="4" fill={GLOW_CYAN[3]}>
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_reflection: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-12} rx={w/2-4} ry={h/2-8} fill={STONE[0]} />
      <ellipse cx={w/2} cy={h-14} rx={w/2-7} ry={h/2-11} fill={GLOW_CYAN[2]}>
        <animate attributeName="ry" values={`${h/2-11};${h/2-9};${h/2-11}`} dur="3s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={w/2} cy={h-14} rx={w/2-9} ry={h/2-13} fill={GLOW_CYAN[3]} opacity="0.7" />
      {/* Sparkles */}
      <rect x={w/2-6} y={h-16} width="2" height="2" fill="#ffffff">
        <animate attributeName="opacity" values="0;1;0" dur="2.4s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2+4} y={h-12} width="2" height="2" fill="#ffffff">
        <animate attributeName="opacity" values="0;1;0" dur="2.4s" begin="1s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_starry_window: (w, h) => (
    <g>
      <rect x="2" y="2"  width={w-4} height={h-12} fill="#0b1c3a" />
      <rect x="2" y="2"  width={w-4} height="3"    fill={WOOD[0]} />
      <rect x="2" y={h-13} width={w-4} height="3"  fill={WOOD[0]} />
      <rect x={w/2-1} y="5" width="2" height={h-18} fill={WOOD[0]} />
      {/* Stars */}
      {[[6,8],[14,12],[22,6],[10,20],[24,18],[28,10]].slice(0, 6).map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill="#ffffff">
          <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1.4+i*0.3}s`} repeatCount="indefinite" />
        </rect>
      ))}
      {/* Crescent moon */}
      <ellipse cx={w-12} cy="14" rx="4" ry="4" fill="#fef3c7" />
      <ellipse cx={w-10} cy="13" rx="3" ry="3" fill="#0b1c3a" />
    </g>
  ),

  // ── Mythic (5) ───────────────────────────────────────────────────────
  fn_void_portal: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h/2} rx={w/2-4} ry={h/2-4} fill="#0a0a0a" />
      <ellipse cx={w/2} cy={h/2} rx={w/2-6} ry={h/2-6} fill={GLOW_PURPLE[1]}>
        <animate attributeName="rx" values={`${w/2-7};${w/2-5};${w/2-7}`} dur="3s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={w/2} cy={h/2} rx={w/2-10} ry={h/2-10} fill={GLOW_PURPLE[2]} />
      <ellipse cx={w/2} cy={h/2} rx={w/2-14} ry={h/2-14} fill="#f0abfc">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={w/2} cy={h/2} rx="3" ry="3" fill="#ffffff" />
    </g>
  ),
  fn_mini_dragon: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="8" ry="2" fill="rgba(0,0,0,0.5)" />
      <rect x={w/2-7} y={h-22} width="14" height="4" fill={STONE[1]} />
      {/* Body */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1; 0,0" dur="2s" repeatCount="indefinite" />
        <rect x={w/2-5} y={h-22} width="10" height="3" fill="#dc2626" />
        <rect x={w/2-7} y={h-19} width="14" height="3" fill="#dc2626" />
        <rect x={w/2-4} y={h-26} width="8"  height="4" fill="#dc2626" />
        {/* Eyes */}
        <rect x={w/2-2} y={h-25} width="2" height="2" fill={GOLD[3]} />
        <rect x={w/2}   y={h-25} width="2" height="2" fill={GOLD[3]} />
        {/* Wings */}
        <rect x={w/2-9} y={h-21} width="2" height="3" fill="#7f1d1d" />
        <rect x={w/2+7} y={h-21} width="2" height="3" fill="#7f1d1d" />
      </g>
    </g>
  ),
  fn_eternal_flame: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx="9" ry="2" fill="rgba(251,146,60,0.5)" />
      <rect x={w/2-9} y={h-10} width="18" height="6" fill={STONE[2]} />
      <rect x={w/2-7} y={h-14} width="14" height="4" fill={STONE[2]} />
      {/* Flame */}
      <rect x={w/2-5} y={h-22} width="10" height="8" fill={GOLD[2]}>
        <animate attributeName="opacity" values="0.9;1;0.9" dur="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-3} y={h-28} width="6" height="6" fill={GOLD[3]}>
        <animate attributeName="opacity" values="0.7;1;0.8" dur="0.4s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-1} y={h-32} width="2" height="4" fill="#ffffff">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="0.3s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_void_throne: (w, h) => (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-4} ry="2" fill="rgba(0,0,0,0.7)" />
      <rect x={w/2-12} y="4"  width="24" height="26" fill="#0a0a0a" />
      <rect x={w/2-12} y="4"  width="24" height="3"  fill={GLOW_PURPLE[3]} />
      <rect x={w/2-10} y="7"  width="20" height="22" fill="#1c1917" />
      <rect x={w/2-12} y="30" width="24" height="8"  fill="#0a0a0a" />
      <rect x={w/2-14} y="38" width="4"  height={h-42} fill="#0a0a0a" />
      <rect x={w/2+10} y="38" width="4"  height={h-42} fill="#0a0a0a" />
      <rect x={w/2-2}  y="0"  width="4"  height="4"  fill="#f0abfc">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x={w/2-1}  y="14" width="2"  height="2"  fill="#f0abfc">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  fn_mirror_realm: (w, h) => (
    <g>
      <rect x="2" y="2" width={w-4} height={h-8} fill={GOLD[0]} />
      <rect x="4" y="4" width={w-8} height={h-12} fill={GLOW_CYAN[2]}>
        <animate attributeName="opacity" values="0.85;1;0.85" dur="2.4s" repeatCount="indefinite" />
      </rect>
      <rect x="6" y="6" width={w-12} height={h-16} fill="#ecfeff" opacity="0.4" />
      <rect x={w/2-1} y="10" width="2" height="2" fill="#ffffff">
        <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
};

// Compact placeholder used as fallback + for the small_crate sprite.
function Crate(w, h) {
  return (
    <g>
      <ellipse cx={w/2} cy={h-3} rx={w/2-4} ry="2" fill="rgba(0,0,0,0.4)" />
      <rect x={w/2-9} y={h-22} width="18" height="18" fill={WOOD[0]} />
      <rect x={w/2-9} y={h-22} width="18" height="2"  fill={WOOD[2]} />
      <rect x={w/2-9} y={h-22} width="2"  height="18" fill={WOOD[1]} />
      <rect x={w/2+7} y={h-22} width="2"  height="18" fill={WOOD[1]} />
      <rect x={w/2-9} y={h-12} width="18" height="2"  fill={WOOD[1]} />
    </g>
  );
}

// Render an inventory item attached to a mount-style furniture. We draw a
// small symbolic representation rather than the full PixelCharacter weapon
// SVG so it reads at this scale.
function MountedItem(w, h, item) {
  if (!item) return null;
  const type = item.type;
  const tint = rarityTint(item.rarity);
  if (type === 'weapon') {
    return (
      <g>
        <rect x={w/2-1} y="10" width="2" height={h-22} fill={STONE[2]} />
        <rect x={w/2-1} y="10" width="2" height={h-22} fill={tint} opacity="0.4" />
        <rect x={w/2-3} y="12" width="6" height="2"  fill={GOLD[1]} />
        <rect x={w/2-5} y={h-14} width="10" height="2" fill={WOOD[0]} />
      </g>
    );
  }
  if (type === 'armor') {
    return (
      <g>
        <rect x={w/2-6} y={h/2-8} width="12" height="14" fill={tint} />
        <rect x={w/2-6} y={h/2-8} width="12" height="3"  fill={STONE[2]} />
        <rect x={w/2-4} y={h/2-12} width="8" height="4" fill={tint} />
      </g>
    );
  }
  if (type === 'companion') {
    return (
      <g>
        <rect x={w/2-4} y={h/2-4} width="8" height="6" fill={tint} />
        <rect x={w/2-3} y={h/2-7} width="6" height="3" fill={tint} />
        <rect x={w/2-2} y={h/2-3} width="1" height="1" fill="#0f172a" />
        <rect x={w/2+1} y={h/2-3} width="1" height="1" fill="#0f172a" />
      </g>
    );
  }
  // Banner / badge / title — small flag
  return (
    <g>
      <rect x={w/2-1} y="8" width="2" height={h-20} fill={STONE[0]} />
      <rect x={w/2+1} y="8" width="10" height="8" fill={tint} />
    </g>
  );
}

function rarityTint(rarity) {
  switch (rarity) {
    case 'rare':      return '#60a5fa';
    case 'epic':      return '#a78bfa';
    case 'legendary': return '#fde047';
    case 'mythic':    return '#f0abfc';
    default:          return '#9ca3af';
  }
}
