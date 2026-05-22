const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { ITEMS, PACKS, itemById, packById, packFullCost, packDiscount } = require('../data/items');
const router = express.Router();

router.use(auth);

// Serialise packs with the extra fields the frontend needs to render them.
const serialisePacks = () => PACKS.map(p => ({
  ...p,
  fullCost: packFullCost(p),
  discount: packDiscount(p),
}));

// Get shop items + packs + user gold + owned items.
// Legends-only (Mythic) items are gated to level 10+. Below that level they're
// filtered out entirely so the user doesn't see anything they can't buy.
router.get('/shop', async (req, res) => {
  const { rows: userRows } = await pool.query('SELECT gold, level FROM users WHERE id = $1', [req.userId]);
  const { rows: owned } = await pool.query('SELECT item_id FROM user_inventory WHERE user_id = $1', [req.userId]);
  const level = userRows[0]?.level || 1;
  // Hide milestone-reward items, consumables (gear-only shop), and gate
  // legends to L10+. Consumables can still appear inside bundles and stay
  // usable from inventory, just not for direct purchase.
  let items = ITEMS.filter(i => !i.unlockReward && i.type !== 'consumable');
  if (level < 10) items = items.filter(i => !i.legendsOnly);
  res.json({
    gold: userRows[0]?.gold || 0,
    level,
    items,
    packs: serialisePacks(),
    ownedIds: owned.map(r => r.item_id),
    legendsUnlocked: level >= 10,
  });
});

