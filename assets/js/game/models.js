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

/**
 * Smooth Low-Poly Orc Berserker (Lv.6)
 */
export function createOrcModel() {
  const g = new THREE.Group();
  const skinMat = mat('#3f6212', 0.65);
  const armorMat = mat('#27272a', 0.45, 0.55);
  const tuskMat = mat('#fef3c7', 0.3);
  const eyeMat = mat('#ef4444', 0.1, 0, '#ef4444', 1.2);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 1.15, 14), armorMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), skinMat);
  head.position.set(0, 1.95, 0.08);
  head.castShadow = true;
  g.add(head);

  // Orc tusks & glowing red eyes
  [-1, 1].forEach((dir) => {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.28, 8), tuskMat);
    tusk.position.set(dir * 0.16, 1.82, 0.44);
    tusk.rotation.x = 0.35;
    g.add(tusk);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    eye.position.set(dir * 0.14, 2.02, 0.44);
    g.add(eye);

    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), armorMat);
    pauldron.position.set(dir * 0.66, 1.55, 0);
    g.add(pauldron);
  });

  // Giant Battleaxe
  const arm = new THREE.Group();
  arm.position.set(0.66, 1.45, 0.1);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.65, 8), mat('#451a03', 0.85));
  shaft.rotation.x = Math.PI / 2.2;
  shaft.position.set(0, -0.1, 0.5);
  arm.add(shaft);

  const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.68, 0.55), mat('#9ca3af', 0.3, 0.8));
  axeBlade.position.set(0, 0.1, 1.05);
  arm.add(axeBlade);
  g.add(arm);

  const hpBar = createNameplateSprite('🪓 獸人狂戰士 Lv.6', '#a3e635', true);
  hpBar.sprite.position.set(0, 2.85, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 10 : 2.8);
    torso.position.y = 1.15 + (moving ? Math.abs(Math.sin(clk)) * 0.14 : 0);
    arm.rotation.x = attacking ? -Math.sin(clk * 2.2) * 1.5 : Math.sin(clk) * 0.4;
  }

  return { group: g, hpBar, animate };
}

/**
 * Smooth Low-Poly Ogre Crusher (Lv.8 Giant Brute)
 */
export function createOgreModel() {
  const g = new THREE.Group();
  const skinMat = mat('#a16207', 0.75);
  const bellyMat = mat('#ca8a04', 0.8);
  const loinMat = mat('#451a03', 0.9);

  // Huge rotund body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 14), bellyMat);
  body.scale.set(1.05, 1.2, 0.95);
  body.position.y = 1.35;
  body.castShadow = true;
  g.add(body);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.95, 0.35, 16), loinMat);
  belt.position.y = 0.85;
  g.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), skinMat);
  head.position.set(0, 2.55, 0.18);
  head.castShadow = true;
  g.add(head);

  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 8), mat('#fef3c7', 0.4));
  horn.position.set(0, 3.05, 0.28);
  horn.rotation.x = 0.35;
  g.add(horn);

  // Massive spiked iron maul
  const arm = new THREE.Group();
  arm.position.set(1.05, 1.9, 0.2);
  const maul = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.14, 2.1, 10), mat('#3f3f46', 0.4, 0.7));
  maul.rotation.x = Math.PI / 2.2;
  maul.position.set(0, -0.2, 0.75);
  arm.add(maul);
  g.add(arm);

  const hpBar = createNameplateSprite('🏏 食人魔碎骨者 Lv.8', '#fb923c', true);
  hpBar.sprite.scale.set(3.8, 1.1, 1);
  hpBar.sprite.position.set(0, 3.7, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 7.5 : 2.2);
    body.position.y = 1.35 + (moving ? Math.abs(Math.sin(clk)) * 0.18 : 0);
    arm.rotation.x = attacking ? -Math.sin(clk * 2) * 1.6 : Math.sin(clk) * 0.3;
  }

  return { group: g, hpBar, animate };
}

