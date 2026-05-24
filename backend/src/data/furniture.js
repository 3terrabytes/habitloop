// Tavern decoration catalog. Same shape as items.js so the Decorations
// shop tab can render with identical card components.
//
// id        — stable string, used in DB rows for ownership + placement
// name      — display name
// emoji     — single emoji used as the catalog preview
// cost      — gold; mythic pieces (cost === 0) are drops only, not buyable
// rarity    — common | rare | epic | legendary | mythic
// size      — { w, h } in tavern tiles (12x8 grid). Most are 1x1.
// category  — furniture | wall | floor | mount
// mountable — true if it accepts an inventory item to display
// animated  — true if the rendered sprite should have a CSS animation
//             (flame flicker, runes glow, etc.). Legendary+ usually.

const FURNITURE = [
  // ── Common (15) — 100-250 gold ────────────────────────────────────
  { id: 'fn_wooden_stool',  name: 'Wooden Stool',    emoji: '🪑', cost: 100, rarity: 'common', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_plain_table',   name: 'Plain Table',     emoji: '🟫', cost: 180, rarity: 'common', size: {w:2,h:1}, category: 'furniture' },
  { id: 'fn_simple_chair',  name: 'Simple Chair',    emoji: '🪑', cost: 120, rarity: 'common', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_wall_torch',    name: 'Wall Torch',      emoji: '🔥', cost: 110, rarity: 'common', size: {w:1,h:1}, category: 'wall' },
  { id: 'fn_hay_bale',      name: 'Hay Bale',        emoji: '🌾', cost: 90,  rarity: 'common', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_barrel',        name: 'Wooden Barrel',   emoji: '🛢️', cost: 130, rarity: 'common', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_small_crate',   name: 'Small Crate',     emoji: '📦', cost: 90,  rarity: 'common', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_woven_rug',     name: 'Woven Rug',       emoji: '🟫', cost: 150, rarity: 'common', size: {w:2,h:1}, category: 'floor' },
  { id: 'fn_basic_shelf',   name: 'Basic Bookshelf', emoji: '📚', cost: 220, rarity: 'common', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_clay_vase',     name: 'Clay Vase',       emoji: '🏺', cost: 100, rarity: 'common', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_wooden_bucket', name: 'Wooden Bucket',   emoji: '🪣', cost: 80,  rarity: 'common', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_bench',         name: 'Simple Bench',    emoji: '🪑', cost: 170, rarity: 'common', size: {w:2,h:1}, category: 'furniture' },
  { id: 'fn_hanging_lant',  name: 'Hanging Lantern', emoji: '🏮', cost: 200, rarity: 'common', size: {w:1,h:1}, category: 'wall' },
  { id: 'fn_dried_herbs',   name: 'Dried Herbs',     emoji: '🌿', cost: 100, rarity: 'common', size: {w:1,h:1}, category: 'wall' },
  { id: 'fn_wall_hook',     name: 'Wall Hook',       emoji: '🪝', cost: 80,  rarity: 'common', size: {w:1,h:1}, category: 'wall' },

  // ── Rare (15) — 400-900 gold ──────────────────────────────────────
  { id: 'fn_padded_chair',  name: 'Padded Chair',         emoji: '🛋️', cost: 420, rarity: 'rare', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_cushion_bench', name: 'Cushioned Bench',      emoji: '🛋️', cost: 540, rarity: 'rare', size: {w:2,h:1}, category: 'furniture' },
  { id: 'fn_iron_cand',     name: 'Iron Candelabra',      emoji: '🕯️', cost: 580, rarity: 'rare', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_large_rug',     name: 'Large Woven Rug',      emoji: '🟧', cost: 600, rarity: 'rare', size: {w:3,h:2}, category: 'floor' },
  { id: 'fn_tall_shelf',    name: 'Tall Bookshelf',       emoji: '📚', cost: 720, rarity: 'rare', size: {w:1,h:2}, category: 'furniture' },
  { id: 'fn_weapon_rack',   name: 'Weapon Rack',          emoji: '⚔️',  cost: 800, rarity: 'rare', size: {w:1,h:1}, category: 'mount', mountable: true },
  { id: 'fn_banner_mount',  name: 'Banner Mount',         emoji: '🚩', cost: 800, rarity: 'rare', size: {w:1,h:1}, category: 'mount', mountable: true },
  { id: 'fn_fireplace',     name: 'Fireplace',            emoji: '🔥', cost: 750, rarity: 'rare', size: {w:2,h:1}, category: 'wall' },
  { id: 'fn_antlers',       name: 'Mounted Antlers',      emoji: '🦌', cost: 480, rarity: 'rare', size: {w:1,h:1}, category: 'wall' },
  { id: 'fn_music_stand',   name: 'Music Stand',          emoji: '🎼', cost: 460, rarity: 'rare', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_wine_cask',     name: 'Wine Cask',            emoji: '🍷', cost: 520, rarity: 'rare', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_ornate_vase',   name: 'Ornate Vase',          emoji: '🏺', cost: 500, rarity: 'rare', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_desk',          name: 'Parchment Desk',       emoji: '🗒️', cost: 620, rarity: 'rare', size: {w:2,h:1}, category: 'furniture' },
  { id: 'fn_oil_lamp',      name: 'Oil Lamp',             emoji: '🪔', cost: 450, rarity: 'rare', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_small_tapestry',name: 'Small Tapestry',       emoji: '🟪', cost: 690, rarity: 'rare', size: {w:1,h:1}, category: 'wall' },

  // ── Epic (12) — 1500-3000 gold ────────────────────────────────────
  { id: 'fn_gilded_throne', name: 'Gilded Throne',        emoji: '👑', cost: 2400, rarity: 'epic', size: {w:1,h:2}, category: 'furniture' },
  { id: 'fn_oak_table',     name: 'Oak Round Table',      emoji: '🟫', cost: 1700, rarity: 'epic', size: {w:2,h:2}, category: 'furniture' },
  { id: 'fn_gem_chand',     name: 'Gem Chandelier',       emoji: '💎', cost: 2200, rarity: 'epic', size: {w:1,h:1}, category: 'wall' },
  { id: 'fn_ornate_fp',     name: 'Ornate Fireplace',     emoji: '🏛️', cost: 2600, rarity: 'epic', size: {w:2,h:2}, category: 'wall' },
  { id: 'fn_armor_stand',   name: 'Full Armor Stand',     emoji: '🛡️', cost: 2200, rarity: 'epic', size: {w:1,h:2}, category: 'mount', mountable: true },
  { id: 'fn_trophy_stand',  name: 'Trophy Stand',         emoji: '🏆', cost: 1800, rarity: 'epic', size: {w:1,h:1}, category: 'mount', mountable: true },
  { id: 'fn_gilded_shelf',  name: 'Gilded Bookshelf',     emoji: '📕', cost: 1900, rarity: 'epic', size: {w:1,h:2}, category: 'furniture' },
  { id: 'fn_large_tap',     name: 'Large Tapestry',       emoji: '🟪', cost: 1600, rarity: 'epic', size: {w:2,h:2}, category: 'wall' },
  { id: 'fn_crystal_lant',  name: 'Crystal Lantern',      emoji: '🔮', cost: 1700, rarity: 'epic', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_treasure_chest',name: 'Treasure Chest',       emoji: '💰', cost: 2100, rarity: 'epic', size: {w:1,h:1}, category: 'furniture' },
  { id: 'fn_velvet_rug',    name: 'Velvet Rug',           emoji: '🟥', cost: 1500, rarity: 'epic', size: {w:3,h:2}, category: 'floor' },
  { id: 'fn_painting_land', name: 'Landscape Painting',   emoji: '🖼️', cost: 1600, rarity: 'epic', size: {w:1,h:1}, category: 'wall' },
  { id: 'fn_painting_self', name: 'Portrait of Self',     emoji: '🖼️', cost: 1900, rarity: 'epic', size: {w:1,h:1}, category: 'wall' },
  { id: 'fn_painting_myst', name: 'Mysterious Figure',    emoji: '🖼️', cost: 1700, rarity: 'epic', size: {w:1,h:1}, category: 'wall' },

  // ── Legendary (8) — 6000-12000 gold, animated ─────────────────────
  { id: 'fn_dragon_skull',  name: 'Dragon-Skull Mount',   emoji: '🐲', cost: 9000,  rarity: 'legendary', size: {w:2,h:2}, category: 'wall',  animated: true },
  { id: 'fn_levitating',    name: 'Levitating Throne',    emoji: '👑', cost: 10000, rarity: 'legendary', size: {w:1,h:2}, category: 'furniture', animated: true },
  { id: 'fn_hearthstone',   name: 'Hearthstone Fireplace',emoji: '🔥', cost: 11000, rarity: 'legendary', size: {w:2,h:2}, category: 'wall',  animated: true },
  { id: 'fn_pet_pedestal',  name: 'Crystal Pet Pedestal', emoji: '✨', cost: 8500,  rarity: 'legendary', size: {w:1,h:1}, category: 'mount', mountable: true, animated: true },
  { id: 'fn_gold_weapon',   name: 'Golden Weapon Rack',   emoji: '🏅', cost: 9500,  rarity: 'legendary', size: {w:1,h:1}, category: 'mount', mountable: true, animated: true },
  { id: 'fn_tome',          name: 'Glowing Ancient Tome', emoji: '📖', cost: 7500,  rarity: 'legendary', size: {w:1,h:1}, category: 'furniture', animated: true },
  { id: 'fn_reflection',    name: 'Reflection Pool',      emoji: '🪞', cost: 8000,  rarity: 'legendary', size: {w:2,h:2}, category: 'floor', animated: true },
  { id: 'fn_starry_window', name: 'Starry-Night Window',  emoji: '🌌', cost: 6000,  rarity: 'legendary', size: {w:2,h:1}, category: 'wall',  animated: true },

  // ── Mythic (5) — drops only ───────────────────────────────────────
  // cost: 0 + dropOnly: true means the shop hides them; they come from
  // first-clear rewards on specific bosses.
  { id: 'fn_void_portal',   name: 'Void Portal',           emoji: '🌀', cost: 0, rarity: 'mythic', size: {w:2,h:2}, category: 'wall',  animated: true, dropOnly: true, dropFrom: 'void_prince' },
  { id: 'fn_mini_dragon',   name: 'Mini-Dragon Statue',    emoji: '🐉', cost: 0, rarity: 'mythic', size: {w:1,h:1}, category: 'furniture', animated: true, dropOnly: true, dropFrom: 'ice_serpent' },
  { id: 'fn_eternal_flame', name: 'Eternal Flame Brazier', emoji: '🕯️', cost: 0, rarity: 'mythic', size: {w:1,h:1}, category: 'furniture', animated: true, dropOnly: true, dropFrom: 'fire_titan' },
  { id: 'fn_void_throne',   name: 'Throne of the Void',    emoji: '👁️', cost: 0, rarity: 'mythic', size: {w:1,h:2}, category: 'furniture', animated: true, dropOnly: true, dropFrom: 'gravelord' },
  { id: 'fn_mirror_realm',  name: 'Mirror of the Realm',   emoji: '🪞', cost: 0, rarity: 'mythic', size: {w:1,h:1}, category: 'wall',      animated: true, dropOnly: true, dropFrom: 'lich_king' },
];

const furnitureById = (id) => FURNITURE.find(f => f.id === id);

// Pieces that anyone can spawn into a new tavern automatically so the room
// is not empty on first visit.
const STARTER_FURNITURE = [
  'fn_wooden_stool', 'fn_plain_table', 'fn_wall_torch', 'fn_simple_chair',
];

module.exports = { FURNITURE, furnitureById, STARTER_FURNITURE };
