/**
 * JUMP 3D Fantasy Action Roguelike RPG — Game Data Tables (v4.0 World Expansion)
 * Features:
 * - 11 Distinct Biomes (Elf Village, Greenskin Warfront, Zombie Cavern, Blood Forest,
 *   Greek Pantheon, Dragon Volcano, Ocean Abyss, Frost Peaks, Cthulhu R'lyeh,
 *   Japanese Yokai Shrine, Mayan Pyramid)
 * - 28 Monster & Mythic Boss Species with Dynamic Adaptive Player-Level Scaling
 * - Monster Hunter × Baldur's Gate Material Drop & Blacksmith Crafting System
 * - Pricier Gold Shop Gear + Craft-Only Endgame Mythic Weapons & Armors
 */

export const DEFAULT_APPEARANCE = {
  hairStyle: 'spiky',
  hairColor: '#3b2f2f',
  skinColor: '#f5cfa0',
  eyeStyle: 'normal',
  eyeColor: '#2563eb',
  earStyle: 'human',
  elfEars: false,
  faceAccessory: 'none',
  headgear: 'none',
  wingStyle: 'none',
  wingColor: '#f8fafc',
  outfitPrimary: '#4f46e5',
  outfitSecondary: '#e2e8f0',
  cape: true,
  capeColor: '#7c3aed',
  heightScale: 1.0,
  bodyWidthScale: 1.0
};

export const RPG_DATA_EPOCH = 2;
export const MAX_PERK_LEVEL = 5;

export const DEFAULT_PLAYER_STATE = {
  dataEpoch: RPG_DATA_EPOCH,
  level: 1,
  exp: 0,
  gold: 150,
  hp: 130,
  mp: 100,
  weaponId: 'wood_sword',
  armorId: 'cloth_tunic',
  ownedItems: ['wood_sword', 'cloth_tunic'],
  potions: { hp: 3, mp: 3, megaHp: 0, elixir: 0 },
  perks: {},          // { perkId: levelCount (max 5) }
  scrolls: [],        // Collected Elder Scroll IDs
  materials: {},      // { materialId: count } — Monster Hunter & Baldur's Gate Crafting Pouch
  kills: {}
};

/**
 * Monster Hunter × Baldur's Gate Rare Crafting Materials
 */
export const MATERIALS = {
  greenskin_fang: {
    id: 'greenskin_fang',
    name: '🦷 綠皮狂戰獠牙',
    rarity: 'uncommon',
    source: '綠皮荒原（哥布林 / 獸人 / 食人魔 / 巨魔）'
  },
  plague_ichor: {
    id: 'plague_ichor',
    name: '🧪 腐化屍毒結晶',
    rarity: 'uncommon',
    source: '幽暗屍毒山洞（殭屍 / 天際屍鬼死靈大君）'
  },
  vampire_heart: {
    id: 'vampire_heart',
    name: '🩸 真祖鮮血之心',
    rarity: 'rare',
    source: '吸血鬼血林（暗夜吸血鬼真祖）'
  },
  olympus_bronze: {
    id: 'olympus_bronze',
    name: '🏛️ 奧林帕斯秘銀青銅',
    rarity: 'rare',
    source: '古希臘神殿（米諾陶洛斯 / 梅杜莎 / 獨眼巨人 / 半人馬 / 地獄犬 / 奇美拉）'
  },
  hydra_venom_gland: {
    id: 'hydra_venom_gland',
    name: '☠️ 九頭蛇不死毒腺',
    rarity: 'epic',
    source: '古希臘神殿（九頭蛇海德拉）'
  },
  dragon_scale: {
    id: 'dragon_scale',
    name: '🔥 煉獄古龍逆鱗',
    rarity: 'epic',
    source: '火山巢穴（煉獄古龍奧杜因）'
  },
  frost_dragon_heart: {
    id: 'frost_dragon_heart',
    name: '❄️ 冰霜古龍寒核',
    rarity: 'epic',
    source: '凜冬雪峰高山（冰霜古龍辛達苟薩 / 雪怪）'
  },
  storm_dragon_pearl: {
    id: 'storm_dragon_pearl',
    name: '⚡ 蒼穹雷龍天珠',
    rarity: 'epic',
    source: '凜冬雪峰高山（蒼穹雷霆古龍巴哈姆特）'
  },
  abyssal_pearl: {
    id: 'abyssal_pearl',
    name: '🌊 克拉肯深海魔珠',
    rarity: 'epic',
    source: '無盡海溝（北海巨妖克拉肯 / 利維坦海龍）'
  },
  eldritch_eye: {
    id: 'eldritch_eye',
    name: '👁️ 舊日支配者魔眼',
    rarity: 'mythic',
    source: '拉萊耶深淵（克蘇魯 / 修格斯 / 深潛者）'
  },
  yokai_spirit_orb: {
    id: 'yokai_spirit_orb',
    name: '🦊 妖狐殺生石妖魂',
    rarity: 'epic',
    source: '妖霧鳥居神社（九尾妖狐 / 大天狗 / 酒吞童子）'
  },
  orochi_kusanagi_shard: {
    id: 'orochi_kusanagi_shard',
    name: '🐍 八岐大蛇天叢雲殘片',
    rarity: 'mythic',
    source: '妖霧鳥居神社（八岐大蛇）'
  },
  mayan_sun_jade: {
    id: 'mayan_sun_jade',
    name: '🗿 馬雅太陽神翡翠',
    rarity: 'epic',
    source: '馬雅黃金金字塔（羽蛇神庫庫爾坎 / 美洲豹戰士）'
  },
  balduran_mithral: {
    id: 'balduran_mithral',
    name: '✨ 柏德安秘銀礦石',
    rarity: 'mythic',
    source: '山洞秘寶箱必掉 · 全世界 Boss 額外稀有掉落'
  }
};

/**
 * Equipment, Potions & Endgame Craft-Only Mythic Arsenal
 * - shop items have significantly higher gold prices for true progression
 * - craftOnly: true items CANNOT be bought with gold alone; players must hunt bosses & craft at the Dwarf Blacksmith!
 */
