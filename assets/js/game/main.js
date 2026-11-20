/**
 * JUMP 3D Fantasy RPG — Main Game Engine & UI Controller
 * Phase 1: Full playable 3D RPG + Account Login/Save + Character Customizer
 * + Elf Village Shop + Goblin/Gnome/Dragon Boss + 4 Elemental Skills (Lightning/Fire/Water/Earth).
 */
import * as THREE from 'three';
import {
  DEFAULT_APPEARANCE,
  DEFAULT_PLAYER_STATE,
  SHOP_ITEMS,
  SKILLS,
  ZONES,
  MOB_TYPES,
  expForNextLevel,
  computePlayerStats
} from './data.js';
import {
  createCharacterModel,
  createGoblinModel,
  createGnomeModel,
  createDragonModel,
  createNameplateSprite
} from './models.js';
import { buildWorld } from './world.js';
import { createVfxManager } from './vfx.js';
import {
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
  const hudPartyBtn = document.getElementById('rpg-party-btn');
  const hudPartyHud = document.getElementById('rpg-party-hud');
  const hudNetBadge = document.getElementById('rpg-net-badge');
  const hudInviteBanner = document.getElementById('rpg-invite-banner');
  const hudInviteText = document.getElementById('rpg-invite-text');
  const hudInviteAccept = document.getElementById('rpg-invite-accept');
  const hudInviteDecline = document.getElementById('rpg-invite-decline');
  const hudShopPrompt = document.getElementById('rpg-shop-prompt');
  const hudToast = document.getElementById('rpg-toast');
  const damageLayer = document.getElementById('rpg-damage-layer');
  const minimapCanvas = document.getElementById('rpg-minimap');
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  // Dialogs
  const authDialog = document.getElementById('rpg-auth-dialog');
  const customizerDialog = document.getElementById('rpg-customizer-dialog');
  const shopDialog = document.getElementById('rpg-shop-dialog');
  const bagDialog = document.getElementById('rpg-bag-dialog');
  const partyDialog = document.getElementById('rpg-party-dialog');

  // --- Player Runtime State ---
  let accountUser = null; // null = guest
  let playerNickname = localStorage.getItem('chat_nickname') || '冒險者';
  let appearance = clone(DEFAULT_APPEARANCE);
  let state = clone(DEFAULT_PLAYER_STATE);
  let partyId = null;
  let pendingInvite = null;
  const remoteAvatars = new Map(); // uid -> { root, model, nameplate, sig, targetPos, targetRotY, data, attackAnim }
  let lastAttackStamp = 0;

  // Try restore local save immediately
  const localSave = loadLocalFallbackSave();
  if (localSave) {
    if (localSave.nickname) playerNickname = localSave.nickname;
    if (localSave.appearance) appearance = { ...clone(DEFAULT_APPEARANCE), ...localSave.appearance };
    if (localSave.state) state = { ...clone(DEFAULT_PLAYER_STATE), ...localSave.state };
  }

  let stats = computePlayerStats(state);
  let currentHp = Math.min(state.hp || stats.maxHp, stats.maxHp);
  let currentMp = Math.min(state.mp || stats.maxMp, stats.maxMp);
  let isDead = false;
  let respawnTimer = 0;
  let earthShieldTimer = 0;

  // Cooldowns
  const cooldowns = {
    attack: 0,
    dodge: 0,
    lightning: 0,
    fire: 0,
    water: 0,
    earth: 0
  };
  let attackAnim = 0;
  let dodgeAnim = 0;
  const dodgeDir = new THREE.Vector3();

  // --- Three.js Renderer, Scene & Camera ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 260);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);

  const world = buildWorld(scene);
  const vfx = createVfxManager(scene);

  // Player 3D Wrapper
  const playerRoot = new THREE.Group();
  playerRoot.position.set(0, 0, 10);
  scene.add(playerRoot);

  let playerModel = null;
  let playerNameplate = null;

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

  // --- Keyboard Controls (Strictly isolated from Chat Inputs) ---
  const keys = {};
  function isTypingInForm() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return true;
    // Also pause game hotkeys when any game dialog is open
    if ((authDialog && authDialog.open) ||
        (customizerDialog && customizerDialog.open) ||
        (shopDialog && shopDialog.open) ||
        (bagDialog && bagDialog.open) ||
        (partyDialog && partyDialog.open)) {
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
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
    } else if (k === '1') {
      usePotion('hp');
    } else if (k === '2') {
      usePotion('mp');
    } else if (k === 'g') {
      if (isNearMerchant()) openShopDialog();
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
    toastTimeout = setTimeout(() => { hudToast.hidden = true; }, 2800);
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

  // --- Monster Spawner & AI ---
  const mobs = [];

  function spawnMob(typeKey, homeX, homeZ) {
    const def = MOB_TYPES[typeKey];
    const visual = typeKey === 'goblin'
      ? createGoblinModel()
      : typeKey === 'gnome'
        ? createGnomeModel()
        : createDragonModel();

    visual.group.position.set(homeX, 0, homeZ);
    scene.add(visual.group);

    mobs.push({
      id: `${typeKey}_${mobs.length}`,
      type: typeKey,
      def,
      visual,
      home: new THREE.Vector3(homeX, 0, homeZ),
      hp: def.maxHp,
      alive: true,
      respawnTimer: 0,
      atkTimer: 0.5 + Math.random(),
      breathTimer: def.breathCooldown || 7,
      burnTimer: 0,
      burnTick: 0,
      burnDmg: 0,
      slowTimer: 0,
      knockVel: new THREE.Vector3()
    });
  }

  // Goblin Camp (5 goblins)
  [[38, 16], [48, 14], [54, 24], [44, 30], [36, 28]].forEach(([x, z]) => spawnMob('goblin', x, z));
  // Gnome Forest (4 gnomes)
  [[-40, 10], [-52, 8], [-55, 22], [-43, 24]].forEach(([x, z]) => spawnMob('gnome', x, z));
  // Dragon Volcano Lair (1 Elder Dragon Boss)
  spawnMob('dragon', 0, -64);

  function isInSafeZone(pos) {
    const dx = pos.x - ZONES.village.center.x;
    const dz = pos.z - ZONES.village.center.z;
    return Math.hypot(dx, dz) <= ZONES.village.radius;
  }

  function isNearMerchant() {
    return playerRoot.position.distanceTo(world.merchantPos) <= 5.2;
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

  function grantKillReward(mobType, mobName, isBoss, worldPos, expGain, goldGain, shared = false) {
    state.gold += goldGain;
    state.exp += expGain;
    state.kills[mobType] = (state.kills[mobType] || 0) + 1;

    spawnFloatingText(
      worldPos || playerRoot.position,
      shared ? `🤝 +${goldGain}G +${expGain}EXP` : `+${goldGain}G +${expGain}EXP`,
      '#fde047',
      isBoss
    );

    let leveledUp = false;
    while (state.exp >= expForNextLevel(state.level)) {
      state.exp -= expForNextLevel(state.level);
      state.level += 1;
      leveledUp = true;
    }
    if (leveledUp) {
      stats = computePlayerStats(state);
      currentHp = stats.maxHp;
      currentMp = stats.maxMp;
      vfx.spawnWaterWave(playerRoot.position, 5.5);
      showToast(`🎉 恭喜升級！目前等級 Lv.${state.level}（生命與魔力已全滿）`, 'success');
    }

    if (isBoss) {
      showToast(`🏆 擊敗【${mobName}】！獲得 ${goldGain} 金幣！`, 'success');
      triggerAutoSave();
    } else if (leveledUp) {
      triggerAutoSave();
    }
    updateHud();
  }

  function applyDamageToMob(mob, rawDmg, color = '#fef08a', isCrit = false, statusEffects = null, fromRemoteUid = null) {
    if (!mob.alive) return;
    const dmg = Math.max(1, Math.round(rawDmg * (0.9 + Math.random() * 0.2)));

    // If connected and we are NOT the mob AI host, forward hit to host for authoritative HP sync
    if (!fromRemoteUid && net.isConnected() && !net.isHost()) {
      spawnFloatingText(mob.visual.group.position, isCrit ? `💥 ${dmg}!` : `${dmg}`, color, isCrit);
      net.sendMobHitToHost(mob.id, dmg, color, isCrit, statusEffects);
      return;
    }

    mob.hp = Math.max(0, mob.hp - dmg);
    mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mob.def.level}`, mob.hp / mob.def.maxHp);
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
          mob.def.expReward,
          mob.def.goldReward
        );
      }

      // Grant reward locally if we killed it or share party with killer
      if (killerUid === net.uid || isSameParty(killerPartyId)) {
        grantKillReward(
          mob.type,
          mob.def.name,
          !!mob.def.isBoss,
          mob.visual.group.position,
          mob.def.expReward,
          mob.def.goldReward,
          killerUid !== net.uid
        );
      }
    }
  }

  function takePlayerDamage(rawDmg, attackerName = '') {
    if (isDead || dodgeAnim > 0 || isInSafeZone(playerRoot.position)) return;
    let dmg = Math.max(1, rawDmg - stats.def * 0.7);
    if (earthShieldTimer > 0) {
      dmg *= (1 - SKILLS.earth.shieldReduction);
    }
    dmg = Math.max(1, Math.round(dmg));
    currentHp = Math.max(0, currentHp - dmg);
    spawnFloatingText(playerRoot.position, `-${dmg}`, '#f87171', false);

    if (currentHp <= 0) {
      isDead = true;
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
          const isCrit = Math.random() < 0.18;
          applyDamageToMob(mob, stats.atk * (isCrit ? 1.55 : 1.0), isCrit ? '#fbbf24' : '#ffffff', isCrit);
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
    cooldowns.dodge = 1.6;
    dodgeAnim = 1.0;
    dodgeDir.copy(getForwardDir());
  }

  function getElementMultiplier(skillId) {
    const eb = stats.weapon.elementBonus;
    return (eb && eb.type === skillId) ? eb.mult : 1.0;
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
    cooldowns[skillId] = sk.cooldown;
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
            dmg: Math.round((sk.burnDamage + state.level * 2) * elemMult)
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

      const healAmt = Math.round((sk.healBase + state.level * 7) * elemMult);
      currentHp = Math.min(stats.maxHp, currentHp + healAmt);
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
      showToast('🪨 岩石護盾已啟動（5.5 秒減傷 45%）', 'info');

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
  }

  function updateSkillCooldownUI() {
    ['lightning', 'fire', 'water', 'earth', 'dodge'].forEach((id) => {
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
      hudShopPrompt.hidden = !isNearMerchant();
    }
  }

  function drawMinimap() {
    if (!minimapCtx) return;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.56;

    minimapCtx.clearRect(0, 0, w, h);
    minimapCtx.fillStyle = 'rgba(15, 18, 38, 0.85)';
    minimapCtx.beginPath();
    minimapCtx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    minimapCtx.fill();

    // Zones
    const zoneColors = {
      village: 'rgba(16, 185, 129, 0.35)',
      goblinCamp: 'rgba(180, 83, 9, 0.35)',
      gnomeForest: 'rgba(99, 102, 241, 0.35)',
      dragonLair: 'rgba(239, 68, 68, 0.4)'
    };
    Object.values(ZONES).forEach((z) => {
      minimapCtx.fillStyle = zoneColors[z.id] || 'rgba(255,255,255,0.15)';
      minimapCtx.beginPath();
      minimapCtx.arc(cx + z.center.x * scale, cy + z.center.z * scale, z.radius * scale, 0, Math.PI * 2);
      minimapCtx.fill();
    });

    // Living mobs
    mobs.forEach((m) => {
      if (!m.alive) return;
      minimapCtx.fillStyle = m.def.isBoss ? '#ef4444' : '#fbbf24';
      minimapCtx.beginPath();
      minimapCtx.arc(
        cx + m.visual.group.position.x * scale,
        cy + m.visual.group.position.z * scale,
        m.def.isBoss ? 4 : 2.3,
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
        if (res.data.state && Object.keys(res.data.state).length) {
          state = { ...clone(DEFAULT_PLAYER_STATE), ...res.data.state };
        }
        stats = computePlayerStats(state);
        currentHp = Math.min(state.hp || stats.maxHp, stats.maxHp);
        currentMp = Math.min(state.mp || stats.maxMp, stats.maxMp);

        syncNicknameToChat(playerNickname);
        rebuildPlayerMesh();
        updateHud();
        if (!net.isConnected()) {
          net.connect(buildMyNetworkSnapshot());
        } else {
          net.pushPlayerState(buildMyNetworkSnapshot(), true);
        }
        authDialog.close();
        showToast(`✨ 歡迎回來，${playerNickname}！聊天室與遊戲名稱已同步`, 'success');
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
    previewCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
    previewCamera.position.set(0, 1.55, 4.3);
    previewCamera.lookAt(0, 1.25, 0);

    previewScene.add(new THREE.HemisphereLight('#e0e7ff', '#1e293b', 1.1));
    const dl = new THREE.DirectionalLight('#ffffff', 1.2);
    dl.position.set(3, 5, 4);
    previewScene.add(dl);

    previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    previewRenderer.setSize(220, 260);
    previewCamera.aspect = 220 / 260;
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

  function openCustomizer() {
    if (!customizerDialog) return;
    previewDraft = clone(appearance);
    document.getElementById('cust-hair-style').value = previewDraft.hairStyle;
    document.getElementById('cust-hair-color').value = previewDraft.hairColor;
    document.getElementById('cust-skin-color').value = previewDraft.skinColor;
    document.getElementById('cust-eye-color').value = previewDraft.eyeColor;
    document.getElementById('cust-outfit-primary').value = previewDraft.outfitPrimary;
    document.getElementById('cust-cape-color').value = previewDraft.capeColor;
    document.getElementById('cust-elf-ears').checked = !!previewDraft.elfEars;
    document.getElementById('cust-cape').checked = !!previewDraft.cape;
    document.getElementById('cust-height').value = previewDraft.heightScale || 1.0;

    const note = document.getElementById('cust-account-note');
    if (note) {
      note.textContent = accountUser
        ? `已登入 @${accountUser} — 儲存後將同步至雲端存檔`
        : '目前為訪客模式：捏角將暫存於本機（登入帳號可永久雲端保存）';
    }

    initPreviewCanvas();
    refreshPreviewModel();
    customizerDialog.showModal();
    startPreviewLoop();
  }

  if (hudCustomizeBtn) hudCustomizeBtn.addEventListener('click', openCustomizer);
  const custCloseBtn = document.getElementById('rpg-customizer-close');
  if (custCloseBtn && customizerDialog) custCloseBtn.addEventListener('click', () => customizerDialog.close());

  ['cust-hair-style', 'cust-hair-color', 'cust-skin-color', 'cust-eye-color',
    'cust-outfit-primary', 'cust-cape-color', 'cust-elf-ears', 'cust-cape', 'cust-height'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (!previewDraft) return;
      previewDraft.hairStyle = document.getElementById('cust-hair-style').value;
      previewDraft.hairColor = document.getElementById('cust-hair-color').value;
      previewDraft.skinColor = document.getElementById('cust-skin-color').value;
      previewDraft.eyeColor = document.getElementById('cust-eye-color').value;
      previewDraft.outfitPrimary = document.getElementById('cust-outfit-primary').value;
      previewDraft.capeColor = document.getElementById('cust-cape-color').value;
      previewDraft.elfEars = document.getElementById('cust-elf-ears').checked;
      previewDraft.cape = document.getElementById('cust-cape').checked;
      previewDraft.heightScale = parseFloat(document.getElementById('cust-height').value) || 1.0;
      refreshPreviewModel();
    });
  });

  const custSaveBtn = document.getElementById('cust-save-btn');
  if (custSaveBtn) {
    custSaveBtn.addEventListener('click', () => {
      if (!previewDraft) return;
      appearance = clone(previewDraft);
      rebuildPlayerMesh();
      triggerAutoSave();
      customizerDialog.close();
      showToast('🎨 角色外觀已更新並儲存！', 'success');
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
      .filter((it) => it.category === activeShopCat && it.price > 0)
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
              showToast('💰 金幣不足！去野外打哥布林或地精賺金幣吧', 'warn');
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

  if (hudShopPrompt) hudShopPrompt.addEventListener('click', openShopDialog);
  const shopCloseBtn = document.getElementById('rpg-shop-close');
  if (shopCloseBtn && shopDialog) shopCloseBtn.addEventListener('click', () => shopDialog.close());

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
      if (restored.state && Object.keys(restored.state).length) {
        state = { ...clone(DEFAULT_PLAYER_STATE), ...restored.state };
      }
      stats = computePlayerStats(state);
      currentHp = Math.min(state.hp || stats.maxHp, stats.maxHp);
      currentMp = Math.min(state.mp || stats.maxMp, stats.maxMp);
      syncNicknameToChat(playerNickname);
      rebuildPlayerMesh();
      updateHud();
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

    // Respawn handling
    if (isDead) {
      respawnTimer -= dt;
      if (respawnTimer <= 0) {
        isDead = false;
        currentHp = stats.maxHp;
        currentMp = stats.maxMp;
        playerRoot.position.set(0, 0, 10);
        showToast('🌿 已於精靈村莊復活！', 'success');
        updateHud();
      }
    } else {
      // Passive HP/MP regen (much faster inside Elf Village safe zone!)
      const inSafe = isInSafeZone(playerRoot.position);
      currentMp = Math.min(stats.maxMp, currentMp + (inSafe ? 16 : 6.5) * dt);
      if (inSafe) {
        currentHp = Math.min(stats.maxHp, currentHp + 20 * dt);
      }

      // Player Movement
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
          move.multiplyScalar(10.5 * dt);
        }
      }

      playerRoot.position.add(move);
      // Clamp within world boundary
      const distFromOrigin = Math.hypot(playerRoot.position.x, playerRoot.position.z);
      if (distFromOrigin > 118) {
        playerRoot.position.multiplyScalar(118 / distFromOrigin);
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

    // Monster AI Loop (Host runs authoritative AI; non-host smoothly interpolates synced mobs)
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
          mob.hp = mob.def.maxHp;
          mob.burnTimer = 0;
          mob.slowTimer = 0;
          mob.visual.group.position.copy(mob.home);
          mob.visual.group.visible = true;
          mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mob.def.level}`, 1);
        }
        return;
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

      if (!isDead && !playerInSafe && distToPlayer <= mob.def.aggroRange && distToHome < 32) {
        // Face player
        const toPlayer = new THREE.Vector3().subVectors(playerRoot.position, pos);
        toPlayer.y = 0;
        mob.visual.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

        // Dragon special breath telegraph
        if (mob.def.isBoss) {
          mob.breathTimer -= dt;
          if (mob.breathTimer <= 0 && distToPlayer <= 16) {
            mob.breathTimer = mob.def.breathCooldown;
            const targetSpot = playerRoot.position.clone();
            vfx.spawnDragonBreathWarning(targetSpot, 6.2, 1.35, (blastPos) => {
              if (!isDead && playerRoot.position.distanceTo(blastPos) <= 6.2) {
                takePlayerDamage(mob.def.atk * 1.65);
              }
            });
          }
        }

        if (distToPlayer > mob.def.attackRange) {
          const spd = mob.def.speed * (mob.slowTimer > 0 ? 0.45 : 1.0);
          toPlayer.normalize();
          const nextPos = pos.clone().addScaledVector(toPlayer, spd * dt);
          // Monsters never enter Elf Village safe zone
          if (!isInSafeZone(nextPos)) {
            pos.copy(nextPos);
            moving = true;
          }
        } else {
          attacking = true;
          mob.atkTimer -= dt;
          if (mob.atkTimer <= 0) {
            mob.atkTimer = mob.def.attackCooldown;
            if (mob.type === 'gnome') {
              const targetSpot = playerRoot.position.clone();
              vfx.spawnBombProjectile(pos, targetSpot, (hitPos) => {
                if (!isDead && playerRoot.position.distanceTo(hitPos) <= 3.0) {
                  takePlayerDamage(mob.def.atk);
                }
              });
            } else {
              takePlayerDamage(mob.def.atk);
            }
          }
        }
      } else if (distToHome > 1.5) {
        // Return home & slowly heal
        const toHome = new THREE.Vector3().subVectors(mob.home, pos);
        toHome.y = 0;
        mob.visual.group.rotation.y = Math.atan2(toHome.x, toHome.z);
        toHome.normalize();
        pos.addScaledVector(toHome, mob.def.speed * 0.8 * dt);
        moving = true;
        if (mob.hp < mob.def.maxHp) {
          mob.hp = Math.min(mob.def.maxHp, mob.hp + mob.def.maxHp * 0.08 * dt);
          mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mob.def.level}`, mob.hp / mob.def.maxHp);
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

    world.update(dt);
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
