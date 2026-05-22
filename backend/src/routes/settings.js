const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

const VALID_PRIVACY = ['all', 'friends', 'private'];
const VALID_THEMES  = ['default', 'midnight', 'forest', 'rose', 'ocean', 'sunset', 'mono'];

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT privacy_xp, notif_enabled, notif_time, theme, update_seen
       FROM users WHERE id = $1`,
      [req.userId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    console.error('Settings GET error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { privacy_xp, notif_enabled, notif_time, theme, update_seen } = req.body;

    if (privacy_xp && !VALID_PRIVACY.includes(privacy_xp)) return res.status(400).json({ error: 'Invalid privacy_xp' });
    if (theme      && !VALID_THEMES.includes(theme))       return res.status(400).json({ error: 'Invalid theme' });

    await pool.query(
      `UPDATE users SET
        privacy_xp    = COALESCE($1, privacy_xp),
        notif_enabled = COALESCE($2, notif_enabled),
        notif_time    = COALESCE($3, notif_time),
        theme         = COALESCE($4, theme),
        update_seen   = COALESCE($5, update_seen)
       WHERE id = $6`,
      [privacy_xp, notif_enabled, notif_time, theme, update_seen, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Settings POST error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
