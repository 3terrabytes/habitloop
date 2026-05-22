const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { addXP, addGold } = require('../utils/xp');
const { ATTACKS, attackById, attacksForClass, DEFAULT_LOADOUT, defaultLoadoutFor } = require('../data/attacks');
const { MONSTERS, monsterById, scaledMonster } = require('../data/monsters');
const { generateMap, POTIONS, potionById } = require('../data/dungeon');
const { itemById, weaponClassOf, bonusesFrom } = require('../data/items');

// Load a user's full equipped set (items resolved) — used for mythic bonuses.
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

const router = express.Router();
router.use(auth);

// Resolve the user's current equipped weapon class, if any.
async function userWeaponClass(userId) {
  const { rows } = await pool.query(
    'SELECT weapon FROM user_equipped WHERE user_id = $1',
    [userId]
  );
  const weaponId = rows[0]?.weapon;
  if (!weaponId) return null;
  return weaponClassOf(itemById(weaponId));
}

// Total magic from the user's equipped gear — bonus damage in the dungeon.
async function userMagic(userId) {
  const { rows } = await pool.query(
    'SELECT weapon, armor, badge, companion FROM user_equipped WHERE user_id = $1',
    [userId]
  );
  const row = rows[0] || {};
  let total = 0;
  for (const id of Object.values(row)) {
    if (!id) continue;
    total += itemById(id)?.magic || 0;
  }
  return total;
}

// Total armor — derived from equipped armor's magic. Reduces incoming damage.
async function userArmor(userId) {
  const { rows } = await pool.query(
    'SELECT armor FROM user_equipped WHERE user_id = $1',
    [userId]
  );
  const armor = itemById(rows[0]?.armor);
  return armor?.magic || 0;
}