export const SHOP_ITEMS = {
  // === Starter & Gold Shop Weapons (Pricier Progression!) ===
  wood_sword: {
    id: 'wood_sword',
    category: 'weapon',
    name: '新手木劍',
    price: 0,
    atk: 14,
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
    price: 420,
    atk: 30,
    bonusMp: 18,
    elementBonus: { type: 'water', mult: 1.25 },
    style: 'rapier',
    color: '#e0f2fe',
    glow: '#38bdf8',
    desc: '輕盈鋒利的精靈鍛造刺劍，水系技能傷害與治療 +25%。'
  },
  flame_blade: {
    id: 'flame_blade',
    category: 'weapon',
    name: '烈焰符文長劍',
    price: 880,
    atk: 48,
    bonusMp: 20,
    elementBonus: { type: 'fire', mult: 1.35 },
    style: 'sword',
    color: '#f97316',
    glow: '#fb923c',
    desc: '劍身纏繞精靈火焰符文，火球傷害 +35%（壓制巨魔與九頭蛇回血利器）。'
  },
  storm_staff: {
    id: 'storm_staff',
    category: 'weapon',
    name: '暴風雷鳴法杖',
    price: 1150,
    atk: 54,
    bonusMp: 65,
    elementBonus: { type: 'lightning', mult: 1.4 },
    style: 'staff',
    color: '#38bdf8',
    glow: '#7dd3fc',
    desc: '引動天雷的古樹結晶法杖，魔力上限 +65、雷電連鎖傷害 +40%。'
  },
  titan_hammer: {
    id: 'titan_hammer',
    category: 'weapon',
    name: '泰坦碎地戰錘',
    price: 1480,
    atk: 66,
    bonusMp: 25,
    elementBonus: { type: 'earth', mult: 1.42 },
    style: 'hammer',
    color: '#a8a29e',
    glow: '#eab308',
    desc: '能與食人魔正面硬撼的巨錘，地系突刺傷害 +42%。'
  },
  lathander_mace: {
    id: 'lathander_mace',
    category: 'weapon',
    name: '🌅 洛山達之血・聖光晨星錘',
    price: 2250,
    atk: 86,
    bonusMp: 45,
    undeadSlayer: 1.45,
    elementBonus: { type: 'fire', mult: 1.4 },
    style: 'hammer',
    color: '#fde047',
    glow: '#f59e0b',
    desc: '【柏德之門聖物】蘊含晨曦之主神輝的聖錘，對不死族傷害 145%、火系 +40%。'
  },
  dawnbreaker: {
    id: 'dawnbreaker',
    category: 'weapon',
    name: '☀️ 破曉者（上古魔神聖劍）',
    price: 3100,
    atk: 102,
    bonusMp: 50,
    undeadSlayer: 1.65,
    elementBonus: { type: 'fire', mult: 1.48 },
    style: 'sword',
    color: '#fef08a',
    glow: '#f59e0b',
    desc: '【上古卷軸神器】美瑞蒂雅賜予的聖光之劍，對殭屍、屍鬼與吸血鬼造成 165% 聖炎傷害！'
  },

  // === CRAFT-ONLY Mythic Weapons (Must Hunt Materials & Forge at Dwarf Blacksmith!) ===
  daedric_greatsword: {
    id: 'daedric_greatsword',
    category: 'weapon',
    craftOnly: true,
    rarity: 'epic',
    craftGold: 950,
    recipe: { vampire_heart: 2, plague_ichor: 3, greenskin_fang: 4 },
    name: '🩸 魔族湮滅巨劍（Daedric）',
    price: 0,
    atk: 132,
    bonusMp: 45,
    lifestealBonus: 0.03,
    elementBonus: { type: 'lightning', mult: 1.5 },
    style: 'greatsword',
    color: '#18181b',
    glow: '#dc2626',
    desc: '【鍛造限定・上古卷軸】以真祖鮮血之心與屍毒結晶鍛造的黑紅魔劍，附帶 3% 鮮血汲取！'
  },
  poseidon_trident: {
    id: 'poseidon_trident',
    category: 'weapon',
    craftOnly: true,
    rarity: 'epic',
    craftGold: 1350,
    recipe: { olympus_bronze: 3, abyssal_pearl: 2, hydra_venom_gland: 1 },
    name: '🔱 波賽頓海神三叉戟',
    price: 0,
    atk: 152,
    bonusMp: 75,
    lifestealBonus: 0.03,
    elementBonus: { type: 'water', mult: 1.75 },
    style: 'trident',
    color: '#06b6d4',
    glow: '#22d3ee',
    desc: '【鍛造限定・古希臘神話】統御深海的三叉戟，水系傷害與治療 +75%、吸血 3%！'
  },
  zeus_bolt: {
    id: 'zeus_bolt',
    category: 'weapon',
    craftOnly: true,
    rarity: 'epic',
    craftGold: 1650,
    recipe: { olympus_bronze: 4, storm_dragon_pearl: 2, balduran_mithral: 1 },
    name: '⚡ 宙斯雷霆神矛（Master Bolt）',
    price: 0,
    atk: 176,
    bonusMp: 95,
    elementBonus: { type: 'lightning', mult: 1.9 },
    style: 'spear',
    color: '#fef08a',
    glow: '#38bdf8',
    desc: '【鍛造限定・奧林帕斯至高神器】宙斯雷霆長矛，雷電天罰傷害 +90%！'
  },
  kusanagi_katana: {
    id: 'kusanagi_katana',
    category: 'weapon',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 1950,
    recipe: { orochi_kusanagi_shard: 2, yokai_spirit_orb: 3, balduran_mithral: 2 },
    name: '⛩️ 天叢雲劍・草薙（Kusanagi）',
    price: 0,
    atk: 198,
    bonusMp: 70,
    lifestealBonus: 0.03,
    bossSlayer: 1.25,
    elementBonus: { type: 'all', mult: 1.45 },
    style: 'katana',
    color: '#f8fafc',
    glow: '#c084fc',
    desc: '【鍛造限定・日本神話三神器】自八岐大蛇尾斬獲的神刀，全元素傷害 +45%、吸血 3%、對 Boss +25% 傷害！'
  },
  kukulkan_spear: {
    id: 'kukulkan_spear',
    category: 'weapon',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 2100,
    recipe: { mayan_sun_jade: 3, storm_dragon_pearl: 2, dragon_scale: 1 },
    name: '🪶 羽蛇神太陽神槍（Kukulkan）',
    price: 0,
    atk: 206,
    bonusMp: 90,
    elementBonus: { type: 'fire', mult: 1.95 },
    bossSlayer: 1.25,
    style: 'spear',
    color: '#10b981',
    glow: '#fde047',
    desc: '【鍛造限定・馬雅太陽神兵】鑲嵌羽蛇神翡翠的黃金長槍，火系灼燒傷害 +95%、對 Boss +25% 傷！'
  },
  necronomicon_staff: {
    id: 'necronomicon_staff',
    category: 'weapon',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 2350,
    recipe: { eldritch_eye: 3, abyssal_pearl: 2, balduran_mithral: 2 },
    name: '🐙 拉萊耶死靈魔導權杖（Cthulhu）',
    price: 0,
    atk: 214,
    bonusMp: 160,
    lifestealBonus: 0.04,
    elementBonus: { type: 'all', mult: 1.65 },
    style: 'tome_staff',
    color: '#a855f7',
    glow: '#22c55e',
    desc: '【鍛造限定・克蘇魯舊日秘寶】凝視深淵的瘋狂法杖，魔力 +160、全技能傷害 +65%、吸血 4%！'
  },
  balduran_giantslayer: {
    id: 'balduran_giantslayer',
    category: 'weapon',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 2650,
    recipe: { balduran_mithral: 3, dragon_scale: 2, olympus_bronze: 3, frost_dragon_heart: 1 },
    name: '⚔️ 柏德安屠龍巨劍（Giantslayer）',
    price: 0,
    atk: 245,
    bonusMp: 60,
    bossSlayer: 1.45,
    elementBonus: { type: 'all', mult: 1.4 },
    style: 'dragon_blade',
    color: '#fbbf24',
    glow: '#f59e0b',
    desc: '【鍛造限定・柏德之門 3 傳說巨劍】斬殺巨龍與泰坦的傳奇聖劍，對所有 Boss 造成 145% 毀滅傷害！'
  },
  fatalis_blade: {
    id: 'fatalis_blade',
    category: 'weapon',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 4200,
    recipe: { dragon_scale: 3, frost_dragon_heart: 2, storm_dragon_pearl: 2, eldritch_eye: 2, balduran_mithral: 4 },
    name: '🐉 黑龍滅盡・終焉屠神大劍（Fatalis）',
    price: 0,
    atk: 320,
    bonusMp: 120,
    lifestealBonus: 0.05,
    bossSlayer: 1.55,
    undeadSlayer: 1.5,
    elementBonus: { type: 'all', mult: 1.85 },
    style: 'dragon_blade',
    color: '#09090b',
    glow: '#ef4444',
    desc: '【終極魔物獵人鍛造神兵】融合三古龍逆鱗與舊日魔眼的禁忌巨劍！全元素 +85%、吸血 5%、對 Boss 155% 傷！'
  },

  // === Starter & Gold Shop Armors ===
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
    price: 460,
    def: 12,
    bonusHp: 90,
    tint: '#10b981',
    desc: '以古樹纖維編織，提升血量 +90、防禦 +12。'
  },
  mithril_plate: {
    id: 'mithril_plate',
    category: 'armor',
    name: '烏木重鎧（Ebony Armor）',
    price: 1280,
    def: 26,
    bonusHp: 220,
    tint: '#334155',
    desc: '【上古卷軸名甲】深邃烏木鍛造，血量 +220、防禦 +26。'
  },
  helldusk_armor: {
    id: 'helldusk_armor',
    category: 'armor',
    name: '🔥 黯獄重甲（Helldusk Armor）',
    price: 2600,
    def: 42,
    bonusHp: 420,
    tint: '#7f1d1d',
    poisonResist: 0.35,
    desc: '【柏德之門名鎧】地獄鍛造的暗紅重鎧，血量 +420、防禦 +42、異常抗性 +35%。'
  },

  // === CRAFT-ONLY Mythic Armors ===
  dragon_armor: {
    id: 'dragon_armor',
    category: 'armor',
    craftOnly: true,
    rarity: 'epic',
    craftGold: 1200,
    recipe: { dragon_scale: 2, greenskin_fang: 4, plague_ichor: 2 },
    name: '🐉 龍骨霸王鎧（Dragonbone）',
    price: 0,
    def: 56,
    bonusHp: 580,
    tint: '#dc2626',
    poisonResist: 0.45,
    desc: '【鍛造限定・上古卷軸】以古龍逆鱗鍛造，血量 +580、防禦 +56、屍毒與劇毒抗性 +45%！'
  },
  aegis_armor: {
    id: 'aegis_armor',
    category: 'armor',
    craftOnly: true,
    rarity: 'epic',
    craftGold: 1650,
    recipe: { olympus_bronze: 4, hydra_venom_gland: 2, balduran_mithral: 1 },
    name: '🏛️ 雅典娜埃吉斯黃金神鎧（Aegis）',
    price: 0,
    def: 72,
    bonusHp: 760,
    tint: '#facc15',
    poisonResist: 0.5,
    passiveRegen: 6,
    desc: '【鍛造限定・古希臘神話】奧林帕斯黃金神鎧，血量 +760、防禦 +72、每秒回血 +6、抗石化劇毒 50%！'
  },
  yokai_shogun_armor: {
    id: 'yokai_shogun_armor',
    category: 'armor',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 1900,
    recipe: { yokai_spirit_orb: 3, orochi_kusanagi_shard: 1, balduran_mithral: 2 },
    name: '⛩️ 妖狐百鬼大將軍神鎧',
    price: 0,
    def: 78,
    bonusHp: 820,
    tint: '#991b1b',
    speedBonus: 0.16,
    poisonResist: 0.45,
    desc: '【鍛造限定・日本百鬼】緋紅妖狐武士大鎧，血量 +820、防禦 +78、移動速度 +16%！'
  },
  cthulhu_starspawn_armor: {
    id: 'cthulhu_starspawn_armor',
    category: 'armor',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 2250,
    recipe: { eldritch_eye: 3, abyssal_pearl: 3, balduran_mithral: 2 },
    name: '🐙 舊日星辰・深淵克蘇魯神鎧',
    price: 0,
    def: 88,
    bonusHp: 980,
    tint: '#4c1d95',
    poisonResist: 0.6,
    passiveRegen: 10,
    desc: '【鍛造限定・克蘇魯神話】深淵星辰編織的魔神鎧，血量 +980、防禦 +88、每秒回血 +10、抗異常 60%！'
  },
  mayan_sunplate_armor: {
    id: 'mayan_sunplate_armor',
    category: 'armor',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 2400,
    recipe: { mayan_sun_jade: 3, olympus_bronze: 3, balduran_mithral: 2 },
    name: '🗿 馬雅太陽神翡翠黃金戰甲',
    price: 0,
    def: 94,
    bonusHp: 1080,
    tint: '#047857',
    poisonResist: 0.58,
    passiveRegen: 12,
    desc: '【鍛造限定・馬雅神話】羽蛇神太陽翡翠神鎧，血量 +1080、防禦 +94、每秒自動回血 +12！'
  },
  tridragon_sovereign_armor: {
    id: 'tridragon_sovereign_armor',
    category: 'armor',
    craftOnly: true,
    rarity: 'mythic',
    craftGold: 4000,
    recipe: { dragon_scale: 3, frost_dragon_heart: 3, storm_dragon_pearl: 3, balduran_mithral: 4 },
    name: '👑 三龍神威・天災古龍霸王神鎧',
    price: 0,
    def: 128,
    bonusHp: 1550,
    tint: '#1e1b4b',
    speedBonus: 0.14,
    poisonResist: 0.68,
    passiveRegen: 18,
    desc: '【終極魔物獵人防具】熔煉煉獄／冰霜／蒼穹三大古龍核心！血量 +1550、防禦 +128、移速 +14%、每秒回血 +18！'
  },

  // === Consumables & Alchemist Potions ===
  hp_potion: {
    id: 'hp_potion',
    category: 'consumable',
    name: '🧪 精靈生命聖水（兼解異常）',
    price: 85,
    potionKey: 'hp',
    healHp: 85,
    healPct: 0.26,
    desc: '回復 85 + 26% 最大生命並淨化屍毒、石化與冥火灼燒（冷卻 1.2 秒，快捷鍵 1）。'
  },
  mp_potion: {
    id: 'mp_potion',
    category: 'consumable',
    name: '💧 精靈魔力藥水',
    price: 75,
    potionKey: 'mp',
    healMp: 45,
    healPct: 0.32,
    desc: '回復 45 + 32% 最大魔力值（冷卻 1.2 秒，快捷鍵 2）。'
  },
  mega_hp_potion: {
    id: 'mega_hp_potion',
    category: 'alchemist',
    name: '🍷 柏德之門・至高治療秘藥組（×3 瓶）',
    price: 240,
    potionKey: 'hp',
    grantCount: 3,
    desc: '【鍊金賢者特供】一次獲得 3 瓶生命聖水（百分比回復），硬核 Boss 戰必備！'
  },
  perk_tome: {
    id: 'perk_tome',
    category: 'alchemist',
    name: '🔮 秘法重鑄卷軸（立即抽 1 次肉鴿祝福！）',
    price: 2200,
    instantEffect: 'grant_perk',
    desc: '【鍊金賢者密藏】立即開啟「上古肉鴿 3 選 1 天賦賜福」視窗，強化飛劍／光環／吸血！'
  },
  mithral_pouch: {
    id: 'mithral_pouch',
    category: 'alchemist',
    name: '✨ 柏德安秘銀結晶（鍛造素材 ×1）',
    price: 1450,
    instantEffect: 'grant_mithral',
    desc: '【柏德之門稀世礦石】直接購入 1 顆「✨ 柏德安秘銀礦石」用於鐵匠鍛造神兵。'
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
    range: 17,
    damageMult: 2.15,
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
    cooldown: 4.8,
    range: 20,
    aoeRadius: 6.2,
    damageMult: 2.0,
    burnDamage: 16,
    burnDuration: 4.2,
    color: '#f97316',
    desc: '發射爆裂火球轟炸敵群，附加灼燒並壓制巨魔、修格斯與九頭蛇回血！'
  },
  water: {
    id: 'water',
    key: 'R',
    name: '水',
    icon: '💧',
    mpCost: 28,
    cooldown: 8.5,
    aoeRadius: 8.2,
    healBase: 55,
    damageMult: 1.2,
    knockback: 8.5,
    color: '#06b6d4',
    desc: '釋放潮汐水環，回復自己與隊友血量、淨化屍毒／石化／冥火狀態，並擊退周圍敵群！'
  },
  earth: {
    id: 'earth',
    key: 'F',
    name: '地',
    icon: '🪨',
    mpCost: 26,
    cooldown: 7.2,
    range: 12,
    damageMult: 1.9,
    shieldDuration: 5.0,
    shieldReduction: 0.4,
    color: '#eab308',
    desc: '前方竄出巨岩尖刺擊飛敵群，並套上 5 秒減傷 40% 岩石護盾。'
  },
  shout: {
    id: 'shout',
    key: 'T',
    name: '龍吼',
    icon: '🗣️',
    mpCost: 18,
    cooldown: 9.5,
    range: 14,
    damageMult: 1.8,
    knockback: 14.5,
    color: '#fde047',
    desc: '【上古卷軸龍吼：不卸之力 Fus Ro Dah】發出震撼音波轟飛前方所有怪物與敵人！'
  }
};

