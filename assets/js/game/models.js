/**
 * Smooth Low-Poly Fantasy 3D Models (Pure Three.js Procedural Geometry)
 * Zero external asset downloads — instant load, full customization support.
 */
import * as THREE from 'three';

function mat(color, roughness = 0.55, metalness = 0.08, emissive = null, emissiveIntensity = 0.4) {
  const opts = { color, roughness, metalness };
  if (emissive) {
    opts.emissive = emissive;
    opts.emissiveIntensity = emissiveIntensity;
  }
  return new THREE.MeshStandardMaterial(opts);
}

/**
 * Create a floating Canvas label + optional HP bar sprite above characters / mobs.
 */
export function createNameplateSprite(name, color = '#ffffff', showHp = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = showHp ? 76 : 44;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(showHp ? 3.2 : 2.8, showHp ? 0.95 : 0.5, 1);

  function redraw(labelText, hpRatio = 1, labelColor = color) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dark outline pill behind name
    const metrics = ctx.measureText(labelText);
    const pillW = Math.min(244, Math.max(96, metrics.width + 26));
    ctx.fillStyle = 'rgba(11, 9, 20, 0.72)';
    ctx.beginPath();
    ctx.roundRect((256 - pillW) / 2, 4, pillW, 34, 14);
    ctx.fill();

    ctx.fillStyle = labelColor;
    ctx.fillText(labelText, 128, 22);

    if (showHp) {
      const barW = 190;
      const barH = 14;
      const x = (256 - barW) / 2;
      const y = 48;
      ctx.fillStyle = 'rgba(11, 9, 20, 0.85)';
      ctx.beginPath();
      ctx.roundRect(x - 2, y - 2, barW + 4, barH + 4, 7);
      ctx.fill();

      const clamped = Math.max(0, Math.min(1, hpRatio));
      ctx.fillStyle = clamped > 0.45 ? '#10b981' : clamped > 0.22 ? '#f59e0b' : '#ef4444';
      if (clamped > 0) {
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(6, barW * clamped), barH, 5);
        ctx.fill();
      }
    }
    texture.needsUpdate = true;
  }

  redraw(name, 1, color);
  return { sprite, redraw };
}

/**
 * Build a 3D weapon mesh matching the equipped SHOP_ITEMS entry.
 */
export function buildWeaponMesh(weaponItem) {
  const g = new THREE.Group();
  const style = (weaponItem && weaponItem.style) || 'sword';
  const mainColor = (weaponItem && weaponItem.color) || '#a16207';
  const glow = weaponItem && weaponItem.glow;

  const handleMat = mat('#451a03', 0.8);
  const guardMat = mat('#fbbf24', 0.3, 0.7);
  const bladeMat = mat(mainColor, 0.25, 0.65, glow, glow ? 0.55 : 0);

  if (style === 'staff') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 2.0, 10), handleMat);
    pole.position.y = 0.75;
    g.add(pole);

    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 1),
      mat(mainColor, 0.15, 0.3, glow || mainColor, 0.9)
    );
    orb.position.y = 1.85;
    g.add(orb);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 18), guardMat);
    ring.position.y = 1.85;
    g.add(ring);
  } else if (style === 'hammer') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 1.5, 10), handleMat);
    pole.position.y = 0.6;
    g.add(pole);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.72, 10), bladeMat);
    head.rotation.z = Math.PI / 2;
    head.position.y = 1.35;
    g.add(head);

    const band = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.55), guardMat);
    band.position.y = 1.35;
    g.add(band);
  } else if (style === 'greatsword') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), handleMat);
    handle.position.y = 0.08;
    g.add(handle);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.1, 0.14), guardMat);
    guard.position.y = 0.32;
    g.add(guard);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.45, 0.07), bladeMat);
    blade.position.y = 1.08;
    g.add(blade);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.155, 0.32, 4), bladeMat);
    tip.rotation.y = Math.PI / 4;
    tip.position.y = 1.96;
    g.add(tip);
  } else if (style === 'rapier') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), handleMat);
    handle.position.y = 0.05;
    g.add(handle);

    const guard = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), guardMat);
    guard.rotation.x = Math.PI;
    guard.position.y = 0.25;
    g.add(guard);

    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.048, 1.45, 8), bladeMat);
    blade.position.y = 0.96;
    g.add(blade);
  } else {
    // Classic sword
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 8), handleMat);
    handle.position.y = 0.06;
    g.add(handle);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.1), guardMat);
    guard.position.y = 0.25;
    g.add(guard);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.05, 0.055), bladeMat);
    blade.position.y = 0.8;
    g.add(blade);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.092, 0.22, 4), bladeMat);
    tip.rotation.y = Math.PI / 4;
    tip.position.y = 1.43;
    g.add(tip);
  }

  // Rotate forward so weapon points ahead when held
  g.rotation.x = Math.PI / 2.2;
  g.position.set(0, -0.42, 0.14);
  return g;
}

