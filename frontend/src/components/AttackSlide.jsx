// Big attack-symbol sprite that slides across the stage from one side
// to the other before damage lands. Pokémon-style "the sword animation
// flies across" feel. Parent triggers + auto-removes after ~360ms.
//
// Props:
//   element   — controls glyph + tint (fire, ice, lightning, holy, etc.)
//   direction — 'lr' (left→right, player→monster) or 'rl' (monster→player)

const ELEMENT_GLYPH = {
  fire:      '🔥', ice:       '❄️',  lightning: '⚡',
  poison:    '☠️', shadow:    '🌑',  arcane:    '✨',
  holy:      '☀️', physical:  '⚔️',
};

const ELEMENT_TINT = {
  fire: '#fb923c', ice: '#67e8f9', lightning: '#fde047',
  poison: '#86efac', shadow: '#a78bfa', arcane: '#c084fc',
  holy: '#fef3c7', physical: '#f87171',
};

export default function AttackSlide({ element = 'physical', direction = 'lr' }) {
  const glyph = ELEMENT_GLYPH[element] || ELEMENT_GLYPH.physical;
  const tint  = ELEMENT_TINT[element]  || ELEMENT_TINT.physical;
  return (
    <div className={`attack-slide attack-slide-${direction}`} style={{
      position: 'absolute', top: '40%', left: 0,
      pointerEvents: 'none', zIndex: 6,
      fontSize: 64, lineHeight: 1,
      filter: `drop-shadow(0 0 16px ${tint}) drop-shadow(0 0 24px ${tint})`,
    }}>
      {glyph}
    </div>
  );
}