// Get the loadout, falling back to defaults if the user has never set one.
// Also strips any attacks that are no longer valid for the current weapon —
// the client renders the result so the UI never shows orphaned moves.
router.get('/loadout', async (req, res) => {
  try {
    const [{ rows }, weaponClass, magic, armor] = await Promise.all([
      pool.query('SELECT slot1, slot2, slot3, slot4 FROM user_attacks WHERE user_id = $1', [req.userId]),
      userWeaponClass(req.userId),
      userMagic(req.userId),
      userArmor(req.userId),
    ]);
    const row = rows[0];
    const stored = row ? [row.slot1, row.slot2, row.slot3, row.slot4] : [];
    const available = attacksForClass(weaponClass);
    const availableIds = new Set(available.map(a => a.id));

    // Prefer stored slot if still usable, otherwise fall back to a
    // weapon-aware default (so swapping weapons lights up the new movepool
    // immediately instead of leaving the player with Punch/Kick).
    const fallback = defaultLoadoutFor(weaponClass);
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const candidate = stored[i] && availableIds.has(stored[i]) ? stored[i] : fallback[i];
      slots.push(candidate);
    }

    const equipped = await userEquipped(req.userId);
    const bonuses  = bonusesFrom(equipped);

    res.json({
      slots,
      slotDetails: slots.map(id => attackById(id)).filter(Boolean),
      available,
      weaponClass,
      magic,
      armor,
      bonuses, // { dmg_pct, crit_pct, pet_dmg_pct, max_hp_pct, block_start, first_hit_pct, dmg_taken_pct, gold_pct, xp_pct }
    });
  } catch (err) {
    console.error('dungeon/loadout error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save the 4-slot loadout. Validates each slot is in the user's available list.
router.post('/loadout', async (req, res) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots) || slots.length !== 4) {
      return res.status(400).json({ error: 'Need exactly 4 slots' });
    }
    const weaponClass = await userWeaponClass(req.userId);
    const availableIds = new Set(attacksForClass(weaponClass).map(a => a.id));
    for (const id of slots) {
      if (!availableIds.has(id)) {
        return res.status(400).json({ error: `Attack "${id}" not available for your weapon` });
      }
    }
    await pool.query(
      `INSERT INTO user_attacks (user_id, slot1, slot2, slot3, slot4)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
       SET slot1 = EXCLUDED.slot1, slot2 = EXCLUDED.slot2,
           slot3 = EXCLUDED.slot3, slot4 = EXCLUDED.slot4`,
      [req.userId, slots[0], slots[1], slots[2], slots[3]]
    );
    res.json({ success: true, slots });
  } catch (err) {
    console.error('dungeon/loadout save error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start a new dungeon run. Returns a branching map of nodes/edges. Battle
// nodes include a `monster` field with the resolved monster data so the
// frontend can preview it on the map before committing.
router.post('/run', async (req, res) => {
  try {
    // Pull the player's current level so we can scale enemies — without this,
    // a fully-geared high-level player trivialises every fight.
    const { rows } = await pool.query('SELECT level FROM users WHERE id = $1', [req.userId]);
    const level = rows[0]?.level || 1;

    const map = generateMap();
    const nodes = map.nodes.map(n => {
      if (!n.monsterId) return n;
      const m = scaledMonster(monsterById(n.monsterId), level);
      return { ...n, monster: m };
    });
    res.json({ map: { nodes, edges: map.edges }, playerLevel: level });
  } catch (err) {
    console.error('dungeon/run error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Claim XP+gold for defeating a monster. Server validates the monster id but
// trusts that the client actually killed it (battle is client-driven).
router.post('/reward', async (req, res) => {
  try {
    const { monsterId } = req.body;
    const baseMonster = monsterById(monsterId);
    if (!baseMonster) return res.status(400).json({ error: 'Unknown monster' });

    // Look up the player's level so we can scale the XP reward to match the
    // scaled difficulty. Gold stays at the flat base value.
    const { rows: userRows } = await pool.query('SELECT level FROM users WHERE id = $1', [req.userId]);
    const level = userRows[0]?.level || 1;
    const monster = scaledMonster(baseMonster, level);

    // Apply mythic-bonus multipliers to gold + XP (Omega Badge +25% XP,
    // Singularity Banner +30% gold, etc.).
    const equipped = await userEquipped(req.userId);
    const bonuses = bonusesFrom(equipped);
    const xpMult   = 1 + ((bonuses.xp_pct   || 0) / 100);
    const goldMult = 1 + ((bonuses.gold_pct || 0) / 100);
    const finalXp   = Math.round(monster.xp   * xpMult);
    let finalGold = Math.round(monster.gold * goldMult);

    await addXP(req.userId, finalXp);
    const goldRes = await addGold(req.userId, finalGold);
    if (goldRes) finalGold = goldRes.granted;
    // Bumping ascension on every boss kill — surfaces on /auth/me for the
    // entrance-screen ascension chip and future difficulty modifiers.
    if (baseMonster.tier === 5) {
      await pool.query(
        'UPDATE users SET dungeon_ascension = COALESCE(dungeon_ascension, 0) + 1 WHERE id = $1',
        [req.userId]
      );
    }
    const { rows } = await pool.query('SELECT xp, level, gold, dungeon_ascension FROM users WHERE id = $1', [req.userId]);
    res.json({ xp: finalXp, gold: finalGold, user: rows[0] });
  } catch (err) {
    console.error('dungeon/reward error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// SURVIVAL MODE — endless waves until you die.
// ─────────────────────────────────────────────────────────────────────
// Each wave: pick a monster whose tier scales with the wave number, then
// stack the player's level scaling on top. Tier ramps to 5 by wave ~16
// and stays there with multiplied stats.
function survivalMonster(wave, playerLevel) {
  const tier = Math.min(5, 1 + Math.floor(wave / 4)); // 1..5
  const pool = MONSTERS.filter(m => m.tier === tier);
  const base = pool[Math.floor(Math.random() * pool.length)];
  if (!base) return null;
  // Past tier 5, the wave keeps ramping HP/power so survival never plateaus.
  const overflow = Math.max(0, wave - 16);
  const scaled = scaledMonster(base, playerLevel);
  return {
    ...scaled,
    hp:     Math.round(scaled.hp    * (1 + overflow * 0.15)),
    power:  Math.round(scaled.power * (1 + overflow * 0.08)),
    xp:     Math.round(scaled.xp    * (1 + wave * 0.05)),
    gold:   Math.round(scaled.gold  * (1 + wave * 0.06)),
  };
}

// GET /survival/wave/:wave — returns the monster for that wave.
router.get('/survival/wave/:wave', async (req, res) => {
  try {
    const wave = Math.max(1, parseInt(req.params.wave) || 1);
    const { rows } = await pool.query('SELECT level FROM users WHERE id = $1', [req.userId]);
    const level = rows[0]?.level || 1;
    const monster = survivalMonster(wave, level);
    if (!monster) return res.status(500).json({ error: 'No monster pool' });
    res.json({ wave, monster });
  } catch (err) {
    console.error('dungeon/survival/wave error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /survival/reward { monsterId, wave } — claim XP/gold, update best wave.
// Mirrors /reward but with the wave multiplier baked in and the monster id
// allowed to be ANY tier (since survival picks freely).
router.post('/survival/reward', async (req, res) => {
  try {
    const { monsterId, wave } = req.body;
    const base = monsterById(monsterId);
    if (!base) return res.status(400).json({ error: 'Unknown monster' });

    const { rows: u } = await pool.query('SELECT level FROM users WHERE id = $1', [req.userId]);
    const level = u[0]?.level || 1;
    const w = Math.max(1, parseInt(wave) || 1);
    const monster = survivalMonster(w, level); // recompute so client can't lie about the wave reward

    const equipped = await userEquipped(req.userId);
    const bonuses  = bonusesFrom(equipped);
    const xpMult   = 1 + ((bonuses.xp_pct   || 0) / 100);
    const goldMult = 1 + ((bonuses.gold_pct || 0) / 100);
    const finalXp   = Math.round((monster.xp   || base.xp)   * xpMult);
    let   finalGold = Math.round((monster.gold || base.gold) * goldMult);

    await addXP(req.userId, finalXp);
    const goldRes = await addGold(req.userId, finalGold);
    if (goldRes) finalGold = goldRes.granted;
    // Update best wave if we just beat it.
    await pool.query(
      `UPDATE users SET best_survival_wave = GREATEST(COALESCE(best_survival_wave, 0), $1)
       WHERE id = $2`,
      [w, req.userId]
    );

    const { rows } = await pool.query(
      'SELECT xp, level, gold, best_survival_wave FROM users WHERE id = $1',
      [req.userId]
    );
    res.json({ xp: finalXp, gold: finalGold, user: rows[0], wave: w });
  } catch (err) {
    console.error('dungeon/survival/reward error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Spend gold on a dungeon potion. Server validates the potion and the
// user's gold balance, then deducts. Returns the potion + new balance.
router.post('/buy-potion/:potionId', async (req, res) => {
  try {
    const potion = potionById(req.params.potionId);
    if (!potion) return res.status(404).json({ error: 'Potion not found' });

    const { rows } = await pool.query('SELECT gold, username FROM users WHERE id = $1', [req.userId]);
    const me = rows[0];
    const isTheDevs = me?.username?.toLowerCase() === 'thedevs';
    if (!isTheDevs && (me?.gold || 0) < potion.cost) {
      return res.status(400).json({ error: 'Not enough gold' });
    }

    if (!isTheDevs) {
      await pool.query('UPDATE users SET gold = gold - $1 WHERE id = $2', [potion.cost, req.userId]);
    }
    const { rows: updated } = await pool.query('SELECT gold FROM users WHERE id = $1', [req.userId]);
    res.json({ success: true, potion, gold: updated[0].gold });
  } catch (err) {
    console.error('dungeon/buy-potion error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Treasure / chest reward — grants a flat gold amount based on the room
// tier. Used by the treasure-room node type. Always honoured (the client
// chose this room, and treasure rewards are small/non-grindable).
router.post('/treasure', async (req, res) => {
  try {
    const { tier } = req.body;
    const t = Math.max(1, Math.min(5, parseInt(tier) || 1));
    const goldBase = 40 + t * 25 + Math.floor(Math.random() * 20);
    const goldRes = await addGold(req.userId, goldBase);
    const granted = goldRes?.granted ?? goldBase;
    const { rows } = await pool.query('SELECT gold FROM users WHERE id = $1', [req.userId]);
    res.json({ gold: granted, user: rows[0] });
  } catch (err) {
    console.error('dungeon/treasure error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Catalog endpoints — used by the loadout editor.
router.get('/attacks', (req, res) => res.json(ATTACKS));
router.get('/monsters', (req, res) => res.json(MONSTERS));
router.get('/potions', (req, res) => res.json(POTIONS));

module.exports = router;