/**
 * Smooth Low-Poly Forest Troll (Lv.7 Regenerating Monster)
 */
export function createTrollModel() {
  const g = new THREE.Group();
  const skinMat = mat('#0d9488', 0.65);
  const hairMat = mat('#dc2626', 0.7);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.05, 10, 14), skinMat);
  torso.position.y = 1.35;
  torso.rotation.x = 0.25;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), skinMat);
  head.position.set(0, 2.25, 0.28);
  g.add(head);

  // Red mohawk crest
  const mohawk = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.65), hairMat);
  mohawk.position.set(0, 2.65, 0.22);
  g.add(mohawk);

  // Long troll tusks
  [-1, 1].forEach((dir) => {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.42, 8), mat('#fef3c7', 0.3));
    tusk.position.set(dir * 0.18, 2.15, 0.62);
    tusk.rotation.x = 1.1;
    g.add(tusk);
  });

  // Regeneration emerald aura ring
  const regenRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.05, 24),
    new THREE.MeshBasicMaterial({ color: '#10b981', side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
  );
  regenRing.rotation.x = -Math.PI / 2;
  regenRing.position.y = 0.1;
  g.add(regenRing);

  const hpBar = createNameplateSprite('🌿 嗜血巨魔 [再生] Lv.7', '#34d399', true);
  hpBar.sprite.position.set(0, 3.25, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9.5 : 3);
    torso.position.y = 1.35 + (moving ? Math.abs(Math.sin(clk)) * 0.15 : 0);
    regenRing.scale.setScalar(0.92 + Math.sin(clk * 2) * 0.12);
    if (attacking) torso.rotation.x = 0.25 + Math.sin(clk * 2) * 0.45;
  }

  return { group: g, hpBar, animate };
}

/**
 * Smooth Low-Poly Plague Zombie (Cavern Infectious Undead)
 */
export function createZombieModel() {
  const g = new THREE.Group();
  const rotSkin = mat('#65a30d', 0.85, 0.05, '#365314', 0.25);
  const ragMat = mat('#3f3f46', 0.9);
  const eyeMat = mat('#bef264', 0.1, 0, '#84cc16', 1.4);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.38, 0.95, 12), ragMat);
  torso.position.y = 1.05;
  torso.rotation.x = 0.22;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 12), rotSkin);
  head.position.set(0, 1.72, 0.18);
  head.castShadow = true;
  g.add(head);

  // Outstretched zombie arms
  const arms = new THREE.Group();
  arms.position.set(0, 1.4, 0.15);
  [-0.4, 0.4].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.58, 6, 10), rotSkin);
    arm.rotation.x = Math.PI / 2.1;
    arm.position.set(ax, 0, 0.35);
    arms.add(arm);
  });
  g.add(arms);

  [-0.12, 0.12].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat);
    eye.position.set(ex, 1.75, 0.5);
    g.add(eye);
  });

  const hpBar = createNameplateSprite('🧟 屍毒殭屍 [感染] Lv.6', '#a3e635', true);
  hpBar.sprite.position.set(0, 2.45, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9 : 2.5);
    torso.rotation.z = Math.sin(clk) * 0.14;
    arms.rotation.x = attacking ? Math.sin(clk * 2.5) * 0.65 : Math.sin(clk) * 0.15;
  }

  return { group: g, hpBar, animate };
}

/**
 * Smooth Low-Poly Vampire Lord (Lifesteal Mini-Boss)
 */
