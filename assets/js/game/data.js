/**
 * JUMP 3D Fantasy RPG — Game Data Tables
 * Equipment, Elf Shop catalog, 4 Elemental Skills, Monster definitions, and Zones.
 */

export const DEFAULT_APPEARANCE = {
  hairStyle: 'short',       // short | long | ponytail | spiky
  hairColor: '#3b2f2f',
  skinColor: '#f5cfa0',
  eyeColor: '#2563eb',
  elfEars: false,
  outfitPrimary: '#4f46e5',
  outfitSecondary: '#e2e8f0',
  cape: true,
  capeColor: '#7c3aed',
  heightScale: 1.0          // 0.88 - 1.14
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
  kills: { goblin: 0, gnome: 0, dragon: 0 }
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
    price: 150,
    atk: 24,
    bonusMp: 10,
    elementBonus: null,
    style: 'rapier',
    color: '#e2e8f0',
    glow: '#38bdf8',
    desc: '輕盈鋒利的精靈鍛造銀劍。'
  },
  thunder_blade: {
    id: 'thunder_blade',
    category: 'weapon',
    name: '⚡ 雷鳴戰刃',
    price: 380,
    atk: 36,
    bonusMp: 20,
    elementBonus: { type: 'lightning', mult: 1.35 },
    style: 'greatsword',
    color: '#60a5fa',
    glow: '#38bdf8',
    desc: '纏繞電弧的戰刃，雷電技能傷害 +35%。'
  },
  flame_greatsword: {
    id: 'flame_greatsword',
    category: 'weapon',
    name: '🔥 炎魔巨劍',
    price: 420,
    atk: 42,
    bonusMp: 15,
    elementBonus: { type: 'fire', mult: 1.35 },
    style: 'greatsword',
    color: '#f97316',
    glow: '#ef4444',
    desc: '火山鍛造的烈焰巨劍，火焰技能傷害 +35%。'
  },
  tide_staff: {
    id: 'tide_staff',
    category: 'weapon',
    name: '💧 潮汐法杖',
    price: 360,
    atk: 28,
    bonusMp: 55,
    elementBonus: { type: 'water', mult: 1.4 },
    style: 'staff',
    color: '#06b6d4',
    glow: '#22d3ee',
    desc: '大幅提升魔力上限，水系治療與擊退效果 +40%。'
  },
  earth_hammer: {
    id: 'earth_hammer',
    category: 'weapon',
    name: '🪨 大地戰錘',
    price: 460,
    atk: 46,
    bonusMp: 15,
    elementBonus: { type: 'earth', mult: 1.35 },
    style: 'hammer',
    color: '#a8a29e',
    glow: '#eab308',
    desc: '沉重無比的巨岩戰錘，地系突刺傷害 +35%。'
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
    price: 160,
    def: 8,
    bonusHp: 50,
    tint: '#10b981',
    desc: '以古樹纖維編織，提升血量 +50、防禦 +8。'
  },
  mithril_plate: {
    id: 'mithril_plate',
    category: 'armor',
    name: '秘銀聖鎧',
    price: 380,
    def: 16,
    bonusHp: 130,
    tint: '#94a3b8',
    desc: '閃耀銀輝的輕盈重甲，血量 +130、防禦 +16。'
  },
  dragon_armor: {
    id: 'dragon_armor',
    category: 'armor',
    name: '🐉 龍鱗霸王鎧',
    price: 720,
    def: 28,
    bonusHp: 260,
    tint: '#dc2626',
    desc: '以巨龍逆鱗鍛造的傳說鎧甲，血量 +260、防禦 +28。'
  },

  // === Consumables ===
  hp_potion: {
    id: 'hp_potion',
    category: 'consumable',
    name: '🧪 精靈生命藥水',
    price: 35,
    potionKey: 'hp',
    healHp: 85,
    desc: '立即回復 85 點生命值（快捷鍵 1）。'
  },
  mp_potion: {
    id: 'mp_potion',
    category: 'consumable',
    name: '💧 精靈魔力藥水',
    price: 30,
    potionKey: 'mp',
    healMp: 60,
    desc: '立即回復 60 點魔力值（快捷鍵 2）。'
  }
};

