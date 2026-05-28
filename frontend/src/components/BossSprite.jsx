// Pixel-art boss sprites with multiple animation states. Each of the 5
// raid bosses gets a unique inline SVG built from rect primitives so it
// matches the rest of the game's art style.
//
// Props:
//   id      — 'gravelord' | 'lich_king' | 'fire_titan' | 'ice_serpent' | 'void_prince'
//   action  — 'idle' | 'strike' | 'heavy' | 'hurt' | 'die'
//   size    — render box size in CSS px (default 200)
//
// The outer wrapper class drives the per-action animation. The sprite
// itself is static — only the wrapper transforms. Keyframes live in
// index.css.

export default function BossSprite({ id, action = 'idle', size = 200 }) {
  const render = SPRITES[id] || GravelordSprite;
  return (
    <div className={`boss-sprite-wrap boss-${action}`} style={{
      width: size, height: size,
      imageRendering: 'pixelated',
      overflow: 'visible',
    }}>
      <svg
        width={size} height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: 'pixelated', display: 'block', overflow: 'visible' }}
        shapeRendering="crispEdges"
      >
        {/* Soft ground shadow */}
        <ellipse cx="32" cy="62" rx="20" ry="3" fill="rgba(0,0,0,0.55)" />
        {render()}
      </svg>
    </div>
  );
}

// ── Sprites ────────────────────────────────────────────────────────
// Each ~64x64 viewBox so the proportions match across bosses.

function GravelordSprite() {
  // Massive shadow ogre with crown of bones.
  return (
    <g>
      {/* Body */}
      <rect x="14" y="34" width="36" height="22" fill="#1a1a2a" />
      <rect x="14" y="34" width="36" height="3"  fill="#2a2a3a" />
      <rect x="16" y="56" width="6"  height="4"  fill="#0d0d18" />
      <rect x="42" y="56" width="6"  height="4"  fill="#0d0d18" />
      {/* Arms */}
      <rect x="6"  y="34" width="8"  height="18" fill="#1a1a2a" />
      <rect x="50" y="34" width="8"  height="18" fill="#1a1a2a" />
      <rect x="4"  y="48" width="6"  height="5"  fill="#0d0d18" />
      <rect x="54" y="48" width="6"  height="5"  fill="#0d0d18" />
      {/* Head */}
      <rect x="18" y="18" width="28" height="18" fill="#2a1a2a" />
      <rect x="18" y="18" width="28" height="3"  fill="#3a2a3a" />
      {/* Eyes */}
      <rect x="22" y="24" width="6"  height="4" fill="#ef4444" />
      <rect x="36" y="24" width="6"  height="4" fill="#ef4444" />
      <rect x="23" y="25" width="2"  height="2" fill="#fef08a" />
      <rect x="37" y="25" width="2"  height="2" fill="#fef08a" />
      {/* Mouth */}
      <rect x="22" y="30" width="20" height="3" fill="#0d0d18" />
      <rect x="24" y="33" width="2"  height="2" fill="#f8fafc" />
      <rect x="28" y="33" width="2"  height="2" fill="#f8fafc" />
      <rect x="34" y="33" width="2"  height="2" fill="#f8fafc" />
      <rect x="38" y="33" width="2"  height="2" fill="#f8fafc" />
      {/* Crown of bones */}
      <rect x="14" y="14" width="36" height="4" fill="#2a2a3a" />
      <rect x="18" y="10" width="3"  height="4" fill="#e7e5e4" />
      <rect x="25" y="6"  width="3"  height="8" fill="#e7e5e4" />
      <rect x="32" y="4"  width="3"  height="10" fill="#e7e5e4" />
      <rect x="39" y="6"  width="3"  height="8" fill="#e7e5e4" />
      <rect x="46" y="10" width="3"  height="4" fill="#e7e5e4" />
    </g>
  );
}

