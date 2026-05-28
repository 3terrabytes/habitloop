// ── Pixel-art RPG avatar ────────────────────────────────────────────────────
// Fully customisable: skin, hair colour & style, eye colour, beard, gender,
// plus equipped weapon / armor / banner / badge / companion.
//
// Use:
//   <PixelCharacter
//     appearance={{ skin, hair, eyes, hair_style, gender, beard }}
//     equipped={{ weapon, armor, banner, badge, companion }}
//     size={120}
//   />
//
// Everything is optional — anything missing falls back to a sensible default.

import { useEffect, useRef, useState } from 'react';

// Pet idle tricks dispatched every 8-14s. Each ticks a CSS class onto the
// pet's <g> for the duration of its keyframe, then removes it so the species
// idle resumes. Used by both inline (PixelCharacter) and standalone
// (PetSprite) renderings so pets feel alive wherever they appear.
const TRICKS = [
  { cls: 'trick-stretch', ms: 900 },
  { cls: 'trick-bounce',  ms: 800 },
  { cls: 'trick-shake',   ms: 700 },
  { cls: 'trick-yawn',    ms: 1000 },
  { cls: 'trick-spin',    ms: 600 },
];
function useRandomPetTrick(active) {
  const [trick, setTrick] = useState(null);
  const timeoutRef = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const schedule = () => {
      // 8-14 seconds between tricks. Random for each pet so a row of pets
      // doesn't perform in unison.
      const delay = 8000 + Math.random() * 6000;
      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        const pick = TRICKS[Math.floor(Math.random() * TRICKS.length)];
        setTrick(pick.cls);
        setTimeout(() => {
          if (cancelled) return;
          setTrick(null);
          schedule();
        }, pick.ms);
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active]);
  return trick;
}

export const HAIR_STYLES = [
  { id: 0, name: 'Spiky' },
  { id: 1, name: 'Long' },
  { id: 2, name: 'Buzz' },
  { id: 3, name: 'Mohawk' },
  { id: 4, name: 'Curly' },
  { id: 5, name: 'Bald' },
];

export const BEARD_STYLES = [
  { id: 0, name: 'None' },
  { id: 1, name: 'Stubble' },
  { id: 2, name: 'Goatee' },
  { id: 3, name: 'Full' },
];

export const SKIN_TONES  = ['#f5d0b0', '#e8b88a', '#d4986a', '#a06840', '#704020', '#3d2412'];
export const HAIR_COLORS = ['#1a1a1a', '#5a2d00', '#8B4513', '#c97a3a', '#e6c068', '#f0e0a0', '#7a4a8a', '#c83a3a', '#3a8aaa', '#9a9a9a'];
export const EYE_COLORS  = ['#2a4a8a', '#3a8a4a', '#8a5a2a', '#5a2a8a', '#8a2a2a', '#2a8a8a', '#1a1a1a'];