export const SKILLS = {
  lightning: {
    id: 'lightning',
    key: 'Q',
    name: '雷電',
    icon: '⚡',
    mpCost: 22,
    cooldown: 4.0,
    range: 16,
    damageMult: 2.1,
    chainCount: 3,
    chainRadius: 7,
    color: '#38bdf8',
    desc: '天降雷柱造成高爆發傷害並連鎖彈跳附近敵人，短暫麻痺減速。'
  },
  fire: {
    id: 'fire',
    key: 'E',
    name: '火焰',
    icon: '🔥',
    mpCost: 24,
    cooldown: 5.0,
    range: 20,
    aoeRadius: 5.5,
    damageMult: 1.9,
    burnDamage: 10,
    burnDuration: 3.5,
    color: '#f97316',
    desc: '發射爆裂火球造成大範圍爆炸傷害，並附加灼燒持續扣血。'
  },
  water: {
    id: 'water',
    key: 'R',
    name: '水',
    icon: '💧',
    mpCost: 26,
    cooldown: 6.5,
    aoeRadius: 7.5,
    healBase: 45,
    damageMult: 1.1,
    knockback: 7.5,
    color: '#06b6d4',
    desc: '釋放潮汐水環，回復自己與附近隊友血量，同時擊退並減速周圍敵人。'
  },
  earth: {
    id: 'earth',
    key: 'F',
    name: '地',
    icon: '🪨',
    mpCost: 25,
    cooldown: 7.0,
    range: 11,
    damageMult: 1.85,
    shieldDuration: 5.5,
    shieldReduction: 0.45,
    color: '#eab308',
    desc: '前方竄出巨岩尖刺擊飛敵人，同時為自己套上 5.5 秒岩石減傷護盾。'
  }
};

export const ZONES = {
  village: {
    id: 'village',
    name: '🌿 精靈村莊（安全區）',
    center: { x: 0, z: 0 },
    radius: 26,
    safe: true
  },
  goblinCamp: {
    id: 'goblinCamp',
    name: '⚔️ 哥布林營地（Lv.1-3）',
    center: { x: 46, z: 22 },
    radius: 24,
    safe: false
  },
  gnomeForest: {
    id: 'gnomeForest',
    name: '🍄 地精蘑菇林（Lv.4-7）',
    center: { x: -48, z: 16 },
    radius: 24,
    safe: false
  },
  dragonLair: {
    id: 'dragonLair',
    name: '🌋 火山巨龍巢穴（Boss）',
    center: { x: 0, z: -64 },
    radius: 28,
    safe: false
  }
};

export const MOB_TYPES = {
  goblin: {
    type: 'goblin',
    name: '哥布林',
    level: 2,
    maxHp: 85,
    atk: 11,
    speed: 5.2,
    aggroRange: 14,
    attackRange: 2.3,
    attackCooldown: 1.4,
    expReward: 28,
    goldReward: 22,
    respawnTime: 8,
    radius: 0.9
  },
  gnome: {
    type: 'gnome',
    name: '地精炸彈客',
    level: 5,
    maxHp: 175,
    atk: 20,
    speed: 6.4,
    aggroRange: 17,
    attackRange: 7.5, // Throws bombs from mid-range
    attackCooldown: 2.1,
    expReward: 62,
    goldReward: 48,
    respawnTime: 11,
    radius: 0.85
  },
  dragon: {
    type: 'dragon',
    name: '🔥 煉獄古龍',
    level: 10,
    maxHp: 950,
    atk: 38,
    speed: 5.6,
    aggroRange: 24,
    attackRange: 6.5,
    attackCooldown: 2.6,
    breathCooldown: 7.0,
    expReward: 320,
    goldReward: 260,
    respawnTime: 25,
    radius: 3.4,
    isBoss: true
  }
};

export function expForNextLevel(level) {
  return Math.floor(80 * Math.pow(level, 1.38));
}

export function computePlayerStats(state) {
  const weapon = SHOP_ITEMS[state.weaponId] || SHOP_ITEMS.wood_sword;
  const armor = SHOP_ITEMS[state.armorId] || SHOP_ITEMS.cloth_tunic;
  const lvl = Math.max(1, state.level || 1);
  return {
    maxHp: 110 + (lvl - 1) * 22 + (armor.bonusHp || 0),
    maxMp: 95 + (lvl - 1) * 10 + (weapon.bonusMp || 0),
    atk: 10 + (lvl - 1) * 4 + (weapon.atk || 0),
    def: 2 + Math.floor((lvl - 1) * 1.5) + (armor.def || 0),
    weapon,
    armor
  };
}
