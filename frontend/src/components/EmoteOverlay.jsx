// Floating emote overlay rendered above an anchor element. Used on the
// home page, tavern (over the player), and raid (over the local member).
//
// Two flavors:
//   <EmoteOverlay emote={emoteCatalogEntry} />  — absolute-positioned, expects
//                                                  the parent to give it a
//                                                  positioned container.
//
// Emote sprites use catalog `glyph` (an emoji glyph) as the visual but
// gain richer motion via the `animation` CSS class — feels like an actual
// in-game emote rather than a static reaction.

export default function EmoteOverlay({ emote, offsetY = -10 }) {
  if (!emote) return null;
  return (
    <div className={`emote-overlay ${emote.animation}`} style={{
      position: 'absolute',
      bottom: `calc(100% + ${offsetY}px)`,
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: 38,
      pointerEvents: 'none',
      zIndex: 50,
      lineHeight: 1,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
    }}>
      {emote.glyph}
    </div>
  );
}