export function createVampireModel() {
  const g = new THREE.Group();
  const paleSkin = mat('#e2e8f0', 0.45);
  const suitMat = mat('#18181b', 0.4, 0.3);
  const crimsonMat = mat('#991b1b', 0.5, 0.2, '#dc2626', 0.45);
  const eyeMat = mat('#ef4444', 0.1, 0, '#ef4444', 1.5);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.44, 1.15, 16), suitMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  g.add(torso);

  // High-collar Vampire Crimson Cloak
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.65, 12, 1, true), crimsonMat);
  cloak.position.set(0, 1.15, -0.12);
  g.add(cloak);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.34, 0.42, 12, 1, true, Math.PI * 0.65, Math.PI * 1.7),
    crimsonMat
  );
  collar.position.set(0, 1.92, -0.05);
  g.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 14), paleSkin);
  head.position.set(0, 2.02, 0.05);
  g.add(head);

  [-0.12, 0.12].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat);
    eye.position.set(ex, 2.05, 0.38);
    g.add(eye);
  });

  // Blood Rapier
  const arm = new THREE.Group();
  arm.position.set(0.5, 1.55, 0.15);
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 1.55, 8), crimsonMat);
  blade.rotation.x = Math.PI / 2.1;
  blade.position.set(0, 0, 0.75);
  arm.add(blade);
  g.add(arm);

  const hpBar = createNameplateSprite('🦇 暗夜吸血鬼領主 [吸血] Lv.9', '#fda4af', true);
  hpBar.sprite.scale.set(3.6, 1.05, 1);
  hpBar.sprite.position.set(0, 2.95, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 10 : 3);
    // Vampire levitates slightly off the ground!
    g.position.y = 0.18 + Math.sin(clk) * 0.12;
    arm.rotation.x = attacking ? -Math.sin(clk * 2.5) * 1.3 : Math.sin(clk) * 0.25;
  }

  return { group: g, hpBar, animate };
}

/**
 * Ancient Elder Scroll Treasure Chest inside the Zombie Cavern
 */