/**
 * Build a Smooth Low-Poly customizable player character.
 */
export function createCharacterModel(appearance, weaponItem, armorItem) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  const skinMat = mat(appearance.skinColor || '#f5cfa0', 0.65);
  const hairMat = mat(appearance.hairColor || '#3b2f2f', 0.7);
  const primaryColor = (armorItem && armorItem.tint) || appearance.outfitPrimary || '#4f46e5';
  const outfitMat = mat(primaryColor, 0.5, armorItem && armorItem.def >= 16 ? 0.55 : 0.1);
  const secondaryMat = mat(appearance.outfitSecondary || '#e2e8f0', 0.55);
  const eyeMat = mat(appearance.eyeColor || '#2563eb', 0.2, 0.1);
  const whiteMat = mat('#ffffff', 0.3);
  const bootMat = mat('#1e1b4b', 0.75);

  // Torso (smooth tapered capsule/cylinder)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.92, 16), outfitMat);
  torso.position.y = 1.16;
  torso.castShadow = true;
  bodyRoot.add(torso);

  // Belt
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.42, 0.14, 16), secondaryMat);
  belt.position.y = 0.82;
  bodyRoot.add(belt);

  // Armor pauldrons (when wearing leather/plate/dragon armor)
  if (armorItem && armorItem.def >= 8) {
    const pMat = mat(armorItem.tint || '#94a3b8', 0.3, 0.65);
    const leftP = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), pMat);
    leftP.position.set(-0.46, 1.55, 0);
    leftP.scale.set(1.1, 0.78, 1.0);
    bodyRoot.add(leftP);

    const rightP = leftP.clone();
    rightP.position.x = 0.46;
    bodyRoot.add(rightP);
  }

  // Cape
  let capeMesh = null;
  if (appearance.cape) {
    const capeGeo = new THREE.BoxGeometry(0.72, 1.05, 0.06);
    capeMesh = new THREE.Mesh(capeGeo, mat(appearance.capeColor || '#7c3aed', 0.7));
    capeMesh.position.set(0, 1.12, -0.34);
    capeMesh.rotation.x = 0.15;
    capeMesh.castShadow = true;
    bodyRoot.add(capeMesh);
  }

  // Head group
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.92;
  bodyRoot.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 16), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Eyes (facing +Z)
  [-0.13, 0.13].forEach((ex) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), whiteMat);
    sclera.position.set(ex, 0.02, 0.31);
    sclera.scale.set(1, 1.15, 0.6);
    headGroup.add(sclera);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeMat);
    pupil.position.set(ex, 0.02, 0.345);
    headGroup.add(pupil);
  });

  // Elf ears
  if (appearance.elfEars) {
    [-1, 1].forEach((dir) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.34, 8), skinMat);
      ear.position.set(dir * 0.42, 0.04, -0.02);
      ear.rotation.z = -dir * 1.15;
      ear.rotation.y = dir * 0.25;
      headGroup.add(ear);
    });
  }

  // Hair styles
  const style = appearance.hairStyle || 'short';
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.395, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hairCap.position.y = 0.04;
  hairCap.rotation.x = -0.18;
  headGroup.add(hairCap);

  if (style === 'long') {
    const backHair = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.72, 14), hairMat);
    backHair.position.set(0, -0.22, -0.14);
    headGroup.add(backHair);
  } else if (style === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.68, 12), hairMat);
    tail.position.set(0, -0.04, -0.46);
    tail.rotation.x = -0.85;
    headGroup.add(tail);
  } else if (style === 'spiky') {
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 8), hairMat);
      const angle = (i / 6) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 0.22, 0.35, Math.sin(angle) * 0.22);
      spike.rotation.z = -Math.cos(angle) * 0.45;
      spike.rotation.x = Math.sin(angle) * 0.45;
      headGroup.add(spike);
    }
  }

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.46, 1.5, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.46, 8, 12), outfitMat);
  leftArmMesh.position.y = -0.26;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skinMat);
  leftHand.position.y = -0.54;
  leftArm.add(leftHand);
  bodyRoot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.46, 1.5, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.46, 8, 12), outfitMat);
  rightArmMesh.position.y = -0.26;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skinMat);
  rightHand.position.y = -0.54;
  rightArm.add(rightHand);
  bodyRoot.add(rightArm);

  // Weapon mount on right arm
  const weaponMount = new THREE.Group();
  rightArm.add(weaponMount);
  weaponMount.add(buildWeaponMesh(weaponItem));

  // Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.72, 0);
  const leftLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.44, 8, 12), bootMat);
  leftLegMesh.position.y = -0.34;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);
  bodyRoot.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.18, 0.72, 0);
  const rightLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.44, 8, 12), bootMat);
  rightLegMesh.position.y = -0.34;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);
  bodyRoot.add(rightLeg);

  // Height scaling
  const hScale = Math.max(0.86, Math.min(1.16, appearance.heightScale || 1.0));
  bodyRoot.scale.set(hScale, hScale, hScale);

  // Earth shield ring (hidden until F skill active)
  const shieldGroup = new THREE.Group();
  shieldGroup.visible = false;
  for (let i = 0; i < 4; i++) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24, 0),
      mat('#d97706', 0.65, 0.15, '#eab308', 0.4)
    );
    const a = (i / 4) * Math.PI * 2;
    rock.position.set(Math.cos(a) * 1.15, 1.15, Math.sin(a) * 1.15);
    shieldGroup.add(rock);
  }
  root.add(shieldGroup);

  let walkClock = 0;

  function animate(dt, isMoving, attackProgress, dodgeProgress, shieldActive) {
    walkClock += dt * (isMoving ? 10 : 2.2);
    const swing = isMoving ? Math.sin(walkClock) * 0.72 : 0;

    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 0.75;

    if (attackProgress > 0) {
      // Smooth slash animation
      const t = 1 - attackProgress;
      rightArm.rotation.x = -1.6 + Math.sin(t * Math.PI) * 2.5;
      rightArm.rotation.z = -0.35 + Math.sin(t * Math.PI) * 0.9;
      bodyRoot.rotation.y = Math.sin(t * Math.PI) * 0.32;
    } else {
      rightArm.rotation.x = swing * 0.75;
      rightArm.rotation.z = 0;
      bodyRoot.rotation.y = 0;
    }

    if (dodgeProgress > 0) {
      bodyRoot.rotation.x = (1 - dodgeProgress) * Math.PI * 2;
    } else {
      bodyRoot.rotation.x = 0;
      bodyRoot.position.y = isMoving ? Math.abs(Math.sin(walkClock)) * 0.1 : Math.sin(walkClock) * 0.025;
    }

    if (capeMesh) {
      capeMesh.rotation.x = 0.15 + (isMoving ? 0.35 + Math.sin(walkClock * 1.4) * 0.1 : Math.sin(walkClock) * 0.04);
    }

    shieldGroup.visible = !!shieldActive;
    if (shieldActive) {
      shieldGroup.rotation.y += dt * 2.6;
    }
  }

  return { group: root, animate };
}

