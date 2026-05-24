// Full-stage colored vignette that flashes briefly. Used on crits and big
// boss hits to add weight. Parent decides when to mount/unmount via a
// keyed state object (so re-renders restart the animation).
//
// Usage:
//   const [flash, setFlash] = useState(null);
//   const trigger = () => {
//     const id = Date.now();
//     setFlash({ id, color: '#fde047' });
//     setTimeout(() => setFlash(f => (f && f.id === id) ? null : f), 380);
//   };
//   {flash && <ScreenFlash color={flash.color} />}

export default function ScreenFlash({ color = '#ffffff', intensity = 0.55 }) {
  return (
    <div className="screen-flash" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
      background: `radial-gradient(ellipse at center, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, transparent 75%)`,
    }} />
  );
}