export function createTreasureChestModel() {
  const g = new THREE.Group();
  const boxMat = mat('#451a03', 0.7, 0.2);
  const goldMat = mat('#fbbf24', 0.25, 0.85, '#f59e0b', 0.45);
  const scrollMat = mat('#fef3c7', 0.3, 0.2, '#fde047', 0.85);

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 1.15), boxMat);
  base.position.y = 0.52;
  base.castShadow = true;
  g.add(base);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.7, 12, 1, false, 0, Math.PI), goldMat);
  lid.rotation.z = Math.PI / 2;
  lid.position.y = 1.05;
  g.add(lid);

  // Floating glowing Elder Scroll above the chest
  const scrollGroup = new THREE.Group();
  scrollGroup.position.y = 2.1;
  const scrollCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 12), scrollMat);
  scrollCyl.rotation.z = Math.PI / 2.4;
  scrollGroup.add(scrollCyl);
  g.add(scrollGroup);

  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(1.3, 1.6, 32),
    new THREE.MeshBasicMaterial({ color: '#fde047', side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.08;
  g.add(auraRing);

  const label = createNameplateSprite('📦 上古秘寶箱 [按 G 開啟寶物]', '#fde047', false);
  label.sprite.scale.set(3.4, 0.62, 1);
  label.sprite.position.set(0, 3.1, 0);
  g.add(label.sprite);

  let clk = 0;
  function animate(dt, onCooldown, cdSeconds = 0) {
    clk += dt * 3;
    scrollGroup.rotation.y += dt * 1.8;
    scrollGroup.position.y = 2.1 + Math.sin(clk) * 0.18;
    scrollGroup.visible = !onCooldown;
    auraRing.visible = !onCooldown;
    if (onCooldown) {
      label.redraw(`📦 寶箱重鑄中 (${Math.ceil(cdSeconds)}s)`, 1, '#9ca3af');
    } else {
      label.redraw('📦 上古秘寶箱 [按 G 開啟寶物]', 1, '#fde047');
    }
  }

  return { group: g, animate };
}

/**
 * Ancient Greek Mythology Boss 1: Minotaur of the Cretan Labyrinth (Lv.11)
 */
export function createMinotaurModel() {
  const g = new THREE.Group();
  const furMat = mat('#5c2d16', 0.78);
  const darkFurMat = mat('#3b1a0b', 0.85);
  const bronzeMat = mat('#d97706', 0.35, 0.75, '#b45309', 0.25);
  const hornMat = mat('#fef3c7', 0.3, 0.15);
  const eyeMat = mat('#ef4444', 0.1, 0, '#ef4444', 1.6);

  // Massive muscular bull-man torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.58, 1.55, 16), furMat);
  torso.position.y = 1.65;
  torso.castShadow = true;
  g.add(torso);

  // Bronze Greek Labyrinth belt & pteruges skirt
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.72, 0.45, 16), bronzeMat);
  belt.position.y = 0.95;
  g.add(belt);

  // Hooved legs
  [-0.34, 0.34].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 8, 12), darkFurMat);
    leg.position.set(lx, 0.48, 0);
    g.add(leg);
  });

  // Bull Head & Snout
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 14), darkFurMat);
  head.position.set(0, 2.68, 0.18);
  head.castShadow = true;
  g.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.65), furMat);
  snout.position.set(0, 2.55, 0.55);
  g.add(snout);

  // Golden Bull Nose Ring
  const noseRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 10, 20), bronzeMat);
  noseRing.position.set(0, 2.42, 0.88);
  noseRing.rotation.x = 0.3;
  g.add(noseRing);

  // Giant Curved Minotaur Horns
  [-1, 1].forEach((dir) => {
    const hornBase = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.05, 12), hornMat);
    hornBase.position.set(dir * 0.65, 2.95, 0.22);
    hornBase.rotation.z = -dir * 0.85;
    hornBase.rotation.x = 0.35;
    g.add(hornBase);
  });

  [-0.18, 0.18].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), eyeMat);
    eye.position.set(ex, 2.75, 0.62);
    g.add(eye);
  });

  // Double-Bladed Cretan Labyrinth Battleaxe (Labrys)
  const arm = new THREE.Group();
  arm.position.set(0.95, 2.05, 0.15);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 10), mat('#78350f', 0.7));
  shaft.rotation.x = Math.PI / 2.2;
  shaft.position.set(0, -0.1, 0.85);
  arm.add(shaft);

  const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.1), bronzeMat);
  bladeL.position.set(0, 0.15, 1.65);
  arm.add(bladeL);
  g.add(arm);

  const hpBar = createNameplateSprite('🐂 米諾陶洛斯・迷宮牛頭人王 [Boss Lv.11]', '#fb923c', true);
  hpBar.sprite.scale.set(4.3, 1.15, 1);
  hpBar.sprite.position.set(0, 3.85, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9 : 2.8);
    torso.position.y = 1.65 + (moving ? Math.abs(Math.sin(clk)) * 0.18 : 0);
    arm.rotation.x = attacking ? -Math.sin(clk * 2.4) * 1.55 : Math.sin(clk) * 0.35;
  }

  return { group: g, hpBar, animate };
}

/**
 * Ancient Greek Mythology Boss 2: Medusa the Gorgon Queen (Lv.12)
 */
