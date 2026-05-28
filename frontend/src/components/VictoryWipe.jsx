// Pokémon-style victory wipe — two halves slide apart from centre,
// revealing a large "VICTORY!" card. Self-removing via the parent's
// timeout after ~900ms.

export default function VictoryWipe({ text = 'VICTORY!', subtitle = '' }) {
  return (
    <div className="victory-wipe" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8,
      overflow: 'hidden',
    }}>
      <div className="victory-half top" />
      <div className="victory-half bot" />
      <div className="victory-card">
        <div className="victory-text">{text}</div>
        {subtitle && <div className="victory-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
