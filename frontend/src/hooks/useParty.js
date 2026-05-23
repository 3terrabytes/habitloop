import { useEffect, useRef, useState, useCallback } from 'react';
import { api, wsPartyUrl } from '../api';

// Subscribes to live party state over WebSocket. Re-connects with backoff
// if the socket drops (browser tab sleep, network blip, etc.). The hook
// fetches an initial state snapshot via REST so the UI paints immediately
// instead of waiting for the first STATE push.
//
// Returns:
//   state       — latest server-broadcast party snapshot, or null
//   connected   — boolean, whether the WS is open
//   refresh()   — manual REST re-fetch (handy after a mutation)
export default function useParty() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api.party.active();
      setState(data);
      return data;
    } catch (e) {
      setState(null);
      return null;
    }
  }, []);

  // (Re)connect the WebSocket. Captures the latest token at connect time.
  const connect = useCallback(() => {
    const token = localStorage.getItem('hq_token');
    if (!token) return;

    // Clean up any prior socket.
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) { /* ignore */ }
      wsRef.current = null;
    }

    let ws;
    try { ws = new WebSocket(wsPartyUrl(token)); }
    catch (e) { return; }
    wsRef.current = ws;

    ws.onopen = () => { setConnected(true); retryRef.current = 0; };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'STATE') setState(msg.state);
        else if (msg.type === 'CANCELLED') setState(null);
      } catch (e) { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect with backoff: 1s, 2s, 4s, 8s, 16s cap.
      retryRef.current = Math.min(retryRef.current + 1, 5);
      const delay = Math.pow(2, retryRef.current - 1) * 1000;
      setTimeout(() => {
        // Only reconnect if we still want a live socket.
        if (wsRef.current === ws) connect();
      }, delay);
    };

    ws.onerror = () => { try { ws.close(); } catch (e) { /* ignore */ } };
  }, []);

  useEffect(() => {
    refresh();
    connect();
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) { /* ignore */ }
        wsRef.current = null;
      }
    };
  }, [refresh, connect]);

  return { state, connected, refresh };
}