export const ROGUELIKE_PERKS = [
  {
    id: 'orbit_blades',
    name: '🗡️ 環繞聖劍（吸血鬼獵人飛劍）',
    icon: '🗡️',
    desc: '角色周圍召喚自動旋轉的聖光飛劍，持續切割靠近的所有怪物（每層 +1 把飛劍與傷害）。'
  },
  {
    id: 'garlic_aura',
    name: '🔥 聖炎驅魔結界（大蒜光環）',
    icon: '🔥',
    desc: '腳下常駐神聖烈焰光環，每秒自動灼燒走近的怪物並壓制巨魔與九頭蛇回血。'
  },
  {
    id: 'auto_thunder',
    name: '⚡ 雷神自動落雷（閃電戒）',
    icon: '⚡',
    desc: '每隔 2.5 秒自動召喚一道天雷劈向附近的隨機敵人（每層提升傷害與頻率）。'
  },
  {
    id: 'frost_nova',
    name: '❄️ 寒霜新星脈衝',
    icon: '❄️',
    desc: '每隔 4.4 秒自動釋放冰霜新星，凍結緩速周圍所有怪物並造成冰傷。'
  },
  {
    id: 'vampiric_bite',
    name: '🦇 鮮血汲取（吸血鬼之力）',
    icon: '🦇',
    desc: '普攻命中回復造成傷害 1.6% 生命（自動武裝效率 15%，總吸血上限 12%，最高 Lv.5）。'
  },
  {
    id: 'berserker_might',
    name: '⚔️ 龍裔狂戰之力',
    icon: '⚔️',
    desc: '所有武器、元素技能與龍吼傷害永久提升 +16%（最高 Lv.5）。'
  },
  {
    id: 'dragonblood_hull',
    name: '🛡️ 上古龍血鐵壁',
    icon: '🛡️',
    desc: '最大生命值 +100、防禦 +7，並降低異常狀態 14% 傷害（最高 Lv.5）。'
  },
  {
    id: 'arcane_haste',
    name: '⏳ 瑪格努斯秘法冷卻',
    icon: '⏳',
    desc: '所有元素技能與龍吼冷卻時間縮短 11%，魔力回復速度提升（最高 Lv.5）。'
  },
  {
    id: 'wind_stride',
    name: '💨 暗影疾風步',
    icon: '💨',
    desc: '移動速度 +12%，翻滾無敵閃避冷卻縮短（最高 Lv.5）。'
  },
  {
    id: 'golden_greed',
    name: '🧲 帝國黃金磁鐵',
    icon: '🧲',
    desc: '擊殺怪物與開啟山洞寶箱獲得的金幣與經驗值 +30%，並提升稀有素材掉落率！'
  }
];

