import { useEffect, useRef, useState, useCallback } from 'react';
import { wsTavernUrl } from '../api';

// Subscribes to a tavern's real-time presence WebSocket and exposes the
// roster of visitors plus a `send` function for movement broadcasts.
// Reconnects with backoff on drop.
//
// Returns:
//   peers       — Map of userId -> { username, level, appearance, equipped,
//                                    x, y, facing }. Excludes the local
//                                    player (parent owns local position).
//   sendMove(x,y,facing)  — fire-and-forget; throttled to ~10/sec by parent
//   connected   — bool, true iff the WS is open
//
// The hook expects the parent to pass `ownerUsername`. If null/undefined,
// the hook is a no-op (lets us mount unconditionally).

export default function useTavernPresence(ownerUsername) {
  const [peers, setPeers] = useState(new Map());
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const pendingTimerRef = useRef(null);
  const lastSendRef = useRef(0);

  const sendMove = useCallback((x, y, facing) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    // Throttle to 10/sec so we don't spam the socket on every RAF tick.
    const now = performance.now();
    if (now - lastSendRef.current < 100) return;
    lastSendRef.current = now;
    try { ws.send(JSON.stringify({ type: 'MOVE', x, y, facing })); }
    catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!ownerUsername) return undefined;
    const token = localStorage.getItem('hq_token');
    if (!token) return undefined;

    let active = true;

    const connect = () => {
      if (!active) return;
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      let ws;
      try { ws = new WebSocket(wsTavernUrl(token, ownerUsername)); }
      catch (e) { return; }
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'SNAPSHOT') {
            const m = new Map();
            for (const p of msg.peers) m.set(p.userId, p);
            setPeers(m);
          } else if (msg.type === 'JOIN') {
            setPeers(prev => {
              const m = new Map(prev);
              m.set(msg.peer.userId, msg.peer);
              return m;
            });
          } else if (msg.type === 'LEAVE') {
            setPeers(prev => {
              const m = new Map(prev);
              m.delete(msg.userId);
              return m;
            });
          } else if (msg.type === 'POS') {
            setPeers(prev => {
              const cur = prev.get(msg.userId);
              if (!cur) return prev;
              const m = new Map(prev);
              m.set(msg.userId, { ...cur, x: msg.x, y: msg.y, facing: msg.facing });
              return m;
            });
          }
        } catch (e) { /* ignore */ }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!active) return;
        retryRef.current = Math.min(retryRef.current + 1, 4);
        const delay = retryRef.current * 1000;
        pendingTimerRef.current = setTimeout(connect, delay);
      };
      ws.onerror = () => { try { ws.close(); } catch (e) { /* ignore */ } };
    };

    connect();

    return () => {
      active = false;
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) { /* ignore */ }
        wsRef.current = null;
      }
      setPeers(new Map());
      setConnected(false);
    };
  }, [ownerUsername]);

  return { peers, connected, sendMove };
}
