import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function StatsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats.get().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div style={{ color: 'var(--text-muted)' }}>Couldn't load stats: {error}</div>;
  if (!data) return <div style={{ color: 'var(--text-muted)' }}>Loading...</div>;

  const memberSince = data.user.member_since
    ? new Date(data.user.member_since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div style={styles.wrap}>
      <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 22, margin: 0 }}>📊 Stats</h1>

      <Card title="Progression">
        <div style={styles.summaryGrid}>
          <Stat label="Level"          value={data.user.level}                                  icon="⭐" />
          <Stat label="XP"             value={(data.user.xp || 0).toLocaleString()}             icon="⚡" />
          <Stat label="Gold"           value={(data.user.gold || 0).toLocaleString()}           icon="🪙" />
          <Stat label="Lifetime Gold"  value={(data.user.lifetime_gold || 0).toLocaleString()}  icon="💰" />
          <Stat label="Rebirths"       value={data.user.rebirth_count}                          icon="♾" />
          <Stat label="Joined"         value={memberSince}                                      icon="📅" />
        </div>
      </Card>

      <Card title="Dungeon">
        <div style={styles.summaryGrid}>
          <Stat label="Ascension"  value={data.dungeon.ascension} icon="⚔️" />
          <Stat label="Best Wave"  value={data.dungeon.best_wave} icon="🌊" />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
          Climb higher in the <Link to="/dungeon" style={{ color: 'var(--gold)' }}>Dungeon</Link> to push these numbers.
        </p>
      </Card>

      <Card title="Collection">
        <div style={styles.summaryGrid}>
          <Stat label="Achievements" value={data.collection.achievements_unlocked} icon="🏆" />
          <Stat label="Items Owned"  value={data.collection.items_owned}           icon="🎒" />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div style={styles.statBox}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{label}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 },
  summaryGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10,
  },
  statBox: {
    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
};
