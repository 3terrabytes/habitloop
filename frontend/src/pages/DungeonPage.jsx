import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PixelCharacter from '../components/PixelCharacter';

// ── Tuning constants ──────────────────────────────────────────────────
// Player max HP scales with level: 100 + 20 per level.
const playerMaxHp = (level) => 100 + 20 * (level || 1);

// Player attack damage = leveled power + magic, with light random variance.
// `attack.leveledPower` comes from the backend (level-1 attacks set it to
// equal `attack.power`). `attack.power` is the fallback if the field is missing.
const rollDamage = (attack, magic, multiplier = 1) => {
  const power = (attack.leveledPower ?? attack.power ?? 0);
  const base  = power + (magic || 0) * 0.5;
  if (!base) return { dmg: 0, crit: false };
  const variance = 0.85 + Math.random() * 0.3;
  const crit = Math.random() < 0.12;
  return { dmg: Math.round(base * variance * (crit ? 2 : 1) * multiplier), crit };
};

// Armor now scales as a percentage with a cap, instead of a flat subtraction.
// Old formula let high-tier armor mitigate boss attacks to ~10 damage. New
// formula: armor reduces damage taken by a fraction that caps at 35%.
//   armor 30  =>  20% reduction
//   armor 65  =>  30% reduction
//   armor 100 =>  35% reduction (cap)
const monsterDamage = (monster, armor, defenseMult = 1) => {
  const variance = 0.9 + Math.random() * 0.2;
  const raw = (monster.power || 0) * variance;
  const reduction = Math.min(0.35, (armor || 0) / ((armor || 0) + 150));
  const mitigated = Math.max(1, raw * (1 - reduction) * defenseMult);
  return Math.round(mitigated);
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PLAYER_ANIM = {
  dash: 'battle-player-dash',
  slash: 'battle-player-dash',
  heavy: 'battle-player-heavy',
  spin: 'battle-player-spin',
  parry: 'battle-player-dash',
  missile: 'battle-player-cast',
  fire: 'battle-player-cast',
  frost: 'battle-player-cast',
  arrow: 'battle-player-cast',
  volley: 'battle-player-cast',
  lightning: 'battle-player-cast',
  shockwave: 'battle-player-heavy',
  poison: 'battle-player-cast',
  shadow: 'battle-player-cast',
  guard: 'battle-player-guard',
  heal: 'battle-player-heal',
};

const PROJECTILE = {
  missile: { emoji: '✨', color: '#a78bfa' },
  fire:    { emoji: '🔥', color: '#fb923c' },
  frost:   { emoji: '❄️', color: '#67e8f9' },
  arrow:   { emoji: '🏹', color: '#fde047' },
  volley:  { emoji: '🌧️', color: '#a5f3fc' },
  lightning:{ emoji: '⚡', color: '#fde047' },
  poison:  { emoji: '☠️', color: '#86efac' },
  shadow:  { emoji: '🌑', color: '#c4b5fd' },
  shockwave:{ emoji: '💥', color: '#fcd34d' },
};

// Map node visuals
const NODE_META = {
  start:    { icon: '🚪', label: 'Start',     color: '#94a3b8' },
  battle:   { icon: '⚔️', label: 'Battle',    color: '#ef4444' },
  elite:    { icon: '🔥', label: 'Elite',     color: '#fb923c' },
  shop:     { icon: '🛒', label: 'Shop',      color: '#22c55e' },
  rest:     { icon: '⛲', label: 'Rest Site', color: '#60a5fa' },
  treasure: { icon: '💎', label: 'Treasure',  color: '#fbbf24' },
  boss:     { icon: '👑', label: 'BOSS',      color: '#fde047' },
};

export default function DungeonPage() {
  const { user, refreshUser } = useAuth();
  const [loadout, setLoadout] = useState(null);
  const [inventory, setInventory] = useState({ equipped: {} });

  // Run state
  const [map, setMap] = useState(null);          // { nodes, edges }
  const [phase, setPhase] = useState('idle');    // idle | map | battle | shop | rest | treasure | rewarded | dead | cleared
  const [position, setPosition] = useState(null);// last cleared node id
  const [cleared, setCleared] = useState(new Set());
  const [activeNode, setActiveNode] = useState(null);
  // Survival mode: when active, we ignore the map and just keep spawning
  // single-monster waves until the player dies.
  const [survivalWave, setSurvivalWave] = useState(0);
  const [survivalActive, setSurvivalActive] = useState(false);
  const [hp, setHp] = useState(0);
  const [maxHp, setMaxHp] = useState(0);

  // Battle state
  const [monsterHp, setMonsterHp] = useState(0);
  const [cooldowns, setCooldowns] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [guarding, setGuarding] = useState(false);
  const [strengthBuff, setStrengthBuff] = useState(null); // potion-applied damage mult
  const [defenseBuff, setDefenseBuff] = useState(null);   // potion-applied defense mult
  const [luckyCharm, setLuckyCharm] = useState(false);    // bonus gold on next treasure

  // Status effects on the monster: { burn: turnsRemaining, poison: turnsRemaining, stun: turnsRemaining }
  const [statuses, setStatuses] = useState({});
  // Monster's next move — telegraphed Slay-the-Spire style so the player can plan.
  const [intent, setIntent] = useState(null);  // { kind, power, label, icon }
  const [turnCount, setTurnCount] = useState(0);
  const [petAnim, setPetAnim] = useState('');

  // Inventory
  const [potions, setPotions] = useState([]);    // [{id, name, emoji, ...}, ...]
  const [shopOffer, setShopOffer] = useState([]); // potions offered in current shop
  const [shopPotionCatalog, setShopPotionCatalog] = useState([]);

  // Misc
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [editingLoadout, setEditingLoadout] = useState(false);

  // Visual effect state
  const [playerAnim, setPlayerAnim] = useState('');
  const [monsterAnim, setMonsterAnim] = useState('');
  const [projectile, setProjectile] = useState(null);
  const [damages, setDamages] = useState([]);
  const [encounter, setEncounter] = useState(null);
  const [banner, setBanner] = useState(null);
  const [stageShake, setStageShake] = useState(false);
  const [lootDrop, setLootDrop] = useState(null);
  const [rewardCount, setRewardCount] = useState({ xp: 0, gold: 0 });

  const addLog = (line) => setLog(l => [...l.slice(-9), line]);
  const popDamage = (target, value, opts = {}) => {
    const id = Date.now() + Math.random();
    setDamages(d => [...d, { id, target, value, ...opts }]);
    setTimeout(() => setDamages(d => d.filter(x => x.id !== id)), 1100);
  };
  const flashBanner = (text, color, ms = 900) => {
    setBanner({ text, color });
    setTimeout(() => setBanner(null), ms);
  };
  const shake = (ms = 450) => {
    setStageShake(true);
    setTimeout(() => setStageShake(false), ms);
  };
  const countUpReward = (xp, gold) => {
    const steps = 22, dur = 800;
    let i = 0;
    const tick = setInterval(() => {
      i++;
      const t = Math.min(1, i / steps);
      const eased = 1 - Math.pow(1 - t, 3);
      setRewardCount({ xp: Math.round(xp * eased), gold: Math.round(gold * eased) });
      if (t >= 1) clearInterval(tick);
    }, dur / steps);
  };

  const loadAll = useCallback(async () => {
    const [lo, inv, pots] = await Promise.all([
      api.dungeon.loadout(),
      api.avatar.inventory().catch(() => ({ equipped: {} })),
      api.dungeon.potions().catch(() => []),
    ]);
    setLoadout(lo);
    setInventory(inv);
    setShopPotionCatalog(pots);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (user) setMaxHp(playerMaxHp(user.level));
  }, [user]);

  // ── Run lifecycle ────────────────────────────────────────────────
  const startRun = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await api.dungeon.startRun();
      const mx = playerMaxHp(user.level);
      setMap(data.map);
      setHp(mx);
      setMaxHp(mx);
      setPosition(data.map.nodes.find(n => n.type === 'start').id);
      setCleared(new Set([data.map.nodes.find(n => n.type === 'start').id]));
      setPotions([]);
      setLog([]);
      setPhase('map');
      addLog('🚪 You step into the catacombs.');
    } catch (err) {
      addLog('⚠ ' + err.message);
    }
    setBusy(false);
  };

  // Survival run — kicks off an endless gauntlet. Each victory advances
  // the wave counter; defeat is permanent for that run.
  const startSurvival = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Reset every combat-relevant state so leftovers from a previous run
      // (HP, monster HP, intent, statuses, turn count, log, potions) don't
      // bleed into wave 1. This was the source of the "clicking is buggy"
      // bug — the battle screen would render with stale monsterHp etc.
      const mx = playerMaxHp(user?.level);
      const { monster } = await api.dungeon.survivalWave(1);
      if (!monster) { addLog('⚠ No monster returned for wave 1.'); setBusy(false); return; }

      setHp(mx);
      setMaxHp(mx);
      setMonsterHp(monster.hp);
      setStatuses({});
      setTurnCount(0);
      setIntent(computeIntent(monster, 0));
      setStrengthBuff(null);
      setDefenseBuff(null);
      setGuarding(false);
      setLog([]);
      setPotions([]);
      setSurvivalActive(true);
      setSurvivalWave(1);
      setActiveNode({ id: 'survival-1', type: 'battle', monster, floor: 1, wave: 1 });
      setPhase('battle');
      addLog('♾️ Survival mode begins. Wave 1.');
      await showEncounter(monster);
      addLog(`${monster.sprite} ${monster.name}. ${monster.taunt}`);
    } catch (err) { addLog('⚠ ' + err.message); setBusy(false); return; }
    setBusy(false);
  };

  const advanceSurvivalWave = async () => {
    if (busy) return;
    setBusy(true);
    const nextWave = survivalWave + 1;
    try {
      const { monster } = await api.dungeon.survivalWave(nextWave);
      setSurvivalWave(nextWave);
      setMonsterHp(monster.hp);
      setActiveNode({ id: `survival-${nextWave}`, type: 'battle', monster, floor: Math.min(5, Math.floor(nextWave / 4) + 1), wave: nextWave });
      setStatuses({});
      setTurnCount(0);
      setIntent(computeIntent(monster, 0));
      setPhase('battle');
      addLog(`🌊 Wave ${nextWave} approaches.`);
      await showEncounter(monster);
      addLog(`${monster.sprite} ${monster.name}.`);
    } catch (err) { addLog('⚠ ' + err.message); }
    setBusy(false);
  };

  const exitRun = () => {
    setMap(null);
    setPhase('idle');
    setActiveNode(null);
    setSurvivalActive(false);
    setSurvivalWave(0);
    setPosition(null);
    setCleared(new Set());
    setPotions([]);
    setShopOffer([]);
    setStrengthBuff(null);
    setDefenseBuff(null);
    setLuckyCharm(false);
  };

  const enterNode = (node) => {
    setActiveNode(node);
    setRewardCount({ xp: 0, gold: 0 });
    if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
      enterBattle(node);
    } else if (node.type === 'shop') {
      enterShop();
    } else if (node.type === 'rest') {
      setPhase('rest');
      addLog('⛲ You find a quiet spring to rest at.');
    } else if (node.type === 'treasure') {
      claimTreasure(node);
    }
  };

  // Pet damage scaling — equipped companion adds free damage every turn.
  // Tuned so a Mini Dragon hits harder than a Dungeon Cat without trivialising
  // boss fights. Mythic is its own tier above legendary.
  const PET_DMG = { common: 9, rare: 18, epic: 30, legendary: 48, mythic: 75 };
  const petBaseDamage = () => {
    const pet = inventory && inventory.equipped && inventory.equipped.companion;
    if (!pet) return 0;
    return PET_DMG[pet.rarity] || 4;
  };

  // Pick the next monster intent. Pattern: heavy every 3rd turn, defend
  // every 4th turn (mid+ tiers), otherwise basic strike.
  const computeIntent = (monster, t) => {
    if (t > 0 && t % 3 === 0) {
      return { kind: 'heavy', power: Math.round(monster.power * 1.6),
        label: `${Math.round(monster.power * 1.6)}`, icon: '💥', tone: '#f97316' };
    }
    if (monster && monster.tier >= 3 && t > 0 && t % 4 === 0) {
      return { kind: 'defend', power: 0, label: 'Defend', icon: '🛡', tone: '#60a5fa' };
    }
    return { kind: 'strike', power: monster.power, label: `${monster.power}`, icon: '⚔️', tone: '#fca5a5' };
  };

  const enterBattle = async (node) => {
    if (!node || !node.monster) {
      addLog('⚠ Missing monster — returning to map.');
      setPhase('map');
      return;
    }
    setMonsterHp(node.monster.hp);
    setCooldowns({ 0: 0, 1: 0, 2: 0, 3: 0 });
    setStatuses({});
    setTurnCount(0);
    setIntent(computeIntent(node.monster, 0));
    addLog(`🚪 You enter a chamber.`);
    setPhase('battle');
    await showEncounter(node.monster);
    addLog(`${node.monster.sprite} ${node.monster.name}. ${node.monster.taunt}`);
  };

  const showEncounter = async (monster) => {
    setEncounter(monster);
    await sleep(1400);
    setEncounter(null);
    flashBanner('FIGHT!', '#fca5a5', 700);
    await sleep(600);
  };

  const enterShop = () => {
    // Randomly pick 3 of the catalog for this shop.
    const pool = [...shopPotionCatalog];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setShopOffer(pool.slice(0, 3));
    setPhase('shop');
    addLog('🛒 A wandering merchant beckons you to their stall.');
  };

  const claimTreasure = async (node) => {
    setPhase('treasure');
    try {
      const tier = Math.max(1, Math.floor((node.floor || 1) / 1.5));
      const res = await api.dungeon.treasure(tier);
      let gold = res.gold;
      if (luckyCharm) {
        gold = Math.round(gold * 1.5);
        setLuckyCharm(false);
        addLog(`🍀 Lucky Charm boosts your treasure!`);
      }
      countUpReward(0, gold);
      addLog(`💎 You found ${gold} gold!`);
      await refreshUser();
    } catch (err) {
      addLog('⚠ ' + err.message);
    }
  };

  const completeRoom = () => {
    if (!activeNode) return;
    const newCleared = new Set(cleared);
    newCleared.add(activeNode.id);
    setCleared(newCleared);
    setPosition(activeNode.id);

    // Boss = clear the run
    if (activeNode.type === 'boss') {
      flashBanner('DUNGEON CLEARED', '#fde047', 1600);
      setPhase('cleared');
      return;
    }

    setActiveNode(null);
    setPhase('map');
    setStrengthBuff(null);
    setDefenseBuff(null);
  };

  // ── Combat ───────────────────────────────────────────────────────
  const useAttack = async (slotIdx) => {
    if (phase !== 'battle' || busy) return;
    if (!loadout || !loadout.slotDetails) return;
    const cd = cooldowns ? (cooldowns[slotIdx] || 0) : 0;
    if (cd > 0) return;
    const attack = loadout.slotDetails[slotIdx];
    if (!attack) return;
    const monster = activeNode && activeNode.monster;
    if (!monster) return;

    setBusy(true);

    const anim = PLAYER_ANIM[attack.animation] || 'battle-player-dash';
    setPlayerAnim(anim);

    const projConfig = PROJECTILE[attack.animation];
    if (projConfig) {
      await sleep(150);
      setProjectile({ ...projConfig, id: Date.now() });
      setTimeout(() => setProjectile(null), 600);
    }

    await sleep(350);

    let newMonsterHp = monsterHp;
    if (attack.tag === 'heal') {
      const heal = (attack.leveledHeal ?? attack.heal ?? 30);
      setHp(prev => Math.min(maxHp, prev + heal));
      popDamage('player', heal, { heal: true });
      addLog(`💚 ${attack.name}: restored ${heal} HP.`);
      setPlayerAnim('');
    } else if (attack.tag === 'defend') {
      setGuarding(true);
      popDamage('player', 'GUARD', { heal: true });
      addLog(`🛡 ${attack.name}: bracing for impact.`);
      setPlayerAnim('');
    } else {
      // Defbreak: attacks against a target with active def-break deal +25% damage.
      const defbreakBonus = (statuses.defbreak || 0) > 0 ? 1.25 : 1;
      const mult = (strengthBuff ? strengthBuff : 1) * defbreakBonus;
      const { dmg, crit } = rollDamage(attack, loadout.magic, mult);
      setMonsterAnim('battle-monster-hurt');
      popDamage('monster', dmg, { crit });
      if (crit || ['heavy', 'shockwave', 'lightning'].includes(attack.animation)) shake();
      newMonsterHp = Math.max(0, monsterHp - dmg);
      setMonsterHp(newMonsterHp);
      const tags = [];
      if (strengthBuff) tags.push('TONIC');
      if (defbreakBonus > 1) tags.push('DEF-BREAK');
      const buffStr = tags.length ? ` [${tags.join('+')}]` : '';
      addLog(`${attack.emoji} ${attack.name} hits ${monster.name} for ${dmg}${crit ? ' (CRIT!)' : ''}${buffStr}.`);
      if (strengthBuff) setStrengthBuff(null);

      // Apply status effects from this attack
      if (attack.tag === 'burn' && newMonsterHp > 0) {
        // Inferno (high-tier) burns longer and applies def-break too.
        const isInferno = attack.id === 'inferno';
        setStatuses(s => ({
          ...s,
          burn: Math.max(s.burn || 0, isInferno ? 5 : 3),
          defbreak: Math.max(s.defbreak || 0, isInferno ? 4 : 2),
        }));
        addLog(`🔥 ${monster.name} is BURNING — defense weakened.`);
      } else if (attack.tag === 'poison' && newMonsterHp > 0) {
        setStatuses(s => ({ ...s, poison: Math.max(s.poison || 0, 3) }));
        addLog(`☠️ ${monster.name} is POISONED.`);
      } else if (attack.tag === 'stun' && newMonsterHp > 0) {
        setStatuses(s => ({ ...s, stun: Math.max(s.stun || 0, 1) }));
        addLog(`⚡ ${monster.name} is STUNNED — they'll lose their next turn.`);
      } else if (attack.tag === 'chill' && newMonsterHp > 0) {
        setStatuses(s => ({ ...s, chill: Math.max(s.chill || 0, 2) }));
        addLog(`❄️ ${monster.name} is CHILLED — their next strikes are weaker.`);
      } else if (attack.tag === 'freeze' && newMonsterHp > 0) {
        setStatuses(s => ({
          ...s,
          stun:  Math.max(s.stun  || 0, 2),
          chill: Math.max(s.chill || 0, 3),
        }));
        addLog(`🧊 ${monster.name} is FROZEN SOLID.`);
      } else if (attack.tag === 'defbreak' && newMonsterHp > 0) {
        // Heavy: long defbreak, light: short.
        const isHeavy = ['inferno', 'earthquake', 'void_lance', 'piercing_arrow'].includes(attack.id);
        setStatuses(s => ({ ...s, defbreak: Math.max(s.defbreak || 0, isHeavy ? 4 : 2) }));
        addLog(`💢 ${monster.name}'s armor cracks — defense broken.`);
      } else if (attack.tag === 'lifesteal') {
        const lifesteal = Math.round(dmg / 2);
        setHp(prev => Math.min(maxHp, prev + lifesteal));
        popDamage('player', lifesteal, { heal: true });
        addLog(`👻 Drained ${lifesteal} HP.`);
      }

      await sleep(550);
      setPlayerAnim('');
      setMonsterAnim('');
    }

    // ── Ollie cameo ──────────────────────────────────────────────
    // ~4% chance per player turn for a wholesome non-event. He does nothing
    // mechanically — just shows up, says hi, then leaves. No art on purpose.
    if (Math.random() < 0.04) {
      addLog('👋 Ollie appears, then disappears.');
      flashBanner('Ollie appears, then disappears', '#a5b4fc', 1400);
      await sleep(900);
    }

    // Pet companion auto-attack (after the player's attack, if monster still alive)
    const petDmg = petBaseDamage();
    if (petDmg > 0 && newMonsterHp > 0 && attack.tag !== 'heal' && attack.tag !== 'defend') {
      setPetAnim('pet-attack');
      await sleep(180);
      setMonsterAnim('battle-monster-hurt');
      popDamage('monster', petDmg, {});
      newMonsterHp = Math.max(0, newMonsterHp - petDmg);
      setMonsterHp(newMonsterHp);
      const petName = (inventory && inventory.equipped && inventory.equipped.companion && inventory.equipped.companion.name) || 'Companion';
      addLog(`${(inventory.equipped.companion && inventory.equipped.companion.emoji) || '🐾'} ${petName} pounces for ${petDmg}!`);
      await sleep(450);
      setPetAnim('');
      setMonsterAnim('');
    }

    // Monster defeat check — covers normal hits, pet kills, or DoT kills below.
    if (newMonsterHp <= 0) {
      setMonsterAnim('battle-monster-die');
      setLootDrop({ xp: monster.xp, gold: monster.gold, id: Date.now() });
      addLog(`💀 ${monster.name} falls!`);
      await sleep(700);
      flashBanner('VICTORY!', '#fde047', 1100);
      await sleep(600);
      try {
        const res = survivalActive
          ? await api.dungeon.survivalReward(monster.id, survivalWave)
          : await api.dungeon.reward(monster.id);
        countUpReward(res.xp, res.gold);
        await refreshUser();
      } catch (err) { addLog('⚠ ' + err.message); }
      setPhase('rewarded');
      setBusy(false);
      return;
    }

    setCooldowns(c => ({ ...(c || {}), [slotIdx]: attack.cooldown || 0 }));

    // Apply status-effect ticks (burn/poison) at the start of monster's turn.
    // Chill + defbreak tick down too but don't deal damage themselves — they
    // just expire after their duration.
    let dotDmg = 0;
    const nextStatuses = { ...statuses };
    if ((nextStatuses.burn || 0) > 0) {
      dotDmg += 8;
      nextStatuses.burn -= 1;
      popDamage('monster', 8, {});
      addLog(`🔥 Burn ticks: -8 HP.`);
    }
    if ((nextStatuses.poison || 0) > 0) {
      dotDmg += 4;
      nextStatuses.poison -= 1;
      popDamage('monster', 4, {});
      addLog(`☠️ Poison ticks: -4 HP.`);
    }
    if ((nextStatuses.chill    || 0) > 0) nextStatuses.chill    -= 1;
    if ((nextStatuses.defbreak || 0) > 0) nextStatuses.defbreak -= 1;
    if (dotDmg > 0) {
      newMonsterHp = Math.max(0, newMonsterHp - dotDmg);
      setMonsterHp(newMonsterHp);
      await sleep(400);
      if (newMonsterHp <= 0) {
        setMonsterAnim('battle-monster-die');
        setLootDrop({ xp: monster.xp, gold: monster.gold, id: Date.now() });
        addLog(`💀 ${monster.name} succumbs to wounds.`);
        await sleep(700);
        flashBanner('VICTORY!', '#fde047', 1100);
        await sleep(600);
        try {
          const res = survivalActive
            ? await api.dungeon.survivalReward(monster.id, survivalWave)
            : await api.dungeon.reward(monster.id);
          countUpReward(res.xp, res.gold);
          await refreshUser();
        } catch (err) { addLog('⚠ ' + err.message); }
        setPhase('rewarded');
        setBusy(false);
        return;
      }
    }
    setStatuses(nextStatuses);

    // Resolve monster's intent (or skip if stunned)
    const stunned = (nextStatuses.stun || 0) > 0;
    const currentIntent = intent || computeIntent(monster, turnCount);

    await sleep(300);
    if (stunned) {
      setStatuses(s => ({ ...s, stun: 0 }));
      addLog(`⚡ ${monster.name} is stunned and misses its turn!`);
      await sleep(450);
    } else if (currentIntent.kind === 'defend') {
      // Monster defends — show animation, no damage this turn.
      addLog(`🛡 ${monster.name} braces — incoming dmg reduced next turn.`);
      setDefenseBuff(0.4); // pseudo-debuff — actually buffs their next defense
      // We don't actually use this; instead increase damage they ABSORB next swing.
      // Simpler: just skip their offense this turn.
      await sleep(400);
    } else {
      setMonsterAnim('battle-monster-attack');
      await sleep(250);
      const intentPower = currentIntent.power;
      let dmg = monsterDamage({ ...monster, power: intentPower }, loadout.armor, defenseBuff || 1);
      // CHILL: 30% reduction on incoming monster damage while active.
      if ((nextStatuses.chill || 0) > 0) {
        dmg = Math.round(dmg * 0.7);
      }
      if (guarding) { dmg = Math.round(dmg * 0.4); setGuarding(false); }
      if (defenseBuff && defenseBuff !== 0.4) { setDefenseBuff(null); }
      setPlayerAnim('battle-player-hurt');
      popDamage('player', dmg, { crit: currentIntent.kind === 'heavy' });
      setHp(prev => {
        const next = Math.max(0, prev - dmg);
        if (next <= 0) {
          (async () => {
            shake(600);
            flashBanner('DEFEAT', '#fca5a5', 1400);
            addLog('💀 You fall. The run ends here.');
            await sleep(900);
            setPhase('dead');
            setBusy(false);
          })();
        }
        return next;
      });
      addLog(`${monster.sprite} ${monster.name} ${currentIntent.kind === 'heavy' ? 'crashes down' : 'strikes'} for ${dmg}.`);
      await sleep(500);
      setMonsterAnim('');
      setPlayerAnim('');
      if (dmg > 15 || currentIntent.kind === 'heavy') shake(350);
    }

    // Tick down cooldowns + compute next intent
    setCooldowns(c => {
      const out = {};
      for (let i = 0; i < 4; i++) {
        const cur = c ? (c[i] || 0) : 0;
        out[i] = i === slotIdx
          ? (attack.cooldown || 0)
          : Math.max(0, cur - 1);
      }
      return out;
    });
    const nextTurn = turnCount + 1;
    setTurnCount(nextTurn);
    setIntent(computeIntent(monster, nextTurn));

    setBusy(false);
  };

  // ── Potion use ───────────────────────────────────────────────────
  const usePotion = (idx) => {
    const p = potions[idx];
    if (!p) return;
    if (p.heal) {
      setHp(prev => Math.min(maxHp, prev + p.heal));
      addLog(`🧪 You drink ${p.name}. +${p.heal} HP.`);
    } else if (p.strength) {
      setStrengthBuff(p.strength);
      addLog(`🧉 ${p.name} active — your next attack will hit hard.`);
    } else if (p.defense) {
      setDefenseBuff(p.defense);
      addLog(`📜 ${p.name} active — incoming damage reduced next hit.`);
    } else if (p.goldBoost) {
      setLuckyCharm(true);
      addLog(`🍀 ${p.name} active — your next treasure will pay more.`);
    }
    setPotions(prev => prev.filter((_, i) => i !== idx));
  };

  const buyPotion = async (potion) => {
    try {
      const res = await api.dungeon.buyPotion(potion.id);
      setPotions(p => [...p, res.potion]);
      addLog(`🛒 Bought ${potion.name}.`);
      await refreshUser();
    } catch (err) { addLog('⚠ ' + err.message); }
  };

  const restAtSpring = () => {
    const heal = Math.round(maxHp * 0.4);
    setHp(prev => Math.min(maxHp, prev + heal));
    addLog(`⛲ The spring restores ${heal} HP.`);
    completeRoom();
  };

  // ── Map helpers ───────────────────────────────────────────────────
  const nextNodes = position !== null && map
    ? map.edges.filter(([a]) => a === position).map(([, b]) => map.nodes.find(n => n.id === b)).filter(Boolean)
    : [];

  // ── Render ───────────────────────────────────────────────────────
  if (!loadout) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  }

  if (editingLoadout) {
    return <LoadoutEditor
      loadout={loadout}
      userGold={user?.gold || 0}
      onSave={async (slots) => {
        await api.dungeon.saveLoadout(slots);
        await loadAll();
        setEditingLoadout(false);
      }}
      onUpgrade={async (attackId) => {
        try { await api.dungeon.upgradeAttack(attackId); await loadAll(); await refreshUser(); }
        catch (err) { addLog('⚠ ' + err.message); }
      }}
      onLearn={async (attackId) => {
        try { await api.dungeon.learnAttack(attackId); await loadAll(); await refreshUser(); }
        catch (err) { addLog('⚠ ' + err.message); }
      }}
      onCancel={() => setEditingLoadout(false)}
    />;
  }

  // ─── ENTRANCE ───────────────────────────────────────────────────
  if (phase === 'idle' || !map) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
        <div className="card" style={{
          padding: 22, textAlign: 'center', position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 0%, rgba(127,29,29,0.3) 0%, transparent 60%), var(--bg2)',
        }}>
          <span className="dungeon-torch" style={{ position: 'absolute', top: 12, left: 12, fontSize: 22 }}>🔥</span>
          <span className="dungeon-torch right" style={{ position: 'absolute', top: 12, right: 12, fontSize: 22 }}>🔥</span>

          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 11, color: 'var(--gold)', letterSpacing: '0.15em', marginBottom: 4 }}>
            🏰 THE CATACOMBS
          </div>
          <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 26, marginBottom: 4 }}>The Dungeon</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Seven floors. Branching paths. Battles, shops, treasure, springs of rest — and a boss waiting at the top.
            Pick your route. Die and you lose what you carried.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="battle-idle" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }}>
              <PixelCharacter appearance={user || {}} equipped={inventory.equipped} size={120} />
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10,
            marginBottom: 18, textAlign: 'left',
          }}>
            <StatChip label="Max HP" value={maxHp || playerMaxHp(user?.level)} icon="❤️" />
            <StatChip label="Magic"  value={loadout.magic} icon="✨" />
            <StatChip label="Armor"  value={loadout.armor} icon="🛡️" />
            <StatChip label="Weapon" value={loadout.weaponClass || 'unarmed'} icon="🗡️" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
              EQUIPPED ATTACKS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {loadout.slotDetails.map((a, i) => (
                <div key={i} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{a.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {a.tag === 'heal' ? `+${a.heal} HP` : `${a.power} dmg`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => setEditingLoadout(true)} style={{ padding: '10px 18px', fontSize: 13 }}>
              ⚙️ Edit Loadout
            </button>
            <button className="btn btn-primary" onClick={startRun} disabled={busy}
              style={{ padding: '10px 24px', fontSize: 14, background: '#7f1d1d', borderColor: '#ef4444' }}>
              {busy ? '...' : '⚔️ Standard Run'}
            </button>
            <button className="btn btn-primary" onClick={startSurvival} disabled={busy}
              style={{ padding: '10px 24px', fontSize: 14, background: '#7c3aed', borderColor: '#a78bfa' }}>
              ♾️ Survival Mode
            </button>
          </div>
          {user?.best_survival_wave > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
              Best Survival Wave: <strong style={{ color: '#a78bfa' }}>#{user.best_survival_wave}</strong>
            </div>
          )}
        </div>

        {log.length > 0 && <LogPanel log={log} />}
      </div>
    );
  }

  // Header bar reused on every in-run screen
  const RunHeader = () => (
    <div className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>❤️ HP</div>
        <HpBar value={hp} max={maxHp} color="#10b981" />
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {survivalActive && (
          <div title="Survival Wave" style={{
            fontSize: 12, color: '#fff', fontWeight: 700, padding: '4px 10px',
            background: 'linear-gradient(90deg, #7c3aed, #ec4899)', borderRadius: 99,
          }}>
            ♾️ Wave {survivalWave}
            {user?.best_survival_wave > 0 && (
              <span style={{ opacity: 0.7, marginLeft: 4 }}>· best {user.best_survival_wave}</span>
            )}
          </div>
        )}
        <div title="Your gold" style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700 }}>
          💰 {user?.gold || 0}
        </div>
        {potions.length > 0 && (
          <div style={{ display: 'flex', gap: 3, marginLeft: 6 }}>
            {potions.map((p, i) => (
              <button key={i} title={`${p.name}: ${p.desc}`}
                onClick={() => usePotion(i)}
                style={{
                  width: 30, height: 30, borderRadius: 6, fontSize: 16,
                  background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer',
                }}>{p.emoji}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── MAP VIEW ───────────────────────────────────────────────────
  if (phase === 'map') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
        <RunHeader />
        <div className="card" style={{
          padding: 16, position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 0%, rgba(127,29,29,0.18) 0%, transparent 60%), var(--bg2)',
        }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: 'var(--gold)', textAlign: 'center', letterSpacing: '0.15em', marginBottom: 12 }}>
            🏰 CATACOMBS — CHOOSE YOUR PATH
          </div>
          <MapView
            map={map}
            cleared={cleared}
            position={position}
            nextIds={new Set(nextNodes.map(n => n.id))}
            onPick={(n) => enterNode(n)}
          />
        </div>
        <LogPanel log={log} />
        <button className="btn btn-ghost" onClick={exitRun} style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: 12 }}>
          🏃 Flee Dungeon
        </button>
      </div>
    );
  }

  // ─── BATTLE / REWARDED ──────────────────────────────────────────
  if (phase === 'battle' || phase === 'rewarded') {
    const monster = activeNode.monster;
    const isBoss = activeNode.type === 'boss';
    const isElite = activeNode.type === 'elite';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
        <RunHeader />

        <div className={`dungeon-stage stage-tier-${monster.tier || 1} ${stageShake ? 'battle-shake' : ''} ${isBoss ? 'boss-room' : ''}`} style={{
          padding: 0, position: 'relative', minHeight: 320,
        }}>
          {/* Stone floor at the bottom of the stage. */}
          <div className="dungeon-floor" />
          {/* Drifting dust motes for ambience. */}
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className="dust-mote" style={{
              left: `${10 + i * 18}%`,
              bottom: 30 + (i % 3) * 20,
              animationDelay: `${i * 1.1}s`,
              animationDuration: `${5 + (i % 3)}s`,
            }} />
          ))}

          <span className="dungeon-torch" style={{ position: 'absolute', top: 8, left: 8, fontSize: 22, zIndex: 2 }}>🔥</span>
          <span className="dungeon-torch right" style={{ position: 'absolute', top: 8, right: 8, fontSize: 22, zIndex: 2 }}>🔥</span>

          <div style={{ padding: 16, position: 'relative', minHeight: 320 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3, color: '#6ee7b7' }}>
                  {user?.username} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· Lv {user?.level}</span>
                </div>
                <HpBar value={hp} max={maxHp} color="#10b981" />
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3, color: isBoss ? '#fde047' : isElite ? '#fb923c' : '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  {/* Monster intent badge — telegraphs the upcoming move */}
                  {phase === 'battle' && intent && (
                    <span className="monster-intent" style={{ color: intent.tone }}>
                      {intent.icon} {intent.label}
                    </span>
                  )}
                  <span>{isBoss && '👑 '}{isElite && '🔥 '}{monster.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· T{monster.tier}</span></span>
                </div>
                <HpBar value={monsterHp} max={monster.hp} color={isBoss ? '#fbbf24' : isElite ? '#fb923c' : '#ef4444'} />
                {/* Active status effects on the monster */}
                {(statuses.burn > 0 || statuses.poison > 0 || statuses.stun > 0 || statuses.chill > 0 || statuses.defbreak > 0) && (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 4, flexWrap: 'wrap' }}>
                    {statuses.burn > 0 && (
                      <span className="status-icon" style={{ fontSize: 14, padding: '2px 6px', background: 'rgba(249,115,22,0.2)', border: '1px solid #ea580c', borderRadius: 6 }}>
                        🔥 {statuses.burn}
                      </span>
                    )}
                    {statuses.poison > 0 && (
                      <span className="status-icon" style={{ fontSize: 14, padding: '2px 6px', background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: 6 }}>
                        ☠️ {statuses.poison}
                      </span>
                    )}
                    {statuses.stun > 0 && (
                      <span className="status-icon" style={{ fontSize: 14, padding: '2px 6px', background: 'rgba(253,224,71,0.2)', border: '1px solid #fde047', borderRadius: 6 }}>
                        ⚡ STUN
                      </span>
                    )}
                    {statuses.chill > 0 && (
                      <span className="status-icon" style={{ fontSize: 14, padding: '2px 6px', background: 'rgba(103,232,249,0.2)', border: '1px solid #22d3ee', borderRadius: 6 }}>
                        ❄️ {statuses.chill}
                      </span>
                    )}
                    {statuses.defbreak > 0 && (
                      <span className="status-icon" style={{ fontSize: 14, padding: '2px 6px', background: 'rgba(244,114,182,0.2)', border: '1px solid #ec4899', borderRadius: 6 }}>
                        💢 {statuses.defbreak}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ position: 'relative', height: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 30px', zIndex: 2 }}>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, position: 'relative' }}>
                {/* Soft glow under player feet for grounding */}
                <div className="combat-light player" />
                <div className={`${playerAnim || 'battle-idle'}`} style={{ position: 'relative' }}>
                  <PixelCharacter appearance={user || {}} equipped={inventory.equipped} size={130} />
                  {damages.filter(d => d.target === 'player').map(d => (
                    <div key={d.id} className={`battle-damage ${d.heal ? 'heal' : ''} ${d.crit ? 'crit' : ''}`}>
                      {d.heal ? `+${d.value}` : d.value}
                    </div>
                  ))}
                  {guarding && (
                    <div style={{ position: 'absolute', inset: -10, borderRadius: '50%',
                      border: '2px solid #60a5fa', boxShadow: '0 0 18px #60a5fa88',
                      animation: 'bob 1.2s ease-in-out infinite' }} />
                  )}
                  {strengthBuff && (
                    <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 22, animation: 'bob 1s ease-in-out infinite' }}>🧉</div>
                  )}
                </div>
                {/* Pet companion fighting alongside the player */}
                {inventory && inventory.equipped && inventory.equipped.companion && (
                  <div className={petAnim || 'pet-idle'} style={{
                    fontSize: 56, lineHeight: 1,
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                    position: 'relative',
                  }}
                  title={inventory.equipped.companion.name}>
                    {inventory.equipped.companion.emoji}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                {/* Floor glow under monster, ring aura for bosses */}
                <div className={`combat-light ${isBoss ? 'boss' : 'monster'}`} />
                {isBoss && <div className="boss-aura" />}
              <div className={`${monsterAnim || 'battle-idle'}`} style={{
                position: 'relative',
                fontSize: isBoss ? 140 : isElite ? 120 : 110, lineHeight: 1,
                filter: isBoss ? 'drop-shadow(0 0 24px #ef444466)' : isElite ? 'drop-shadow(0 0 18px #fb923c66)' : 'none',
              }}>
                <span>{monster.sprite}</span>
                {damages.filter(d => d.target === 'monster').map(d => (
                  <div key={d.id} className={`battle-damage ${d.crit ? 'crit' : ''}`}>{d.value}</div>
                ))}
                {lootDrop && phase === 'rewarded' && (
                  <div key={lootDrop.id} className="loot-pop" style={{
                    position: 'absolute', top: 10, left: '50%',
                    fontFamily: 'Cinzel,serif', fontWeight: 700, fontSize: 18,
                    color: '#fcd34d', textShadow: '0 0 8px rgba(0,0,0,0.9), 2px 2px 0 #7c2d12',
                    whiteSpace: 'nowrap',
                  }}>
                    +{lootDrop.xp} XP · +{lootDrop.gold} 💰
                  </div>
                )}
                {/* Hit-splash bursts and slash trails on each damage event. */}
                {damages.filter(d => d.target === 'monster').map(d => (
                  <span key={`splash-${d.id}`} className={`hit-splash ${d.crit ? 'crit' : ''}`} />
                ))}
                {damages.filter(d => d.target === 'monster' && !d.crit && d.value > 0).slice(-1).map(d => (
                  <span key={`slash-${d.id}`} className="slash-trail" />
                ))}
              </div>
              </div>

              {projectile && (
                <span key={projectile.id} className="battle-projectile" style={{ color: projectile.color }}>
                  {projectile.emoji}
                </span>
              )}
            </div>

            {encounter && (
              <div className="encounter-banner" style={{
                position: 'absolute', inset: 0, zIndex: 6,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.85) 70%, transparent 100%)',
              }}>
                <div style={{ fontSize: 80, marginBottom: 6 }}>{encounter.sprite}</div>
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 24, fontWeight: 700, color: encounter.tier === 5 ? '#fde047' : encounter.tier === 4 ? '#fb923c' : '#fca5a5' }}>
                  {encounter.tier === 5 && '👑 '}{encounter.tier === 4 && '🔥 '}{encounter.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                  "{encounter.taunt}"
                </div>
              </div>
            )}

            {banner && (
              <div className="battle-banner" style={{ color: banner.color }}>
                {banner.text}
              </div>
            )}
          </div>
        </div>

        {phase === 'battle' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {loadout.slotDetails.map((a, i) => {
              const cd = cooldowns[i] || 0;
              const disabled = busy || cd > 0;
              return (
                <button key={i} onClick={() => useAttack(i)} disabled={disabled} style={{
                  background: disabled ? 'var(--bg3)' : 'var(--bg2)',
                  border: `1px solid ${disabled ? 'var(--border)' : 'var(--accent)'}`,
                  borderRadius: 10, padding: 10, cursor: disabled ? 'not-allowed' : 'pointer',
                  color: 'var(--text)', textAlign: 'center',
                  opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{a.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {cd > 0 ? `Cooldown: ${cd}` : a.tag === 'heal' ? `+${a.heal} HP` : `${a.power} dmg`}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {phase === 'rewarded' && (
          <div className="card animate-fade" style={{
            padding: 18, textAlign: 'center',
            borderColor: '#f59e0b66', background: 'rgba(245,158,11,0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 14 }}>
              <div className="reward-counter">
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>XP GAINED</div>
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 28, fontWeight: 700, color: '#a78bfa' }}>+{rewardCount.xp}</div>
              </div>
              <div className="reward-counter" style={{ animationDelay: '0.15s' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>GOLD</div>
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 28, fontWeight: 700, color: '#fbbf24' }}>+{rewardCount.gold} 💰</div>
              </div>
            </div>
            {survivalActive ? (
              <button className="btn btn-gold" onClick={advanceSurvivalWave} style={{ padding: '10px 28px', fontSize: 14 }} disabled={busy}>
                ♾️ Next Wave (#{survivalWave + 1}) →
              </button>
            ) : (
              <button className="btn btn-gold" onClick={completeRoom} style={{ padding: '10px 28px', fontSize: 14 }}>
                🗺️ Back to map
              </button>
            )}
          </div>
        )}

        <LogPanel log={log} />
      </div>
    );
  }

  // ─── SHOP ────────────────────────────────────────────────────────
  if (phase === 'shop') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
        <RunHeader />
        <div className="card" style={{ padding: 18 }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>🛒</div>
            <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 20 }}>Wandering Merchant</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              "Travel safely, friend. Take what you need."
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
            {shopOffer.map(p => {
              const afford = (user?.gold || 0) >= p.cost;
              return (
                <div key={p.id} style={{
                  background: 'var(--bg3)', borderRadius: 10, padding: 12,
                  border: `1px solid ${afford ? '#22c55e55' : 'var(--border)'}`, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 30, marginBottom: 4 }}>{p.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, minHeight: 26 }}>{p.desc}</div>
                  <button className="btn btn-primary"
                    disabled={!afford}
                    onClick={() => buyPotion(p)}
                    style={{ padding: '6px 12px', fontSize: 12, opacity: afford ? 1 : 0.4, background: '#15803d', borderColor: '#22c55e' }}>
                    💰 {p.cost}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-gold" onClick={completeRoom} style={{ padding: '10px 28px', fontSize: 14 }}>
              🚪 Leave the shop
            </button>
          </div>
        </div>
        <LogPanel log={log} />
      </div>
    );
  }

  // ─── REST SPRING ─────────────────────────────────────────────────
  if (phase === 'rest') {
    const healAmount = Math.round(maxHp * 0.4);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
        <RunHeader />
        <div className="card" style={{
          padding: 22, textAlign: 'center',
          background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.18) 0%, transparent 60%), var(--bg2)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⛲</div>
          <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 20, marginBottom: 6 }}>A quiet spring</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 18, maxWidth: 360, margin: '0 auto 18px' }}>
            The water is clear and cold. Drinking from it will restore <strong style={{ color: '#6ee7b7' }}>{healAmount} HP</strong>.
          </p>
          <button className="btn btn-primary" onClick={restAtSpring}
            style={{ padding: '10px 28px', fontSize: 14, background: '#1d4ed8', borderColor: '#3b82f6' }}>
            ⛲ Rest (+{healAmount} HP)
          </button>
        </div>
        <LogPanel log={log} />
      </div>
    );
  }

  // ─── TREASURE ────────────────────────────────────────────────────
  if (phase === 'treasure') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
        <RunHeader />
        <div className="card" style={{
          padding: 22, textAlign: 'center',
          background: 'radial-gradient(circle at 50% 0%, rgba(245,158,11,0.18) 0%, transparent 60%), var(--bg2)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>💎</div>
          <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 20, marginBottom: 6 }}>You found a chest</h2>
          <div className="reward-counter" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>GOLD</div>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 32, fontWeight: 700, color: '#fbbf24' }}>+{rewardCount.gold} 💰</div>
          </div>
          <button className="btn btn-gold" onClick={completeRoom} style={{ padding: '10px 28px', fontSize: 14 }}>
            🗺️ Back to map
          </button>
        </div>
        <LogPanel log={log} />
      </div>
    );
  }

  // ─── DEAD ───────────────────────────────────────────────────────
  if (phase === 'dead') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
        <div className="card animate-fade" style={{
          padding: 24, textAlign: 'center',
          borderColor: '#ef444466', background: 'rgba(239,68,68,0.08)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 6 }}>💀</div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 22, color: '#fca5a5', marginBottom: 6 }}>
            {survivalActive ? `You fell on Wave ${survivalWave}.` : 'You fell in the dark.'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {survivalActive
              ? `Best wave: #${Math.max(user?.best_survival_wave || 0, survivalWave - 1)}. You keep the XP + gold earned this run.`
              : 'The catacombs claim another soul. You keep the gold and XP you earned, but the run is over.'}
          </div>
          <button className="btn btn-ghost" onClick={exitRun} style={{ padding: '10px 28px' }}>
            Leave the dungeon
          </button>
        </div>
        <LogPanel log={log} />
      </div>
    );
  }

  // ─── CLEARED ────────────────────────────────────────────────────
  if (phase === 'cleared') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
        <div className="card animate-fade" style={{
          padding: 24, textAlign: 'center',
          borderColor: '#fbbf2466', background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.18) 0%, var(--bg2) 70%)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 6 }}>🏆</div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 24, color: '#fde047', marginBottom: 6 }}>DUNGEON CLEARED</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
            You've slain the boss and emerged from the catacombs alive. Hero.
          </div>
          <button className="btn btn-gold" onClick={exitRun} style={{ padding: '10px 28px' }}>
            🚪 Exit Triumphantly
          </button>
        </div>
        <LogPanel log={log} />
      </div>
    );
  }

  return null;
}

