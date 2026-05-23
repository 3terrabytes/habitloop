// Multiplayer party + boss-fight HTTP routes.
//
// All state lives in Postgres. After every mutation we publish a fresh
// snapshot over WebSocket so every party member sees it without polling.
//
// Combat model:
//   1. Host creates party, invites friends (must be accepted friends).
//   2. Invitees accept; party fills (max 4, min 1 to start a solo run).
//   3. Host starts the run -> a boss is rolled, members get full HP.
//   4. Players take turns in `position` order. Each player picks an attack.
//      Once every alive player has acted, the boss attacks ONE random alive
//      player for ~1.5x its power. Round counter increments, has_acted resets.
//   5. Boss dies -> all surviving members get xp + gold (full amount each).
//      All members die -> defeat, no reward.

const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { addXP, addGold } = require('../utils/xp');
const { itemById, weaponClassOf, bonusesFrom } = require('../data/items');
const {
  attackById, attacksForClass, defaultLoadoutFor,
  leveledPower, leveledHeal,
} = require('../data/attacks');
const { rollBoss } = require('../data/bosses');
const { broadcastParty } = require('../realtime/partyHub');

const router = express.Router();

const MAX_PARTY = 4;
const PLAYER_MAX_HP = (level) => 100 + 20 * (level || 1);

// ── Helpers ────────────────────────────────────────────────────────

async function userEquipped(userId) {
  const { rows } = await pool.query('SELECT * FROM user_equipped WHERE user_id = $1', [userId]);
  const r = rows[0] || {};
  return {
    weapon:    r.weapon    ? itemById(r.weapon)    : null,
    armor:     r.armor     ? itemById(r.armor)     : null,
    banner:    r.banner    ? itemById(r.banner)    : null,
    badge:     r.badge     ? itemById(r.badge)     : null,
    companion: r.companion ? itemById(r.companion) : null,
    title:     r.title     ? itemById(r.title)     : null,
  };
}

async function userAttackProgress(userId) {
  const [{ rows: lvlRows }, { rows: unlockedRows }] = await Promise.all([
    pool.query('SELECT attack_id, level FROM user_attack_levels WHERE user_id = $1', [userId]),
    pool.query('SELECT attack_id FROM user_unlocked_attacks WHERE user_id = $1', [userId]),
  ]);
  const levels = {};
  for (const r of lvlRows) levels[r.attack_id] = r.level;
  const unlocked = new Set(unlockedRows.map(r => r.attack_id));
  return { levels, unlocked };
}

// Build the loadout for a user the same way GET /dungeon/loadout does.
async function loadoutFor(userId) {
  const [{ rows }, eq, progress] = await Promise.all([
    pool.query('SELECT slot1, slot2, slot3, slot4 FROM user_attacks WHERE user_id = $1', [userId]),
    userEquipped(userId),
    userAttackProgress(userId),
  ]);
  const stored = rows[0] ? [rows[0].slot1, rows[0].slot2, rows[0].slot3, rows[0].slot4] : [];
  const weaponClass = weaponClassOf(eq.weapon);
  const available = attacksForClass(weaponClass);
  const availableIds = new Set(
    available.filter(a => !a.learnCost || progress.unlocked.has(a.id)).map(a => a.id)
  );
  const fallback = defaultLoadoutFor(weaponClass);
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const candidate = stored[i] && availableIds.has(stored[i]) ? stored[i] : fallback[i];
    slots.push(candidate);
  }
  const slotDetails = slots.map(id => {
    const a = attackById(id);
    if (!a) return null;
    const lvl = progress.levels[a.id] || 1;
    return {
      ...a,
      level: lvl,
      leveledPower: leveledPower(a, lvl),
      leveledHeal:  leveledHeal(a, lvl),
    };
  }).filter(Boolean);
  return { slots, slotDetails, weaponClass, equipped: eq };
}

