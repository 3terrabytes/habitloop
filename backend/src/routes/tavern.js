// Tavern — every player has a private pixel-art room. They own furniture
// pieces, place them on a 12x8 tile grid, and friends can visit by handle.
//
// Endpoints:
//   GET    /tavern/me                — own tavern: settings, owned, placements, guestbook
//   GET    /tavern/:username         — visit (subject to privacy)
//   POST   /tavern/place             — place a furniture on a tile
//   DELETE /tavern/place             — clear a tile
//   POST   /tavern/mount             — set the mounted_item on a mount-type tile
//   PATCH  /tavern/settings          — wall_color / floor_color / privacy
//   POST   /tavern/:username/wave    — wave at the owner
//   POST   /tavern/:username/guestbook  — leave a one-line message
//
// All read responses include resolved furniture catalog data + resolved
// mounted item data so the frontend can render in one pass.

const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { FURNITURE, furnitureById, STARTER_FURNITURE } = require('../data/furniture');
const { itemById } = require('../data/items');

const router = express.Router();
router.use(auth);

// World is 24 tiles wide so the camera has room to pan. The original 12-tile
// grid is now just the leftmost half — existing placements stay valid.
const TILE_COLS = 24;
const TILE_ROWS = 8;

// Bootstrap a tavern row + starter furniture the first time a user opens
// their tavern. Keeps the "first visit" empty-room problem from happening.
async function ensureTavern(userId) {
  await pool.query(
    `INSERT INTO user_tavern (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId]
  );
  for (const fid of STARTER_FURNITURE) {
    await pool.query(
      `INSERT INTO user_tavern_furniture (user_id, furniture_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, fid]
    );
  }
}

