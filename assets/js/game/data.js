/**
 * JUMP 3D Fantasy Action Roguelike RPG — Game Data Tables
 * Includes:
 * - Elder Scrolls weapons/armors (Dawnbreaker, Daedric Greatsword, Dragonbone Armor)
 * - 4 Elemental Skills + Dragon Shout (Fus Ro Dah)
 * - Vampire Survivors / Roguelike Level-Up Perks & Auto-Weapon Auras
 * - Expanded Bestiary: Goblins, Shamans, Gnomes, Orcs, Ogres, Trolls, Plague Zombies, Vampire Lords, Elder Dragon
 * - Zombie Cavern with Infection mechanic & Ancient Treasure Chest
 */

export const DEFAULT_APPEARANCE = {
  hairStyle: 'short',
  hairColor: '#3b2f2f',
  skinColor: '#f5cfa0',
  eyeColor: '#2563eb',
  elfEars: false,
  outfitPrimary: '#4f46e5',
  outfitSecondary: '#e2e8f0',
  cape: true,
  capeColor: '#7c3aed',
  heightScale: 1.0
};

export const DEFAULT_PLAYER_STATE = {
  level: 1,
  exp: 0,
  gold: 120,
  hp: 120,
  mp: 100,
  weaponId: 'wood_sword',
  armorId: 'cloth_tunic',
  ownedItems: ['wood_sword', 'cloth_tunic'],
  potions: { hp: 3, mp: 3 },
  perks: {},          // { perkId: levelCount }
  scrolls: [],        // Collected Elder Scroll IDs
  kills: { goblin: 0, gnome: 0, orc: 0, ogre: 0, troll: 0, zombie: 0, vampire: 0, dragon: 0 }
};