export const ELDER_SCROLLS = [
  {
    id: 'scroll_dragonborn',
    name: '📜《上古卷軸：龍裔》',
    bonusDesc: '龍吼（T）傷害 +45%、擊飛威力更強'
  },
  {
    id: 'scroll_bloodmoon',
    name: '📜《上古卷軸：血月》',
    bonusDesc: '全攻擊附帶 +3% 吸血、暴擊率 +12%'
  },
  {
    id: 'scroll_oblivion',
    name: '📜《上古卷軸：湮滅》',
    bonusDesc: '四大元素技能（雷/火/水/地）傷害與治療量 +25%'
  },
  {
    id: 'scroll_sovngarde',
    name: '📜《上古卷軸：松加德》',
    bonusDesc: '最大生命 +200、每秒自動回血 +6'
  }
];

/**
 * 11 Distinct 3D World Zones across the expanded ±205m Fantasy World!
 */
export const ZONES = {
  village: {
    id: 'village',
    name: '🌿 精靈村莊（安全區 · 商人 / 矮人鐵匠 / 鍊金賢者 / 圖鑑導師）',
    center: { x: 0, z: 0 },
    radius: 26,
    safe: true
  },
  greenskinWarfront: {
    id: 'greenskinWarfront',
    name: '🪓 綠皮荒原要塞（哥布林 / 獸人 / 食人魔 / 巨魔）',
    center: { x: 52, z: 26 },
    radius: 30,
    safe: false
  },
  zombieCavern: {
    id: 'zombieCavern',
    name: '☠️ 幽暗屍毒山洞（殭屍 / 天際屍鬼大君 · 內有上古秘寶箱）',
    center: { x: 54, z: -46 },
    radius: 25,
    safe: false
  },
  gnomeForest: {
    id: 'gnomeForest',
    name: '🍄 地精與吸血鬼血林（地精炸彈客 / 吸血鬼真祖）',
    center: { x: -52, z: 14 },
    radius: 28,
    safe: false
  },
  greekPantheon: {
    id: 'greekPantheon',
    name: '🏛️ 克里特迷宮與古希臘神殿（米諾陶洛斯 / 梅杜莎 / 獨眼巨人 / 地獄犬 / 奇美拉 / 九頭蛇）',
    center: { x: -56, z: -52 },
    radius: 32,
    safe: false
  },
  dragonLair: {
    id: 'dragonLair',
    name: '🌋 火山世界吞噬者巢穴（煉獄古龍奧杜因 Boss）',
    center: { x: 0, z: -84 },
    radius: 28,
    safe: false
  },
  oceanAbyss: {
    id: 'oceanAbyss',
    name: '🌊 無盡海溝與亞特蘭提斯海灣（北海巨妖克拉肯 / 利維坦深淵海龍）',
    center: { x: 0, z: 92 },
    radius: 38,
    safe: false
  },
  frostPeaks: {
    id: 'frostPeaks',
    name: '🏔️ 凜冬雪峰高山（喜馬拉雅雪怪 / 冰霜古龍 / 蒼穹雷霆古龍）',
    center: { x: 108, z: -102 },
    radius: 38,
    safe: false
  },
  cthulhuRlyeh: {
    id: 'cthulhuRlyeh',
    name: '🐙 拉萊耶克蘇魯深淵遺跡（深潛者 / 修格斯 / 舊日支配者克蘇魯）',
    center: { x: -106, z: 92 },
    radius: 38,
    safe: false
  },
  yokaiShrine: {
    id: 'yokaiShrine',
    name: '⛩️ 妖霧鳥居・日本百鬼神社（大天狗 / 酒吞童子 / 九尾妖狐 / 八岐大蛇）',
    center: { x: 118, z: 16 },
    radius: 36,
    safe: false
  },
  mayanTemple: {
    id: 'mayanTemple',
    name: '🗿 羽蛇神馬雅黃金金字塔（黑曜石美洲豹戰士 / 羽蛇神庫庫爾坎）',
    center: { x: 106, z: 102 },
    radius: 38,
    safe: false
  }
};

