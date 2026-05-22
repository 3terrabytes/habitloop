// Attacks available in the dungeon mini-game.
// Each attack belongs to a `weaponClass`. The player can only equip attacks
// whose weaponClass matches their currently equipped weapon's class (with
// 'any' being usable by everyone).
//
// power     = base damage. Final dmg = power + equipped magic
// cooldown  = turns until reusable (0 = always available)
// element   = used for animation tint + future resistance system
// animation = key the frontend uses to play the right effect
// tag       = optional status the attack applies — burn, poison, stun, chill,
//             defend, heal, lifesteal, defbreak
// learnCost = if present, attack is locked until the user buys it for this
//             much gold via POST /dungeon/attacks/:id/learn
// maxLevel  = max upgrade level (default 5)
//
// kept deliberately ASCII-only in identifiers so we can url-encode safely.

const DEFAULT_MAX_LEVEL = 5;

// Per-level upgrade pct applied to both damage and heal. Level 1 = 1.00x
// (base), level 5 = 1.80x. Each level costs more — see UPGRADE_COSTS.
const LEVEL_MULT = [1.00, 1.20, 1.40, 1.60, 1.80];
const UPGRADE_COSTS = { 2: 250, 3: 600, 4: 1200, 5: 2400 };

const ATTACKS = [
  // ── universal (any weapon) ───────────────────────────────────────────
  { id: 'punch',         name: 'Punch',          weaponClass: 'any',    power: 8,  cooldown: 0, element: 'physical', animation: 'dash',    emoji: '👊', desc: 'A no-nonsense fist to the face.' },
  { id: 'kick',          name: 'Roundhouse',     weaponClass: 'any',    power: 12, cooldown: 1, element: 'physical', animation: 'spin',    emoji: '🦵', desc: 'High-impact kick. Brief recovery after.' },
  { id: 'guard',         name: 'Guard',          weaponClass: 'any',    power: 0,  cooldown: 0, element: 'physical', animation: 'guard',   emoji: '🛡️', desc: 'Reduce incoming damage by 60% this turn.', tag: 'defend' },
  { id: 'rally',         name: 'Rally',          weaponClass: 'any',    power: 0,  cooldown: 4, element: 'holy',     animation: 'heal',    emoji: '💖', desc: 'Restore 25 HP.', tag: 'heal', heal: 25 },

  // ── sword ─────────────────────────────────────────────────────────────
  { id: 'slash',         name: 'Slash',          weaponClass: 'sword',  power: 14, cooldown: 0, element: 'physical', animation: 'slash',   emoji: '⚔️', desc: 'A clean, fast cut.' },
  { id: 'heavy_slash',   name: 'Heavy Slash',    weaponClass: 'sword',  power: 26, cooldown: 2, element: 'physical', animation: 'heavy',   emoji: '🗡️', desc: 'A wide, punishing swing.' },
  { id: 'riposte',       name: 'Riposte',        weaponClass: 'sword',  power: 18, cooldown: 1, element: 'physical', animation: 'parry',   emoji: '✨', desc: 'Counter-strike on the back foot.' },
  { id: 'whirlwind',     name: 'Whirlwind',      weaponClass: 'sword',  power: 22, cooldown: 3, element: 'physical', animation: 'spin',    emoji: '🌪️', desc: 'Spin attack — hits hard but leaves you open.' },
  { id: 'sun_cleave',    name: 'Sun Cleave',     weaponClass: 'sword',  power: 34, cooldown: 4, element: 'holy',     animation: 'heavy',   emoji: '☀️', desc: 'A radiant overhead cut. Learn for gold.', learnCost: 800 },

  // ── staff ─────────────────────────────────────────────────────────────
  { id: 'magic_missile', name: 'Magic Missile',  weaponClass: 'staff',  power: 16, cooldown: 0, element: 'arcane',   animation: 'missile', emoji: '✨', desc: 'Arcane projectile. Never misses.' },
  { id: 'fireball',      name: 'Fireball',       weaponClass: 'staff',  power: 24, cooldown: 2, element: 'fire',     animation: 'fire',    emoji: '🔥', desc: 'A roaring sphere of flame. Applies BURN — DoT and weakens defense.', tag: 'burn' },
  { id: 'frost_nova',    name: 'Frost Nova',     weaponClass: 'staff',  power: 20, cooldown: 2, element: 'ice',      animation: 'frost',   emoji: '❄️', desc: 'A shockwave of cold. Applies CHILL — target deals less damage.', tag: 'chill' },
  { id: 'mend',          name: 'Mend',           weaponClass: 'staff',  power: 0,  cooldown: 3, element: 'holy',     animation: 'heal',    emoji: '💚', desc: 'Restore 40 HP.', tag: 'heal', heal: 40 },
  { id: 'inferno',       name: 'Inferno',        weaponClass: 'staff',  power: 32, cooldown: 4, element: 'fire',     animation: 'fire',    emoji: '☄️', desc: 'A pillar of fire. Long burn + heavy defense break.', tag: 'burn', learnCost: 1100 },
  { id: 'deep_freeze',   name: 'Deep Freeze',    weaponClass: 'staff',  power: 18, cooldown: 4, element: 'ice',      animation: 'frost',   emoji: '🧊', desc: 'Freezes the target solid. STUN + heavy chill.', tag: 'freeze', learnCost: 1100 },

  // ── bow ───────────────────────────────────────────────────────────────
  { id: 'quick_shot',    name: 'Quick Shot',     weaponClass: 'bow',    power: 13, cooldown: 0, element: 'physical', animation: 'arrow',   emoji: '🏹', desc: 'A swift, low-commitment arrow.' },
  { id: 'aimed_shot',    name: 'Aimed Shot',     weaponClass: 'bow',    power: 30, cooldown: 3, element: 'physical', animation: 'arrow',   emoji: '🎯', desc: 'Slow draw, devastating hit.' },
  { id: 'volley',        name: 'Volley',         weaponClass: 'bow',    power: 22, cooldown: 2, element: 'physical', animation: 'volley',  emoji: '🌧️', desc: 'A rain of arrows.' },
  { id: 'storm_shot',    name: 'Storm Shot',     weaponClass: 'bow',    power: 22, cooldown: 2, element: 'lightning',animation: 'lightning',emoji: '⚡', desc: 'Crackling lightning. Chance to STUN.', tag: 'stun' },
  { id: 'piercing_arrow',name: 'Piercing Arrow', weaponClass: 'bow',    power: 32, cooldown: 3, element: 'physical', animation: 'arrow',   emoji: '🏹', desc: 'Splits armor like paper. Heavy defense break.', tag: 'defbreak', learnCost: 800 },

  // ── axe ───────────────────────────────────────────────────────────────
  { id: 'cleave',        name: 'Cleave',         weaponClass: 'axe',    power: 18, cooldown: 0, element: 'physical', animation: 'slash',   emoji: '🪓', desc: 'A brutal downward chop.' },
  { id: 'rend',          name: 'Rend',           weaponClass: 'axe',    power: 24, cooldown: 2, element: 'physical', animation: 'heavy',   emoji: '🩸', desc: 'Tears flesh and armor alike. Light defense break.', tag: 'defbreak' },
  { id: 'execute',       name: 'Execute',        weaponClass: 'axe',    power: 36, cooldown: 4, element: 'physical', animation: 'heavy',   emoji: '💀', desc: 'A finisher. Wide swing, huge damage.' },
  { id: 'berserk',       name: 'Berserk',        weaponClass: 'axe',    power: 42, cooldown: 5, element: 'physical', animation: 'heavy',   emoji: '🔥', desc: 'Rage-fueled chain of blows. Learn for gold.', learnCost: 1300 },

  // ── dagger ────────────────────────────────────────────────────────────
  { id: 'stab',          name: 'Stab',           weaponClass: 'dagger', power: 12, cooldown: 0, element: 'physical', animation: 'dash',    emoji: '🗡️', desc: 'A quick, precise jab.' },
  { id: 'backstab',      name: 'Backstab',       weaponClass: 'dagger', power: 28, cooldown: 3, element: 'physical', animation: 'dash',    emoji: '🌑', desc: 'Strike from the shadows.' },
  { id: 'poison_dart',   name: 'Poison Dart',    weaponClass: 'dagger', power: 14, cooldown: 1, element: 'poison',   animation: 'poison',  emoji: '☠️', desc: 'Venomous. Applies POISON for 3 turns.', tag: 'poison' },
  { id: 'venom_strike',  name: 'Venom Strike',   weaponClass: 'dagger', power: 22, cooldown: 3, element: 'poison',   animation: 'poison',  emoji: '🐍', desc: 'Deep cut laced with potent venom.', tag: 'poison', learnCost: 800 },

  // ── hammer ────────────────────────────────────────────────────────────
  { id: 'smash',         name: 'Smash',          weaponClass: 'hammer', power: 20, cooldown: 0, element: 'physical', animation: 'heavy',   emoji: '🔨', desc: 'Crushing overhead blow.' },
  { id: 'shockwave',     name: 'Shockwave',      weaponClass: 'hammer', power: 26, cooldown: 2, element: 'lightning',animation: 'shockwave',emoji: '💥', desc: 'Ground-shaking impact.' },
  { id: 'thunderclap',   name: 'Thunderclap',    weaponClass: 'hammer', power: 28, cooldown: 3, element: 'lightning',animation: 'lightning',emoji: '⚡', desc: 'Storm-fueled finisher. STUNS the target.', tag: 'stun' },
  { id: 'earthquake',    name: 'Earthquake',     weaponClass: 'hammer', power: 36, cooldown: 5, element: 'physical', animation: 'shockwave',emoji: '🌋', desc: 'The ground itself betrays your enemies.', tag: 'defbreak', learnCost: 1300 },

  // ── wand ──────────────────────────────────────────────────────────────
  { id: 'bolt',          name: 'Arcane Bolt',    weaponClass: 'wand',   power: 14, cooldown: 0, element: 'arcane',   animation: 'missile', emoji: '✨', desc: 'A focused beam of magic.' },
  { id: 'hex',           name: 'Hex',            weaponClass: 'wand',   power: 18, cooldown: 2, element: 'shadow',   animation: 'shadow',  emoji: '🌀', desc: 'Curses the target. Weakens their next strikes.', tag: 'chill' },
  { id: 'chaos_blast',   name: 'Chaos Blast',    weaponClass: 'wand',   power: 30, cooldown: 3, element: 'arcane',   animation: 'fire',    emoji: '💫', desc: 'Reality bends around the impact.' },
  { id: 'void_lance',    name: 'Void Lance',     weaponClass: 'wand',   power: 34, cooldown: 4, element: 'shadow',   animation: 'shadow',  emoji: '🕳️', desc: 'Pierces armor and soul alike.', tag: 'defbreak', learnCost: 1100 },

  // ── lance ─────────────────────────────────────────────────────────────
  { id: 'pierce',        name: 'Pierce',         weaponClass: 'lance',  power: 18, cooldown: 0, element: 'physical', animation: 'dash',    emoji: '🔱', desc: 'Drive the point home.' },
  { id: 'charge',        name: 'Charge',         weaponClass: 'lance',  power: 30, cooldown: 3, element: 'physical', animation: 'dash',    emoji: '🐎', desc: 'Full-tilt running attack.' },
  { id: 'celestial',     name: 'Celestial Bolt', weaponClass: 'lance',  power: 28, cooldown: 2, element: 'holy',     animation: 'lightning',emoji: '☄️', desc: 'Thrown like a falling star.' },
  { id: 'meteor_dive',   name: 'Meteor Dive',    weaponClass: 'lance',  power: 40, cooldown: 5, element: 'holy',     animation: 'fire',    emoji: '🌠', desc: 'Skybound plunge with devastating impact.', learnCost: 1300 },

  // ── scythe ────────────────────────────────────────────────────────────
  { id: 'reap',          name: 'Reap',           weaponClass: 'scythe', power: 22, cooldown: 0, element: 'shadow',   animation: 'slash',   emoji: '💀', desc: 'A wide harvesting arc.' },
  { id: 'soul_drain',    name: 'Soul Drain',     weaponClass: 'scythe', power: 18, cooldown: 2, element: 'shadow',   animation: 'shadow',  emoji: '👻', desc: 'Heal for half the damage dealt.', tag: 'lifesteal' },
  { id: 'death_blossom', name: "Death's Blossom",weaponClass: 'scythe', power: 32, cooldown: 4, element: 'shadow',   animation: 'shadow',  emoji: '🌑', desc: 'The harvest comes for all.' },
  { id: 'final_breath',  name: 'Final Breath',   weaponClass: 'scythe', power: 38, cooldown: 5, element: 'shadow',   animation: 'shadow',  emoji: '🕯️', desc: 'Steals the last spark of life.', tag: 'lifesteal', learnCost: 1300 },
];