export const SHOP_ITEMS = {
  // === Weapons ===
  wood_sword: {
    id: 'wood_sword',
    category: 'weapon',
    name: '新手木劍',
    price: 0,
    atk: 12,
    bonusMp: 0,
    elementBonus: null,
    style: 'sword',
    color: '#a16207',
    glow: null,
    desc: '精靈村莊配發的基礎木劍。'
  },
  elf_rapier: {
    id: 'elf_rapier',
    category: 'weapon',
    name: '精靈銀細劍',
    price: 160,
    atk: 26,
    bonusMp: 15,
    elementBonus: null,
    style: 'rapier',
    color: '#e2e8f0',
    glow: '#38bdf8',
    desc: '輕盈鋒利的精靈銀劍，對吸血鬼與狼人頗具威脅。'
  },
  thunder_blade: {
    id: 'thunder_blade',
    category: 'weapon',
    name: '⚡ 雷鳴戰刃',
    price: 380,
    atk: 38,
    bonusMp: 25,
    elementBonus: { type: 'lightning', mult: 1.38 },
    style: 'greatsword',
    color: '#60a5fa',
    glow: '#38bdf8',
    desc: '纏繞天雷的戰刃，雷電技能與自動落雷傷害 +38%。'
  },
  flame_greatsword: {
    id: 'flame_greatsword',
    category: 'weapon',
    name: '🔥 炎魔巨劍',
    price: 420,
    atk: 45,
    bonusMp: 20,
    elementBonus: { type: 'fire', mult: 1.38 },
    style: 'greatsword',
    color: '#f97316',
    glow: '#ef4444',
    desc: '克制巨魔再生與屍潮，火焰技能與烈焰光環傷害 +38%。'
  },
  tide_staff: {
    id: 'tide_staff',
    category: 'weapon',
    name: '💧 潮汐秘法杖',
    price: 390,
    atk: 32,
    bonusMp: 65,
    elementBonus: { type: 'water', mult: 1.45 },
    style: 'staff',
    color: '#06b6d4',
    glow: '#22d3ee',
    desc: '大幅提升魔力，水系治療與淨化屍毒效果 +45%。'
  },
  earth_hammer: {
    id: 'earth_hammer',
    category: 'weapon',
    name: '🪨 大地碎骨錘',
    price: 460,
    atk: 50,
    bonusMp: 15,
    elementBonus: { type: 'earth', mult: 1.38 },
    style: 'hammer',
    color: '#a8a29e',
    glow: '#eab308',
    desc: '能與食人魔正面硬撼的巨錘，地系突刺傷害 +38%。'
  },
  dawnbreaker: {
    id: 'dawnbreaker',
    category: 'weapon',
    name: '☀️ 破曉者（上古魔神聖劍）',
    price: 780,
    atk: 68,
    bonusMp: 35,
    undeadSlayer: 1.6, // +60% damage vs Zombies & Vampires
    elementBonus: { type: 'fire', mult: 1.45 },
    style: 'sword',
    color: '#fef08a',
    glow: '#f59e0b',
    desc: '【上古卷軸神器】美瑞蒂雅賜予的聖光之劍，對殭屍與吸血鬼造成 160% 聖炎傷害！'
  },
  daedric_greatsword: {
    id: 'daedric_greatsword',
    category: 'weapon',
    name: '🩸 魔族湮滅巨劍（Daedric）',
    price: 1150,
    atk: 92,
    bonusMp: 40,
    lifestealBonus: 0.12,
    elementBonus: { type: 'lightning', mult: 1.5 },
    style: 'greatsword',
    color: '#18181b',
    glow: '#dc2626',
    desc: '【上古卷軸神器】以湮滅魔心鍛造的黑紅巨劍，攻擊附帶 12% 鮮血汲取！'
  },
  poseidon_trident: {
    id: 'poseidon_trident',
    category: 'weapon',
    name: '🔱 波賽頓海神三叉戟',
    price: 1450,
    atk: 106,
    bonusMp: 60,
    lifestealBonus: 0.08,
    elementBonus: { type: 'water', mult: 1.65 },
    style: 'staff',
    color: '#06b6d4',
    glow: '#22d3ee',
    desc: '【古希臘神話神器】海神波賽頓統御滄海的三叉戟，水系傷害與治療 +65%、附帶 8% 吸血！'
  },
  zeus_bolt: {
    id: 'zeus_bolt',
    category: 'weapon',
    name: '⚡ 宙斯雷霆神矛（Master Bolt）',
    price: 1780,
    atk: 124,
    bonusMp: 80,
    elementBonus: { type: 'lightning', mult: 1.8 },
    style: 'greatsword',
    color: '#fef08a',
    glow: '#38bdf8',
    desc: '【古希臘神話至高神器】眾神之王宙斯的雷霆神矛，雷系天罰傷害 +80%！'
  },

  // === Armors ===
  cloth_tunic: {
    id: 'cloth_tunic',
    category: 'armor',
    name: '旅人布衣',
    price: 0,
    def: 2,
    bonusHp: 0,
    tint: null,
    desc: '輕便的冒險者服裝。'
  },
  elf_leather: {
    id: 'elf_leather',
    category: 'armor',
    name: '精靈翠綠皮甲',
    price: 180,
    def: 9,
    bonusHp: 65,
    tint: '#10b981',
    desc: '以古樹纖維編織，提升血量 +65、防禦 +9。'
  },
  mithril_plate: {
    id: 'mithril_plate',
    category: 'armor',
    name: '烏木重鎧（Ebony Armor）',
    price: 450,
    def: 20,
    bonusHp: 160,
    tint: '#334155',
    desc: '【上古卷軸名甲】深邃烏木鍛造，血量 +160、防禦 +20。'
  },
  dragon_armor: {
    id: 'dragon_armor',
    category: 'armor',
    name: '🐉 龍骨霸王鎧（Dragonbone）',
    price: 920,
    def: 36,
    bonusHp: 340,
    tint: '#dc2626',
    desc: '【上古卷軸傳說鎧】以古龍骸骨與逆鱗鍛造，血量 +340、防禦 +36，屍毒抗性大幅提升！'
  },
  aegis_armor: {
    id: 'aegis_armor',
    category: 'armor',
    name: '🏛️ 雅典娜埃吉斯黃金神鎧（Aegis）',
    price: 1480,
    def: 50,
    bonusHp: 480,
    tint: '#facc15',
    desc: '【古希臘神話神鎧】鑲嵌梅杜莎神盾徽記的奧林帕斯黃金神鎧，血量 +480、防禦 +50，大幅抵抗石化與屍毒！'
  },

  // === Consumables ===
  hp_potion: {
    id: 'hp_potion',
    category: 'consumable',
    name: '🧪 精靈生命聖水（兼解屍毒）',
    price: 40,
    potionKey: 'hp',
    healHp: 110,
    desc: '立即回復 110 點生命並淨化殭屍「屍毒感染」（快捷鍵 1）。'
  },
  mp_potion: {
    id: 'mp_potion',
    category: 'consumable',
    name: '💧 精靈魔力藥水',
    price: 35,
    potionKey: 'mp',
    healMp: 75,
    desc: '立即回復 75 點魔力值（快捷鍵 2）。'
  }
};