function LichKingSprite() {
  // Skeletal mage in a tattered cloak, glowing crown.
  return (
    <g>
      {/* Cloak / lower body */}
      <path d="M 12 38 L 18 60 L 46 60 L 52 38 Z" fill="#312e81" />
      <path d="M 14 38 L 20 60 L 24 60 L 22 38 Z" fill="#3730a3" />
      <path d="M 50 38 L 44 60 L 40 60 L 42 38 Z" fill="#3730a3" />
      {/* Torso */}
      <rect x="22" y="28" width="20" height="14" fill="#1e1b4b" />
      <rect x="22" y="28" width="20" height="2"  fill="#3730a3" />
      {/* Arms (raised) */}
      <rect x="14" y="22" width="6" height="14" fill="#1e1b4b" />
      <rect x="44" y="22" width="6" height="14" fill="#1e1b4b" />
      <rect x="12" y="18" width="8" height="6" fill="#f8fafc" />
      <rect x="44" y="18" width="8" height="6" fill="#f8fafc" />
      {/* Skull */}
      <rect x="22" y="10" width="20" height="18" fill="#f8fafc" />
      <rect x="22" y="10" width="20" height="3"  fill="#e7e5e4" />
      <rect x="18" y="18" width="4" height="6" fill="#f8fafc" />
      <rect x="42" y="18" width="4" height="6" fill="#f8fafc" />
      {/* Eye sockets glowing */}
      <rect x="24" y="16" width="5" height="6" fill="#0c0a09" />
      <rect x="35" y="16" width="5" height="6" fill="#0c0a09" />
      <rect x="26" y="18" width="2" height="2" fill="#22d3ee" />
      <rect x="37" y="18" width="2" height="2" fill="#22d3ee" />
      {/* Teeth */}
      <rect x="24" y="24" width="16" height="2" fill="#0c0a09" />
      <rect x="26" y="24" width="2"  height="2" fill="#f8fafc" />
      <rect x="30" y="24" width="2"  height="2" fill="#f8fafc" />
      <rect x="34" y="24" width="2"  height="2" fill="#f8fafc" />
      <rect x="38" y="24" width="2"  height="2" fill="#f8fafc" />
      {/* Crown */}
      <rect x="20" y="6" width="24" height="4" fill="#a16207" />
      <rect x="22" y="2" width="4"  height="4" fill="#fde047" />
      <rect x="30" y="0" width="4"  height="6" fill="#fde047" />
      <rect x="38" y="2" width="4"  height="4" fill="#fde047" />
    </g>
  );
}

function FireTitanSprite() {
  // Massive flame-clad titan with magma cracks.
  return (
    <g>
      {/* Massive body */}
      <rect x="10" y="28" width="44" height="32" fill="#7c2d12" />
      <rect x="10" y="28" width="44" height="3"  fill="#9a3412" />
      {/* Magma cracks */}
      <rect x="14" y="36" width="14" height="2" fill="#fb923c" />
      <rect x="28" y="40" width="20" height="2" fill="#fb923c" />
      <rect x="20" y="48" width="14" height="2" fill="#fbbf24" />
      <rect x="36" y="50" width="14" height="2" fill="#fb923c" />
      {/* Legs */}
      <rect x="14" y="58" width="10" height="4" fill="#451a03" />
      <rect x="40" y="58" width="10" height="4" fill="#451a03" />
      {/* Arms */}
      <rect x="2"  y="30" width="10" height="20" fill="#7c2d12" />
      <rect x="52" y="30" width="10" height="20" fill="#7c2d12" />
      <rect x="0"  y="46" width="6"  height="6"  fill="#451a03" />
      <rect x="58" y="46" width="6"  height="6"  fill="#451a03" />
      {/* Head */}
      <rect x="20" y="10" width="24" height="20" fill="#7c2d12" />
      <rect x="20" y="10" width="24" height="3"  fill="#9a3412" />
      {/* Eyes — pure white-hot */}
      <rect x="24" y="16" width="6" height="4" fill="#fef3c7" />
      <rect x="34" y="16" width="6" height="4" fill="#fef3c7" />
      <rect x="26" y="17" width="2" height="2" fill="#fbbf24" />
      <rect x="36" y="17" width="2" height="2" fill="#fbbf24" />
      {/* Mouth */}
      <rect x="24" y="24" width="16" height="3" fill="#fb923c" />
      <rect x="26" y="24" width="2"  height="2" fill="#fef3c7" />
      <rect x="36" y="24" width="2"  height="2" fill="#fef3c7" />
      {/* Horns / flames */}
      <rect x="16" y="6" width="4" height="6" fill="#fb923c" />
      <rect x="14" y="2" width="4" height="6" fill="#fbbf24" />
      <rect x="44" y="6" width="4" height="6" fill="#fb923c" />
      <rect x="46" y="2" width="4" height="6" fill="#fbbf24" />
      <rect x="30" y="4" width="4" height="6" fill="#fb923c" />
    </g>
  );
}

