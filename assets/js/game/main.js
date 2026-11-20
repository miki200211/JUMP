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

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function initGame() {
  const stageEl = document.getElementById('game-stage');
  const canvasHost = document.getElementById('game-canvas-host');
  if (!stageEl || !canvasHost) return;

  // --- Layout Split & Mobile Tabs ---
  const toggleChatBtn = document.getElementById('toggle-chat-btn');
  const workspaceSplit = document.getElementById('workspace-split');
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

  // --- Player Runtime State ---
  let accountUser = null; // null = guest
  let playerNickname = localStorage.getItem('chat_nickname') || '冒險者';
  let appearance = clone(DEFAULT_APPEARANCE);
  let state = clone(DEFAULT_PLAYER_STATE);

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
        (bagDialog && bagDialog.open)) {
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

  // --- Combat Logic ---
  function getForwardDir() {
    const d = new THREE.Vector3(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
    return d.normalize();
  }

  function applyDamageToMob(mob, rawDmg, color = '#fef08a', isCrit = false) {
    if (!mob.alive) return;
    const dmg = Math.max(1, Math.round(rawDmg * (0.9 + Math.random() * 0.2)));
    mob.hp = Math.max(0, mob.hp - dmg);
    mob.visual.hpBar.redraw(`${mob.def.name} Lv.${mob.def.level}`, mob.hp / mob.def.maxHp);
    spawnFloatingText(mob.visual.group.position, isCrit ? `💥 ${dmg}!` : `${dmg}`, color, isCrit);

    if (mob.hp <= 0) {
      mob.alive = false;
      mob.respawnTimer = mob.def.respawnTime;
      mob.visual.group.visible = false;
      onMobKilled(mob);
    }
  }

  function onMobKilled(mob) {
    state.gold += mob.def.goldReward;
    state.exp += mob.def.expReward;
    state.kills[mob.type] = (state.kills[mob.type] || 0) + 1;

    spawnFloatingText(
      mob.visual.group.position,
      `+${mob.def.goldReward}G +${mob.def.expReward}EXP`,
      '#fde047',
      mob.def.isBoss
    );

    // Level up check
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

    if (mob.def.isBoss) {
      showToast(`🏆 擊敗【${mob.def.name}】！獲得 ${mob.def.goldReward} 金幣！`, 'success');
      triggerAutoSave();
    } else if (leveledUp) {
      triggerAutoSave();
    }
    updateHud();
  }

  function takePlayerDamage(rawDmg) {
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
      showToast('💀 你重傷倒下了！3 秒後於精靈村莊泉水復活…', 'danger');
    }
    updateHud();
  }

  function performBasicAttack() {
    if (isDead || cooldowns.attack > 0) return;
    cooldowns.attack = 0.42;
    attackAnim = 1.0;

    // Face camera forward direction when attacking
    playerRoot.rotation.y = camYaw + Math.PI;
    const fwd = getForwardDir();
    vfx.spawnSlash(playerRoot.position, playerRoot.rotation.y, stats.weapon.glow || '#a5b4fc');

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
      // Find closest living mob within range
      let primary = null;
      let bestDist = sk.range;
      mobs.forEach((m) => {
        if (!m.alive) return;
        const d = m.visual.group.position.distanceTo(playerRoot.position);
        if (d < bestDist) {
          bestDist = d;
          primary = m;
        }
      });

      const strikePos = primary
        ? primary.visual.group.position.clone()
        : playerRoot.position.clone().addScaledVector(fwd, 7);

      const chained = [];
      if (primary) {
        applyDamageToMob(primary, stats.atk * sk.damageMult * elemMult, '#7dd3fc', true);
        primary.slowTimer = 2.4;

        // Chain to nearby mobs
        mobs.forEach((m) => {
          if (!m.alive || m === primary || chained.length >= sk.chainCount - 1) return;
          if (m.visual.group.position.distanceTo(strikePos) <= sk.chainRadius) {
            chained.push(m.visual.group.position.clone());
            applyDamageToMob(m, stats.atk * sk.damageMult * 0.72 * elemMult, '#38bdf8', false);
            m.slowTimer = 1.8;
          }
        });
      }
      vfx.spawnLightning(strikePos, chained);
    } else if (skillId === 'fire') {
      vfx.spawnFireball(
        playerRoot.position,
        fwd,
        sk.range,
        (ballPos) => mobs.some((m) => m.alive && m.visual.group.position.distanceTo(ballPos) <= m.def.radius + 1.0),
        (boomPos) => {
          mobs.forEach((m) => {
            if (!m.alive) return;
            if (m.visual.group.position.distanceTo(boomPos) <= sk.aoeRadius + m.def.radius) {
              applyDamageToMob(m, stats.atk * sk.damageMult * elemMult, '#fb923c', true);
              m.burnTimer = sk.burnDuration;
              m.burnTick = 0.6;
              m.burnDmg = Math.round((sk.burnDamage + state.level * 2) * elemMult);
            }
          });
        }
      );
    } else if (skillId === 'water') {
      vfx.spawnWaterWave(playerRoot.position, sk.aoeRadius);
      const healAmt = Math.round((sk.healBase + state.level * 7) * elemMult);
      currentHp = Math.min(stats.maxHp, currentHp + healAmt);
      spawnFloatingText(playerRoot.position, `+${healAmt} HP`, '#34d399', true);

      mobs.forEach((m) => {
        if (!m.alive) return;
        const diff = new THREE.Vector3().subVectors(m.visual.group.position, playerRoot.position);
        diff.y = 0;
        const dist = diff.length();
        if (dist <= sk.aoeRadius + m.def.radius) {
          applyDamageToMob(m, stats.atk * sk.damageMult * elemMult, '#22d3ee', false);
          if (dist > 0.01) {
            diff.normalize().multiplyScalar(sk.knockback);
            m.knockVel.add(diff);
          }
          m.slowTimer = 3.0;
        }
      });
    } else if (skillId === 'earth') {
      earthShieldTimer = sk.shieldDuration;
      vfx.spawnEarthSpikes(playerRoot.position, fwd, sk.range);
      showToast('🪨 岩石護盾已啟動（5.5 秒減傷 45%）', 'info');

      mobs.forEach((m) => {
        if (!m.alive) return;
        const toMob = new THREE.Vector3().subVectors(m.visual.group.position, playerRoot.position);
        toMob.y = 0;
        const dist = toMob.length();
        if (dist <= sk.range + m.def.radius) {
          const dot = toMob.clone().normalize().dot(fwd);
          if (dot > 0.55 || dist < 2.5) {
            applyDamageToMob(m, stats.atk * sk.damageMult * elemMult, '#facc15', true);
            m.knockVel.addScaledVector(fwd, 5.0);
            m.slowTimer = 2.0;
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
    if (hudName) hudName.textContent = accountUser ? `${playerNickname} (@${accountUser})` : `${playerNickname} (訪客)`;
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

  if (hudAuthBtn) {
    hudAuthBtn.addEventListener('click', () => {
      if (accountUser) {
        if (confirm(`確定要登出帳號 @${accountUser} 嗎？`)) {
          saveSession(null);
          accountUser = null;
          rebuildPlayerMesh();
          updateHud();
          showToast('已登出帳號（切換為訪客模式）', 'info');
        }
      } else if (authDialog) {
        if (authErrorEl) authErrorEl.textContent = '';
        authDialog.showModal();
      }
    });
  }

  const authCloseBtn = document.getElementById('rpg-auth-close');
  if (authCloseBtn && authDialog) authCloseBtn.addEventListener('click', () => authDialog.close());

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('rpg-auth-username').value.trim();
      const password = document.getElementById('rpg-auth-password').value;
      const nick = (document.getElementById('rpg-auth-nickname').value || username).trim();

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

        rebuildPlayerMesh();
        updateHud();
        authDialog.close();
        showToast(`✨ 歡迎回來，${playerNickname}！已載入雲端角色存檔`, 'success');
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

  // --- Auto-Login on Boot ---
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
      rebuildPlayerMesh();
      updateHud();
    } else {
      const saved = loadSavedSession();
      if (saved && saved.username) accountUser = saved.username;
      updateHud();
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

    // Monster AI Loop
    const playerInSafe = isInSafeZone(playerRoot.position);
    mobs.forEach((mob) => {
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