export const SKILLS = {
  lightning: {
    id: 'lightning',
    key: 'Q',
    name: '雷電',
    icon: '⚡',
    mpCost: 22,
    cooldown: 3.8,
    range: 17,
    damageMult: 2.2,
    chainCount: 4,
    chainRadius: 8,
    color: '#38bdf8',
    desc: '天降雷柱造成高爆發傷害並連鎖彈跳 4 名敵人，麻痺減速。'
  },
  fire: {
    id: 'fire',
    key: 'E',
    name: '火焰',
    icon: '🔥',
    mpCost: 24,
    cooldown: 4.5,
    range: 20,
    aoeRadius: 6.0,
    damageMult: 2.0,
    burnDamage: 14,
    burnDuration: 4.0,
    color: '#f97316',
    desc: '發射爆裂火球轟炸屍潮，附加灼燒並壓制巨魔回血！'
  },
  water: {
    id: 'water',
    key: 'R',
    name: '水',
    icon: '💧',
    mpCost: 25,
    cooldown: 6.0,
    aoeRadius: 8.0,
    healBase: 55,
    damageMult: 1.2,
    knockback: 8.5,
    color: '#06b6d4',
    desc: '釋放潮汐水環，回復自己與隊友血量、淨化殭屍屍毒感染，並擊退周圍敵群！'
  },
  earth: {
    id: 'earth',
    key: 'F',
    name: '地',
    icon: '🪨',
    mpCost: 25,
    cooldown: 6.5,
    range: 12,
    damageMult: 1.95,
    shieldDuration: 5.5,
    shieldReduction: 0.5,
    color: '#eab308',
    desc: '前方竄出巨岩尖刺擊飛敵群，並套上 5.5 秒減傷 50% 岩石護盾。'
  },
  shout: {
    id: 'shout',
    key: 'T',
    name: '龍吼',
    icon: '🗣️',
    mpCost: 15,
    cooldown: 9.0,
    range: 14,
    damageMult: 1.75,
    knockback: 14.0,
    color: '#fde047',
    desc: '【上古卷軸龍吼：不卸之力 Fus Ro Dah】發出震撼音波轟飛前方所有綠皮、殭屍與吸血鬼！'
  }
};

/**
 * Vampire Survivors / Roguelike Level-Up & Chest Perks (Stackable!)
 */