export function createMedusaModel() {
  const g = new THREE.Group();
  const scaleMat = mat('#059669', 0.4, 0.35, '#047857', 0.3);
  const skinMat = mat('#6ee7b7', 0.45);
  const goldMat = mat('#fbbf24', 0.25, 0.85, '#d97706', 0.4);
  const eyeMat = mat('#a3e635', 0.1, 0, '#84cc16', 1.8);

  // Coiled Serpentine Tail Base + Segments
  const tailGroup = new THREE.Group();
  const coil1 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.24, 12, 24), scaleMat);
  coil1.rotation.x = Math.PI / 2;
  coil1.position.y = 0.24;
  tailGroup.add(coil1);

  const coil2 = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.2, 12, 24), scaleMat);
  coil2.rotation.x = Math.PI / 2;
  coil2.position.y = 0.56;
  tailGroup.add(coil2);
  g.add(tailGroup);

  // Upper Gorgon Torso with Golden Greek Breastplate
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1.15, 16), skinMat);
  torso.position.y = 1.35;
  torso.castShadow = true;
  g.add(torso);

  const armor = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.44, 0.65, 16), goldMat);
  armor.position.y = 1.42;
  g.add(armor);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 14), skinMat);
  head.position.set(0, 2.22, 0.05);
  g.add(head);

  // Crown of Writhing Vipers (Snake Hair)
  const snakesGroup = new THREE.Group();
  snakesGroup.position.set(0, 2.42, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const snake = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 8), scaleMat);
    snake.position.set(Math.cos(a) * 0.28, 0.15, Math.sin(a) * 0.28);
    snake.rotation.z = -Math.cos(a) * 0.65;
    snake.rotation.x = Math.sin(a) * 0.65;
    snakesGroup.add(snake);
  }
  g.add(snakesGroup);

  // Glowing Petrifying Eyes
  [-0.13, 0.13].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyeMat);
    eye.position.set(ex, 2.26, 0.39);
    g.add(eye);
  });

  // Golden Gorgon Bow / Serpent Staff
  const arm = new THREE.Group();
  arm.position.set(0.55, 1.65, 0.15);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 10, 20, Math.PI), goldMat);
  bow.rotation.y = Math.PI / 2;
  bow.position.set(0, 0, 0.45);
  arm.add(bow);
  g.add(arm);

  const hpBar = createNameplateSprite('🐍 梅杜莎・蛇髮女妖 [石化凝視 Boss Lv.12]', '#34d399', true);
  hpBar.sprite.scale.set(4.4, 1.15, 1);
  hpBar.sprite.position.set(0, 3.35, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9.5 : 3.2);
    tailGroup.rotation.y = Math.sin(clk) * 0.25;
    snakesGroup.rotation.y = Math.sin(clk * 1.5) * 0.35;
    arm.rotation.x = attacking ? -Math.sin(clk * 2) * 0.9 : Math.sin(clk) * 0.2;
  }

  return { group: g, hpBar, animate };
}

/**
 * Ancient Greek Mythology Boss 3: Polyphemus the Cyclops Titan (Lv.13)
 */
export function createCyclopsModel() {
  const g = new THREE.Group();
  const skinMat = mat('#b45309', 0.72);
  const bronzeMat = mat('#92400e', 0.4, 0.65);
  const marbleMat = mat('#e2e8f0', 0.55, 0.1);
  const eyeMat = mat('#ef4444', 0.1, 0, '#f97316', 1.8);

  // Colossal Titan Body
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1.15, 18, 16), skinMat);
  torso.scale.set(1.05, 1.25, 0.95);
  torso.position.y = 1.75;
  torso.castShadow = true;
  g.add(torso);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.08, 0.48, 16), bronzeMat);
  belt.position.y = 1.05;
  g.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 14), skinMat);
  head.position.set(0, 3.25, 0.2);
  head.castShadow = true;
  g.add(head);

  // Single Giant Glowing Cyclops Eye in Center of Forehead
  const bigEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), mat('#fef2f2', 0.2));
  bigEyeWhite.position.set(0, 3.32, 0.72);
  g.add(bigEyeWhite);

  const bigPupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), eyeMat);
  bigPupil.position.set(0, 3.32, 0.88);
  g.add(bigPupil);

  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.68, 10), mat('#fef3c7', 0.35));
  horn.position.set(0, 3.92, 0.3);
  horn.rotation.x = 0.28;
  g.add(horn);

  // Broken Greek Marble Temple Column used as a Giant Club!
  const arm = new THREE.Group();
  arm.position.set(1.25, 2.35, 0.2);
  const columnClub = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 2.75, 12), marbleMat);
  columnClub.rotation.x = Math.PI / 2.2;
  columnClub.position.set(0, -0.2, 0.95);
  arm.add(columnClub);
  g.add(arm);

  const hpBar = createNameplateSprite('👁️ 波呂斐摩斯・獨眼巨人泰坦 [Boss Lv.13]', '#facc15', true);
  hpBar.sprite.scale.set(4.5, 1.2, 1);
  hpBar.sprite.position.set(0, 4.55, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 7 : 2);
    torso.position.y = 1.75 + (moving ? Math.abs(Math.sin(clk)) * 0.22 : 0);
    arm.rotation.x = attacking ? -Math.sin(clk * 2.2) * 1.65 : Math.sin(clk) * 0.28;
  }

  return { group: g, hpBar, animate };
}