/**
 * 29 Distinct Monsters & Mythic Bosses with Hardcore Tuning & Material Drop Tables!
 * Monotonic base-level progression ensures top-tier Mythic Bosses ALWAYS out-scale earlier zones!
 */
export const MOB_TYPES = {
  // --- 1. Greenskin Warfront ---
  goblin: {
    type: 'goblin',
    name: '👺 哥布林狂暴劫掠者',
    level: 2,
    maxHp: 195,
    atk: 29,
    speed: 7.6,
    aggroRange: 24,
    attackRange: 2.4,
    attackCooldown: 1.0,
    expReward: 42,
    goldReward: 36,
    respawnTime: 5,
    radius: 0.9,
    drops: [{ id: 'greenskin_fang', chance: 0.45 }]
  },
  orc: {
    type: 'orc',
    name: '🪓 獸人嗜血狂戰士',
    level: 7,
    maxHp: 760,
    atk: 88,
    speed: 8.0,
    aggroRange: 26,
    attackRange: 2.9,
    attackCooldown: 1.0,
    chargeCooldown: 4.8,
    enrage: true,
    expReward: 105,
    goldReward: 88,
    respawnTime: 8,
    radius: 1.25,
    drops: [{ id: 'greenskin_fang', chance: 0.72 }]
  },
  ogre: {
    type: 'ogre',
    name: '🏏 食人魔碎骨巨霸',
    level: 10,
    maxHp: 1580,
    atk: 128,
    speed: 6.5,
    aggroRange: 26,
    attackRange: 3.6,
    attackCooldown: 1.5,
    stomp: true,
    expReward: 190,
    goldReward: 165,
    respawnTime: 11,
    radius: 1.75,
    drops: [{ id: 'greenskin_fang', chance: 0.9 }]
  },
  troll: {
    type: 'troll',
    name: '🌿 嗜血遠古巨魔',
    level: 9,
    maxHp: 1180,
    atk: 102,
    speed: 7.6,
    aggroRange: 26,
    attackRange: 3.1,
    attackCooldown: 1.1,
    regen: 48,
    expReward: 155,
    goldReward: 130,
    respawnTime: 10,
    radius: 1.35,
    drops: [{ id: 'greenskin_fang', chance: 0.85 }]
  },

  // --- 2. Gnome & Vampire Blood Forest ---
  gnome: {
    type: 'gnome',
    name: '💣 地精煉金炸彈客',
    level: 6,
    maxHp: 520,
    atk: 78,
    speed: 8.2,
    aggroRange: 25,
    attackRange: 10.5,
    attackCooldown: 1.35,
    expReward: 92,
    goldReward: 78,
    respawnTime: 7,
    radius: 0.85,
    drops: [{ id: 'greenskin_fang', chance: 0.4 }]
  },
  vampire: {
    type: 'vampire',
    name: '🦇 暗夜吸血鬼真祖',
    level: 11,
    maxHp: 1750,
    atk: 122,
    speed: 9.2,
    aggroRange: 28,
    attackRange: 3.4,
    attackCooldown: 0.95,
    lifesteal: 0.85,
    undead: true,
    isMiniBoss: true,
    expReward: 265,
    goldReward: 240,
    respawnTime: 12,
    radius: 1.15,
    drops: [{ id: 'vampire_heart', chance: 0.85 }, { id: 'balduran_mithral', chance: 0.2 }]
  },

  // --- 3. Zombie Plague Cavern ---
  zombie: {
    type: 'zombie',
    name: '🧟 屍毒暴走殭屍',
    level: 7,
    maxHp: 600,
    atk: 74,
    speed: 7.7,
    aggroRange: 27,
    attackRange: 2.3,
    attackCooldown: 0.9,
    infect: true,
    undead: true,
    expReward: 92,
    goldReward: 74,
    respawnTime: 4.5,
    radius: 0.95,
    drops: [{ id: 'plague_ichor', chance: 0.55 }]
  },
  draugr_lord: {
    type: 'draugr_lord',
    name: '❄️ 天際屍鬼死靈大君',
    level: 11,
    maxHp: 1550,
    atk: 115,
    speed: 7.9,
    aggroRange: 27,
    attackRange: 3.2,
    attackCooldown: 1.1,
    shoutCooldown: 4.8,
    infect: true,
    undead: true,
    isMiniBoss: true,
    expReward: 255,
    goldReward: 225,
    respawnTime: 12,
    radius: 1.3,
    drops: [{ id: 'plague_ichor', chance: 0.95 }, { id: 'balduran_mithral', chance: 0.22 }]
  },

  // --- 4. Ancient Greek Pantheon & Cretan Labyrinth ---
  centaur: {
    type: 'centaur',
    name: '🏹 喀戎・古希臘半人馬戰神',
    level: 11,
    maxHp: 1380,
    atk: 108,
    speed: 9.3,
    aggroRange: 28,
    attackRange: 11.5,
    attackCooldown: 1.15,
    isMiniBoss: true,
    expReward: 240,
    goldReward: 210,
    respawnTime: 11,
    radius: 1.4,
    drops: [{ id: 'olympus_bronze', chance: 0.7 }]
  },
  minotaur: {
    type: 'minotaur',
    name: '🐂 米諾陶洛斯・迷宮牛頭人王',
    level: 13,
    maxHp: 4600,
    atk: 185,
    speed: 8.4,
    aggroRange: 29,
    attackRange: 3.7,
    attackCooldown: 1.05,
    chargeCooldown: 4.2,
    stomp: true,
    enrage: true,
    isBoss: true,
    expReward: 440,
    goldReward: 390,
    respawnTime: 15,
    radius: 1.6,
    drops: [{ id: 'olympus_bronze', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.3 }]
  },
  medusa: {
    type: 'medusa',
    name: '🐍 梅杜莎・蛇髮女妖戈爾貢',
    level: 14,
    maxHp: 5200,
    atk: 198,
    speed: 8.1,
    aggroRange: 29,
    attackRange: 9.5,
    attackCooldown: 1.2,
    petrify: true,
    isBoss: true,
    expReward: 490,
    goldReward: 430,
    respawnTime: 16,
    radius: 1.4,
    drops: [{ id: 'olympus_bronze', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.32 }]
  },
  cyclops: {
    type: 'cyclops',
    name: '👁️ 波呂斐摩斯・獨眼巨人泰坦',
    level: 15,
    maxHp: 6800,
    atk: 222,
    speed: 6.9,
    aggroRange: 29,
    attackRange: 4.3,
    attackCooldown: 1.45,
    boulderCooldown: 4.0,
    stomp: true,
    isBoss: true,
    expReward: 590,
    goldReward: 520,
    respawnTime: 18,
    radius: 2.05,
    drops: [{ id: 'olympus_bronze', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.35 }]
  },
  cerberus: {
    type: 'cerberus',
    name: '🐺 刻耳柏洛斯・冥界三頭地獄犬',
    level: 16,
    maxHp: 7800,
    atk: 238,
    speed: 9.4,
    aggroRange: 31,
    attackRange: 3.9,
    attackCooldown: 0.9,
    breathCooldown: 3.8,
    hellfire: true,
    isBoss: true,
    expReward: 660,
    goldReward: 580,
    respawnTime: 18,
    radius: 2.1,
    drops: [{ id: 'olympus_bronze', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.38 }]
  },
  chimera: {
    type: 'chimera',
    name: '🦁 奇美拉・獅頭羊身蛇尾魔獸',
    level: 17,
    maxHp: 8900,
    atk: 256,
    speed: 8.6,
    aggroRange: 31,
    attackRange: 4.6,
    attackCooldown: 1.05,
    breathCooldown: 3.5,
    infect: true,
    hellfire: true,
    isBoss: true,
    expReward: 740,
    goldReward: 650,
    respawnTime: 20,
    radius: 2.2,
    drops: [{ id: 'olympus_bronze', chance: 1.0 }, { id: 'hydra_venom_gland', chance: 0.65 }]
  },
  hydra: {
    type: 'hydra',
    name: '🐉 九頭蛇海德拉・深淵神話巨獸',
    level: 18,
    maxHp: 10800,
    atk: 278,
    speed: 7.6,
    aggroRange: 33,
    attackRange: 5.8,
    attackCooldown: 1.2,
    breathCooldown: 3.4,
    regen: 95,
    infect: true,
    isBoss: true,
    expReward: 880,
    goldReward: 790,
    respawnTime: 22,
    radius: 2.9,
    drops: [{ id: 'hydra_venom_gland', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.45 }]
  },

  // --- 5. Volcano Dragon Lair ---
  dragon: {
    type: 'dragon',
    name: '🔥 奧杜因・世界吞噬者煉獄古龍',
    level: 19,
    maxHp: 14200,
    atk: 320,
    speed: 8.0,
    aggroRange: 35,
    attackRange: 7.2,
    attackCooldown: 1.35,
    breathCooldown: 3.2,
    hellfire: true,
    isBoss: true,
    expReward: 1060,
    goldReward: 960,
    respawnTime: 22,
    radius: 3.5,
    drops: [{ id: 'dragon_scale', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.55 }]
  },

  // --- 6. Ocean Abyss & Atlantis Bay ---
  kraken: {
    type: 'kraken',
    name: '🦑 北海巨妖・深海克拉肯',
    level: 18,
    maxHp: 11200,
    atk: 276,
    speed: 7.2,
    aggroRange: 33,
    attackRange: 6.2,
    attackCooldown: 1.15,
    boulderCooldown: 3.9,
    stomp: true,
    infect: true,
    isBoss: true,
    expReward: 920,
    goldReward: 830,
    respawnTime: 20,
    radius: 2.9,
    drops: [{ id: 'abyssal_pearl', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.45 }]
  },
  leviathan: {
    type: 'leviathan',
    name: '🌊 利維坦・深淵太古海龍',
    level: 21,
    maxHp: 18200,
    atk: 378,
    speed: 8.3,
    aggroRange: 35,
    attackRange: 7.0,
    attackCooldown: 1.25,
    breathCooldown: 3.1,
    petrify: true,
    isBoss: true,
    expReward: 1220,
    goldReward: 1090,
    respawnTime: 23,
    radius: 3.3,
    drops: [{ id: 'abyssal_pearl', chance: 1.0 }, { id: 'dragon_scale', chance: 0.6 }, { id: 'balduran_mithral', chance: 0.6 }]
  },

  // --- 7. Alpine Frost Peaks & Elder Dragons ---
  yeti: {
    type: 'yeti',
    name: '🦍 喜馬拉雅雪峰巨獸・雪怪',
    level: 15,
    maxHp: 3800,
    atk: 175,
    speed: 7.5,
    aggroRange: 28,
    attackRange: 3.9,
    attackCooldown: 1.25,
    boulderCooldown: 4.2,
    stomp: true,
    isMiniBoss: true,
    expReward: 480,
    goldReward: 410,
    respawnTime: 13,
    radius: 1.85,
    drops: [{ id: 'frost_dragon_heart', chance: 0.55 }]
  },
  frost_wyrm: {
    type: 'frost_wyrm',
    name: '❄️ 辛達苟薩・極寒冰霜古龍',
    level: 21,
    maxHp: 18600,
    atk: 382,
    speed: 8.2,
    aggroRange: 35,
    attackRange: 7.2,
    attackCooldown: 1.3,
    breathCooldown: 3.1,
    petrify: true,
    isBoss: true,
    expReward: 1280,
    goldReward: 1140,
    respawnTime: 23,
    radius: 3.5,
    drops: [{ id: 'frost_dragon_heart', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.6 }]
  },
  storm_dragon: {
    type: 'storm_dragon',
    name: '⚡ 巴哈姆特・蒼穹雷霆古龍',
    level: 23,
    maxHp: 23800,
    atk: 442,
    speed: 8.9,
    aggroRange: 37,
    attackRange: 7.8,
    attackCooldown: 1.2,
    breathCooldown: 2.9,
    shoutCooldown: 4.8,
    isBoss: true,
    expReward: 1550,
    goldReward: 1380,
    respawnTime: 25,
    radius: 3.7,
    drops: [{ id: 'storm_dragon_pearl', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.7 }]
  },

  // --- 8. Cthulhu R'lyeh Eldritch Abyss ---
  deep_one: {
    type: 'deep_one',
    name: '🐟 深潛者・印斯茅斯魚人邪教徒',
    level: 14,
    maxHp: 2550,
    atk: 148,
    speed: 8.4,
    aggroRange: 29,
    attackRange: 3.2,
    attackCooldown: 0.95,
    infect: true,
    expReward: 340,
    goldReward: 285,
    respawnTime: 9,
    radius: 1.15,
    drops: [{ id: 'eldritch_eye', chance: 0.45 }, { id: 'abyssal_pearl', chance: 0.45 }]
  },
  shoggoth: {
    type: 'shoggoth',
    name: '👁️ 修格斯・萬眼原生質魔物',
    level: 18,
    maxHp: 6800,
    atk: 215,
    speed: 7.3,
    aggroRange: 31,
    attackRange: 4.6,
    attackCooldown: 1.15,
    regen: 95,
    infect: true,
    isMiniBoss: true,
    expReward: 790,
    goldReward: 700,
    respawnTime: 16,
    radius: 2.25,
    drops: [{ id: 'eldritch_eye', chance: 0.85 }]
  },
  cthulhu: {
    type: 'cthulhu',
    name: '🐙 克蘇魯・拉萊耶舊日支配者',
    level: 25,
    maxHp: 33000,
    atk: 535,
    speed: 8.1,
    aggroRange: 40,
    attackRange: 7.8,
    attackCooldown: 1.2,
    breathCooldown: 3.0,
    shoutCooldown: 4.5,
    petrify: true,
    infect: true,
    isBoss: true,
    expReward: 2100,
    goldReward: 1850,
    respawnTime: 26,
    radius: 3.8,
    drops: [{ id: 'eldritch_eye', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.85 }]
  },

  // --- 9. Japanese Yokai Shrine ---
  tengu: {
    type: 'tengu',
    name: '👺 鞍馬山大天狗・疾風劍豪',
    level: 15,
    maxHp: 3200,
    atk: 168,
    speed: 9.4,
    aggroRange: 29,
    attackRange: 3.4,
    attackCooldown: 0.9,
    shoutCooldown: 4.5,
    isMiniBoss: true,
    expReward: 450,
    goldReward: 390,
    respawnTime: 12,
    radius: 1.3,
    drops: [{ id: 'yokai_spirit_orb', chance: 0.75 }]
  },
  shuten_doji: {
    type: 'shuten_doji',
    name: '👹 酒吞童子・大江山百鬼鬼王',
    level: 18,
    maxHp: 10600,
    atk: 274,
    speed: 8.2,
    aggroRange: 31,
    attackRange: 4.3,
    attackCooldown: 1.1,
    chargeCooldown: 4.0,
    stomp: true,
    enrage: true,
    isBoss: true,
    expReward: 920,
    goldReward: 820,
    respawnTime: 18,
    radius: 1.9,
    drops: [{ id: 'yokai_spirit_orb', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.45 }]
  },
  kyubi: {
    type: 'kyubi',
    name: '🦊 玉藻前・白面金毛九尾妖狐',
    level: 20,
    maxHp: 15600,
    atk: 345,
    speed: 9.2,
    aggroRange: 33,
    attackRange: 9.2,
    attackCooldown: 1.05,
    breathCooldown: 3.3,
    hellfire: true,
    petrify: true,
    isBoss: true,
    expReward: 1150,
    goldReward: 1020,
    respawnTime: 20,
    radius: 2.0,
    drops: [{ id: 'yokai_spirit_orb', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.55 }]
  },
  yamata_orochi: {
    type: 'yamata_orochi',
    name: '🐍 八岐大蛇・出雲神話滅世妖龍',
    level: 24,
    maxHp: 27500,
    atk: 480,
    speed: 7.9,
    aggroRange: 37,
    attackRange: 6.8,
    attackCooldown: 1.15,
    breathCooldown: 2.9,
    regen: 115,
    infect: true,
    hellfire: true,
    isBoss: true,
    expReward: 1820,
    goldReward: 1620,
    respawnTime: 25,
    radius: 3.5,
    drops: [{ id: 'orochi_kusanagi_shard', chance: 1.0 }, { id: 'yokai_spirit_orb', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.75 }]
  },

  // --- 10. Mayan Golden Pyramid ---
  jaguar_warrior: {
    type: 'jaguar_warrior',
    name: '🐆 馬雅黑曜石美洲豹戰士',
    level: 16,
    maxHp: 3500,
    atk: 178,
    speed: 9.5,
    aggroRange: 29,
    attackRange: 3.2,
    attackCooldown: 0.85,
    chargeCooldown: 4.2,
    enrage: true,
    isMiniBoss: true,
    expReward: 500,
    goldReward: 440,
    respawnTime: 11,
    radius: 1.25,
    drops: [{ id: 'mayan_sun_jade', chance: 0.75 }]
  },
  quetzalcoatl: {
    type: 'quetzalcoatl',
    name: '🪶 羽蛇神・庫庫爾坎（馬雅太陽神龍）',
    level: 23,
    maxHp: 23500,
    atk: 440,
    speed: 9.0,
    aggroRange: 37,
    attackRange: 7.5,
    attackCooldown: 1.15,
    breathCooldown: 2.9,
    hellfire: true,
    isBoss: true,
    expReward: 1620,
    goldReward: 1460,
    respawnTime: 24,
    radius: 3.4,
    drops: [{ id: 'mayan_sun_jade', chance: 1.0 }, { id: 'balduran_mithral', chance: 0.7 }]
  }
};

