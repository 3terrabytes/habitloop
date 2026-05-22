import PixelCharacter from './PixelCharacter';
import BannerName from './BannerName';

const xpForLevel = (level) => Math.floor(100 * Math.pow(level, 1.5));

export function Avatar({ user, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: `linear-gradient(180deg, ${user.avatar_color || '#6366f1'}33, ${user.avatar_color || '#6366f1'}10)`,
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, position: 'relative',
    }}>
      <PixelCharacter appearance={user} equipped={user.equipped || {}} size={size} />
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</h3>;
}

export function Podium({ players, onClick }) {
  const first  = players[0];
  const second = players[1];
  const third  = players[2];

  const COLORS = {
    1: { glow: '#f5c542', step: 'linear-gradient(180deg,#fde68a,#f59e0b)', border: '#f5c542' },
    2: { glow: '#cbd5e1', step: 'linear-gradient(180deg,#e2e8f0,#94a3b8)', border: '#cbd5e1' },
    3: { glow: '#d4a373', step: 'linear-gradient(180deg,#e8c39a,#a86b3a)', border: '#d4a373' },
  };

  const PodiumStep = ({ player, rank, height }) => {
    if (!player) return <div style={{ flex: 1 }} />;
    const c = COLORS[rank];
    const medal = ['🥇', '🥈', '🥉'][rank - 1];
    return (
      <div
        onClick={() => onClick && onClick(player)}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          cursor: player.isSelf ? 'default' : 'pointer',
          position: 'relative',
        }}>
        {rank === 1 && (
          <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 2, filter: 'drop-shadow(0 0 8px rgba(245,197,66,0.7))' }}>
            👑
          </div>
        )}
        <div style={{
          position: 'relative',
          padding: 6, borderRadius: 14,
          background: `radial-gradient(circle at 50% 40%, ${c.glow}55, transparent 70%)`,
        }}>
          <div style={{
            border: `2px solid ${c.border}`,
            borderRadius: 12, overflow: 'hidden',
            background: 'var(--bg2)',
            boxShadow: `0 0 18px ${c.glow}55`,
          }}>
            <PixelCharacter
              appearance={player}
              equipped={player.equipped || {}}
              size={rank === 1 ? 92 : 72}
            />
          </div>
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--bg)', border: `2px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>{medal}</div>
        </div>
        <div style={{ marginTop: 8, textAlign: 'center', maxWidth: '100%', padding: '0 4px' }}>
          <BannerName
            username={player.username}
            banner={player.equipped?.banner}
            size={rank === 1 ? 'md' : 'sm'}
            isSelf={player.isSelf}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Lv.{player.level} · {(player.xp || 0).toLocaleString()} XP
          </div>
        </div>
        <div style={{
          marginTop: 8, width: '100%', height,
          background: c.step,
          borderTopLeftRadius: 8, borderTopRightRadius: 8,
          border: `1px solid ${c.border}`,
          borderBottom: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700,
          color: 'rgba(0,0,0,0.55)',
          textShadow: '0 1px 0 rgba(255,255,255,0.4)',
          boxShadow: `0 -2px 12px ${c.glow}55, inset 0 4px 12px rgba(255,255,255,0.2)`,
        }}>
          {rank}
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{
      padding: '20px 14px 0',
      background: 'linear-gradient(180deg, rgba(99,102,241,0.10), transparent 60%)',
    }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, textAlign: 'center', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
        🏆 Champions 🏆
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
        <PodiumStep player={second} rank={2} height={70} />
        <PodiumStep player={first}  rank={1} height={100} />
        <PodiumStep player={third}  rank={3} height={50} />
      </div>
    </div>
  );
}

export function PlayerCard({ player, rank, onClick }) {
  const xpPrev = Math.floor(100 * Math.pow(player.level, 1.5));
  const xpNext = xpForLevel(player.level + 1);
  const pct    = Math.min(((player.xp - xpPrev) / (xpNext - xpPrev)) * 100, 100);

  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      cursor: player.isSelf ? 'default' : 'pointer',
      ...(player.isSelf ? { borderColor: 'var(--accent)', background: 'rgba(99,102,241,0.08)' } : {}),
      transition: 'all 0.15s',
    }}
    className="card"
    onMouseEnter={e => { if (!player.isSelf) e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
    onMouseLeave={e => { if (!player.isSelf) e.currentTarget.style.borderColor = ''; }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', width: 28, textAlign: 'center', fontWeight: 600 }}>
        #{rank}
      </div>
      <Avatar user={player} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BannerName
            username={player.username}
            banner={player.equipped?.banner}
            size="sm"
            isSelf={player.isSelf}
          />
          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, background: player.isSelf ? 'var(--accent)' : 'var(--bg3)', color: player.isSelf ? 'white' : 'var(--text-muted)', flexShrink: 0 }}>
            Lv.{player.level}
          </span>
        </div>
        <div className="xp-bar-wrap" style={{ marginTop: 4 }}>
          <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 15 }}>{(player.xp || 0).toLocaleString()}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>XP</div>
      </div>
    </div>
  );
}