// ── Subcomponents ─────────────────────────────────────────────────────

function HpBar({ value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ position: 'relative', height: 14, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s ease' }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)',
      }}>
        {value} / {max}
      </div>
    </div>
  );
}

function StatChip({ label, value, icon }) {
  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function LogPanel({ log }) {
  return (
    <div className="card" style={{ padding: 12, maxHeight: 140, overflowY: 'auto' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>
        LOG
      </div>
      {log.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Silence.</div>
      ) : log.map((line, i) => (
        <div key={i} style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2, lineHeight: 1.4 }}>{line}</div>
      ))}
    </div>
  );
}

// Branching dungeon map. Nodes are positioned on a column-by-floor grid,
// connected by SVG paths underneath. Reachable next-nodes are clickable.
function MapView({ map, cleared, position, nextIds, onPick }) {
  if (!map) return null;
  const COLS = 4;
  const FLOORS = Math.max(...map.nodes.map(n => n.floor)) + 1;
  const cellW = 70;
  const cellH = 70;
  const width = COLS * cellW;
  const height = FLOORS * cellH;

  // Convert (floor, col) to x/y. Floor 0 (start) goes at the BOTTOM so you
  // climb upward toward the boss — feels right for a "spire/catacombs" run.
  const posOf = (node) => ({
    x: node.col * cellW + cellW / 2,
    y: (FLOORS - 1 - node.floor) * cellH + cellH / 2,
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
      <div style={{ position: 'relative', width, height }}>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {map.edges.map(([a, b], i) => {
            const A = map.nodes.find(n => n.id === a);
            const B = map.nodes.find(n => n.id === b);
            if (!A || !B) return null;
            const pa = posOf(A);
            const pb = posOf(B);
            const isTraveled = cleared.has(a) && cleared.has(b);
            const isAvailable = a === position && nextIds.has(b);
            const stroke = isTraveled ? '#10b981'
              : isAvailable ? '#fde047'
              : '#3a3a55';
            const strokeWidth = isAvailable ? 3 : 2;
            const dash = isTraveled || isAvailable ? '0' : '4 4';
            return (
              <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} />
            );
          })}
        </svg>

        {map.nodes.map(node => {
          const p = posOf(node);
          const isCleared = cleared.has(node.id);
          const isCurrent = node.id === position;
          const isAvailable = nextIds.has(node.id);
          const meta = NODE_META[node.type] || NODE_META.battle;
          const tip = node.monster
            ? `${meta.label}: ${node.monster.name} (T${node.monster.tier})`
            : meta.label;
          // Map icon: monster sprite for combat nodes, otherwise the meta icon.
          const icon = (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') && node.monster
            ? node.monster.sprite
            : meta.icon;

          const state = isCleared ? 'cleared'
            : isCurrent ? 'current'
            : isAvailable ? 'available'
            : 'locked';

          return (
            <button key={node.id}
              title={tip}
              disabled={!isAvailable}
              onClick={() => isAvailable && onPick(node)}
              style={{
                position: 'absolute', left: p.x - 24, top: p.y - 24,
                width: 48, height: 48, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: node.type === 'boss' ? 26 : 22, cursor: isAvailable ? 'pointer' : 'default',
                background: state === 'cleared' ? '#064e3b'
                  : state === 'current' ? '#1e3a8a'
                  : state === 'available' ? '#7c2d12'
                  : 'var(--bg3)',
                color: state === 'locked' ? 'var(--text-muted)' : 'var(--text)',
                border: `2px solid ${
                  state === 'cleared' ? '#10b981'
                  : state === 'current' ? '#60a5fa'
                  : state === 'available' ? '#fbbf24'
                  : 'var(--border)'
                }`,
                boxShadow: state === 'available' ? '0 0 16px #fbbf2488'
                  : node.type === 'boss' ? '0 0 12px #fbbf2466'
                  : 'none',
                opacity: state === 'locked' ? 0.65 : 1,
                transition: 'all 0.2s',
                animation: state === 'available' ? 'bob 1.4s ease-in-out infinite' : 'none',
                padding: 0,
              }}>
              {icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LoadoutEditor({ loadout, userGold, onSave, onUpgrade, onLearn, onCancel }) {
  const [slots, setSlots] = useState(loadout.slots);
  const [pickerSlot, setPickerSlot] = useState(null);

  const pickAttack = (id) => {
    if (pickerSlot === null) return;
    const a = loadout.available.find(x => x.id === id);
    if (a?.locked) return; // locked attacks can't be slotted
    const newSlots = [...slots];
    newSlots[pickerSlot] = id;
    setSlots(newSlots);
    setPickerSlot(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 18, marginBottom: 4 }}>Edit Loadout</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
          Pick 4 attacks. Available moves depend on your equipped weapon ({loadout.weaponClass || 'unarmed'}).
          Spend gold to upgrade attacks (boosts damage/heal) or learn new ones.
          {' '}<span style={{ color: 'var(--gold)' }}>🪙 {userGold.toLocaleString()}</span>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {slots.map((id, i) => {
            const a = loadout.available.find(x => x.id === id);
            const active = pickerSlot === i;
            return (
              <button key={i} onClick={() => setPickerSlot(i)} style={{
                background: active ? 'rgba(99,102,241,0.18)' : 'var(--bg3)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, padding: 12, cursor: 'pointer', color: 'var(--text)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Slot {i + 1}</div>
                <div style={{ fontSize: 22, margin: '4px 0' }}>{a?.emoji || '➕'}</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{a?.name || 'Empty'}</div>
                {a && (a.level || 1) > 1 && (
                  <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2 }}>Lv {a.level}</div>
                )}
              </button>
            );
          })}
        </div>

        {pickerSlot !== null && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              Pick an attack for slot {pickerSlot + 1}:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {loadout.available.map(a => {
                const isSelected = slots[pickerSlot] === a.id;
                const level   = a.level || 1;
                const maxed   = level >= (a.maxLevel || 5);
                const upCost  = a.nextUpgradeCost;
                const power   = a.leveledPower ?? a.power;
                const heal    = a.leveledHeal  ?? a.heal;
                return (
                  <div key={a.id} style={{
                    background: isSelected ? 'rgba(99,102,241,0.18)' : 'var(--bg2)',
                    border: `1px solid ${isSelected ? 'var(--accent)' : a.locked ? '#a16207' : 'var(--border)'}`,
                    borderRadius: 8, padding: 8, color: 'var(--text)',
                    opacity: a.locked ? 0.85 : 1,
                  }}>
                    <button onClick={() => pickAttack(a.id)}
                      disabled={a.locked}
                      style={{
                        background: 'transparent', border: 'none', padding: 0,
                        textAlign: 'left', color: 'inherit',
                        cursor: a.locked ? 'not-allowed' : 'pointer', width: '100%',
                      }}>
                      <div style={{ fontSize: 16, marginBottom: 2 }}>
                        {a.locked && <span style={{ color: '#fbbf24' }}>🔒 </span>}
                        {a.emoji} <span style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</span>
                        {level > 1 && (
                          <span style={{ fontSize: 10, color: '#fbbf24', marginLeft: 6 }}>Lv {level}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.desc}</div>
                      <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 2 }}>
                        {a.tag === 'heal' ? `+${heal} HP` : `${power} dmg`}{a.cooldown ? ` · CD ${a.cooldown}` : ''}
                      </div>
                    </button>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {a.locked ? (
                        <button className="btn btn-gold"
                          disabled={userGold < a.learnCost}
                          onClick={() => onLearn(a.id)}
                          style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}>
                          Learn · 🪙 {a.learnCost}
                        </button>
                      ) : maxed ? (
                        <span style={{ flex: 1, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0' }}>MAX LEVEL</span>
                      ) : (
                        <button className="btn btn-ghost"
                          disabled={!upCost || userGold < upCost}
                          onClick={() => onUpgrade(a.id)}
                          style={{ flex: 1, fontSize: 11, padding: '5px 8px', color: 'var(--gold)' }}>
                          Upgrade → Lv {level + 1} · 🪙 {upCost}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ padding: '8px 16px' }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(slots)} style={{ padding: '8px 16px' }}>Save Loadout</button>
        </div>
      </div>
    </div>
  );
}