/**
 * Dynamic Adaptive Monster Level Scaling + Multiplayer Raid Scaling!
 * - Uses smooth monotonic exponential curves (1.055^delta ATK, 1.078^delta HP) so higher-tier
 *   Mythic Bosses ALWAYS remain deadlier than lower-tier bosses at every player level!
 * - In Multiplayer (2+ players), Bosses gain +40% HP & +10% ATK per extra adventurer (up to +30% ATK).
 */
export function getScaledMobStats(def, playerLevel = 1, activePlayerCount = 1) {
  const pLvl = Math.max(1, playerLevel || 1);
  const tierOffset = def.isBoss ? 3 : def.isMiniBoss ? 2 : 0;
  const effectiveLevel = Math.max(def.level, pLvl + tierOffset);
  const delta = Math.max(0, effectiveLevel - def.level);

  const extraPlayers = Math.max(0, (activePlayerCount || 1) - 1);
  const coOpHpMult = def.isBoss
    ? (1 + extraPlayers * 0.40)
    : def.isMiniBoss
      ? (1 + extraPlayers * 0.25)
      : 1;
  const coOpAtkMult = def.isBoss
    ? (1 + Math.min(0.30, extraPlayers * 0.10))
    : 1;

  return {
    level: effectiveLevel,
    maxHp: Math.round(def.maxHp * Math.pow(1.078, delta) * coOpHpMult),
    atk: Math.round(def.atk * Math.pow(1.055, delta) * coOpAtkMult),
    expReward: Math.round(def.expReward * Math.pow(1.08, delta)),
    goldReward: Math.round(def.goldReward * Math.pow(1.08, delta)),
    regen: def.regen ? Math.round(def.regen * Math.pow(1.07, delta)) : 0
  };
}

