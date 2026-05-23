import { useEffect, useRef, useState, useCallback } from 'react';
import { api, wsPartyUrl } from '../api';

// Subscribes to live party state. WebSocket is the primary transport, but
// we also REST-poll every POLL_MS as a safety net so the UI never gets stuck
// stale if the socket drops a message during a reconnect window. WS still
// pays off (sub-second latency on every action vs. up to POLL_MS), polling
// is just the floor.
//
// Returns:
//   state          — current party snapshot (null when not in a party)
//   connected      — true iff the WS is open right now
//   refresh()      — manual REST re-fetch
//   reconnect()    — force WS to drop and re-open immediately
//   setOptimistic(patch) — locally merge a patch into state without waiting
//                          for the server. Next REST/WS update overrides it.

const POLL_MS = 2000;
const NOPARTY_POLL_MS = 6000;

export default function useParty() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const pendingTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  // Tracks whether we are currently between optimistic update and server
  // confirmation. While true, we ignore older REST responses that would
  // visually "undo" the user's action.
  const optimisticAtRef = useRef(0);

  const refresh = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const data = await api.party.active();
      // Drop this response if we made an optimistic change after the request
      // went out — the server hasn't seen it yet and would clobber the UI.
      if (optimisticAtRef.current > startedAt) return state;
      setState(data);
      return data;
    } catch (e) {
      return null;
    }
  }, [state]);

  // Apply a local patch immediately so the UI updates without waiting for
  // the server round-trip. WS / poll responses are gated by optimisticAtRef
  // so they cannot visually rewind the user's action.
  const setOptimistic = useCallback((patch) => {
    optimisticAtRef.current = Date.now();
    setState(prev => {
      if (typeof patch === 'function') return patch(prev);
      if (patch === null) return null;
      return prev ? { ...prev, ...patch } : patch;
    });
  }, []);

  // (Re)connect the WebSocket.
  const connect = useCallback(() => {
    const token = localStorage.getItem('hq_token');
    if (!token) return;

    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
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
        if (msg.type === 'STATE') {
          // Server is authoritative — overwrite any optimistic state.
          optimisticAtRef.current = 0;
          setState(msg.state);
        } else if (msg.type === 'CANCELLED') {
          optimisticAtRef.current = 0;
          setState(null);
        }
      } catch (e) { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      retryRef.current = Math.min(retryRef.current + 1, 4);
      const delay = retryRef.current * 1000;
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        if (wsRef.current === ws) connect();
      }, delay);
    };

    ws.onerror = () => { try { ws.close(); } catch (e) { /* ignore */ } };
  }, []);

  const reconnect = useCallback(() => {
    retryRef.current = 0;
    connect();
  }, [connect]);

  // Poll loop — runs continuously. Interval adapts based on whether we
  // currently have a party (faster) or not (slower). REST is also our
  // initial-load mechanism so the UI paints something before WS handshake.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const data = await refresh();
      const delay = data ? POLL_MS : NOPARTY_POLL_MS;
      pollTimerRef.current = setTimeout(tick, delay);
    };
    tick();
    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [refresh]);

  // Open WS once on mount, clean up on unmount.
  useEffect(() => {
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
  }, [connect]);

  return { state, connected, refresh, reconnect, setOptimistic };
}
