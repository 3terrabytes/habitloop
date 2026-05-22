const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { rows: u } = await pool.query(
      `SELECT xp, level, gold, lifetime_gold, dungeon_ascension, best_survival_wave,
              rebirth_count, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = u[0];

    const { rows: ach } = await pool.query(
      'SELECT COUNT(*)::int AS unlocked FROM user_achievements WHERE user_id = $1',
      [req.userId]
    );

    const { rows: inv } = await pool.query(
      'SELECT COUNT(*)::int AS owned FROM user_inventory WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      user: {
        level: user.level,
        xp: user.xp,
        gold: user.gold,
        lifetime_gold: Number(user.lifetime_gold || 0),
        rebirth_count: user.rebirth_count || 0,
        member_since: user.created_at,
      },
      dungeon: {
        ascension: user.dungeon_ascension || 0,
        best_wave: user.best_survival_wave || 0,
      },
      collection: {
        achievements_unlocked: ach[0].unlocked,
        items_owned: inv[0].owned,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