export function expForNextLevel(level) {
  return Math.floor(110 * Math.pow(level, 1.48));
}

export function computePlayerStats(state) {
  const weapon = SHOP_ITEMS[state.weaponId] || SHOP_ITEMS.wood_sword;
  const armor = SHOP_ITEMS[state.armorId] || SHOP_ITEMS.cloth_tunic;
  const lvl = Math.max(1, state.level || 1);
  const perks = state.perks || {};
  const scrolls = state.scrolls || [];

  const capRank = (k) => Math.min(MAX_PERK_LEVEL, Math.max(0, perks[k] || 0));
  const hullRanks = capRank('dragonblood_hull');
  const mightRanks = capRank('berserker_might');
  const hasteRanks = capRank('arcane_haste');
  const windRanks = capRank('wind_stride');
  const vampRanks = capRank('vampiric_bite');
  const greedRanks = capRank('golden_greed');

  const hasSovngarde = scrolls.includes('scroll_sovngarde');
  const hasBloodmoon = scrolls.includes('scroll_bloodmoon');
  const hasOblivion = scrolls.includes('scroll_oblivion');
  const hasDragonborn = scrolls.includes('scroll_dragonborn');

  const rawAtk = 14 + (lvl - 1) * 6 + (weapon.atk || 0);
  const atkMult = 1 + mightRanks * 0.16;

  return {
    maxHp: 130 + (lvl - 1) * 28 + (armor.bonusHp || 0) + hullRanks * 100 + (hasSovngarde ? 200 : 0),
    maxMp: 100 + (lvl - 1) * 14 + (weapon.bonusMp || 0),
    atk: Math.round(rawAtk * atkMult),
    def: 3 + Math.floor((lvl - 1) * 2.0) + (armor.def || 0) + hullRanks * 7,
    speedMult: 1 + windRanks * 0.12 + (armor.speedBonus || 0),
    cdReduction: Math.min(0.45, hasteRanks * 0.11),
    critChance: 0.16 + (hasBloodmoon ? 0.12 : 0),
    lifesteal: Math.min(0.12, (weapon.lifestealBonus || 0) + vampRanks * 0.016 + (hasBloodmoon ? 0.03 : 0)),
    goldExpMult: 1 + greedRanks * 0.30,
    dropRateMult: 1 + greedRanks * 0.18,
    skillBonusMult: hasOblivion ? 1.25 : 1.0,
    shoutBonusMult: hasDragonborn ? 1.45 : 1.0,
    bossSlayerMult: weapon.bossSlayer || 1.0,
    passiveHpRegen: (hasSovngarde ? 6 : 0) + (armor.passiveRegen || 0),
    poisonResist: Math.min(0.78, hullRanks * 0.14 + (armor.poisonResist || 0)),
    weapon,
    armor
  };
}