// Load the full tavern payload for a given user. Includes:
//   - settings (privacy, wall/floor colors)
//   - owned furniture ids
//   - placements (with resolved furniture data + resolved mounted_item)
//   - owner profile bits the scene needs (appearance + equipped)
//   - guestbook (latest 10 messages)
//   - wave count (sum across all visitors)
async function loadTavern(userId) {
  const { rows: settingsRows } = await pool.query(
    `SELECT privacy, wall_color, floor_color, greeting FROM user_tavern WHERE user_id=$1`,
    [userId]
  );
  const settings = settingsRows[0] || {
    privacy: 'public', wall_color: '#4a3a2a', floor_color: '#7a5a3a',
    greeting: 'Welcome to my tavern!',
  };

  const { rows: owned } = await pool.query(
    `SELECT furniture_id FROM user_tavern_furniture WHERE user_id=$1`,
    [userId]
  );
  const ownedIds = owned.map(r => r.furniture_id);

  const { rows: placementRows } = await pool.query(
    `SELECT id, furniture_id, tile_x, tile_y, rotation, mounted_item
       FROM user_tavern_placements WHERE user_id=$1`,
    [userId]
  );
  const placements = placementRows.map(p => {
    const f = furnitureById(p.furniture_id);
    const mounted = p.mounted_item ? itemById(p.mounted_item) : null;
    return {
      id: p.id,
      furniture: f ? { id: f.id, name: f.name, emoji: f.emoji, rarity: f.rarity, size: f.size, category: f.category, mountable: !!f.mountable, animated: !!f.animated } : null,
      tile_x: p.tile_x, tile_y: p.tile_y, rotation: p.rotation || 0,
      mounted_item: mounted ? { id: mounted.id, name: mounted.name, emoji: mounted.emoji, rarity: mounted.rarity, color: mounted.color, type: mounted.type } : null,
    };
  }).filter(p => p.furniture);

  // Owner identity + equipped, so a visitor sees the host avatar standing
  // at the bar without an extra round-trip.
  const { rows: userRows } = await pool.query(
    `SELECT id, username, level, avatar_skin, avatar_hair, avatar_eyes,
            avatar_hair_style, avatar_gender, avatar_beard
       FROM users WHERE id=$1`,
    [userId]
  );
  const owner = userRows[0];
  if (!owner) return null;

  const { rows: eqRows } = await pool.query(
    `SELECT weapon, armor, banner, badge, companion, title FROM user_equipped WHERE user_id=$1`,
    [userId]
  );
  const er = eqRows[0] || {};
  const equipped = {
    weapon:    er.weapon    ? itemById(er.weapon)    : null,
    armor:     er.armor     ? itemById(er.armor)     : null,
    banner:    er.banner    ? itemById(er.banner)    : null,
    badge:     er.badge     ? itemById(er.badge)     : null,
    companion: er.companion ? itemById(er.companion) : null,
    title:     er.title     ? itemById(er.title)     : null,
  };

  const { rows: guestbook } = await pool.query(
    `SELECT g.id, g.visitor_id, g.visitor_name, g.message, g.created_at
       FROM user_tavern_guestbook g
      WHERE g.owner_id=$1
      ORDER BY g.created_at DESC LIMIT 10`,
    [userId]
  );

  const { rows: waveRows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM user_tavern_waves WHERE owner_id=$1`,
    [userId]
  );

  return {
    settings,
    owned: ownedIds,
    placements,
    guestbook,
    wave_count: waveRows[0]?.c || 0,
    owner: {
      id: owner.id,
      username: owner.username,
      level: owner.level,
      appearance: {
        avatar_skin: owner.avatar_skin,
        avatar_hair: owner.avatar_hair,
        avatar_eyes: owner.avatar_eyes,
        avatar_hair_style: owner.avatar_hair_style,
        avatar_gender: owner.avatar_gender,
        avatar_beard: owner.avatar_beard,
      },
      equipped,
    },
  };
}

// ── Own tavern ─────────────────────────────────────────────────────

router.get('/me', async (req, res) => {
  try {
    await ensureTavern(req.userId);
    const data = await loadTavern(req.userId);
    res.json(data);
  } catch (err) {
    console.error('tavern/me error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Place a furniture piece on a tile. Validates ownership + bounds + no
// overlap. Mount-type furniture can optionally include a mounted_item id
// which must be owned in the player's inventory.
router.post('/place', async (req, res) => {
  try {
    const { furniture_id, tile_x, tile_y, rotation = 0, mounted_item = null } = req.body || {};
    const f = furnitureById(furniture_id);
    if (!f) return res.status(404).json({ error: 'Unknown furniture' });

    const x = parseInt(tile_x), y = parseInt(tile_y);
    if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x + (f.size?.w || 1) > TILE_COLS || y + (f.size?.h || 1) > TILE_ROWS) {
      return res.status(400).json({ error: 'Tile out of bounds' });
    }

    const { rows: owned } = await pool.query(
      `SELECT 1 FROM user_tavern_furniture WHERE user_id=$1 AND furniture_id=$2`,
      [req.userId, furniture_id]
    );
    if (!owned.length) return res.status(403).json({ error: 'You do not own this piece' });

    if (mounted_item) {
      if (!f.mountable) return res.status(400).json({ error: 'This piece cannot mount items' });
      const item = itemById(mounted_item);
      if (!item) return res.status(404).json({ error: 'Unknown mounted item' });
      const { rows: invOwned } = await pool.query(
        `SELECT 1 FROM user_inventory WHERE user_id=$1 AND item_id=$2`,
        [req.userId, mounted_item]
      );
      if (!invOwned.length) return res.status(403).json({ error: 'You do not own that item' });
    }

    // Upsert: a player can only have one placement per (x,y). Update if
    // the same furniture is placed there, otherwise insert.
    await pool.query(
      `INSERT INTO user_tavern_placements (user_id, furniture_id, tile_x, tile_y, rotation, mounted_item)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, tile_x, tile_y) DO UPDATE
         SET furniture_id = EXCLUDED.furniture_id,
             rotation     = EXCLUDED.rotation,
             mounted_item = EXCLUDED.mounted_item`,
      [req.userId, furniture_id, x, y, rotation, mounted_item]
    );
    const data = await loadTavern(req.userId);
    res.json(data);
  } catch (err) {
    console.error('tavern/place error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/place', async (req, res) => {
  try {
    const x = parseInt(req.body?.tile_x), y = parseInt(req.body?.tile_y);
    if (isNaN(x) || isNaN(y)) return res.status(400).json({ error: 'Invalid tile' });
    await pool.query(
      `DELETE FROM user_tavern_placements WHERE user_id=$1 AND tile_x=$2 AND tile_y=$3`,
      [req.userId, x, y]
    );
    const data = await loadTavern(req.userId);
    res.json(data);
  } catch (err) {
    console.error('tavern/place delete error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const allowed = {};
    const { privacy, wall_color, floor_color } = req.body || {};
    if (privacy && ['public', 'friends', 'private'].includes(privacy)) allowed.privacy = privacy;
    if (wall_color && /^#[0-9a-f]{6}$/i.test(wall_color))               allowed.wall_color = wall_color;
    if (floor_color && /^#[0-9a-f]{6}$/i.test(floor_color))             allowed.floor_color = floor_color;
    const greeting = typeof req.body?.greeting === 'string' ? req.body.greeting.slice(0, 140) : undefined;
    if (greeting !== undefined) allowed.greeting = greeting;
    if (!Object.keys(allowed).length) return res.json(await loadTavern(req.userId));

    await ensureTavern(req.userId);
    const fields = Object.keys(allowed);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [req.userId, ...fields.map(f => allowed[f])];
    await pool.query(`UPDATE user_tavern SET ${setClause}, updated_at=NOW() WHERE user_id=$1`, values);
    const data = await loadTavern(req.userId);
    res.json(data);
  } catch (err) {
    console.error('tavern/settings error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Browse public taverns ──────────────────────────────────────────
// List a page of taverns the user can visit. Defaults to public taverns
// sorted by most recently updated, plus the user's friends' taverns
// (whose privacy may be 'friends').
router.get('/browse', async (req, res) => {
  try {
    const q = (req.query?.q || '').toString().trim().slice(0, 40);
    const { rows: friends } = await pool.query(
      `SELECT CASE WHEN requester_id=$1 THEN addressee_id ELSE requester_id END AS friend_id
         FROM friendships
        WHERE status='accepted' AND $1 IN (requester_id, addressee_id)`,
      [req.userId]
    );
    const friendIds = friends.map(r => r.friend_id);

    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.level, t.privacy, t.greeting, t.updated_at,
              (SELECT COUNT(*)::int FROM user_tavern_placements WHERE user_id = u.id) AS piece_count,
              (SELECT COUNT(*)::int FROM user_tavern_waves      WHERE owner_id = u.id) AS wave_count
         FROM user_tavern t JOIN users u ON u.id = t.user_id
        WHERE (t.privacy = 'public' OR (t.privacy = 'friends' AND u.id = ANY($2::int[])))
          AND u.id <> $1
          AND ($3 = '' OR LOWER(u.username) LIKE LOWER('%' || $3 || '%'))
        ORDER BY t.updated_at DESC NULLS LAST, u.level DESC
        LIMIT 40`,
      [req.userId, friendIds, q]
    );
    res.json(rows);
  } catch (err) {
    console.error('tavern/browse error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Visiting another player's tavern ───────────────────────────────

async function canVisit(ownerId, visitorId, privacy) {
  if (privacy === 'public') return true;
  if (ownerId === visitorId) return true;
  if (privacy === 'friends') {
    const { rows } = await pool.query(
      `SELECT 1 FROM friendships
        WHERE status='accepted' AND
              ((requester_id=$1 AND addressee_id=$2) OR
               (requester_id=$2 AND addressee_id=$1))`,
      [ownerId, visitorId]
    );
    return rows.length > 0;
  }
  return false; // private
}

router.get('/:username', async (req, res) => {
  try {
    const { rows: u } = await pool.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [req.params.username]
    );
    if (!u.length) return res.status(404).json({ error: 'User not found' });
    const ownerId = u[0].id;

    await ensureTavern(ownerId);
    const data = await loadTavern(ownerId);
    const ok = await canVisit(ownerId, req.userId, data.settings.privacy);
    if (!ok) return res.status(403).json({ error: 'This tavern is private' });
    res.json(data);
  } catch (err) {
    console.error('tavern/visit error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:username/wave', async (req, res) => {
  try {
    const { rows: u } = await pool.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [req.params.username]
    );
    if (!u.length) return res.status(404).json({ error: 'User not found' });
    const ownerId = u[0].id;
    if (ownerId === req.userId) return res.status(400).json({ error: 'You cannot wave at yourself' });
    await pool.query(
      `INSERT INTO user_tavern_waves (owner_id, visitor_id) VALUES ($1, $2)
       ON CONFLICT (owner_id, visitor_id) DO UPDATE SET last_wave_at=NOW()`,
      [ownerId, req.userId]
    );
    const { rows: count } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM user_tavern_waves WHERE owner_id=$1`, [ownerId]
    );
    res.json({ success: true, wave_count: count[0].c });
  } catch (err) {
    console.error('tavern/wave error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:username/guestbook', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim().slice(0, 140);
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const { rows: u } = await pool.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [req.params.username]
    );
    if (!u.length) return res.status(404).json({ error: 'User not found' });
    const ownerId = u[0].id;
    if (ownerId === req.userId) return res.status(400).json({ error: 'You cannot post in your own guestbook' });

    // One message per visitor per day per owner, to keep spam out.
    const { rows: dupCheck } = await pool.query(
      `SELECT 1 FROM user_tavern_guestbook
        WHERE owner_id=$1 AND visitor_id=$2 AND created_at > NOW() - INTERVAL '1 day'
        LIMIT 1`,
      [ownerId, req.userId]
    );
    if (dupCheck.length) return res.status(429).json({ error: 'You already left a message today.' });

    const { rows: meRows } = await pool.query('SELECT username FROM users WHERE id=$1', [req.userId]);
    await pool.query(
      `INSERT INTO user_tavern_guestbook (owner_id, visitor_id, visitor_name, message)
       VALUES ($1, $2, $3, $4)`,
      [ownerId, req.userId, meRows[0]?.username || 'Anon', message]
    );
    const data = await loadTavern(ownerId);
    res.json(data);
  } catch (err) {
    console.error('tavern/guestbook error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
