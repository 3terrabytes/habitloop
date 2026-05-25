const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      avatar_color VARCHAR(7) DEFAULT '#6366f1',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(requester_id, addressee_id)
    );

    CREATE TABLE IF NOT EXISTS user_inventory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_id VARCHAR(60) NOT NULL,
      acquired_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, item_id)
    );

    -- Pet evolution. Only meaningful for companion items in the inventory.
    -- pet_xp ticks up by 1 per won battle while equipped; at 10 xp the pet
    -- is permanently evolved (sprite swap, larger size, +10% in PET_SCALE).
    ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS pet_xp      INTEGER DEFAULT 0;
    ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS pet_evolved BOOLEAN DEFAULT false;

    CREATE TABLE IF NOT EXISTS user_equipped (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      weapon VARCHAR(60),
      armor VARCHAR(60),
      banner VARCHAR(60),
      badge VARCHAR(60),
      companion VARCHAR(60),
      title VARCHAR(60)
    );

    ALTER TABLE user_equipped ADD COLUMN IF NOT EXISTS companion VARCHAR(60);
    ALTER TABLE user_equipped ADD COLUMN IF NOT EXISTS title VARCHAR(60);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

    -- Drop legacy habit tables (Tickd is now dungeon-only).
    DROP TABLE IF EXISTS habit_logs;
    DROP TABLE IF EXISTS habits;

    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_skin    VARCHAR(7)  DEFAULT '#e8b88a';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_hair    VARCHAR(7)  DEFAULT '#8B4513';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_eyes    VARCHAR(7)  DEFAULT '#2a4a8a';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_hair_style INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_gender  INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_beard   INTEGER DEFAULT 0;

    CREATE TABLE IF NOT EXISTS gifts (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_id VARCHAR(60) NOT NULL,
      message VARCHAR(200),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      username VARCHAR(50),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      votes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS suggestion_votes (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      suggestion_id INTEGER REFERENCES suggestions(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, suggestion_id)
    );

    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      proposer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      offer_item_id VARCHAR(60) NOT NULL,
      request_item_id VARCHAR(60) NOT NULL,
      message VARCHAR(200),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_xp TEXT DEFAULT 'friends';
    ALTER TABLE users DROP COLUMN IF EXISTS privacy_streaks;
    ALTER TABLE users DROP COLUMN IF EXISTS privacy_habits;
    ALTER TABLE users DROP COLUMN IF EXISTS streak_shield;

    ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_enabled    BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_time       VARCHAR(5) DEFAULT '20:00';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS theme            TEXT DEFAULT 'default';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS update_seen      BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS debrief_seen     BOOLEAN DEFAULT false;

    -- Lifetime gold earned (separate from the spendable gold balance)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_gold    BIGINT DEFAULT 0;

    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      code VARCHAR(60) NOT NULL,
      earned_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, code)
    );

    -- Admin & moderation
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin           BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_type    VARCHAR(10);   -- null | 'warn' | 'temp' | 'perm'
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason  TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until    TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at       TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by       INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_seen       BOOLEAN DEFAULT false;

    -- Suggestion admin status: open | planned | done | rejected
    ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open';

    -- Dungeon: per-user 4-slot attack loadout
    CREATE TABLE IF NOT EXISTS user_attacks (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      slot1 VARCHAR(40),
      slot2 VARCHAR(40),
      slot3 VARCHAR(40),
      slot4 VARCHAR(40)
    );

    -- Per-attack level. Each upgrade increases damage / heal by a fixed pct.
    -- Level 1 is the base attack; max level enforced server-side.
    CREATE TABLE IF NOT EXISTS user_attack_levels (
      user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      attack_id VARCHAR(40) NOT NULL,
      level     INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, attack_id)
    );

    -- Attacks the user has paid to learn. Only relevant for attacks whose
    -- data file lists a learnCost. Free attacks are usable without an entry.
    CREATE TABLE IF NOT EXISTS user_unlocked_attacks (
      user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      attack_id   VARCHAR(40) NOT NULL,
      unlocked_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, attack_id)
    );

    -- Emote ownership + equipped slot. Players buy emotes in the shop and
    -- pick one to bind to the E key + emote button.
    CREATE TABLE IF NOT EXISTS user_emotes (
      user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      emote_id  VARCHAR(40) NOT NULL,
      PRIMARY KEY (user_id, emote_id)
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_emote VARCHAR(40) DEFAULT 'wave';

    -- Three saveable loadout presets per user. Each row snapshots an equip
    -- set + 4-slot attack bar so the player can swap gear configs in one
    -- click without re-equipping every piece.
    CREATE TABLE IF NOT EXISTS user_loadout_presets (
      user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      slot      INTEGER NOT NULL,
      name      VARCHAR(40),
      weapon    VARCHAR(60),
      armor     VARCHAR(60),
      badge     VARCHAR(60),
      companion VARCHAR(60),
      attacks   TEXT[],
      PRIMARY KEY (user_id, slot)
    );

    -- Dungeon: how many bosses the player has cleared (ascension level).
    -- Surfaced on /auth/me and used to gate harder difficulties.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS dungeon_ascension INTEGER DEFAULT 0;

    -- Best wave reached in Survival Mode (the endless dungeon).
    ALTER TABLE users ADD COLUMN IF NOT EXISTS best_survival_wave INTEGER DEFAULT 0;

    -- Rebirth system: each rebirth wipes XP/level/gold/inventory but grants
    -- a permanent earnings multiplier. mult = 1 + 0.5 * rebirth_count
    -- (0 rebirths = 1x, 1 = 1.5x, 2 = 2.0x, ...).
    ALTER TABLE users ADD COLUMN IF NOT EXISTS rebirth_count INTEGER DEFAULT 0;

    -- Half-admin permission system. is_admin stays as the full-admin flag
    -- (all perms implicit). admin_perms is a granular list for half-admins.
    -- is_master_admin is the highest tier -- only they can grant/revoke
    -- admin powers and view the audit log.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_perms     TEXT[];
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN DEFAULT false;

    CREATE TABLE IF NOT EXISTS admin_logs (
      id              SERIAL PRIMARY KEY,
      admin_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      admin_username  VARCHAR(50),
      action          VARCHAR(60) NOT NULL,
      target_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      target_username VARCHAR(50),
      details         JSONB,
      created_at      TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_admin   ON admin_logs(admin_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_target  ON admin_logs(target_id, created_at DESC);

    -- PvP Battles — async turn-based. One active battle per user; alternating
    -- turns; unlimited rounds until someone hits 0 HP or forfeits.
    CREATE TABLE IF NOT EXISTS battles (
      id SERIAL PRIMARY KEY,
      challenger_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      opponent_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status            VARCHAR(20) DEFAULT 'active',  -- active | finished
      turn_user_id      INTEGER REFERENCES users(id),
      challenger_hp     INTEGER NOT NULL,
      opponent_hp       INTEGER NOT NULL,
      challenger_max_hp INTEGER NOT NULL,
      opponent_max_hp   INTEGER NOT NULL,
      turn_count        INTEGER DEFAULT 0,
      log               JSONB DEFAULT '[]'::jsonb,
      winner_id         INTEGER REFERENCES users(id),
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_battles_challenger ON battles(challenger_id, status);
    CREATE INDEX IF NOT EXISTS idx_battles_opponent   ON battles(opponent_id, status);

    -- Multiplayer dungeon parties. A party progresses through phases:
    --   lobby     = host is recruiting, members can leave/join
    --   fighting  = boss fight active, broadcast over WebSocket
    --   finished  = victory or wipe, kept around briefly for rewards screen
    --   cancelled = host abandoned, members ejected
    CREATE TABLE IF NOT EXISTS parties (
      id            SERIAL PRIMARY KEY,
      host_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status        VARCHAR(20) DEFAULT 'lobby',
      floor         INTEGER DEFAULT 20,
      boss          JSONB,
      boss_hp       INTEGER,
      boss_max_hp   INTEGER,
      turn_index    INTEGER DEFAULT 0,
      round_count   INTEGER DEFAULT 0,
      log           JSONB DEFAULT '[]'::jsonb,
      winner        VARCHAR(10),
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_parties_host_status ON parties(host_id, status);

    CREATE TABLE IF NOT EXISTS party_members (
      party_id      INTEGER REFERENCES parties(id) ON DELETE CASCADE,
      user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
      position      INTEGER NOT NULL,
      hp            INTEGER DEFAULT 0,
      max_hp        INTEGER DEFAULT 0,
      is_alive      BOOLEAN DEFAULT true,
      has_acted     BOOLEAN DEFAULT false,
      joined_at     TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (party_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_party_members_user ON party_members(user_id);

    CREATE TABLE IF NOT EXISTS party_invites (
      party_id      INTEGER REFERENCES parties(id) ON DELETE CASCADE,
      inviter_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      invitee_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status        VARCHAR(20) DEFAULT 'pending',
      created_at    TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (party_id, invitee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_party_invites_invitee ON party_invites(invitee_id, status);

    -- Tavern: per-user private room with furniture placements and a small
    -- visitor guestbook. Decorations are owned (user_tavern_furniture) and
    -- separately placed onto tile coordinates (user_tavern_placements).
    CREATE TABLE IF NOT EXISTS user_tavern (
      user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      privacy        VARCHAR(10) DEFAULT 'public',
      wall_color     VARCHAR(7)  DEFAULT '#4a3a2a',
      floor_color    VARCHAR(7)  DEFAULT '#7a5a3a',
      greeting       VARCHAR(140) DEFAULT 'Welcome to my tavern!',
      updated_at     TIMESTAMP   DEFAULT NOW()
    );
    -- Backfill greeting column for taverns created before this migration.
    ALTER TABLE user_tavern ADD COLUMN IF NOT EXISTS greeting VARCHAR(140) DEFAULT 'Welcome to my tavern!';

    CREATE TABLE IF NOT EXISTS user_tavern_furniture (
      user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
      furniture_id   VARCHAR(60) NOT NULL,
      acquired_at    TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, furniture_id)
    );

    CREATE TABLE IF NOT EXISTS user_tavern_placements (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
      furniture_id   VARCHAR(60) NOT NULL,
      tile_x         INTEGER NOT NULL,
      tile_y         INTEGER NOT NULL,
      rotation       INTEGER DEFAULT 0,
      mounted_item   VARCHAR(60),
      UNIQUE (user_id, tile_x, tile_y)
    );
    CREATE INDEX IF NOT EXISTS idx_tavern_placements_user ON user_tavern_placements(user_id);

    CREATE TABLE IF NOT EXISTS user_tavern_guestbook (
      id             SERIAL PRIMARY KEY,
      owner_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
      visitor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      visitor_name   VARCHAR(50),
      message        VARCHAR(140),
      created_at     TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tavern_guestbook_owner ON user_tavern_guestbook(owner_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS user_tavern_waves (
      owner_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
      visitor_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      last_wave_at   TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (owner_id, visitor_id)
    );
  `);
  // Grant infinite gold + master admin to theDevs account (if it exists).
  // Master admin is the highest tier — only they can grant admin perms.
  await pool.query(`
    UPDATE users SET gold = 2147483647, is_admin = true, is_master_admin = true
    WHERE LOWER(username) = 'thedevs'
  `);

  // Backfill milestone-reward banners for any user already past the threshold.
  // Idempotent thanks to the (user_id, item_id) unique constraint.
  const MILESTONES = [
    { level: 25,  itemId: 'banner_veteran' },
    { level: 50,  itemId: 'banner_ascendant' },
    { level: 100, itemId: 'banner_incarnate' },
  ];
  for (const { level, itemId } of MILESTONES) {
    await pool.query(
      `INSERT INTO user_inventory (user_id, item_id)
       SELECT id, $1 FROM users WHERE level >= $2
       ON CONFLICT (user_id, item_id) DO NOTHING`,
      [itemId, level]
    );
  }

  console.log('✅ Database initialized');
};

module.exports = { pool, initDB };