/**
 * Elf Merchant NPC in the safe village.
 */
export function createElfMerchantModel() {
  const appearance = {
    hairStyle: 'long',
    hairColor: '#fde68a',
    skinColor: '#fde2c4',
    eyeColor: '#10b981',
    elfEars: true,
    outfitPrimary: '#059669',
    outfitSecondary: '#fbbf24',
    cape: true,
    capeColor: '#047857',
    heightScale: 1.08
  };
  const staff = { style: 'staff', color: '#34d399', glow: '#10b981' };
  const char = createCharacterModel(appearance, staff, null);

  // Golden halo ring under merchant
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.25, 32),
    new THREE.MeshBasicMaterial({ color: '#34d399', side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  char.group.add(ring);

  const nameplate = createNameplateSprite('🧝 精靈商人 [按 G 交易]', '#6ee7b7', false);
  nameplate.sprite.position.set(0, 3.05, 0);
  char.group.add(nameplate.sprite);

  return { group: char.group, animate: char.animate };
}

/**
 * Smooth Low-Poly Goblin (Lv.1-3)
 */
export function createGoblinModel() {
  const g = new THREE.Group();
  const skinMat = mat('#4d7c0f', 0.7);
  const clothMat = mat('#78350f', 0.85);
  const eyeMat = mat('#ef4444', 0.2, 0.1, '#ef4444', 0.8);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), clothMat);
  body.scale.set(0.95, 1.15, 0.85);
  body.position.y = 0.82;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), skinMat);
  head.position.set(0, 1.44, 0.08);
  head.castShadow = true;
  g.add(head);

  // Big pointy goblin ears
  [-1, 1].forEach((dir) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 8), skinMat);
    ear.position.set(dir * 0.42, 1.48, 0.04);
    ear.rotation.z = -dir * 1.25;
    g.add(ear);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat);
    eye.position.set(dir * 0.12, 1.48, 0.36);
    g.add(eye);
  });

  // Wooden club
  const arm = new THREE.Group();
  arm.position.set(0.45, 1.05, 0.1);
  const club = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 8), mat('#713f12', 0.85));
  club.rotation.x = Math.PI / 2.2;
  club.position.set(0, -0.1, 0.35);
  arm.add(club);
  g.add(arm);

  const hpBar = createNameplateSprite('哥布林 Lv.2', '#bef264', true);
  hpBar.sprite.position.set(0, 2.3, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9 : 2.5);
    g.children[0].position.y = 0.82 + (moving ? Math.abs(Math.sin(clk)) * 0.12 : Math.sin(clk) * 0.03);
    arm.rotation.x = attacking ? -Math.sin(clk * 2) * 1.4 : Math.sin(clk) * 0.35;
  }

  return { group: g, hpBar, animate };
}