function IceSerpentSprite() {
  // Long-bodied serpent dragon, ice scales, curling tail.
  return (
    <g>
      {/* Coiled body */}
      <path d="M 8 50 L 22 38 L 36 50 L 50 38 L 56 44 L 50 56 L 36 60 L 22 56 L 12 58 Z"
            fill="#0e7490" />
      <path d="M 22 38 L 36 50 L 50 38" stroke="#22d3ee" strokeWidth="1.5" fill="none" />
      {/* Belly highlights */}
      <rect x="18" y="44" width="6"  height="3" fill="#67e8f9" />
      <rect x="32" y="48" width="6"  height="3" fill="#67e8f9" />
      <rect x="44" y="44" width="6"  height="3" fill="#67e8f9" />
      {/* Head */}
      <path d="M 22 24 L 42 24 L 46 36 L 32 42 L 18 36 Z" fill="#0e7490" />
      <rect x="22" y="24" width="20" height="3" fill="#22d3ee" />
      {/* Eyes */}
      <rect x="24" y="28" width="4" height="4" fill="#fef3c7" />
      <rect x="36" y="28" width="4" height="4" fill="#fef3c7" />
      <rect x="26" y="30" width="2" height="2" fill="#0c4a6e" />
      <rect x="38" y="30" width="2" height="2" fill="#0c4a6e" />
      {/* Fangs */}
      <rect x="26" y="38" width="2" height="4" fill="#f8fafc" />
      <rect x="36" y="38" width="2" height="4" fill="#f8fafc" />
      {/* Horns */}
      <rect x="18" y="18" width="3" height="6" fill="#22d3ee" />
      <rect x="43" y="18" width="3" height="6" fill="#22d3ee" />
      <rect x="16" y="14" width="3" height="4" fill="#cffafe" />
      <rect x="45" y="14" width="3" height="4" fill="#cffafe" />
      {/* Frost mist */}
      <rect x="10" y="8" width="3" height="3" fill="#cffafe" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="50" y="10" width="2" height="2" fill="#cffafe" opacity="0.7">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
      </rect>
    </g>
  );
}

function VoidPrinceSprite() {
  // Floating eye crowned with shifting tendrils.
  return (
    <g>
      {/* Tendrils — bottom */}
      <path d="M 24 50 L 22 60 L 26 60 L 28 50 Z" fill="#581c87" />
      <path d="M 32 52 L 32 62 L 36 62 L 34 52 Z" fill="#581c87" />
      <path d="M 40 50 L 42 60 L 38 60 L 36 50 Z" fill="#581c87" />
      {/* Eye body */}
      <ellipse cx="32" cy="32" rx="20" ry="18" fill="#1c1917" />
      <ellipse cx="32" cy="32" rx="18" ry="16" fill="#7e22ce" />
      <ellipse cx="32" cy="32" rx="14" ry="12" fill="#f0abfc" />
      <ellipse cx="32" cy="32" rx="9"  ry="9"  fill="#0c0a09" />
      <ellipse cx="34" cy="30" rx="3"  ry="3"  fill="#f0abfc" opacity="0.9" />
      {/* Outer iris ring */}
      <ellipse cx="32" cy="32" rx="20" ry="18" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.6">
        <animate attributeName="stroke-opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
      </ellipse>
      {/* Crown of small eyes */}
      <rect x="14" y="14" width="4" height="4" fill="#f0abfc" />
      <rect x="46" y="14" width="4" height="4" fill="#f0abfc" />
      <rect x="28" y="8"  width="4" height="4" fill="#f0abfc" />
      <rect x="15" y="15" width="2" height="2" fill="#0c0a09" />
      <rect x="47" y="15" width="2" height="2" fill="#0c0a09" />
      <rect x="29" y="9"  width="2" height="2" fill="#0c0a09" />
      {/* Void wisps */}
      <rect x="6"  y="32" width="2" height="2" fill="#c4b5fd" opacity="0.6">
        <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="56" y="38" width="2" height="2" fill="#c4b5fd" opacity="0.6">
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
      </rect>
    </g>
  );
}

const SPRITES = {
  gravelord:   GravelordSprite,
  lich_king:   LichKingSprite,
  fire_titan:  FireTitanSprite,
  ice_serpent: IceSerpentSprite,
  void_prince: VoidPrinceSprite,
};