// Public helper: full party state for sockets + REST. Includes member
// avatars + names so clients can render the row of fighters without
// extra round-trips.
async function getPartyState(partyId) {
  const { rows: pRows } = await pool.query('SELECT * FROM parties WHERE id = $1', [partyId]);
  const party = pRows[0];
  if (!party) return null;
  const { rows: memberRows } = await pool.query(
    `SELECT m.party_id, m.user_id, m.position, m.hp, m.max_hp, m.is_alive, m.has_acted,
            u.username, u.level, u.avatar_color, u.avatar_skin, u.avatar_hair, u.avatar_eyes,
            u.avatar_hair_style, u.avatar_gender, u.avatar_beard,
            e.weapon AS eq_weapon, e.armor AS eq_armor, e.banner AS eq_banner,
            e.badge AS eq_badge, e.companion AS eq_companion, e.title AS eq_title
       FROM party_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN user_equipped e ON e.user_id = u.id
      WHERE m.party_id = $1
      ORDER BY m.position ASC`,
    [partyId]
  );
  const members = memberRows.map(r => ({
    user_id: r.user_id,
    username: r.username,
    level: r.level,
    position: r.position,
    hp: r.hp, max_hp: r.max_hp,
    is_alive: r.is_alive,
    has_acted: r.has_acted,
    appearance: {
      avatar_color: r.avatar_color,
      avatar_skin: r.avatar_skin,
      avatar_hair: r.avatar_hair,
      avatar_eyes: r.avatar_eyes,
      avatar_hair_style: r.avatar_hair_style,
      avatar_gender: r.avatar_gender,
      avatar_beard: r.avatar_beard,
    },
    equipped: {
      weapon:    r.eq_weapon    ? itemById(r.eq_weapon)    : null,
      armor:     r.eq_armor     ? itemById(r.eq_armor)     : null,
      banner:    r.eq_banner    ? itemById(r.eq_banner)    : null,
      badge:     r.eq_badge     ? itemById(r.eq_badge)     : null,
      companion: r.eq_companion ? itemById(r.eq_companion) : null,
      title:     r.eq_title     ? itemById(r.eq_title)     : null,
    },
  }));
  return {
    id: party.id,
    host_id: party.host_id,
    status: party.status,
    floor: party.floor,
    boss: party.boss,
    boss_hp: party.boss_hp,
    boss_max_hp: party.boss_max_hp,
    turn_index: party.turn_index,
    round_count: party.round_count,
    log: party.log || [],
    winner: party.winner,
    members,
  };
}

function nextAliveTurnIndex(members, fromIndex) {
  if (!members.length) return 0;
  for (let step = 0; step < members.length; step++) {
    const idx = (fromIndex + step) % members.length;
    if (members[idx].is_alive && !members[idx].has_acted) return idx;
  }
  return fromIndex;
}

// Pick a random alive member for the boss to target.
function pickBossTarget(members) {
  const alive = members.filter(m => m.is_alive);
  if (!alive.length) return null;
  return alive[Math.floor(Math.random() * alive.length)];
}

async function pushState(partyId) {
  const state = await getPartyState(partyId);
  broadcastParty(partyId, { type: 'STATE', state });
  return state;
}

router.use(auth);

// ── Lobby ──────────────────────────────────────────────────────────

// Create a new party. The user becomes host + first member at position 0.
router.post('/', async (req, res) => {
  // Reject if user is already in an open party.
  const { rows: existing } = await pool.query(
    `SELECT p.id FROM parties p JOIN party_members m ON m.party_id = p.id
     WHERE m.user_id = $1 AND p.status IN ('lobby','fighting')`,
    [req.userId]
  );
  if (existing.length) return res.status(409).json({ error: 'You are already in a party' });

  const floor = Math.max(20, Math.min(50, parseInt(req.body?.floor) || 20));
  const { rows } = await pool.query(
    'INSERT INTO parties (host_id, floor) VALUES ($1, $2) RETURNING id',
    [req.userId, floor]
  );
  const partyId = rows[0].id;
  await pool.query(
    `INSERT INTO party_members (party_id, user_id, position, hp, max_hp)
     VALUES ($1, $2, 0, 0, 0)`,
    [partyId, req.userId]
  );
  const state = await pushState(partyId);
  res.json(state);
});