/**
 * Smooth Low-Poly Gnome Bomber (Lv.4-7)
 */
export function createGnomeModel() {
  const g = new THREE.Group();
  const coatMat = mat('#1d4ed8', 0.65);
  const skinMat = mat('#fdba74', 0.65);
  const hatMat = mat('#b91c1c', 0.7);
  const beardMat = mat('#f8fafc', 0.85);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 0.78, 14), coatMat);
  body.position.y = 0.65;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 14, 12), skinMat);
  head.position.y = 1.24;
  g.add(head);

  // Fluffy beard
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.48, 10), beardMat);
  beard.rotation.x = Math.PI;
  beard.position.set(0, 0.98, 0.2);
  g.add(beard);

  // Iconic pointy gnome hat
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.75, 14), hatMat);
  hat.position.set(0, 1.78, -0.05);
  hat.rotation.x = -0.18;
  g.add(hat);

  // Glowing bomb held in hand
  const bombGroup = new THREE.Group();
  bombGroup.position.set(0.45, 0.95, 0.25);
  const bomb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mat('#1f2937', 0.4, 0.5));
  bombGroup.add(bomb);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat('#f97316', 0.1, 0, '#f97316', 1.2));
  spark.position.y = 0.22;
  bombGroup.add(spark);
  g.add(bombGroup);

  const hpBar = createNameplateSprite('地精炸彈客 Lv.5', '#93c5fd', true);
  hpBar.sprite.position.set(0, 2.55, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 11 : 3);
    body.position.y = 0.65 + (moving ? Math.abs(Math.sin(clk)) * 0.14 : 0);
    bombGroup.position.y = 0.95 + Math.sin(clk * 1.5) * 0.12 + (attacking ? 0.35 : 0);
  }

  return { group: g, hpBar, animate };
}

