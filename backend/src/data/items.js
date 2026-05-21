const RARITIES = {
  common:    { label: 'Common',    color: '#9ca3af', glow: '#9ca3af33', magic: [0, 5] },
  rare:      { label: 'Rare',      color: '#3b82f6', glow: '#3b82f633', magic: [6, 15] },
  epic:      { label: 'Epic',      color: '#8b5cf6', glow: '#8b5cf633', magic: [16, 30] },
  legendary: { label: 'Legendary', color: '#f59e0b', glow: '#f59e0b33', magic: [31, 50] },
  mythic:    { label: 'Mythic',    color: '#f0abfc', glow: '#f0abfc55', magic: [51, 80] },
};

const ITEMS = [
  // WEAPONS
  { id: 'sword_iron',      type: 'weapon', name: 'Iron Sword',         rarity: 'common',    cost: 80,   magic: 2,  emoji: '🗡️',  desc: 'A trusty blade for any adventurer.' },
  { id: 'sword_silver',    type: 'weapon', name: 'Silver Sword',       rarity: 'rare',      cost: 220,  magic: 10, emoji: '⚔️',  desc: 'Gleams with focused power.' },
  { id: 'sword_obsidian',  type: 'weapon', name: 'Obsidian Sword',     rarity: 'epic',      cost: 580,  magic: 26, emoji: '🔪',  desc: 'Carved from volcanic glass.' },
  { id: 'staff_oak',       type: 'weapon', name: 'Oak Staff',          rarity: 'common',    cost: 70,   magic: 4,  emoji: '🪄',  desc: 'Channels minor arcane energy.' },
  { id: 'staff_arcane',    type: 'weapon', name: 'Arcane Staff',       rarity: 'epic',      cost: 500,  magic: 24, emoji: '✨',  desc: 'Hums with unstable magic.' },
  { id: 'staff_void',      type: 'weapon', name: 'Void Staff',         rarity: 'legendary', cost: 1300, magic: 48, emoji: '🌌',  desc: 'Tears rifts in reality.' },
  { id: 'bow_hunters',     type: 'weapon', name: "Hunter's Bow",       rarity: 'common',    cost: 90,   magic: 3,  emoji: '🏹',  desc: 'Swift and accurate.' },
  { id: 'bow_elven',       type: 'weapon', name: 'Elven Bow',          rarity: 'rare',      cost: 280,  magic: 12, emoji: '🎯',  desc: 'Carved from ancient wood.' },
  { id: 'bow_storm',       type: 'weapon', name: 'Storm Bow',          rarity: 'epic',      cost: 560,  magic: 22, emoji: '⚡',  desc: 'Arrows crackle with lightning.' },
  { id: 'axe_battle',      type: 'weapon', name: 'Battle Axe',         rarity: 'rare',      cost: 240,  magic: 8,  emoji: '🪓',  desc: 'Heavy and devastating.' },
  { id: 'axe_rune',        type: 'weapon', name: 'Runic Axe',          rarity: 'epic',      cost: 520,  magic: 20, emoji: '🔱',  desc: 'Ancient runes glow along the blade.' },
  { id: 'dagger_shadow',   type: 'weapon', name: 'Shadow Dagger',      rarity: 'rare',      cost: 260,  magic: 11, emoji: '🌑',  desc: 'Strike from the darkness.' },
  { id: 'hammer_storm',    type: 'weapon', name: 'Stormhammer',        rarity: 'epic',      cost: 600,  magic: 25, emoji: '🔨',  desc: 'Thunder follows every swing.' },
  { id: 'scythe_death',    type: 'weapon', name: "Death's Scythe",     rarity: 'legendary', cost: 1600, magic: 50, emoji: '💀',  desc: 'Harvests the souls of the fallen.' },
  { id: 'blade_soul',      type: 'weapon', name: 'Soul Blade',         rarity: 'legendary', cost: 1200, magic: 45, emoji: '🌟',  desc: 'Forged from the tears of fallen heroes.' },
  { id: 'wand_chaos',      type: 'weapon', name: 'Chaos Wand',         rarity: 'legendary', cost: 1500, magic: 50, emoji: '💫',  desc: 'Reality bends around its tip.' },
  { id: 'lance_celestial', type: 'weapon', name: 'Celestial Lance',    rarity: 'legendary', cost: 1400, magic: 47, emoji: '☄️',  desc: 'Thrown by the gods themselves.' },

  // ARMOR
  { id: 'armor_leather',   type: 'armor',  name: 'Leather Armor',      rarity: 'common',    cost: 60,   magic: 1,  emoji: '🥋',  desc: 'Light and flexible.' },
  { id: 'armor_chain',     type: 'armor',  name: 'Chainmail',          rarity: 'common',    cost: 100,  magic: 3,  emoji: '🛡️',  desc: 'Solid protection.' },
  { id: 'armor_plate',     type: 'armor',  name: 'Plate Armor',        rarity: 'rare',      cost: 300,  magic: 9,  emoji: '⚙️',  desc: 'Heavy but near-impenetrable.' },
  { id: 'robe_mage',       type: 'armor',  name: 'Mage Robes',         rarity: 'rare',      cost: 260,  magic: 14, emoji: '👘',  desc: 'Woven with arcane thread.' },
  { id: 'robe_archmage',   type: 'armor',  name: 'Archmage Robes',     rarity: 'epic',      cost: 580,  magic: 27, emoji: '🎭',  desc: 'Worn by the great sorcerers.' },
  { id: 'cloak_shadow',    type: 'armor',  name: 'Shadow Cloak',       rarity: 'epic',      cost: 550,  magic: 22, emoji: '🌒',  desc: 'Shifts between shadows.' },
  { id: 'armor_dragon',    type: 'armor',  name: 'Dragonscale Mail',   rarity: 'epic',      cost: 620,  magic: 28, emoji: '🐉',  desc: 'Scales of an ancient dragon.' },
  { id: 'armor_celestial', type: 'armor',  name: 'Celestial Plate',    rarity: 'legendary', cost: 1400, magic: 46, emoji: '☀️',  desc: 'Blessed by the gods themselves.' },
  { id: 'armor_void',      type: 'armor',  name: 'Void Shroud',        rarity: 'legendary', cost: 1350, magic: 44, emoji: '🌌',  desc: 'Woven from the fabric of space.' },
  { id: 'hood_assassin',   type: 'armor',  name: "Assassin's Hood",    rarity: 'rare',      cost: 290,  magic: 13, emoji: '🕶️',  desc: 'You were never here.' },
  { id: 'cloak_phoenix',   type: 'armor',  name: 'Phoenix Cloak',      rarity: 'legendary', cost: 1500, magic: 48, emoji: '🦅',  desc: 'Rise from the ashes.' },

  // BANNERS
  { id: 'banner_red',      type: 'banner', name: 'Crimson Banner',     rarity: 'common',    cost: 50,   magic: 0,  color: 'linear-gradient(90deg,#7f1d1d,#dc2626)', desc: 'Bold and fierce.' },
  { id: 'banner_blue',     type: 'banner', name: 'Ocean Banner',       rarity: 'common',    cost: 50,   magic: 0,  color: 'linear-gradient(90deg,#1e3a5f,#3b82f6)', desc: 'Cool and steady.' },
  { id: 'banner_green',    type: 'banner', name: 'Forest Banner',      rarity: 'common',    cost: 50,   magic: 0,  color: 'linear-gradient(90deg,#14532d,#22c55e)', desc: 'Rooted and enduring.' },
  { id: 'banner_purple',   type: 'banner', name: 'Arcane Banner',      rarity: 'rare',      cost: 180,  magic: 0,  color: 'linear-gradient(90deg,#3b0764,#8b5cf6)', desc: 'Shimmers with magic.' },
  { id: 'banner_gold',     type: 'banner', name: 'Golden Banner',      rarity: 'rare',      cost: 200,  magic: 0,  color: 'linear-gradient(90deg,#78350f,#f59e0b)', desc: 'For champions only.' },
  { id: 'banner_midnight', type: 'banner', name: 'Midnight Banner',    rarity: 'rare',      cost: 190,  magic: 0,  color: 'linear-gradient(90deg,#0f0f2e,#3730a3)', desc: 'Draped in night.' },
  { id: 'banner_galaxy',   type: 'banner', name: 'Galaxy Banner',      rarity: 'epic',      cost: 480,  magic: 0,  color: 'linear-gradient(90deg,#0f172a,#6366f1,#ec4899)', desc: 'The cosmos itself.' },
  { id: 'banner_flame',    type: 'banner', name: 'Inferno Banner',     rarity: 'epic',      cost: 460,  magic: 0,  color: 'linear-gradient(90deg,#431407,#ea580c,#fbbf24)', desc: 'Burns eternal.' },
  { id: 'banner_storm',    type: 'banner', name: 'Tempest Banner',     rarity: 'epic',      cost: 470,  magic: 0,  color: 'linear-gradient(90deg,#0c1445,#0ea5e9,#a5f3fc)', desc: 'Lightning in the sky.' },
  { id: 'banner_aurora',   type: 'banner', name: 'Aurora Banner',      rarity: 'legendary', cost: 1000, magic: 0,  color: 'linear-gradient(90deg,#06b6d4,#8b5cf6,#ec4899,#f59e0b)', desc: 'Dances with living light.' },
  { id: 'banner_void',     type: 'banner', name: 'Void Banner',        rarity: 'legendary', cost: 980,  magic: 0,  color: 'linear-gradient(90deg,#000000,#1e1b4b,#7c3aed,#000000)', desc: 'Swallows all light.' },

  // BADGES
  { id: 'badge_flame',     type: 'badge',  name: 'Flame Badge',        rarity: 'common',    cost: 40,   magic: 0,  emoji: '🔥',  desc: 'For the dedicated.' },
  { id: 'badge_star',      type: 'badge',  name: 'Star Badge',         rarity: 'common',    cost: 40,   magic: 0,  emoji: '⭐',  desc: 'A shining mark.' },
  { id: 'badge_bolt',      type: 'badge',  name: 'Lightning Badge',    rarity: 'common',    cost: 45,   magic: 0,  emoji: '⚡',  desc: 'Fast and electric.' },
  { id: 'badge_leaf',      type: 'badge',  name: 'Leaf Badge',         rarity: 'common',    cost: 35,   magic: 0,  emoji: '🍃',  desc: 'Grounded and consistent.' },
  { id: 'badge_skull',     type: 'badge',  name: 'Skull Badge',        rarity: 'rare',      cost: 160,  magic: 0,  emoji: '💀',  desc: 'Fear me.' },
  { id: 'badge_crown',     type: 'badge',  name: 'Crown Badge',        rarity: 'rare',      cost: 180,  magic: 0,  emoji: '👑',  desc: 'Royalty.' },
  { id: 'badge_gem',       type: 'badge',  name: 'Gem Badge',          rarity: 'rare',      cost: 170,  magic: 0,  emoji: '💎',  desc: 'Precious and rare.' },
  { id: 'badge_moon',      type: 'badge',  name: 'Moon Badge',         rarity: 'rare',      cost: 155,  magic: 0,  emoji: '🌙',  desc: 'A night owl.' },
  { id: 'badge_dragon',    type: 'badge',  name: 'Dragon Badge',       rarity: 'epic',      cost: 420,  magic: 0,  emoji: '🐲',  desc: 'Dragonslayer.' },
  { id: 'badge_ghost',     type: 'badge',  name: 'Ghost Badge',        rarity: 'epic',      cost: 400,  magic: 0,  emoji: '👻',  desc: 'Haunt the leaderboard.' },
  { id: 'badge_phoenix',   type: 'badge',  name: 'Phoenix Badge',      rarity: 'epic',      cost: 440,  magic: 0,  emoji: '🦅',  desc: 'Never give up.' },
  { id: 'badge_legend',    type: 'badge',  name: 'Legend Badge',       rarity: 'legendary', cost: 900,  magic: 0,  emoji: '🏆',  desc: 'Only the greatest earn this.' },
  { id: 'badge_infinity',  type: 'badge',  name: 'Infinity Badge',     rarity: 'legendary', cost: 950,  magic: 0,  emoji: '♾️',  desc: 'Beyond measure.' },
  { id: 'badge_void',      type: 'badge',  name: 'Void Badge',         rarity: 'legendary', cost: 1000, magic: 0,  emoji: '🌌',  desc: 'From beyond the stars.' },

  // COMPANIONS
  { id: 'pet_cat',         type: 'companion', name: 'Habit Cat',       rarity: 'common',    cost: 120,  magic: 5,  emoji: '🐱',  desc: 'Meows judgementally if you miss a day.' },
  { id: 'pet_fox',         type: 'companion', name: 'Spirit Fox',      rarity: 'rare',      cost: 350,  magic: 15, emoji: '🦊',  desc: 'Cunning and swift. Boosts your XP sense.' },
  { id: 'pet_owl',         type: 'companion', name: 'Wise Owl',        rarity: 'epic',      cost: 600,  magic: 28, emoji: '🦉',  desc: 'Ancient wisdom flows through it.' },
  { id: 'pet_dragon',      type: 'companion', name: 'Mini Dragon',     rarity: 'legendary', cost: 1800, magic: 50, emoji: '🐲',  desc: 'A legendary companion. Fiercely loyal.' },

  // CONSUMABLES
  { id: 'baguette_stale',  type: 'consumable', name: 'Stale Baguette', rarity: 'common',    cost: 10,   magic: 0,  emoji: '🥖',  desc: 'A crusty baguette of mysterious origin. Somehow still here.' },
  { id: 'potion_xp',       type: 'consumable', name: 'XP Potion',      rarity: 'rare',      cost: 300,  magic: 0,  emoji: '🧪',  desc: 'Grants a burst of XP. Use wisely.' },
  { id: 'scroll_streak',   type: 'consumable', name: 'Streak Scroll',  rarity: 'epic',      cost: 700,  magic: 0,  emoji: '📜',  desc: 'Protect your streak for one missed day.' },
  { id: 'elixir_gold',     type: 'consumable', name: 'Golden Elixir',  rarity: 'legendary', cost: 1100, magic: 0,  emoji: '✨',  desc: 'Transmutes hard work into pure gold XP.' },

  // TITLES
  { id: 'title_grinder',   type: 'title',  name: '"The Grinder"',      rarity: 'rare',      cost: 250,  magic: 0,  emoji: '⚙️',  desc: 'Never stops. Never rests.' },
  { id: 'title_phantom',   type: 'title',  name: '"The Phantom"',      rarity: 'epic',      cost: 550,  magic: 0,  emoji: '👁️',  desc: 'Appears from nowhere to top the board.' },
  { id: 'title_eternal',   type: 'title',  name: '"The Eternal"',      rarity: 'legendary', cost: 1200, magic: 0,  emoji: '♾️',  desc: 'Streaks that outlast empires.' },

  // FROGS 🐸 — affordable themed set across every category
  { id: 'sword_frog',      type: 'weapon',    name: 'Lilypad Blade',     rarity: 'rare', cost: 350, magic: 12, emoji: '🗡️', desc: 'Sharpened on a thousand pond stones. Ribbits on impact.', theme: 'frog' },
  { id: 'armor_frog',      type: 'armor',     name: 'Frogskin Tunic',    rarity: 'rare', cost: 320, magic: 11, emoji: '🐸', desc: 'Slick, springy, and surprisingly waterproof.', theme: 'frog' },
  { id: 'banner_frog',     type: 'banner',    name: 'Lilypad Banner',    rarity: 'rare', cost: 300, magic: 0,  color: 'linear-gradient(90deg,#14532d,#22c55e,#86efac)', desc: 'Floats serenely above the pond.', theme: 'frog' },
  { id: 'badge_frog',      type: 'badge',     name: 'Frog Badge',        rarity: 'rare', cost: 300, magic: 0,  emoji: '🐸', desc: 'Hop to it.', theme: 'frog' },
  { id: 'pet_frog',        type: 'companion', name: 'Pocket Frog',       rarity: 'rare', cost: 400, magic: 14, emoji: '🐸', desc: 'A loyal amphibian. Ribbits encouragement when you complete a habit.', theme: 'frog' },
  { id: 'potion_frog',     type: 'consumable',name: 'Pond Brew',         rarity: 'rare', cost: 320, magic: 0,  emoji: '🧪', desc: 'A bubbling green tonic. Tastes faintly of swamp. Grants a modest XP boost.', theme: 'frog' },
  { id: 'title_frog',      type: 'title',     name: '"The Frog Prince"', rarity: 'rare', cost: 350, magic: 0,  emoji: '🐸', desc: 'Royalty of the pond.', theme: 'frog' },

  // TIDECALLER 🌊 — ocean themed set
  { id: 'sword_tide',      type: 'weapon',    name: 'Trident of Tides',  rarity: 'rare', cost: 280, magic: 12, emoji: '🔱', desc: 'Carved from sunken coral. Hums with the deep.', theme: 'tide' },
  { id: 'weapon_tide_blade', type: 'weapon',  name: 'Coral Edge',        rarity: 'epic', cost: 540, magic: 23, emoji: '🐚', desc: 'Sharper than any reef.', theme: 'tide' },
  { id: 'armor_tide',      type: 'armor',     name: 'Tidescale Mail',    rarity: 'epic', cost: 560, magic: 24, emoji: '🌊', desc: 'Shifts like the sea, hard as steel.', theme: 'tide' },
  { id: 'banner_tide',     type: 'banner',    name: 'Tidecaller Banner', rarity: 'rare', cost: 220, magic: 0,  color: 'linear-gradient(90deg,#082f49,#0ea5e9,#67e8f9)', desc: 'The roar of the open sea.', theme: 'tide' },
  { id: 'badge_tide',      type: 'badge',     name: 'Wave Badge',        rarity: 'rare', cost: 170, magic: 0,  emoji: '🌊', desc: 'Ride the swell.', theme: 'tide' },
  { id: 'pet_tide',        type: 'companion', name: 'Sea Turtle',        rarity: 'rare', cost: 360, magic: 14, emoji: '🐢', desc: 'Steady, patient, and surprisingly fast.', theme: 'tide' },
  { id: 'title_tide',      type: 'title',     name: '"Of the Deep"',     rarity: 'epic', cost: 540, magic: 0,  emoji: '🌊', desc: 'Sailors whisper your name.', theme: 'tide' },

  // PHOENIX 🔥 — inferno themed set
  { id: 'sword_phoenix',   type: 'weapon',    name: 'Ember Blade',       rarity: 'rare', cost: 270, magic: 12, emoji: '🔥', desc: 'Glows faintly even in moonlight.', theme: 'phoenix' },
  { id: 'weapon_phoenix_talon', type: 'weapon', name: 'Phoenix Talon',   rarity: 'epic', cost: 590, magic: 27, emoji: '🪶', desc: 'A relic of an undying bird.', theme: 'phoenix' },
  { id: 'armor_phoenix',   type: 'armor',     name: 'Ember Mail',        rarity: 'epic', cost: 570, magic: 25, emoji: '🔥', desc: 'Smoulders gently — never burns the wearer.', theme: 'phoenix' },
  { id: 'banner_phoenix',  type: 'banner',    name: 'Phoenix Banner',    rarity: 'epic', cost: 470, magic: 0,  color: 'linear-gradient(90deg,#7c2d12,#ea580c,#fde047)', desc: 'Burns brightest in the dark.', theme: 'phoenix' },
  { id: 'badge_phoenix_ember', type: 'badge', name: 'Ember Badge',       rarity: 'rare', cost: 165, magic: 0,  emoji: '🔥', desc: 'A spark that refuses to die.', theme: 'phoenix' },
  { id: 'pet_phoenix',     type: 'companion', name: 'Phoenix Chick',     rarity: 'epic', cost: 620, magic: 28, emoji: '🐤', desc: 'Will be magnificent someday. Currently: fluffy.', theme: 'phoenix' },
  { id: 'title_phoenix',   type: 'title',     name: '"The Reborn"',      rarity: 'epic', cost: 530, magic: 0,  emoji: '🔥', desc: 'Rise. Again. And again.', theme: 'phoenix' },

  // FROST ❄️ — glacier themed set
  { id: 'sword_frost',     type: 'weapon',    name: 'Frostbite Sword',   rarity: 'rare', cost: 260, magic: 12, emoji: '❄️', desc: 'Cold mist drifts from its blade.', theme: 'frost' },
  { id: 'weapon_frost_hammer', type: 'weapon', name: 'Glacier Hammer',   rarity: 'epic', cost: 580, magic: 26, emoji: '🧊', desc: 'Each strike rings like cracking ice.', theme: 'frost' },
  { id: 'armor_frost',     type: 'armor',     name: 'Permafrost Plate',  rarity: 'epic', cost: 560, magic: 25, emoji: '🧊', desc: 'Frozen solid for a thousand winters.', theme: 'frost' },
  { id: 'banner_frost',    type: 'banner',    name: 'Glacier Banner',    rarity: 'rare', cost: 210, magic: 0,  color: 'linear-gradient(90deg,#0c4a6e,#67e8f9,#e0f2fe)', desc: 'Calm. Cold. Eternal.', theme: 'frost' },
  { id: 'badge_frost',     type: 'badge',     name: 'Snowflake Badge',   rarity: 'rare', cost: 160, magic: 0,  emoji: '❄️', desc: 'No two are alike.', theme: 'frost' },
  { id: 'pet_frost',       type: 'companion', name: 'Snow Fox',          rarity: 'rare', cost: 380, magic: 16, emoji: '🦊', desc: 'Vanishes into snowdrifts. Reappears at meal times.', theme: 'frost' },
  { id: 'title_frost',     type: 'title',     name: '"Frostbringer"',    rarity: 'epic', cost: 530, magic: 0,  emoji: '❄️', desc: 'Winter follows where you walk.', theme: 'frost' },

  // SAKURA 🌸 — bloom themed set (affordable)
  { id: 'sword_sakura',    type: 'weapon',    name: 'Petal Fan',         rarity: 'rare', cost: 250, magic: 10, emoji: '🌸', desc: 'Each strike scatters cherry blossoms.', theme: 'sakura' },
  { id: 'weapon_sakura_blade', type: 'weapon', name: 'Cherry Blade',     rarity: 'epic', cost: 540, magic: 23, emoji: '🌸', desc: 'Forged beneath a hundred spring moons.', theme: 'sakura' },
  { id: 'armor_sakura',    type: 'armor',     name: 'Bloom Kimono',      rarity: 'rare', cost: 280, magic: 14, emoji: '🎎', desc: 'Light as petals on the wind.', theme: 'sakura' },
  { id: 'banner_sakura',   type: 'banner',    name: 'Sakura Banner',     rarity: 'rare', cost: 220, magic: 0,  color: 'linear-gradient(90deg,#831843,#f472b6,#fce7f3)', desc: 'A river of falling petals.', theme: 'sakura' },
  { id: 'badge_sakura',    type: 'badge',     name: 'Blossom Badge',     rarity: 'rare', cost: 170, magic: 0,  emoji: '🌸', desc: 'Beautifully fleeting.', theme: 'sakura' },
  { id: 'pet_sakura',      type: 'companion', name: 'Spring Hare',       rarity: 'rare', cost: 350, magic: 15, emoji: '🐰', desc: 'Bounds through petal storms.', theme: 'sakura' },
  { id: 'title_sakura',    type: 'title',     name: '"The Blossomed"',   rarity: 'rare', cost: 290, magic: 0,  emoji: '🌸', desc: 'Beauty in every step.', theme: 'sakura' },

  // CYBER 🤖 — tech themed set
  { id: 'weapon_cyber',    type: 'weapon',    name: 'Plasma Blade',      rarity: 'epic', cost: 600, magic: 28, emoji: '🔫', desc: 'Hums with neon light.', theme: 'cyber' },
  { id: 'armor_cyber',     type: 'armor',     name: 'Nano Suit',         rarity: 'epic', cost: 590, magic: 27, emoji: '🦾', desc: 'A million tiny machines, working in sync.', theme: 'cyber' },
  { id: 'banner_cyber',    type: 'banner',    name: 'Neon Banner',       rarity: 'epic', cost: 480, magic: 0,  color: 'linear-gradient(90deg,#1e1b4b,#06b6d4,#ec4899)', desc: 'A skyline at midnight.', theme: 'cyber' },
  { id: 'badge_cyber',     type: 'badge',     name: 'Circuit Badge',     rarity: 'rare', cost: 175, magic: 0,  emoji: '🤖', desc: 'Bzzt.', theme: 'cyber' },
  { id: 'pet_cyber',       type: 'companion', name: 'Drone Buddy',       rarity: 'rare', cost: 380, magic: 16, emoji: '🛸', desc: 'Hovers loyally. Cannot be turned off.', theme: 'cyber' },
  { id: 'title_cyber',     type: 'title',     name: '"v.2077"',          rarity: 'epic', cost: 550, magic: 0,  emoji: '💾', desc: 'From the future. Or maybe the past.', theme: 'cyber' },

  // BUCCANEER ☠️ — pirate themed set
  { id: 'weapon_pirate',   type: 'weapon',    name: 'Cutlass',           rarity: 'rare', cost: 250, magic: 11, emoji: '⚔️', desc: 'Curved for boarding actions.', theme: 'pirate' },
  { id: 'weapon_pirate_flint', type: 'weapon', name: 'Flintlock',        rarity: 'epic', cost: 560, magic: 24, emoji: '🔫', desc: 'One shot. Make it count.', theme: 'pirate' },
  { id: 'armor_pirate',    type: 'armor',     name: "Captain's Coat",    rarity: 'rare', cost: 290, magic: 13, emoji: '🧥', desc: 'Tailored for command.', theme: 'pirate' },
  { id: 'banner_pirate',   type: 'banner',    name: 'Jolly Roger',       rarity: 'rare', cost: 200, magic: 0,  color: 'linear-gradient(90deg,#000000,#404040,#7f1d1d)', desc: 'No quarter asked, none given.', theme: 'pirate' },
  { id: 'badge_pirate',    type: 'badge',     name: 'Anchor Badge',      rarity: 'rare', cost: 165, magic: 0,  emoji: '⚓', desc: 'Steady in any storm.', theme: 'pirate' },
  { id: 'pet_pirate',      type: 'companion', name: 'Parrot',            rarity: 'rare', cost: 340, magic: 14, emoji: '🦜', desc: 'Repeats your battle cries. And insults.', theme: 'pirate' },
  { id: 'title_pirate',    type: 'title',     name: '"The Captain"',     rarity: 'epic', cost: 520, magic: 0,  emoji: '🏴‍☠️', desc: 'These seas are yours.', theme: 'pirate' },

  // HARVEST 🍂 — affordable autumn themed set
  { id: 'weapon_harvest',  type: 'weapon',    name: 'Scarecrow Scythe',  rarity: 'rare',   cost: 240, magic: 11, emoji: '🌾', desc: 'Just for the fields. Mostly.', theme: 'harvest' },
  { id: 'armor_harvest',   type: 'armor',     name: 'Harvest Cloak',     rarity: 'common', cost: 110, magic: 4,  emoji: '🍁', desc: 'Smells of woodsmoke and apples.', theme: 'harvest' },
  { id: 'banner_harvest',  type: 'banner',    name: 'Autumn Banner',     rarity: 'common', cost: 60,  magic: 0,  color: 'linear-gradient(90deg,#7c2d12,#ea580c,#fbbf24)', desc: 'The colours of the late year.', theme: 'harvest' },
  { id: 'badge_harvest',   type: 'badge',     name: 'Pumpkin Badge',     rarity: 'common', cost: 50,  magic: 0,  emoji: '🎃', desc: 'Spooky szn.', theme: 'harvest' },
  { id: 'pet_harvest',     type: 'companion', name: 'Field Mouse',       rarity: 'common', cost: 130, magic: 6,  emoji: '🐭', desc: 'Squeaks supportively.', theme: 'harvest' },
  { id: 'title_harvest',   type: 'title',     name: '"The Harvester"',   rarity: 'rare',   cost: 250, magic: 0,  emoji: '🌾', desc: 'Reap what you sow.', theme: 'harvest' },

  // LUNAR 🌙 — eclipse themed set (high-rarity)
  { id: 'weapon_lunar',    type: 'weapon',    name: 'Moonlight Bow',     rarity: 'epic',      cost: 600,  magic: 28, emoji: '🌙', desc: 'Arrows trail silver light.', theme: 'lunar' },
  { id: 'armor_lunar',     type: 'armor',     name: 'Eclipse Robe',      rarity: 'legendary', cost: 1300, magic: 45, emoji: '🌑', desc: 'Woven from the dark between stars.', theme: 'lunar' },
  { id: 'banner_lunar',    type: 'banner',    name: 'Lunar Banner',      rarity: 'legendary', cost: 950,  magic: 0,  color: 'linear-gradient(90deg,#0f0f2e,#312e81,#c7d2fe,#0f0f2e)', desc: 'The night sky, captured.', theme: 'lunar' },
  { id: 'badge_lunar',     type: 'badge',     name: 'Crescent Badge',    rarity: 'epic',      cost: 410,  magic: 0,  emoji: '🌙', desc: 'A sliver of starlight.', theme: 'lunar' },
  { id: 'pet_lunar',       type: 'companion', name: 'Moon Wolf',         rarity: 'legendary', cost: 1700, magic: 48, emoji: '🐺', desc: 'Howls at the full moon. Yours, always.', theme: 'lunar' },
  { id: 'title_lunar',     type: 'title',     name: '"Eclipse-Touched"', rarity: 'legendary', cost: 1150, magic: 0,  emoji: '🌑', desc: 'The dark sees you.', theme: 'lunar' },

  // ── 40 EXTRA SHOP ITEMS ─────────────────────────────────────────────
  // Bulk catalog expansion. Spread across all slots + rarities.

  // Weapons (10)
  { id: 'sword_bone',         type: 'weapon',    name: 'Bone Sword',         rarity: 'common',    cost: 90,   magic: 3,  emoji: '🦴', desc: 'Carved from a fallen beast. Surprisingly sharp.' },
  { id: 'sword_dawn',         type: 'weapon',    name: 'Dawn Blade',         rarity: 'epic',      cost: 540,  magic: 24, emoji: '🌅', desc: 'Brightens the darkest corridor.' },
  { id: 'sword_frost_cleaver',type: 'weapon',    name: 'Frost Cleaver',      rarity: 'rare',      cost: 280,  magic: 13, emoji: '🧊', desc: 'Each swing leaves a chill in the air.' },
  { id: 'staff_crystal',      type: 'weapon',    name: 'Crystal Wand',       rarity: 'rare',      cost: 270,  magic: 13, emoji: '🔮', desc: 'Refracts magic into a hundred colours.' },
  { id: 'staff_mossy',        type: 'weapon',    name: 'Mossy Branch',       rarity: 'common',    cost: 65,   magic: 3,  emoji: '🌿', desc: 'Older than the forest. Older than fire.' },
  { id: 'bow_moonshard',      type: 'weapon',    name: 'Moonshard Bow',      rarity: 'epic',      cost: 560,  magic: 25, emoji: '🌙', desc: 'Strings sing in the dark.' },
  { id: 'dagger_twilight',    type: 'weapon',    name: 'Twilight Dagger',    rarity: 'epic',      cost: 510,  magic: 22, emoji: '🌒', desc: 'Drinks the last light of day.' },
  { id: 'lance_storm',        type: 'weapon',    name: 'Storm Spear',        rarity: 'rare',      cost: 290,  magic: 14, emoji: '🌩️', desc: 'Crackles when held high.' },
  { id: 'hammer_oak',         type: 'weapon',    name: 'Oakheart Maul',      rarity: 'common',    cost: 110,  magic: 4,  emoji: '🪵', desc: 'Heavy. Honest. Hammery.' },
  { id: 'scythe_harvest',     type: 'weapon',    name: 'Harvest Scythe',     rarity: 'rare',      cost: 260,  magic: 12, emoji: '🌾', desc: 'For reaping fields. And foes.' },

  // Armor (8)
  { id: 'armor_mossy',        type: 'armor',     name: 'Mossy Cloak',        rarity: 'common',    cost: 65,   magic: 2,  emoji: '🍂', desc: 'Smells faintly of damp forest floor.' },
  { id: 'armor_crystal',      type: 'armor',     name: 'Crystal Mail',       rarity: 'epic',      cost: 590,  magic: 27, emoji: '💠', desc: 'Refracts incoming blows into rainbows.' },
  { id: 'armor_bone',         type: 'armor',     name: 'Bone Plate',         rarity: 'rare',      cost: 270,  magic: 11, emoji: '🦴', desc: 'Wearing it feels deeply impolite.' },
  { id: 'armor_silk',         type: 'armor',     name: 'Spider Silk Robes',  rarity: 'rare',      cost: 285,  magic: 14, emoji: '🕸️', desc: 'Light, strong, slightly judgmental.' },
  { id: 'armor_stardust',     type: 'armor',     name: 'Stardust Cloak',     rarity: 'epic',      cost: 600,  magic: 28, emoji: '✨', desc: 'Twinkles when you move.' },
  { id: 'armor_phantom',      type: 'armor',     name: 'Phantom Veil',       rarity: 'epic',      cost: 555,  magic: 24, emoji: '👻', desc: 'You\'re half there.' },
  { id: 'armor_lava',         type: 'armor',     name: 'Lava Plate',         rarity: 'legendary', cost: 1300, magic: 45, emoji: '🌋', desc: 'Glows like a banked fire.' },
  { id: 'armor_paper',        type: 'armor',     name: 'Paper Armour',       rarity: 'common',    cost: 30,   magic: 0,  emoji: '📄', desc: 'A poor life choice. But cheap!' },

  // Banners (8)
  { id: 'banner_sunset',      type: 'banner',    name: 'Sunset Sky',         rarity: 'rare',      cost: 210,  magic: 0,  color: 'linear-gradient(90deg,#7c2d12,#f97316,#fbbf24,#fde68a)', desc: 'The hour where the world holds its breath.' },
  { id: 'banner_sakura_grove',type: 'banner',    name: 'Cherry Grove',       rarity: 'rare',      cost: 195,  magic: 0,  color: 'linear-gradient(90deg,#831843,#f472b6,#fce7f3,#f9a8d4)', desc: 'Petals on the wind.' },
  { id: 'banner_deep_ocean',  type: 'banner',    name: 'Deep Ocean',         rarity: 'rare',      cost: 200,  magic: 0,  color: 'linear-gradient(90deg,#020617,#0c4a6e,#0ea5e9)', desc: 'Where light goes to drown.' },
  { id: 'banner_volcanic',    type: 'banner',    name: 'Volcanic',           rarity: 'epic',      cost: 470,  magic: 0,  color: 'linear-gradient(90deg,#000000,#7c2d12,#ef4444,#fde047)', desc: 'A glow visible from orbit.' },
  { id: 'banner_glacier',     type: 'banner',    name: 'Glacier',            rarity: 'rare',      cost: 200,  magic: 0,  color: 'linear-gradient(90deg,#082f49,#0ea5e9,#bae6fd,#f0f9ff)', desc: 'Endless white.' },
  { id: 'banner_forest_mist', type: 'banner',    name: 'Forest Mist',        rarity: 'common',    cost: 55,   magic: 0,  color: 'linear-gradient(90deg,#0f172a,#1e293b,#475569,#a8a29e)', desc: 'Quiet. Damp. Watching.' },
  { id: 'banner_storm_sea',   type: 'banner',    name: 'Stormy Sea',         rarity: 'epic',      cost: 460,  magic: 0,  color: 'linear-gradient(90deg,#0c1445,#1e3a8a,#475569,#a3a3a3)', desc: 'Brace the prow.' },
  { id: 'banner_twilight',    type: 'banner',    name: 'Twilight Banner',    rarity: 'epic',      cost: 480,  magic: 0,  color: 'linear-gradient(90deg,#1e1b4b,#7c3aed,#f472b6,#fbbf24)', desc: 'The hour between dog and wolf.' },

  // Badges (8)
  { id: 'badge_crab',         type: 'badge',     name: 'Crab Badge',         rarity: 'common',    cost: 40,   magic: 0,  emoji: '🦀', desc: 'Sideways or nothing.' },
  { id: 'badge_fish',         type: 'badge',     name: 'Fish Badge',         rarity: 'common',    cost: 35,   magic: 0,  emoji: '🐟', desc: 'A fine companion. Wet.' },
  { id: 'badge_tree',         type: 'badge',     name: 'Tree Badge',         rarity: 'common',    cost: 40,   magic: 0,  emoji: '🌳', desc: 'Plant yourself in the leaderboard.' },
  { id: 'badge_mountain',     type: 'badge',     name: 'Mountain Badge',     rarity: 'rare',      cost: 160,  magic: 0,  emoji: '⛰️', desc: 'Climb. Or be climbed.' },
  { id: 'badge_cloud',        type: 'badge',     name: 'Cloud Badge',        rarity: 'common',    cost: 35,   magic: 0,  emoji: '☁️', desc: 'Head in the air.' },
  { id: 'badge_wave',         type: 'badge',     name: 'Wave Badge',         rarity: 'rare',      cost: 170,  magic: 0,  emoji: '🌊', desc: 'Roll on. Roll on.' },
  { id: 'badge_rune',         type: 'badge',     name: 'Rune Badge',         rarity: 'epic',      cost: 410,  magic: 0,  emoji: 'ᚱ', desc: 'It hums when no one looks.' },
  { id: 'badge_eye',          type: 'badge',     name: 'Watching Eye',       rarity: 'epic',      cost: 430,  magic: 0,  emoji: '👁', desc: 'You are seen.' },

  // Companions (4)
  { id: 'pet_penguin',        type: 'companion', name: 'Tuxedo Penguin',     rarity: 'rare',      cost: 360,  magic: 16, emoji: '🐧', desc: 'Dapper. Determined. Cold.' },
  { id: 'pet_otter',          type: 'companion', name: 'Pocket Otter',       rarity: 'rare',      cost: 340,  magic: 14, emoji: '🦦', desc: 'Holds your hand while you sleep.' },
  { id: 'pet_raccoon',        type: 'companion', name: 'Bandit Raccoon',     rarity: 'rare',      cost: 380,  magic: 16, emoji: '🦝', desc: 'May or may not steal your gold.' },
  { id: 'pet_hedgehog',       type: 'companion', name: 'Spike Hedgehog',     rarity: 'common',    cost: 140,  magic: 6,  emoji: '🦔', desc: 'Pointy on the outside. Soft inside.' },

  // Titles (2)
  { id: 'title_punctual',     type: 'title',     name: '"The Punctual"',     rarity: 'rare',      cost: 240,  magic: 0,  emoji: '⏰', desc: 'Never a day missed.' },
  { id: 'title_determined',   type: 'title',     name: '"The Determined"',   rarity: 'epic',      cost: 540,  magic: 0,  emoji: '💪', desc: 'Will outlast the universe.' },

  // ── LEVEL-MILESTONE REWARD BANNERS (not for sale; granted automatically) ──
  // These appear in user_inventory the moment the player crosses the level
  // threshold — see backend/src/utils/xp.js LEVEL_REWARD_BANNERS.
  { id: 'banner_veteran',     type: 'banner',    name: "Veteran's Banner",   rarity: 'epic',      cost: 0,    magic: 0,  color: 'linear-gradient(90deg,#78350f,#f59e0b,#fde68a,#fbbf24)', desc: 'Awarded at Level 25. Earned, not bought.',           unlockReward: true, unlockLevel: 25 },
  { id: 'banner_ascendant',   type: 'banner',    name: 'Ascendant Banner',   rarity: 'legendary', cost: 0,    magic: 0,  color: 'linear-gradient(90deg,#3b0764,#7c3aed,#a78bfa,#ec4899,#fbbf24)', desc: 'Awarded at Level 50. The mark of the ascended.',   unlockReward: true, unlockLevel: 50 },
  { id: 'banner_incarnate',   type: 'banner',    name: 'Tickd Incarnate',    rarity: 'mythic',    cost: 0,    magic: 0,  color: 'linear-gradient(90deg,#000000,#ef4444,#f59e0b,#fde047,#10b981,#06b6d4,#7c3aed,#f0abfc,#000000)', desc: 'Awarded at Level 100. The end of the climb.',     unlockReward: true, unlockLevel: 100 },

  // EXTRA CONSUMABLES
  { id: 'potion_minor_xp', type: 'consumable', name: 'Minor XP Potion',  rarity: 'common',    cost: 80,  magic: 0, emoji: '🧪', desc: 'A small swig. Grants a little XP.' },
  { id: 'potion_gold',     type: 'consumable', name: 'Gold Pouch',       rarity: 'rare',      cost: 350, magic: 0, emoji: '💰', desc: 'A modest sack of coins. Pocket it.' },
  { id: 'cake_birthday',   type: 'consumable', name: 'Birthday Cake',    rarity: 'epic',      cost: 666, magic: 0, emoji: '🎂', desc: 'A celebration in confection form. Big XP, big mood.' },
  { id: 'scroll_double',   type: 'consumable', name: 'Doubler Scroll',   rarity: 'legendary', cost: 1500, magic: 0, emoji: '📜', desc: 'A truly stupid amount of XP. Once-in-a-lifetime.' },

  // ── MYTHIC TIER (Legends shop, unlocked at Lv 10) ────────────────────
  // Costs 2000-4000g. Magic Power 51-80. Visible only when level ≥ 10.
  { id: 'sword_starfall',    type: 'weapon',    name: 'Starfall Blade',    rarity: 'mythic', cost: 3800, magic: 70, emoji: '☄️', desc: 'Forged from the bones of a dying sun. Hums with starlight.', legendsOnly: true, bonus: { type: 'dmg_pct',    value: 25, label: '+25% damage dealt' } },
  { id: 'staff_eternity',    type: 'weapon',    name: 'Staff of Eternity', rarity: 'mythic', cost: 3500, magic: 68, emoji: '🪄', desc: 'Channels magic from outside time itself.', legendsOnly: true, bonus: { type: 'crit_pct',   value: 25, label: '+25% crit chance' } },
  { id: 'armor_chronos',     type: 'armor',     name: 'Chronos Plate',     rarity: 'mythic', cost: 3500, magic: 65, emoji: '⏳', desc: 'Stops time briefly when struck. The instant repeats.', legendsOnly: true, bonus: { type: 'dmg_taken_pct', value: -20, label: '-20% damage taken' } },
  { id: 'armor_singular',    type: 'armor',     name: 'Singularity Cloak', rarity: 'mythic', cost: 3200, magic: 62, emoji: '🕳️', desc: 'A garment hemmed with collapsed stars.', legendsOnly: true, bonus: { type: 'max_hp_pct', value: 25, label: '+25% max HP' } },
  { id: 'pet_celestial',     type: 'companion', name: 'Celestial Phoenix', rarity: 'mythic', cost: 4000, magic: 75, emoji: '✨', desc: 'A creature from before the first stars. Loyalty unmeasurable.', legendsOnly: true, bonus: { type: 'pet_dmg_pct',  value: 50, label: '+50% pet damage' } },
  { id: 'pet_void',          type: 'companion', name: 'Void Drake',        rarity: 'mythic', cost: 3700, magic: 72, emoji: '🐉', desc: 'It speaks no language but its silence is louder than war.', legendsOnly: true, bonus: { type: 'pet_dmg_pct',  value: 40, label: '+40% pet damage' } },
  { id: 'banner_singularity',type: 'banner',    name: 'Singularity Banner',rarity: 'mythic', cost: 2500, magic: 0,  color: 'linear-gradient(90deg,#000000,#7c3aed,#f0abfc,#22d3ee,#fbbf24,#000000)', desc: 'Every colour at once. The horizon of the impossible.', legendsOnly: true, bonus: { type: 'gold_pct',   value: 30, label: '+30% gold from dungeon' } },
  { id: 'badge_omega',       type: 'badge',     name: 'Omega Badge',       rarity: 'mythic', cost: 2200, magic: 0,  emoji: 'Ω',  desc: 'The end. The beginning. The mark of a true legend.', legendsOnly: true, bonus: { type: 'xp_pct',     value: 25, label: '+25% XP from all sources' } },
  { id: 'title_ascendant',   type: 'title',     name: '"The Ascendant"',   rarity: 'mythic', cost: 2200, magic: 0,  emoji: '🌌', desc: 'Beyond mortal reach.', legendsOnly: true, bonus: { type: 'block_start', value: 12, label: 'Start every fight with 12 block' } },
  { id: 'title_godslayer',   type: 'title',     name: '"Godslayer"',       rarity: 'mythic', cost: 3000, magic: 0,  emoji: '⚔️', desc: 'You have ended gods.', legendsOnly: true, bonus: { type: 'first_hit_pct', value: 100, label: 'First hit each fight: 2x damage' } },
];

