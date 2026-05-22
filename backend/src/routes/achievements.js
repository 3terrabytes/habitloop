const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { ACHIEVEMENTS, byCode } = require('../data/achievements');
const { itemById } = require('../data/items');
const router = express.Router();

async function collectStats(userId) {
  const { rows: u } = await pool.query(
    'SELECT level, lifetime_gold, dungeon_ascension, best_survival_wave FROM users WHERE id = $1',
    [userId]
  );
  const user = u[0] || {};

  const { rows: inv } = await pool.query(
    'SELECT item_id FROM user_inventory WHERE user_id = $1',
    [userId]
  );
  const itemsOwned = inv.length;
  const legendaryOwned = inv.some(r => itemById(r.item_id)?.rarity === 'legendary') ? 1 : 0;

  const { rows: f } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM friendships
     WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)`,
    [userId]
  );

  return {
    level:           user.level || 1,
    lifetime_gold:   Number(user.lifetime_gold || 0),
    ascension:       user.dungeon_ascension || 0,
    best_wave:       user.best_survival_wave || 0,
    items_owned:     itemsOwned,
    legendary_owned: legendaryOwned,
    friend_count:    f[0].c,
  };
}

async function checkAchievements(userId) {
  const stats = await collectStats(userId);

  const earned = ACHIEVEMENTS
    .filter(a => (stats[a.criteria] || 0) >= a.threshold)
    .map(a => a.code);

  if (!earned.length) return [];

  const placeholders = earned.map((_, i) => `($1, $${i + 2})`).join(', ');
  const { rows: inserted } = await pool.query(
    `INSERT INTO user_achievements (user_id, code) VALUES ${placeholders}
     ON CONFLICT DO NOTHING RETURNING code`,
    [userId, ...earned]
  );

  return inserted.map(r => byCode(r.code)).filter(Boolean);
}

router.use(auth);

router.get('/', async (req, res) => {
  try { await checkAchievements(req.userId); } catch (e) { console.error(e); }

  const { rows } = await pool.query(
    'SELECT code, earned_at FROM user_achievements WHERE user_id = $1',
    [req.userId]
  );
  const earnedMap = new Map(rows.map(r => [r.code, r.earned_at]));

  res.json({
    achievements: ACHIEVEMENTS.map(a => ({
      ...a,
      earned: earnedMap.has(a.code),
      earned_at: earnedMap.get(a.code) || null,
    })),
    earned_count: rows.length,
    total: ACHIEVEMENTS.length,
  });
});

router.post('/check', async (req, res) => {
  const newly = await checkAchievements(req.userId);
  res.json({ newly_unlocked: newly });
});

module.exports = router;
module.exports.checkAchievements = checkAchievements;
