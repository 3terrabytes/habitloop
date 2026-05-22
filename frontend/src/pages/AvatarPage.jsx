import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PixelCharacter, {
  HAIR_STYLES, BEARD_STYLES, SKIN_TONES, HAIR_COLORS, EYE_COLORS,
} from '../components/PixelCharacter';
import BannerName from '../components/BannerName';

const RARITY_STYLES = {
  common:    { color: '#9ca3af', label: 'Common',    border: '#9ca3af44' },
  rare:      { color: '#3b82f6', label: 'Rare',      border: '#3b82f644' },
  epic:      { color: '#8b5cf6', label: 'Epic',      border: '#8b5cf644' },
  legendary: { color: '#f59e0b', label: 'Legendary', border: '#f59e0b44' },
  mythic:    { color: '#f0abfc', label: 'Mythic',    border: '#f0abfc66' },
};
const RARITY_FALLBACK = { color: '#9ca3af', label: 'Common', border: '#9ca3af44' };
const rarityOf = (item) => (item && RARITY_STYLES[item.rarity]) || RARITY_FALLBACK;

const SLOT_LABELS = { weapon: '🗡️ Weapon', armor: '🛡️ Armor', banner: '🏷️ Banner', badge: '🎖️ Badge', companion: '🐾 Companion', title: '📛 Title' };
const TYPES = ['weapon', 'armor', 'banner', 'badge', 'companion', 'title'];

// Used as section headers when the shop is showing every type at once.
// Ordering here also controls render order in the "All" view.
const SECTION_ORDER = ['weapon', 'armor', 'banner', 'badge', 'companion', 'title', 'consumable'];
const SECTION_LABELS = {
  weapon:     '🗡️ Weapons',
  armor:      '🛡️ Armor',
  banner:     '🏷️ Banners',
  badge:      '🎖️ Badges',
  companion:  '🐾 Companions',
  title:      '📛 Titles',
  consumable: '🧪 Consumables',
};

// Sort order for rarities — used by the shop sort dropdown.
const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

const SORT_OPTIONS = [
  { k: 'default',     label: 'Default' },
  { k: 'price_asc',   label: 'Price: Low → High' },
  { k: 'price_desc',  label: 'Price: High → Low' },
  { k: 'rarity_asc',  label: 'Rarity: Low → High' },
  { k: 'rarity_desc', label: 'Rarity: High → Low' },
  { k: 'magic_desc',  label: 'Magic: High → Low' },
  { k: 'name_asc',    label: 'Name: A → Z' },
];

const RARITY_FILTERS = ['all', 'common', 'rare', 'epic', 'legendary', 'mythic'];

