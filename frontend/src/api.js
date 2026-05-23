const BASE = process.env.REACT_APP_API_URL || '';

const req = async (method, path, body) => {
  const token = localStorage.getItem('hq_token');
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  auth: {
    register: (b) => req('POST', '/auth/register', b),
    login: (b) => req('POST', '/auth/login', b),
    me: () => req('GET', '/auth/me'),
    changeUsername: (b) => req('PATCH', '/auth/username', b),
    changePassword: (b) => req('PATCH', '/auth/password', b),
    warningSeen: () => req('PATCH', '/auth/warning-seen'),
    rebirth: () => req('POST', '/auth/rebirth'),
  },
  admin: {
    listUsers: () => req('GET', '/admin/users'),
    getUser: (id) => req('GET', `/admin/users/${id}`),
    getInventory: (id) => req('GET', `/admin/users/${id}/inventory`),
    updateUser: (id, b) => req('PATCH', `/admin/users/${id}`, b),
    grantItem: (id, itemId) => req('POST', `/admin/users/${id}/items/${itemId}`),
    removeItem: (id, itemId) => req('DELETE', `/admin/users/${id}/items/${itemId}`),
    equip: (id, itemId) => req('POST', `/admin/users/${id}/equip/${itemId}`),
    unequip: (id, slot) => req('DELETE', `/admin/users/${id}/equip/${slot}`),
    suspend: (id, b) => req('POST', `/admin/users/${id}/suspend`, b),
    unsuspend: (id) => req('POST', `/admin/users/${id}/unsuspend`),
    setAdmin: (id, is_admin) => req('POST', `/admin/users/${id}/admin`, { is_admin }),
    listSuggestions: () => req('GET', '/admin/suggestions'),
    updateSuggestion: (id, status) => req('PATCH', `/admin/suggestions/${id}`, { status }),
    deleteSuggestion: (id) => req('DELETE', `/admin/suggestions/${id}`),
    items: () => req('GET', '/admin/items'),
    setPerms: (id, perms) => req('POST', `/admin/users/${id}/perms`, { perms }),
    permsCatalog: () => req('GET', '/admin/perms'),
    logs: (filters = {}) => {
      const qs = Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      return req('GET', `/admin/logs${qs ? '?' + qs : ''}`);
    },
  },
  friends: {
    list: () => req('GET', '/friends'),
    all: (q) => req('GET', `/friends/all${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    pending: () => req('GET', '/friends/pending'),
    search: (q) => req('GET', `/friends/all?q=${encodeURIComponent(q)}`),
    request: (id) => req('POST', `/friends/request/${id}`),
    accept: (id) => req('POST', `/friends/accept/${id}`),
    remove: (id) => req('DELETE', `/friends/${id}`),
  },
  avatar: {
    shop: () => req('GET', '/avatar/shop'),
    buy: (id) => req('POST', `/avatar/shop/buy/${id}`),
    sell: (id) => req('POST', `/avatar/sell/${id}`),
    buyPack: (id) => req('POST', `/avatar/shop/buy-pack/${id}`),
    inventory: () => req('GET', '/avatar/inventory'),
    equip: (id) => req('POST', `/avatar/equip/${id}`),
    unequip: (slot) => req('DELETE', `/avatar/equip/${slot}`),
    use: (id) => req('POST', `/avatar/use/${id}`),
    saveAppearance: (b) => req('POST', '/avatar/appearance', b),
  },
  gifts: {
    send: (b) => req('POST', '/gifts/send', b),
    purchase: (itemId, b) => req('POST', `/gifts/purchase/${itemId}`, b),
    purchasePack: (packId, b) => req('POST', `/gifts/purchase-pack/${packId}`, b),
    history: () => req('GET', '/gifts/history'),
    tradePropose: (b) => req('POST', '/gifts/trade/propose', b),
    tradePending: () => req('GET', '/gifts/trade/pending'),
    tradeAccept: (id) => req('POST', `/gifts/trade/accept/${id}`),
    tradeDecline: (id) => req('POST', `/gifts/trade/decline/${id}`),
  },
  suggestions: {
    list: () => req('GET', '/suggestions'),
    submit: (b) => req('POST', '/suggestions', b),
    vote: (id) => req('POST', `/suggestions/${id}/vote`),
    unvote: (id) => req('DELETE', `/suggestions/${id}/vote`),
  },
  settings: {
    get: () => req('GET', '/settings'),
    save: (b) => req('POST', '/settings', b),
  },
  profile: {
    get: (username) => req('GET', `/profile/${username}`),
    inventory: (username) => req('GET', `/profile/${username}/inventory`),
  },
  achievements: {
    list: () => req('GET', '/achievements'),
    check: () => req('POST', '/achievements/check'),
  },
  stats: {
    get: () => req('GET', '/stats'),
  },
  battles: {
    active:    () => req('GET',  '/battles/active'),
    history:   () => req('GET',  '/battles/history'),
    challenge: (friendId) => req('POST', `/battles/challenge/${friendId}`),
    turn:      (id, attackId) => req('POST', `/battles/${id}/turn`, { attackId }),
    forfeit:   (id) => req('POST', `/battles/${id}/forfeit`),
  },
  dungeon: {
    loadout: () => req('GET', '/dungeon/loadout'),
    saveLoadout: (slots) => req('POST', '/dungeon/loadout', { slots }),
    startRun: () => req('POST', '/dungeon/run'),
    reward: (monsterId) => req('POST', '/dungeon/reward', { monsterId }),
    survivalWave: (wave) => req('GET', `/dungeon/survival/wave/${wave}`),
    survivalReward: (monsterId, wave) => req('POST', '/dungeon/survival/reward', { monsterId, wave }),
    treasure: (tier) => req('POST', '/dungeon/treasure', { tier }),
    buyPotion: (potionId) => req('POST', `/dungeon/buy-potion/${potionId}`),
    attacks: () => req('GET', '/dungeon/attacks'),
    monsters: () => req('GET', '/dungeon/monsters'),
    potions: () => req('GET', '/dungeon/potions'),
    upgradeAttack: (id) => req('POST', `/dungeon/attacks/${id}/upgrade`),
    learnAttack:   (id) => req('POST', `/dungeon/attacks/${id}/learn`),
  },
  party: {
    create:    (b) => req('POST', '/party', b),
    active:    () => req('GET',  '/party/active'),
    invites:   () => req('GET',  '/party/invites'),
    invite:    (partyId, userId) => req('POST', `/party/${partyId}/invite/${userId}`),
    accept:    (partyId) => req('POST', `/party/${partyId}/accept`),
    decline:   (partyId) => req('POST', `/party/${partyId}/decline`),
    leave:     (partyId) => req('POST', `/party/${partyId}/leave`),
    start:     (partyId) => req('POST', `/party/${partyId}/start`),
    turn:      (partyId, attackId) => req('POST', `/party/${partyId}/turn`, { attackId }),
    myLoadout: (partyId) => req('GET',  `/party/${partyId}/my-loadout`),
    state:     (partyId) => req('GET',  `/party/${partyId}`),
  },
};

// Build the WebSocket URL for live party updates. Adapts the REST BASE
// (https://api.x.com or '') into a ws(s) URL the user's JWT can connect to.
export const wsPartyUrl = (token) => {
  const baseRest = BASE || window.location.origin;
  const url = new URL(baseRest);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/party';
  url.searchParams.set('token', token);
  return url.toString();
};
