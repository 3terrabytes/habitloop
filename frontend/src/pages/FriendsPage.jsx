import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PixelCharacter from '../components/PixelCharacter';
import BannerName from '../components/BannerName';
import { Avatar, SectionTitle } from '../components/Leaderboard';

function levelTitle(level) {
  const t = ['','Rookie','Apprentice','Explorer','Achiever','Challenger','Warrior','Champion','Master','Grandmaster','Legend'];
  return t[Math.min(level, t.length - 1)];
}

const RARITY_COLORS = { common: '#9ca3af', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };
const RARITY_BG     = { common: '#9ca3af22', rare: '#3b82f622', epic: '#8b5cf622', legendary: '#f59e0b22' };

// ── Expanded friend profile mini-card ──────────────────────────────────────
function FriendProfileCard({ friend, onClose }) {
  const [details, setDetails] = useState(null);
  useEffect(() => {
    api.profile.get(friend.username).then(setDetails).catch(() => {});
  }, [friend.username]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border-bright)',
        borderRadius: 16, padding: 24, maxWidth: 440, width: '100%',
        maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 12,
            background: `linear-gradient(180deg, ${friend.avatar_color || '#6366f1'}33, ${friend.avatar_color || '#6366f1'}10)`,
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            <PixelCharacter appearance={friend} equipped={friend.equipped || {}} size={64} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BannerName
                username={friend.username}
                banner={friend.equipped?.banner}
                size="md"
                cinzel
              />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lv.{friend.level} {levelTitle(friend.level)}</div>
          </div>
          <Link to={`/users/${friend.username}`} style={{
            fontSize: 12, color: 'var(--accent2)', textDecoration: 'none',
            background: 'var(--bg3)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
          }}>
            Full Profile →
          </Link>
        </div>

        {/* Dungeon stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { icon: '⚔️', label: 'Ascension', val: details?.dungeon_ascension ?? friend.dungeon_ascension ?? 0 },
            { icon: '🌊', label: 'Best Wave', val: details?.best_survival_wave ?? friend.best_survival_wave ?? 0 },
            { icon: '⚡', label: 'XP', val: friend.xp?.toLocaleString() ?? '🔒' },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ marginTop: 20, width: '100%', padding: '10px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Visual item card for trade UI ──────────────────────────────────────────
function VisualItemCard({ item, selected, onClick }) {
  const rarityColor = RARITY_COLORS[item.rarity] || '#9ca3af';
  const rarityBg    = RARITY_BG[item.rarity]    || '#9ca3af22';
  return (
    <button type="button" onClick={() => onClick(item)} style={{
      background: selected ? rarityBg : 'var(--bg3)',
      border: `2px solid ${selected ? rarityColor : 'var(--border)'}`,
      borderRadius: 12, padding: '12px 10px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      transition: 'all 0.15s', transform: selected ? 'scale(1.04)' : 'scale(1)',
      boxShadow: selected ? `0 0 16px ${rarityColor}44` : 'none',
      position: 'relative',
    }}>
      <div style={{ fontSize: 28 }}>{item.type === 'banner' ? '🏷️' : item.emoji}</div>
      <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', color: selected ? rarityColor : 'var(--text)', lineHeight: 1.2 }}>{item.name}</div>
      <div style={{ fontSize: 10, color: rarityColor, fontWeight: 600, textTransform: 'uppercase' }}>{item.rarity}</div>
      {item.magic > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>✨ {item.magic}</div>}
    </button>
  );
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends]           = useState([]);
  const [pending, setPending]           = useState([]);
  const [search, setSearch]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [requested, setRequested]       = useState(new Set());
  const [tab, setTab]                   = useState('friends');
  const [selectedFriend, setSelectedFriend] = useState(null);

  // Trade state
  const [myInventory, setMyInventory]       = useState([]);
  const [myEquipped, setMyEquipped]         = useState({});
  const [friendInventory, setFriendInventory] = useState([]);
  const [tradeFriend, setTradeFriend]       = useState(null);
  const [myOfferItem, setMyOfferItem]       = useState(null);
  const [wantItem, setWantItem]             = useState(null);
  const [tradeMsg, setTradeMsg]             = useState('');
  const [tradePending, setTradePending]     = useState([]);
  const [tradeStatus, setTradeStatus]       = useState(null);

  // Gift state
  const [giftFriend, setGiftFriend]   = useState(null);
  const [giftItem, setGiftItem]       = useState(null);
  const [giftMsg, setGiftMsg]         = useState('');
  const [giftStatus, setGiftStatus]   = useState(null);

  // ── PvP Battle state ──
  // `activeBattle` is whatever the current pending/active battle is (or null).
  // `battleModalOpen` is true while we're showing the battle UI.
  // `battleError` shows a one-off message in the modal.
  const [activeBattle, setActiveBattle]   = useState(null);
  const [battleModalOpen, setBattleModal] = useState(false);
  const [battleBusy, setBattleBusy]       = useState(false);
  const [battleError, setBattleError]     = useState(null);

  const refreshBattle = async () => {
    try {
      const { battle } = await api.battles.active();
      setActiveBattle(battle);
      return battle;
    } catch { return null; }
  };

  useEffect(() => {
    refreshBattle();
    // Poll every 20s so we see the opponent's turn without manual refresh.
    const id = setInterval(refreshBattle, 20_000);
    return () => clearInterval(id);
  }, []);

  const challengeFriend = async (friend) => {
    setBattleError(null);
    setBattleBusy(true);
    try {
      const { battle } = await api.battles.challenge(friend.id);
      setActiveBattle(battle);
      setBattleModal(true);
    } catch (err) {
      setBattleError(err.message);
      // If they already have one, just open it.
      const existing = await refreshBattle();
      if (existing) setBattleModal(true);
    }
    setBattleBusy(false);
  };

  const takeTurn = async (attackId) => {
    if (!activeBattle || battleBusy) return;
    setBattleBusy(true); setBattleError(null);
    try {
      const { battle } = await api.battles.turn(activeBattle.id, attackId);
      setActiveBattle(battle);
    } catch (err) {
      setBattleError(err.message);
    }
    setBattleBusy(false);
  };

  const forfeitBattle = async () => {
    if (!activeBattle || battleBusy) return;
    if (!window.confirm('Forfeit this battle? Opponent will win automatically.')) return;
    setBattleBusy(true);
    try {
      const { battle } = await api.battles.forfeit(activeBattle.id);
      setActiveBattle(battle);
    } catch (err) {
      setBattleError(err.message);
    }
    setBattleBusy(false);
  };

  const load = async () => {
    const [f, p, tp, inv] = await Promise.all([
      api.friends.list(),
      api.friends.pending(),
      api.gifts.tradePending(),
      api.avatar.inventory(),
    ]);
    setFriends(Array.isArray(f) ? f : []);
    setPending(Array.isArray(p) ? p : []);
    setTradePending(Array.isArray(tp) ? tp : []);
    setMyInventory(Array.isArray(inv) ? inv : (inv?.items ?? []));
    setMyEquipped(inv?.equipped ?? {});
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const results = await api.friends.search(search);
      setSearchResults(results);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const sendRequest = async (id) => {
    try { await api.friends.request(id); setRequested(s => new Set([...s, id])); } catch {}
  };
  const accept = async (id) => { await api.friends.accept(id); await load(); };
  const remove = async (id) => { await api.friends.remove(id); await load(); };

  const openTrade = async (friend) => {
    setTradeFriend(friend);
    setMyOfferItem(null); setWantItem(null); setTradeMsg(''); setTradeStatus(null);
    const inv = await api.profile.inventory(friend.username).catch(() => []);
    setFriendInventory(Array.isArray(inv) ? inv : (inv?.items ?? []));
    setTab('trade');
  };

  const openGift = (friend) => {
    setGiftFriend(friend);
    setGiftItem(null); setGiftMsg(''); setGiftStatus(null);
    setTab('gift');
  };

  const sendTrade = async () => {
    if (!myOfferItem || !wantItem || !tradeFriend) return;
    try {
      await api.gifts.tradePropose({
        receiver_id: tradeFriend.id,
        offer_item_id: myOfferItem.id,
        want_item_id: wantItem.id,
        message: tradeMsg,
      });
      setTradeStatus({ type: 'success', msg: `Trade proposed to ${tradeFriend.username}!` });
      setMyOfferItem(null); setWantItem(null);
    } catch (e) {
      setTradeStatus({ type: 'error', msg: e.message });
    }
  };

  const sendGift = async () => {
    if (!giftItem || !giftFriend) return;
    try {
      const res = await api.gifts.send({ receiver_id: giftFriend.id, item_id: giftItem.id, message: giftMsg });
      setGiftStatus({ type: 'success', msg: `Gift sent! +${res.xp_gained || 0} XP for your generosity 🎁` });
      setGiftItem(null);
      await load();
    } catch (e) {
      setGiftStatus({ type: 'error', msg: e.message });
    }
  };

  const TABS = [
    { key: 'friends', label: `👥 Friends${pending.length ? ` (${pending.length})` : ''}` },
    { key: 'find',    label: '🔍 Find' },
    { key: 'gift',    label: '🎁 Gift' },
    { key: 'trade',   label: `⚔️ Trade${tradePending.length ? ` (${tradePending.length})` : ''}` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>

      {selectedFriend && (
        <FriendProfileCard friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
      )}

      {/* Active battle banner — visible whenever the user is in one. */}
      {activeBattle && activeBattle.status === 'active' && !battleModalOpen && (
        <div onClick={() => setBattleModal(true)} style={{
          padding: '10px 14px', borderRadius: 12,
          background: activeBattle.yourTurn
            ? 'linear-gradient(90deg, rgba(239,68,68,0.18), rgba(127,29,29,0.18))'
            : 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(30,58,138,0.12))',
          border: `1px solid ${activeBattle.yourTurn ? '#ef444466' : '#6366f166'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>🗡️</span>
          <div style={{ flex: 1, fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: activeBattle.yourTurn ? '#fca5a5' : '#a5b4fc' }}>
              {activeBattle.yourTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
              {' — '}
              vs {activeBattle.youAreChallenger ? activeBattle.opponent?.username : activeBattle.challenger?.username}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Round {activeBattle.turn_count + 1} · Click to {activeBattle.yourTurn ? 'take your turn' : 'view'}
            </div>
          </div>
        </div>
      )}

      {battleModalOpen && activeBattle && (
        <BattleModal
          battle={activeBattle}
          busy={battleBusy}
          error={battleError}
          onTurn={takeTurn}
          onForfeit={forfeitBattle}
          onRefresh={refreshBattle}
          onClose={() => { setBattleModal(false); setBattleError(null); }}
        />
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 12, padding: 4, border: '1px solid var(--border)', gap: 2, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, minWidth: 70, padding: '9px 6px', border: 'none', borderRadius: 9, cursor: 'pointer',
            background: tab === t.key ? 'var(--bg3)' : 'transparent',
            color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
            fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── FRIENDS ── */}
      {tab === 'friends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.length > 0 && (
            <div>
              <SectionTitle>Pending Requests</SectionTitle>
              {pending.map(p => (
                <div key={p.id} style={S.friendRow} className="card">
                  <Avatar user={p} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 2 }}>
                      <BannerName username={p.username} banner={p.equipped?.banner} size="sm" />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lv.{p.level} {levelTitle(p.level)}</div>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => accept(p.id)}>Accept</button>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => remove(p.id)}>Decline</button>
                </div>
              ))}
            </div>
          )}

          <SectionTitle>Your Friends ({friends.length})</SectionTitle>
          {friends.length === 0 && (
            <div style={S.empty}><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No friends yet — find players below!</p></div>
          )}
          {friends.map(f => (
            <div key={f.id} className="card" style={{ ...S.friendRow, cursor: 'pointer' }}
              onClick={() => setSelectedFriend(f)}>
              <Avatar user={f} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 2 }}>
                  <BannerName username={f.username} banner={f.equipped?.banner} size="sm" />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Lv.{f.level} · ⚔️ Asc.{f.dungeon_ascension || 0} · 🌊 W{f.best_survival_wave || 0}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11, color: '#fca5a5' }}
                  title="Battle this player"
                  onClick={() => challengeFriend(f)} disabled={battleBusy || (activeBattle && activeBattle.status === 'active')}>
                  🗡️
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => openGift(f)}>🎁</button>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => openTrade(f)}>⚔️</button>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11, color: 'var(--red)' }} onClick={() => remove(f.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FIND ── */}
      {tab === 'find' && (
        <div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by username..." style={S.input} autoFocus />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {searchResults.map(u => {
              const isFriend = friends.some(f => f.id === u.id);
              const sent = requested.has(u.id);
              return (
                <div key={u.id} style={S.friendRow} className="card">
                  <Avatar user={u} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 2 }}>
                      <BannerName username={u.username} banner={u.equipped?.banner} size="sm" />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lv.{u.level} {levelTitle(u.level)}</div>
                  </div>
                  {isFriend ? (
                    <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Friends</span>
                  ) : sent ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sent!</span>
                  ) : (
                    <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => sendRequest(u.id)}>+ Add</button>
                  )}
                </div>
              );
            })}
            {search && searchResults.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: 24 }}>No players found</p>
            )}
          </div>
        </div>
      )}

      {/* ── GIFT ── */}
      {tab === 'gift' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: 'Cinzel,serif', fontSize: 16, marginBottom: 16 }}>🎁 Send a Gift</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Give an item from your inventory. You'll earn XP based on the rarity!
          </p>

          {/* Pick friend */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>To</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {friends.map(f => (
                <button key={f.id} type="button" onClick={() => setGiftFriend(f)} style={{
                  padding: '8px 14px', borderRadius: 8, border: `1px solid ${giftFriend?.id === f.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: giftFriend?.id === f.id ? 'rgba(99,102,241,0.15)' : 'var(--bg3)',
                  color: giftFriend?.id === f.id ? 'var(--accent2)' : 'var(--text-muted)',
                  fontSize: 13, cursor: 'pointer',
                }}>
                  {f.username}
                </button>
              ))}
              {friends.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add friends first!</p>}
            </div>
          </div>

          {/* Pick item */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Item to Gift</div>
            {myInventory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Your inventory is empty. Buy items in the Avatar shop!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 8 }}>
                {myInventory.map(item => (
                  <VisualItemCard key={item.id} item={item} selected={giftItem?.id === item.id} onClick={setGiftItem} />
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <input value={giftMsg} onChange={e => setGiftMsg(e.target.value)}
            placeholder="Message (optional)" style={{ ...S.input, marginBottom: 12 }} />

          {giftStatus && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: giftStatus.type === 'success' ? '#064e3b' : '#7f1d1d',
              color: giftStatus.type === 'success' ? '#6ee7b7' : '#fca5a5',
              fontSize: 13, border: `1px solid ${giftStatus.type === 'success' ? '#10b98155' : '#ef444455'}`,
            }}>{giftStatus.msg}</div>
          )}

          <button className="btn btn-gold" style={{ padding: '12px 24px', fontSize: 14 }}
            disabled={!giftFriend || !giftItem} onClick={sendGift}>
            Send Gift 🎁
          </button>
        </div>
      )}

      {/* ── TRADE ── */}
      {tab === 'trade' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Incoming trades */}
          {tradePending.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ fontFamily: 'Cinzel,serif', fontSize: 14, marginBottom: 12, color: 'var(--gold)' }}>⚔️ Incoming Trades</h3>
              {tradePending.map(trade => (
                <div key={trade.id} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 12, border: '1px solid var(--border)', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <strong>{trade.sender_name}</strong> offers <strong>{trade.offer_item_name}</strong> for your <strong>{trade.want_item_name}</strong>
                  </div>
                  {trade.message && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>"{trade.message}"</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}
                      onClick={() => api.gifts.tradeAccept(trade.id).then(load)}>Accept</button>
                    <button className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }}
                      onClick={() => api.gifts.tradeDecline(trade.id).then(load)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Propose trade */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: 'Cinzel,serif', fontSize: 16, marginBottom: 16 }}>⚔️ Propose a Trade</h3>

            {/* Pick friend */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Trade With</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {friends.map(f => (
                  <button key={f.id} type="button" onClick={() => openTrade(f)} style={{
                    padding: '8px 14px', borderRadius: 8, border: `1px solid ${tradeFriend?.id === f.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: tradeFriend?.id === f.id ? 'rgba(99,102,241,0.15)' : 'var(--bg3)',
                    color: tradeFriend?.id === f.id ? 'var(--accent2)' : 'var(--text-muted)',
                    fontSize: 13, cursor: 'pointer',
                  }}>
                    {f.username}
                  </button>
                ))}
                {friends.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add friends first!</p>}
              </div>
            </div>

            {tradeFriend && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 12, alignItems: 'start', marginBottom: 16 }}>
                  {/* My offer */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>You Offer</div>
                    {myInventory.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Empty inventory</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 6 }}>
                        {myInventory.map(item => (
                          <VisualItemCard key={item.id} item={item} selected={myOfferItem?.id === item.id} onClick={setMyOfferItem} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 40, fontSize: 20, color: 'var(--text-muted)' }}>⇌</div>

                  {/* They offer */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>You Want</div>
                    {friendInventory.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{tradeFriend.username}'s inventory is empty or private</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 6 }}>
                        {friendInventory.map(item => (
                          <VisualItemCard key={item.id} item={item} selected={wantItem?.id === item.id} onClick={setWantItem} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {(myOfferItem || wantItem) && (
                  <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, border: '1px solid var(--border)' }}>
                    {myOfferItem && <span>Your <strong style={{ color: RARITY_COLORS[myOfferItem.rarity] }}>{myOfferItem.name}</strong></span>}
                    {myOfferItem && wantItem && <span style={{ color: 'var(--text-muted)' }}> for </span>}
                    {wantItem && <span>their <strong style={{ color: RARITY_COLORS[wantItem.rarity] }}>{wantItem.name}</strong></span>}
                  </div>
                )}

                <input value={tradeMsg} onChange={e => setTradeMsg(e.target.value)}
                  placeholder="Message (optional)" style={{ ...S.input, marginBottom: 12 }} />

                {tradeStatus && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                    background: tradeStatus.type === 'success' ? '#064e3b' : '#7f1d1d',
                    color: tradeStatus.type === 'success' ? '#6ee7b7' : '#fca5a5',
                    fontSize: 13, border: `1px solid ${tradeStatus.type === 'success' ? '#10b98155' : '#ef444455'}`,
                  }}>{tradeStatus.msg}</div>
                )}

                <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 14 }}
                  disabled={!myOfferItem || !wantItem} onClick={sendTrade}>
                  Propose Trade ⚔️
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  friendRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' },
  input: {
    width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 16px', color: 'var(--text)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  },
  empty: { textAlign: 'center', padding: 32 },
};


// -- Battle Modal -----------------------------------------------------
// Shows HP bars + the last few log lines. Picks an attack if it's your turn,
// otherwise shows a "waiting for opponent" state.
function BattleModal({ battle, busy, error, onTurn, onForfeit, onRefresh, onClose }) {
  const finished = battle.status === 'finished';
  const youWon = finished && battle.winner_id === (battle.youAreChallenger ? battle.challenger?.id : battle.opponent?.id);
  const you = battle.youAreChallenger ? battle.challenger : battle.opponent;
  const them = battle.youAreChallenger ? battle.opponent : battle.challenger;
  const yourHp    = battle.youAreChallenger ? battle.challenger_hp : battle.opponent_hp;
  const yourMax   = battle.youAreChallenger ? battle.challenger_max_hp : battle.opponent_max_hp;
  const theirHp   = battle.youAreChallenger ? battle.opponent_hp : battle.challenger_hp;
  const theirMax  = battle.youAreChallenger ? battle.opponent_max_hp : battle.challenger_max_hp;

  const lastFive = (battle.log || []).slice(-6);
  const lastLog  = (battle.log || []).slice(-1)[0];

  // Replay the most recent log entry as an animation each time the battle
  // updates. We diff on turn count so the same turn isn't re-played mid-render.
  const [lastShownTurn, setLastShownTurn] = useState(0);
  const [playerAnim, setPlayerAnim]       = useState('');
  const [opponentAnim, setOpponentAnim]   = useState('');
  const [popDmg, setPopDmg]               = useState(null); // { side, value, kind }
  const [showFight, setShowFight]         = useState(false);

  useEffect(() => {
    // Fire FIGHT! banner the first time the modal opens for this battle.
    if (battle.turn_count === 0 && !finished) {
      setShowFight(true);
      const t = setTimeout(() => setShowFight(false), 700);
      return () => clearTimeout(t);
    }
  }, [battle.id, finished, battle.turn_count]);

  useEffect(() => {
    if (!lastLog || lastLog.turn === lastShownTurn) return;
    setLastShownTurn(lastLog.turn || 0);
    // Determine which side attacked. by-name matches the actor.
    const attackerWasYou = lastLog.by === you?.username;
    if (lastLog.heal) {
      setPopDmg({ side: attackerWasYou ? 'you' : 'them', value: lastLog.heal, kind: 'heal' });
      if (attackerWasYou) setPlayerAnim('battle-player-heal'); else setOpponentAnim('battle-player-heal');
    } else if (lastLog.dmg) {
      setPopDmg({ side: attackerWasYou ? 'them' : 'you', value: lastLog.dmg, kind: lastLog.crit ? 'crit' : 'hit' });
      if (attackerWasYou) setPlayerAnim('battle-player-dash'); else setOpponentAnim('battle-player-dash');
    }
    const t1 = setTimeout(() => { setPlayerAnim(''); setOpponentAnim(''); }, 600);
    const t2 = setTimeout(() => setPopDmg(null), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lastLog, lastShownTurn, you?.username]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16,
    }}>
      <div className="card" style={{
        maxWidth: 520, width: '100%', padding: 18,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(127,29,29,0.25) 0%, var(--bg2) 60%)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 18 }}>
            ??? vs {them?.username} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>� Lv {them?.level}</span>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 10px', fontSize: 13 }}>�</button>
        </div>

        {/* HP bars */}
        <div style={{ marginBottom: 12 }}>
          <BattleHp label={`${you?.username} (you)`} value={yourHp} max={yourMax} color="#10b981" />
          <div style={{ height: 8 }} />
          <BattleHp label={`${them?.username}`}   value={theirHp} max={theirMax} color="#ef4444" />
        </div>

        {/* Combatants stage — avatars side-by-side with attack animations
            and floating damage numbers. Lets duels feel like dungeon fights. */}
        <div style={{
          position: 'relative', height: 140, display: 'flex',
          alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '0 20px', marginBottom: 12,
          borderRadius: 10,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.18) 0%, rgba(0,0,0,0.4) 70%)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <span className="dungeon-torch" style={{ position: 'absolute', top: 6, left: 6, fontSize: 16 }}>🔥</span>
          <span className="dungeon-torch right" style={{ position: 'absolute', top: 6, right: 6, fontSize: 16 }}>🔥</span>

          <div className={`${playerAnim || 'battle-idle'}`} style={{ position: 'relative' }}>
            <PixelCharacter appearance={you?.appearance || you || {}} equipped={you?.equipped || {}} size={84} />
            {popDmg?.side === 'you' && (
              <div className={`battle-damage ${popDmg.kind === 'heal' ? 'heal' : ''} ${popDmg.kind === 'crit' ? 'crit' : ''}`}>
                {popDmg.kind === 'heal' ? `+${popDmg.value}` : popDmg.value}
              </div>
            )}
          </div>
          <div className={`${opponentAnim || 'battle-idle'}`} style={{
            position: 'relative', transform: 'scaleX(-1)',
          }}>
            <PixelCharacter appearance={them?.appearance || them || {}} equipped={them?.equipped || {}} size={84} />
            {popDmg?.side === 'them' && (
              <div className={`battle-damage ${popDmg.kind === 'heal' ? 'heal' : ''} ${popDmg.kind === 'crit' ? 'crit' : ''}`}
                style={{ transform: 'scaleX(-1)' }}>
                {popDmg.kind === 'heal' ? `+${popDmg.value}` : popDmg.value}
              </div>
            )}
          </div>
          {showFight && (
            <div className="battle-banner" style={{ color: '#fca5a5', fontSize: 36 }}>FIGHT!</div>
          )}
        </div>

        {/* Log */}
        <div style={{
          maxHeight: 140, overflowY: 'auto', padding: 10, marginBottom: 12,
          background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)',
        }}>
          {lastFive.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>The battle begins.</div>
            : lastFive.map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text)', marginBottom: 3, lineHeight: 1.35, whiteSpace: 'pre-line' }}>
                {l.text}
              </div>
            ))}
        </div>

        {error && (
          <div style={{ color: '#fca5a5', fontSize: 12, padding: 8, background: 'rgba(239,68,68,0.12)', borderRadius: 6, marginBottom: 10 }}>
            {error}
          </div>
        )}

        {/* Action area */}
        {finished ? (
          <div style={{
            padding: 14, borderRadius: 10, textAlign: 'center',
            background: youWon ? 'rgba(16,185,129,0.15)' : 'rgba(127,29,29,0.18)',
            border: `1px solid ${youWon ? '#10b98166' : '#ef444466'}`,
          }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 22, color: youWon ? '#6ee7b7' : '#fca5a5', marginBottom: 4 }}>
              {youWon ? 'VICTORY' : 'DEFEAT'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Battle ended in round {battle.turn_count}.
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '8px 22px' }}>Close</button>
          </div>
        ) : battle.yourTurn ? (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>
              YOUR TURN � PICK AN ATTACK
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
              {(battle.availableAttacks || []).map(a => (
                <button key={a.id}
                  disabled={busy}
                  onClick={() => onTurn(a.id)}
                  style={{
                    padding: 10, borderRadius: 8, cursor: 'pointer',
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    color: 'var(--text)', textAlign: 'left',
                    opacity: busy ? 0.5 : 1,
                  }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{a.emoji} <span style={{ fontSize: 12, fontWeight: 700 }}>{a.name}</span></div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {a.tag === 'heal' ? `+${a.heal} HP` : `${a.power} dmg`}
                    {a.tag === 'burn' ? ' � BURN' : ''}
                    {a.tag === 'poison' ? ' � POISON' : ''}
                    {a.tag === 'stun' ? ' � STUN' : ''}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            padding: 14, borderRadius: 10, textAlign: 'center',
            background: 'rgba(99,102,241,0.12)', border: '1px solid #6366f155',
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>?</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>
              Waiting for <strong>{them?.username}</strong> to take their turn�
            </div>
            <button className="btn btn-ghost" onClick={onRefresh} style={{ padding: '6px 16px', fontSize: 12, marginTop: 8 }}>
              ? Refresh
            </button>
          </div>
        )}

        {!finished && (
          <div style={{ textAlign: 'right' }}>
            <button className="btn btn-ghost" onClick={onForfeit} style={{ padding: '4px 10px', fontSize: 11, color: '#fca5a5' }}>
              ?? Forfeit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BattleHp({ label, value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{value} / {max}</span>
      </div>
      <div style={{ position: 'relative', height: 12, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}
