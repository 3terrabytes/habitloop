// Particle burst rendered at the moment of impact. Eight tiny shards
// radiate from the centre in random directions, fading out over ~600ms.
// Element decides the colour. Mount the component when the hit lands;
// it self-removes via timeout in the parent.
//
// Usage:
//   const [burst, setBurst] = useState(null);
//   const fire = () => {
//     const id = Date.now();
//     setBurst({ id, element: 'fire' });
//     setTimeout(() => setBurst(b => (b && b.id === id) ? null : b), 700);
//   };
//   {burst && <HitBurst element={burst.element} />}

const ELEMENT_COLORS = {
  fire:      ['#fb923c', '#fbbf24', '#fef08a'],
  ice:       ['#67e8f9', '#a5f3fc', '#e0f2fe'],
  poison:    ['#86efac', '#bbf7d0', '#ecfccb'],
  shadow:    ['#a78bfa', '#c4b5fd', '#ddd6fe'],
  arcane:    ['#c084fc', '#e9d5ff', '#fae8ff'],
  holy:      ['#fde047', '#fef08a', '#ffffff'],
  physical:  ['#f87171', '#fda4af', '#fecaca'],
  lightning: ['#fde047', '#fef9c3', '#ffffff'],
};

export default function HitBurst({ element = 'physical', count = 9 }) {
  const palette = ELEMENT_COLORS[element] || ELEMENT_COLORS.physical;
  // Pre-computed angles spread around the circle. Done at render so each
  // burst is unique without runtime layout effects.
  const shards = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 28 + Math.random() * 22;
    return {
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      color: palette[i % palette.length],
      delay: Math.random() * 60,
      size: 4 + Math.random() * 4,
      rot: Math.random() * 360,
    };
  });
  return (
    <div className="hit-burst" style={{
      position: 'absolute', left: '50%', top: '50%',
      width: 0, height: 0, pointerEvents: 'none', zIndex: 4,
    }}>
      {shards.map((s, i) => (
        <span key={i} className="hit-shard" style={{
          width: s.size, height: s.size,
          background: s.color,
          boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
          // Use CSS custom properties so the keyframe can read them.
          '--tx': `${s.tx}px`,
          '--ty': `${s.ty}px`,
          '--rot': `${s.rot}deg`,
          animationDelay: `${s.delay}ms`,
        }} />
      ))}
      {/* Bright central flash that fades almost immediately. */}
      <span className="hit-core" style={{
        background: palette[0],
        boxShadow: `0 0 20px ${palette[0]}, 0 0 40px ${palette[1]}`,
      }} />
    </div>
  );
}