export const ROGUELIKE_PERKS = [
  {
    id: 'orbit_blades',
    name: '🗡️ 環繞聖劍（吸血鬼獵人飛劍）',
    icon: '🗡️',
    desc: '角色周圍召喚自動旋轉的聖光飛劍，持續切割靠近的所有殭屍與綠皮（每層 +1 把飛劍與傷害）。'
  },
  {
    id: 'garlic_aura',
    name: '🔥 聖炎驅魔結界（大蒜光環）',
    icon: '🔥',
    desc: '腳下常駐神聖烈焰光環，每秒自動灼燒走近的殭屍、吸血鬼與哥布林（每層擴大範圍與傷害）。'
  },
  {
    id: 'auto_thunder',
    name: '⚡ 雷神自動落雷（閃電戒）',
    icon: '⚡',
    desc: '每隔 2.6 秒自動召喚一道天雷劈向附近的隨機敵人（每層提升傷害與劈擊頻率）。'
  },
  {
    id: 'frost_nova',
    name: '❄️ 寒霜新星脈衝',
    icon: '❄️',
    desc: '每隔 4.5 秒自動釋放冰霜新星，凍結緩速周圍所有怪物並造成冰傷。'
  },
  {
    id: 'vampiric_bite',
    name: '🦇 鮮血汲取（吸血鬼之力）',
    icon: '🦇',
    desc: '普攻與所有技能命中時，自動回復造成傷害 8% 的生命值（可疊加）。'
  },
  {
    id: 'berserker_might',
    name: '⚔️ 龍裔狂戰之力',
    icon: '⚔️',
    desc: '所有武器、元素技能與龍吼傷害永久提升 +22%。'
  },
  {
    id: 'dragonblood_hull',
    name: '🛡️ 上古龍血鐵壁',
    icon: '🛡️',
    desc: '最大生命值 +110、防禦 +7，並降低屍毒感染 35% 傷害。'
  },
  {
    id: 'arcane_haste',
    name: '⏳ 瑪格努斯秘法冷卻',
    icon: '⏳',
    desc: '所有元素技能與龍吼冷卻時間縮短 15%，魔力自動回復速度 +40%。'
  },
  {
    id: 'wind_stride',
    name: '💨 暗影疾風步',
    icon: '💨',
    desc: '移動速度 +14%，翻滾無敵閃避冷卻縮短 20%。'
  },
  {
    id: 'golden_greed',
    name: '🧲 帝國黃金磁鐵',
    icon: '🧲',
    desc: '擊殺怪物與開啟山洞寶箱獲得的金幣與經驗值 +35%。'
  }
];

export const ELDER_SCROLLS = [
  {
    id: 'scroll_dragonborn',
    name: '📜《上古卷軸：龍裔》',
    bonusDesc: '龍吼（T）傷害 +50%、冷卻縮短 2 秒'
  },
  {
    id: 'scroll_bloodmoon',
    name: '📜《上古卷軸：血月》',
    bonusDesc: '全攻擊附帶 +10% 吸血、夜晚與山洞內暴擊率 +15%'
  },
  {
    id: 'scroll_oblivion',
    name: '📜《上古卷軸：湮滅》',
    bonusDesc: '四大元素技能（雷/火/水/地）傷害與治療量 +30%'
  },
  {
    id: 'scroll_sovngarde',
    name: '📜《上古卷軸：松加德》',
    bonusDesc: '最大生命 +180、每秒自動回血 +8'
  }
];

export const ZONES = {
  village: {
    id: 'village',
    name: '🌿 精靈村莊（安全區）',
    center: { x: 0, z: 0 },
    radius: 24,
    safe: true
  },
  greenskinWarfront: {
    id: 'greenskinWarfront',
    name: '🪓 綠皮荒原要塞（哥布林/獸人/食人魔/巨魔）',
    center: { x: 52, z: 26 },
    radius: 30,
    safe: false
  },
  zombieCavern: {
    id: 'zombieCavern',
    name: '☠️ 幽暗屍毒山洞（殭屍感染區 · 內有上古寶物）',
    center: { x: 54, z: -46 },
    radius: 24,
    safe: false
  },
  gnomeForest: {
    id: 'gnomeForest',
    name: '🍄 地精與吸血鬼血林（地精/吸血鬼領主）',
    center: { x: -52, z: 14 },
    radius: 28,
    safe: false
  },
  greekPantheon: {
    id: 'greekPantheon',
    name: '🏛️ 克里特迷宮與古希臘神殿（米諾陶洛斯 / 梅杜莎 / 獨眼巨人 / 九頭蛇 Boss）',
    center: { x: -54, z: -50 },
    radius: 30,
    safe: false
  },
  dragonLair: {
    id: 'dragonLair',
    name: '🌋 火山世界吞噬者巢穴（煉獄古龍 Boss）',
    center: { x: 0, z: -72 },
    radius: 28,
    safe: false
  }
};

/**
 * Significantly buffed monster stats & diverse mechanics!
 */
