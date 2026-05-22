// Achievement definitions. `criteria` names a key returned by collectStats()
// in routes/achievements.js. Tickd is dungeon-only: progression criteria are
// level, gold, items, friends, and dungeon-run metrics.

const ACHIEVEMENTS = [
  // Levels
  { code: 'level_5',          name: 'Apprentice',        desc: 'Reach level 5',                      emoji: '⭐',  rarity: 'common',    criteria: 'level', threshold: 5 },
  { code: 'level_10',         name: 'Adept',             desc: 'Reach level 10',                     emoji: '✨',  rarity: 'rare',      criteria: 'level', threshold: 10 },
  { code: 'level_25',         name: 'Veteran',           desc: 'Reach level 25',                     emoji: '🏅', rarity: 'epic',      criteria: 'level', threshold: 25 },
  { code: 'level_50',         name: 'Hero',              desc: 'Reach level 50',                     emoji: '🏆', rarity: 'legendary', criteria: 'level', threshold: 50 },

  // Dungeon — ascension (boss clears)
  { code: 'ascension_1',      name: 'Boss Slayer',       desc: 'Defeat your first dungeon boss',     emoji: '⚔️', rarity: 'common',    criteria: 'ascension', threshold: 1 },
  { code: 'ascension_5',      name: 'Conqueror',         desc: 'Clear 5 dungeon bosses',             emoji: '🗡️', rarity: 'rare',      criteria: 'ascension', threshold: 5 },
  { code: 'ascension_10',     name: 'Warlord',           desc: 'Clear 10 dungeon bosses',            emoji: '👑', rarity: 'epic',      criteria: 'ascension', threshold: 10 },
  { code: 'ascension_25',     name: 'Eternal Champion',  desc: 'Clear 25 dungeon bosses',            emoji: '🌌', rarity: 'legendary', criteria: 'ascension', threshold: 25 },

  // Dungeon — survival waves
  { code: 'wave_10',          name: 'Wave Rider',        desc: 'Reach wave 10 in Survival',          emoji: '🌊', rarity: 'common',    criteria: 'best_wave', threshold: 10 },
  { code: 'wave_25',          name: 'Tide Breaker',      desc: 'Reach wave 25 in Survival',          emoji: '🌊', rarity: 'rare',      criteria: 'best_wave', threshold: 25 },
  { code: 'wave_50',          name: 'Endless',           desc: 'Reach wave 50 in Survival',          emoji: '♾️', rarity: 'epic',      criteria: 'best_wave', threshold: 50 },
  { code: 'wave_100',         name: 'Storm Lord',        desc: 'Reach wave 100 in Survival',         emoji: '⚡', rarity: 'legendary', criteria: 'best_wave', threshold: 100 },

  // Wealth
  { code: 'first_purchase',   name: 'Window Shopper',    desc: 'Buy your first item',                emoji: '🛒', rarity: 'common',    criteria: 'items_owned', threshold: 1 },
  { code: 'legendary_owner',  name: 'Treasure Hunter',   desc: 'Own a legendary item',               emoji: '💎', rarity: 'epic',      criteria: 'legendary_owned', threshold: 1 },
  { code: 'rich_1000',        name: 'Comfortable',       desc: 'Earn 1000 gold lifetime',            emoji: '🪙', rarity: 'common',    criteria: 'lifetime_gold', threshold: 1000 },
  { code: 'rich_10000',       name: 'Wealthy',           desc: 'Earn 10000 gold lifetime',           emoji: '💰', rarity: 'rare',      criteria: 'lifetime_gold', threshold: 10000 },

  // Social
  { code: 'first_friend',     name: 'Companion',         desc: 'Make your first friend',             emoji: '🤝', rarity: 'common',    criteria: 'friend_count', threshold: 1 },
  { code: 'social_5',         name: 'Well Connected',    desc: 'Have 5 friends',                     emoji: '👥', rarity: 'rare',      criteria: 'friend_count', threshold: 5 },
];

const byCode = (code) => ACHIEVEMENTS.find(a => a.code === code);

module.exports = { ACHIEVEMENTS, byCode };
