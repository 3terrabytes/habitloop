// Equippable player emotes. A user owns a set of emotes and equips ONE
// at a time. Pressing E (or clicking the emote button) plays the
// equipped emote above their avatar on home / tavern / raid.
//
// Each emote has an `animation` key — the frontend renders an emote
// overlay (emoji or small sprite) and applies that CSS class to it.
// We keep the catalog entirely in this file; no DB row per emote.
//
// Starter emotes are auto-granted to every user on first emote-fetch.

const EMOTES = [
  // ── Starters (auto-granted, cost 0) ─────────────────────────────────
  { id: 'wave',  name: 'Wave',  rarity: 'common', cost: 0,    animation: 'emote-wave',  glyph: '👋' },
  { id: 'bow',   name: 'Bow',   rarity: 'common', cost: 0,    animation: 'emote-bow',   glyph: '🙇' },
  { id: 'clap',  name: 'Clap',  rarity: 'common', cost: 0,    animation: 'emote-clap',  glyph: '👏' },
  { id: 'nod',   name: 'Nod',   rarity: 'common', cost: 0,    animation: 'emote-nod',   glyph: '👍' },

  // ── Cheap (50-100 gold) ─────────────────────────────────────────────
  { id: 'dance', name: 'Dance', rarity: 'common', cost: 80,   animation: 'emote-dance', glyph: '💃' },
  { id: 'sleep', name: 'Sleep', rarity: 'common', cost: 60,   animation: 'emote-sleep', glyph: '😴' },
  { id: 'shrug', name: 'Shrug', rarity: 'common', cost: 50,   animation: 'emote-shrug', glyph: '🤷' },
  { id: 'point', name: 'Point', rarity: 'common', cost: 50,   animation: 'emote-point', glyph: '👉' },

  // ── Rare (300-600 gold) ─────────────────────────────────────────────
  { id: 'cheer',  name: 'Cheer',  rarity: 'rare', cost: 320,  animation: 'emote-cheer',  glyph: '🎉' },
  { id: 'flex',   name: 'Flex',   rarity: 'rare', cost: 500,  animation: 'emote-flex',   glyph: '💪' },
  { id: 'salute', name: 'Salute', rarity: 'rare', cost: 480,  animation: 'emote-salute', glyph: '🫡' },
  { id: 'laugh',  name: 'Laugh',  rarity: 'rare', cost: 380,  animation: 'emote-laugh',  glyph: '😂' },

  // ── Epic (1500 gold) ────────────────────────────────────────────────
  { id: 'meditate', name: 'Meditate', rarity: 'epic', cost: 1500, animation: 'emote-meditate', glyph: '🧘' },
  { id: 'levitate', name: 'Levitate', rarity: 'epic', cost: 1500, animation: 'emote-levitate', glyph: '🌀' },

  // ── Legendary (5000 gold) ───────────────────────────────────────────
  { id: 'god_mode',       name: 'God Mode',       rarity: 'legendary', cost: 5000, animation: 'emote-godmode',  glyph: '✨' },
  { id: 'sparkle_burst',  name: 'Sparkle Burst',  rarity: 'legendary', cost: 4500, animation: 'emote-sparkle',  glyph: '🌟' },
];

const STARTER_EMOTE_IDS = EMOTES.filter(e => e.cost === 0).map(e => e.id);
const emoteById = (id) => EMOTES.find(e => e.id === id);

module.exports = { EMOTES, STARTER_EMOTE_IDS, emoteById };
