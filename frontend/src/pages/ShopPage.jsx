import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

// ── Shop, hoisted to a top-level page with two tabs ────────────────────
// Tab 1: Items  — gear (weapons, armor, banners, etc.)
// Tab 2: Decor  — tavern furniture (purchased to decorate your room)
//
// Card visuals match the rest of the app: rarity-coloured borders, gold
// cost top-right, OWNED state when you've bought it. Mythic decorations
// are drop-only and only appear once you've earned them.

const RARITY = {
  common:    { color: '#94a3b8', label: 'Common',    border: 'rgba(148,163,184,0.5)' },
  rare:      { color: '#60a5fa', label: 'Rare',      border: 'rgba(96,165,250,0.6)' },
  epic:      { color: '#a78bfa', label: 'Epic',      border: 'rgba(167,139,250,0.7)' },
  legendary: { color: '#fde047', label: 'Legendary', border: 'rgba(253,224,71,0.8)' },
  mythic:    { color: '#f0abfc', label: 'Mythic',    border: 'rgba(240,171,252,0.85)' },
};
const RARITY_ORDER = ['mythic', 'legendary', 'epic', 'rare', 'common'];

export default function ShopPage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('items'); // 'items' | 'decor' | 'emotes'
  const [items, setItems] = useState({ gold: 0, items: [], ownedIds: [], legendsUnlocked: false });
  const [decor, setDecor] = useState({ gold: 0, items: [], ownedIds: [] });
  const [emotes, setEmotes] = useState({ gold: 0, items: [], ownedIds: [], equipped: 'wave' });
  const [buying, setBuying] = useState(null);
  const [equipping, setEquipping] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, kind = 'info') => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  };

  // Initial + post-purchase load. Both tabs are tiny so we always refresh
  // together to keep gold balance consistent across tabs.
  const load = async () => {
    try {
      const [s, f, em] = await Promise.all([
        api.avatar.shop().catch(() => ({ items: [], ownedIds: [] })),
        api.avatar.furniture().catch(() => ({ items: [], ownedIds: [] })),
        api.avatar.emotes().catch(() => ({ items: [], ownedIds: [], equipped: 'wave' })),
      ]);
      setItems(s); setDecor(f); setEmotes(em);
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const buyItem = async (item) => {
    if (buying) return;
    setBuying(item.id);
    try {
      await api.avatar.buy(item.id);
      showToast(`Bought ${item.name}!`);
      await load(); await refreshUser?.();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setBuying(null); }
  };
  const buyDecor = async (f) => {
    if (buying) return;
    setBuying(f.id);
    try {
      await api.avatar.buyFurniture(f.id);
      showToast(`Bought ${f.name}!`);
      await load(); await refreshUser?.();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setBuying(null); }
  };

  const buyEmote = async (e) => {
    if (buying) return;
    setBuying(e.id);
    try {
      await api.avatar.buyEmote(e.id);
      showToast(`Bought ${e.name}!`);
      await load(); await refreshUser?.();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setBuying(null); }
  };

  const equipEmote = async (e) => {
    if (equipping) return;
    setEquipping(e.id);
    try {
      await api.avatar.equipEmote(e.id);
      showToast(`Equipped ${e.name}`);
      setEmotes(prev => ({ ...prev, equipped: e.id }));
      await refreshUser?.();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setEquipping(null); }
  };

  const gold = user?.gold ?? items.gold ?? decor.gold ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: 0, fontSize: 22 }}>
          🛒 Shop
        </h2>
        <span style={{ fontSize: 14, color: 'var(--gold)' }}>💰 {gold.toLocaleString()}</span>
      </header>

      {toast && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 13,
          background: toast.kind === 'error' ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)',
          color: toast.kind === 'error' ? '#fca5a5' : '#86efac',
        }}>{toast.msg}</div>
      )}

      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg2)', borderRadius: 10 }}>
        <TabButton active={tab === 'items'}  onClick={() => setTab('items')}>⚔️ Items</TabButton>
        <TabButton active={tab === 'decor'}  onClick={() => setTab('decor')}>🏛️ Decorations</TabButton>
        <TabButton active={tab === 'emotes'} onClick={() => setTab('emotes')}>🎭 Emotes</TabButton>
      </div>

      {tab === 'items' && (
        <ShopGrid
          items={items.items}
          ownedIds={items.ownedIds}
          buying={buying}
          onBuy={buyItem}
          gold={gold}
          emptyText="Loading the shop..."
        />
      )}
      {tab === 'decor' && (
        <ShopGrid
          items={decor.items}
          ownedIds={decor.ownedIds}
          buying={buying}
          onBuy={buyDecor}
          gold={gold}
          emptyText="No decorations available yet."
          showDropOnly
        />
      )}
      {tab === 'emotes' && (
        <EmoteGrid
          items={emotes.items}
          ownedIds={emotes.ownedIds}
          equipped={emotes.equipped}
          buying={buying}
          equipping={equipping}
          onBuy={buyEmote}
          onEquip={equipEmote}
          gold={gold}
        />
      )}
    </div>
  );
}

