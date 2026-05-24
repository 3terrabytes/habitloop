import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PixelCharacter, { PetSprite } from '../components/PixelCharacter';
import BannerName from '../components/BannerName';
import useParty from '../hooks/useParty';

const ELEMENT_ICON = {
  fire: '🔥', ice: '❄️', poison: '☠️', shadow: '🌑',
  arcane: '✨', holy: '☀️', physical: '⚔️', lightning: '⚡',
};

// Multiplayer raid page. One of three phases:
//   no party    — show "Form Party" + incoming invites
//   lobby       — show roster, invite friend picker, host can Start
//   fighting    — show the row-of-heroes vs giant boss battle scene
//   finished    — show victory/defeat banner and a "Leave" button

export default function PartyPage() {
  const { user, refreshUser } = useAuth();
  const { state, connected, refresh, reconnect, setOptimistic } = useParty();
  // Per-friend invite-tap memory so the button flips to "Invited" instantly
  // even before the server's pending_invites list refreshes.
  const optimisticInvitesRef = useRef(new Set());
  const [invites, setInvites] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loadout, setLoadout] = useState({ slotDetails: [] });
  const [toast, setToast] = useState(null);

  const showToast = (msg, kind = 'info') => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  };

  // Refresh invites + friends every 4s. Lightweight requests and the only
  // way the invitee learns about a new invite (their useParty poll won't
  // fire because they have no party yet).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [inv, fr] = await Promise.all([
        api.party.invites().catch(() => []),
        api.friends.list().catch(() => []),
      ]);
      if (cancelled) return;
      setInvites(inv);
      setFriends(fr);
    };
    load();
    const t = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Pull my loadout once we're in a fighting party.
  useEffect(() => {
    if (state?.id && state.status === 'fighting') {
      api.party.myLoadout(state.id).then(setLoadout).catch(() => {});
    }
  }, [state?.id, state?.status]);

  // After rewards: refresh the user XP/gold counter.
  useEffect(() => {
    if (state?.status === 'finished' && state?.winner === 'party') refreshUser?.();
  }, [state?.status, state?.winner, refreshUser]);

  const me = useMemo(
    () => state?.members?.find(m => m.user_id === user?.id),
    [state, user]
  );
  const isHost = state?.host_id === user?.id;
  const myTurn = state?.status === 'fighting'
    && state.members[state.turn_index]?.user_id === user?.id
    && me?.is_alive
    && !me?.has_acted;

  // ── Action handlers ──────────────────────────────────────────────
  // Every handler updates local state IMMEDIATELY (optimistic), fires the
  // REST call in the background, and either confirms via the next poll/WS
  // tick or rolls back on error. Buttons never wait for the network.

  const createParty = () => {
    // Optimistic stub party so the lobby renders before the REST call lands.
    setOptimistic({
      id: -1, host_id: user?.id, status: 'lobby', floor: 20,
      members: [{
        user_id: user?.id, username: user?.username, level: user?.level,
        position: 0, hp: 0, max_hp: 0, is_alive: true, has_acted: false,
        appearance: user || {}, equipped: {},
      }],
      pending_invites: [], log: [],
    });
    api.party.create({ floor: 20 })
      .then(() => { refresh(); reconnect(); })
      .catch(err => {
        setOptimistic(null);
        showToast(err.message, 'error');
      });
  };

  const invite = (friendId) => {
    if (!state) return;
    // Flip the button text instantly. Server pending_invites will overwrite
    // this on the next refresh, which is fine because they agree.
    optimisticInvitesRef.current.add(friendId);
    const friend = friends.find(f => f.id === friendId);
    setOptimistic(s => s ? {
      ...s,
      pending_invites: [
        ...(s.pending_invites || []),
        { invitee_id: friendId, username: friend?.username || '...', level: friend?.level || 1 },
      ],
    } : s);
    api.party.invite(state.id, friendId)
      .then(() => refresh())
      .catch(err => {
        optimisticInvitesRef.current.delete(friendId);
        refresh();
        showToast(err.message, 'error');
      });
  };

  const leave = () => {
    if (!state) return;
    const partyId = state.id;
    // Clear the UI immediately so the user feels the click.
    setOptimistic(null);
    api.party.leave(partyId)
      .then(() => { refresh(); reconnect(); })
      .catch(err => { refresh(); showToast(err.message, 'error'); });
  };

  const start = () => {
    if (!state) return;
    // Flip phase to 'fighting' locally so we render the battle scene now.
    // The real boss/HP values arrive in the next REST/WS tick (sub-2s).
    setOptimistic(s => s ? { ...s, status: 'fighting' } : s);
    api.party.start(state.id)
      .then(() => { refresh(); reconnect(); })
      .catch(err => { refresh(); showToast(err.message, 'error'); });
  };

  const submitAttack = useCallback((attackId) => {
    if (!state || !myTurn) return;
    // Mark our own member as has_acted=true so the turn passes visibly even
    // before the server confirms. If it errors, refresh resets it.
    setOptimistic(s => s ? {
      ...s,
      members: s.members.map(m =>
        m.user_id === user?.id ? { ...m, has_acted: true } : m
      ),
    } : s);
    api.party.turn(state.id, attackId)
      .catch(err => { refresh(); showToast(err.message, 'error'); });
  }, [state, myTurn, user, refresh, setOptimistic]);

  const acceptInvite = (partyId) => {
    api.party.accept(partyId)
      .then(() => { refresh(); reconnect(); showToast('Joined party!'); })
      .catch(err => showToast(err.message, 'error'));
    setInvites(inv => inv.filter(i => i.party_id !== partyId));
  };
  const declineInvite = (partyId) => {
    setInvites(inv => inv.filter(i => i.party_id !== partyId));
    api.party.decline(partyId).catch(err => showToast(err.message, 'error'));
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: 0, fontSize: 22 }}>
          Raid Hall
        </h2>
        <span style={{ fontSize: 11, color: connected ? '#86efac' : '#fbbf24' }}>
          {connected ? '● Live' : '○ Polling'}
        </span>
      </header>

      {toast && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 13,
          background: toast.kind === 'error' ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.18)',
          color: toast.kind === 'error' ? '#fca5a5' : '#a5b4fc',
        }}>{toast.msg}</div>
      )}

      {/* No party? Show invites + create button. */}
      {!state && (
        <NoPartyView
          invites={invites}
          onAccept={acceptInvite}
          onDecline={declineInvite}
          onCreate={createParty}
        />
      )}

      {state?.status === 'lobby' && (
        <LobbyView
          state={state}
          me={me}
          isHost={isHost}
          friends={friends}
          onInvite={invite}
          onLeave={leave}
          onStart={start}
        />
      )}

      {state?.status === 'fighting' && (
        <BattleView
          state={state}
          me={me}
          user={user}
          loadout={loadout}
          myTurn={myTurn}
          onAttack={submitAttack}
          onLeave={leave}
        />
      )}

      {state?.status === 'finished' && (
        <ResultView state={state} onLeave={leave} />
      )}
    </div>
  );
}

