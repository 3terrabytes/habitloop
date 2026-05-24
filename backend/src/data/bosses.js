// Multiplayer raid bosses. One is rolled per party run, scaled to the party
// size and floor. Bosses are intentionally bigger than dungeon tier-5 monsters
// so a coordinated party feels rewarded.
//
// `taunts` is an array of strings. {name} is substituted with the host's
// username when the boss is rolled, so the boss feels like it knows the
// player (instead of generic flavor text).
//
// `weakTo` / `resistantTo` are arrays of attack element ids ('fire', 'ice',
// 'lightning', 'physical', 'arcane', 'holy', 'shadow', 'poison'). The
// elemental damage math is applied in routes/party.js.
//
// `phases` lists the HP thresholds (as fractions of max HP) at which the
// boss changes behavior. When boss_hp / boss_max_hp crosses a threshold,
// powerMult adjusts the boss's effective power; behavior is a tag the
// combat sim can read.

const BOSSES = [
  {
    id: 'gravelord', name: 'The Gravelord', sprite: '👹', element: 'shadow',
    power: 38, baseHp: 600,
    weakTo: ['holy', 'fire'], resistantTo: ['shadow', 'poison'],
    taunts: [
      'Bones of heroes pave this floor, {name}.',
      'You smell of fear, {name}. I like it.',
      'I have buried a thousand of your kind. {name}, you are no different.',
    ],
    phases: [
      { atPct: 1.00, powerMult: 1.0, behavior: 'normal' },
      { atPct: 0.66, powerMult: 1.0, behavior: 'summon_adds' },
      { atPct: 0.33, powerMult: 1.4, behavior: 'enrage' },
    ],
  },
  {
    id: 'lich_king', name: 'Lich King Azuralis', sprite: '💀', element: 'shadow',
    power: 42, baseHp: 700,
    weakTo: ['holy', 'fire'], resistantTo: ['shadow', 'ice'],
    taunts: [
      'Your souls will warm my crown, {name}.',
      'Kneel, {name}. Death has come for you.',
      'A thousand winters could not match my chill, {name}.',
    ],
    phases: [
      { atPct: 1.00, powerMult: 1.0, behavior: 'normal' },
      { atPct: 0.66, powerMult: 1.0, behavior: 'summon_adds' },
      { atPct: 0.33, powerMult: 1.5, behavior: 'enrage' },
    ],
  },
  {
    id: 'fire_titan', name: 'Magmar the Titan', sprite: '🔥', element: 'fire',
    power: 44, baseHp: 750,
    weakTo: ['ice', 'physical'], resistantTo: ['fire', 'arcane'],
    taunts: [
      'I AM THE FORGE, {name}!',
      'I will reduce you to cinders, {name}.',
      'Burn brightly for me, {name}.',
    ],
    phases: [
      { atPct: 1.00, powerMult: 1.0, behavior: 'normal' },
      { atPct: 0.66, powerMult: 1.1, behavior: 'molten_aura' },
      { atPct: 0.33, powerMult: 1.5, behavior: 'enrage' },
    ],
  },
  {
    id: 'ice_serpent', name: 'Glacirix, the Endless', sprite: '🐉', element: 'ice',
    power: 40, baseHp: 720,
    weakTo: ['fire', 'lightning'], resistantTo: ['ice', 'physical'],
    taunts: [
      'A cold welcome, {name}.',
      'The frost knows your name, {name}.',
      'You will sleep in my ice, {name}.',
    ],
    phases: [
      { atPct: 1.00, powerMult: 1.0, behavior: 'normal' },
      { atPct: 0.66, powerMult: 1.0, behavior: 'frost_armor' },
      { atPct: 0.33, powerMult: 1.4, behavior: 'enrage' },
    ],
  },
  {
    id: 'void_prince', name: 'Prince of the Void', sprite: '👁️', element: 'arcane',
    power: 46, baseHp: 800,
    weakTo: ['holy'], resistantTo: ['arcane', 'shadow', 'poison'],
    taunts: [
      'You are seen, {name}. You are nothing.',
      'The void hungers for you, {name}.',
      'There is no escape, {name}. There never was.',
    ],
    phases: [
      { atPct: 1.00, powerMult: 1.0, behavior: 'normal' },
      { atPct: 0.66, powerMult: 1.1, behavior: 'reality_warp' },
      { atPct: 0.33, powerMult: 1.6, behavior: 'enrage' },
    ],
  },
];

// Pick a random boss, then scale its HP and power to:
//   partySize (more players -> more HP)
//   floor     (higher floor -> stat ramp)
// Substitutes {name} in a randomly-chosen taunt with the host's username.
function rollBoss(partySize, floor, hostName) {
  const base = BOSSES[Math.floor(Math.random() * BOSSES.length)];
  const sizeMult  = 1 + (Math.max(1, partySize) - 1) * 0.85;
  const floorMult = 1 + Math.max(0, (floor || 20) - 20) * 0.12;
  const hp = Math.round(base.baseHp * sizeMult * floorMult);
  const taunt = pickTaunt(base, hostName);
  return {
    id: base.id,
    name: base.name,
    sprite: base.sprite,
    element: base.element,
    weakTo: base.weakTo || [],
    resistantTo: base.resistantTo || [],
    phases: base.phases || [],
    phase_index: 0,
    base_power: Math.round(base.power * floorMult),
    power: Math.round(base.power * floorMult),
    hp, max_hp: hp,
    xp:   Math.round(140 * floorMult * sizeMult),
    gold: Math.round(220 * floorMult * sizeMult),
    taunt,
  };
}

function pickTaunt(base, hostName) {
  const list = base.taunts || ['You will not survive.'];
  const raw = list[Math.floor(Math.random() * list.length)];
  return raw.replace(/\{name\}/g, hostName || 'mortal');
}

module.exports = { BOSSES, rollBoss, pickTaunt };