export default function AvatarPage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('avatar');
  const [shopData, setShopData] = useState({ gold: 0, items: [], packs: [], ownedIds: [] });
  const [inventory, setInventory] = useState({ items: [], equipped: {} });
  const [shopFilter, setShopFilter] = useState('all');
  const [shopSort, setShopSort] = useState('default');
  const [shopRarity, setShopRarity] = useState('all');
  const [shopQuery, setShopQuery] = useState('');
  const [hideOwned, setHideOwned] = useState(false);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [buying, setBuying] = useState(null);
  const [buyingPack, setBuyingPack] = useState(null);
  const [equipping, setEquipping] = useState(null);
  const [using, setUsing] = useState(null);
  const [confirmUse, setConfirmUse] = useState(null);
  const [toast, setToast] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  // Gift-from-shop modal state. `target` is { kind: 'item' | 'pack', data }.
  const [giftTarget, setGiftTarget] = useState(null);
  const [friends, setFriends] = useState([]);

  // Preview is only meaningful on Shop/Inventory — clear when leaving those tabs
  // so a Shop preview can't leak into Inventory (the "Equip this" CTA depends on
  // ownership).
  useEffect(() => { setPreviewItem(null); }, [tab]);

  // Equipped state with preview overlay
  const effectiveEquipped = previewItem && previewItem.type !== 'consumable' && previewItem.type !== 'banner'
    ? { ...inventory.equipped, [previewItem.type]: previewItem }
    : inventory.equipped;

  // ── Appearance state (local draft) ─────────────────────────────────────
  const [appearance, setAppearance] = useState({
    skin: '#e8b88a', hair: '#8B4513', eyes: '#2a4a8a',
    hair_style: 0, gender: 0, beard: 0,
  });
  const [savingLook, setSavingLook] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    const [shop, inv, friendList] = await Promise.all([
      api.avatar.shop(),
      api.avatar.inventory(),
      api.friends.list().catch(() => []),
    ]);
    setShopData(shop);
    setInventory(inv);
    setFriends(friendList || []);
    await refreshUser();
  };

  // Gift purchase actions — used by the modal.
  const sendGiftItem = async (item, friendId, message) => {
    try {
      const res = await api.gifts.purchase(item.id, { receiver_id: friendId, message });
      showToast(`🎁 Sent ${item.name}! +${res.xp_gained} XP`);
      setGiftTarget(null);
      await load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const sendGiftPack = async (pack, friendId, message) => {
    try {
      const res = await api.gifts.purchasePack(pack.id, { receiver_id: friendId, message });
      showToast(`🎁 Sent ${pack.name} (${res.grantedIds.length} items)! +${res.xp_gained} XP`);
      setGiftTarget(null);
      await load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  useEffect(() => { load(); }, []);

  // Hydrate appearance once the user is loaded
  useEffect(() => {
    if (!user) return;
    setAppearance({
      skin:       user.avatar_skin       || '#e8b88a',
      hair:       user.avatar_hair       || '#8B4513',
      eyes:       user.avatar_eyes       || '#2a4a8a',
      hair_style: user.avatar_hair_style ?? 0,
      gender:     user.avatar_gender     ?? 0,
      beard:      user.avatar_beard      ?? 0,
    });
  }, [user?.id]);

  const setLook = (k, v) => setAppearance(a => ({ ...a, [k]: v }));

  const saveAppearance = async () => {
    if (savingLook) return;
    setSavingLook(true);
    try {
      await api.avatar.saveAppearance(appearance);
      await refreshUser();
      showToast('Look saved!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingLook(false);
    }
  };

  const buy = async (item) => {
    if (buying) return;
    setBuying(item.id);
    try {
      const res = await api.avatar.buy(item.id);
      setShopData(s => ({ ...s, gold: res.gold, ownedIds: [...s.ownedIds, item.id] }));
      showToast(`Purchased ${item.name}!`);
      await load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBuying(null);
    }
  };

  const buyPack = async (pack) => {
    if (buyingPack) return;
    setBuyingPack(pack.id);
    try {
      const res = await api.avatar.buyPack(pack.id);
      showToast(`Bought ${pack.name} — ${res.grantedIds.length} items unlocked!`);
      await load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBuyingPack(null);
    }
  };

  const equip = async (item) => {
    if (equipping) return;
    setEquipping(item.id);
    try {
      await api.avatar.equip(item.id);
      showToast(`Equipped ${item.name}!`);
      await load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setEquipping(null);
    }
  };

  const unequip = async (slot) => {
    await api.avatar.unequip(slot);
    showToast(`Unequipped ${slot}`);
    await load();
  };

  const [selling, setSelling] = useState(null);
  const sell = async (item) => {
    if (selling) return;
    const refund = Math.max(1, Math.floor((item.cost || 0) * 0.5));
    if (!window.confirm(`Sell ${item.name} for ${refund} gold? This is permanent.`)) return;
    setSelling(item.id);
    try {
      const res = await api.avatar.sell(item.id);
      showToast(`Sold ${item.name} for ${res.refund} gold`);
      await load();
      await refreshUser?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSelling(null);
    }
  };

  const useItem = async (item) => {
    if (using) return;
    setUsing(item.id);
    setConfirmUse(null);
    try {
      const res = await api.avatar.use(item.id);
      const msg = res.xpGained ? `+${res.xpGained} XP!`
        : res.goldGained ? `+${res.goldGained} gold!`
        : res.message || 'Used!';
      showToast(`${item.name}: ${msg}`);
      await load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUsing(null);
    }
  };

  // Build the visible shop list by chaining filters, then sorting.
  // 'pack' is a pseudo-type that hides items entirely (packs render in their
  // own row above the grid). All other type values filter normally.
  const currentGold = user?.gold ?? shopData.gold;
  const ownedSet = new Set(shopData.ownedIds);
  const query = shopQuery.trim().toLowerCase();

  const legendsUnlocked = shopData.legendsUnlocked === true || (user?.level || 1) >= 10;

  const filteredShop = (() => {
    if (shopFilter === 'pack') return [];
    // Legends tab shows only Mythic-rarity items, all categories.
    if (shopFilter === 'legends') {
      if (!legendsUnlocked) return [];
      return shopData.items.filter(i => i.rarity === 'mythic');
    }
    let list = shopData.items;
    // Outside the Legends tab, hide mythic items from the All/Type views so
    // they don't bleed through and need a separate "tab" feel.
    list = list.filter(i => i.rarity !== 'mythic');
    if (shopFilter !== 'all') list = list.filter(i => i.type === shopFilter);
    if (shopRarity !== 'all') list = list.filter(i => i.rarity === shopRarity);
    if (query) list = list.filter(i =>
      (i.name || '').toLowerCase().includes(query) ||
      (i.desc || '').toLowerCase().includes(query) ||
      (i.theme || '').toLowerCase().includes(query)
    );
    if (hideOwned) list = list.filter(i => !ownedSet.has(i.id) || i.type === 'consumable');
    if (affordableOnly) list = list.filter(i => (i.cost || 0) <= currentGold);

    const sorted = [...list];
    switch (shopSort) {
      case 'price_asc':   sorted.sort((a, b) => (a.cost || 0) - (b.cost || 0)); break;
      case 'price_desc':  sorted.sort((a, b) => (b.cost || 0) - (a.cost || 0)); break;
      case 'rarity_asc':  sorted.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0)); break;
      case 'rarity_desc': sorted.sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)); break;
      case 'magic_desc':  sorted.sort((a, b) => (b.magic || 0) - (a.magic || 0)); break;
      case 'name_asc':    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      default: break;
    }
    return sorted;
  })();

  // Packs are shown on the 'all' and 'pack' filters. Hide a pack if every item
  // in it is already owned (nothing left to grant).
  const visiblePacks = (() => {
    if (!['all', 'pack'].includes(shopFilter)) return [];
    let list = (shopData.packs || []).filter(p =>
      (p.items || []).some(id => !ownedSet.has(id))
    );
    if (shopRarity !== 'all') list = list.filter(p => p.rarity === shopRarity);
    if (query) list = list.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.desc || '').toLowerCase().includes(query)
    );
    if (affordableOnly) list = list.filter(p => (p.cost || 0) <= currentGold);
    return list;
  })();

  const totalMagic = Object.values(inventory.equipped)
    .filter(Boolean)
    .reduce((s, i) => s + (i.magic || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32, position: 'relative' }}>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#7f1d1d' : '#064e3b',
          border: `1px solid ${toast.type === 'error' ? '#ef444444' : '#10b98144'}`,
          color: toast.type === 'error' ? '#fca5a5' : '#6ee7b7',
          padding: '10px 20px', borderRadius: 10, fontWeight: 500, fontSize: 14,
          zIndex: 200, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }} className="animate-fade">{toast.msg}</div>
      )}

      {giftTarget && (
        <GiftModal
          target={giftTarget}
          friends={friends}
          onCancel={() => setGiftTarget(null)}
          onConfirm={(friendId, msg) => {
            if (giftTarget.kind === 'item') sendGiftItem(giftTarget.data, friendId, msg);
            else sendGiftPack(giftTarget.data, friendId, msg);
          }}
        />
      )}

      {confirmUse && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300
        }}>
          <div className="card" style={{ padding: 24, maxWidth: 300, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{confirmUse.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{confirmUse.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              This item is one-time use and will be consumed. Are you sure?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmUse(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => useItem(confirmUse)}>Use it</button>
            </div>
          </div>
        </div>
      )}

      {/* Gold display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-end' }}>
        <span style={{ fontSize: 18 }}>💰</span>
        <span style={{ fontFamily: 'Cinzel, serif', color: '#f59e0b', fontWeight: 700, fontSize: 18 }}>{(user?.gold || shopData.gold).toLocaleString()}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>gold</span>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { k: 'avatar',     label: '⚔️ Avatar' },
          { k: 'appearance', label: '🎨 Look' },
          { k: 'shop',       label: '🛒 Shop' },
          { k: 'inventory',  label: '🎒 Bag' },
        ].map(t => (
          <button key={t.k} style={{ ...styles.tab, ...(tab === t.k ? styles.tabActive : {}) }}
            onClick={() => setTab(t.k)}>{t.label}</button>
        ))}
      </div>

      {/* AVATAR TAB */}
      {tab === 'avatar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={styles.characterCard} className="card">
            <div style={styles.charRow}>
              <PixelCharacter
                appearance={user || {}}
                equipped={inventory.equipped}
                size={140}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <BannerName
                    username={user?.username || ''}
                    banner={inventory.equipped.banner}
                    size="lg"
                    cinzel
                  />
                  {inventory.equipped.badge && (
                    <span style={{ fontSize: 20 }} title={inventory.equipped.badge.name}>
                      {inventory.equipped.badge.emoji}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                  Level {user?.level} · {totalMagic > 0 ? `✨ ${totalMagic} Magic Power` : 'No gear equipped'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TYPES.map(slot => {
                    const item = inventory.equipped[slot];
                    return (
                      <div key={slot}
                        title={item ? `${item.name}: ${item.desc || ''}` : SLOT_LABELS[slot]}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12,
                          background: item ? 'var(--bg3)' : 'transparent',
                          border: `1px solid ${item ? RARITY_STYLES[item.rarity]?.border || 'var(--border)' : 'var(--border)'}`,
                          color: item ? RARITY_STYLES[item.rarity]?.color : 'var(--text-muted)',
                          cursor: item ? 'pointer' : 'default'
                        }} onClick={() => item && unequip(slot)}>
                        {item ? `${item.emoji || '🏷️'} ${item.name}` : SLOT_LABELS[slot]}
                        {item && <span style={{ marginLeft: 4, opacity: 0.5 }}>✕</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            Click an equipped item to unequip it. Visit the <strong>Look</strong> tab to change your face, hair, or skin.
          </p>
        </div>
      )}

      {/* APPEARANCE TAB ─ the big new bit */}
      {tab === 'appearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Live preview */}
          <div className="card" style={{ padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at 50% 30%, rgba(99,102,241,0.12), transparent 60%)' }}>
            <PixelCharacter
              appearance={appearance}
              equipped={inventory.equipped}
              size={160}
            />
          </div>

          {/* Gender / build */}
          <Picker title="Build">
            {[{ id: 0, label: 'Masculine' }, { id: 1, label: 'Feminine' }].map(g => (
              <ChipButton key={g.id} active={appearance.gender === g.id} onClick={() => setLook('gender', g.id)}>
                {g.label}
              </ChipButton>
            ))}
          </Picker>

          {/* Skin */}
          <Picker title="Skin">
            {SKIN_TONES.map(c => (
              <SwatchButton key={c} color={c} active={appearance.skin === c} onClick={() => setLook('skin', c)} />
            ))}
          </Picker>

          {/* Hair colour */}
          <Picker title="Hair Colour">
            {HAIR_COLORS.map(c => (
              <SwatchButton key={c} color={c} active={appearance.hair === c} onClick={() => setLook('hair', c)} />
            ))}
          </Picker>

          {/* Hair style */}
          <Picker title="Hair Style">
            {HAIR_STYLES.map(s => (
              <StylePreview
                key={s.id}
                active={appearance.hair_style === s.id}
                onClick={() => setLook('hair_style', s.id)}
                label={s.name}
              >
                <PixelCharacter
                  appearance={{ ...appearance, hair_style: s.id, beard: 0 }}
                  size={56}
                />
              </StylePreview>
            ))}
          </Picker>

          {/* Eyes */}
          <Picker title="Eye Colour">
            {EYE_COLORS.map(c => (
              <SwatchButton key={c} color={c} active={appearance.eyes === c} onClick={() => setLook('eyes', c)} />
            ))}
          </Picker>

          {/* Beard */}
          <Picker title="Beard">
            {BEARD_STYLES.map(b => (
              <StylePreview
                key={b.id}
                active={appearance.beard === b.id}
                onClick={() => setLook('beard', b.id)}
                label={b.name}
              >
                <PixelCharacter
                  appearance={{ ...appearance, beard: b.id }}
                  size={56}
                />
              </StylePreview>
            ))}
          </Picker>

          <button
            className="btn btn-primary"
            style={{ padding: '14px', fontSize: 15 }}
            onClick={saveAppearance}
            disabled={savingLook}
          >
            {savingLook ? 'Saving...' : 'Save Look'}
          </button>
        </div>
      )}

      {/* SHOP TAB */}
      {tab === 'shop' && (
        <div style={styles.splitRow}>
          <aside style={styles.sideCol}>
            <PreviewPanel
              user={user}
              effectiveEquipped={effectiveEquipped}
              previewItem={previewItem}
              owned={previewItem && shopData.ownedIds.includes(previewItem.id)}
              onEquip={equip}
              equipping={equipping}
              vertical
            />
          </aside>
          <div style={styles.gridCol}>
          <div style={styles.filterRow}>
            {['all', 'pack', ...TYPES, 'legends'].map(f => {
              const isLegends = f === 'legends';
              const active = shopFilter === f;
              return (
                <button key={f}
                  style={{
                    ...styles.filterBtn,
                    ...(active ? styles.filterBtnActive : {}),
                    ...(isLegends && !active ? { color: '#f0abfc', borderColor: '#f0abfc66' } : {}),
                    ...(isLegends && active ? { background: '#f0abfc', borderColor: '#f0abfc', color: '#1a0820' } : {}),
                  }}
                  onClick={() => setShopFilter(f)}>
                  {f === 'all' ? 'All'
                    : f === 'pack' ? '🎁 Packs'
                    : f === 'legends' ? '🌟 Legends'
                    : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Rarity filter chips */}
          <div style={{ ...styles.filterRow, marginTop: -6 }}>
            {RARITY_FILTERS.map(r => {
              const active = shopRarity === r;
              const color = r === 'all' ? null : RARITY_STYLES[r]?.color;
              return (
                <button key={r}
                  style={{
                    ...styles.filterBtn,
                    ...(active ? styles.filterBtnActive : {}),
                    ...(active && color ? { background: color, borderColor: color } : {}),
                    ...(!active && color ? { color, borderColor: color + '55' } : {}),
                    fontSize: 12,
                  }}
                  onClick={() => setShopRarity(r)}>
                  {r === 'all' ? 'Any rarity' : RARITY_STYLES[r]?.label || r}
                </button>
              );
            })}
          </div>

          {/* Sort + search + toggles */}
          <div style={styles.controlsRow}>
            <input
              type="text"
              value={shopQuery}
              onChange={e => setShopQuery(e.target.value)}
              placeholder="Search items…"
              style={styles.searchInput}
            />
            <select
              value={shopSort}
              onChange={e => setShopSort(e.target.value)}
              style={styles.sortSelect}
            >
              {SORT_OPTIONS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
            </select>
            <ToggleChip active={hideOwned}      onClick={() => setHideOwned(v => !v)}>Hide owned</ToggleChip>
            <ToggleChip active={affordableOnly} onClick={() => setAffordableOnly(v => !v)}>Affordable</ToggleChip>
          </div>

          {/* Packs row */}
          {visiblePacks.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={styles.sectionHeader}>
                <span>🎁 Bundles</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                  Save gold vs buying individually
                </span>
              </div>
              <div style={styles.grid}>
                {visiblePacks.map(pack => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    ownedSet={ownedSet}
                    canAfford={(pack.cost || 0) <= currentGold}
                    buying={buyingPack === pack.id}
                    onBuy={() => buyPack(pack)}
                    onGift={() => setGiftTarget({ kind: 'pack', data: pack })}
                  />
                ))}
              </div>
            </div>
          )}

          {(() => {
            // Renders a single shop-item card. Used in both flat and sectioned layouts.
            const renderItem = (item) => {
              const owned = shopData.ownedIds.includes(item.id);
              const canAfford = (user?.gold || shopData.gold) >= item.cost;
              const r = rarityOf(item);
              const isPreviewing = previewItem?.id === item.id;
              const previewable = item.type !== 'consumable';
              return (
                <div key={item.id}
                  onClick={previewable ? () => setPreviewItem(isPreviewing ? null : item) : undefined}
                  style={{
                    ...styles.shopCard,
                    border: `1px solid ${isPreviewing ? r.color : r.border}`,
                    boxShadow: isPreviewing ? `0 0 12px ${r.color}66` : 'none',
                    opacity: owned && item.type !== 'consumable' ? 0.6 : 1,
                    cursor: previewable ? 'pointer' : 'default',
                  }}>
                  {item.type === 'banner' ? (
                    <div style={{ width: '100%', height: 48, borderRadius: 8, background: item.color, marginBottom: 8 }} />
                  ) : (
                    <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>{item.emoji}</div>
                  )}
                  <div style={{ fontSize: 12, color: r.color, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8, flex: 1 }}>{item.desc}</div>
                  {item.magic > 0 && (
                    <div style={{ fontSize: 11, color: '#a78bfa', marginBottom: 6 }}>✨ {item.magic} Magic</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>💰 {item.cost}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        title="Buy and send to a friend"
                        style={{
                          padding: '6px 8px', fontSize: 12, borderRadius: 6,
                          background: 'transparent', border: '1px solid var(--border)',
                          color: canAfford ? '#f472b6' : 'var(--text-muted)',
                          cursor: 'pointer', opacity: canAfford ? 1 : 0.4,
                        }}
                        disabled={!canAfford}
                        onClick={(e) => { e.stopPropagation(); setGiftTarget({ kind: 'item', data: item }); }}
                      >
                        🎁
                      </button>
                      {owned && item.type !== 'consumable' ? (
                        <span style={{ fontSize: 12, color: 'var(--green)', padding: '6px 4px' }}>✓ Owned</span>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: 12, opacity: canAfford ? 1 : 0.4 }}
                          disabled={!canAfford || buying === item.id}
                          onClick={(e) => { e.stopPropagation(); buy(item); }}
                        >
                          {buying === item.id ? '...' : 'Buy'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            // Special locked state for the Legends tab if user is under L10.
            if (shopFilter === 'legends' && !legendsUnlocked) {
              const lvl = user?.level || 1;
              return (
                <div style={{
                  textAlign: 'center', padding: '48px 24px',
                  background: 'radial-gradient(circle at 50% 0%, rgba(240,171,252,0.18) 0%, transparent 60%), var(--bg2)',
                  border: '1px solid #f0abfc44', borderRadius: 12,
                }}>
                  <div style={{ fontSize: 64, marginBottom: 8 }}>🔒</div>
                  <div style={{ fontFamily: 'Cinzel,serif', fontSize: 22, color: '#f0abfc', marginBottom: 4 }}>The Legends Shop</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14, maxWidth: 360, margin: '0 auto 14px' }}>
                    A vault of Mythic items, beyond Legendary. Costs 2200-4000 gold each.
                    Unlocks when you reach <strong style={{ color: '#f0abfc' }}>Level 10</strong>.
                  </p>
                  <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 99, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>You are </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f0abfc' }}>Level {lvl}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}> · {10 - lvl} levels to go</span>
                  </div>
                </div>
              );
            }

            if (filteredShop.length === 0 && shopFilter !== 'pack') {
              return (
                <div style={styles.empty}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No items match those filters.</p>
                </div>
              );
            }

            // Legends tab gets a banner above the grid to set the mood.
            if (shopFilter === 'legends') {
              return (
                <>
                  <div style={{
                    padding: '14px 16px', marginBottom: 14, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(240,171,252,0.18), rgba(124,58,237,0.12))',
                    border: '1px solid #f0abfc55', textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'Cinzel,serif', fontSize: 18, color: '#f0abfc', marginBottom: 2 }}>
                      🌟 The Legends Shop
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Mythic-tier items — beyond Legendary. Limited stock for those who've proven themselves.
                    </div>
                  </div>
                  <div style={styles.grid}>{filteredShop.map(renderItem)}</div>
                </>
              );
            }

            // For the 'all' view, group items by type so the shop feels organised
            // instead of a flat wall. For specific filters, just render one grid.
            if (shopFilter === 'all') {
              const groups = {};
              for (const item of filteredShop) {
                (groups[item.type] = groups[item.type] || []).push(item);
              }
              return SECTION_ORDER.filter(t => groups[t]?.length).map(type => (
                <div key={type} style={{ marginBottom: 22 }}>
                  <div style={styles.sectionHeader}>
                    <span>{SECTION_LABELS[type]}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {groups[type].length} items
                    </span>
                  </div>
                  <div style={styles.grid}>{groups[type].map(renderItem)}</div>
                </div>
              ));
            }

            return <div style={styles.grid}>{filteredShop.map(renderItem)}</div>;
          })()}
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {tab === 'inventory' && (
        <div style={styles.splitRow}>
          <aside style={styles.sideCol}>
            <PreviewPanel
              user={user}
              effectiveEquipped={effectiveEquipped}
              previewItem={previewItem}
              owned={true} /* everything in inventory is owned */
              onEquip={equip}
              equipping={equipping}
              vertical
            />
          </aside>
          <div style={styles.gridCol}>
          {inventory.items.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎒</div>
              <p style={{ color: 'var(--text-muted)' }}>Your inventory is empty. Visit the Shop!</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {inventory.items.map(item => {
                const isEquipped = Object.values(inventory.equipped).some(e => e?.id === item.id);
                const r = rarityOf(item);
                const isPreviewing = previewItem?.id === item.id;
                const previewable = item.type !== 'consumable';
                return (
                  <div key={item.id}
                    onClick={previewable ? () => setPreviewItem(isPreviewing ? null : item) : undefined}
                    style={{
                      ...styles.shopCard,
                      border: `1px solid ${isPreviewing ? r.color : isEquipped ? r.color : r.border}`,
                      boxShadow: isPreviewing ? `0 0 12px ${r.color}66` : 'none',
                      background: isEquipped && !isPreviewing ? `${r.border}` : 'var(--bg2)',
                      cursor: previewable ? 'pointer' : 'default',
                    }}>
                    {item.type === 'banner' ? (
                      <div style={{ width: '100%', height: 48, borderRadius: 8, background: item.color, marginBottom: 8 }} />
                    ) : (
                      <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>{item.emoji}</div>
                    )}
                    <div style={{ fontSize: 12, color: r.color, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                    {item.magic > 0 && (
                      <div style={{ fontSize: 11, color: '#a78bfa', marginBottom: 6 }}>✨ {item.magic} Magic</div>
                    )}
                    <div style={{ flex: 1 }} />
                    {item.type === 'consumable' ? (
                      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                        <button className="btn btn-primary" style={{ flex: 1, fontSize: 12, padding: '6px', background: '#b45309', borderColor: '#b45309' }}
                          disabled={using === item.id}
                          onClick={(e) => { e.stopPropagation(); setConfirmUse(item); }}>
                          {using === item.id ? '...' : '⚡ Use'}
                        </button>
                        {!item.unlockReward && (
                          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 8px', color: 'var(--gold)' }}
                            title={`Sell for ${Math.max(1, Math.floor((item.cost || 0) * 0.5))} gold`}
                            disabled={selling === item.id}
                            onClick={(e) => { e.stopPropagation(); sell(item); }}>
                            {selling === item.id ? '...' : '🪙'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                        {isEquipped ? (
                          <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: '6px' }}
                            onClick={(e) => { e.stopPropagation(); unequip(item.type); }}>Unequip</button>
                        ) : (
                          <button className="btn btn-primary" style={{ flex: 1, fontSize: 12, padding: '6px' }}
                            disabled={equipping === item.id}
                            onClick={(e) => { e.stopPropagation(); equip(item); }}>
                            {equipping === item.id ? '...' : 'Equip'}
                          </button>
                        )}
                        {!item.unlockReward && (
                          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 8px', color: 'var(--gold)' }}
                            title={`Sell for ${Math.max(1, Math.floor((item.cost || 0) * 0.5))} gold`}
                            disabled={selling === item.id || isEquipped}
                            onClick={(e) => { e.stopPropagation(); sell(item); }}>
                            {selling === item.id ? '...' : '🪙'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Avatar preview panel (Shop & Inventory tabs) ─────────────────────────
// When `vertical` is true, the avatar stacks on top of the item info (used in
// the new side column). When false, the avatar sits next to the info (legacy).
function PreviewPanel({ user, effectiveEquipped, previewItem, owned, onEquip, equipping, vertical = false }) {
  const isBanner = previewItem?.type === 'banner';
  const r = previewItem ? rarityOf(previewItem) : null;
  // For banner previews we want the *previewed* banner behind the username,
  // not the currently-equipped one — gives a real "what would this look like".
  const usernameBanner = isBanner ? previewItem : effectiveEquipped?.banner;

  const avatarSize = vertical ? 140 : 100;

  return (
    <div className="card animate-fade" style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      gap: vertical ? 12 : 16,
      alignItems: 'center',
      padding: 16,
      marginBottom: vertical ? 0 : 16,
      borderColor: previewItem ? r.color + '88' : 'var(--border)',
    }}>
      <PixelCharacter
        appearance={user || {}}
        equipped={effectiveEquipped}
        size={avatarSize}
      />
      <div style={{ flex: 1, minWidth: 0, textAlign: vertical ? 'center' : 'left', width: vertical ? '100%' : 'auto' }}>
        <div style={{ marginBottom: 6 }}>
          <BannerName
            username={user?.username || ''}
            banner={usernameBanner}
            size={vertical ? 'md' : 'md'}
            cinzel
          />
        </div>
        {previewItem ? (
          <>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
              PREVIEWING
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              {!isBanner && <span style={{ marginRight: 6 }}>{previewItem.emoji}</span>}
              {previewItem.name}
            </div>
            <div style={{ fontSize: 12, color: r.color, marginBottom: 8 }}>
              {r.label}{previewItem.magic > 0 ? ` · ✨ ${previewItem.magic} Magic` : ''}
            </div>
            {owned ? (
              <button
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: 13 }}
                disabled={equipping === previewItem.id}
                onClick={() => onEquip(previewItem)}
              >
                {equipping === previewItem.id ? '...' : 'Equip this'}
              </button>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Buy it to equip.</div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Tap any item to try it on.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tiny UI atoms used by Appearance ─────────────────────────────────────
function Picker({ title, children }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  );
}

function SwatchButton({ color, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: 38, height: 38, borderRadius: 10, padding: 0, cursor: 'pointer',
      background: color, border: `3px solid ${active ? 'var(--accent2, #a5b4fc)' : 'var(--border)'}`,
      boxShadow: active ? '0 0 12px rgba(165,180,252,0.5)' : 'none',
      transform: active ? 'scale(1.08)' : 'scale(1)', transition: 'all 0.15s',
    }} />
  );
}

function ChipButton({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 99,
      background: active ? 'var(--accent)' : 'var(--bg3)',
      color: active ? 'white' : 'var(--text-muted)',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
    }}>{children}</button>
  );
}

// Small pill button used in the shop controls row.
function ToggleChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 99,
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'white' : 'var(--text-muted)',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

// Pack / bundle card — shown in the shop's "Bundles" row.
function PackCard({ pack, ownedSet, canAfford, buying, onBuy, onGift }) {
  const r = RARITY_STYLES[pack.rarity] || RARITY_FALLBACK;
  const partialOwned = (pack.items || []).some(id => ownedSet.has(id));
  const itemCount = (pack.items || []).length;
  return (
    <div style={{
      ...styles.shopCard,
      border: `1px solid ${r.color}88`,
      boxShadow: `0 0 14px ${r.color}22`,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 8, right: 8,
        background: '#16a34a', color: 'white',
        fontSize: 10, fontWeight: 700, padding: '3px 8px',
        borderRadius: 99, letterSpacing: '0.04em',
      }}>
        -{pack.discount}%
      </div>
      <div style={{
        width: '100%', height: 56, borderRadius: 8,
        background: pack.color || `linear-gradient(135deg, ${r.color}, ${r.color}66)`,
        marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30,
      }}>
        {pack.emoji}
      </div>
      <div style={{ fontSize: 12, color: r.color, fontWeight: 600, marginBottom: 2 }}>
        BUNDLE · {r.label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{pack.name}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6, flex: 1 }}>{pack.desc}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
        {itemCount} items · was 💰 <s style={{ opacity: 0.6 }}>{pack.fullCost}</s>
      </div>
      {partialOwned && (
        <div style={{
          fontSize: 10, color: '#fbbf24', marginBottom: 6,
          padding: '4px 6px', background: '#78350f33', borderRadius: 6,
        }}>
          ⚠ You own some of these — buy the rest individually.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>💰 {pack.cost}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            title="Buy and send to a friend"
            style={{
              padding: '6px 8px', fontSize: 12, borderRadius: 6,
              background: 'transparent', border: '1px solid var(--border)',
              color: canAfford ? '#f472b6' : 'var(--text-muted)',
              cursor: 'pointer',
              opacity: canAfford ? 1 : 0.4,
            }}
            disabled={!canAfford}
            onClick={onGift}
          >
            🎁
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: 12, opacity: canAfford && !partialOwned ? 1 : 0.4 }}
            disabled={!canAfford || partialOwned || buying}
            onClick={onBuy}
          >
            {buying ? '...' : 'Buy bundle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pick-a-friend modal triggered by the 🎁 button on shop items or packs.
// `target` is { kind: 'item' | 'pack', data }.
function GiftModal({ target, friends, onCancel, onConfirm }) {
  const [friendId, setFriendId] = useState(friends[0]?.id || null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isPack = target.kind === 'pack';
  const subject = target.data;
  const r = RARITY_STYLES[subject.rarity] || RARITY_FALLBACK;

  const submit = async () => {
    if (!friendId) return;
    setSending(true);
    try { await onConfirm(friendId, message); }
    finally { setSending(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20,
    }}>
      <div className="card animate-fade" style={{
        maxWidth: 420, width: '100%', padding: 22, borderColor: '#f472b666',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>🎁</div>
          <h3 style={{ fontFamily: 'Cinzel,serif', fontSize: 18, marginBottom: 2 }}>
            Send {isPack ? 'Bundle' : 'Gift'}
          </h3>
          <div style={{ fontSize: 13, color: r.color, fontWeight: 600 }}>
            {isPack ? subject.emoji : subject.emoji} {subject.name}
          </div>
          {isPack && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {(subject.items || []).length} items
            </div>
          )}
          <div style={{ color: '#f59e0b', fontWeight: 700, marginTop: 6 }}>💰 {subject.cost} gold</div>
        </div>

        {friends.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            You have no friends to gift to yet. Add some from the Friends tab!
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>
                RECIPIENT
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6,
                maxHeight: 200, overflowY: 'auto',
              }}>
                {friends.map(f => {
                  const active = friendId === f.id;
                  return (
                    <button key={f.id} onClick={() => setFriendId(f.id)} style={{
                      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                      background: active ? 'rgba(244,114,182,0.15)' : 'var(--bg3)',
                      border: `1px solid ${active ? '#f472b6' : 'var(--border)'}`,
                      color: 'var(--text)', textAlign: 'left', fontSize: 12,
                    }}>
                      <div style={{ fontWeight: 600 }}>{f.username}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Lv. {f.level}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>
                MESSAGE (optional)
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="A short note…"
                maxLength={200}
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}
            style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
          <button
            onClick={submit}
            disabled={!friendId || sending || friends.length === 0}
            className="btn btn-primary"
            style={{
              padding: '8px 18px', fontSize: 13,
              background: '#be185d', borderColor: '#f472b6',
              opacity: (!friendId || sending) ? 0.5 : 1,
            }}
          >
            {sending ? 'Sending…' : `🎁 Send · 💰 ${subject.cost}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function StylePreview({ children, label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: 72, padding: '6px 4px', borderRadius: 10,
      background: active ? 'rgba(99,102,241,0.18)' : 'var(--bg3)',
      border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      transition: 'all 0.15s',
    }}>
      <div style={{ overflow: 'hidden', height: 56 }}>{children}</div>
      <span style={{ fontSize: 10, color: active ? 'var(--accent2)' : 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
    </button>
  );
}

const styles = {
  splitRow: {
    display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap',
  },
  sideCol: {
    flex: '1 1 220px', minWidth: 220, maxWidth: 280,
    position: 'sticky', top: 74, alignSelf: 'flex-start',
  },
  gridCol: {
    flex: '3 1 320px', minWidth: 280,
  },
  tabs: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    background: 'var(--bg2)', borderRadius: 10, padding: 4,
    border: '1px solid var(--border)', gap: 2,
  },
  tab: {
    padding: '10px 4px', border: 'none', background: 'transparent',
    color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, borderRadius: 7, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: { background: 'var(--bg3)', color: 'var(--text)' },
  characterCard: { padding: 24 },
  charRow: { display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: {
    padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer'
  },
  filterBtnActive: { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12
  },
  shopCard: {
    background: 'var(--bg2)', borderRadius: 12, padding: 14,
    display: 'flex', flexDirection: 'column', transition: 'transform 0.15s ease'
  },
  empty: { textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' },
  controlsRow: {
    display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16,
  },
  searchInput: {
    flex: '1 1 160px', minWidth: 140,
    padding: '8px 12px', borderRadius: 8,
    background: 'var(--bg2)', color: 'var(--text)',
    border: '1px solid var(--border)', fontSize: 13, outline: 'none',
  },
  sortSelect: {
    padding: '8px 12px', borderRadius: 8,
    background: 'var(--bg2)', color: 'var(--text)',
    border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: 10,
    fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 15,
    color: 'var(--text)',
  },
};