/**
 * Smooth Low-Poly Elder Fire Dragon Boss (Lv.10)
 */
export function createDragonModel() {
  const g = new THREE.Group();
  const scaleMat = mat('#991b1b', 0.42, 0.28, '#7f1d1d', 0.2);
  const bellyMat = mat('#f59e0b', 0.5, 0.2);
  const hornMat = mat('#fef3c7', 0.4, 0.2);
  const eyeMat = mat('#fde047', 0.1, 0, '#facc15', 1.2);
  const wingMat = mat('#dc2626', 0.6, 0.1, '#991b1b', 0.25);

  // Main Dragon Body
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.25, 2.6, 12, 18), scaleMat);
  torso.rotation.x = Math.PI / 2;
  torso.position.set(0, 2.1, 0);
  torso.castShadow = true;
  g.add(torso);

  // Neck + Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 2.2, 14), scaleMat);
  neck.position.set(0, 3.25, 1.9);
  neck.rotation.x = 0.55;
  g.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 4.1, 2.85);
  g.add(headGroup);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.85, 1.75), scaleMat);
  skull.castShadow = true;
  headGroup.add(skull);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 1.55), bellyMat);
  jaw.position.set(0, -0.45, 0.05);
  headGroup.add(jaw);

  // Horns & glowing eyes
  [-1, 1].forEach((dir) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.15, 8), hornMat);
    horn.position.set(dir * 0.48, 0.68, -0.42);
    horn.rotation.x = -0.6;
    horn.rotation.z = -dir * 0.25;
    headGroup.add(horn);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), eyeMat);
    eye.position.set(dir * 0.52, 0.14, 0.42);
    headGroup.add(eye);
  });

  // Legs
  [[-1.1, 1.2], [1.1, 1.2], [-1.1, -1.2], [1.1, -1.2]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 1.85, 10), scaleMat);
    leg.position.set(lx, 0.92, lz);
    leg.castShadow = true;
    g.add(leg);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.8, 12), scaleMat);
  tail.rotation.x = -Math.PI / 2.15;
  tail.position.set(0, 1.75, -3.5);
  g.add(tail);

  // Articulated Wings
  const leftWing = new THREE.Group();
  leftWing.position.set(-1.1, 2.8, 0.4);
  const lwMesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 2.3), wingMat);
  lwMesh.position.set(-2.2, 0, -0.3);
  lwMesh.castShadow = true;
  leftWing.add(lwMesh);
  g.add(leftWing);

  const rightWing = new THREE.Group();
  rightWing.position.set(1.1, 2.8, 0.4);
  const rwMesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 2.3), wingMat);
  rwMesh.position.set(2.2, 0, -0.3);
  rwMesh.castShadow = true;
  rightWing.add(rwMesh);
  g.add(rightWing);

  const hpBar = createNameplateSprite('🔥 煉獄古龍 Boss Lv.10', '#fca5a5', true);
  hpBar.sprite.scale.set(5.0, 1.4, 1);
  hpBar.sprite.position.set(0, 6.2, 0.5);
  g.add(hpBar.sprite);

  let clk = 0;
  function animate(dt, moving, attacking) {
    clk += dt * (attacking ? 7 : moving ? 4.5 : 2.5);
    const flap = Math.sin(clk) * (attacking ? 0.55 : 0.35);
    leftWing.rotation.z = 0.25 + flap;
    rightWing.rotation.z = -0.25 - flap;
    tail.rotation.y = Math.sin(clk * 0.9) * 0.25;
    headGroup.position.y = 4.1 + Math.sin(clk * 0.8) * 0.16;
  }

  return { group: g, hpBar, animate };
}