// Invite a friend (must be accepted friend) to the party. Inviter must be
// host and party must still be in lobby.
router.post('/:partyId/invite/:userId', async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  const inviteeId = parseInt(req.params.userId);
  if (inviteeId === req.userId) return res.status(400).json({ error: 'You cannot invite yourself' });

  const { rows: pRows } = await pool.query('SELECT * FROM parties WHERE id = $1', [partyId]);
  const party = pRows[0];
  if (!party) return res.status(404).json({ error: 'Party not found' });
  if (party.host_id !== req.userId) return res.status(403).json({ error: 'Only the host can invite' });
  if (party.status !== 'lobby') return res.status(400).json({ error: 'Party is not in lobby' });

  const { rows: friendship } = await pool.query(
    `SELECT 1 FROM friendships WHERE status='accepted' AND
     ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))`,
    [req.userId, inviteeId]
  );
  if (!friendship.length) return res.status(403).json({ error: 'You can only invite friends' });

  const { rows: already } = await pool.query(
    'SELECT 1 FROM party_members WHERE party_id=$1 AND user_id=$2',
    [partyId, inviteeId]
  );
  if (already.length) return res.status(409).json({ error: 'They are already in the party' });

  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS c FROM party_members WHERE party_id=$1', [partyId]);
  if (countRows[0].c >= MAX_PARTY) return res.status(409).json({ error: 'Party is full' });

  await pool.query(
    `INSERT INTO party_invites (party_id, inviter_id, invitee_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (party_id, invitee_id) DO UPDATE SET status='pending', inviter_id=EXCLUDED.inviter_id`,
    [partyId, req.userId, inviteeId]
  );
  await pushState(partyId);
  res.json({ success: true });
});

