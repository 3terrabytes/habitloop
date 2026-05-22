const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { levelTitle, xpForLevel } = require('../utils/xp');
const { itemById } = require('../data/items');
const router = express.Router();

router.use(auth);

const enrichEquipped = (row) => {
  const equipped = {
    weapon: row.eq_weapon ? itemById(row.eq_weapon) : null,
    armor:  row.eq_armor  ? itemById(row.eq_armor)  : null,
    banner: row.eq_banner ? itemById(row.eq_banner) : null,
    badge:  row.eq_badge  ? itemById(row.eq_badge)  : null,
  };
  const { eq_weapon, eq_armor, eq_banner, eq_badge, ...rest } = row;
  return { ...rest, equipped };
};

// All users for find friends
router.get('/all', async (req, res) => {
  const { q } = req.query;
  const params = q ? [req.userId, `%${q}%`] : [req.userId];
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.level, u.avatar_color, u.avatar_skin, u.avatar_hair, u.avatar_eyes, u.avatar_hair_style, u.avatar_beard,
      e.weapon AS eq_weapon, e.armor AS eq_armor, e.banner AS eq_banner, e.badge AS eq_badge,
      CASE WHEN f.id IS NOT NULL THEN f.status ELSE NULL END AS friendship_status,
      CASE WHEN f.requester_id = $1 THEN 'sent' WHEN f.addressee_id = $1 THEN 'received' ELSE NULL END AS friendship_dir
    FROM users u
    LEFT JOIN user_equipped e ON e.user_id = u.id
    LEFT JOIN friendships f ON
      (f.requester_id = $1 AND f.addressee_id = u.id) OR
      (f.addressee_id = $1 AND f.requester_id = u.id)
    WHERE u.id != $1 ${q ? 'AND u.username ILIKE $2' : ''}
    ORDER BY u.username ASC LIMIT 50
  `, params);
  res.json(rows.map(enrichEquipped));
});

router.post('/request/:targetId', async (req, res) => {
  try {
    await pool.query('INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)', [req.userId, req.params.targetId]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Request already sent' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/accept/:requesterId', async (req, res) => {
  await pool.query(`UPDATE friendships SET status = 'accepted' WHERE requester_id = $1 AND addressee_id = $2`, [req.params.requesterId, req.userId]);
  res.json({ success: true });
});

router.delete('/:otherId', async (req, res) => {
  await pool.query(`DELETE FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`, [req.userId, req.params.otherId]);
  res.json({ success: true });
});

router.get('/pending', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.level, u.avatar_color, u.avatar_skin, u.avatar_hair, u.avatar_eyes, u.avatar_hair_style, u.avatar_beard, f.created_at,
      e.weapon AS eq_weapon, e.armor AS eq_armor, e.banner AS eq_banner, e.badge AS eq_badge
    FROM friendships f JOIN users u ON u.id = f.requester_id
    LEFT JOIN user_equipped e ON e.user_id = u.id
    WHERE f.addressee_id = $1 AND f.status = 'pending'
  `, [req.userId]);
  res.json(rows.map(enrichEquipped));
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.xp, u.level, u.avatar_color, u.avatar_skin, u.avatar_hair, u.avatar_eyes, u.avatar_hair_style, u.avatar_beard,
      u.suspension_type, u.suspended_until,
      u.dungeon_ascension, u.best_survival_wave,
      e.weapon AS eq_weapon, e.armor AS eq_armor, e.banner AS eq_banner, e.badge AS eq_badge
    FROM users u
    JOIN friendships f ON
      (f.requester_id = $1 AND f.addressee_id = u.id AND f.status = 'accepted') OR
      (f.addressee_id = $1 AND f.requester_id = u.id AND f.status = 'accepted')
    LEFT JOIN user_equipped e ON e.user_id = u.id
    WHERE u.id != $1 ORDER BY u.xp DESC
  `, [req.userId]);
  const now = new Date();
  res.json(rows.map(r => {
    const suspended =
      r.suspension_type === 'perm' ||
      (r.suspension_type === 'temp' && r.suspended_until && new Date(r.suspended_until) > now);
    return {
      ...enrichEquipped(r),
      levelTitle: levelTitle(r.level),
      xpForNextLevel: xpForLevel(r.level + 1),
      suspended,
    };
  }));
});

module.exports = router;
