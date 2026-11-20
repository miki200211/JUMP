/**
 * JUMP 3D Fantasy RPG — Main Game Engine & UI Controller
 * Phase 1: Full playable 3D RPG + Account Login/Save + Character Customizer
 * + Elf Village Shop + Goblin/Gnome/Dragon Boss + 4 Elemental Skills (Lightning/Fire/Water/Earth).
 */
import * as THREE from 'three';
import {
  DEFAULT_APPEARANCE,
  DEFAULT_PLAYER_STATE,
  RPG_DATA_EPOCH,
  MAX_PERK_LEVEL,
  MATERIALS,
  SHOP_ITEMS,
  SKILLS,
  ROGUELIKE_PERKS,
  ELDER_SCROLLS,
  ZONES,
  MOB_TYPES,
  getScaledMobStats,
  expForNextLevel,
  computePlayerStats
} from './data.js';
import {
  createCharacterModel,
  createMobModelByType,
  createNameplateSprite
} from './models.js';
import { buildWorld } from './world.js';
import { createVfxManager } from './vfx.js';
import {
  enforceClientDataEpoch,
  loadSavedSession,
  saveSession,
  loadLocalFallbackSave,
  registerAccount,
  loginAccount,
  autoLoginFromSession,
  cloudSaveProgress
} from './auth.js';
import { createMultiplayerNetwork } from './network.js';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function initGame() {
  const stageEl = document.getElementById('game-stage');
  const canvasHost = document.getElementById('game-canvas-host');
  if (!stageEl || !canvasHost) return;

  // --- Layout Split, Resizable Divider & Mobile Tabs ---
  const toggleChatBtn = document.getElementById('toggle-chat-btn');
  const workspaceSplit = document.getElementById('workspace-split');
  const chatPaneEl = document.querySelector('.chat-pane');
  const paneResizer = document.getElementById('pane-resizer');
  const SAVED_WIDTH_KEY = 'jump_chat_pane_width';

  if (chatPaneEl) {
    const savedW = parseInt(localStorage.getItem(SAVED_WIDTH_KEY), 10);
    if (savedW && savedW >= 260 && savedW <= window.innerWidth * 0.72) {
      chatPaneEl.style.width = `${savedW}px`;
    }
  }

  if (paneResizer && chatPaneEl && workspaceSplit) {
    let resizing = false;

    const onPointerMove = (e) => {
      if (!resizing) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const minW = 260;
      const maxW = Math.max(360, Math.floor(window.innerWidth * 0.72));
      const newW = Math.max(minW, Math.min(maxW, Math.round(clientX)));
      chatPaneEl.style.width = `${newW}px`;
      handleResize();
    };

    const onPointerUp = () => {
      if (!resizing) return;
      resizing = false;
      workspaceSplit.classList.remove('is-resizing');
      const curW = Math.round(chatPaneEl.getBoundingClientRect().width);
      if (curW >= 260) localStorage.setItem(SAVED_WIDTH_KEY, String(curW));
      handleResize();
    };

    paneResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizing = true;
      workspaceSplit.classList.add('is-resizing');
    });
    paneResizer.addEventListener('dblclick', () => {
      chatPaneEl.style.width = '390px';
      localStorage.setItem(SAVED_WIDTH_KEY, '390');
      setTimeout(handleResize, 200);
    });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  }

  if (toggleChatBtn && workspaceSplit) {
    toggleChatBtn.addEventListener('click', () => {
      workspaceSplit.classList.toggle('chat-collapsed');
      toggleChatBtn.textContent = workspaceSplit.classList.contains('chat-collapsed') ? '💬 展開聊天室' : '◀ 收合聊天室';
      setTimeout(handleResize, 220);
    });
  }

  const mobileTabs = document.querySelectorAll('.mobile-view-tab');
  mobileTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.view;
      mobileTabs.forEach((b) => b.classList.toggle('active', b === btn));
      workspaceSplit.dataset.mobileView = target;
      setTimeout(handleResize, 80);
    });
  });

  // --- HUD DOM Elements ---
  const hudName = document.getElementById('rpg-player-name');
  const hudLevel = document.getElementById('rpg-player-level');
  const hudGold = document.getElementById('rpg-player-gold');
  const hudZone = document.getElementById('rpg-zone-badge');
  const hudHpBar = document.getElementById('rpg-hp-fill');
  const hudHpText = document.getElementById('rpg-hp-text');
  const hudMpBar = document.getElementById('rpg-mp-fill');
  const hudMpText = document.getElementById('rpg-mp-text');
  const hudExpBar = document.getElementById('rpg-exp-fill');
  const hudAuthBtn = document.getElementById('rpg-auth-btn');
  const hudCustomizeBtn = document.getElementById('rpg-customize-btn');
  const hudBagBtn = document.getElementById('rpg-bag-btn');
  const hudCodexBtn = document.getElementById('rpg-codex-btn');
  const hudPartyBtn = document.getElementById('rpg-party-btn');
  const hudPartyHud = document.getElementById('rpg-party-hud');
  const hudNetBadge = document.getElementById('rpg-net-badge');
  const hudInviteBanner = document.getElementById('rpg-invite-banner');
  const hudInviteText = document.getElementById('rpg-invite-text');
  const hudInviteAccept = document.getElementById('rpg-invite-accept');
  const hudInviteDecline = document.getElementById('rpg-invite-decline');
  const hudShopPrompt = document.getElementById('rpg-shop-prompt');
  const hudChestPrompt = document.getElementById('rpg-chest-prompt');
  const hudInfectionBadge = document.getElementById('rpg-infection-badge');
  const hudPerksStrip = document.getElementById('rpg-perks-strip');
  const hudToast = document.getElementById('rpg-toast');
  const damageLayer = document.getElementById('rpg-damage-layer');
  const minimapCanvas = document.getElementById('rpg-minimap');
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  // Dialogs
  const authDialog = document.getElementById('rpg-auth-dialog');
  const customizerDialog = document.getElementById('rpg-customizer-dialog');
  const shopDialog = document.getElementById('rpg-shop-dialog');
  const forgeDialog = document.getElementById('rpg-forge-dialog');
  const alchemistDialog = document.getElementById('rpg-alchemist-dialog');
  const codexDialog = document.getElementById('rpg-codex-dialog');
  const bagDialog = document.getElementById('rpg-bag-dialog');
  const partyDialog = document.getElementById('rpg-party-dialog');
  const perkDialog = document.getElementById('rpg-perk-dialog');
  const perkChoicesEl = document.getElementById('rpg-perk-choices');

  // --- Player Runtime State ---
  let accountUser = null; // null = guest
  let playerNickname = localStorage.getItem('chat_nickname') || '冒險者';
  let appearance = clone(DEFAULT_APPEARANCE);
  let state = clone(DEFAULT_PLAYER_STATE);
  let partyId = null;
  let pendingInvite = null;
  const remoteAvatars = new Map(); // uid -> { root, model, nameplate, sig, targetPos, targetRotY, data, attackAnim }
  let lastAttackStamp = 0;

  // Clear stale client RPG sessions & local saves if database epoch advanced (Season Wipe)
  enforceClientDataEpoch();

  function sanitizePerks(perksObj) {
    const clean = {};
    if (!perksObj || typeof perksObj !== 'object') return clean;
    for (const [k, v] of Object.entries(perksObj)) {
      const n = Math.min(MAX_PERK_LEVEL, Math.max(0, Math.floor(Number(v) || 0)));
      if (n > 0) clean[k] = n;
    }
    return clean;
  }

  function normalizeLoadedState(rawState) {
    if (!rawState || typeof rawState !== 'object' || (rawState.dataEpoch || 1) < RPG_DATA_EPOCH) {
      return { state: clone(DEFAULT_PLAYER_STATE), wasReset: !!(rawState && Object.keys(rawState).length) };
    }
    const merged = {
      ...clone(DEFAULT_PLAYER_STATE),
      ...rawState,
      dataEpoch: RPG_DATA_EPOCH,
      perks: sanitizePerks(rawState.perks),
      scrolls: [...(rawState.scrolls || [])],
      materials: { ...(rawState.materials || {}) }
    };
    return { state: merged, wasReset: false };
  }

  // Try restore local save immediately
  const localSave = loadLocalFallbackSave();
  if (localSave) {
    if (localSave.nickname) playerNickname = localSave.nickname;
    if (localSave.appearance) appearance = { ...clone(DEFAULT_APPEARANCE), ...localSave.appearance };
    if (localSave.state) state = normalizeLoadedState(localSave.state).state;
  }
  state.perks = sanitizePerks(state.perks);
  state.scrolls = state.scrolls || [];
  state.materials = state.materials || {};

  let stats = computePlayerStats(state);
  let currentHp = Math.min(state.hp || stats.maxHp, stats.maxHp);
  let currentMp = Math.min(state.mp || stats.maxMp, stats.maxMp);
  let isDead = false;
  let respawnTimer = 0;
  let earthShieldTimer = 0;
  let infectionTimer = 0; // Zombie Plague / Hydra Venom Infection (DoT + 30% slow)
  let infectionTick = 0;
  let petrifyTimer = 0;   // Medusa Petrifying Gaze (65% slow)
  let playerBurnTimer = 0; // Cerberus / Chimera / Dragon Hellfire Burn DoT
  let playerBurnTick = 0;
  let chestCooldown = 0;
  let pendingPerkPicks = 0;

  // Roguelike Auto-Weapons (Vampire Survivors style)
  let garlicTick = 0;
  let autoThunderTick = 0;
  let frostNovaTick = 0;
  let orbitAngle = 0;
  const orbitHitCooldowns = new Map(); // mobId -> remainingSec

  // Cooldowns
  const cooldowns = {
    attack: 0,
    dodge: 0,
    lightning: 0,
    fire: 0,
    water: 0,
    earth: 0,
    shout: 0
  };
  let attackAnim = 0;
  let dodgeAnim = 0;
  const dodgeDir = new THREE.Vector3();

  // --- Three.js Renderer, Scene & Camera (Cinematic ACES Filmic Tone Mapping) ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 420);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  canvasHost.appendChild(renderer.domElement);

  const world = buildWorld(scene);
  const vfx = createVfxManager(scene);

  // Player 3D Wrapper
  const playerRoot = new THREE.Group();
  playerRoot.position.set(0, 0, 10);
  scene.add(playerRoot);

  let playerModel = null;
  let playerNameplate = null;

  // Roguelike 3D Visual Attachments (Vampire Survivors style Orbiting Blades & Garlic Aura)
  const orbitBladesGroup = new THREE.Group();
  orbitBladesGroup.position.y = 1.05;
  playerRoot.add(orbitBladesGroup);

  const garlicAuraMesh = new THREE.Mesh(
    new THREE.RingGeometry(3.4, 3.8, 36),
    new THREE.MeshBasicMaterial({ color: '#f97316', side: THREE.DoubleSide, transparent: true, opacity: 0.36 })
  );
  garlicAuraMesh.rotation.x = -Math.PI / 2;
  garlicAuraMesh.position.y = 0.08;
  garlicAuraMesh.visible = false;
  playerRoot.add(garlicAuraMesh);

  function rebuildPerkVisuals() {
    while (orbitBladesGroup.children.length > 0) {
      orbitBladesGroup.remove(orbitBladesGroup.children[0]);
    }
    const bladeRanks = Math.min(MAX_PERK_LEVEL, (state.perks && state.perks.orbit_blades) || 0);
    if (bladeRanks > 0) {
      const bladeCount = Math.min(6, bladeRanks + 1);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#f59e0b',
        emissiveIntensity: 0.75,
        metalness: 0.85,
        roughness: 0.2
      });
      const hiltMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.6 });
      for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2;
        const holder = new THREE.Group();
        holder.position.set(Math.cos(angle) * 2.55, 0, Math.sin(angle) * 2.55);
        holder.rotation.y = -angle + Math.PI / 2;

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 1.05), bladeMat);
        blade.position.z = 0.3;
        holder.add(blade);

        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.1), hiltMat);
        guard.position.z = -0.22;
        holder.add(guard);

        orbitBladesGroup.add(holder);
      }
    }
    const garlicRanks = (state.perks && state.perks.garlic_aura) || 0;
    garlicAuraMesh.visible = garlicRanks > 0;
  }

  function rebuildPlayerMesh() {
    if (playerModel) playerRoot.remove(playerModel.group);
    if (playerNameplate) playerRoot.remove(playerNameplate.sprite);

    stats = computePlayerStats(state);
    playerModel = createCharacterModel(appearance, stats.weapon, stats.armor);
    playerRoot.add(playerModel.group);

    const tag = accountUser ? `★ ${playerNickname}` : `${playerNickname}`;
    playerNameplate = createNameplateSprite(tag, '#a5f3fc', false);
    playerNameplate.sprite.position.set(0, 2.75 * (appearance.heightScale || 1), 0);
    playerRoot.add(playerNameplate.sprite);
    rebuildPerkVisuals();
  }
  rebuildPlayerMesh();

  // --- Camera Orbit Control (Right-Click Drag + Wheel) ---
  let camYaw = 0;
  let camPitch = 0.42;
  let camDist = 13.5;
  let isRightDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      isRightDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    } else if (e.button === 0) {
      // Blur chat input if user clicks into 3D game
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      performBasicAttack();
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) isRightDragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isRightDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    camYaw -= dx * 0.0065;
    camPitch = Math.max(0.18, Math.min(1.15, camPitch + dy * 0.005));
  });
  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    camDist = Math.max(6, Math.min(24, camDist + e.deltaY * 0.01));
  }, { passive: false });

  // --- Keyboard Controls (Strictly isolated from Chat Inputs & Window Switch Safe) ---
  const keys = {};

  function clearAllMovementKeys() {
    for (const k of Object.keys(keys)) {
      keys[k] = false;
    }
    isRightDragging = false;
  }

  // Prevent stuck movement when user Alt+Tabs, switches window, minimizes tab, or opens context menu
  window.addEventListener('blur', clearAllMovementKeys);
  window.addEventListener('focus', clearAllMovementKeys);
  window.addEventListener('contextmenu', clearAllMovementKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAllMovementKeys();
  });

  function isTypingInForm() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return true;
    // Also pause game hotkeys when any game dialog is open
    if ((authDialog && authDialog.open) ||
        (customizerDialog && customizerDialog.open) ||
        (shopDialog && shopDialog.open) ||
        (forgeDialog && forgeDialog.open) ||
        (alchemistDialog && alchemistDialog.open) ||
        (codexDialog && codexDialog.open) ||
        (bagDialog && bagDialog.open) ||
        (partyDialog && partyDialog.open) ||
        (perkDialog && perkDialog.open)) {
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (isTypingInForm()) {
      clearAllMovementKeys();
      return;
    }
    const k = e.key.toLowerCase();
    keys[k] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      performDodge();
    } else if (k === 'q') {
      castSkill('lightning');
    } else if (k === 'e') {
      castSkill('fire');
    } else if (k === 'r') {
      castSkill('water');
    } else if (k === 'f') {
      castSkill('earth');
    } else if (k === 't') {
      castSkill('shout');
    } else if (k === '1') {
      usePotion('hp');
    } else if (k === '2') {
      usePotion('mp');
    } else if (k === 'g') {
      if (getNearestNpc()) interactNearestNpc();
      else if (isNearChest()) openCaveTreasureChest();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Wire clickable HUD skill buttons
  document.querySelectorAll('.rpg-skill-slot').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.skill;
      if (action === 'attack') performBasicAttack();
      else if (action === 'dodge') performDodge();
      else if (action === 'hp' || action === 'mp') usePotion(action);
      else if (SKILLS[action]) castSkill(action);
    });
  });

  // --- Toast & Floating Damage Numbers ---
  let toastTimeout = null;
  function showToast(msg, tone = 'info') {
    if (!hudToast) return;
    hudToast.textContent = msg;
    hudToast.dataset.tone = tone;
    hudToast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { hudToast.hidden = true; }, 3200);
  }

  function spawnFloatingText(worldPos, text, color = '#ffffff', big = false) {
    if (!damageLayer) return;
    const projected = worldPos.clone();
    projected.y += 2.2;
    projected.project(camera);
    if (projected.z > 1) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const x = (projected.x * 0.5 + 0.5) * rect.width;
    const y = (-projected.y * 0.5 + 0.5) * rect.height;

    const el = document.createElement('div');
    el.className = 'rpg-float-dmg' + (big ? ' big' : '');
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${x + (Math.random() - 0.5) * 28}px`;
    el.style.top = `${y}px`;
    damageLayer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  // --- Monster Spawner & Dynamic Player-Level Adaptive Scaling ---
  const mobs = [];

  function applyScaledStatsToMob(mob, fullHeal = false) {
    const sc = getScaledMobStats(mob.def, state.level);
    const prevMax = mob.maxHp || sc.maxHp;
    const ratio = prevMax > 0 ? Math.min(1, mob.hp / prevMax) : 1;
    mob.level = sc.level;
    mob.maxHp = sc.maxHp;
    mob.atk = sc.atk;
    mob.expReward = sc.expReward;
    mob.goldReward = sc.goldReward;
    mob.regen = sc.regen;
    mob.hp = fullHeal ? sc.maxHp : Math.max(1, Math.round(sc.maxHp * ratio));
    mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mob.level}`, mob.hp / mob.maxHp);
  }

  function rescaleLivingMobsToPlayerLevel() {
    mobs.forEach((m) => {
      if (m.alive) applyScaledStatsToMob(m, m.hp >= (m.maxHp || m.def.maxHp));
    });
  }

  function spawnMob(typeKey, homeX, homeZ) {
    const def = MOB_TYPES[typeKey];
    const visual = createMobModelByType(typeKey);
    const sc = getScaledMobStats(def, state.level);

    visual.group.position.set(homeX, 0, homeZ);
    scene.add(visual.group);

    const mob = {
      id: `${typeKey}_${mobs.length}`,
      type: typeKey,
      def,
      visual,
      home: new THREE.Vector3(homeX, 0, homeZ),
      level: sc.level,
      maxHp: sc.maxHp,
      hp: sc.maxHp,
      atk: sc.atk,
      expReward: sc.expReward,
      goldReward: sc.goldReward,
      regen: sc.regen,
      alive: true,
      respawnTimer: 0,
      atkTimer: 0.4 + Math.random() * 0.8,
      breathTimer: def.breathCooldown || 6,
      chargeTimer: def.chargeCooldown || 5,
      shoutTimer: def.shoutCooldown || 5.5,
      gazeTimer: def.gazeCooldown || 5.2,
      boulderTimer: def.boulderCooldown || 4.5,
      dashBoostTimer: 0,
      burnTimer: 0,
      burnTick: 0,
      burnDmg: 0,
      slowTimer: 0,
      knockVel: new THREE.Vector3()
    };
    mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mob.level}`, 1);
    mobs.push(mob);
  }

  // 1. Greenskin Warfront (Goblins, Orcs, Ogres, Trolls)
  [[38, 16], [46, 14], [36, 26], [44, 32], [54, 15]].forEach(([x, z]) => spawnMob('goblin', x, z));
  [[52, 20], [58, 28], [48, 36], [62, 16]].forEach(([x, z]) => spawnMob('orc', x, z));
  [[62, 24], [56, 38]].forEach(([x, z]) => spawnMob('ogre', x, z));
  [[66, 32], [42, 42]].forEach(([x, z]) => spawnMob('troll', x, z));

  // 2. Zombie Plague Cavern (8 Plague Zombies + 2 Skyrim Draugr Deathlords)
  [[42, -34], [48, -38], [56, -39], [61, -43], [46, -47], [52, -49], [59, -51], [63, -47]].forEach(([x, z]) =>
    spawnMob('zombie', x, z)
  );
  [[50, -43], [57, -46]].forEach(([x, z]) => spawnMob('draugr_lord', x, z));

  // 3. Gnome & Vampire Blood Forest
  [[-38, 8], [-46, 20], [-36, 24], [-48, 6]].forEach(([x, z]) => spawnMob('gnome', x, z));
  [[-54, 10], [-58, 18], [-62, 12]].forEach(([x, z]) => spawnMob('vampire', x, z));

  // 4. Ancient Greek Temple Ruins & Cretan Labyrinth (Centaurs + 6 Greek Bosses)
  [[-34, -30], [-46, -28]].forEach(([x, z]) => spawnMob('centaur', x, z));
  spawnMob('minotaur', -43, -40);
  spawnMob('medusa', -63, -42);
  spawnMob('cyclops', -46, -57);
  spawnMob('cerberus', -37, -51);
  spawnMob('chimera', -68, -53);
  spawnMob('hydra', -59, -62);

  // 5. Dragon Volcano Lair (Alduin Inferno Elder Dragon)
  spawnMob('dragon', 0, -82);

  // 6. Ocean Abyss & Atlantis Bay (Kraken & Sea Dragon Leviathan)
  spawnMob('kraken', -13, 90);
  spawnMob('leviathan', 14, 96);

  // 7. Alpine Frost Peaks & Glacier (Yetis + Frost Wyrm + Storm Elder Dragon)
  [[92, -92], [116, -86]].forEach(([x, z]) => spawnMob('yeti', x, z));
  spawnMob('frost_wyrm', 102, -106);
  spawnMob('storm_dragon', 120, -114);

  // 8. Cthulhu R'lyeh Eldritch Abyss (Deep Ones + Shoggoth + Great Old One Cthulhu!)
  [[-90, 82], [-96, 104], [-118, 84]].forEach(([x, z]) => spawnMob('deep_one', x, z));
  spawnMob('shoggoth', -106, 78);
  spawnMob('cthulhu', -114, 98);

  // 9. Japanese Yokai Shrine (Great Tengus + Shuten-Doji + Nine-Tailed Kyubi + Yamata no Orochi!)
  [[102, 8], [108, 28]].forEach(([x, z]) => spawnMob('tengu', x, z));
  spawnMob('shuten_doji', 116, 4);
  spawnMob('kyubi', 126, 26);
  spawnMob('yamata_orochi', 132, 15);

  // 10. Mayan Golden Pyramid (Obsidian Jaguar Warriors + Quetzalcoatl Feathered Sun Dragon!)
  [[90, 92], [96, 114]].forEach(([x, z]) => spawnMob('jaguar_warrior', x, z));
  spawnMob('quetzalcoatl', 112, 104);

  function isInSafeZone(pos) {
    const dx = pos.x - ZONES.village.center.x;
    const dz = pos.z - ZONES.village.center.z;
    return Math.hypot(dx, dz) <= ZONES.village.radius;
  }

  function getNearestNpc() {
    if (!world.npcs) return null;
    let best = null;
    let bestDist = 5.4;
    for (const npc of world.npcs) {
      const d = playerRoot.position.distanceTo(npc.pos);
      if (d < bestDist) {
        bestDist = d;
        best = npc;
      }
    }
    return best;
  }

  function interactNearestNpc() {
    const npc = getNearestNpc();
    if (!npc) return;
    if (npc.id === 'merchant') openShopDialog();
    else if (npc.id === 'blacksmith') openForgeDialog();
    else if (npc.id === 'alchemist') openAlchemistDialog();
    else if (npc.id === 'guide') openCodexDialog();
  }

  function isNearChest() {
    return world.chestPos && playerRoot.position.distanceTo(world.chestPos) <= 5.2;
  }

  // --- Combat & Multiplayer PvP / Party Logic ---
  function isSameParty(otherPartyId) {
    return !!(partyId && otherPartyId && partyId === otherPartyId);
  }

  function canPvpTarget(remote) {
    if (!remote || !remote.data) return false;
    if ((remote.data.hp || 0) <= 0) return false;
    if (isInSafeZone(playerRoot.position)) return false;
    if (isInSafeZone(remote.root.position)) return false;
    if (isSameParty(remote.data.partyId)) return false; // 同隊免傷！
    return true;
  }

  function hitRemotePlayer(remoteUid, remote, rawDmg, color = '#fca5a5', knockVec = null) {
    if (!canPvpTarget(remote)) return;
    const dmg = Math.max(1, Math.round(rawDmg * (0.9 + Math.random() * 0.2)));
    spawnFloatingText(remote.root.position, `⚔️ ${dmg}`, color, false);
    net.sendPlayerHit(remoteUid, {
      type: 'pvp',
      fromName: playerNickname,
      fromPartyId: partyId || null,
      dmg,
      color,
      knockX: knockVec ? knockVec.x : 0,
      knockZ: knockVec ? knockVec.z : 0
    });
  }

  function getForwardDir() {
    const d = new THREE.Vector3(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
    return d.normalize();
  }

  // --- Roguelike 3-Choice Boon Modal & Zombie Cavern Treasure Chest ---
  if (perkDialog) {
    perkDialog.addEventListener('cancel', (e) => e.preventDefault());
  }

  function renderPerksStrip() {
    if (!hudPerksStrip) return;
    hudPerksStrip.textContent = '';
    const perksObj = state.perks || {};
    ROGUELIKE_PERKS.forEach((p) => {
      const rank = Math.min(MAX_PERK_LEVEL, perksObj[p.id] || 0);
      if (rank <= 0) return;
      const isMax = rank >= MAX_PERK_LEVEL;
      const chip = document.createElement('span');
      chip.className = 'rpg-perk-chip';
      chip.title = `${p.name} (Lv.${rank}/${MAX_PERK_LEVEL})：${p.desc}`;
      chip.textContent = `${p.icon} ${p.name.replace(/^[^\s]+\s*/, '')} Lv.${rank}${isMax ? ' MAX' : `/${MAX_PERK_LEVEL}`}`;
      hudPerksStrip.appendChild(chip);
    });
    const scrolls = state.scrolls || [];
    scrolls.forEach((sId) => {
      const sDef = ELDER_SCROLLS.find((x) => x.id === sId || x.name === sId);
      const sChip = document.createElement('span');
      sChip.className = 'rpg-perk-chip';
      sChip.title = sDef ? `${sDef.name}：${sDef.bonusDesc}` : String(sId);
      sChip.textContent = sDef ? sDef.name : `📜 ${sId}`;
      hudPerksStrip.appendChild(sChip);
    });
  }

  function openNextPerkDialog() {
    if (!perkDialog || !perkChoicesEl) return;
    if (perkDialog.open || pendingPerkPicks <= 0) return;

    state.perks = sanitizePerks(state.perks);
    // Filter strictly to perks below MAX_PERK_LEVEL (Lv.5)!
    const pool = ROGUELIKE_PERKS.filter((p) => (state.perks[p.id] || 0) < MAX_PERK_LEVEL);
    if (pool.length === 0) {
      // All 10 Roguelike perks are already at MAX Lv.5 — grant gold & full restore instead!
      const bonusG = Math.round(450 * (stats.goldExpMult || 1));
      state.gold += bonusG;
      currentHp = stats.maxHp;
      currentMp = stats.maxMp;
      pendingPerkPicks = 0;
      updateHud();
      triggerAutoSave();
      showToast(`✨ 所有肉鴿天賦皆已達最高 Lv.${MAX_PERK_LEVEL} 滿級！改贈 +${bonusG} 金幣與狀態全滿！`, 'success');
      return;
    }

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    const choices = pool.slice(0, Math.min(3, pool.length));
    perkChoicesEl.textContent = '';

    choices.forEach((perk) => {
      const curRank = state.perks[perk.id] || 0;
      const nextRank = Math.min(MAX_PERK_LEVEL, curRank + 1);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'rpg-perk-card';
      card.innerHTML = `
        <div class="rpg-perk-icon">${perk.icon}</div>
        <div class="rpg-perk-title">${perk.name}</div>
        <div class="rpg-perk-rank">目前等級 Lv.${curRank}/${MAX_PERK_LEVEL} → Lv.${nextRank}${nextRank >= MAX_PERK_LEVEL ? ' (MAX)' : ''}</div>
        <div class="rpg-perk-desc">${perk.desc}</div>
      `;
      card.addEventListener('click', () => {
        state.perks[perk.id] = Math.min(MAX_PERK_LEVEL, (state.perks[perk.id] || 0) + 1);
        pendingPerkPicks = Math.max(0, pendingPerkPicks - 1);
        stats = computePlayerStats(state);
        currentHp = Math.min(stats.maxHp, currentHp + 35);
        currentMp = Math.min(stats.maxMp, currentMp + 25);
        rebuildPerkVisuals();
        renderPerksStrip();
        updateHud();
        triggerAutoSave();
        perkDialog.close();
        showToast(`✨ 獲得肉鴿祝福：【${perk.name}】Lv.${state.perks[perk.id]}/${MAX_PERK_LEVEL}！`, 'success');
        if (pendingPerkPicks > 0) {
          setTimeout(openNextPerkDialog, 180);
        }
      });
      perkChoicesEl.appendChild(card);
    });

    perkDialog.showModal();
  }

  function openCaveTreasureChest() {
    if (isDead) return;
    if (!isNearChest()) return;
    if (chestCooldown > 0) {
      showToast(`📦 上古秘寶箱封印重聚中（剩餘 ${Math.ceil(chestCooldown)} 秒）`, 'warn');
      return;
    }
    chestCooldown = 38;
    if (!state.scrolls) state.scrolls = [];
    if (!state.materials) state.materials = {};

    const bonusGold = Math.round((320 + Math.random() * 200) * (stats.goldExpMult || 1));
    state.gold += bonusGold;

    // Guaranteed Monster Hunter / Baldur's Gate rare crafting ore from the Cave Chest!
    state.materials.balduran_mithral = (state.materials.balduran_mithral || 0) + 1;

    // Grant an uncollected Elder Scroll if available
    const remainingScrolls = ELDER_SCROLLS.filter((s) => !state.scrolls.includes(s.id));
    let scrollMsg = '';
    if (remainingScrolls.length > 0) {
      const picked = remainingScrolls[Math.floor(Math.random() * remainingScrolls.length)];
      state.scrolls.push(picked.id);
      stats = computePlayerStats(state);
      scrollMsg = `、${picked.name}`;
    }

    vfx.spawnWaterWave(world.chestPos, 6.5);
    spawnFloatingText(world.chestPos, `📦 +${bonusGold}G +✨柏德安秘銀!`, '#fde047', true);
    showToast(`📦 開啟上古秘寶箱！獲得 ${bonusGold} 金幣、✨柏德安秘銀礦石 ×1${scrollMsg}！`, 'success');

    pendingPerkPicks += 1;
    renderPerksStrip();
    updateHud();
    triggerAutoSave();
    openNextPerkDialog();
  }

  if (hudChestPrompt) {
    hudChestPrompt.addEventListener('click', openCaveTreasureChest);
  }

  function grantKillReward(mobType, mobName, isBoss, worldPos, expGain, goldGain, shared = false) {
    const mult = stats.goldExpMult || 1;
    const finalGold = Math.round(goldGain * mult);
    const finalExp = Math.round(expGain * mult);

    state.gold += finalGold;
    state.exp += finalExp;
    state.kills[mobType] = (state.kills[mobType] || 0) + 1;

    // Monster Hunter × Baldur's Gate Material Drops!
    if (!state.materials) state.materials = {};
    const mobDef = MOB_TYPES[mobType];
    const droppedNames = [];
    if (mobDef && mobDef.drops) {
      const dropMult = stats.dropRateMult || 1.0;
      mobDef.drops.forEach((d) => {
        if (Math.random() < d.chance * dropMult) {
          state.materials[d.id] = (state.materials[d.id] || 0) + 1;
          const mInfo = MATERIALS[d.id];
          if (mInfo) droppedNames.push(mInfo.name);
        }
      });
    }

    spawnFloatingText(
      worldPos || playerRoot.position,
      shared ? `🤝 +${finalGold}G +${finalExp}EXP` : `+${finalGold}G +${finalExp}EXP`,
      '#fde047',
      isBoss
    );
    if (droppedNames.length > 0) {
      spawnFloatingText(
        (worldPos || playerRoot.position).clone().add(new THREE.Vector3(0, 1.1, 0)),
        `🎁 ${droppedNames.join(' ')}`,
        '#c084fc',
        true
      );
      if (!isBoss) {
        showToast(`🎁 狩獵素材獲得：${droppedNames.join('、')}（可至精靈村矮人鐵匠鍛造神兵！）`, 'success');
      }
      triggerAutoSave();
    }

    let leveledUp = false;
    while (state.exp >= expForNextLevel(state.level)) {
      state.exp -= expForNextLevel(state.level);
      state.level += 1;
      pendingPerkPicks += 1;
      leveledUp = true;
    }
    if (leveledUp) {
      stats = computePlayerStats(state);
      currentHp = stats.maxHp;
      currentMp = stats.maxMp;
      rescaleLivingMobsToPlayerLevel();
      vfx.spawnWaterWave(playerRoot.position, 5.5);
      showToast(`🎉 升級至 Lv.${state.level}！世界怪物已自適應強化（請選擇肉鴿祝福）`, 'success');
      openNextPerkDialog();
    }

    if (isBoss) {
      pendingPerkPicks += 1;
      const matTxt = droppedNames.length > 0 ? `、稀有素材【${droppedNames.join('、')}】` : '';
      showToast(`🏆 擊敗神話 Boss【${mobName}】！獲得 ${finalGold} 金幣${matTxt}與額外肉鴿祝福！`, 'success');
      openNextPerkDialog();
      triggerAutoSave();
    } else if (leveledUp) {
      triggerAutoSave();
    }
    updateHud();
  }

  function applyDamageToMob(mob, rawDmg, color = '#fef08a', isCrit = false, statusEffects = null, fromRemoteUid = null) {
    if (!mob.alive) return;
    let scaledDmg = rawDmg;
    // Dawnbreaker / Lathander bonus against Undead
    if (!fromRemoteUid && mob.def.undead && stats.weapon && stats.weapon.undeadSlayer) {
      scaledDmg *= stats.weapon.undeadSlayer;
    }
    // Balduran's Giantslayer / Kusanagi / Fatalis bonus against Bosses & MiniBosses
    if (!fromRemoteUid && (mob.def.isBoss || mob.def.isMiniBoss) && stats.bossSlayerMult > 1) {
      scaledDmg *= stats.bossSlayerMult;
    }
    const dmg = Math.max(1, Math.round(scaledDmg * (0.9 + Math.random() * 0.2)));

    // Player Vampire Lifesteal perk
    if (!fromRemoteUid && stats.lifesteal > 0 && !isDead) {
      const steal = Math.max(1, Math.round(dmg * stats.lifesteal));
      currentHp = Math.min(stats.maxHp, currentHp + steal);
    }

    // If connected and we are NOT the mob AI host, forward hit to host for authoritative HP sync
    if (!fromRemoteUid && net.isConnected() && !net.isHost()) {
      spawnFloatingText(mob.visual.group.position, isCrit ? `💥 ${dmg}!` : `${dmg}`, color, isCrit);
      net.sendMobHitToHost(mob.id, dmg, color, isCrit, statusEffects);
      return;
    }

    const maxHp = mob.maxHp || mob.def.maxHp;
    const lvl = mob.level || mob.def.level;
    mob.hp = Math.max(0, mob.hp - dmg);
    mob.visual.hpBar.redraw(`${mob.def.name} Lv.${lvl}`, mob.hp / maxHp);
    spawnFloatingText(mob.visual.group.position, isCrit ? `💥 ${dmg}!` : `${dmg}`, color, isCrit);

    if (statusEffects) {
      if (statusEffects.slow) mob.slowTimer = Math.max(mob.slowTimer, statusEffects.slow);
      if (statusEffects.burn) {
        mob.burnTimer = statusEffects.burn.duration;
        mob.burnTick = 0.6;
        mob.burnDmg = statusEffects.burn.dmg;
      }
      if (statusEffects.knockX || statusEffects.knockZ) {
        mob.knockVel.x += statusEffects.knockX || 0;
        mob.knockVel.z += statusEffects.knockZ || 0;
      }
    }

    if (mob.hp <= 0) {
      mob.alive = false;
      mob.respawnTimer = mob.def.respawnTime;
      mob.visual.group.visible = false;

      const expR = mob.expReward || mob.def.expReward;
      const goldR = mob.goldReward || mob.def.goldReward;

      const killerUid = fromRemoteUid || net.uid;
      const killerPartyId = fromRemoteUid
        ? ((remoteAvatars.get(fromRemoteUid) && remoteAvatars.get(fromRemoteUid).data && remoteAvatars.get(fromRemoteUid).data.partyId) || null)
        : partyId;

      if (net.isConnected()) {
        net.broadcastKillReward(
          mob.type,
          mob.def.name,
          killerUid,
          killerPartyId,
          mob.visual.group.position.x,
          mob.visual.group.position.z,
          expR,
          goldR
        );
      }

      // Grant reward locally if we killed it or share party with killer
      if (killerUid === net.uid || isSameParty(killerPartyId)) {
        grantKillReward(
          mob.type,
          mob.def.name,
          !!mob.def.isBoss,
          mob.visual.group.position,
          expR,
          goldR,
          killerUid !== net.uid
        );
      }
    }
  }

  function takePlayerDamage(rawDmg, attackerName = '', opts = null) {
    if (isDead || dodgeAnim > 0 || isInSafeZone(playerRoot.position)) return;
    let dmg = Math.max(1, rawDmg - stats.def * 0.65);
    if (earthShieldTimer > 0) {
      dmg *= (1 - SKILLS.earth.shieldReduction);
    }
    dmg = Math.max(1, Math.round(dmg));
    currentHp = Math.max(0, currentHp - dmg);
    const dmgColor = opts && opts.petrify
      ? '#a8a29e'
      : opts && opts.hellfire
        ? '#fb923c'
        : opts && opts.infect
          ? '#84cc16'
          : '#f87171';
    spawnFloatingText(playerRoot.position, `-${dmg}`, dmgColor, false);

    // 1. Medusa Petrifying Gaze (65% slow for 2.6s)
    if (opts && opts.petrify && currentHp > 0) {
      const wasPetrified = petrifyTimer > 0;
      petrifyTimer = Math.max(petrifyTimer, 2.6 * (1 - (stats.poisonResist || 0) * 0.5));
      spawnFloatingText(playerRoot.position, '🗿 石化!', '#d6d3d1', true);
      if (!wasPetrified) {
        showToast('🗿 你遭到梅杜莎【石化凝視】！（行動僵硬減速 65%，可用 R 水之治癒或紅水解除）', 'danger');
      }
    }

    // 2. Cerberus / Chimera / Dragon Hellfire Burn DoT
    if (opts && opts.hellfire && currentHp > 0) {
      const wasBurning = playerBurnTimer > 0;
      playerBurnTimer = 4.5;
      playerBurnTick = 0.85;
      if (!wasBurning) {
        showToast('🔥 你被神話巨獸的【冥火烈焰】灼傷！（持續燃燒扣血）', 'danger');
      }
    }

    // 3. Zombie Plague Infection / Hydra Venom
    if (opts && opts.infect && currentHp > 0) {
      const wasInfected = infectionTimer > 0;
      infectionTimer = 6.5;
      infectionTick = 1.0;
      vfx.spawnPoisonCloud(playerRoot.position);
      if (!wasInfected && !(opts && opts.petrify)) {
        showToast('☣️ 你感染了【屍毒 / 九頭蛇劇毒】！（持續扣血並減速 30%，可用R水之治癒或紅水淨化）', 'danger');
      }
    }

    if (currentHp <= 0) {
      isDead = true;
      infectionTimer = 0;
      petrifyTimer = 0;
      playerBurnTimer = 0;
      respawnTimer = 3.2;
      showToast(
        attackerName
          ? `⚔️ 你被【${attackerName}】擊敗了！3 秒後於精靈村莊復活…`
          : '💀 你重傷倒下了！3 秒後於精靈村莊泉水復活…',
        'danger'
      );
    }
    updateHud();
  }

  function performBasicAttack() {
    if (isDead || cooldowns.attack > 0) return;
    cooldowns.attack = 0.42;
    attackAnim = 1.0;
    lastAttackStamp = Date.now();

    // Face camera forward direction when attacking
    playerRoot.rotation.y = camYaw + Math.PI;
    const fwd = getForwardDir();
    const slashColor = stats.weapon.glow || '#a5b4fc';
    vfx.spawnSlash(playerRoot.position, playerRoot.rotation.y, slashColor);
    net.broadcastFx({ type: 'slash', x: playerRoot.position.x, z: playerRoot.position.z, yaw: playerRoot.rotation.y, color: slashColor });

    const reach = stats.weapon.style === 'staff' ? 4.4 : 3.7;
    mobs.forEach((mob) => {
      if (!mob.alive) return;
      const toMob = new THREE.Vector3().subVectors(mob.visual.group.position, playerRoot.position);
      toMob.y = 0;
      const dist = toMob.length();
      if (dist <= reach + mob.def.radius) {
        toMob.normalize();
        if (toMob.dot(fwd) > 0.15 || dist < 1.8) {
          const isCrit = Math.random() < 0.22;
          applyDamageToMob(mob, stats.atk * (isCrit ? 1.6 : 1.0), isCrit ? '#fbbf24' : '#ffffff', isCrit);
        }
      }
    });

    // PvP melee check against non-party players outside safe zone
    remoteAvatars.forEach((remote, rUid) => {
      if (!canPvpTarget(remote)) return;
      const toP = new THREE.Vector3().subVectors(remote.root.position, playerRoot.position);
      toP.y = 0;
      const dist = toP.length();
      if (dist <= reach + 1.1) {
        toP.normalize();
        if (toP.dot(fwd) > 0.15 || dist < 1.8) {
          hitRemotePlayer(rUid, remote, stats.atk, '#fca5a5', fwd.clone().multiplyScalar(2.2));
        }
      }
    });
  }

  function performDodge() {
    if (isDead || cooldowns.dodge > 0) return;
    cooldowns.dodge = 1.5 * (1 - (stats.cdReduction || 0));
    dodgeAnim = 1.0;
    dodgeDir.copy(getForwardDir());
  }

  function getElementMultiplier(skillId) {
    const eb = stats.weapon.elementBonus;
    const weapMult = (eb && (eb.type === skillId || eb.type === 'all')) ? eb.mult : 1.0;
    return weapMult * (stats.skillBonusMult || 1.0);
  }

  function castSkill(skillId) {
    if (isDead) return;
    const sk = SKILLS[skillId];
    if (!sk) return;
    if (cooldowns[skillId] > 0) return;
    if (currentMp < sk.mpCost) {
      showToast('💧 魔力不足！可按 2 喝魔力藥水或等待自然回復', 'warn');
      return;
    }

    currentMp -= sk.mpCost;
    cooldowns[skillId] = sk.cooldown * (1 - (stats.cdReduction || 0));
    attackAnim = 0.85;
    playerRoot.rotation.y = camYaw + Math.PI;
    const fwd = getForwardDir();
    const elemMult = getElementMultiplier(skillId);

    if (skillId === 'lightning') {
      // Find closest living mob OR non-party PvP player within range
      let primaryMob = null;
      let primaryPlayerUid = null;
      let bestDist = sk.range;

      mobs.forEach((m) => {
        if (!m.alive) return;
        const d = m.visual.group.position.distanceTo(playerRoot.position);
        if (d < bestDist) { bestDist = d; primaryMob = m; primaryPlayerUid = null; }
      });
      remoteAvatars.forEach((remote, rUid) => {
        if (!canPvpTarget(remote)) return;
        const d = remote.root.position.distanceTo(playerRoot.position);
        if (d < bestDist) { bestDist = d; primaryMob = null; primaryPlayerUid = rUid; }
      });

      const strikePos = primaryMob
        ? primaryMob.visual.group.position.clone()
        : primaryPlayerUid
          ? remoteAvatars.get(primaryPlayerUid).root.position.clone()
          : playerRoot.position.clone().addScaledVector(fwd, 7);

      const chained = [];
      if (primaryMob) {
        applyDamageToMob(primaryMob, stats.atk * sk.damageMult * elemMult, '#7dd3fc', true, { slow: 2.4 });
      } else if (primaryPlayerUid) {
        hitRemotePlayer(primaryPlayerUid, remoteAvatars.get(primaryPlayerUid), stats.atk * sk.damageMult * elemMult, '#7dd3fc');
      }

      // Chain to nearby mobs & non-party enemies
      if (primaryMob || primaryPlayerUid) {
        mobs.forEach((m) => {
          if (!m.alive || m === primaryMob || chained.length >= sk.chainCount - 1) return;
          if (m.visual.group.position.distanceTo(strikePos) <= sk.chainRadius) {
            chained.push(m.visual.group.position.clone());
            applyDamageToMob(m, stats.atk * sk.damageMult * 0.72 * elemMult, '#38bdf8', false, { slow: 1.8 });
          }
        });
        remoteAvatars.forEach((remote, rUid) => {
          if (rUid === primaryPlayerUid || !canPvpTarget(remote) || chained.length >= sk.chainCount - 1) return;
          if (remote.root.position.distanceTo(strikePos) <= sk.chainRadius) {
            chained.push(remote.root.position.clone());
            hitRemotePlayer(rUid, remote, stats.atk * sk.damageMult * 0.72 * elemMult, '#38bdf8');
          }
        });
      }

      vfx.spawnLightning(strikePos, chained);
      net.broadcastFx({
        type: 'lightning',
        x: strikePos.x,
        z: strikePos.z,
        chains: chained.map((p) => ({ x: p.x, z: p.z }))
      });
    } else if (skillId === 'fire') {
      net.broadcastFx({
        type: 'fire',
        x: playerRoot.position.x,
        z: playerRoot.position.z,
        dirX: fwd.x,
        dirZ: fwd.z,
        range: sk.range
      });
      vfx.spawnFireball(
        playerRoot.position,
        fwd,
        sk.range,
        (ballPos) => {
          if (mobs.some((m) => m.alive && m.visual.group.position.distanceTo(ballPos) <= m.def.radius + 1.0)) return true;
          for (const [, remote] of remoteAvatars) {
            if (canPvpTarget(remote) && remote.root.position.distanceTo(ballPos) <= 1.4) return true;
          }
          return false;
        },
        (boomPos) => {
          const burnObj = {
            duration: sk.burnDuration,
            dmg: Math.round((sk.burnDamage + state.level * 3) * elemMult)
          };
          mobs.forEach((m) => {
            if (!m.alive) return;
            if (m.visual.group.position.distanceTo(boomPos) <= sk.aoeRadius + m.def.radius) {
              applyDamageToMob(m, stats.atk * sk.damageMult * elemMult, '#fb923c', true, { burn: burnObj });
            }
          });
          remoteAvatars.forEach((remote, rUid) => {
            if (!canPvpTarget(remote)) return;
            if (remote.root.position.distanceTo(boomPos) <= sk.aoeRadius + 1.0) {
              hitRemotePlayer(rUid, remote, stats.atk * sk.damageMult * elemMult, '#fb923c');
            }
          });
        }
      );
    } else if (skillId === 'water') {
      vfx.spawnWaterWave(playerRoot.position, sk.aoeRadius);
      net.broadcastFx({ type: 'water', x: playerRoot.position.x, z: playerRoot.position.z, radius: sk.aoeRadius });

      const healAmt = Math.round((sk.healBase + state.level * 8) * elemMult);
      currentHp = Math.min(stats.maxHp, currentHp + healAmt);
      if (infectionTimer > 0 || petrifyTimer > 0 || playerBurnTimer > 0) {
        infectionTimer = 0;
        petrifyTimer = 0;
        playerBurnTimer = 0;
        showToast('💧 聖泉波動已淨化身上的屍毒、石化與冥火灼燒！', 'success');
      }
      spawnFloatingText(playerRoot.position, `+${healAmt} HP`, '#34d399', true);

      mobs.forEach((m) => {
        if (!m.alive) return;
        const diff = new THREE.Vector3().subVectors(m.visual.group.position, playerRoot.position);
        diff.y = 0;
        const dist = diff.length();
        if (dist <= sk.aoeRadius + m.def.radius) {
          const kb = dist > 0.01 ? diff.normalize().multiplyScalar(sk.knockback) : new THREE.Vector3();
          applyDamageToMob(m, stats.atk * sk.damageMult * elemMult, '#22d3ee', false, { slow: 3.0, knockX: kb.x, knockZ: kb.z });
        }
      });

      // Heal teammates & knockback+damage non-party enemies
      remoteAvatars.forEach((remote, rUid) => {
        const diff = new THREE.Vector3().subVectors(remote.root.position, playerRoot.position);
        diff.y = 0;
        const dist = diff.length();
        if (dist > sk.aoeRadius + 1.0) return;

        if (isSameParty(remote.data && remote.data.partyId)) {
          spawnFloatingText(remote.root.position, `💧 +${healAmt} HP`, '#34d399', false);
          net.sendPlayerHit(rUid, { type: 'heal', fromName: playerNickname, amount: healAmt });
        } else if (canPvpTarget(remote)) {
          const kb = dist > 0.01 ? diff.normalize().multiplyScalar(sk.knockback * 0.65) : new THREE.Vector3();
          hitRemotePlayer(rUid, remote, stats.atk * sk.damageMult * elemMult, '#22d3ee', kb);
        }
      });
    } else if (skillId === 'earth') {
      earthShieldTimer = sk.shieldDuration;
      vfx.spawnEarthSpikes(playerRoot.position, fwd, sk.range);
      net.broadcastFx({
        type: 'earth',
        x: playerRoot.position.x,
        z: playerRoot.position.z,
        dirX: fwd.x,
        dirZ: fwd.z,
        range: sk.range
      });
      showToast('🪨 岩石護盾已啟動（5.5 秒減傷 48%）', 'info');

      mobs.forEach((m) => {
        if (!m.alive) return;
        const toMob = new THREE.Vector3().subVectors(m.visual.group.position, playerRoot.position);
        toMob.y = 0;
        const dist = toMob.length();
        if (dist <= sk.range + m.def.radius) {
          const dot = toMob.clone().normalize().dot(fwd);
          if (dot > 0.55 || dist < 2.5) {
            applyDamageToMob(m, stats.atk * sk.damageMult * elemMult, '#facc15', true, {
              slow: 2.0,
              knockX: fwd.x * 5.0,
              knockZ: fwd.z * 5.0
            });
          }
        }
      });

      remoteAvatars.forEach((remote, rUid) => {
        if (!canPvpTarget(remote)) return;
        const toP = new THREE.Vector3().subVectors(remote.root.position, playerRoot.position);
        toP.y = 0;
        const dist = toP.length();
        if (dist <= sk.range + 1.0) {
          const dot = toP.clone().normalize().dot(fwd);
          if (dot > 0.55 || dist < 2.5) {
            hitRemotePlayer(rUid, remote, stats.atk * sk.damageMult * elemMult, '#facc15', fwd.clone().multiplyScalar(4.0));
          }
        }
      });
    } else if (skillId === 'shout') {
      // The Elder Scrolls: Dragonborn Unrelenting Force (Fus Ro Dah!)
      vfx.spawnDragonShout(playerRoot.position, fwd, sk.range);
      net.broadcastFx({
        type: 'shout',
        x: playerRoot.position.x,
        z: playerRoot.position.z,
        dirX: fwd.x,
        dirZ: fwd.z,
        range: sk.range
      });
      spawnFloatingText(playerRoot.position, '🗣️ FUS RO DAH!', '#38bdf8', true);

      const shoutDmg = stats.atk * sk.damageMult * elemMult * (stats.shoutBonusMult || 1);
      mobs.forEach((m) => {
        if (!m.alive) return;
        const toMob = new THREE.Vector3().subVectors(m.visual.group.position, playerRoot.position);
        toMob.y = 0;
        const dist = toMob.length();
        if (dist <= sk.range + m.def.radius) {
          const dot = toMob.clone().normalize().dot(fwd);
          if (dot > 0.42 || dist < 3.2) {
            applyDamageToMob(m, shoutDmg, '#bae6fd', true, {
              slow: 3.2,
              knockX: fwd.x * sk.knockback,
              knockZ: fwd.z * sk.knockback
            });
          }
        }
      });

      remoteAvatars.forEach((remote, rUid) => {
        if (!canPvpTarget(remote)) return;
        const toP = new THREE.Vector3().subVectors(remote.root.position, playerRoot.position);
        toP.y = 0;
        const dist = toP.length();
        if (dist <= sk.range + 1.0) {
          const dot = toP.clone().normalize().dot(fwd);
          if (dot > 0.42 || dist < 3.2) {
            hitRemotePlayer(rUid, remote, shoutDmg, '#bae6fd', fwd.clone().multiplyScalar(sk.knockback * 0.7));
          }
        }
      });
    }

    updateHud();
  }

  function usePotion(kind) {
    if (isDead) return;
    if (!state.potions[kind] || state.potions[kind] <= 0) {
      showToast(kind === 'hp' ? '🧪 沒有生命藥水了，回精靈村莊購買吧！' : '💧 沒有魔力藥水了，回精靈村莊購買吧！', 'warn');
      return;
    }
    state.potions[kind] -= 1;
    if (kind === 'hp') {
      const heal = SHOP_ITEMS.hp_potion.healHp;
      currentHp = Math.min(stats.maxHp, currentHp + heal);
      if (infectionTimer > 0 || petrifyTimer > 0 || playerBurnTimer > 0) {
        infectionTimer = 0;
        petrifyTimer = 0;
        playerBurnTimer = 0;
        showToast('🧪 生命聖水已解除身上的屍毒、石化與冥火灼燒！', 'success');
      }
      spawnFloatingText(playerRoot.position, `+${heal} HP`, '#34d399', true);
    } else {
      const mana = SHOP_ITEMS.mp_potion.healMp;
      currentMp = Math.min(stats.maxMp, currentMp + mana);
      spawnFloatingText(playerRoot.position, `+${mana} MP`, '#38bdf8', true);
    }
    updateHud();
  }

  // --- Save Throttle ---
  let saveTimer = null;
  function triggerAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      state.hp = Math.round(currentHp);
      state.mp = Math.round(currentMp);
      await cloudSaveProgress(playerNickname, appearance, state);
    }, 600);
  }

  // --- HUD & Minimap Update ---
  function updateHud() {
    if (hudName) hudName.textContent = accountUser ? `${playerNickname} (@${accountUser})` : '尚未登入';
    if (hudLevel) hudLevel.textContent = `Lv.${state.level}`;
    if (hudGold) hudGold.textContent = `${state.gold} G`;

    const hpPct = Math.max(0, Math.min(100, (currentHp / stats.maxHp) * 100));
    const mpPct = Math.max(0, Math.min(100, (currentMp / stats.maxMp) * 100));
    const expPct = Math.max(0, Math.min(100, (state.exp / expForNextLevel(state.level)) * 100));

    if (hudHpBar) hudHpBar.style.width = `${hpPct}%`;
    if (hudHpText) hudHpText.textContent = `${Math.ceil(currentHp)} / ${stats.maxHp}`;
    if (hudMpBar) hudMpBar.style.width = `${mpPct}%`;
    if (hudMpText) hudMpText.textContent = `${Math.ceil(currentMp)} / ${stats.maxMp}`;
    if (hudExpBar) hudExpBar.style.width = `${expPct}%`;

    const hpCountEl = document.getElementById('rpg-hp-pot-count');
    const mpCountEl = document.getElementById('rpg-mp-pot-count');
    if (hpCountEl) hpCountEl.textContent = state.potions.hp || 0;
    if (mpCountEl) mpCountEl.textContent = state.potions.mp || 0;

    if (hudAuthBtn) {
      hudAuthBtn.textContent = accountUser ? '👤 登出' : '🔐 登入帳號';
    }
    if (hudInfectionBadge) {
      const debuffs = [];
      if (petrifyTimer > 0) debuffs.push(`🗿 石化麻痺 (${petrifyTimer.toFixed(1)}s)`);
      if (playerBurnTimer > 0) debuffs.push(`🔥 冥火灼燒 (${playerBurnTimer.toFixed(1)}s)`);
      if (infectionTimer > 0) debuffs.push(`☣️ 屍毒/劇毒 (${infectionTimer.toFixed(1)}s)`);
      if (debuffs.length > 0) {
        hudInfectionBadge.hidden = false;
        hudInfectionBadge.textContent = debuffs.join(' · ');
      } else {
        hudInfectionBadge.hidden = true;
      }
    }
  }

  function updateSkillCooldownUI() {
    ['lightning', 'fire', 'water', 'earth', 'shout', 'dodge'].forEach((id) => {
      const slot = document.querySelector(`.rpg-skill-slot[data-skill="${id}"]`);
      if (!slot) return;
      const cdEl = slot.querySelector('.skill-cd');
      const rem = cooldowns[id] || 0;
      if (rem > 0.05) {
        slot.classList.add('on-cd');
        if (cdEl) cdEl.textContent = rem.toFixed(1);
      } else {
        slot.classList.remove('on-cd');
        if (cdEl) cdEl.textContent = '';
      }
    });
  }

  function updateZoneBadge() {
    if (!hudZone) return;
    let label = '🌲 奇幻荒野（自由對戰區）';
    for (const key of Object.keys(ZONES)) {
      const z = ZONES[key];
      if (Math.hypot(playerRoot.position.x - z.center.x, playerRoot.position.z - z.center.z) <= z.radius) {
        label = z.name;
        break;
      }
    }
    hudZone.textContent = label;
    if (hudShopPrompt) {
      const nearNpc = getNearestNpc();
      hudShopPrompt.hidden = !nearNpc;
      if (nearNpc) {
        hudShopPrompt.textContent = nearNpc.label;
      }
    }
    if (hudChestPrompt) {
      const near = isNearChest();
      hudChestPrompt.hidden = !near;
      if (near) {
        hudChestPrompt.textContent = chestCooldown > 0
          ? `📦 上古秘寶箱重聚中 (${Math.ceil(chestCooldown)}s)`
          : '📦 按 G 開啟【山洞上古秘寶箱】（金幣 / 柏德安秘銀 / 上古卷軸 / 肉鴿祝福）';
      }
    }
  }

  function drawMinimap() {
    if (!minimapCtx) return;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.28;

    minimapCtx.clearRect(0, 0, w, h);
    minimapCtx.fillStyle = 'rgba(11, 15, 34, 0.88)';
    minimapCtx.beginPath();
    minimapCtx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    minimapCtx.fill();

    // 11 World Biomes
    const zoneColors = {
      village: 'rgba(16, 185, 129, 0.42)',
      greenskinWarfront: 'rgba(180, 83, 9, 0.36)',
      zombieCavern: 'rgba(132, 204, 22, 0.38)',
      gnomeForest: 'rgba(147, 51, 234, 0.36)',
      greekPantheon: 'rgba(250, 204, 21, 0.38)',
      dragonLair: 'rgba(239, 68, 68, 0.42)',
      oceanAbyss: 'rgba(14, 165, 233, 0.42)',
      frostPeaks: 'rgba(226, 232, 240, 0.42)',
      cthulhuRlyeh: 'rgba(34, 197, 94, 0.36)',
      yokaiShrine: 'rgba(244, 114, 182, 0.42)',
      mayanTemple: 'rgba(245, 158, 11, 0.4)'
    };
    Object.values(ZONES).forEach((z) => {
      minimapCtx.fillStyle = zoneColors[z.id] || 'rgba(255,255,255,0.15)';
      minimapCtx.beginPath();
      minimapCtx.arc(cx + z.center.x * scale, cy + z.center.z * scale, z.radius * scale, 0, Math.PI * 2);
      minimapCtx.fill();
    });

    // Cave Treasure Chest marker
    if (world.chestPos) {
      minimapCtx.fillStyle = chestCooldown <= 0 ? '#fde047' : '#64748b';
      minimapCtx.fillRect(cx + world.chestPos.x * scale - 2.2, cy + world.chestPos.z * scale - 2.2, 4.4, 4.4);
    }

    // Living mobs
    mobs.forEach((m) => {
      if (!m.alive) return;
      minimapCtx.fillStyle = m.def.isBoss ? '#ef4444' : m.def.isMiniBoss ? '#f97316' : '#fbbf24';
      minimapCtx.beginPath();
      minimapCtx.arc(
        cx + m.visual.group.position.x * scale,
        cy + m.visual.group.position.z * scale,
        m.def.isBoss ? 3.2 : 1.9,
        0,
        Math.PI * 2
      );
      minimapCtx.fill();
    });

    // Remote players on minimap (Teammates = emerald, Non-party = orange-red)
    remoteAvatars.forEach((remote) => {
      const same = isSameParty(remote.data && remote.data.partyId);
      minimapCtx.fillStyle = same ? '#34d399' : '#fb7185';
      minimapCtx.beginPath();
      minimapCtx.arc(
        cx + remote.root.position.x * scale,
        cy + remote.root.position.z * scale,
        3.2,
        0,
        Math.PI * 2
      );
      minimapCtx.fill();
    });

    // Player dot
    const px = cx + playerRoot.position.x * scale;
    const pz = cy + playerRoot.position.z * scale;
    minimapCtx.fillStyle = '#38bdf8';
    minimapCtx.beginPath();
    minimapCtx.arc(px, pz, 3.8, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  // --- Dialog 1: Account Login / Register ---
  const authForm = document.getElementById('rpg-auth-form');
  const authTabs = document.querySelectorAll('.rpg-auth-tab');
  const authNickRow = document.getElementById('rpg-auth-nick-row');
  const authSubmitBtn = document.getElementById('rpg-auth-submit');
  const authErrorEl = document.getElementById('rpg-auth-error');
  let authMode = 'login';

  authTabs.forEach((t) => {
    t.addEventListener('click', () => {
      authMode = t.dataset.mode;
      authTabs.forEach((b) => b.classList.toggle('active', b === t));
      if (authNickRow) authNickRow.hidden = authMode !== 'register';
      if (authSubmitBtn) authSubmitBtn.textContent = authMode === 'register' ? '註冊並開始冒險' : '登入帳號';
      if (authErrorEl) authErrorEl.textContent = '';
    });
  });

  function syncNicknameToChat(newName) {
    if (!newName) return;
    window.dispatchEvent(new CustomEvent('jump:nickname-sync', {
      detail: { nickname: newName, source: 'rpg' }
    }));
  }

  // Listen when user edits nickname in the left chatroom -> sync to 3D avatar & cloud save
  window.addEventListener('jump:nickname-sync', (e) => {
    const detail = e && e.detail;
    if (!detail || detail.source !== 'chat' || !detail.nickname) return;
    if (playerNickname === detail.nickname) return;
    playerNickname = detail.nickname;
    rebuildPlayerMesh();
    updateHud();
    if (net.isConnected()) net.pushPlayerState(buildMyNetworkSnapshot(), true);
    if (accountUser) triggerAutoSave();
  });

  const authCloseBtn = document.getElementById('rpg-auth-close');

  function openMandatoryLogin() {
    if (!authDialog) return;
    if (authErrorEl) authErrorEl.textContent = '';
    if (authCloseBtn) authCloseBtn.style.display = accountUser ? 'block' : 'none';
    const nickInput = document.getElementById('rpg-auth-nickname');
    if (nickInput && !nickInput.value) {
      nickInput.value = localStorage.getItem('chat_nickname') || '';
    }
    if (!authDialog.open) authDialog.showModal();
  }

  // Prevent ESC closing auth dialog when not logged in (no guests allowed)
  if (authDialog) {
    authDialog.addEventListener('cancel', (e) => {
      if (!accountUser) e.preventDefault();
    });
  }
  window.addEventListener('jump:require-login', openMandatoryLogin);

  if (hudAuthBtn) {
    hudAuthBtn.addEventListener('click', () => {
      if (accountUser) {
        if (confirm(`確定要登出帳號 @${accountUser} 嗎？`)) {
          saveSession(null);
          location.reload();
        }
      } else {
        openMandatoryLogin();
      }
    });
  }

  if (authCloseBtn && authDialog) {
    authCloseBtn.addEventListener('click', () => {
      if (accountUser) authDialog.close();
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('rpg-auth-username').value.trim();
      const password = document.getElementById('rpg-auth-password').value;
      const nick = (document.getElementById('rpg-auth-nickname').value || localStorage.getItem('chat_nickname') || username).trim();

      if (authErrorEl) authErrorEl.textContent = '連線驗證中…';
      if (authSubmitBtn) authSubmitBtn.disabled = true;

      const res = authMode === 'register'
        ? await registerAccount(username, password, nick, appearance, state)
        : await loginAccount(username, password);

      if (authSubmitBtn) authSubmitBtn.disabled = false;

      if (res && res.ok && res.data) {
        accountUser = res.data.username;
        playerNickname = res.data.nickname || username;
        if (res.data.appearance && Object.keys(res.data.appearance).length) {
          appearance = { ...clone(DEFAULT_APPEARANCE), ...res.data.appearance };
        }
        let wasSeasonReset = false;
        if (res.data.state && Object.keys(res.data.state).length) {
          const norm = normalizeLoadedState(res.data.state);
          state = norm.state;
          wasSeasonReset = norm.wasReset;
        }
        stats = computePlayerStats(state);
        currentHp = Math.min(state.hp || stats.maxHp, stats.maxHp);
        currentMp = Math.min(state.mp || stats.maxMp, stats.maxMp);

        syncNicknameToChat(playerNickname);
        rebuildPlayerMesh();
        rescaleLivingMobsToPlayerLevel();
        renderPerksStrip();
        updateHud();
        if (wasSeasonReset) triggerAutoSave();
        if (!net.isConnected()) {
          net.connect(buildMyNetworkSnapshot());
        } else {
          net.pushPlayerState(buildMyNetworkSnapshot(), true);
        }
        authDialog.close();
        showToast(
          wasSeasonReset
            ? `🔄 新賽季重置完成！${playerNickname} 已從 Lv.1 重新出發（天賦上限 Lv.${MAX_PERK_LEVEL}）`
            : `✨ 歡迎回來，${playerNickname}！聊天室與遊戲名稱已同步`,
          'success'
        );
      } else {
        const msg = (res && res.error && res.error.message) || '驗證失敗，請確認帳密或後端是否已部署最新版。';
        if (authErrorEl) authErrorEl.textContent = msg;
      }
    });
  }

  // --- Dialog 2: 3D Character Customizer ---
  let previewRenderer = null;
  let previewScene = null;
  let previewCamera = null;
  let previewChar = null;
  let previewDraft = null;
  let previewAnimId = null;

  function initPreviewCanvas() {
    const host = document.getElementById('rpg-preview-host');
    if (!host || previewRenderer) return;
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color('#131126');
    previewCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
    previewCamera.position.set(0, 1.62, 4.55);
    previewCamera.lookAt(0, 1.32, 0);

    previewScene.add(new THREE.HemisphereLight('#e0e7ff', '#1e293b', 1.15));
    const dl = new THREE.DirectionalLight('#ffffff', 1.25);
    dl.position.set(3, 5, 4);
    previewScene.add(dl);

    previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    previewRenderer.setSize(220, 300);
    previewCamera.aspect = 220 / 300;
    previewCamera.updateProjectionMatrix();
    host.appendChild(previewRenderer.domElement);
  }

  function refreshPreviewModel() {
    if (!previewScene || !previewDraft) return;
    if (previewChar) previewScene.remove(previewChar.group);
    previewChar = createCharacterModel(previewDraft, stats.weapon, stats.armor);
    previewScene.add(previewChar.group);
  }

  function startPreviewLoop() {
    if (previewAnimId) cancelAnimationFrame(previewAnimId);
    const tick = () => {
      if (!customizerDialog || !customizerDialog.open) return;
      if (previewChar) {
        previewChar.group.rotation.y += 0.015;
        previewChar.animate(0.016, false, 0, 0, false);
      }
      if (previewRenderer) previewRenderer.render(previewScene, previewCamera);
      previewAnimId = requestAnimationFrame(tick);
    };
    tick();
  }

  function populateCustomizerControls(draft) {
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el && v != null) el.value = v;
    };
    setVal('cust-hair-style', draft.hairStyle === 'short' ? 'bob' : (draft.hairStyle || 'spiky'));
    setVal('cust-eye-style', draft.eyeStyle || 'normal');
    setVal('cust-ear-style', draft.earStyle || (draft.elfEars ? 'elf' : 'human'));
    setVal('cust-face-accessory', draft.faceAccessory || 'none');
    setVal('cust-headgear', draft.headgear || 'none');
    setVal('cust-wing-style', draft.wingStyle || 'none');
    setVal('cust-hair-color', draft.hairColor || '#3b2f2f');
    setVal('cust-skin-color', draft.skinColor || '#f5cfa0');
    setVal('cust-eye-color', draft.eyeColor || '#2563eb');
    setVal('cust-wing-color', draft.wingColor || '#f8fafc');
    setVal('cust-outfit-primary', draft.outfitPrimary || '#4f46e5');
    setVal('cust-outfit-secondary', draft.outfitSecondary || '#e2e8f0');
    setVal('cust-cape-color', draft.capeColor || '#7c3aed');
    setVal('cust-height', draft.heightScale || 1.0);
    setVal('cust-body-width', draft.bodyWidthScale || 1.0);
    const capeEl = document.getElementById('cust-cape');
    if (capeEl) capeEl.checked = !!draft.cape;
  }

  function readCustomizerControlsIntoDraft() {
    if (!previewDraft) return;
    const getVal = (id, fallback) => {
      const el = document.getElementById(id);
      return el ? el.value : fallback;
    };
    previewDraft.hairStyle = getVal('cust-hair-style', 'spiky');
    previewDraft.eyeStyle = getVal('cust-eye-style', 'normal');
    previewDraft.earStyle = getVal('cust-ear-style', 'human');
    previewDraft.elfEars = previewDraft.earStyle === 'elf' || previewDraft.earStyle === 'dark_elf';
    previewDraft.faceAccessory = getVal('cust-face-accessory', 'none');
    previewDraft.headgear = getVal('cust-headgear', 'none');
    previewDraft.wingStyle = getVal('cust-wing-style', 'none');
    previewDraft.hairColor = getVal('cust-hair-color', '#3b2f2f');
    previewDraft.skinColor = getVal('cust-skin-color', '#f5cfa0');
    previewDraft.eyeColor = getVal('cust-eye-color', '#2563eb');
    previewDraft.wingColor = getVal('cust-wing-color', '#f8fafc');
    previewDraft.outfitPrimary = getVal('cust-outfit-primary', '#4f46e5');
    previewDraft.outfitSecondary = getVal('cust-outfit-secondary', '#e2e8f0');
    previewDraft.capeColor = getVal('cust-cape-color', '#7c3aed');
    const capeEl = document.getElementById('cust-cape');
    previewDraft.cape = capeEl ? capeEl.checked : true;
    previewDraft.heightScale = parseFloat(getVal('cust-height', '1.0')) || 1.0;
    previewDraft.bodyWidthScale = parseFloat(getVal('cust-body-width', '1.0')) || 1.0;
  }

  function openCustomizer() {
    if (!customizerDialog) return;
    clearAllMovementKeys();
    previewDraft = { ...clone(DEFAULT_APPEARANCE), ...clone(appearance) };
    populateCustomizerControls(previewDraft);

    const note = document.getElementById('cust-account-note');
    if (note) {
      note.textContent = accountUser
        ? `已登入 @${accountUser} — 儲存後即時同步至多人連線與雲端存檔`
        : '請先登入帳號以同步雲端外觀';
    }

    initPreviewCanvas();
    refreshPreviewModel();
    customizerDialog.showModal();
    startPreviewLoop();
  }

  if (hudCustomizeBtn) hudCustomizeBtn.addEventListener('click', openCustomizer);
  const custCloseBtn = document.getElementById('rpg-customizer-close');
  if (custCloseBtn && customizerDialog) custCloseBtn.addEventListener('click', () => customizerDialog.close());

  [
    'cust-hair-style', 'cust-eye-style', 'cust-ear-style', 'cust-face-accessory',
    'cust-headgear', 'cust-wing-style', 'cust-hair-color', 'cust-skin-color',
    'cust-eye-color', 'cust-wing-color', 'cust-outfit-primary', 'cust-outfit-secondary',
    'cust-cape-color', 'cust-cape', 'cust-height', 'cust-body-width'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      readCustomizerControlsIntoDraft();
      refreshPreviewModel();
    });
  });

  const custRandomBtn = document.getElementById('cust-random-btn');
  if (custRandomBtn) {
    custRandomBtn.addEventListener('click', () => {
      if (!previewDraft) return;
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      previewDraft.hairStyle = pick(['spiky', 'long', 'ponytail', 'twin', 'samurai', 'bob', 'mohawk', 'afro', 'crown_braid', 'bald']);
      previewDraft.eyeStyle = pick(['normal', 'sharp', 'cat', 'glowing', 'scar', 'eyepatch']);
      previewDraft.earStyle = pick(['human', 'elf', 'dark_elf', 'fin']);
      previewDraft.elfEars = previewDraft.earStyle === 'elf' || previewDraft.earStyle === 'dark_elf';
      previewDraft.faceAccessory = pick(['none', 'war_paint', 'beard_full', 'mustache', 'goatee', 'glasses', 'sunglasses', 'oni_mask']);
      previewDraft.headgear = pick(['none', 'gold_crown', 'laurel', 'demon_horns', 'dragon_horns', 'halo', 'wizard_hat', 'viking_helm', 'cat_ears']);
      previewDraft.wingStyle = pick(['none', 'angel', 'demon', 'dragon', 'fairy', 'cyber_blades']);
      previewDraft.hairColor = pick(['#1e1b4b', '#f8fafc', '#dc2626', '#f59e0b', '#10b981', '#38bdf8', '#a855f7', '#ec4899', '#3b2f2f']);
      previewDraft.skinColor = pick(['#fde68a', '#f5cfa0', '#d97706', '#c084fc', '#93c5fd', '#86efac', '#e2e8f0']);
      previewDraft.eyeColor = pick(['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#06b6d4']);
      previewDraft.wingColor = pick(['#f8fafc', '#fef08a', '#ef4444', '#38bdf8', '#a855f7', '#34d399']);
      previewDraft.outfitPrimary = pick(['#4f46e5', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0284c7', '#18181b']);
      previewDraft.outfitSecondary = pick(['#fbbf24', '#e2e8f0', '#38bdf8', '#f43f5e']);
      previewDraft.capeColor = pick(['#7c3aed', '#991b1b', '#0f172a', '#0369a1', '#b45309']);
      previewDraft.cape = Math.random() > 0.25;
      previewDraft.heightScale = Number((0.88 + Math.random() * 0.28).toFixed(2));
      previewDraft.bodyWidthScale = Number((0.85 + Math.random() * 0.35).toFixed(2));
      populateCustomizerControls(previewDraft);
      refreshPreviewModel();
    });
  }

  const custSaveBtn = document.getElementById('cust-save-btn');
  if (custSaveBtn) {
    custSaveBtn.addEventListener('click', () => {
      if (!previewDraft) return;
      readCustomizerControlsIntoDraft();
      appearance = clone(previewDraft);
      rebuildPlayerMesh();
      if (net.isConnected()) net.pushPlayerState(buildMyNetworkSnapshot(), true);
      triggerAutoSave();
      customizerDialog.close();
      showToast('🎨 角色 3D 捏臉與奇幻造型已更新並儲存！', 'success');
    });
  }

  // --- Dialog 3: Elf Merchant Shop ---
  const shopListEl = document.getElementById('rpg-shop-list');
  const shopGoldEl = document.getElementById('rpg-shop-gold');
  const shopTabs = document.querySelectorAll('.rpg-shop-tab');
  let activeShopCat = 'weapon';

  function renderShopList() {
    if (!shopListEl) return;
    if (shopGoldEl) shopGoldEl.textContent = `${state.gold} G`;
    shopListEl.textContent = '';

    Object.values(SHOP_ITEMS)
      .filter((it) => !it.craftOnly && it.category === activeShopCat && it.price > 0)
      .forEach((item) => {
        const owned = item.category !== 'consumable' && state.ownedItems.includes(item.id);
        const card = document.createElement('div');
        card.className = 'rpg-item-card';

        const statLine = item.category === 'weapon'
          ? `攻擊 +${item.atk}${item.bonusMp ? ` · 魔力 +${item.bonusMp}` : ''}`
          : item.category === 'armor'
            ? `防禦 +${item.def} · 血量 +${item.bonusHp}`
            : `持有：${state.potions[item.potionKey] || 0} 瓶`;

        card.innerHTML = `
          <div class="rpg-item-info">
            <div class="rpg-item-name">${item.name}</div>
            <div class="rpg-item-stat">${statLine}</div>
            <div class="rpg-item-desc">${item.desc}</div>
          </div>
          <button type="button" class="rpg-buy-btn" ${owned ? 'disabled' : ''}>
            ${owned ? '已擁有' : `${item.price} G 購買`}
          </button>
        `;

        const btn = card.querySelector('.rpg-buy-btn');
        if (btn && !owned) {
          btn.addEventListener('click', () => {
            if (state.gold < item.price) {
              showToast('💰 金幣不足！快去野外狩獵魔物賺取賞金吧', 'warn');
              return;
            }
            state.gold -= item.price;
            if (item.category === 'consumable') {
              state.potions[item.potionKey] = (state.potions[item.potionKey] || 0) + 1;
              showToast(`購買成功：${item.name} x1`, 'success');
            } else {
              state.ownedItems.push(item.id);
              if (item.category === 'weapon') state.weaponId = item.id;
              if (item.category === 'armor') state.armorId = item.id;
              rebuildPlayerMesh();
              currentHp = Math.min(stats.maxHp, currentHp + (item.bonusHp || 0));
              showToast(`⚔️ 購買並裝備了【${item.name}】！`, 'success');
            }
            updateHud();
            renderShopList();
            triggerAutoSave();
          });
        }
        shopListEl.appendChild(card);
      });
  }

  function openShopDialog() {
    if (!shopDialog) return;
    clearAllMovementKeys();
    renderShopList();
    shopDialog.showModal();
  }

  shopTabs.forEach((t) => {
    t.addEventListener('click', () => {
      activeShopCat = t.dataset.cat;
      shopTabs.forEach((b) => b.classList.toggle('active', b === t));
      renderShopList();
    });
  });

  if (hudShopPrompt) hudShopPrompt.addEventListener('click', interactNearestNpc);
  const shopCloseBtn = document.getElementById('rpg-shop-close');
  if (shopCloseBtn && shopDialog) shopCloseBtn.addEventListener('click', () => shopDialog.close());

  // --- Dialog 3B: Dwarf Blacksmith Forge (Monster Hunter × Baldur's Gate Material Crafting!) ---
  const forgeListEl = document.getElementById('rpg-forge-list');
  const forgeGoldEl = document.getElementById('rpg-forge-gold');
  const forgeTabs = document.querySelectorAll('.rpg-forge-tab');
  let activeForgeCat = 'weapon';

  function renderForgeList() {
    if (!forgeListEl) return;
    if (forgeGoldEl) forgeGoldEl.textContent = `${state.gold} G`;
    forgeListEl.textContent = '';
    if (!state.materials) state.materials = {};

    Object.values(SHOP_ITEMS)
      .filter((it) => it.craftOnly && it.category === activeForgeCat)
      .forEach((item) => {
        const owned = state.ownedItems.includes(item.id);
        const recipeEntries = Object.entries(item.recipe || {});
        const hasMaterials = recipeEntries.every(([mId, req]) => (state.materials[mId] || 0) >= req);
        const hasGold = state.gold >= (item.craftGold || 0);
        const canCraft = !owned && hasMaterials && hasGold;

        const card = document.createElement('div');
        card.className = `rpg-item-card${item.rarity ? ` rarity-${item.rarity}` : ''}`;

        const statLine = item.category === 'weapon'
          ? `攻擊 +${item.atk}${item.bonusMp ? ` · 魔力 +${item.bonusMp}` : ''}${item.lifestealBonus ? ` · 吸血 ${Math.round(item.lifestealBonus * 100)}%` : ''}${item.bossSlayer ? ` · 對Boss ${Math.round(item.bossSlayer * 100)}%` : ''}`
          : `防禦 +${item.def} · 血量 +${item.bonusHp}${item.passiveRegen ? ` · 回血 +${item.passiveRegen}/s` : ''}${item.speedBonus ? ` · 移速 +${Math.round(item.speedBonus * 100)}%` : ''}`;

        const chipsHtml = recipeEntries.map(([mId, req]) => {
          const have = state.materials[mId] || 0;
          const mDef = MATERIALS[mId];
          const ok = have >= req;
          return `<span class="rpg-mat-chip ${ok ? 'ok' : 'miss'}">${mDef ? mDef.name : mId} ${have}/${req}</span>`;
        }).join('');

        card.innerHTML = `
          <div class="rpg-item-info">
            <div class="rpg-item-name">${item.name}</div>
            <div class="rpg-item-stat">${statLine}</div>
            <div class="rpg-item-desc">${item.desc}</div>
            <div class="rpg-recipe-chips">${chipsHtml}<span class="rpg-mat-chip ${hasGold ? 'ok' : 'miss'}">💰 鍛造費 ${item.craftGold} G</span></div>
          </div>
          <button type="button" class="rpg-buy-btn" ${owned || !canCraft ? 'disabled' : ''}>
            ${owned ? '已鍛造' : (canCraft ? '⚒️ 立即鍛造' : '素材不足')}
          </button>
        `;

        const btn = card.querySelector('.rpg-buy-btn');
        if (btn && canCraft) {
          btn.addEventListener('click', () => {
            state.gold -= (item.craftGold || 0);
            recipeEntries.forEach(([mId, req]) => {
              state.materials[mId] = Math.max(0, (state.materials[mId] || 0) - req);
            });
            state.ownedItems.push(item.id);
            if (item.category === 'weapon') state.weaponId = item.id;
            if (item.category === 'armor') state.armorId = item.id;
            rebuildPlayerMesh();
            currentHp = Math.min(stats.maxHp, currentHp + (item.bonusHp || 0));
            vfx.spawnWaterWave(playerRoot.position, 6.5);
            showToast(`⚒️ 傳奇鍛造成功！已裝備【${item.name}】！`, 'success');
            updateHud();
            renderForgeList();
            triggerAutoSave();
          });
        }
        forgeListEl.appendChild(card);
      });
  }

  function openForgeDialog() {
    if (!forgeDialog) return;
    clearAllMovementKeys();
    renderForgeList();
    forgeDialog.showModal();
  }

  forgeTabs.forEach((t) => {
    t.addEventListener('click', () => {
      activeForgeCat = t.dataset.cat;
      forgeTabs.forEach((b) => b.classList.toggle('active', b === t));
      renderForgeList();
    });
  });
  const forgeCloseBtn = document.getElementById('rpg-forge-close');
  if (forgeCloseBtn && forgeDialog) forgeCloseBtn.addEventListener('click', () => forgeDialog.close());

  // --- Dialog 3C: Baldur's Gate Alchemist Sage ---
  const alchemistListEl = document.getElementById('rpg-alchemist-list');
  const alchemistGoldEl = document.getElementById('rpg-alchemist-gold');

  function renderAlchemistList() {
    if (!alchemistListEl) return;
    if (alchemistGoldEl) alchemistGoldEl.textContent = `${state.gold} G`;
    alchemistListEl.textContent = '';

    Object.values(SHOP_ITEMS)
      .filter((it) => it.category === 'alchemist')
      .forEach((item) => {
        const card = document.createElement('div');
        card.className = 'rpg-item-card rarity-epic';
        card.innerHTML = `
          <div class="rpg-item-info">
            <div class="rpg-item-name">${item.name}</div>
            <div class="rpg-item-desc">${item.desc}</div>
          </div>
          <button type="button" class="rpg-buy-btn">${item.price} G 購買</button>
        `;
        const btn = card.querySelector('.rpg-buy-btn');
        if (btn) {
          btn.addEventListener('click', () => {
            if (state.gold < item.price) {
              showToast('💰 金幣不足！去狩獵 Boss 賺取更多金幣吧', 'warn');
              return;
            }
            state.gold -= item.price;
            if (item.instantEffect === 'grant_perk') {
              alchemistDialog.close();
              pendingPerkPicks += 1;
              showToast('🔮 使用秘法重鑄卷軸！請選擇一項肉鴿賜福！', 'success');
              openNextPerkDialog();
            } else if (item.instantEffect === 'grant_mithral') {
              if (!state.materials) state.materials = {};
              state.materials.balduran_mithral = (state.materials.balduran_mithral || 0) + 1;
              showToast('✨ 獲得稀世素材【柏德安秘銀礦石 ×1】！', 'success');
            } else if (item.potionKey) {
              state.potions[item.potionKey] = (state.potions[item.potionKey] || 0) + (item.grantCount || 1);
              showToast(`🍷 購買成功：生命聖水 +${item.grantCount || 1} 瓶！`, 'success');
            }
            updateHud();
            renderAlchemistList();
            triggerAutoSave();
          });
        }
        alchemistListEl.appendChild(card);
      });
  }

  function openAlchemistDialog() {
    if (!alchemistDialog) return;
    clearAllMovementKeys();
    renderAlchemistList();
    alchemistDialog.showModal();
  }
  const alchemistCloseBtn = document.getElementById('rpg-alchemist-close');
  if (alchemistCloseBtn && alchemistDialog) alchemistCloseBtn.addEventListener('click', () => alchemistDialog.close());

  // --- Dialog 3D: World Codex & Monster Hunter Materials Pouch ---
  const codexListEl = document.getElementById('rpg-codex-list');
  const codexTabs = document.querySelectorAll('.rpg-codex-tab');
  let activeCodexTab = 'materials';

  function renderCodexList() {
    if (!codexListEl) return;
    codexListEl.textContent = '';
    if (!state.materials) state.materials = {};

    if (activeCodexTab === 'materials') {
      Object.values(MATERIALS).forEach((m) => {
        const qty = state.materials[m.id] || 0;
        const card = document.createElement('div');
        card.className = `rpg-item-card${m.rarity === 'mythic' ? ' rarity-mythic' : m.rarity === 'epic' ? ' rarity-epic' : ''}`;
        card.innerHTML = `
          <div class="rpg-item-info">
            <div class="rpg-item-name">${m.name}</div>
            <div class="rpg-item-desc">掉落來源：${m.source}</div>
          </div>
          <span class="rpg-mat-qty-pill">持有 ×${qty}</span>
        `;
        codexListEl.appendChild(card);
      });
    } else {
      Object.values(ZONES).forEach((z) => {
        const dirX = z.center.x > 15 ? '東' : z.center.x < -15 ? '西' : '';
        const dirZ = z.center.z > 15 ? '南' : z.center.z < -15 ? '北' : '';
        const compass = (!dirX && !dirZ) ? '地圖中央' : `地圖${dirX}${dirZ}方`;
        const card = document.createElement('div');
        card.className = 'rpg-item-card';
        card.innerHTML = `
          <div class="rpg-item-info">
            <div class="rpg-item-name">${z.name}</div>
            <div class="rpg-item-desc">方位：${compass} · 座標 (${z.center.x}, ${z.center.z})</div>
          </div>
          <span class="rpg-mat-qty-pill">${z.safe ? '安全區' : '危險狩獵區'}</span>
        `;
        codexListEl.appendChild(card);
      });
    }
  }

  function openCodexDialog() {
    if (!codexDialog) return;
    clearAllMovementKeys();
    renderCodexList();
    codexDialog.showModal();
  }

  if (hudCodexBtn) hudCodexBtn.addEventListener('click', openCodexDialog);
  codexTabs.forEach((t) => {
    t.addEventListener('click', () => {
      activeCodexTab = t.dataset.tab;
      codexTabs.forEach((b) => b.classList.toggle('active', b === t));
      renderCodexList();
    });
  });
  const codexCloseBtn = document.getElementById('rpg-codex-close');
  if (codexCloseBtn && codexDialog) codexCloseBtn.addEventListener('click', () => codexDialog.close());

  // --- Dialog 4: Inventory / Equipment Bag ---
  const bagListEl = document.getElementById('rpg-bag-list');
  function renderBagDialog() {
    if (!bagListEl) return;
    bagListEl.textContent = '';
    const owned = state.ownedItems || [];
    owned.forEach((id) => {
      const item = SHOP_ITEMS[id];
      if (!item) return;
      const equipped = state.weaponId === id || state.armorId === id;
      const card = document.createElement('div');
      card.className = 'rpg-item-card';
      card.innerHTML = `
        <div class="rpg-item-info">
          <div class="rpg-item-name">${item.name}</div>
          <div class="rpg-item-desc">${item.desc}</div>
        </div>
        <button type="button" class="rpg-buy-btn" ${equipped ? 'disabled' : ''}>
          ${equipped ? '已裝備' : '裝備'}
        </button>
      `;
      const btn = card.querySelector('.rpg-buy-btn');
      if (btn && !equipped) {
        btn.addEventListener('click', () => {
          if (item.category === 'weapon') state.weaponId = id;
          if (item.category === 'armor') state.armorId = id;
          rebuildPlayerMesh();
          currentHp = Math.min(currentHp, stats.maxHp);
          updateHud();
          renderBagDialog();
          triggerAutoSave();
          showToast(`已切換裝備：${item.name}`, 'info');
        });
      }
      bagListEl.appendChild(card);
    });
  }

  if (hudBagBtn && bagDialog) {
    hudBagBtn.addEventListener('click', () => {
      renderBagDialog();
      bagDialog.showModal();
    });
  }
  const bagCloseBtn = document.getElementById('rpg-bag-close');
  if (bagCloseBtn && bagDialog) bagCloseBtn.addEventListener('click', () => bagDialog.close());

  // --- Phase 2: Multiplayer Network, Remote Avatars & Party System ---
  function buildMyNetworkSnapshot() {
    return {
      name: playerNickname,
      level: state.level,
      x: Number(playerRoot.position.x.toFixed(2)),
      z: Number(playerRoot.position.z.toFixed(2)),
      rotY: Number(playerRoot.rotation.y.toFixed(2)),
      hp: Math.ceil(currentHp),
      maxHp: stats.maxHp,
      isMoving: !isDead && (keys['w'] || keys['a'] || keys['s'] || keys['d'] || keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'] || dodgeAnim > 0) ? 1 : 0,
      attackStamp: lastAttackStamp,
      shield: earthShieldTimer > 0 ? 1 : 0,
      appearance: appearance,
      weaponId: state.weaponId,
      armorId: state.armorId,
      partyId: partyId || null
    };
  }

  function refreshRemoteNameplate(remote) {
    if (!remote || !remote.nameplate || !remote.data) return;
    const d = remote.data;
    const same = isSameParty(d.partyId);
    const inSafe = isInSafeZone(remote.root.position);
    const prefix = same ? '🤝 ' : (!inSafe ? '⚔️ ' : '');
    const color = same ? '#6ee7b7' : (!inSafe ? '#fda4af' : '#e2e8f0');
    const ratio = (d.maxHp || 100) > 0 ? (d.hp || 0) / (d.maxHp || 100) : 1;
    remote.nameplate.redraw(`${prefix}${d.name || '冒險者'} Lv.${d.level || 1}`, ratio, color);
  }

  function syncRemoteAvatars(remoteMap) {
    // Remove disconnected players
    for (const [rUid, avatar] of remoteAvatars.entries()) {
      if (!remoteMap.has(rUid)) {
        scene.remove(avatar.root);
        remoteAvatars.delete(rUid);
      }
    }

    // Create or update online players
    remoteMap.forEach((pData, rUid) => {
      const app = { ...DEFAULT_APPEARANCE, ...(pData.appearance || {}) };
      const wItem = SHOP_ITEMS[pData.weaponId] || SHOP_ITEMS.wood_sword;
      const aItem = SHOP_ITEMS[pData.armorId] || SHOP_ITEMS.cloth_tunic;
      const sig = JSON.stringify([app, pData.weaponId, pData.armorId]);

      let avatar = remoteAvatars.get(rUid);
      if (!avatar) {
        const root = new THREE.Group();
        root.position.set(pData.x || 0, 0, pData.z || 10);
        const model = createCharacterModel(app, wItem, aItem);
        root.add(model.group);

        const nameplate = createNameplateSprite(pData.name || '冒險者', '#e2e8f0', true);
        nameplate.sprite.position.set(0, 2.85 * (app.heightScale || 1), 0);
        root.add(nameplate.sprite);
        scene.add(root);

        avatar = {
          root,
          model,
          nameplate,
          sig,
          targetPos: new THREE.Vector3(pData.x || 0, 0, pData.z || 10),
          targetRotY: pData.rotY || 0,
          data: pData,
          lastAttackStamp: pData.attackStamp || 0,
          attackAnim: 0
        };
        remoteAvatars.set(rUid, avatar);
      } else {
        if (avatar.sig !== sig) {
          avatar.root.remove(avatar.model.group);
          avatar.model = createCharacterModel(app, wItem, aItem);
          avatar.root.add(avatar.model.group);
          avatar.sig = sig;
        }
        avatar.targetPos.set(pData.x || 0, 0, pData.z || 10);
        avatar.targetRotY = pData.rotY || 0;
        if (pData.attackStamp && pData.attackStamp !== avatar.lastAttackStamp) {
          avatar.lastAttackStamp = pData.attackStamp;
          avatar.attackAnim = 1.0;
        }
        avatar.data = pData;
      }
      refreshRemoteNameplate(avatar);
    });

    renderPartyHud();
    if (partyDialog && partyDialog.open) renderPartyDialog();
  }

  const net = createMultiplayerNetwork({
    onStatusChange(online, text) {
      if (hudNetBadge) {
        hudNetBadge.textContent = text;
        hudNetBadge.classList.toggle('online', !!online);
      }
    },
    onPlayersUpdate(remoteMap) {
      syncRemoteAvatars(remoteMap);
    },
    onIncomingHit(hit) {
      if (hit.type === 'heal') {
        if (isDead) return;
        const amt = Math.max(1, Math.round(hit.amount || 30));
        currentHp = Math.min(stats.maxHp, currentHp + amt);
        spawnFloatingText(playerRoot.position, `💧 +${amt} HP (${hit.fromName || '隊友'})`, '#34d399', true);
        updateHud();
        return;
      }
      if (hit.type === 'pvp') {
        // Double-check safe zone & party friendly-fire protection locally
        if (isInSafeZone(playerRoot.position)) return;
        if (isSameParty(hit.fromPartyId)) return;
        takePlayerDamage(hit.dmg || 10, hit.fromName || '冒險者');
        if (hit.knockX || hit.knockZ) {
          playerRoot.position.x += (hit.knockX || 0) * 0.35;
          playerRoot.position.z += (hit.knockZ || 0) * 0.35;
        }
      }
    },
    onPartyInvite(inv) {
      pendingInvite = inv;
      if (hudInviteText) {
        hudInviteText.textContent = `🤝 【${inv.fromName || '冒險者'}】邀請你加入隊伍 (${inv.partyId})`;
      }
      if (hudInviteBanner) hudInviteBanner.hidden = false;
    },
    onRemoteFx(fx) {
      const origin = new THREE.Vector3(fx.x || 0, 0, fx.z || 0);
      if (fx.type === 'slash') {
        vfx.spawnSlash(origin, fx.yaw || 0, fx.color || '#a5b4fc');
      } else if (fx.type === 'lightning') {
        const chains = (fx.chains || []).map((c) => new THREE.Vector3(c.x, 0, c.z));
        vfx.spawnLightning(origin, chains);
      } else if (fx.type === 'fire') {
        const dir = new THREE.Vector3(fx.dirX || 0, 0, fx.dirZ || 1).normalize();
        vfx.spawnFireball(origin, dir, fx.range || 18, () => false, () => {});
      } else if (fx.type === 'water') {
        vfx.spawnWaterWave(origin, fx.radius || 7.5);
      } else if (fx.type === 'earth') {
        const dir = new THREE.Vector3(fx.dirX || 0, 0, fx.dirZ || 1).normalize();
        vfx.spawnEarthSpikes(origin, dir, fx.range || 11);
      } else if (fx.type === 'shout') {
        const dir = new THREE.Vector3(fx.dirX || 0, 0, fx.dirZ || 1).normalize();
        vfx.spawnDragonShout(origin, dir, fx.range || 15);
      } else if (fx.type === 'frost') {
        vfx.spawnFrostNova(origin, fx.radius || 7.0);
      }
    },
    onMobsSync(mobsMap) {
      mobs.forEach((mob) => {
        const synced = mobsMap[mob.id];
        if (!synced) return;
        mob.alive = !!synced.alive;
        mob.hp = synced.hp != null ? synced.hp : mob.hp;
        mob.visual.group.visible = mob.alive;
        if (mob.alive) {
          mob.syncTargetPos = new THREE.Vector3(synced.x, 0, synced.z);
          mob.syncTargetRotY = synced.rotY || 0;
          mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mob.def.level}`, mob.hp / mob.def.maxHp);
        }
      });
    },
    onHostMobHit(req) {
      const mob = mobs.find((m) => m.id === req.mobId);
      if (mob && mob.alive) {
        applyDamageToMob(mob, req.damage || 10, req.color || '#fef08a', !!req.isCrit, req.statusEffects, req.fromUid);
      }
    },
    onKillBroadcast(ev) {
      // If we are NOT the host (host already granted locally), grant reward if we killed it or are in killer's party
      if (net.isHost()) return;
      if (ev.killerUid === net.uid || isSameParty(ev.killerPartyId)) {
        const mobDef = MOB_TYPES[ev.mobType];
        grantKillReward(
          ev.mobType,
          ev.mobName || (mobDef && mobDef.name) || '怪物',
          !!(mobDef && mobDef.isBoss),
          new THREE.Vector3(ev.x || 0, 0, ev.z || 0),
          ev.exp || 20,
          ev.gold || 20,
          ev.killerUid !== net.uid
        );
      }
    }
  });

  // --- Party HUD & Dialog Controls ---
  function renderPartyHud() {
    if (!hudPartyHud) return;
    if (!partyId) {
      hudPartyHud.hidden = true;
      hudPartyHud.textContent = '';
      return;
    }

    const teammates = [];
    remoteAvatars.forEach((avatar) => {
      if (isSameParty(avatar.data && avatar.data.partyId)) {
        teammates.push(avatar.data);
      }
    });

    hudPartyHud.hidden = false;
    hudPartyHud.textContent = '';

    const header = document.createElement('div');
    header.className = 'rpg-teammate-card';
    header.innerHTML = `<div class="rpg-teammate-top"><span>🤝 隊伍 [${partyId}]</span><span>${teammates.length + 1} 人</span></div>`;
    hudPartyHud.appendChild(header);

    teammates.forEach((tm) => {
      const pct = Math.max(0, Math.min(100, ((tm.hp || 0) / (tm.maxHp || 100)) * 100));
      const card = document.createElement('div');
      card.className = 'rpg-teammate-card';
      card.innerHTML = `
        <div class="rpg-teammate-top">
          <span>${tm.name || '隊友'} Lv.${tm.level || 1}</span>
          <span>${tm.hp || 0}/${tm.maxHp || 100}</span>
        </div>
        <div class="rpg-teammate-bar"><div class="rpg-teammate-bar-fill" style="width:${pct}%"></div></div>
      `;
      hudPartyHud.appendChild(card);
    });
  }

  function renderPartyDialog() {
    const statusBox = document.getElementById('rpg-party-status-box');
    const createBtn = document.getElementById('rpg-create-party-btn');
    const leaveBtn = document.getElementById('rpg-leave-party-btn');
    const listEl = document.getElementById('rpg-online-players-list');

    if (statusBox) {
      if (!net.isConnected()) {
        statusBox.innerHTML = '⚪ 目前為<b>單機模式</b>。<br>請在 <code>assets/js/config.js</code> 填入免費的 <b>Firebase Realtime Database</b> 設定，即可立即開啟真人即時組隊與野外 PvP 對打！';
      } else if (partyId) {
        statusBox.innerHTML = `🤝 目前所在隊伍代碼：<strong style="color:#6ee7b7;font-size:1.05rem">${partyId}</strong><br>同隊成員在野外互相免傷，並共享打怪經驗與金幣。`;
      } else {
        statusBox.innerHTML = '🟢 多人連線已就緒！目前尚未加入隊伍（出村後會與其他非同隊玩家互相造成傷害）。';
      }
    }
    if (createBtn) createBtn.hidden = !!partyId;
    if (leaveBtn) leaveBtn.hidden = !partyId;

    if (listEl) {
      listEl.textContent = '';
      if (remoteAvatars.size === 0) {
        const empty = document.createElement('div');
        empty.className = 'rpg-item-desc';
        empty.textContent = net.isConnected() ? '目前地圖上還沒有其他線上冒險者。' : '連線至 Firebase 後將在此顯示所有線上玩家。';
        listEl.appendChild(empty);
      } else {
        remoteAvatars.forEach((avatar, rUid) => {
          const d = avatar.data || {};
          const same = isSameParty(d.partyId);
          const card = document.createElement('div');
          card.className = 'rpg-item-card';
          card.innerHTML = `
            <div class="rpg-item-info">
              <div class="rpg-item-name">${same ? '🤝 ' : ''}${d.name || '冒險者'} (Lv.${d.level || 1})</div>
              <div class="rpg-item-desc">${same ? '同隊隊友（免傷）' : (d.partyId ? `隊伍 [${d.partyId}]` : '獨行冒險者')}</div>
            </div>
            <button type="button" class="rpg-buy-btn" ${same ? 'disabled' : ''}>${same ? '已同隊' : '邀請組隊'}</button>
          `;
          const btn = card.querySelector('.rpg-buy-btn');
          if (btn && !same) {
            btn.addEventListener('click', () => {
              if (!partyId) {
                partyId = Math.random().toString(36).substring(2, 6).toUpperCase();
                net.pushPlayerState(buildMyNetworkSnapshot(), true);
              }
              net.sendPartyInvite(rUid, partyId, playerNickname);
              showToast(`📨 已向 ${d.name || '冒險者'} 發出組隊邀請！`, 'success');
              renderPartyHud();
              renderPartyDialog();
            });
          }
          listEl.appendChild(card);
        });
      }
    }
  }

  if (hudPartyBtn && partyDialog) {
    hudPartyBtn.addEventListener('click', () => {
      renderPartyDialog();
      partyDialog.showModal();
    });
  }
  const partyCloseBtn = document.getElementById('rpg-party-close');
  if (partyCloseBtn && partyDialog) partyCloseBtn.addEventListener('click', () => partyDialog.close());

  const createPartyBtn = document.getElementById('rpg-create-party-btn');
  if (createPartyBtn) {
    createPartyBtn.addEventListener('click', () => {
      partyId = Math.random().toString(36).substring(2, 6).toUpperCase();
      net.pushPlayerState(buildMyNetworkSnapshot(), true);
      remoteAvatars.forEach(refreshRemoteNameplate);
      renderPartyHud();
      renderPartyDialog();
      showToast(`🤝 已建立隊伍 [${partyId}]！快邀請朋友加入吧`, 'success');
    });
  }

  const joinPartyBtn = document.getElementById('rpg-join-party-btn');
  const joinCodeInput = document.getElementById('rpg-join-code-input');
  if (joinPartyBtn && joinCodeInput) {
    joinPartyBtn.addEventListener('click', () => {
      const code = joinCodeInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length < 2) {
        showToast('請輸入有效的隊伍代碼', 'warn');
        return;
      }
      partyId = code;
      joinCodeInput.value = '';
      net.pushPlayerState(buildMyNetworkSnapshot(), true);
      remoteAvatars.forEach(refreshRemoteNameplate);
      renderPartyHud();
      renderPartyDialog();
      showToast(`🤝 已加入隊伍 [${partyId}]！`, 'success');
    });
  }

  const leavePartyBtn = document.getElementById('rpg-leave-party-btn');
  if (leavePartyBtn) {
    leavePartyBtn.addEventListener('click', () => {
      partyId = null;
      net.pushPlayerState(buildMyNetworkSnapshot(), true);
      remoteAvatars.forEach(refreshRemoteNameplate);
      renderPartyHud();
      renderPartyDialog();
      showToast('已退出隊伍', 'info');
    });
  }

  if (hudInviteAccept) {
    hudInviteAccept.addEventListener('click', () => {
      if (pendingInvite && pendingInvite.partyId) {
        partyId = pendingInvite.partyId;
        net.pushPlayerState(buildMyNetworkSnapshot(), true);
        remoteAvatars.forEach(refreshRemoteNameplate);
        renderPartyHud();
        showToast(`🤝 已加入隊伍 [${partyId}]！同隊免傷生效中`, 'success');
      }
      pendingInvite = null;
      if (hudInviteBanner) hudInviteBanner.hidden = true;
    });
  }
  if (hudInviteDecline) {
    hudInviteDecline.addEventListener('click', () => {
      pendingInvite = null;
      if (hudInviteBanner) hudInviteBanner.hidden = true;
    });
  }

  // --- Resize Handling ---
  function handleResize() {
    const w = Math.max(200, canvasHost.clientWidth);
    const h = Math.max(200, canvasHost.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // --- Mandatory Auto-Login on Boot (No Guests Allowed) ---
  (async () => {
    const restored = await autoLoginFromSession();
    if (restored) {
      accountUser = restored.username;
      playerNickname = restored.nickname || restored.username;
      if (restored.appearance && Object.keys(restored.appearance).length) {
        appearance = { ...clone(DEFAULT_APPEARANCE), ...restored.appearance };
      }
      let wasSeasonReset = false;
      if (restored.state && Object.keys(restored.state).length) {
        const norm = normalizeLoadedState(restored.state);
        state = norm.state;
        wasSeasonReset = norm.wasReset;
      }
      stats = computePlayerStats(state);
      currentHp = Math.min(state.hp || stats.maxHp, stats.maxHp);
      currentMp = Math.min(state.mp || stats.maxMp, stats.maxMp);
      syncNicknameToChat(playerNickname);
      rebuildPlayerMesh();
      rescaleLivingMobsToPlayerLevel();
      renderPerksStrip();
      updateHud();
      if (wasSeasonReset) {
        triggerAutoSave();
        showToast(`🔄 新賽季重置完成！已從 Lv.1 重新出發（天賦最高 Lv.${MAX_PERK_LEVEL}）`, 'success');
      }
      net.connect(buildMyNetworkSnapshot());
    } else {
      saveSession(null);
      accountUser = null;
      updateHud();
      openMandatoryLogin();
    }
  })();

  // --- Main 60fps Game Loop ---
  const clock = new THREE.Clock();
  let hudTick = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());

    // Cooldowns & buffs
    for (const k of Object.keys(cooldowns)) {
      if (cooldowns[k] > 0) cooldowns[k] = Math.max(0, cooldowns[k] - dt);
    }
    if (attackAnim > 0) attackAnim = Math.max(0, attackAnim - dt * 3.4);
    if (dodgeAnim > 0) dodgeAnim = Math.max(0, dodgeAnim - dt * 2.8);
    if (earthShieldTimer > 0) earthShieldTimer = Math.max(0, earthShieldTimer - dt);
    if (chestCooldown > 0) chestCooldown = Math.max(0, chestCooldown - dt);

    // Respawn handling
    if (isDead) {
      respawnTimer -= dt;
      if (respawnTimer <= 0) {
        isDead = false;
        infectionTimer = 0;
        petrifyTimer = 0;
        playerBurnTimer = 0;
        currentHp = stats.maxHp;
        currentMp = stats.maxMp;
        playerRoot.position.set(0, 0, 10);
        showToast('🌿 已於精靈村莊復活！', 'success');
        updateHud();
      }
    } else {
      // Passive HP/MP regen (much faster inside Elf Village safe zone!)
      const inSafe = isInSafeZone(playerRoot.position);
      currentMp = Math.min(stats.maxMp, currentMp + (inSafe ? 18 : 7.0) * dt);
      if (inSafe) {
        currentHp = Math.min(stats.maxHp, currentHp + 24 * dt);
        infectionTimer = 0;
        petrifyTimer = 0;
        playerBurnTimer = 0;
      } else if (stats.passiveHpRegen > 0) {
        currentHp = Math.min(stats.maxHp, currentHp + stats.passiveHpRegen * dt);
      }

      // 1. Medusa Petrifying Gaze timer
      if (petrifyTimer > 0) {
        petrifyTimer = Math.max(0, petrifyTimer - dt);
      }

      // 2. Hellfire Burn DoT (Cerberus / Chimera / Dragon)
      if (playerBurnTimer > 0) {
        playerBurnTimer = Math.max(0, playerBurnTimer - dt);
        playerBurnTick -= dt;
        if (playerBurnTick <= 0) {
          playerBurnTick = 0.85;
          const fireDoT = Math.max(7, Math.round(stats.maxHp * 0.052));
          currentHp = Math.max(1, currentHp - fireDoT);
          spawnFloatingText(playerRoot.position, `🔥 -${fireDoT}`, '#fb923c', false);
        }
      }

      // 3. Zombie Plague / Hydra Venom Infection DoT & Slow
      if (infectionTimer > 0) {
        infectionTimer = Math.max(0, infectionTimer - dt);
        infectionTick -= dt;
        if (infectionTick <= 0) {
          infectionTick = 1.0;
          const poisonDmg = Math.max(5, Math.round(stats.maxHp * 0.052 * (1 - (stats.poisonResist || 0))));
          currentHp = Math.max(1, currentHp - poisonDmg);
          spawnFloatingText(playerRoot.position, `☣️ -${poisonDmg}`, '#84cc16', false);
          vfx.spawnPoisonCloud(playerRoot.position);
        }
      }

      // --- Roguelike Auto-Weapons (Vampire Survivors style, Max Lv.5) ---
      const perksObj = state.perks || {};

      // 1. Orbiting Blades (🗡️ 環繞聖劍)
      const bladeRanks = Math.min(MAX_PERK_LEVEL, perksObj.orbit_blades || 0);
      if (bladeRanks > 0) {
        orbitAngle += dt * (2.6 + bladeRanks * 0.35);
        orbitBladesGroup.rotation.y = orbitAngle;
        for (const [mId, rem] of orbitHitCooldowns.entries()) {
          if (rem - dt <= 0) orbitHitCooldowns.delete(mId);
          else orbitHitCooldowns.set(mId, rem - dt);
        }
        if (!inSafe) {
          const bladeDmg = stats.atk * (0.42 + bladeRanks * 0.22);
          mobs.forEach((m) => {
            if (!m.alive || orbitHitCooldowns.has(m.id)) return;
            if (m.visual.group.position.distanceTo(playerRoot.position) <= 2.75 + m.def.radius) {
              orbitHitCooldowns.set(m.id, 0.48);
              applyDamageToMob(m, bladeDmg, '#fef08a', false);
            }
          });
        }
      }

      // 2. Garlic Holy Fire Aura (🔥 聖炎驅魔結界)
      const garlicRanks = Math.min(MAX_PERK_LEVEL, perksObj.garlic_aura || 0);
      if (garlicRanks > 0) {
        garlicAuraMesh.rotation.z += dt * 1.2;
        garlicTick -= dt;
        if (garlicTick <= 0) {
          garlicTick = 0.85;
          if (!inSafe) {
            const auraDmg = stats.atk * (0.34 + garlicRanks * 0.18);
            mobs.forEach((m) => {
              if (!m.alive) return;
              if (m.visual.group.position.distanceTo(playerRoot.position) <= 3.85 + m.def.radius) {
                applyDamageToMob(m, auraDmg, '#fb923c', false, {
                  burn: { duration: 2.2, dmg: Math.round(8 + garlicRanks * 6) }
                });
              }
            });
          }
        }
      }

      // 3. Auto Thunder Strike (⚡ 雷神自動落雷)
      const thunderRanks = Math.min(MAX_PERK_LEVEL, perksObj.auto_thunder || 0);
      if (thunderRanks > 0) {
        autoThunderTick -= dt;
        if (autoThunderTick <= 0) {
          autoThunderTick = Math.max(1.1, 2.7 - thunderRanks * 0.32);
          if (!inSafe) {
            const candidates = mobs.filter(
              (m) => m.alive && m.visual.group.position.distanceTo(playerRoot.position) <= 13.5
            );
            if (candidates.length > 0) {
              const target = candidates[Math.floor(Math.random() * candidates.length)];
              const tPos = target.visual.group.position.clone();
              vfx.spawnLightning(tPos, []);
              applyDamageToMob(target, stats.atk * (0.85 + thunderRanks * 0.35), '#7dd3fc', true, { slow: 1.5 });
            }
          }
        }
      }

      // 4. Frost Nova Pulse (❄️ 寒霜新星脈衝)
      const frostRanks = Math.min(MAX_PERK_LEVEL, perksObj.frost_nova || 0);
      if (frostRanks > 0) {
        frostNovaTick -= dt;
        if (frostNovaTick <= 0) {
          frostNovaTick = Math.max(2.2, 4.6 - frostRanks * 0.45);
          if (!inSafe) {
            const radius = 6.8 + frostRanks * 0.6;
            const hasNearby = mobs.some(
              (m) => m.alive && m.visual.group.position.distanceTo(playerRoot.position) <= radius + 1.5
            );
            if (hasNearby) {
              vfx.spawnFrostNova(playerRoot.position, radius);
              net.broadcastFx({ type: 'frost', x: playerRoot.position.x, z: playerRoot.position.z, radius });
              const frostDmg = stats.atk * (0.65 + frostRanks * 0.28);
              mobs.forEach((m) => {
                if (!m.alive) return;
                if (m.visual.group.position.distanceTo(playerRoot.position) <= radius + m.def.radius) {
                  applyDamageToMob(m, frostDmg, '#67e8f9', false, { slow: 3.2 });
                }
              });
            }
          }
        }
      }

      // Player Movement (auto-clear stuck keys if typing in form or tab is hidden)
      if (isTypingInForm() || document.hidden) {
        clearAllMovementKeys();
      }
      const move = new THREE.Vector3();
      if (dodgeAnim > 0) {
        move.copy(dodgeDir).multiplyScalar(17.5 * dt);
      } else {
        let inX = 0;
        let inZ = 0;
        if (keys['w'] || keys['arrowup']) inZ -= 1;
        if (keys['s'] || keys['arrowdown']) inZ += 1;
        if (keys['a'] || keys['arrowleft']) inX -= 1;
        if (keys['d'] || keys['arrowright']) inX += 1;

        if (inX !== 0 || inZ !== 0) {
          const sinY = Math.sin(camYaw);
          const cosY = Math.cos(camYaw);
          move.x = inX * cosY + inZ * sinY;
          move.z = -inX * sinY + inZ * cosY;
          move.normalize();
          playerRoot.rotation.y = Math.atan2(move.x, move.z);
          const slowMult = petrifyTimer > 0 ? 0.35 : (infectionTimer > 0 ? 0.7 : 1.0);
          const baseSpeed = 10.5 * (stats.speedMult || 1.0) * slowMult;
          move.multiplyScalar(baseSpeed * dt);
        }
      }

      playerRoot.position.add(move);
      // Clamp within expanded 11-biome world boundary (±225m)
      const distFromOrigin = Math.hypot(playerRoot.position.x, playerRoot.position.z);
      if (distFromOrigin > 225) {
        playerRoot.position.multiplyScalar(225 / distFromOrigin);
      }

      const isMoving = move.lengthSq() > 0.0001;
      if (playerModel) {
        playerModel.animate(dt, isMoving, attackAnim, dodgeAnim, earthShieldTimer > 0);
      }
    }

    // Animate & Smooth-Interpolate Remote Players
    remoteAvatars.forEach((avatar) => {
      avatar.root.position.lerp(avatar.targetPos, 0.22);
      avatar.root.rotation.y = avatar.targetRotY;
      if (avatar.attackAnim > 0) avatar.attackAnim = Math.max(0, avatar.attackAnim - dt * 3.4);
      const isRmMoving = !!(avatar.data && avatar.data.isMoving) || avatar.root.position.distanceTo(avatar.targetPos) > 0.15;
      avatar.model.animate(dt, isRmMoving, avatar.attackAnim, 0, !!(avatar.data && avatar.data.shield));
    });

    // Monster AI Loop (Host runs authoritative AI with Dynamic Level Scaling)
    const runLocalMobAi = !net.isConnected() || net.isHost();
    const playerInSafe = isInSafeZone(playerRoot.position);
    mobs.forEach((mob) => {
      if (!runLocalMobAi) {
        if (mob.alive && mob.syncTargetPos) {
          const moved = mob.visual.group.position.distanceTo(mob.syncTargetPos) > 0.1;
          mob.visual.group.position.lerp(mob.syncTargetPos, 0.2);
          mob.visual.group.rotation.y = mob.syncTargetRotY || 0;
          mob.visual.animate(dt, moved, false);
        }
        return;
      }

      if (!mob.alive) {
        mob.respawnTimer -= dt;
        if (mob.respawnTimer <= 0) {
          mob.alive = true;
          mob.burnTimer = 0;
          mob.slowTimer = 0;
          mob.dashBoostTimer = 0;
          mob.visual.group.position.copy(mob.home);
          mob.visual.group.visible = true;
          applyScaledStatsToMob(mob, true);
        }
        return;
      }

      const mobMaxHp = mob.maxHp || mob.def.maxHp;
      const mobAtk = mob.atk || mob.def.atk;
      const mobLvl = mob.level || mob.def.level;
      const mobRegen = mob.regen || mob.def.regen || 0;

      // Natural Regeneration (Troll / Hydra / Shoggoth / Yamata no Orochi — suppressed by Fire!)
      if (mobRegen > 0 && mob.burnTimer <= 0 && mob.hp < mobMaxHp) {
        mob.hp = Math.min(mobMaxHp, mob.hp + mobRegen * dt);
        mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mobLvl}`, mob.hp / mobMaxHp);
      }

      // Burn DoT
      if (mob.burnTimer > 0) {
        mob.burnTimer -= dt;
        mob.burnTick -= dt;
        if (mob.burnTick <= 0) {
          mob.burnTick = 0.75;
          applyDamageToMob(mob, mob.burnDmg, '#f97316', false);
          if (!mob.alive) return;
        }
      }
      if (mob.slowTimer > 0) mob.slowTimer -= dt;
      if (mob.dashBoostTimer > 0) mob.dashBoostTimer -= dt;

      // Knockback velocity decay
      if (mob.knockVel.lengthSq() > 0.05) {
        mob.visual.group.position.addScaledVector(mob.knockVel, dt);
        mob.knockVel.multiplyScalar(0.86);
      }

      const pos = mob.visual.group.position;
      const distToPlayer = pos.distanceTo(playerRoot.position);
      const distToHome = pos.distanceTo(mob.home);
      let moving = false;
      let attacking = false;

      // Enrage below 55% HP for berserker bosses/elites
      const isEnraged = (mob.def.enrage || mob.type === 'cerberus') && mob.hp < mobMaxHp * 0.55;

      if (!isDead && !playerInSafe && distToPlayer <= mob.def.aggroRange && distToHome < 58) {
        // Face player
        const toPlayer = new THREE.Vector3().subVectors(playerRoot.position, pos);
        toPlayer.y = 0;
        const dirToPlayer = toPlayer.clone().normalize();
        mob.visual.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

        // 1. Dash Charge Skill (Minotaur / Orc / Shuten-Doji / Jaguar Warrior)
        if (mob.def.chargeCooldown) {
          mob.chargeTimer -= dt;
          if (mob.chargeTimer <= 0 && distToPlayer >= 3.2 && distToPlayer <= 18) {
            mob.chargeTimer = mob.def.chargeCooldown;
            mob.dashBoostTimer = 0.95;
            const callout = mob.type === 'minotaur'
              ? '🐂 蠻牛衝鋒!'
              : mob.type === 'shuten_doji'
                ? '👹 鬼王衝擊!'
                : mob.type === 'jaguar_warrior'
                  ? '🐆 美洲豹撲殺!'
                  : '🪓 狂暴躍擊!';
            spawnFloatingText(pos, callout, '#fb923c', true);
            vfx.spawnEarthSpikes(pos, dirToPlayer, 4.8);
          }
        }

        // 2. Sonic / Madness / Gale Shout (Draugr / Cthulhu / Tengu / Storm Dragon)
        if (mob.def.shoutCooldown) {
          mob.shoutTimer -= dt;
          if (mob.shoutTimer <= 0 && distToPlayer <= 15) {
            mob.shoutTimer = mob.def.shoutCooldown;
            vfx.spawnDragonShout(pos, dirToPlayer, 13.5);
            if (mob.type === 'storm_dragon') {
              vfx.spawnLightning(playerRoot.position.clone(), []);
            }
            const shoutTxt = mob.type === 'cthulhu'
              ? '🐙 舊日瘋狂低語!'
              : mob.type === 'tengu'
                ? '👺 天狗烈風斬!'
                : mob.type === 'storm_dragon'
                  ? '⚡ 蒼穹天雷咆哮!'
                  : '🗣️ FUS RO DAH!';
            spawnFloatingText(pos, shoutTxt, '#38bdf8', true);
            if (distToPlayer <= 13.5) {
              takePlayerDamage(mobAtk * 1.25, mob.def.name, {
                infect: !!mob.def.infect,
                petrify: !!mob.def.petrify
              });
              playerRoot.position.addScaledVector(dirToPlayer, 4.8);
            }
          }
        }

        // 3. Exploding Boulder / Ink Bomb Throw (Cyclops / Yeti / Kraken)
        if (mob.def.boulderCooldown) {
          mob.boulderTimer -= dt;
          if (mob.boulderTimer <= 0 && distToPlayer >= 4.0 && distToPlayer <= 19) {
            mob.boulderTimer = mob.def.boulderCooldown;
            const targetSpot = playerRoot.position.clone();
            const throwTxt = mob.type === 'kraken' ? '🦑 深海墨彈!' : mob.type === 'yeti' ? '❄️ 冰岩投擲!' : '🪨 巨岩投擲!';
            spawnFloatingText(pos, throwTxt, '#facc15', true);
            vfx.spawnBombProjectile(pos, targetSpot, (hitPos) => {
              vfx.spawnEarthSpikes(hitPos, dirToPlayer, 3.8);
              if (!isDead && playerRoot.position.distanceTo(hitPos) <= 4.2) {
                takePlayerDamage(mobAtk * 1.35, mob.def.name, {
                  infect: !!mob.def.infect,
                  petrify: mob.type === 'yeti'
                });
              }
            });
          }
        }

        // 4. Mythic Breath / Solar Flare / Eldritch Cataclysm Telegraph!
        if (mob.def.breathCooldown) {
          mob.breathTimer -= dt;
          if (mob.breathTimer <= 0 && distToPlayer <= 22) {
            mob.breathTimer = mob.def.breathCooldown;
            const targetSpot = playerRoot.position.clone();
            vfx.spawnDragonBreathWarning(targetSpot, 7.6, 1.08, (blastPos) => {
              if (mob.type === 'frost_wyrm' || mob.type === 'leviathan') {
                vfx.spawnFrostNova(blastPos, 7.2);
              } else if (mob.type === 'storm_dragon') {
                vfx.spawnLightning(blastPos, []);
              }
              if (!isDead && playerRoot.position.distanceTo(blastPos) <= 7.6) {
                takePlayerDamage(
                  mobAtk * 1.65,
                  mob.def.name,
                  {
                    infect: !!mob.def.infect,
                    hellfire: !!mob.def.hellfire,
                    petrify: !!mob.def.petrify
                  }
                );
              }
            });
          }
        }

        if (distToPlayer > mob.def.attackRange) {
          const dashMult = mob.dashBoostTimer > 0 ? 2.25 : 1.0;
          const spd = mob.def.speed * dashMult * (isEnraged ? 1.38 : 1.0) * (mob.slowTimer > 0 ? 0.45 : 1.0);
          const nextPos = pos.clone().addScaledVector(dirToPlayer, spd * dt);
          // Monsters never enter Elf Village safe zone
          if (!isInSafeZone(nextPos)) {
            pos.copy(nextPos);
            moving = true;
          }
        } else {
          attacking = true;
          mob.atkTimer -= dt;
          if (mob.atkTimer <= 0) {
            mob.atkTimer = mob.def.attackCooldown * (isEnraged ? 0.76 : 1.0);
            const rawAtk = mobAtk * (isEnraged ? 1.35 : 1.0);

            if (mob.type === 'gnome') {
              const targetSpot = playerRoot.position.clone();
              vfx.spawnBombProjectile(pos, targetSpot, (hitPos) => {
                if (!isDead && playerRoot.position.distanceTo(hitPos) <= 3.4) {
                  takePlayerDamage(rawAtk, mob.def.name);
                }
              });
            } else if (mob.type === 'centaur' || mob.type === 'kyubi') {
              // Ranged arrow / Nine-Tail Foxfire bolt
              vfx.spawnFireball(
                pos,
                dirToPlayer,
                14,
                (projPos) => !isDead && playerRoot.position.distanceTo(projPos) <= 1.7,
                (hitPos) => {
                  if (!isDead && playerRoot.position.distanceTo(hitPos) <= 2.8) {
                    takePlayerDamage(rawAtk, mob.def.name, {
                      hellfire: mob.type === 'kyubi',
                      petrify: mob.type === 'kyubi'
                    });
                  }
                }
              );
            } else if (mob.type === 'medusa' || mob.type === 'cthulhu') {
              vfx.spawnDragonShout(pos, dirToPlayer, 9.8);
              vfx.spawnPoisonCloud(playerRoot.position);
              takePlayerDamage(rawAtk, mob.def.name, { infect: true, petrify: true });
            } else if (mob.type === 'vampire') {
              takePlayerDamage(rawAtk, mob.def.name);
              const drainHeal = Math.round(rawAtk * (mob.def.lifesteal || 0.75));
              mob.hp = Math.min(mobMaxHp, mob.hp + drainHeal);
              mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mobLvl}`, mob.hp / mobMaxHp);
              spawnFloatingText(pos, `🦇 +${drainHeal}`, '#f43f5e', false);
            } else if (mob.def.stomp) {
              vfx.spawnEarthSpikes(pos, dirToPlayer, 5.4);
              takePlayerDamage(rawAtk, mob.def.name, { infect: !!mob.def.infect });
              playerRoot.position.addScaledVector(dirToPlayer, 3.0);
            } else {
              takePlayerDamage(rawAtk, mob.def.name, {
                infect: !!mob.def.infect,
                hellfire: !!mob.def.hellfire,
                petrify: !!mob.def.petrify
              });
            }
          }
        }
      } else if (distToHome > 1.5) {
        // Return home & slowly heal
        const toHome = new THREE.Vector3().subVectors(mob.home, pos);
        toHome.y = 0;
        mob.visual.group.rotation.y = Math.atan2(toHome.x, toHome.z);
        toHome.normalize();
        pos.addScaledVector(toHome, mob.def.speed * 0.85 * dt);
        moving = true;
        if (mob.hp < mobMaxHp) {
          mob.hp = Math.min(mobMaxHp, mob.hp + mobMaxHp * 0.08 * dt);
          mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mobLvl}`, mob.hp / mobMaxHp);
        }
      }

      mob.visual.animate(dt, moving, attacking);
    });

    // Update Camera
    const camOffsetX = Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const camOffsetY = Math.sin(camPitch) * camDist + 2.0;
    const camOffsetZ = Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    camera.position.lerp(
      new THREE.Vector3(
        playerRoot.position.x + camOffsetX,
        playerRoot.position.y + camOffsetY,
        playerRoot.position.z + camOffsetZ
      ),
      0.16
    );
    camera.lookAt(playerRoot.position.x, playerRoot.position.y + 1.5, playerRoot.position.z);

    world.update(dt, chestCooldown);
    vfx.update(dt);

    // Push real-time state to Firebase if connected
    if (net.isConnected()) {
      net.pushPlayerState(buildMyNetworkSnapshot());
      if (net.isHost()) {
        const mobsMap = {};
        mobs.forEach((m) => {
          mobsMap[m.id] = {
            alive: m.alive ? 1 : 0,
            hp: Math.round(m.hp),
            x: Number(m.visual.group.position.x.toFixed(2)),
            z: Number(m.visual.group.position.z.toFixed(2)),
            rotY: Number(m.visual.group.rotation.y.toFixed(2))
          };
        });
        net.pushMobsState(mobsMap);
      }
    }

    hudTick += dt;
    if (hudTick >= 0.1) {
      hudTick = 0;
      updateHud();
      updateSkillCooldownUI();
      updateZoneBadge();
      drawMinimap();
    }

    renderer.render(scene, camera);
  }

  animate();
}

document.addEventListener('DOMContentLoaded', initGame);