// ── No-party view ───────────────────────────────────────────────────
function NoPartyView({ invites, onAccept, onDecline, onCreate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>⚔️</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: 'var(--gold)', marginBottom: 6 }}>
          Forge a raid party
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          Up to 4 heroes. One titan-tier boss. Take turns in formation while the boss singles out one of you each round.
        </div>
        <button className="btn btn-primary" onClick={onCreate} style={{ padding: '10px 22px' }}>
          Form Party
        </button>
      </div>

      {invites.length > 0 && (
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>
            INCOMING INVITES
          </div>
          {invites.map(inv => (
            <div key={inv.party_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{inv.inviter_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Floor {inv.floor} raid
                </div>
              </div>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => onAccept(inv.party_id)}>Accept</button>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => onDecline(inv.party_id)}>Decline</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lobby ───────────────────────────────────────────────────────────
function LobbyView({ state, me, isHost, friends, onInvite, onLeave, onStart }) {
  const pendingIds = new Set((state.pending_invites || []).map(p => p.invitee_id));
  const invitableFriends = friends.filter(f =>
    !state.members.some(m => m.user_id === f.id)
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', fontSize: 15 }}>Raid Lobby</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Floor {state.floor} · {state.members.length}/4 heroes</div>
          </div>
          {isHost && (
            <button className="btn btn-primary" disabled={state.members.length < 1}
              onClick={onStart} style={{ padding: '8px 18px', fontSize: 13 }}>
              ⚔️ Begin Raid
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {state.members.map(m => (
            <div key={m.user_id} className="card" style={{ padding: 8, textAlign: 'center', borderColor: m.user_id === state.host_id ? 'var(--gold)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 4, gap: 4 }}>
                <PixelCharacter appearance={m.appearance} equipped={{ ...m.equipped, companion: null }} size={70} />
                <PetSprite pet={m.equipped?.companion} playerSize={70} />
              </div>
              <BannerName username={m.username} banner={m.equipped?.banner} size="sm" />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                Lv {m.level}{m.user_id === state.host_id ? ' · 👑 Host' : ''}
              </div>
            </div>
          ))}
          {/* Ghost cards for pending invites so the host sees who they invited. */}
          {(state.pending_invites || []).map(p => (
            <div key={`pending-${p.invitee_id}`} className="card" style={{
              padding: 8, textAlign: 'center', opacity: 0.55,
              borderStyle: 'dashed', borderColor: 'var(--border)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>👤</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{p.username}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                Lv {p.level} · ⏳ pending
              </div>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
            INVITE A FRIEND
          </div>
          {invitableFriends.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 2px' }}>
              No friends to invite — add some on the Friends page.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {invitableFriends.map(f => {
                const invited = pendingIds.has(f.id);
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 6, background: 'var(--bg2)' }}>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      {f.username} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Lv {f.level}</span>
                    </div>
                    {invited ? (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px' }}>⏳ Invited</span>
                    ) : (
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => onInvite(f.id)}>Invite</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button className="btn btn-ghost" style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: 12 }}
        onClick={onLeave}>{isHost ? 'Disband' : 'Leave'}</button>
    </div>
  );
}

// ── Battle Scene ────────────────────────────────────────────────────
// Big visual layout: boss centered upper, party members in a row along the
// lower edge. Highlight ring on whoever's turn it is. Each player sees their
// own attack buttons; when it isn't their turn the buttons are disabled.
function BattleView({ state, me, user, loadout, myTurn, onAttack, onLeave }) {
  const boss = state.boss;
  const bossPct = state.boss_max_hp ? (state.boss_hp / state.boss_max_hp) * 100 : 0;
  const activeMember = state.members[state.turn_index];

  // Watch for phase transitions in the log so we can flash a banner.
  const [phaseBanner, setPhaseBanner] = useState(null);
  const lastSeenPhaseRef = useRef(boss?.phase_index || 0);
  useEffect(() => {
    const idx = boss?.phase_index || 0;
    if (idx > lastSeenPhaseRef.current) {
      lastSeenPhaseRef.current = idx;
      const id = Date.now();
      setPhaseBanner({ id, text: `PHASE ${idx + 1}`, behavior: boss?.phases?.[idx]?.behavior });
      setTimeout(() => setPhaseBanner(b => (b && b.id === id) ? null : b), 1600);
    }
  }, [boss?.phase_index, boss?.phases]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="dungeon-stage stage-tier-5 boss-room" style={{ padding: 0, position: 'relative', minHeight: 380, overflow: 'hidden' }}>
        <div className="dungeon-floor" />
        {[0,1,2,3,4,5].map(i => (
          <span key={i} className="dust-mote" style={{
            left: `${8 + i * 14}%`,
            bottom: 24 + (i % 3) * 24,
            animationDelay: `${i * 0.9}s`,
            animationDuration: `${5 + (i % 3)}s`,
          }} />
        ))}
        <span className="dungeon-torch" style={{ position: 'absolute', top: 8, left: 8, fontSize: 22, zIndex: 2 }}>🔥</span>
        <span className="dungeon-torch right" style={{ position: 'absolute', top: 8, right: 8, fontSize: 22, zIndex: 2 }}>🔥</span>

        {/* Boss row */}
        <div style={{ position: 'relative', zIndex: 2, padding: '24px 16px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#fde047', fontSize: 13, letterSpacing: '0.18em', marginBottom: 4 }}>
              👑 RAID BOSS · FLOOR {state.floor}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{boss?.name}</div>
            {(boss?.weakTo?.length > 0 || boss?.resistantTo?.length > 0) && (
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', marginTop: 2 }}>
                {boss.weakTo?.length > 0 && (
                  <span style={{ color: '#86efac', marginRight: 8 }}>
                    WEAK {boss.weakTo.map(e => ELEMENT_ICON[e] || e).join('')}
                  </span>
                )}
                {boss.resistantTo?.length > 0 && (
                  <span style={{ color: '#94a3b8' }}>
                    RESIST {boss.resistantTo.map(e => ELEMENT_ICON[e] || e).join('')}
                  </span>
                )}
              </div>
            )}
            <div style={{ maxWidth: 360, margin: '8px auto 0' }}>
              <BossBar value={state.boss_hp} max={state.boss_max_hp} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {state.boss_hp} / {state.boss_max_hp} HP · {Math.round(bossPct)}% · Phase {(boss?.phase_index || 0) + 1}
              </div>
            </div>
          </div>

          {phaseBanner && (
            <div className="combo-banner" style={{
              color: '#fda4af', borderColor: '#fda4af', top: '50%',
            }}>
              <span style={{ fontSize: 12, letterSpacing: '0.2em', opacity: 0.8 }}>{phaseBanner.behavior?.toUpperCase()}</span>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '0.08em' }}>{phaseBanner.text}</span>
            </div>
          )}
          <div style={{ textAlign: 'center', fontSize: 110, lineHeight: 1, filter: 'drop-shadow(0 0 24px #ef444466)' }}>
            {boss?.sprite}
          </div>
        </div>

        {/* Party row */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 16,
          display: 'flex', justifyContent: 'space-evenly', alignItems: 'flex-end',
          padding: '0 16px', zIndex: 2, gap: 6,
        }}>
          {state.members.map((m) => {
            const isActive = m.position === state.turn_index && m.is_alive && !m.has_acted;
            const isMe = m.user_id === user?.id;
            return (
              <div key={m.user_id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: m.is_alive ? 1 : 0.35,
                filter: m.is_alive ? 'none' : 'grayscale(1)',
                transform: isActive ? 'translateY(-6px)' : 'none',
                transition: 'transform 0.2s',
              }}>
                {isActive && (
                  <div style={{ fontSize: 11, color: '#fde047', fontFamily: 'Cinzel, serif', marginBottom: 2 }}>
                    ⚔️ Acting
                  </div>
                )}
                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: 4,
                  borderRadius: '50%',
                  boxShadow: isActive ? '0 0 24px #fde04788' : isMe ? '0 0 12px #6ee7b755' : 'none',
                }}>
                  <PixelCharacter appearance={m.appearance} equipped={{ ...m.equipped, companion: null }} size={86} />
                  <PetSprite pet={m.equipped?.companion} playerSize={86} />
                </div>
                <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: isMe ? '#6ee7b7' : 'var(--text)' }}>
                  {m.username}{isMe ? ' (you)' : ''}
                </div>
                <div style={{ width: 78, marginTop: 2 }}>
                  <MiniHp value={m.hp} max={m.max_hp} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {m.hp}/{m.max_hp}{m.has_acted && m.is_alive ? ' · ✓' : ''}{!m.is_alive ? ' · 💀' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Turn banner + log */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--gold)' }}>
            Round {state.round_count + 1}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {myTurn
              ? <span style={{ color: '#fde047', fontWeight: 600 }}>Your turn — pick an attack</span>
              : activeMember
                ? <span>Waiting on <b>{activeMember.username}</b>...</span>
                : 'Resolving...'}
          </div>
        </div>

        {/* Attack buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {(loadout.slotDetails || []).map((a) => (
            <button key={a.id} className="btn btn-primary" disabled={!myTurn}
              onClick={() => onAttack(a.id)}
              style={{
                padding: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2,
                opacity: !myTurn ? 0.55 : 1, cursor: !myTurn ? 'not-allowed' : 'pointer',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{a.emoji}</span>
                <span style={{ fontWeight: 700 }}>{a.name}</span>
                {a.level > 1 && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#fde047' }}>Lv{a.level}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {a.tag === 'heal' ? `Restore ${a.leveledHeal || a.heal} HP`
                  : `${a.leveledPower ?? a.power} power${a.tag ? ' · ' + a.tag.toUpperCase() : ''}`}
              </div>
            </button>
          ))}
        </div>

        {/* Combat log */}
        <div style={{ marginTop: 12, maxHeight: 140, overflowY: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {(state.log || []).slice(-12).map((line, i) => (
            <div key={i} style={{ padding: '2px 0' }}>{line}</div>
          ))}
        </div>
      </div>

      <button className="btn btn-ghost" style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: 12 }}
        onClick={onLeave}>Forfeit</button>
    </div>
  );
}

function ResultView({ state, onLeave }) {
  const win = state.winner === 'party';
  return (
    <div className="card animate-pop" style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 6 }}>{win ? '🏆' : '💀'}</div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: win ? '#fde047' : '#fca5a5', marginBottom: 4 }}>
        {win ? 'VICTORY' : 'DEFEAT'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
        {win
          ? `Each survivor received ${state.boss?.xp} XP and ${state.boss?.gold} gold.`
          : 'The party has fallen. Better luck next time.'}
      </div>
      <button className="btn btn-primary" onClick={onLeave} style={{ padding: '8px 22px' }}>
        Leave Raid
      </button>
    </div>
  );
}

// ── HP bars ─────────────────────────────────────────────────────────
function BossBar({ value, max }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ width: '100%', height: 14, background: 'rgba(0,0,0,0.6)', borderRadius: 7, overflow: 'hidden', border: '1px solid #7f1d1d' }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: 'linear-gradient(90deg, #ef4444, #fbbf24)',
        transition: 'width 0.35s',
      }} />
    </div>
  );
}
function MiniHp({ value, max }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = pct > 50 ? '#10b981' : pct > 25 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.35s' }} />
    </div>
  );
}