// ── PACKS ────────────────────────────────────────────────────────────────
// Bundle several themed items at a discount. Buying a pack grants every
// listed item. If the user already owns any, the purchase is refused —
// they can grab the missing pieces individually instead.
const PACKS = [
  {
    id: 'pack_frog',
    name: 'Frog Pack',
    desc: 'The full pond-themed set. Ribbit included.',
    emoji: '🐸',
    rarity: 'rare',
    color: 'linear-gradient(135deg,#14532d,#22c55e,#86efac)',
    cost: 1850,
    items: ['sword_frog', 'armor_frog', 'banner_frog', 'badge_frog', 'pet_frog', 'potion_frog', 'title_frog'],
  },
  {
    id: 'pack_tide',
    name: 'Tidecaller Pack',
    desc: 'Take command of the sea.',
    emoji: '🌊',
    rarity: 'epic',
    color: 'linear-gradient(135deg,#082f49,#0ea5e9,#67e8f9)',
    cost: 2100,
    items: ['sword_tide', 'weapon_tide_blade', 'armor_tide', 'banner_tide', 'badge_tide', 'pet_tide', 'title_tide'],
  },
  {
    id: 'pack_phoenix',
    name: 'Phoenix Pack',
    desc: 'Rise, fall, rise again.',
    emoji: '🔥',
    rarity: 'epic',
    color: 'linear-gradient(135deg,#7c2d12,#ea580c,#fde047)',
    cost: 2500,
    items: ['sword_phoenix', 'weapon_phoenix_talon', 'armor_phoenix', 'banner_phoenix', 'badge_phoenix_ember', 'pet_phoenix', 'title_phoenix'],
  },
  {
    id: 'pack_frost',
    name: 'Frost Pack',
    desc: 'Winter, bottled and equipped.',
    emoji: '❄️',
    rarity: 'epic',
    color: 'linear-gradient(135deg,#0c4a6e,#67e8f9,#e0f2fe)',
    cost: 2100,
    items: ['sword_frost', 'weapon_frost_hammer', 'armor_frost', 'banner_frost', 'badge_frost', 'pet_frost', 'title_frost'],
  },
  {
    id: 'pack_sakura',
    name: 'Sakura Pack',
    desc: 'Spring in seven pieces.',
    emoji: '🌸',
    rarity: 'rare',
    color: 'linear-gradient(135deg,#831843,#f472b6,#fce7f3)',
    cost: 1650,
    items: ['sword_sakura', 'weapon_sakura_blade', 'armor_sakura', 'banner_sakura', 'badge_sakura', 'pet_sakura', 'title_sakura'],
  },
  {
    id: 'pack_cyber',
    name: 'Cyber Pack',
    desc: 'Boot up. Plug in. Equip.',
    emoji: '🤖',
    rarity: 'epic',
    color: 'linear-gradient(135deg,#1e1b4b,#06b6d4,#ec4899)',
    cost: 2200,
    items: ['weapon_cyber', 'armor_cyber', 'banner_cyber', 'badge_cyber', 'pet_cyber', 'title_cyber'],
  },
  {
    id: 'pack_pirate',
    name: 'Buccaneer Pack',
    desc: 'Hoist the colours.',
    emoji: '☠️',
    rarity: 'rare',
    color: 'linear-gradient(135deg,#000000,#404040,#7f1d1d)',
    cost: 1800,
    items: ['weapon_pirate', 'weapon_pirate_flint', 'armor_pirate', 'banner_pirate', 'badge_pirate', 'pet_pirate', 'title_pirate'],
  },
  {
    id: 'pack_harvest',
    name: 'Harvest Pack',
    desc: 'Cosy, affordable, autumnal.',
    emoji: '🍂',
    rarity: 'common',
    color: 'linear-gradient(135deg,#7c2d12,#ea580c,#fbbf24)',
    cost: 650,
    items: ['weapon_harvest', 'armor_harvest', 'banner_harvest', 'badge_harvest', 'pet_harvest', 'title_harvest'],
  },
  {
    id: 'pack_lunar',
    name: 'Lunar Pack',
    desc: 'Touched by eclipse. End-game cosmetic flex.',
    emoji: '🌙',
    rarity: 'legendary',
    color: 'linear-gradient(135deg,#0f0f2e,#312e81,#c7d2fe)',
    cost: 4800,
    items: ['weapon_lunar', 'armor_lunar', 'banner_lunar', 'badge_lunar', 'pet_lunar', 'title_lunar'],
  },
  {
    id: 'pack_starter',
    name: 'Starter Bundle',
    desc: 'Brand new? Grab the essentials in one go.',
    emoji: '🎁',
    rarity: 'common',
    color: 'linear-gradient(135deg,#1e3a8a,#3b82f6,#a5f3fc)',
    cost: 220,
    items: ['sword_iron', 'armor_leather', 'banner_blue', 'badge_star'],
  },
  {
    id: 'pack_consumables',
    name: 'Adventurer\'s Stash',
    desc: 'A pile of one-shot consumables to keep you going.',
    emoji: '🎒',
    rarity: 'rare',
    color: 'linear-gradient(135deg,#78350f,#f59e0b,#fde68a)',
    cost: 780,
    items: ['potion_xp', 'potion_minor_xp', 'potion_gold', 'baguette_stale'],
  },
];