const attackById = (id) => ATTACKS.find(a => a.id === id);

const attacksForClass = (weaponClass) => {
  if (!weaponClass) return ATTACKS.filter(a => a.weaponClass === 'any');
  return ATTACKS.filter(a => a.weaponClass === 'any' || a.weaponClass === weaponClass);
};

const DEFAULT_LOADOUT = ['punch', 'kick', 'guard', 'rally'];

const defaultLoadoutFor = (weaponClass) => {
  if (!weaponClass) return DEFAULT_LOADOUT;
  const classMoves = ATTACKS
    .filter(a => a.weaponClass === weaponClass && !a.learnCost)
    .sort((a, b) => (a.cooldown || 0) - (b.cooldown || 0))
    .slice(0, 3)
    .map(a => a.id);
  while (classMoves.length < 3) {
    const filler = DEFAULT_LOADOUT[classMoves.length];
    if (filler && !classMoves.includes(filler)) classMoves.push(filler);
    else break;
  }
  return [...classMoves, 'rally'];
};

const maxLevelFor = (a) => a?.maxLevel || DEFAULT_MAX_LEVEL;

const upgradeCostFor = (currentLevel) => UPGRADE_COSTS[currentLevel + 1] || null;

// Final damage after applying upgrade level.
const leveledPower = (attack, level) => {
  if (!attack) return 0;
  const lvl = Math.max(1, Math.min(level || 1, maxLevelFor(attack)));
  return Math.round((attack.power || 0) * LEVEL_MULT[lvl - 1]);
};

const leveledHeal = (attack, level) => {
  if (!attack || !attack.heal) return 0;
  const lvl = Math.max(1, Math.min(level || 1, maxLevelFor(attack)));
  return Math.round(attack.heal * LEVEL_MULT[lvl - 1]);
};

module.exports = {
  ATTACKS, attackById, attacksForClass,
  DEFAULT_LOADOUT, defaultLoadoutFor,
  DEFAULT_MAX_LEVEL, LEVEL_MULT, UPGRADE_COSTS,
  maxLevelFor, upgradeCostFor, leveledPower, leveledHeal,
};