// Buy an item
router.post('/shop/buy/:itemId', async (req, res) => {
  const item = itemById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  // Reward-only items can never be purchased — they're awarded for hitting
  // level milestones (banner_veteran @25, banner_ascendant @50, banner_incarnate @100).
  if (item.unlockReward) {
    return res.status(403).json({ error: 'This banner can only be earned by reaching a level milestone.' });
  }
  // Consumables are no longer sold individually — they only drop from bundles.
  if (item.type === 'consumable') {
    return res.status(403).json({ error: 'Consumables are no longer available in the shop.' });
  }

  const { rows } = await pool.query('SELECT gold, level, username FROM users WHERE id = $1', [req.userId]);
  const user = rows[0];
  const isTheDevs = user?.username?.toLowerCase() === 'thedevs';

  // Server-side L10 gate for Legends-only items.
  if (item.legendsOnly && (user?.level || 1) < 10 && !isTheDevs) {
    return res.status(403).json({ error: 'Legends shop unlocks at Level 10' });
  }

  if (!isTheDevs && (user?.gold || 0) < item.cost) return res.status(400).json({ error: 'Not enough gold' });

  try {
    await pool.query('INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)', [req.userId, item.id]);
    // theDevs never loses gold — their balance stays at max
    if (!isTheDevs) {
      await pool.query('UPDATE users SET gold = gold - $1 WHERE id = $2', [item.cost, req.userId]);
    }
    const { rows: updated } = await pool.query('SELECT gold FROM users WHERE id = $1', [req.userId]);
    res.json({ success: true, gold: updated[0].gold });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already owned' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Buy a pack — all-or-nothing. Refuses if the user already owns any item in
// the pack so we never silently charge a discount for stuff they'd already have.
router.post('/shop/buy-pack/:packId', async (req, res) => {
  const pack = packById(req.params.packId);
  if (!pack) return res.status(404).json({ error: 'Pack not found' });

  // Resolve every item in the pack — bail if any id is unknown (data bug).
  const items = (pack.items || []).map(id => itemById(id)).filter(Boolean);
  if (items.length !== (pack.items || []).length) {
    return res.status(500).json({ error: 'Pack contains an unknown item' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT gold, username FROM users WHERE id = $1', [req.userId]);
    const user = rows[0];
    const isTheDevs = user?.username?.toLowerCase() === 'thedevs';

    if (!isTheDevs && (user?.gold || 0) < pack.cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Not enough gold' });
    }

    // Refuse if any items are already owned — pack purchase is all-or-nothing.
    const ownedRes = await client.query(
      'SELECT item_id FROM user_inventory WHERE user_id = $1 AND item_id = ANY($2::text[])',
      [req.userId, items.map(i => i.id)]
    );
    if (ownedRes.rows.length > 0) {
      await client.query('ROLLBACK');
      const ownedNames = ownedRes.rows
        .map(r => itemById(r.item_id)?.name)
        .filter(Boolean)
        .join(', ');
      return res.status(409).json({
        error: `You already own: ${ownedNames}. Buy the rest individually instead.`,
      });
    }

    // Grant each item.
    for (const item of items) {
      await client.query(
        'INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)',
        [req.userId, item.id]
      );
    }

    if (!isTheDevs) {
      await client.query('UPDATE users SET gold = gold - $1 WHERE id = $2', [pack.cost, req.userId]);
    }

    await client.query('COMMIT');

    const { rows: updated } = await pool.query('SELECT gold FROM users WHERE id = $1', [req.userId]);
    res.json({
      success: true,
      gold: updated[0].gold,
      grantedIds: items.map(i => i.id),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Already owned an item in this pack' });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get inventory + equipped (with full item data)
router.get('/inventory', async (req, res) => {
  const { rows: inv } = await pool.query('SELECT item_id FROM user_inventory WHERE user_id = $1', [req.userId]);
  const { rows: eq } = await pool.query('SELECT * FROM user_equipped WHERE user_id = $1', [req.userId]);
  const equippedRow = eq[0] || {};

  // Resolve equipped slot ids to full item objects
  const equipped = {
    weapon:    equippedRow.weapon    ? itemById(equippedRow.weapon)    : null,
    armor:     equippedRow.armor     ? itemById(equippedRow.armor)     : null,
    banner:    equippedRow.banner    ? itemById(equippedRow.banner)    : null,
    badge:     equippedRow.badge     ? itemById(equippedRow.badge)     : null,
    companion: equippedRow.companion ? itemById(equippedRow.companion) : null,
    title:     equippedRow.title     ? itemById(equippedRow.title)     : null,
  };

  res.json({ items: inv.map(r => itemById(r.item_id)).filter(Boolean), equipped });
});

// Equip an item — validate slot is one of the 4 allowed values
router.post('/equip/:itemId', async (req, res) => {
  const item = itemById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const validSlots = ['weapon', 'armor', 'banner', 'badge', 'companion', 'title'];
  if (!validSlots.includes(item.type)) return res.status(400).json({ error: 'Invalid item type' });

  const { rows } = await pool.query(
    'SELECT id FROM user_inventory WHERE user_id = $1 AND item_id = $2',
    [req.userId, item.id]
  );
  if (!rows.length) return res.status(403).json({ error: 'Not in inventory' });

  // Safe to interpolate item.type since we validated it above
  await pool.query(
    `INSERT INTO user_equipped (user_id, ${item.type}) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET ${item.type} = EXCLUDED.${item.type}`,
    [req.userId, item.id]
  );

  res.json({ success: true, equipped: item });
});

// Sell an item back to the shop for 50% of its cost. Unequips first if it
// was the currently-equipped item in any slot, so the player doesn't end up
// with a dangling reference to an item they no longer own.
router.post('/sell/:itemId', async (req, res) => {
  const item = itemById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.unlockReward) return res.status(403).json({ error: 'Milestone rewards cannot be sold.' });

  const { rows: ownRows } = await pool.query(
    'SELECT id FROM user_inventory WHERE user_id = $1 AND item_id = $2',
    [req.userId, item.id]
  );
  if (!ownRows.length) return res.status(403).json({ error: 'Not in inventory' });

  const refund = Math.max(1, Math.floor((item.cost || 0) * 0.5));

  // Unequip from every slot that references this item so the player can't
  // end up "wearing" something they no longer own.
  const slots = ['weapon', 'armor', 'banner', 'badge', 'companion', 'title'];
  for (const slot of slots) {
    await pool.query(
      `UPDATE user_equipped SET ${slot} = NULL WHERE user_id = $1 AND ${slot} = $2`,
      [req.userId, item.id]
    );
  }

  await pool.query('DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2', [req.userId, item.id]);
  await pool.query('UPDATE users SET gold = gold + $1 WHERE id = $2', [refund, req.userId]);
  const { rows: updated } = await pool.query('SELECT gold FROM users WHERE id = $1', [req.userId]);
  res.json({ success: true, refund, gold: updated[0].gold });
});

// Unequip a slot
router.delete('/equip/:slot', async (req, res) => {
  const slot = req.params.slot;
  if (!['weapon', 'armor', 'banner', 'badge', 'companion', 'title'].includes(slot))
    return res.status(400).json({ error: 'Invalid slot' });

  await pool.query(
    `INSERT INTO user_equipped (user_id, ${slot}) VALUES ($1, NULL)
     ON CONFLICT (user_id) DO UPDATE SET ${slot} = NULL`,
    [req.userId]
  );
  res.json({ success: true });
});

// Use a consumable — one-time use, removed from inventory after
router.post('/use/:itemId', async (req, res) => {
  const item = itemById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.type !== 'consumable') return res.status(400).json({ error: 'Not a consumable' });

  // Check ownership
  const { rows } = await pool.query(
    'SELECT id FROM user_inventory WHERE user_id = $1 AND item_id = $2',
    [req.userId, item.id]
  );
  if (!rows.length) return res.status(403).json({ error: 'Not in inventory' });

  const { addXP, addGold } = require('../utils/xp');
  let result = {};

  if (item.id === 'potion_xp') {
    await addXP(req.userId, 500);
    result = { xpGained: 500 };
  } else if (item.id === 'potion_minor_xp') {
    await addXP(req.userId, 100);
    result = { xpGained: 100 };
  } else if (item.id === 'potion_gold') {
    const g = await addGold(req.userId, 500);
    result = { goldGained: g?.granted ?? 500 };
  } else if (item.id === 'cake_birthday') {
    await addXP(req.userId, 1500);
    result = { xpGained: 1500, message: '🎂 Make a wish!' };
  } else if (item.id === 'scroll_double') {
    await addXP(req.userId, 3000);
    result = { xpGained: 3000, message: 'Reality bends.' };
  } else if (item.id === 'elixir_gold') {
    const g = await addGold(req.userId, 1000);
    result = { goldGained: g?.granted ?? 1000 };
  } else if (item.id === 'baguette_stale') {
    await addXP(req.userId, 1);
    result = { xpGained: 1, message: 'Stale, but somehow nutritious.' };
  } else if (item.id === 'potion_frog') {
    await addXP(req.userId, 200);
    result = { xpGained: 200, message: 'Ribbit! 🐸' };
  } else {
    return res.status(400).json({ error: 'Unknown consumable effect' });
  }

  // Remove from inventory (one-time use)
  await pool.query(
    'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
    [req.userId, item.id]
  );

  const { rows: updated } = await pool.query('SELECT xp, level, gold FROM users WHERE id = $1', [req.userId]);
  res.json({ success: true, ...result, user: updated[0] });
});

// Save avatar appearance
router.post('/appearance', async (req, res) => {
  const { skin, hair, eyes, hair_style, gender, beard } = req.body;
  await pool.query(
    `UPDATE users SET
      avatar_skin = COALESCE($1, avatar_skin),
      avatar_hair = COALESCE($2, avatar_hair),
      avatar_eyes = COALESCE($3, avatar_eyes),
      avatar_hair_style = COALESCE($4, avatar_hair_style),
      avatar_gender = COALESCE($5, avatar_gender),
      avatar_beard = COALESCE($6, avatar_beard)
     WHERE id = $7`,
    [skin, hair, eyes, hair_style, gender, beard, req.userId]
  );
  res.json({ success: true });
});

module.exports = router;
