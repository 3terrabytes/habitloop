import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api';

// Cached emote catalog (fetched once per session). Keys: emote id, value:
// catalog row { id, name, glyph, animation, rarity, cost }.
let cachedCatalog = null;
let inflight = null;
async function loadCatalog() {
  if (cachedCatalog) return cachedCatalog;
  if (inflight) return inflight;
  inflight = api.avatar.emotes().then(data => {
    const map = {};
    for (const e of data.items || []) map[e.id] = e;
    cachedCatalog = map;
    return map;
  }).catch(() => ({}));
  return inflight;
}

// Custom DOM event bus. Anyone in the app can dispatch `tickd:emote`
// with { emoteId, emoteEntry } and any listener can react.
//
// useEmoteBus({ user }) returns:
//   activeEmote — currently-displayed emote entry (or null) for the local
//                  player. Auto-clears after ~1.6s.
//   triggerLocal() — plays the local player's equipped emote.

export default function useEmoteBus({ user }) {
  const [activeEmote, setActiveEmote] = useState(null);
  const [catalog, setCatalog] = useState({});
  const clearTimerRef = useRef(null);

  // Load catalog once.
  useEffect(() => {
    let alive = true;
    loadCatalog().then(c => { if (alive) setCatalog(c); });
    return () => { alive = false; };
  }, []);

  const showEmote = useCallback((emoteId) => {
    const entry = catalog[emoteId];
    if (!entry) return;
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setActiveEmote(entry);
    clearTimerRef.current = setTimeout(() => setActiveEmote(null), 1600);
  }, [catalog]);

  const triggerLocal = useCallback(() => {
    const emoteId = user?.equipped_emote || 'wave';
    showEmote(emoteId);
    // Broadcast to any open WS rooms so peers see it.
    window.dispatchEvent(new CustomEvent('tickd:emote-broadcast', {
      detail: { emoteId },
    }));
  }, [user, showEmote]);

  // Global E-key listener (skipped when typing in input).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      triggerLocal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerLocal]);

  // Also listen for the top-bar emote button (or anything else that
  // dispatches the broadcast event) so the local overlay always plays
  // in sync. Filters by emoteId so future per-emote choices work.
  useEffect(() => {
    const onBroadcast = (ev) => {
      const emoteId = ev?.detail?.emoteId;
      if (emoteId) showEmote(emoteId);
    };
    window.addEventListener('tickd:emote-broadcast', onBroadcast);
    return () => window.removeEventListener('tickd:emote-broadcast', onBroadcast);
  }, [showEmote]);

  // Listen for peer emotes (from raid / tavern WS subscriptions). The
  // hub-specific hooks broadcast `tickd:emote-peer` with { userId, emoteId }.
  // Each consumer page can filter by userId and route to the matching
  // avatar position.
  // (This hook returns activeEmote for the LOCAL player only; peer
  //  rendering lives in the page that owns the avatar positions.)

  return { activeEmote, triggerLocal, catalog };
}
