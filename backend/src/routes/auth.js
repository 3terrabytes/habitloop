const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const startingGold = username.toLowerCase() === 'thedevs' ? 2147483647 : 0;
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, avatar_color, gold)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, xp, level, avatar_color, gold`,
      [username, email, hash, color, startingGold]
    );
    const user = rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Block login for active perm/temp suspensions. Warn-only allows login.
    const now = new Date();
    let active = user.suspension_type === 'perm';
    if (user.suspension_type === 'temp' && user.suspended_until && new Date(user.suspended_until) > now) {
      active = true;
    } else if (user.suspension_type === 'temp' && user.suspended_until && new Date(user.suspended_until) <= now) {
      await pool.query(
        `UPDATE users SET suspension_type = NULL, suspension_reason = NULL,
           suspended_until = NULL, suspended_at = NULL, suspended_by = NULL
         WHERE id = $1`, [user.id]
      );
      user.suspension_type = null;
    }

    if (active) {
      let msg = user.suspension_type === 'perm'
        ? 'Your account has been permanently suspended.'
        : `Your account is suspended until ${new Date(user.suspended_until).toLocaleString()}.`;
      if (user.suspension_reason) msg += ` Reason: ${user.suspension_reason}`;
      return res.status(403).json({
        error: msg,
        suspended: true,
        suspension: {
          type: user.suspension_type,
          reason: user.suspension_reason,
          until: user.suspended_until,
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { password_hash, ...safeUser } = user;
    safeUser.is_admin = !!safeUser.is_admin || (safeUser.username || '').toLowerCase() === 'thedevs';
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, xp, level, avatar_color, gold, lifetime_gold,
              avatar_skin, avatar_hair, avatar_eyes, avatar_hair_style, avatar_gender, avatar_beard,
              debrief_seen, created_at, is_admin, is_master_admin, admin_perms,
              dungeon_ascension, best_survival_wave, rebirth_count, equipped_emote,
              suspension_type, suspension_reason, suspended_until, suspended_at, warning_seen
       FROM users WHERE id = $1`,
      [req.userId]
    );
    const u = rows[0];
    if (u) u.is_admin = !!u.is_admin || (u.username || '').toLowerCase() === 'thedevs';
    res.json(u);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark active warning as seen
router.patch('/warning-seen', require('../middleware/auth'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET warning_seen = true WHERE id = $1', [req.userId]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Change username ────────────────────────────────────────────────────────
// Requires current password for safety; usernames are case-insensitive unique.
router.patch('/username', require('../middleware/auth'), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'New username and current password required' });

  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 30)
    return res.status(400).json({ error: 'Username must be 3–30 characters' });
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed))
    return res.status(400).json({ error: 'Only letters, numbers, _ . and - allowed' });

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const upd = await pool.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email, xp, level, avatar_color, gold',
      [trimmed, req.userId]
    );
    res.json({ success: true, user: upd.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    console.error('Username change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Change password ────────────────────────────────────────────────────────
router.patch('/password', require('../middleware/auth'), async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Current and new password required' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark features debrief as seen
router.patch('/debrief-seen', require('../middleware/auth'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET debrief_seen = true WHERE id = $1', [req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Debrief seen error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rebirth — wipes XP/level/gold/inventory/equipped/dungeon-progress and
// bumps rebirth_count. Earnings multiplier becomes 1.5x / 2.0x / 2.5x ...
// Friendships and achievements survive across lives.
router.post('/rebirth', require('../middleware/auth'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT level, rebirth_count FROM users WHERE id = $1',
      [req.userId]
    );
    const me = rows[0];
    if (!me) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    if ((me.level || 1) < 30) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You must be Level 30 to rebirth.' });
    }

    const newRebirthCount = (me.rebirth_count || 0) + 1;

    // Wipe progression-tied state. Achievements + friendships stay.
    await client.query('DELETE FROM user_inventory WHERE user_id = $1', [req.userId]);
    await client.query('DELETE FROM user_equipped  WHERE user_id = $1', [req.userId]);
    await client.query('DELETE FROM user_attacks   WHERE user_id = $1', [req.userId]);
    await client.query(
      `UPDATE users SET
         xp = 0, level = 1, gold = 0,
         lifetime_gold = 0,
         rebirth_count = $1,
         dungeon_ascension = 0,
         best_survival_wave = 0
       WHERE id = $2`,
      [newRebirthCount, req.userId]
    );

    await client.query('COMMIT');
    const newMult = 1 + 0.5 * newRebirthCount;
    res.json({
      success: true,
      rebirth_count: newRebirthCount,
      multiplier: newMult,
      message: `You are reborn. ${newMult.toFixed(1)}x XP and gold forever.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('rebirth error', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