// Specialised grid for emotes — same rarity grouping as ShopGrid but
// adds an Equip button (and current-equipped pill) since emotes have an
// equip slot instead of being passively-equipped like gear.
function EmoteGrid({ items, ownedIds, equipped, buying, equipping, onBuy, onEquip, gold }) {
  const owned = new Set(ownedIds || []);
  const grouped = {};
  for (const e of items) {
    const r = e.rarity || 'common';
    (grouped[r] = grouped[r] || []).push(e);
  }
  if (!items.length) {
    return <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading emotes...</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Press <b>E</b> anywhere (or tap the 🎭 button up top) to play your equipped emote above your avatar.
      </div>
      {RARITY_ORDER.filter(r => grouped[r]?.length).map(r => {
        const rarity = RARITY[r];
        return (
          <section key={r}>
            <h3 style={{ margin: '4px 2px 8px', color: rarity.color, fontSize: 13, fontFamily: 'Cinzel, serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {rarity.label}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {grouped[r].map(e => {
                const isOwned = owned.has(e.id);
                const isEquipped = equipped === e.id;
                const canAfford = gold >= (e.cost || 0);
                return (
                  <div key={e.id} className="card" style={{
                    padding: 10,
                    border: `1px solid ${isEquipped ? rarity.color : (isOwned ? rarity.color : rarity.border)}`,
                    boxShadow: isEquipped ? `0 0 16px ${rarity.color}55` : (isOwned ? `0 0 8px ${rarity.color}22` : 'none'),
                    background: 'var(--bg2)',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ fontSize: 36, textAlign: 'center', height: 50 }}>{e.glyph}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                    <div style={{ flex: 1 }} />
                    {isEquipped ? (
                      <div style={{ fontSize: 12, color: rarity.color, fontWeight: 700, textAlign: 'center', padding: '6px 0' }}>EQUIPPED</div>
                    ) : isOwned ? (
                      <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '6px' }}
                        disabled={equipping === e.id}
                        onClick={() => onEquip(e)}>
                        {equipping === e.id ? '...' : 'Equip'}
                      </button>
                    ) : (
                      <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '6px', opacity: canAfford ? 1 : 0.55 }}
                        disabled={buying === e.id || !canAfford}
                        onClick={() => onBuy(e)}>
                        {buying === e.id ? '...' : `💰 ${e.cost?.toLocaleString() || '?'}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
      background: active ? 'var(--bg3)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-muted)',
      border: 'none', cursor: 'pointer',
    }}>{children}</button>
  );
}

// Shared grid for both tabs. Groups by rarity and shows owned + buyable
// states identically so the two tabs feel like one shop.
function ShopGrid({ items, ownedIds, buying, onBuy, gold, emptyText, showDropOnly }) {
  const owned = useMemo(() => new Set(ownedIds || []), [ownedIds]);
  const grouped = useMemo(() => {
    const byRarity = {};
    for (const it of items) {
      const r = it.rarity || 'common';
      if (!byRarity[r]) byRarity[r] = [];
      byRarity[r].push(it);
    }
    return byRarity;
  }, [items]);

  if (!items?.length) {
    return <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{emptyText}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {RARITY_ORDER.filter(r => grouped[r]?.length).map(r => {
        const rarity = RARITY[r];
        return (
          <section key={r}>
            <h3 style={{ margin: '4px 2px 8px', color: rarity.color, fontSize: 13, fontFamily: 'Cinzel, serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {rarity.label}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {grouped[r].map(it => {
                const isOwned = owned.has(it.id);
                const isDropOnly = it.dropOnly;
                const canAfford = gold >= (it.cost || 0);
                return (
                  <div key={it.id} className="card" style={{
                    padding: 10,
                    border: `1px solid ${isOwned ? rarity.color : rarity.border}`,
                    boxShadow: isOwned ? `0 0 12px ${rarity.color}33` : 'none',
                    background: isOwned ? `${rarity.border}` : 'var(--bg2)',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ fontSize: 32, textAlign: 'center' }}>{it.emoji || '❔'}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                    {it.magic > 0 && (
                      <div style={{ fontSize: 11, color: '#a78bfa' }}>✨ {it.magic} Magic</div>
                    )}
                    {it.size && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.size.w}×{it.size.h}</div>
                    )}
                    <div style={{ flex: 1 }} />
                    {isOwned ? (
                      <div style={{ fontSize: 12, color: rarity.color, fontWeight: 600, textAlign: 'center', padding: '6px 0' }}>OWNED</div>
                    ) : isDropOnly && showDropOnly ? (
                      <div style={{ fontSize: 11, color: '#f0abfc', textAlign: 'center', padding: '6px 0' }}>
                        Boss drop · {it.dropFrom}
                      </div>
                    ) : (
                      <button className="btn btn-primary"
                        disabled={buying === it.id || !canAfford}
                        style={{
                          width: '100%', fontSize: 12, padding: '6px',
                          opacity: !canAfford ? 0.55 : 1,
                        }}
                        onClick={() => onBuy(it)}>
                        {buying === it.id ? '...' : `💰 ${it.cost?.toLocaleString() || '?'}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