// Derive a weaponClass for every weapon by inspecting its id prefix. This lets
// the dungeon decide which attacks the player can use with their current
// weapon without us having to hand-tag every item row.
const WEAPON_CLASS_BY_PREFIX = {
  sword:  'sword',
  blade:  'sword',
  staff:  'staff',
  bow:    'bow',
  axe:    'axe',
  dagger: 'dagger',
  hammer: 'hammer',
  wand:   'wand',
  lance:  'lance',
  scythe: 'scythe',
};

const weaponClassOf = (item) => {
  if (!item || item.type !== 'weapon') return null;
  // Handle ids like 'weapon_cyber' or 'weapon_tide_blade' (themed weapons —
  // treat them as swords by default since they're blade-shaped emojis).
  const prefix = item.id.split('_')[0];
  if (prefix === 'weapon') {
    // Themed weapon ids fall back to the second token, then default to sword.
    const second = item.id.split('_')[1];
    return WEAPON_CLASS_BY_PREFIX[second] || 'sword';
  }
  return WEAPON_CLASS_BY_PREFIX[prefix] || 'sword';
};

// Patch every weapon with its derived class once at module load.
for (const item of ITEMS) {
  if (item.type === 'weapon') item.weaponClass = weaponClassOf(item);
}

const itemById = (id) => ITEMS.find(i => i.id === id);
const packById = (id) => PACKS.find(p => p.id === id);

// Compute the un-discounted total cost of a pack (sum of contained item costs).
const packFullCost = (pack) => (pack.items || []).reduce((s, id) => {
  const it = itemById(id);
  return s + (it?.cost || 0);
}, 0);

// Pack discount percentage (rounded) — for display only.
const packDiscount = (pack) => {
  const full = packFullCost(pack);
  if (!full) return 0;
  return Math.max(0, Math.round((1 - pack.cost / full) * 100));
};

// Sum the active mythic bonuses from a map of equipped items. Returns an
// object keyed by bonus.type, with values summed. Used by combat + reward
// hooks to apply effects without re-walking equipment everywhere.
//
// equipped: { weapon, armor, banner, badge, companion, title } — item objects.
function bonusesFrom(equipped) {
  const out = {};
  if (!equipped) return out;
  for (const slot of Object.values(equipped)) {
    if (!slot || !slot.bonus) continue;
    const { type, value } = slot.bonus;
    if (!type) continue;
    out[type] = (out[type] || 0) + (Number(value) || 0);
  }
  return out;
}

module.exports = { ITEMS, RARITIES, PACKS, itemById, packById, packFullCost, packDiscount, weaponClassOf, bonusesFrom };
