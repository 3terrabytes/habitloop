// Tavern WebSocket hub.
//
// Each tavern is a "room" keyed by ownerId. Visitors connect to
//   ws(s)://<host>/ws/tavern?token=<jwt>&owner=<username>
// The server resolves the owner, gates by tavern privacy, then adds the
// socket to that room's set. Movement is broadcast at whatever rate the
// client sends (typically 10/sec) so friends in your tavern see each
// other walking around in real time.
//
// Message protocol (all JSON):
//   server -> client:
//     { type: 'SNAPSHOT', you: {userId}, peers: [{userId, username, level, appearance, equipped, x, y, facing}] }
//     { type: 'JOIN',   peer: {...same shape as above} }
//     { type: 'LEAVE',  userId }
//     { type: 'POS',    userId, x, y, facing }
//     { type: 'EMOTE',  userId, emote }    // optional, not used yet
//   client -> server:
//     { type: 'MOVE',  x, y, facing }
//
// We deliberately do NOT persist tavern presence. It's ephemeral — close
// the tab and your visitor entry disappears. Avatar/equipment data is
// looked up once on connect from Postgres, then memoised on the socket.

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { URL } = require('url');
const { pool } = require('../db');
const { itemById } = require('../data/items');

// ownerId -> Map<userId, { ws, profile, pos }>
const rooms = new Map();

function getRoom(ownerId) {
  let m = rooms.get(ownerId);
  if (!m) { m = new Map(); rooms.set(ownerId, m); }
  return m;
}
function deleteRoomIfEmpty(ownerId) {
  const m = rooms.get(ownerId);
  if (m && m.size === 0) rooms.delete(ownerId);
}

function broadcast(ownerId, payload, exceptUserId) {
  const room = rooms.get(ownerId);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const [uid, entry] of room) {
    if (uid === exceptUserId) continue;
    if (entry.ws.readyState === entry.ws.OPEN) {
      try { entry.ws.send(msg); } catch (e) { /* ignore */ }
    }
  }
}

async function loadProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.level,
            u.avatar_skin, u.avatar_hair, u.avatar_eyes,
            u.avatar_hair_style, u.avatar_gender, u.avatar_beard,
            e.weapon, e.armor, e.banner, e.badge, e.companion, e.title
       FROM users u LEFT JOIN user_equipped e ON e.user_id = u.id
      WHERE u.id = $1`,
    [userId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    userId: r.id,
    username: r.username,
    level: r.level,
    appearance: {
      avatar_skin: r.avatar_skin,
      avatar_hair: r.avatar_hair,
      avatar_eyes: r.avatar_eyes,
      avatar_hair_style: r.avatar_hair_style,
      avatar_gender: r.avatar_gender,
      avatar_beard: r.avatar_beard,
    },
    equipped: {
      weapon:    r.weapon    ? itemById(r.weapon)    : null,
      armor:     r.armor     ? itemById(r.armor)     : null,
      banner:    r.banner    ? itemById(r.banner)    : null,
      badge:     r.badge     ? itemById(r.badge)     : null,
      companion: r.companion ? itemById(r.companion) : null,
      title:     r.title     ? itemById(r.title)     : null,
    },
  };
}

async function canVisit(ownerId, visitorId) {
  if (ownerId === visitorId) return true;
  const { rows } = await pool.query(
    `SELECT privacy FROM user_tavern WHERE user_id = $1`, [ownerId]
  );
  const privacy = rows[0]?.privacy || 'public';
  if (privacy === 'public') return true;
  if (privacy === 'private') return false;
  if (privacy === 'friends') {
    const { rows: f } = await pool.query(
      `SELECT 1 FROM friendships
        WHERE status='accepted' AND
              ((requester_id=$1 AND addressee_id=$2) OR
               (requester_id=$2 AND addressee_id=$1))`,
      [ownerId, visitorId]
    );
    return f.length > 0;
  }
  return false;
}

function attachToServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/ws/tavern')) return;
    let userId, ownerUsername;
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      ownerUsername = url.searchParams.get('owner');
      if (!token || !ownerUsername) throw new Error('missing params');
      userId = jwt.verify(token, process.env.JWT_SECRET).userId;
    } catch (e) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => handleConnection(ws, userId, ownerUsername));
  });
}

async function handleConnection(ws, userId, ownerUsername) {
  let ownerId;
  try {
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [ownerUsername]
    );
    if (!rows.length) throw new Error('owner not found');
    ownerId = rows[0].id;
  } catch (e) {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'Owner not found' }));
    return ws.close();
  }

  const allowed = await canVisit(ownerId, userId);
  if (!allowed) {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'This tavern is private' }));
    return ws.close();
  }

  const profile = await loadProfile(userId);
  if (!profile) {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'Profile load failed' }));
    return ws.close();
  }

  const room = getRoom(ownerId);
  // If this user already had a socket in the room (multiple tabs), drop
  // the old one so the latest tab wins.
  const existing = room.get(userId);
  if (existing) {
    try { existing.ws.close(); } catch (e) { /* ignore */ }
    room.delete(userId);
  }

  const entry = {
    ws, profile,
    pos: { x: 80, y: 200, facing: 1 },
  };
  room.set(userId, entry);

  // Send the new visitor a snapshot of everyone already in the room.
  const peers = [];
  for (const [uid, e] of room) {
    if (uid === userId) continue;
    peers.push({ ...e.profile, ...e.pos });
  }
  ws.send(JSON.stringify({ type: 'SNAPSHOT', you: { userId }, peers }));

  // Tell everyone else this person joined.
  broadcast(ownerId, { type: 'JOIN', peer: { ...profile, ...entry.pos } }, userId);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'MOVE') {
        entry.pos = {
          x: Math.max(0, Math.min(2000, Number(msg.x) || 0)),
          y: Math.max(0, Math.min(2000, Number(msg.y) || 0)),
          facing: msg.facing === -1 ? -1 : 1,
        };
        broadcast(ownerId, { type: 'POS', userId, ...entry.pos }, userId);
      }
    } catch (e) { /* ignore malformed */ }
  });

  const cleanup = () => {
    room.delete(userId);
    broadcast(ownerId, { type: 'LEAVE', userId });
    deleteRoomIfEmpty(ownerId);
  };
  ws.on('close', cleanup);
  ws.on('error', cleanup);
}

module.exports = { attachToServer };