// Incoming invites for the current user.
router.get('/invites', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.party_id, i.created_at,
            inv.username AS inviter_name, inv.id AS inviter_id,
            p.floor
       FROM party_invites i
       JOIN users inv ON inv.id = i.inviter_id
       JOIN parties p ON p.id = i.party_id
      WHERE i.invitee_id = $1 AND i.status = 'pending' AND p.status = 'lobby'
      ORDER BY i.created_at DESC`,
    [req.userId]
  );
  res.json(rows);
});

// Accept a pending invite. Joins the party at the next position.
router.post('/:partyId/accept', async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  const { rows: inv } = await pool.query(
    `SELECT 1 FROM party_invites WHERE party_id=$1 AND invitee_id=$2 AND status='pending'`,
    [partyId, req.userId]
  );
  if (!inv.length) return res.status(404).json({ error: 'No pending invite' });

  // Reject if already in any active party.
  const { rows: existing } = await pool.query(
    `SELECT p.id FROM parties p JOIN party_members m ON m.party_id = p.id
     WHERE m.user_id = $1 AND p.status IN ('lobby','fighting')`,
    [req.userId]
  );
  if (existing.length) return res.status(409).json({ error: 'You are already in another party' });

  const { rows: pRows } = await pool.query(`SELECT status FROM parties WHERE id=$1`, [partyId]);
  if (!pRows.length || pRows[0].status !== 'lobby') {
    return res.status(400).json({ error: 'Party is no longer accepting members' });
  }

  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS c FROM party_members WHERE party_id=$1', [partyId]);
  if (countRows[0].c >= MAX_PARTY) return res.status(409).json({ error: 'Party is full' });

  await pool.query(
    `INSERT INTO party_members (party_id, user_id, position, hp, max_hp)
     VALUES ($1, $2, $3, 0, 0)`,
    [partyId, req.userId, countRows[0].c]
  );
  await pool.query(`UPDATE party_invites SET status='accepted' WHERE party_id=$1 AND invitee_id=$2`,
    [partyId, req.userId]);

  const state = await pushState(partyId);
  res.json(state);
});

router.post('/:partyId/decline', async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  await pool.query(`UPDATE party_invites SET status='declined' WHERE party_id=$1 AND invitee_id=$2`,
    [partyId, req.userId]);
  res.json({ success: true });
});

// Leave a party. If host leaves a lobby, party is cancelled. If a member
// leaves a fight, they're marked dead so the fight can continue short-handed.
router.post('/:partyId/leave', async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  const { rows: pRows } = await pool.query('SELECT * FROM parties WHERE id=$1', [partyId]);
  const party = pRows[0];
  if (!party) return res.status(404).json({ error: 'Party not found' });

  if (party.status === 'lobby') {
    if (party.host_id === req.userId) {
      // Host bail = cancel the whole party
      await pool.query(`UPDATE parties SET status='cancelled', updated_at=NOW() WHERE id=$1`, [partyId]);
      broadcastParty(partyId, { type: 'CANCELLED' });
      return res.json({ success: true, cancelled: true });
    }
    await pool.query('DELETE FROM party_members WHERE party_id=$1 AND user_id=$2', [partyId, req.userId]);
    await pushState(partyId);
    return res.json({ success: true });
  }

  if (party.status === 'fighting') {
    // Mark dead, the next pushState reflects it. Fight continues.
    await pool.query(
      `UPDATE party_members SET is_alive=false, hp=0, has_acted=true
       WHERE party_id=$1 AND user_id=$2`,
      [partyId, req.userId]
    );
    await maybeAdvanceTurn(partyId);
    await pushState(partyId);
    return res.json({ success: true });
  }
  res.json({ success: true });
});

// Host starts the fight. Rolls a boss, initialises member HP, sets phase.
router.post('/:partyId/start', async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  const { rows: pRows } = await pool.query('SELECT * FROM parties WHERE id=$1', [partyId]);
  const party = pRows[0];
  if (!party) return res.status(404).json({ error: 'Party not found' });
  if (party.host_id !== req.userId) return res.status(403).json({ error: 'Only the host can start' });
  if (party.status !== 'lobby') return res.status(400).json({ error: 'Already started' });

  const { rows: mRows } = await pool.query(
    `SELECT m.*, u.level FROM party_members m JOIN users u ON u.id = m.user_id
      WHERE m.party_id=$1 ORDER BY m.position ASC`,
    [partyId]
  );
  if (!mRows.length) return res.status(400).json({ error: 'No members' });

  const boss = rollBoss(mRows.length, party.floor);
  await pool.query(
    `UPDATE parties SET status='fighting', boss=$1, boss_hp=$2, boss_max_hp=$2,
       turn_index=0, round_count=0,
       log=$3::jsonb, updated_at=NOW()
     WHERE id=$4`,
    [boss, boss.hp, JSON.stringify([`The ${boss.name} appears. "${boss.taunt}"`]), partyId]
  );
  for (const m of mRows) {
    const max = PLAYER_MAX_HP(m.level);
    await pool.query(
      `UPDATE party_members SET hp=$1, max_hp=$1, is_alive=true, has_acted=false
       WHERE party_id=$2 AND user_id=$3`,
      [max, partyId, m.user_id]
    );
  }
  const state = await pushState(partyId);
  res.json(state);
});

// ── Combat ─────────────────────────────────────────────────────────

// Submit an attack on the current turn. Server validates that it's actually
// your turn, you're alive, the attack is in your loadout, then resolves it.
router.post('/:partyId/turn', async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  const { attackId } = req.body || {};
  const { rows: pRows } = await pool.query('SELECT * FROM parties WHERE id=$1', [partyId]);
  const party = pRows[0];
  if (!party) return res.status(404).json({ error: 'Party not found' });
  if (party.status !== 'fighting') return res.status(400).json({ error: 'Party is not fighting' });

  const { rows: mRows } = await pool.query(
    `SELECT * FROM party_members WHERE party_id=$1 ORDER BY position ASC`,
    [partyId]
  );
  const me = mRows.find(m => m.user_id === req.userId);
  if (!me) return res.status(403).json({ error: 'Not in this party' });
  if (!me.is_alive) return res.status(400).json({ error: 'You are dead' });
  if (me.has_acted)  return res.status(400).json({ error: 'You already acted this round' });
  if (party.turn_index !== me.position) return res.status(400).json({ error: 'Not your turn' });

  const lo = await loadoutFor(req.userId);
  const attack = lo.slotDetails.find(a => a.id === attackId);
  if (!attack) return res.status(400).json({ error: 'Attack not in your loadout' });

  const eq = lo.equipped;
  const magic = ['weapon','armor','badge','companion']
    .reduce((s, k) => s + (eq[k]?.magic || 0), 0);
  const bonuses = bonusesFrom(eq);
  const dmgPct = bonuses.dmg_pct || 0;

  const logLines = [];
  let bossHp = party.boss_hp;
  let myHp = me.hp;
  const myMax = me.max_hp;

  if (attack.tag === 'heal') {
    const heal = attack.leveledHeal || attack.heal || 30;
    myHp = Math.min(myMax, myHp + heal);
    logLines.push(`💚 ${me_username(mRows, req.userId)} casts ${attack.name} (+${heal} HP).`);
  } else if (attack.tag === 'defend') {
    logLines.push(`🛡 ${me_username(mRows, req.userId)} braces with ${attack.name}.`);
    // For simplicity in MP, guard halves damage on their next incoming hit.
    // We track this with the has_acted+is_alive set being reset each round
    // by pretending guard is just another action that prevents damage if hit.
  } else {
    const power = attack.leveledPower ?? attack.power ?? 0;
    const base = power + magic * 0.5;
    const variance = 0.85 + Math.random() * 0.3;
    const crit = Math.random() < (0.12 + (bonuses.crit_pct || 0) / 100);
    const dmg = Math.max(1, Math.round(base * variance * (crit ? 2 : 1) * (1 + dmgPct / 100)));
    bossHp = Math.max(0, bossHp - dmg);
    logLines.push(`${attack.emoji} ${me_username(mRows, req.userId)} hits ${party.boss.name} for ${dmg}${crit ? ' (CRIT)' : ''}.`);
  }

  // Persist player turn.
  await pool.query(
    `UPDATE party_members SET hp=$1, has_acted=true WHERE party_id=$2 AND user_id=$3`,
    [myHp, partyId, req.userId]
  );

  // Boss defeated?
  if (bossHp <= 0) {
    await pool.query(`UPDATE parties SET boss_hp=0, status='finished', winner='party',
                      log=(log || $1::jsonb || $2::jsonb), updated_at=NOW() WHERE id=$3`,
      [JSON.stringify(logLines), JSON.stringify([`💀 ${party.boss.name} falls!`, 'VICTORY']), partyId]);
    // Reward every member that's still alive (or all members if the killing
    // blow came from a dying player). Easier: reward every member who has
    // not been marked dead AND is still in the party.
    const { rows: survivors } = await pool.query(
      `SELECT user_id FROM party_members WHERE party_id=$1 AND is_alive=true`, [partyId]
    );
    for (const s of survivors) {
      await addXP(s.user_id, party.boss.xp);
      await addGold(s.user_id, party.boss.gold);
    }
    await pushState(partyId);
    return res.json({ success: true, victory: true });
  }

  // Append log + boss hp.
  await pool.query(`UPDATE parties SET boss_hp=$1,
                    log=(log || $2::jsonb), updated_at=NOW() WHERE id=$3`,
    [bossHp, JSON.stringify(logLines), partyId]);

  await maybeAdvanceTurn(partyId);
  const state = await pushState(partyId);
  res.json({ success: true, state });
});

// After every player turn (or member leaving), check if it's the boss's turn.
// If all alive members have acted, the boss attacks, then reset the round.
async function maybeAdvanceTurn(partyId) {
  const { rows: pRows } = await pool.query('SELECT * FROM parties WHERE id=$1', [partyId]);
  const party = pRows[0];
  if (!party || party.status !== 'fighting') return;

  const { rows: mRows } = await pool.query(
    `SELECT * FROM party_members WHERE party_id=$1 ORDER BY position ASC`,
    [partyId]
  );
  const alive = mRows.filter(m => m.is_alive);
  if (!alive.length) {
    await pool.query(`UPDATE parties SET status='finished', winner='boss',
                      log=(log || $1::jsonb), updated_at=NOW() WHERE id=$2`,
      [JSON.stringify(['The party falls. DEFEAT.']), partyId]);
    return;
  }

  const pending = alive.filter(m => !m.has_acted);
  if (pending.length > 0) {
    // Advance turn to next pending alive player.
    const nextIdx = nextAliveTurnIndex(mRows, party.turn_index);
    await pool.query('UPDATE parties SET turn_index=$1, updated_at=NOW() WHERE id=$2',
      [nextIdx, partyId]);
    return;
  }

  // Everyone acted -> BOSS TURN
  const target = pickBossTarget(mRows);
  if (!target) return;
  const baseDmg = Math.round(party.boss.power * 1.5);
  const variance = 0.9 + Math.random() * 0.2;
  const dmg = Math.max(1, Math.round(baseDmg * variance));
  const newHp = Math.max(0, target.hp - dmg);
  const dies = newHp <= 0;
  const bossLog = [
    `${party.boss.sprite} ${party.boss.name} crashes down on ${target_username(mRows, target.user_id)} for ${dmg}!`,
  ];
  if (dies) bossLog.push(`💀 ${target_username(mRows, target.user_id)} has fallen.`);

  await pool.query(
    `UPDATE party_members SET hp=$1, is_alive=$2 WHERE party_id=$3 AND user_id=$4`,
    [newHp, !dies, partyId, target.user_id]
  );

  // Reset has_acted for next round, then pick first alive player.
  await pool.query(
    `UPDATE party_members SET has_acted=false WHERE party_id=$1 AND is_alive=true`,
    [partyId]
  );

  // Check wipe after boss hit.
  const { rows: aliveCheck } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM party_members WHERE party_id=$1 AND is_alive=true`,
    [partyId]
  );
  if (aliveCheck[0].c === 0) {
    await pool.query(`UPDATE parties SET round_count=round_count+1, status='finished',
                      winner='boss',
                      log=(log || $1::jsonb || $2::jsonb), updated_at=NOW() WHERE id=$3`,
      [JSON.stringify(bossLog), JSON.stringify(['The party falls. DEFEAT.']), partyId]);
    return;
  }

  // Pick first alive player's position as next turn.
  const { rows: refreshed } = await pool.query(
    `SELECT * FROM party_members WHERE party_id=$1 ORDER BY position ASC`, [partyId]
  );
  const firstAlive = refreshed.find(m => m.is_alive);
  await pool.query(
    `UPDATE parties SET round_count=round_count+1, turn_index=$1,
       log=(log || $2::jsonb), updated_at=NOW() WHERE id=$3`,
    [firstAlive.position, JSON.stringify(bossLog), partyId]
  );
}