export const MOB_TYPES = {
  goblin: {
    type: 'goblin',
    name: '哥布林劫掠者',
    level: 3,
    maxHp: 135,
    atk: 22,
    speed: 6.4,
    aggroRange: 18,
    attackRange: 2.3,
    attackCooldown: 1.15,
    expReward: 34,
    goldReward: 26,
    respawnTime: 6,
    radius: 0.9
  },
  orc: {
    type: 'orc',
    name: '🪓 獸人狂戰士',
    level: 6,
    maxHp: 320,
    atk: 38,
    speed: 6.2,
    aggroRange: 20,
    attackRange: 2.8,
    attackCooldown: 1.35,
    enrage: true, // +45% speed & damage below 50% HP
    expReward: 75,
    goldReward: 58,
    respawnTime: 9,
    radius: 1.25
  },
  ogre: {
    type: 'ogre',
    name: '🏏 食人魔碎骨者',
    level: 8,
    maxHp: 620,
    atk: 58,
    speed: 4.8,
    aggroRange: 20,
    attackRange: 3.4,
    attackCooldown: 2.0,
    stomp: true, // Heavy knockback slam
    expReward: 135,
    goldReward: 110,
    respawnTime: 13,
    radius: 1.75
  },
  troll: {
    type: 'troll',
    name: '🌿 嗜血森林巨魔',
    level: 7,
    maxHp: 460,
    atk: 44,
    speed: 5.9,
    aggroRange: 20,
    attackRange: 3.0,
    attackCooldown: 1.45,
    regen: 18, // Regenerates 18 HP/sec unless burning!
    expReward: 105,
    goldReward: 82,
    respawnTime: 11,
    radius: 1.35
  },
  gnome: {
    type: 'gnome',
    name: '💣 地精炸彈客',
    level: 5,
    maxHp: 230,
    atk: 35,
    speed: 6.8,
    aggroRange: 19,
    attackRange: 8.5,
    attackCooldown: 1.8,
    expReward: 68,
    goldReward: 52,
    respawnTime: 8,
    radius: 0.85
  },
  zombie: {
    type: 'zombie',
    name: '🧟 屍毒腐爛殭屍',
    level: 6,
    maxHp: 250,
    atk: 32,
    speed: 5.8,
    aggroRange: 22,
    attackRange: 2.2,
    attackCooldown: 1.1,
    infect: true, // Inflicts Zombie Plague Infection (DoT + 30% slow)!
    undead: true,
    expReward: 64,
    goldReward: 46,
    respawnTime: 5,
    radius: 0.95
  },
  vampire: {
    type: 'vampire',
    name: '🦇 暗夜吸血鬼領主',
    level: 9,
    maxHp: 680,
    atk: 54,
    speed: 7.6,
    aggroRange: 24,
    attackRange: 3.2,
    attackCooldown: 1.25,
    lifesteal: 0.65, // Heals 65% of damage dealt to player!
    undead: true,
    isMiniBoss: true,
    expReward: 180,
    goldReward: 155,
    respawnTime: 14,
    radius: 1.15
  },
  minotaur: {
    type: 'minotaur',
    name: '🐂 米諾陶洛斯・迷宮牛頭人王',
    level: 11,
    maxHp: 1150,
    atk: 66,
    speed: 6.7,
    aggroRange: 25,
    attackRange: 3.5,
    attackCooldown: 1.45,
    stomp: true, // Heavy dual-axe labyrinth tremor & knockback
    enrage: true,
    isBoss: true,
    expReward: 290,
    goldReward: 245,
    respawnTime: 16,
    radius: 1.6
  },
  medusa: {
    type: 'medusa',
    name: '🐍 梅杜莎・蛇髮女妖戈爾貢',
    level: 12,
    maxHp: 1280,
    atk: 62,
    speed: 6.5,
    aggroRange: 25,
    attackRange: 8.2,
    attackCooldown: 1.75,
    petrify: true, // Petrifying Gaze: heavy slow + magic damage
    isBoss: true,
    expReward: 340,
    goldReward: 290,
    respawnTime: 18,
    radius: 1.4
  },
  cyclops: {
    type: 'cyclops',
    name: '👁️ 波呂斐摩斯・獨眼巨人泰坦',
    level: 13,
    maxHp: 1750,
    atk: 78,
    speed: 5.4,
    aggroRange: 26,
    attackRange: 4.0,
    attackCooldown: 2.0,
    stomp: true, // Colossal marble pillar smash
    isBoss: true,
    expReward: 420,
    goldReward: 360,
    respawnTime: 20,
    radius: 2.05
  },
  hydra: {
    type: 'hydra',
    name: '🐉 九頭蛇海德拉・深淵神話巨獸',
    level: 15,
    maxHp: 2500,
    atk: 84,
    speed: 6.0,
    aggroRange: 28,
    attackRange: 5.5,
    attackCooldown: 1.85,
    breathCooldown: 4.8,
    regen: 24, // Immortal Hydra regen (cauterized by Fire!)
    infect: true, // Venomous Hydra breath inflicts poison infection!
    isBoss: true,
    expReward: 640,
    goldReward: 560,
    respawnTime: 24,
    radius: 2.9
  },
  dragon: {
    type: 'dragon',
    name: '🔥 奧杜因・煉獄古龍',
    level: 14,
    maxHp: 2200,
    atk: 78,
    speed: 6.2,
    aggroRange: 28,
    attackRange: 7.0,
    attackCooldown: 2.1,
    breathCooldown: 5.2,
    expReward: 550,
    goldReward: 480,
    respawnTime: 22,
    radius: 3.5,
    isBoss: true
  }
};

