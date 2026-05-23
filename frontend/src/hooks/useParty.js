import { useEffect, useRef, useState, useCallback } from 'react';
import { api, wsPartyUrl } from '../api';

// Subscribes to live party state over WebSocket.
//
// Critical gotcha solved here: the server rejects a WS upgrade if the user
// has no active party. That used to mean opening this page before creating
// a party would put the socket into a 1/2/4/8/16s backoff, so creating a
// party only "went live" 16s later (or required a page refresh). To fix
// that we expose `reconnect()` and have the page call it right after any
// mutation that changes party membership. We also clamp the no-party
// backoff to a much shorter ceiling.
//
// Returns:
//   state       — latest server-broadcast party snapshot, or null
//   connected   — boolean, whether the WS is currently open
//   refresh()   — manual REST re-fetch (handy after a mutation)
//   reconnect() — force-drop the WS and immediately re-open. Call after
//                 create/accept/start so the server picks up the new party.
export default function useParty() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const pendingTimerRef = useRef(null);

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

    // Clear any pending reconnect timer so we don't double-open.
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }

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
      // Cap retries at 1, 2, 3, 4, 5 seconds — fast enough that creating a
      // party feels instant, slow enough not to hammer the server when the
      // user genuinely has no party.
      retryRef.current = Math.min(retryRef.current + 1, 5);
      const delay = retryRef.current * 1000;
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        if (wsRef.current === ws) connect();
      }, delay);
    };

    ws.onerror = () => { try { ws.close(); } catch (e) { /* ignore */ } };
  }, []);

  // Force an immediate reconnect. Used after create/accept/start.
  const reconnect = useCallback(() => {
    retryRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    refresh();
    connect();
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) { /* ignore */ }
        wsRef.current = null;
      }
    };
  }, [refresh, connect]);

  return { state, connected, refresh, reconnect };
}
