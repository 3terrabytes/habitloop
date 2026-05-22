import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { levelTitle, xpForLevel } from '../utils/xp';
import PixelCharacter from '../components/PixelCharacter';
import BannerName from '../components/BannerName';

const RARITY_COLORS = { common: '#9ca3af', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };

const SLOTS = [
  { key: 'weapon',    label: 'Weapon',    fallback: '🗡' },
  { key: 'armor',     label: 'Armor',     fallback: '🛡' },
  { key: 'banner',    label: 'Banner',    fallback: '🏷' },
  { key: 'badge',     label: 'Badge',     fallback: '🎖' },
  { key: 'companion', label: 'Companion', fallback: '🐾' },
  { key: 'title',     label: 'Title',     fallback: '📜' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [equipped, setEquipped] = useState({});

  const load = useCallback(async () => {
    try {
      const inv = await api.avatar.inventory();
      setEquipped(inv?.equipped || {});
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentXP    = user?.xp || 0;
  const currentLevel = user?.level || 1;
  const nextLevelXP  = xpForLevel(currentLevel + 1);
  const prevLevelXP  = xpForLevel(currentLevel);
  const xpProgress   = Math.min(((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100, 100);
  const rebirthMult  = 1 + 0.5 * (user?.rebirth_count || 0);

  return (
    <div style={styles.wrap}>
      {/* ── AVATAR SHOWCASE ─────────────────────────────────────── */}
      <div className="card" style={styles.avatarCard}>
        <div style={styles.avatarFrame}>
          <PixelCharacter
            equipped={equipped}
            appearance={user || {}}
            size={260}
          />
        </div>

        <div style={styles.identity}>
          <BannerName
            username={user?.username || ''}
            banner={equipped?.banner}
            size="lg"
            cinzel
          />
          <div style={styles.titleRow}>
            <span style={styles.levelBadge}>Lv.{currentLevel}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{levelTitle(currentLevel)}</span>
            {user?.rebirth_count > 0 && (
              <span
                title={`${rebirthMult.toFixed(1)}× XP & gold (permanent)`}
                style={styles.rebirthChip}
              >
                ♾ R{user.rebirth_count} · {rebirthMult.toFixed(1)}×
              </span>
            )}
          </div>

          <div style={styles.xpRow}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>XP</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()}</span>
            </div>
            <div className="xp-bar-wrap">
              <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <div style={styles.statRow}>
            <Stat icon="🪙" label="Gold"      value={(user?.gold || 0).toLocaleString()} color="var(--gold)" />
            <Stat icon="⚔️" label="Ascension" value={user?.dungeon_ascension || 0} />
            <Stat icon="🌊" label="Best Wave" value={user?.best_survival_wave || 0} />
          </div>
        </div>
      </div>

      {/* ── ENTER DUNGEON CTA ───────────────────────────────────── */}
      <Link to="/dungeon" style={styles.dungeonCta} className="card">
        <span style={{ fontSize: 32 }}>⚔️</span>
        <div style={{ flex: 1 }}>
          <div style={styles.ctaTitle}>Enter the Dungeon</div>
          <div style={styles.ctaSub}>Slay monsters · earn gold · climb the ascension ladder</div>
        </div>
        <span style={{ fontSize: 24, color: 'var(--gold)' }}>→</span>
      </Link>

      {/* ── EQUIPPED ITEMS ──────────────────────────────────────── */}
      <div>
        <h3 style={styles.sectionTitle}>Equipped</h3>
        <div style={styles.slotGrid}>
          {SLOTS.map(slot => {
            const item = equipped?.[slot.key];
            const rarity = item?.rarity || 'common';
            const border = item ? RARITY_COLORS[rarity] : 'var(--border)';
            return (
              <Link
                key={slot.key}
                to="/avatar"
                title={item ? `${item.name} (${rarity})` : `No ${slot.label.toLowerCase()} equipped`}
                style={{ ...styles.slot, borderColor: border }}
                className="card"
              >
                <div style={styles.slotIcon}>{item?.emoji || slot.fallback}</div>
                <div style={styles.slotLabel}>{slot.label}</div>
                <div style={{
                  ...styles.slotName,
                  color: item ? RARITY_COLORS[rarity] : 'var(--text-muted)',
                  opacity: item ? 1 : 0.6,
                }}>
                  {item?.name || '—'}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── SECONDARY LINKS ─────────────────────────────────────── */}
      <div style={styles.secondaryRow}>
        <Link to="/avatar" style={styles.secondaryLink} className="card">🎨 Customize Avatar</Link>
        <Link to="/achievements" style={styles.secondaryLink} className="card">🏆 Achievements</Link>
        <Link to="/leaderboard" style={styles.secondaryLink} className="card">📊 Leaderboard</Link>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color }) {
  return (
    <div style={styles.stat}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: 15, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 },

  avatarCard: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, var(--bg2) 60%)',
  },
  avatarFrame: {
    width: 280, height: 280,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid var(--border-bright)',
    borderRadius: 20,
    background: 'radial-gradient(circle at 50% 60%, rgba(245,197,66,0.10), transparent 70%), var(--bg3)',
    boxShadow: '0 0 32px rgba(245,197,66,0.12), inset 0 0 24px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  identity: {
    width: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  levelBadge: {
    padding: '4px 12px',
    borderRadius: 99,
    background: 'var(--accent)',
    color: 'white',
    fontSize: 13,
    fontWeight: 700,
  },
  rebirthChip: {
    padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
    background: 'linear-gradient(90deg, #7c3aed, #ec4899)',
    color: 'white',
  },
  xpRow: { width: '100%', maxWidth: 360, marginTop: 4 },
  statRow: {
    display: 'flex', gap: 12, marginTop: 8,
    width: '100%', maxWidth: 420, justifyContent: 'space-around',
  },
  stat: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '8px 10px', borderRadius: 10,
    background: 'var(--bg3)', border: '1px solid var(--border)',
  },

  dungeonCta: {
    padding: '16px 20px',
    display: 'flex', alignItems: 'center', gap: 16,
    background: 'linear-gradient(90deg, rgba(127,29,29,0.25), rgba(99,102,241,0.18))',
    border: '1px solid #ef444466',
    textDecoration: 'none',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  ctaTitle: {
    fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700,
    color: 'var(--text)',
  },
  ctaSub: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },

  sectionTitle: {
    fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
  },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: 10,
  },
  slot: {
    padding: '12px 8px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    borderRadius: 12,
    borderWidth: 2, borderStyle: 'solid',
    textDecoration: 'none',
    transition: 'transform 0.12s',
  },
  slotIcon:  { fontSize: 32, lineHeight: 1 },
  slotLabel: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  slotName:  { fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 },

  secondaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
  },
  secondaryLink: {
    padding: '12px 14px',
    fontSize: 13,
    textAlign: 'center',
    textDecoration: 'none',
    color: 'var(--text)',
    transition: 'border-color 0.15s',
  },
};
