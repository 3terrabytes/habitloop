// XP needed to reach a given level (quadratic scaling)
const xpForLevel = (level) => Math.floor(100 * Math.pow(level, 1.5));

// Calculate level from total XP
const levelFromXP = (xp) => {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
};

// Full L1-L100 title progression (kept in sync with frontend/src/utils/xp.js)
const LEVEL_TITLES = [
  '',
  'Rookie','Apprentice','Explorer','Achiever','Challenger','Warrior','Champion','Master','Grandmaster','Legend',
  'Mythic','Ascendant','Transcendent','Eternal','Demigod','Celestial','Cosmic','Apex','Sovereign','Avatar',
  'Stargazer','Starborn','Astral Knight','Solar Sage','Lunar Lord','Comet','Pulsar','Nebula','Galaxy-Walker','Cosmonaut',
  'Chrono-Touched','Time Reaver','Era Walker','Aeon Lord','Epoch','Past-Eater','Future-Seer','Now','Forever','Outside Time',
  'Saint','Prophet','Cardinal','Hierophant','Oracle','Seraph','Cherub','Throne','Power','Dominion',
  'Constellation','Singularity','Black Hole','White Hole','Universe-Bound','Multiverse','Quantum','Wavefront','Particle','Reality Anchor',
  'Dreamwalker','Nightmare','Vision','Mirage','Echo','Shadow','Reflection','Whisper','Murmur','Forgotten',
  'Unwritten','Unspoken','Unsung','Hidden','Veiled','Sealed','Locked','Bound','Unbound','Released',
  'The Nameless','Without Form','Beyond Words','Inconceivable','The Other','Outside','Beyond','Without End','Without Beginning','Eternal Now',
  'He Who Was','She Who Will Be','The All','The One','The Many','The Source','The Sink','Penultimate','Tickd God','Tickd Incarnate',
];

const levelTitle = (level) => LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)] || 'Tickd Incarnate';

// Banners awarded automatically at certain milestone levels — these items
// must exist in data/items.js with `unlockReward: true` (kept out of the shop).
const LEVEL_REWARD_BANNERS = {
  25:  'banner_veteran',
  50:  'banner_ascendant',
  100: 'banner_incarnate',
};

// Rebirth multiplier — multiplier on all earned XP and gold.
// 0 rebirths = 1x, 1 = 1.5x, 2 = 2.0x, ... +0.5x per rebirth.
const rebirthMult = (rebirthCount) => 1 + 0.5 * (rebirthCount || 0);

// Add XP to a user. Applies the rebirth multiplier in SQL so every call
// site benefits transparently. Levels up if needed, grants milestone-reward
// banners on threshold crossings, and returns the actual granted amount.
const addXP = async (userId, amount) => {
  const { pool } = require('../db');
  if (!amount || amount <= 0) return null;
  const { rows } = await pool.query(
    `UPDATE users
     SET xp = xp + GREATEST(0, ROUND($1::numeric * (1 + 0.5 * COALESCE(rebirth_count, 0))))::int
     WHERE id = $2
     RETURNING xp, level,
       GREATEST(0, ROUND($1::numeric * (1 + 0.5 * COALESCE(rebirth_count, 0))))::int AS granted`,
    [amount, userId]
  );
  if (!rows.length) return null;
  const oldLevel = rows[0].level;
  const newLevel = levelFromXP(rows[0].xp);
  if (newLevel > oldLevel) {
    await pool.query('UPDATE users SET level = $1 WHERE id = $2', [newLevel, userId]);
    for (const [thresholdStr, itemId] of Object.entries(LEVEL_REWARD_BANNERS)) {
      const threshold = parseInt(thresholdStr);
      if (newLevel >= threshold && oldLevel < threshold) {
        try {
          await pool.query(
            `INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)
             ON CONFLICT (user_id, item_id) DO NOTHING`,
            [userId, itemId]
          );
        } catch (err) {
          console.error(`Level-reward grant failed: L${threshold} -> ${itemId}`, err);
        }
      }
    }
  }
  return { granted: rows[0].granted, xp: rows[0].xp, level: newLevel };
};

// Add gold to a user, applying the rebirth multiplier in SQL. Updates the
// lifetime_gold counter at the same time. Returns the actual granted amount
// so callers can log/display the post-multiplier value.
const addGold = async (userId, amount) => {
  const { pool } = require('../db');
  if (!amount || amount <= 0) return null;
  const { rows } = await pool.query(
    `UPDATE users
     SET gold          = gold + GREATEST(0, ROUND($1::numeric * (1 + 0.5 * COALESCE(rebirth_count, 0))))::int,
         lifetime_gold = COALESCE(lifetime_gold, 0)
                       + GREATEST(0, ROUND($1::numeric * (1 + 0.5 * COALESCE(rebirth_count, 0))))::int
     WHERE id = $2
     RETURNING gold,
       GREATEST(0, ROUND($1::numeric * (1 + 0.5 * COALESCE(rebirth_count, 0))))::int AS granted`,
    [amount, userId]
  );
  if (!rows.length) return null;
  return { granted: rows[0].granted, gold: rows[0].gold };
};

module.exports = { xpForLevel, levelFromXP, levelTitle, addXP, addGold, rebirthMult, LEVEL_REWARD_BANNERS };
