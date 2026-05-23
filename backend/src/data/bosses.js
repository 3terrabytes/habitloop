// Multiplayer raid bosses. One is rolled per party run, scaled to the party
// size and floor. Bosses are intentionally bigger than dungeon tier-5 monsters
// so a coordinated party feels rewarded.

const BOSSES = [
  { id: 'gravelord',   name: 'The Gravelord',        sprite: '👹', element: 'shadow', power: 38, baseHp: 600, taunt: 'Bones of heroes pave this floor.' },
  { id: 'lich_king',   name: 'Lich King Azuralis',   sprite: '💀', element: 'shadow', power: 42, baseHp: 700, taunt: 'Your souls will warm my crown.' },
  { id: 'fire_titan',  name: 'Magmar the Titan',     sprite: '🔥', element: 'fire',   power: 44, baseHp: 750, taunt: 'I AM THE FORGE.' },
  { id: 'ice_serpent', name: 'Glacirix, the Endless', sprite: '🐉', element: 'ice',    power: 40, baseHp: 720, taunt: 'A cold welcome, mortals.' },
  { id: 'void_prince', name: 'Prince of the Void',   sprite: '👁️', element: 'arcane', power: 46, baseHp: 800, taunt: 'You are seen. You are nothing.' },
];

// Pick a random boss, then scale its HP and power to:
//   partySize (more players -> more HP)
//   floor     (higher floor -> stat ramp)
function rollBoss(partySize, floor) {
  const base = BOSSES[Math.floor(Math.random() * BOSSES.length)];
  const sizeMult  = 1 + (Math.max(1, partySize) - 1) * 0.85; // 2p ~1.85x, 3p ~2.7x, 4p ~3.55x
  const floorMult = 1 + Math.max(0, (floor || 20) - 20) * 0.12;
  const hp = Math.round(base.baseHp * sizeMult * floorMult);
  return {
    id: base.id,
    name: base.name,
    sprite: base.sprite,
    element: base.element,
    power: Math.round(base.power * floorMult),
    hp, max_hp: hp,
    xp:   Math.round(140 * floorMult * sizeMult),
    gold: Math.round(220 * floorMult * sizeMult),
    taunt: base.taunt,
  };
}

module.exports = { BOSSES, rollBoss };