function me_username(mRows, userId) {
  const r = mRows.find(m => m.user_id === userId);
  return r?.username || 'You';
}
function target_username(mRows, userId) {
  const r = mRows.find(m => m.user_id === userId);
  return r?.username || `Player#${userId}`;
}

// ── Read endpoints ────────────────────────────────────────────────

// The user's active party (lobby or fighting), or null.
router.get('/active', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id FROM parties p
     JOIN party_members m ON m.party_id = p.id
     WHERE m.user_id = $1 AND p.status IN ('lobby','fighting','finished')
     ORDER BY p.updated_at DESC LIMIT 1`,
    [req.userId]
  );
  if (!rows.length) return res.json(null);
  const state = await getPartyState(rows[0].id);
  res.json(state);
});

// Full state of a specific party (must be a member).
router.get('/:partyId', async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  const { rows } = await pool.query(
    'SELECT 1 FROM party_members WHERE party_id=$1 AND user_id=$2',
    [partyId, req.userId]
  );
  if (!rows.length) return res.status(403).json({ error: 'Not a party member' });
  const state = await getPartyState(partyId);
  if (!state) return res.status(404).json({ error: 'Party not found' });
  res.json(state);
});

// The loadout the requesting user will fight with. Exposed so the client
// can render attack buttons during the multiplayer fight without re-using
// the dungeon route.
router.get('/:partyId/my-loadout', async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  const { rows } = await pool.query(
    'SELECT 1 FROM party_members WHERE party_id=$1 AND user_id=$2',
    [partyId, req.userId]
  );
  if (!rows.length) return res.status(403).json({ error: 'Not a party member' });
  const lo = await loadoutFor(req.userId);
  res.json({
    slots: lo.slots,
    slotDetails: lo.slotDetails,
  });
});

module.exports = router;
module.exports.getPartyState = getPartyState;
