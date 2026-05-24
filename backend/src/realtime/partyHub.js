// WebSocket broadcast layer for multiplayer parties.
//
// One WS server piggy-backs on the Express HTTP server. Clients connect to
//   ws(s)://<host>/ws/party?token=<jwt>
// On connect we verify the JWT, look up the user's active party, and add
// the socket to a per-party set. broadcastParty(partyId, payload) fans out
// to every socket in that set.
//
// We deliberately keep all room/turn state in Postgres so reconnects and
// horizontal scaling remain straightforward. WS is a notification channel,
// not the source of truth.

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { URL } = require('url');

// partyId -> Set<WebSocket>
const rooms = new Map();
// WebSocket -> { userId, partyId }
const sockets = new WeakMap();

function joinRoom(partyId, ws) {
  let set = rooms.get(partyId);
  if (!set) { set = new Set(); rooms.set(partyId, set); }
  set.add(ws);
}

function leaveRoom(partyId, ws) {
  const set = rooms.get(partyId);
  if (!set) return;
  set.delete(ws);
  if (!set.size) rooms.delete(partyId);
}

function broadcastParty(partyId, payload) {
  const set = rooms.get(Number(partyId));
  if (!set) return;
  const msg = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(msg); } catch (e) { /* ignore */ }
    }
  }
}

function attachToServer(server, { pool }) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/ws/party')) return;
    let userId = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) throw new Error('missing token');
      userId = jwt.verify(token, process.env.JWT_SECRET).userId;
    } catch (e) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      handleConnection(ws, userId, { pool });
    });
  });

  return wss;
}

async function handleConnection(ws, userId, { pool }) {
  // Find the user's active party (lobby or fighting). If none, close.
  const { rows } = await pool.query(
    `SELECT p.id FROM parties p
     JOIN party_members m ON m.party_id = p.id
     WHERE m.user_id = $1 AND p.status IN ('lobby','fighting')
     ORDER BY p.id DESC LIMIT 1`,
    [userId]
  );
  const partyId = rows[0]?.id;
  if (!partyId) {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'No active party' }));
    ws.close();
    return;
  }
  sockets.set(ws, { userId, partyId });
  joinRoom(partyId, ws);

  // Send an initial snapshot so the new client doesn't have to wait for the
  // next state change.
  const { getPartyState } = require('../routes/party');
  try {
    const state = await getPartyState(partyId);
    ws.send(JSON.stringify({ type: 'STATE', state }));
  } catch (e) { /* ignore */ }

  // We intentionally do NOT accept any client → server messages over the
  // socket. Every state change has to come through REST so server-side
  // validation runs. WS is push-only.

  ws.on('close', () => leaveRoom(partyId, ws));
  ws.on('error', () => leaveRoom(partyId, ws));
}

module.exports = { attachToServer, broadcastParty };