export default function PixelCharacter({
  appearance = {},
  equipped   = {},
  size       = 120,
  cheering   = false,
  action     = null,   // 'slash' | 'cast' | 'heal' | 'guard' | 'hurt' | null
}) {
  // ── Appearance defaults ──────────────────────────────────────────────────
  // Accept both bare names ({skin, hair, ...}) and prefixed names
  // ({avatar_skin, avatar_hair, ...}) so callers can pass the user object directly.
  const skin       = appearance.skin       ?? appearance.avatar_skin       ?? '#e8b88a';
  const hair       = appearance.hair       ?? appearance.avatar_hair       ?? '#8B4513';
  const eyes       = appearance.eyes       ?? appearance.avatar_eyes       ?? '#2a4a8a';
  const hairStyle  = appearance.hair_style ?? appearance.avatar_hair_style ?? 0;
  const gender     = appearance.gender     ?? appearance.avatar_gender     ?? 0; // 0 male, 1 female
  const beard      = appearance.beard      ?? appearance.avatar_beard      ?? 0;

  // ── Equipped gear ────────────────────────────────────────────────────────
  const weapon    = equipped.weapon;
  const armor     = equipped.armor;
  const companion = equipped.companion;
  const banner    = equipped.banner;
  const badge     = equipped.badge;

  const bodyColor   = armor ? armorColor(armor.rarity)     : '#6b5b9a';
  const armorHL     = armor ? armorHighlight(armor.rarity) : '#9c89c8';
  const capeColor   = armor ? capeTone(armor.rarity)       : null;
  const skinDark    = darken(skin, 25);
  const hairDark    = darken(hair, 30);

  // Parse banner.color (e.g. "linear-gradient(90deg,#7f1d1d,#dc2626)") to two stops
  const bannerStops = banner ? parseGradientStops(banner.color) : null;
  const bannerId    = banner ? `banner-${banner.id || 'x'}-${size}` : null;
  const isLegendaryArmor = armor && armor.rarity === 'legendary';
  const isEpicArmor      = armor && armor.rarity === 'epic';

  // Random pet trick — fires every 8-14s while the pet is mounted.
  const trick = useRandomPetTrick(!!companion);

  return (
    <div className={action ? `char-${action}` : ''} style={{ width: size, height: size, imageRendering: 'pixelated', flexShrink: 0, overflow: 'visible' }}>
      <svg
        width={size} height={size}
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: 'pixelated', display: 'block', overflow: 'visible' }}
        shapeRendering="crispEdges"
      >
        {/* ── BANNER aura (behind everything) ───────────────────────────── */}
        {banner && bannerStops && (
          <defs>
            <linearGradient id={bannerId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={bannerStops[0]} />
              <stop offset="100%" stopColor={bannerStops[1]} />
            </linearGradient>
          </defs>
        )}
        {banner && (
          <>
            <rect x="16" y="6" width="48" height="68" rx="2"
                  fill={bannerStops ? `url(#${bannerId})` : '#6366f1'}
                  opacity="0.32" />
            {/* banner pole tips top */}
            <rect x="14" y="6" width="2" height="3" fill={bannerStops?.[0] || '#6366f1'} opacity="0.7" />
            <rect x="64" y="6" width="2" height="3" fill={bannerStops?.[1] || '#6366f1'} opacity="0.7" />
          </>
        )}

        {/* Soft ground shadow */}
        <ellipse cx="40" cy="74" rx="18" ry="3" fill="rgba(0,0,0,0.35)" />

        {/* ── CAPE (armor) ─────────────────────────────────────────────── */}
        {capeColor && (
          <g>
            <rect x="26" y="36" width="6" height="22" fill={capeColor} />
            <rect x="48" y="36" width="6" height="22" fill={capeColor} />
            <rect x="26" y="56" width="6" height="3" fill={darken(capeColor, 30)} />
            <rect x="48" y="56" width="6" height="3" fill={darken(capeColor, 30)} />
          </g>
        )}

        {/* ── LEGS — grouped so emotes can fold/cross them ────────────── */}
        <g className="pc-leg pc-leg-left">
          <rect x="32" y="54" width="6" height="14" fill="#3b3060" />
          <rect x="32" y="54" width="6" height="2"  fill="#251a40" />
          {/* Boot */}
          <rect x="31" y="66" width="8" height="4" fill="#2a2020" />
          <rect x="30" y="68" width="4" height="2" fill="#1a1010" />
        </g>
        <g className="pc-leg pc-leg-right">
          <rect x="42" y="54" width="6" height="14" fill="#3b3060" />
          <rect x="42" y="54" width="6" height="2"  fill="#251a40" />
          {/* Boot */}
          <rect x="41" y="66" width="8" height="4" fill="#2a2020" />
          <rect x="40" y="68" width="4" height="2" fill="#1a1010" />
        </g>

        {/* ── TORSO ────────────────────────────────────────────────────── */}
        <g className="pc-torso">
          <rect x="28" y="36" width="24" height="20" fill={bodyColor} />
          {/* Belt / waist */}
          <rect x="28" y="52" width="24" height="3" fill={darken(bodyColor, 20)} />
          <rect x="38" y="52" width="4"  height="3" fill="#f5c542" />
          {/* Chest highlight */}
          <rect x="30" y="38" width="20" height="2"  fill={armorHL} />
          {/* Center line */}
          <rect x="39" y="38" width="2"  height="14" fill={darken(bodyColor, 25)} />
          {/* Shoulder guards */}
          <rect x="25" y="36" width="6"  height="6"  fill={armorHL} />
          <rect x="49" y="36" width="6"  height="6"  fill={armorHL} />
          {/* Female: subtle torso shaping */}
          {gender === 1 && (
            <>
              <rect x="30" y="42" width="4" height="2" fill={darken(bodyColor, 15)} />
              <rect x="46" y="42" width="4" height="2" fill={darken(bodyColor, 15)} />
            </>
          )}
        </g>

        {/* ── ARMS — grouped so emotes can wave/clap/flex ──────────────── */}
        <g className="pc-arm pc-arm-left">
          <rect x="22" y="38" width="6" height="16" fill={bodyColor} />
          <rect x="22" y="38" width="6" height="2"  fill={armorHL} />
          {/* Hand */}
          <rect x="22" y="52" width="6" height="4" fill={skin} />
        </g>
        <g className="pc-arm pc-arm-right">
          <rect x="52" y="38" width="6" height="16" fill={bodyColor} />
          <rect x="52" y="38" width="6" height="2"  fill={armorHL} />
          {/* Hand */}
          <rect x="52" y="52" width="6" height="4" fill={skin} />
          {/* Weapon travels with the right arm so it visually stays in-hand */}
          {weapon ? renderWeapon(weapon) : (
            <>
              {/* Default plain sword */}
              <rect x="55" y="30" width="3" height="26" fill="#c0c0c0" />
              <rect x="53" y="42" width="7" height="3"  fill="#8b6914" />
              <rect x="55" y="28" width="3" height="4"  fill="#f0d060" />
            </>
          )}
        </g>

        {/* ── NECK ─────────────────────────────────────────────────────── */}
        <rect x="36" y="30" width="8" height="6" fill={skinDark} />

        {/* ── HEAD (entire head group — emote keyframes target this for
            nodding / bowing / tilting) ─────────────────────────────── */}
        <g className="pc-head">
          <rect x="28" y="12" width="24" height="20" fill={skin} />
          {/* Subtle face shading */}
          <rect x="28" y="30" width="24" height="2" fill={skinDark} />
          {/* Ears */}
          <rect x="24" y="20" width="4" height="6" fill={skin} />
          <rect x="52" y="20" width="4" height="6" fill={skin} />
          <rect x="24" y="24" width="4" height="2" fill={skinDark} />
          <rect x="52" y="24" width="4" height="2" fill={skinDark} />

          {/* Hair */}
          {renderHair(hairStyle, hair, hairDark, gender)}

          {/* Eyes */}
          <rect x="32" y="20" width="6" height="5" fill="white" />
          <rect x="42" y="20" width="6" height="5" fill="white" />
          <rect x="34" y="21" width="3" height="3" fill={eyes} />
          <rect x="44" y="21" width="3" height="3" fill={eyes} />
          <rect x="35" y="22" width="1" height="1" fill="black" />
          <rect x="45" y="22" width="1" height="1" fill="black" />
          <rect x="34" y="21" width="1" height="1" fill="white" opacity="0.8" />
          <rect x="44" y="21" width="1" height="1" fill="white" opacity="0.8" />
          {/* Brows */}
          <rect x="32" y="18" width="6" height="2" fill={hairDark} />
          <rect x="42" y="18" width="6" height="2" fill={hairDark} />

          {/* Nose */}
          <rect x="38" y="25" width="4" height="2" fill={skinDark} />

          {/* Mouth */}
          {gender === 1 ? (
            <>
              <rect x="35" y="28" width="10" height="2" fill="#c84a5a" />
              <rect x="36" y="27" width="8"  height="1" fill="#a83a4a" />
            </>
          ) : (
            <rect x="35" y="28" width="10" height="2" fill="#9c5040" />
          )}

          {/* Beard */}
          {renderBeard(beard, hair, hairDark)}
        </g>

        {/* ── HELM hint when armor is equipped ─────────────────────────── */}
        {armor && hairStyle !== 5 && (
          <rect x="28" y="14" width="24" height="2" fill={armorHL} opacity="0.55" />
        )}

        {/* ── CROWN for legendary armor ─────────────────────────────────── */}
        {isLegendaryArmor && (
          <g>
            <rect x="34" y="6"  width="12" height="3" fill="#f0d060" />
            <rect x="34" y="4"  width="2"  height="3" fill="#f0d060" />
            <rect x="39" y="3"  width="2"  height="4" fill="#f0d060" />
            <rect x="44" y="4"  width="2"  height="3" fill="#f0d060" />
            <rect x="39" y="4"  width="2"  height="1" fill="#ef4444" />
            <rect x="34" y="8"  width="12" height="1" fill="#8b6914" />
          </g>
        )}
        {/* Epic armor gets a simpler band */}
        {isEpicArmor && (
          <rect x="34" y="6" width="12" height="2" fill="#9a7fce" opacity="0.85" />
        )}

        {/* ── BADGE plaque on chest ─────────────────────────────────────── */}
        {badge && (
          <g>
            <title>{badge.name}{badge.desc ? `: ${badge.desc}` : ''}</title>
            <rect x="36" y="42" width="8" height="8" fill={rarityFill(badge.rarity)} stroke="#1a1a1a" strokeWidth="0.6" />
            <rect x="36" y="42" width="8" height="2" fill={rarityHighlight(badge.rarity)} />
            <text x="40" y="49" fontSize="6" textAnchor="middle" fontFamily="serif">{badge.emoji}</text>
          </g>
        )}

        {/* ── COMPANION (pet) — inline on the player SVG. Used on the home
            screen so the home avatar shows the pet at a glance. Battle and
            lobby scenes use <PetSprite /> below for a much larger sprite. */}
        {companion && (
          <g className={`pet pet-${companion.id}${cheering ? ' pet-cheer' : ''}${trick ? ' ' + trick : ''}${companion.pet_evolved ? ' pet-evolved' : ''}`}
             shapeRendering="crispEdges"
             transform="translate(-7 -37) scale(1.5)"
             style={{ transformOrigin: 'center' }}>
            <title>{companion.name}{companion.pet_evolved ? ' ⭐ EVOLVED' : ''}: {companion.desc}</title>
            <ellipse cx="14" cy="74" rx="6" ry="1.5" fill="rgba(0,0,0,0.35)" />
            {renderPet(companion.id, cheering)}
            {/* Evolved pet: gold crown above head + warm aura. Drawn outside
                the pet group so it survives trick transforms. */}
            {companion.pet_evolved && (
              <g>
                <rect x="11" y="59" width="6" height="1" fill="#fde047" />
                <rect x="11" y="58" width="1" height="1" fill="#fde047" />
                <rect x="13" y="57" width="1" height="2" fill="#fde047" />
                <rect x="16" y="58" width="1" height="1" fill="#fde047" />
                <ellipse cx="14" cy="68" rx="9" ry="9" fill="none" stroke="#fde047" strokeOpacity="0.25" />
              </g>
            )}
            {/* Rare+ pets get an animated sparkle dot drifting above them. */}
            {companion.rarity && companion.rarity !== 'common' && (
              <g className="pet-sparkle">
                <rect x="19" y="60" width="1" height="1" fill={sparkleColor(companion.rarity)} />
                <rect x="20" y="59" width="1" height="1" fill={sparkleColor(companion.rarity)} opacity="0.7" />
                <rect x="18" y="59" width="1" height="1" fill={sparkleColor(companion.rarity)} opacity="0.7" />
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Pet size table (relative to the partnered player size) ───────────────
// Cap at 0.5 so pets never dwarf the player. Evolved pets get +0.10. Used
// by <PetSprite /> in battle / lobby scenes where the pet needs to be big
// enough to read its own emote animation.
const PET_SCALE = {
  pet_cat:    0.60,
  pet_fox:    0.65,
  pet_owl:    0.75,
  pet_frog:   0.40,
  pet_dragon: 1.00,
};
function petSizeFor(pet, playerSize) {
  if (!pet) return 0;
  const baseMult = PET_SCALE[pet.id] || 0.60;
  const evolveBonus = pet.pet_evolved ? 0.10 : 0;
  const effective = Math.min(1.0, baseMult + evolveBonus);
  return Math.round(playerSize * 0.5 * effective);
}

// Standalone pet sprite — render the pet outside the player SVG so it can
// be sized freely. Used in raid lobby + battle scenes.
//   <PetSprite pet={equipped.companion} playerSize={130} cheering={false} />
export function PetSprite({ pet, playerSize = 120, cheering = false }) {
  // Hook must run unconditionally — bail by rendering null AFTER it.
  const trick = useRandomPetTrick(!!pet);
  if (!pet) return null;
  const size = petSizeFor(pet, playerSize);
  if (size <= 0) return null;
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      imageRendering: 'pixelated', flexShrink: 0, overflow: 'visible',
    }}
    title={pet.name}>
      <svg
        width={size} height={size}
        viewBox="0 0 28 16"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: 'pixelated', display: 'block', overflow: 'visible' }}
        shapeRendering="crispEdges"
      >
        <g className={`pet pet-${pet.id}${cheering ? ' pet-cheer' : ''}${trick ? ' ' + trick : ''}`}
           transform="translate(-2 -58)"
           style={{ transformOrigin: 'center' }}>
          {renderPet(pet.id, cheering)}
          {pet.rarity && pet.rarity !== 'common' && (
            <g className="pet-sparkle">
              <rect x="19" y="60" width="1" height="1" fill={sparkleColor(pet.rarity)} />
              <rect x="20" y="59" width="1" height="1" fill={sparkleColor(pet.rarity)} opacity="0.7" />
              <rect x="18" y="59" width="1" height="1" fill={sparkleColor(pet.rarity)} opacity="0.7" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

// ── Hair renderers ────────────────────────────────────────────────────────
function renderHair(style, hair, hairDark) {
  switch (style) {
    case 0: // Spiky
      return (
        <g>
          <rect x="28" y="10" width="24" height="6" fill={hairDark} />
          <rect x="30" y="8"  width="4"  height="5" fill={hair} />
          <rect x="36" y="6"  width="4"  height="7" fill={hair} />
          <rect x="42" y="8"  width="4"  height="5" fill={hair} />
          <rect x="46" y="10" width="4"  height="4" fill={hair} />
          <rect x="28" y="10" width="4"  height="4" fill={hair} />
          <rect x="24" y="14" width="4"  height="6" fill={hair} />
          <rect x="52" y="14" width="4"  height="6" fill={hair} />
        </g>
      );
    case 1: // Long
      return (
        <g>
          <rect x="26" y="10" width="28" height="8"  fill={hair} />
          <rect x="26" y="10" width="28" height="2"  fill={hairDark} />
          <rect x="24" y="12" width="4"  height="22" fill={hair} />
          <rect x="52" y="12" width="4"  height="22" fill={hair} />
          <rect x="28" y="14" width="24" height="4"  fill={hair} />
          <rect x="22" y="32" width="3"  height="14" fill={hair} opacity="0.85" />
          <rect x="55" y="32" width="3"  height="14" fill={hair} opacity="0.85" />
        </g>
      );
    case 2: // Buzz cut
      return (
        <g>
          <rect x="28" y="12" width="24" height="4" fill={hair} />
          <rect x="28" y="12" width="24" height="1" fill={hairDark} />
        </g>
      );
    case 3: // Mohawk
      return (
        <g>
          <rect x="28" y="14" width="24" height="2" fill={darken(hair, 50)} opacity="0.4" />
          <rect x="36" y="6"  width="8"  height="10" fill={hair} />
          <rect x="36" y="6"  width="8"  height="2"  fill={hairDark} />
          <rect x="38" y="4"  width="4"  height="3"  fill={hair} />
        </g>
      );
    case 4: // Curly afro
      return (
        <g>
          <rect x="26" y="8"  width="28" height="10" fill={hair} />
          <rect x="24" y="10" width="4"  height="10" fill={hair} />
          <rect x="52" y="10" width="4"  height="10" fill={hair} />
          <rect x="28" y="8"  width="2" height="2" fill={hairDark} />
          <rect x="34" y="10" width="2" height="2" fill={hairDark} />
          <rect x="42" y="8"  width="2" height="2" fill={hairDark} />
          <rect x="48" y="10" width="2" height="2" fill={hairDark} />
        </g>
      );
    case 5: // Bald
      return null;
    default:
      return null;
  }
}

// ── Beard renderers ──────────────────────────────────────────────────────
function renderBeard(style, hair, hairDark) {
  if (style === 0) return null;
  switch (style) {
    case 1: // Stubble
      return (
        <g opacity="0.55">
          <rect x="32" y="29" width="2" height="1" fill={hairDark} />
          <rect x="36" y="30" width="2" height="1" fill={hairDark} />
          <rect x="42" y="30" width="2" height="1" fill={hairDark} />
          <rect x="46" y="29" width="2" height="1" fill={hairDark} />
          <rect x="34" y="31" width="3" height="1" fill={hairDark} />
          <rect x="43" y="31" width="3" height="1" fill={hairDark} />
        </g>
      );
    case 2: // Goatee
      return (
        <g>
          <rect x="36" y="30" width="8" height="3" fill={hair} />
          <rect x="36" y="30" width="8" height="1" fill={hairDark} />
        </g>
      );
    case 3: // Full beard
      return (
        <g>
          <rect x="30" y="29" width="20" height="4" fill={hair} />
          <rect x="30" y="29" width="20" height="1" fill={hairDark} />
          <rect x="32" y="32" width="16" height="2" fill={hair} />
          <rect x="34" y="27" width="12" height="2" fill={hair} />
        </g>
      );
    default:
      return null;
  }
}

// ── Color helpers ────────────────────────────────────────────────────────
function armorColor(rarity) {
  const map = { common: '#8a9aaa', rare: '#4a6fa5', epic: '#6a4fa5', legendary: '#c8860a' };
  return map[rarity] || '#6b5b9a';
}
function armorHighlight(rarity) {
  const map = { common: '#b0c0cc', rare: '#7a9fce', epic: '#9a7fce', legendary: '#f0b040' };
  return map[rarity] || '#9c89c8';
}
function capeTone(rarity) {
  const map = { common: '#6a5030', rare: '#1a3a7a', epic: '#4a1a7a', legendary: '#8a4a00' };
  return map[rarity] || null;
}
function darken(hex, amt = 30) {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex;
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - amt);
  const g = Math.max(0, ((num >> 8) & 0xff) - amt);
  const b = Math.max(0, (num & 0xff) - amt);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Rarity → SVG plaque colors (used by badge render)
function rarityFill(rarity) {
  const map = { common: '#475569', rare: '#1e40af', epic: '#5b21b6', legendary: '#b45309' };
  return map[rarity] || '#475569';
}
function rarityHighlight(rarity) {
  const map = { common: '#94a3b8', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };
  return map[rarity] || '#94a3b8';
}

// Parse a CSS linear-gradient string and return its first two hex stops.
// Falls back to null if the string isn't a recognised gradient.
function parseGradientStops(str) {
  if (!str || typeof str !== 'string') return null;
  const hexes = str.match(/#[0-9a-fA-F]{3,8}/g);
  if (!hexes || hexes.length < 2) {
    return hexes && hexes.length === 1 ? [hexes[0], hexes[0]] : null;
  }
  return [hexes[0], hexes[1]];
}

// ── Pixel-art weapon sprites ─────────────────────────────────────────────
// Drawn in the character's right hand, anchored around (55, 50). Each class
// gets its own silhouette; rarity drives the colour palette.
function renderWeapon(weapon) {
  // Rarity → palette. Blade colour, guard colour, accent colour.
  const RARITY_PALETTE = {
    common:    { blade: '#cbd5e1', guard: '#8b6914', accent: '#f0d060', glow: 'none' },
    rare:      { blade: '#93c5fd', guard: '#1e3a8a', accent: '#60a5fa', glow: 'drop-shadow(0 0 1px #3b82f6)' },
    epic:      { blade: '#c4b5fd', guard: '#4c1d95', accent: '#a78bfa', glow: 'drop-shadow(0 0 1.5px #8b5cf6)' },
    legendary: { blade: '#fde68a', guard: '#78350f', accent: '#fbbf24', glow: 'drop-shadow(0 0 2px #f59e0b)' },
    mythic:    { blade: '#f5d0fe', guard: '#86198f', accent: '#f0abfc', glow: 'drop-shadow(0 0 2.5px #d946ef)' },
  };
  const p = RARITY_PALETTE[weapon.rarity] || RARITY_PALETTE.common;
  const cls = weapon.weaponClass;

  // Group wrapper applies glow filter on rarer weapons.
  const wrap = (children) => (
    <g style={{ filter: p.glow !== 'none' ? p.glow : undefined }}>{children}</g>
  );

  switch (cls) {
    case 'sword': return wrap(<>
      {/* Crosshair vertical blade, crossguard, hilt, pommel */}
      <rect x="56" y="26" width="3" height="22" fill={p.blade} />
      <rect x="55" y="26" width="1" height="22" fill="#fff" opacity="0.35" />
      <rect x="52" y="44" width="11" height="2" fill={p.guard} />
      <rect x="55" y="46" width="5" height="6" fill="#3a2718" />
      <rect x="55" y="52" width="5" height="2" fill={p.accent} />
    </>);
    case 'staff': return wrap(<>
      {/* Pole with glowing orb */}
      <rect x="57" y="28" width="2" height="28" fill={p.guard} />
      <rect x="57" y="28" width="1" height="28" fill={p.accent} opacity="0.6" />
      <circle cx="58" cy="26" r="4" fill={p.accent} />
      <circle cx="58" cy="26" r="2" fill="#fff" opacity="0.7" />
    </>);
    case 'wand': return wrap(<>
      {/* Short pole with a star tip */}
      <rect x="57" y="38" width="2" height="18" fill="#1f1f1f" />
      <rect x="55" y="34" width="6" height="4" fill={p.accent} />
      <rect x="56" y="32" width="4" height="2" fill={p.accent} />
      <rect x="57" y="35" width="2" height="2" fill="#fff" />
    </>);
    case 'bow': return wrap(<>
      {/* Bow curve as two stacked arcs; string as line; nocked arrow */}
      <path d="M55,26 Q49,38 55,50" stroke={p.guard} strokeWidth="2" fill="none" />
      <path d="M55,26 Q53,38 55,50" stroke={p.accent} strokeWidth="1" fill="none" opacity="0.7" />
      <line x1="55" y1="26" x2="55" y2="50" stroke="#fff" strokeWidth="0.5" opacity="0.5" />
      {/* Arrow */}
      <rect x="48" y="37" width="10" height="1" fill={p.blade} />
      <path d="M48,38 L45,37 L48,36 Z" fill={p.accent} />
    </>);
    case 'axe': return wrap(<>
      {/* Vertical handle + chunky axe head */}
      <rect x="57" y="30" width="2" height="26" fill={p.guard} />
      <path d="M51,30 L62,30 L62,40 L57,42 L51,40 Z" fill={p.blade} />
      <path d="M51,30 L62,30 L62,32 L51,32 Z" fill="#fff" opacity="0.4" />
      <rect x="56" y="36" width="3" height="2" fill={p.accent} />
    </>);
    case 'hammer': return wrap(<>
      {/* Handle + brick-like hammer head */}
      <rect x="57" y="34" width="2" height="22" fill={p.guard} />
      <rect x="50" y="28" width="14" height="8" fill={p.blade} stroke="#000" strokeWidth="0.5" />
      <rect x="50" y="28" width="14" height="2" fill="#fff" opacity="0.35" />
      <rect x="53" y="31" width="2" height="2" fill={p.accent} />
      <rect x="59" y="31" width="2" height="2" fill={p.accent} />
    </>);
    case 'dagger': return wrap(<>
      {/* Short blade with crossguard */}
      <rect x="56" y="38" width="2" height="14" fill={p.blade} />
      <rect x="55" y="38" width="1" height="14" fill="#fff" opacity="0.4" />
      <rect x="53" y="50" width="8" height="2" fill={p.guard} />
      <rect x="56" y="52" width="2" height="4" fill="#3a2718" />
      <rect x="56" y="56" width="2" height="1" fill={p.accent} />
    </>);
    case 'lance': return wrap(<>
      {/* Long pole with spearhead at top */}
      <rect x="57" y="22" width="2" height="34" fill={p.guard} />
      <path d="M55,22 L61,22 L58,14 Z" fill={p.blade} />
      <path d="M56,22 L60,22 L58,16 Z" fill="#fff" opacity="0.5" />
      <rect x="55" y="28" width="6" height="2" fill={p.accent} />
    </>);
    case 'scythe': return wrap(<>
      {/* Curved blade off the top of a long handle */}
      <rect x="57" y="28" width="2" height="28" fill={p.guard} />
      <path d="M59,28 Q70,26 64,18 Q60,20 58,26 Z" fill={p.blade} />
      <path d="M59,28 Q68,26 64,20" stroke="#fff" strokeWidth="0.5" opacity="0.5" fill="none" />
    </>);
    default: return wrap(<>
      <rect x="55" y="30" width="3" height="22" fill={p.blade} />
      <rect x="53" y="44" width="7" height="2" fill={p.guard} />
    </>);
  }
}

// ── Pixel-art pet sprites ────────────────────────────────────────────────
// Each pet is drawn on the ground at the character's left (around x:8-22, y:64-72).
// All coordinates are integers so the sprite is crisp at any scale.
function renderPet(id, cheering) {
  switch (id) {
    case 'pet_cat':    return <CatSprite />;
    case 'pet_fox':    return <FoxSprite />;
    case 'pet_owl':    return <OwlSprite />;
    case 'pet_dragon': return <DragonSprite cheering={cheering} />;
    case 'pet_frog':   return <FrogSprite />;
    default:           return null;
  }
}

function sparkleColor(rarity) {
  switch (rarity) {
    case 'legendary': return '#fbbf24';
    case 'epic':      return '#c4b5fd';
    case 'rare':      return '#93c5fd';
    case 'mythic':    return '#f0abfc';
    default:          return '#ffffff';
  }
}

function FrogSprite() {
  const G  = '#22c55e';
  const GD = '#15803d';
  const GL = '#86efac';
  return (
    <g>
      {/* eyes (bulging on top) */}
      <rect x="10" y="62" width="2" height="2" fill={G} />
      <rect x="13" y="62" width="2" height="2" fill={G} />
      <rect x="11" y="63" width="1" height="1" fill="#1a1a1a" />
      <rect x="14" y="63" width="1" height="1" fill="#1a1a1a" />
      {/* body */}
      <rect x="9"  y="64" width="7" height="6" fill={G} />
      <rect x="10" y="68" width="5" height="2" fill={GL} />
      <rect x="9"  y="64" width="7" height="1" fill={GD} />
      {/* legs */}
      <rect x="8"  y="70" width="3" height="2" fill={GD} />
      <rect x="14" y="70" width="3" height="2" fill={GD} />
      <rect x="8"  y="72" width="2" height="1" fill={GD} />
      <rect x="15" y="72" width="2" height="1" fill={GD} />
      {/* mouth */}
      <rect x="11" y="67" width="3" height="1" fill={GD} />
    </g>
  );
}

function CatSprite() {
  const O = '#f59e0b';  // orange body
  const OD = '#d97706'; // darker orange (stripes/ears)
  const OL = '#fbbf24'; // lighter orange (belly highlight)
  return (
    <g>
      {/* ears */}
      <rect x="9"  y="62" width="1" height="2" fill={OD} />
      <rect x="14" y="62" width="1" height="2" fill={OD} />
      {/* head */}
      <rect x="9"  y="64" width="6" height="4" fill={O} />
      {/* eyes */}
      <rect x="10" y="65" width="1" height="1" fill="#1a1a1a" />
      <rect x="13" y="65" width="1" height="1" fill="#1a1a1a" />
      {/* nose */}
      <rect x="11" y="66" width="2" height="1" fill="#ec4899" />
      {/* body */}
      <rect x="9"  y="68" width="8" height="4" fill={O} />
      <rect x="10" y="69" width="6" height="2" fill={OL} />
      {/* stripes */}
      <rect x="11" y="68" width="1" height="1" fill={OD} />
      <rect x="14" y="68" width="1" height="1" fill={OD} />
      <rect x="12" y="71" width="1" height="1" fill={OD} />
      {/* legs */}
      <rect x="9"  y="72" width="2" height="1" fill={OD} />
      <rect x="15" y="72" width="2" height="1" fill={OD} />
      {/* tail */}
      <rect x="17" y="68" width="1" height="2" fill={O} />
      <rect x="18" y="65" width="1" height="3" fill={O} />
      <rect x="18" y="64" width="1" height="1" fill={OD} />
    </g>
  );
}

function FoxSprite() {
  const R = '#ef4444';  // red body
  const RD = '#b91c1c'; // darker red
  const W = '#f8fafc';  // white muzzle/tail tip
  return (
    <g>
      {/* ear tufts (red w/ dark tip) */}
      <rect x="9"  y="61" width="1" height="1" fill={RD} />
      <rect x="9"  y="62" width="1" height="2" fill={R}  />
      <rect x="14" y="61" width="1" height="1" fill={RD} />
      <rect x="14" y="62" width="1" height="2" fill={R}  />
      {/* head */}
      <rect x="9"  y="64" width="6" height="3" fill={R} />
      {/* white muzzle */}
      <rect x="11" y="66" width="2" height="1" fill={W} />
      <rect x="11" y="67" width="2" height="1" fill={W} />
      {/* eyes */}
      <rect x="10" y="65" width="1" height="1" fill="#1a1a1a" />
      <rect x="13" y="65" width="1" height="1" fill="#1a1a1a" />
      {/* body */}
      <rect x="10" y="68" width="7" height="3" fill={R} />
      <rect x="10" y="71" width="7" height="1" fill={RD} />
      {/* legs */}
      <rect x="10" y="72" width="2" height="1" fill={RD} />
      <rect x="15" y="72" width="2" height="1" fill={RD} />
      {/* bushy tail with white tip */}
      <rect x="17" y="67" width="2" height="3" fill={R}  />
      <rect x="18" y="66" width="2" height="2" fill={R}  />
      <rect x="19" y="65" width="1" height="2" fill={W}  />
    </g>
  );
}

function OwlSprite() {
  const B  = '#78350f'; // dark brown
  const BL = '#a16207'; // lighter brown belly
  const Y  = '#fbbf24'; // eye yellow
  return (
    <g>
      {/* ear tufts */}
      <rect x="9"  y="62" width="2" height="2" fill={B} />
      <rect x="13" y="62" width="2" height="2" fill={B} />
      {/* head/body fused */}
      <rect x="9"  y="64" width="6" height="8" fill={B} />
      {/* belly stripes */}
      <rect x="11" y="67" width="2" height="4" fill={BL} />
      <rect x="11" y="68" width="2" height="1" fill={B} opacity="0.6" />
      <rect x="11" y="70" width="2" height="1" fill={B} opacity="0.6" />
      {/* big eyes */}
      <rect x="10" y="65" width="2" height="2" fill={Y} />
      <rect x="12" y="65" width="2" height="2" fill={Y} />
      <rect x="11" y="66" width="1" height="1" fill="#1a1a1a" />
      <rect x="13" y="66" width="1" height="1" fill="#1a1a1a" />
      {/* beak */}
      <rect x="12" y="67" width="1" height="1" fill="#f59e0b" />
      {/* feet */}
      <rect x="10" y="72" width="2" height="1" fill="#fbbf24" />
      <rect x="13" y="72" width="2" height="1" fill="#fbbf24" />
    </g>
  );
}

function DragonSprite({ cheering }) {
  const G  = '#10b981'; // emerald body
  const GD = '#065f46'; // dark green
  const GL = '#34d399'; // light green (wings)
  return (
    <g>
      {/* wings (spread) */}
      <rect x="6"  y="65" width="3" height="3" fill={GL} />
      <rect x="7"  y="64" width="2" height="1" fill={GL} />
      <rect x="19" y="65" width="3" height="3" fill={GL} />
      <rect x="19" y="64" width="2" height="1" fill={GL} />
      {/* body */}
      <rect x="9"  y="66" width="10" height="5" fill={G} />
      <rect x="9"  y="71" width="10" height="1" fill={GD} />
      {/* head (snout pokes right slightly) */}
      <rect x="11" y="64" width="6" height="3" fill={G} />
      {/* spikes on back */}
      <rect x="12" y="63" width="1" height="1" fill={GD} />
      <rect x="14" y="63" width="1" height="1" fill={GD} />
      <rect x="16" y="63" width="1" height="1" fill={GD} />
      {/* eye */}
      <rect x="15" y="65" width="1" height="1" fill="#fde047" />
      <rect x="15" y="65" width="1" height="1" fill="#dc2626" opacity="0.7" />
      {/* legs */}
      <rect x="10" y="72" width="2" height="1" fill={GD} />
      <rect x="16" y="72" width="2" height="1" fill={GD} />
      {/* tail */}
      <rect x="19" y="68" width="1" height="2" fill={G} />
      <rect x="20" y="68" width="1" height="1" fill={G} />
      <rect x="21" y="67" width="1" height="1" fill={GD} />
      {/* fire breath (animated on cheer) */}
      {cheering && (
        <>
          <rect x="17" y="65" width="1" height="1" fill="#f59e0b" />
          <rect x="18" y="65" width="1" height="1" fill="#dc2626" />
        </>
      )}
    </g>
  );
}
