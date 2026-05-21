const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { addXP } = require('../utils/xp');
const { itemById, weaponClassOf } = require('../data/items');
const { attackById, attacksForClass } = require('../data/attacks');

const router = express.Router();
router.use(auth);

// HP scales with level. Same formula as the dungeon for consistency.
const playerMaxHp = (level) => 100 + 20 * (level || 1);

// XP awarded — winner = 30 + opponent_level*5, loser = 5 consolation.
// No gold (per user spec). Cap winner XP at 250 so a L100 vs L100 doesn't
// hand out a ridiculous amount per battle.
function rewardXp(winnerLevel, loserLevel) {
  const winnerXp = Math.min(250, 30 + (loserLevel || 1) * 5);
  return { winnerXp, loserXp: 5 };
}

// Mutual-friend check (mirrors gifts.js).
async function assertFriends(a, b) {
  const { rows } = await pool.query(
    `SELECT 1 FROM friendships WHERE status = 'accepted' AND
     ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [a, b]
  );
  return rows.length > 0;
}

// Resolve a user's combat-relevant gear/state from the DB.
async function loadCombatant(userId) {
  const { rows } = await pool.query(
    `SELECT id, username, level,
            avatar_skin, avatar_hair, avatar_eyes, avatar_hair_style, avatar_gender, avatar_beard
     FROM users WHERE id = $1`,
    [userId]
  );
  const u = rows[0];
  if (!u) return null;
  const { rows: eq } = await pool.query('SELECT * FROM user_equipped WHERE user_id = $1', [userId]);
  const r = eq[0] || {};
  const equipped = {
    weapon:    r.weapon    ? itemById(r.weapon)    : null,
    armor:     r.armor     ? itemById(r.armor)     : null,
    banner:    r.banner    ? itemById(r.banner)    : null,
    badge:     r.badge     ? itemById(r.badge)     : null,
    companion: r.companion ? itemById(r.companion) : null,
  };
  const magic = ['weapon', 'armor', 'badge', 'companion']
    .map(s => equipped[s]?.magic || 0)
    .reduce((a, b) => a + b, 0);
  const armor = equipped.armor?.magic || 0;
  const weaponClass = weaponClassOf(equipped.weapon);
  return {
    id: u.id, username: u.username, level: u.level,
    magic, armor, weaponClass, equipped,
    // Appearance keys mirror what PixelCharacter expects.
    appearance: {
      avatar_skin: u.avatar_skin, avatar_hair: u.avatar_hair, avatar_eyes: u.avatar_eyes,
      avatar_hair_style: u.avatar_hair_style, avatar_gender: u.avatar_gender, avatar_beard: u.avatar_beard,
    },
  };
}

// Return the *active* battle the user is in, or null. There's at most one
// thanks to the active-battle gate below.
async function activeBattleFor(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM battles
     WHERE (challenger_id = $1 OR opponent_id = $1) AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

// Decorate a raw battle row with usernames + available attacks for the
// currently-active player. Done server-side so the client can render
// straight from the response.
async function decorateBattle(b, viewerUserId) {
  if (!b) return null;
  const [c, o] = await Promise.all([
    loadCombatant(b.challenger_id),
    loadCombatant(b.opponent_id),
  ]);
  const turnCombatant = b.turn_user_id === b.challenger_id ? c : o;
  const attacks = attacksForClass(turnCombatant?.weaponClass).slice(0, 6);
  return {
    ...b,
    challenger: c,
    opponent: o,
    yourTurn: b.turn_user_id === viewerUserId,
    youAreChallenger: b.challenger_id === viewerUserId,
    youAreOpponent: b.opponent_id === viewerUserId,
    availableAttacks: b.turn_user_id === viewerUserId ? attacks : [],
  };
}

// ── Endpoints ─────────────────────────────────────────────────────────

// GET /active — the current battle for this user (or null).
router.get('/active', async (req, res) => {
  try {
    const battle = await activeBattleFor(req.userId);
    res.json({ battle: await decorateBattle(battle, req.userId) });
  } catch (err) {
    console.error('battles/active', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /challenge/:friendId — kick off a new battle. Rejects if either
// player already has an active one (the "1 at a time" rule).
router.post('/challenge/:friendId', async (req, res) => {
  try {
    const opponentId = parseInt(req.params.friendId);
    if (opponentId === req.userId) return res.status(400).json({ error: "Can't battle yourself" });
    if (!(await assertFriends(req.userId, opponentId))) {
      return res.status(403).json({ error: 'Friends only' });
    }
    const [mine, theirs] = await Promise.all([
      activeBattleFor(req.userId),
      activeBattleFor(opponentId),
    ]);
    if (mine) return res.status(409).json({ error: 'You already have an active battle.' });
    if (theirs) return res.status(409).json({ error: 'They\'re already in a battle.' });

    const [a, b] = await Promise.all([
      loadCombatant(req.userId),
      loadCombatant(opponentId),
    ]);
    if (!a || !b) return res.status(404).json({ error: 'Player not found' });

    const aMax = playerMaxHp(a.level);
    const bMax = playerMaxHp(b.level);

    const { rows } = await pool.query(
      `INSERT INTO battles (
        challenger_id, opponent_id, status, turn_user_id,
        challenger_hp, opponent_hp, challenger_max_hp, opponent_max_hp,
        log
       ) VALUES ($1, $2, 'active', $1, $3, $4, $3, $4, $5::jsonb)
       RETURNING *`,
      [req.userId, opponentId, aMax, bMax, JSON.stringify([
        { kind: 'start', text: `⚔️ ${a.username} challenges ${b.username}.` }
      ])]
    );
    res.json({ battle: await decorateBattle(rows[0], req.userId) });
  } catch (err) {
    console.error('battles/challenge', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/turn { attackId } — submit your turn.
router.post('/:id/turn', async (req, res) => {
  try {
    const { attackId } = req.body;
    const { rows: brows } = await pool.query('SELECT * FROM battles WHERE id = $1', [req.params.id]);
    const battle = brows[0];
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is over.' });
    if (battle.turn_user_id !== req.userId) return res.status(403).json({ error: "It's not your turn." });
    if (battle.challenger_id !== req.userId && battle.opponent_id !== req.userId) {
      return res.status(403).json({ error: 'Not your battle.' });
    }

    const attack = attackById(attackId);
    if (!attack) return res.status(400).json({ error: 'Unknown attack.' });

    // Load both combatants for damage calc.
    const [me, them] = await Promise.all([
      loadCombatant(req.userId),
      loadCombatant(req.userId === battle.challenger_id ? battle.opponent_id : battle.challenger_id),
    ]);
    // Restrict to weapon-class attacks (or universal).
    const allowed = new Set(attacksForClass(me.weaponClass).map(a => a.id));
    if (!allowed.has(attack.id)) {
      return res.status(400).json({ error: 'That attack is not available with your weapon.' });
    }

    // Compute damage. Heals just affect attacker, otherwise it's straight dmg.
    let myHp = req.userId === battle.challenger_id ? battle.challenger_hp : battle.opponent_hp;
    let theirHp = req.userId === battle.challenger_id ? battle.opponent_hp : battle.challenger_hp;
    const myMax = req.userId === battle.challenger_id ? battle.challenger_max_hp : battle.opponent_max_hp;
    const logEntry = { turn: battle.turn_count + 1, by: me.username, attack: attack.name };

    if (attack.tag === 'heal') {
      const heal = attack.heal || 25;
      const before = myHp;
      myHp = Math.min(myMax, myHp + heal);
      logEntry.heal = myHp - before;
      logEntry.text = `💚 ${me.username} casts ${attack.name} for ${myHp - before} HP.`;
    } else {
      const base = (attack.power || 0) + Math.floor((me.magic || 0) / 4);
      const variance = 0.9 + Math.random() * 0.2;
      const crit = Math.random() < 0.10;
      const raw = base * variance * (crit ? 2 : 1);
      // Same capped-percentage formula as the dungeon (max 35% reduction)
      // so PvP isn't a stale-mate between two armor-stacked players.
      const armorAmt = them.armor || 0;
      const reduction = Math.min(0.35, armorAmt / (armorAmt + 150));
      const mitigated = Math.max(1, Math.round(raw * (1 - reduction)));
      theirHp = Math.max(0, theirHp - mitigated);
      logEntry.dmg = mitigated;
      logEntry.crit = crit;
      logEntry.text = `${attack.emoji} ${me.username}'s ${attack.name} hits ${them.username} for ${mitigated}${crit ? ' (CRIT!)' : ''}.`;
    }

    // Persist back to the battle row (preserving the challenger/opponent slots).
    const newChalHp = req.userId === battle.challenger_id ? myHp : theirHp;
    const newOppHp  = req.userId === battle.challenger_id ? theirHp : myHp;
    const finished = newChalHp <= 0 || newOppHp <= 0;
    let winnerId = null;
    if (finished) {
      winnerId = newChalHp <= 0 ? battle.opponent_id : battle.challenger_id;
      const winnerLevel = winnerId === me.id ? me.level : them.level;
      const loserLevel  = winnerId === me.id ? them.level : me.level;
      const { winnerXp, loserXp } = rewardXp(winnerLevel, loserLevel);
      await addXP(winnerId, winnerXp);
      await addXP(winnerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id, loserXp);
      logEntry.text += `\n🏆 ${winnerId === battle.challenger_id ? 'Challenger' : 'Opponent'} wins. +${winnerXp} XP (loser +${loserXp}).`;
    }

    const nextTurnUserId = finished
      ? null
      : (req.userId === battle.challenger_id ? battle.opponent_id : battle.challenger_id);

    const newLog = (battle.log || []).concat([logEntry]);
    const { rows: updated } = await pool.query(
      `UPDATE battles SET
         challenger_hp = $1, opponent_hp = $2,
         turn_user_id  = $3, turn_count = $4,
         log = $5::jsonb, status = $6, winner_id = $7,
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [newChalHp, newOppHp, nextTurnUserId, battle.turn_count + 1,
       JSON.stringify(newLog), finished ? 'finished' : 'active', winnerId, battle.id]
    );

    res.json({ battle: await decorateBattle(updated[0], req.userId) });
  } catch (err) {
    console.error('battles/turn', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/forfeit — give up. Opponent wins and gets the consolation as XP.
router.post('/:id/forfeit', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM battles WHERE id = $1', [req.params.id]);
    const battle = rows[0];
    if (!battle) return res.status(404).json({ error: 'Not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Already over.' });
    if (battle.challenger_id !== req.userId && battle.opponent_id !== req.userId) {
      return res.status(403).json({ error: 'Not your battle.' });
    }
    const winnerId = battle.challenger_id === req.userId ? battle.opponent_id : battle.challenger_id;
    const [w, l] = await Promise.all([loadCombatant(winnerId), loadCombatant(req.userId)]);
    const { winnerXp } = rewardXp(w.level, l.level);
    await addXP(winnerId, winnerXp);

    const newLog = (battle.log || []).concat([{ turn: battle.turn_count + 1, kind: 'forfeit',
      text: `🏳 ${l.username} forfeits. ${w.username} wins. +${winnerXp} XP.` }]);
    const { rows: updated } = await pool.query(
      `UPDATE battles SET status = 'finished', winner_id = $1, log = $2::jsonb, turn_user_id = NULL, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [winnerId, JSON.stringify(newLog), battle.id]
    );
    res.json({ battle: await decorateBattle(updated[0], req.userId) });
  } catch (err) {
    console.error('battles/forfeit', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /history — last 20 finished battles for this user.
router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, c.username AS challenger_name, o.username AS opponent_name
       FROM battles b
       JOIN users c ON c.id = b.challenger_id
       JOIN users o ON o.id = b.opponent_id
       WHERE (b.challenger_id = $1 OR b.opponent_id = $1) AND b.status = 'finished'
       ORDER BY b.updated_at DESC LIMIT 20`,
      [req.userId]
    );
    res.json(rows.map(r => ({
      ...r,
      youWon: r.winner_id === req.userId,
      youAreChallenger: r.challenger_id === req.userId,
    })));
  } catch (err) {
    console.error('battles/history', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