/**
 * Ancient Greek Mythology Boss 4: Lernaean Hydra (Multi-Headed Mythic Beast Lv.15)
 */
export function createHydraModel() {
  const g = new THREE.Group();
  const bodyMat = mat('#064e3b', 0.5, 0.25, '#022c22', 0.35);
  const bellyMat = mat('#10b981', 0.55);
  const eyeMat = mat('#bef264', 0.1, 0, '#84cc16', 1.8);

  // Massive Serpentine Dragon Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.55, 18, 16), bodyMat);
  body.scale.set(1.1, 0.9, 1.55);
  body.position.y = 1.45;
  body.castShadow = true;
  g.add(body);

  // 3 Distinct Long Snapping Hydra Necks & Heads
  const heads = [];
  [-0.95, 0, 0.95].forEach((offsetX, idx) => {
    const neckGroup = new THREE.Group();
    neckGroup.position.set(offsetX, 2.05, 1.15);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.85, 12), bodyMat);
    neck.position.set(0, 0.75, 0.45);
    neck.rotation.x = 0.45;
    neckGroup.add(neck);

    const head = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.15, 10), bellyMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 1.55, 1.05);
    neckGroup.add(head);

    [-0.16, 0.16].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
      eye.position.set(ex, 1.68, 1.15);
      neckGroup.add(eye);
    });

    g.add(neckGroup);
    heads.push({ neckGroup, phase: idx * 2.1 });
  });

  // Lashing Hydra Tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.8, 12), bodyMat);
  tail.rotation.x = -Math.PI / 2.3;
  tail.position.set(0, 1.05, -2.6);
  g.add(tail);

  const hpBar = createNameplateSprite('🐉 九頭蛇海德拉・深淵神話巨獸 [再生劇毒 Boss Lv.15]', '#a3e635', true);
  hpBar.sprite.scale.set(4.8, 1.25, 1);
  hpBar.sprite.position.set(0, 4.75, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 7.5 : 3);
    heads.forEach((h) => {
      h.neckGroup.rotation.y = Math.sin(clk + h.phase) * 0.28;
      h.neckGroup.rotation.x = attacking
        ? Math.sin((clk + h.phase) * 2.4) * 0.55
        : Math.sin(clk + h.phase) * 0.15;
    });
    tail.rotation.z = Math.sin(clk) * 0.3;
  }

  return { group: g, hpBar, animate };
}

/**
 * Factory helper to create any mob model by its type key.
 */
export function createMobModelByType(typeKey) {
  if (typeKey === 'goblin') return createGoblinModel();
  if (typeKey === 'orc') return createOrcModel();
  if (typeKey === 'ogre') return createOgreModel();
  if (typeKey === 'troll') return createTrollModel();
  if (typeKey === 'gnome') return createGnomeModel();
  if (typeKey === 'zombie') return createZombieModel();
  if (typeKey === 'vampire') return createVampireModel();
  if (typeKey === 'minotaur') return createMinotaurModel();
  if (typeKey === 'medusa') return createMedusaModel();
  if (typeKey === 'cyclops') return createCyclopsModel();
  if (typeKey === 'hydra') return createHydraModel();
  return createDragonModel();
}
