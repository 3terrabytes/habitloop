import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Podium, PlayerCard, SectionTitle } from '../components/Leaderboard';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends]     = useState([]);
  const [myEquipped, setEquipped] = useState({});

  useEffect(() => {
    Promise.all([
      api.friends.list(),
      api.avatar.inventory(),
    ]).then(([f, inv]) => {
      setFriends(Array.isArray(f) ? f : []);
      setEquipped(inv?.equipped ?? {});
    });
  }, []);

  const board = [
    {
      id: user?.id,
      username: user?.username,
      xp: user?.xp || 0,
      level: user?.level || 1,
      avatar_color: user?.avatar_color,
      avatar_skin: user?.avatar_skin,
      avatar_hair: user?.avatar_hair,
      avatar_eyes: user?.avatar_eyes,
      avatar_hair_style: user?.avatar_hair_style,
      avatar_gender: user?.avatar_gender,
      avatar_beard: user?.avatar_beard,
      equipped: myEquipped,
      isSelf: true,
    },
    ...friends.filter(f => !f.suspended),
  ].sort((a, b) => b.xp - a.xp);

  const openPlayer = (p) => { if (!p.isSelf) navigate(`/users/${p.username}`); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
      <div>
        <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 22, marginBottom: 4 }}>🏆 Leaderboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Ranked by XP across you and your friends. Tap a player to view their profile.
        </p>
      </div>

      {board.length >= 2 ? (
        <Podium players={board.slice(0, 3)} onClick={openPlayer} />
      ) : null}

      {board.length > 3 && (
        <>
          <SectionTitle>The Rest</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {board.slice(3).map((p, i) => (
              <PlayerCard key={p.id} player={p} rank={i + 4} onClick={() => openPlayer(p)} />
            ))}
          </div>
        </>
      )}

      {board.length === 1 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 14 }}>Add friends to fill the podium!</p>
        </div>
      )}
    </div>
  );
}
