// Monsters spawned in the dungeon. Difficulty roughly increases with `tier`:
//   1-2 = early rooms, 3-4 = mid, 5 = boss
//
// hp     = the monster's HP pool
// power  = base damage per attack
// xp     = reward XP on victory
// gold   = reward gold on victory
// sprite = big emoji used as the "model"
// taunt  = flavor text shown at battle start

const MONSTERS = [
  // ── tier 1: warmup ───────────────────────────────────────────────────
  { id: 'slime',       name: 'Green Slime',     tier: 1, hp: 30,  power: 6,  xp: 12, gold: 14, sprite: '🟢', element: 'poison',   taunt: 'It jiggles menacingly.' },
  { id: 'bat',         name: 'Cave Bat',        tier: 1, hp: 26,  power: 8,  xp: 13, gold: 16, sprite: '🦇', element: 'shadow',   taunt: 'Screeches in the dark.' },
  { id: 'rat',         name: 'Plague Rat',      tier: 1, hp: 22,  power: 7,  xp: 11, gold: 12, sprite: '🐀', element: 'poison',   taunt: 'You smell it before you see it.' },

  // ── tier 2: standard ─────────────────────────────────────────────────
  { id: 'goblin',      name: 'Goblin Scout',    tier: 2, hp: 45,  power: 10, xp: 22, gold: 28, sprite: '👺', element: 'physical', taunt: 'It grins, showing too many teeth.' },
  { id: 'skeleton',    name: 'Skeleton',        tier: 2, hp: 50,  power: 11, xp: 24, gold: 30, sprite: '💀', element: 'shadow',   taunt: 'The bones rattle into formation.' },
  { id: 'spider',      name: 'Giant Spider',    tier: 2, hp: 48,  power: 12, xp: 25, gold: 32, sprite: '🕷️', element: 'poison',   taunt: 'Eight eyes lock onto you.' },
  { id: 'wolf',        name: 'Dire Wolf',       tier: 2, hp: 55,  power: 13, xp: 27, gold: 34, sprite: '🐺', element: 'physical', taunt: 'A guttural growl fills the chamber.' },

  // ── tier 3: tough ────────────────────────────────────────────────────
  { id: 'orc',         name: 'Orc Brute',       tier: 3, hp: 80,  power: 15, xp: 40, gold: 55, sprite: '👹', element: 'physical', taunt: '"PUNY MORTAL."' },
  { id: 'wraith',      name: 'Vengeful Wraith', tier: 3, hp: 70,  power: 17, xp: 42, gold: 58, sprite: '👻', element: 'shadow',   taunt: 'The temperature drops twenty degrees.' },
  { id: 'mimic',       name: 'Mimic Chest',     tier: 3, hp: 90,  power: 14, xp: 44, gold: 72, sprite: '🎁', element: 'physical', taunt: 'You should have known better.' },

  // ── tier 4: elite ────────────────────────────────────────────────────
  { id: 'minotaur',    name: 'Minotaur',        tier: 4, hp: 120, power: 20, xp: 66, gold: 100, sprite: '🐂', element: 'physical', taunt: 'It paws the ground, then charges.' },
  { id: 'lich',        name: 'Frost Lich',      tier: 4, hp: 110, power: 22, xp: 72, gold: 105, sprite: '🧙', element: 'ice',      taunt: '"Your soul will warm my tomb."' },
  { id: 'phoenix',     name: 'Ember Phoenix',   tier: 4, hp: 115, power: 21, xp: 69, gold: 102, sprite: '🦅', element: 'fire',     taunt: 'It bursts into flame.' },

  // ── tier 5: bosses ───────────────────────────────────────────────────
  { id: 'dragon',      name: 'Ancient Dragon',  tier: 5, hp: 220, power: 28, xp: 155, gold: 240, sprite: '🐉', element: 'fire',      taunt: 'The dungeon shakes as it roars.' },
  { id: 'demon_lord',  name: 'Demon Lord',      tier: 5, hp: 240, power: 30, xp: 165, gold: 260, sprite: '😈', element: 'shadow',    taunt: '"At last. A challenger."' },
  { id: 'void_knight', name: 'Void Knight',     tier: 5, hp: 250, power: 26, xp: 180, gold: 280, sprite: '🌌', element: 'arcane',    taunt: 'A figure of impossible darkness draws its blade.' },
];

const monsterById = (id) => MONSTERS.find(m => m.id === id);

// Scale a monster's HP / damage / XP reward to the player's level so combat
// stays meaningful as gear improves. Below L4 the monster is unchanged;
// above that, +12% HP, +8% power, +10% xp per level (gold left flat since
// gold is rebalanced separately).
const scaleStats = (base, mult) => Math.round(base * mult);
const scaledMonster = (monster, playerLevel) => {
  if (!monster) return monster;
  const lv = Math.max(1, playerLevel || 1);
  const surplus = Math.max(0, lv - 3);
  if (surplus === 0) return monster;
  return {
    ...monster,
    hp: scaleStats(monster.hp, 1 + surplus * 0.12),
    power: scaleStats(monster.power, 1 + surplus * 0.08),
    xp: scaleStats(monster.xp, 1 + surplus * 0.10),
  };
};

// Pick a monster intent for the next turn. Pattern:
//   - Heavy hit every 3rd turn
//   - Defend every 4th turn (mid+ tiers)
//   - Otherwise: basic strike
// Returns { kind: 'strike' | 'heavy' | 'defend', power }
function pickIntent(monster, turn) {
  if (turn > 0 && turn % 3 === 0) {
    return { kind: 'heavy', power: Math.round(monster.power * 1.6) };
  }
  if (monster.tier >= 3 && turn > 0 && turn % 4 === 0) {
    return { kind: 'defend', power: 0 };
  }
  return { kind: 'strike', power: monster.power };
}

module.exports = { MONSTERS, monsterById, pickIntent, scaledMonster };