export function expForNextLevel(level) {
  return Math.floor(85 * Math.pow(level, 1.35));
}

export function computePlayerStats(state) {
  const weapon = SHOP_ITEMS[state.weaponId] || SHOP_ITEMS.wood_sword;
  const armor = SHOP_ITEMS[state.armorId] || SHOP_ITEMS.cloth_tunic;
  const lvl = Math.max(1, state.level || 1);
  const perks = state.perks || {};
  const scrolls = state.scrolls || [];

  const hullRanks = perks.dragonblood_hull || 0;
  const mightRanks = perks.berserker_might || 0;
  const hasteRanks = perks.arcane_haste || 0;
  const windRanks = perks.wind_stride || 0;
  const vampRanks = perks.vampiric_bite || 0;
  const greedRanks = perks.golden_greed || 0;

  const hasSovngarde = scrolls.includes('scroll_sovngarde');
  const hasBloodmoon = scrolls.includes('scroll_bloodmoon');
  const hasOblivion = scrolls.includes('scroll_oblivion');
  const hasDragonborn = scrolls.includes('scroll_dragonborn');

  const rawAtk = 12 + (lvl - 1) * 5 + (weapon.atk || 0);
  const atkMult = 1 + mightRanks * 0.22;

  return {
    maxHp: 120 + (lvl - 1) * 26 + (armor.bonusHp || 0) + hullRanks * 110 + (hasSovngarde ? 180 : 0),
    maxMp: 100 + (lvl - 1) * 12 + (weapon.bonusMp || 0),
    atk: Math.round(rawAtk * atkMult),
    def: 3 + Math.floor((lvl - 1) * 1.8) + (armor.def || 0) + hullRanks * 7,
    speedMult: 1 + windRanks * 0.14,
    cdReduction: Math.min(0.55, hasteRanks * 0.14),
    lifesteal: (weapon.lifestealBonus || 0) + vampRanks * 0.08 + (hasBloodmoon ? 0.1 : 0),
    goldExpMult: 1 + greedRanks * 0.35,
    skillBonusMult: hasOblivion ? 1.3 : 1.0,
    shoutBonusMult: hasDragonborn ? 1.5 : 1.0,
    passiveHpRegen: hasSovngarde ? 8 : 0,
    poisonResist: Math.min(0.8, hullRanks * 0.25 + (armor.id === 'dragon_armor' ? 0.35 : 0) + (armor.id === 'aegis_armor' ? 0.5 : 0)),
    weapon,
    armor
  };
}
