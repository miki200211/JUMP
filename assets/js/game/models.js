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
  } else if (style === 'trident') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 2.05, 10), guardMat);
    pole.position.y = 0.78;
    g.add(pole);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.08), guardMat);
    bar.position.y = 1.78;
    g.add(bar);
    [-0.26, 0, 0.26].forEach((tx, idx) => {
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.055, idx === 1 ? 0.65 : 0.48, 8), bladeMat);
      prong.position.set(tx, idx === 1 ? 2.1 : 2.0, 0);
      g.add(prong);
    });
  } else if (style === 'spear') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.045, 2.15, 10), guardMat);
    pole.position.y = 0.85;
    g.add(pole);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.72, 6), bladeMat);
    tip.position.y = 2.18;
    g.add(tip);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 16), bladeMat);
    ring.position.y = 1.82;
    g.add(ring);
  } else if (style === 'katana') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.44, 8), mat('#1e1b4b', 0.7));
    handle.position.y = 0.08;
    g.add(handle);
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 14), guardMat);
    tsuba.position.y = 0.3;
    g.add(tsuba);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.085, 1.55, 0.035), bladeMat);
    blade.position.y = 1.1;
    blade.rotation.z = 0.04;
    g.add(blade);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), bladeMat);
    tip.position.set(-0.04, 1.96, 0);
    g.add(tip);
  } else if (style === 'tome_staff') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 2.05, 10), mat('#1e1b4b', 0.4, 0.4));
    pole.position.y = 0.75;
    g.add(pole);
    const eyeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 14, 12),
      mat('#22c55e', 0.1, 0.2, '#4ade80', 1.4)
    );
    eyeSphere.position.y = 1.92;
    g.add(eyeSphere);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 20), bladeMat);
    ring1.position.y = 1.92;
    ring1.rotation.x = 0.5;
    g.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 20), guardMat);
    ring2.position.y = 1.92;
    ring2.rotation.y = Math.PI / 2;
    g.add(ring2);
  } else if (style === 'dragon_blade') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.5, 8), handleMat);
    handle.position.y = 0.08;
    g.add(handle);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.18), guardMat);
    guard.position.y = 0.36;
    g.add(guard);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.72, 0.09), bladeMat);
    blade.position.y = 1.24;
    g.add(blade);
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 1.5, 0.12),
      mat(glow || '#f59e0b', 0.1, 0.3, glow || '#f59e0b', 1.5)
    );
    core.position.y = 1.24;
    g.add(core);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 4), bladeMat);
    tip.rotation.y = Math.PI / 4;
    tip.position.y = 2.3;
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

  // Back Wings (Animated 3D Wings!)
  let leftWingPivot = null;
  let rightWingPivot = null;
  const wingStyle = appearance.wingStyle || 'none';
  if (wingStyle && wingStyle !== 'none') {
    const wColor = appearance.wingColor || '#f8fafc';
    const wMat = wingStyle === 'demon'
      ? mat(wColor, 0.45, 0.35, '#991b1b', 0.35)
      : wingStyle === 'fairy' || wingStyle === 'cyber_blades'
        ? mat(wColor, 0.15, 0.6, wColor, 0.85)
        : mat(wColor, 0.35, 0.25, wColor, 0.25);

    leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.16, 1.42, -0.32);
    rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.16, 1.42, -0.32);

    const buildHalfWing = (dir) => {
      const wg = new THREE.Group();
      if (wingStyle === 'angel') {
        for (let i = 0; i < 4; i++) {
          const feather = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.65 - i * 0.1, 8, 10), wMat);
          feather.position.set(dir * (0.35 + i * 0.18), 0.2 - i * 0.14, -0.08);
          feather.rotation.z = dir * (-0.55 - i * 0.18);
          wg.add(feather);
        }
      } else if (wingStyle === 'demon' || wingStyle === 'dragon') {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 1.1, 8), mat('#18181b', 0.5));
        bone.position.set(dir * 0.48, 0.32, -0.08);
        bone.rotation.z = -dir * 0.95;
        wg.add(bone);
        const web = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.05, 5), wMat);
        web.scale.set(1.2, 1.0, 0.18);
        web.position.set(dir * 0.58, 0.05, -0.1);
        web.rotation.z = dir * 0.55;
        wg.add(web);
      } else if (wingStyle === 'fairy') {
        const upper = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), wMat);
        upper.scale.set(1.3, 0.85, 0.12);
        upper.position.set(dir * 0.52, 0.28, -0.06);
        upper.rotation.z = -dir * 0.45;
        wg.add(upper);
        const lower = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), wMat);
        lower.scale.set(1.15, 0.8, 0.12);
        lower.position.set(dir * 0.42, -0.22, -0.06);
        lower.rotation.z = dir * 0.35;
        wg.add(lower);
      } else if (wingStyle === 'cyber_blades') {
        for (let i = 0; i < 3; i++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.04), wMat);
          blade.position.set(dir * (0.55 + i * 0.12), 0.3 - i * 0.28, -0.1);
          blade.rotation.z = dir * (0.35 - i * 0.25);
          wg.add(blade);
        }
      }
      return wg;
    };

    leftWingPivot.add(buildHalfWing(-1));
    rightWingPivot.add(buildHalfWing(1));
    bodyRoot.add(leftWingPivot);
    bodyRoot.add(rightWingPivot);
  }

  // Head group
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.92;
  bodyRoot.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 16), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Eyes & Facial Expression Style (facing +Z)
  const eyeStyle = appearance.eyeStyle || 'normal';
  const glowingEyeMat = mat(appearance.eyeColor || '#2563eb', 0.1, 0.1, appearance.eyeColor || '#2563eb', 1.6);

  [-0.13, 0.13].forEach((ex, idx) => {
    if (eyeStyle === 'eyepatch' && idx === 0) {
      // Obsidian Pirate / Witcher Eyepatch on left eye
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), mat('#111827', 0.4));
      patch.position.set(ex, 0.02, 0.31);
      patch.scale.set(1.1, 1.0, 0.5);
      headGroup.add(patch);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.375, 0.018, 6, 20), mat('#111827', 0.5));
      strap.rotation.y = Math.PI / 2;
      strap.rotation.x = 0.28;
      headGroup.add(strap);
      return;
    }

    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 12, 10),
      eyeStyle === 'glowing' ? glowingEyeMat : whiteMat
    );
    sclera.position.set(ex, 0.02, 0.31);
    sclera.scale.set(1, eyeStyle === 'sharp' ? 0.72 : 1.15, 0.6);
    headGroup.add(sclera);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      eyeStyle === 'glowing' ? glowingEyeMat : eyeMat
    );
    pupil.position.set(ex, 0.02, 0.345);
    if (eyeStyle === 'cat') {
      pupil.scale.set(0.45, 1.35, 0.8);
    }
    headGroup.add(pupil);

    if (eyeStyle === 'sharp' || eyeStyle === 'scar') {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.028, 0.04), hairMat);
      brow.position.set(ex, 0.1, 0.33);
      brow.rotation.z = idx === 0 ? -0.28 : 0.28;
      headGroup.add(brow);
    }
  });

  if (eyeStyle === 'scar') {
    const scar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.26, 0.03), mat('#be123c', 0.5));
    scar.position.set(-0.13, 0.02, 0.355);
    scar.rotation.z = 0.18;
    headGroup.add(scar);
  }

  // Ears (Human / Elf / Dark Elf / Merfolk Fin)
  const earStyle = appearance.earStyle || (appearance.elfEars ? 'elf' : 'human');
  if (earStyle === 'elf' || earStyle === 'dark_elf') {
    [-1, 1].forEach((dir) => {
      const len = earStyle === 'dark_elf' ? 0.44 : 0.34;
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, len, 8), skinMat);
      ear.position.set(dir * 0.43, earStyle === 'dark_elf' ? 0.0 : 0.04, -0.02);
      ear.rotation.z = -dir * (earStyle === 'dark_elf' ? 1.42 : 1.15);
      ear.rotation.y = dir * 0.25;
      headGroup.add(ear);
    });
  } else if (earStyle === 'fin') {
    const finMat = mat('#06b6d4', 0.3, 0.3, '#22d3ee', 0.45);
    [-1, 1].forEach((dir) => {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 5), finMat);
      fin.scale.set(0.35, 1, 1);
      fin.position.set(dir * 0.41, 0.05, -0.04);
      fin.rotation.z = -dir * 0.95;
      headGroup.add(fin);
    });
  }

  // Face Accessories (Beard / Mustache / Goatee / War Paint / Glasses / Sunglasses / Oni Mask)
  const faceAcc = appearance.faceAccessory || 'none';
  if (faceAcc === 'beard_full') {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), hairMat);
    beard.scale.set(1.15, 1.35, 0.85);
    beard.position.set(0, -0.22, 0.22);
    headGroup.add(beard);
  } else if (faceAcc === 'mustache') {
    [-1, 1].forEach((dir) => {
      const stache = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 8), hairMat);
      stache.position.set(dir * 0.09, -0.1, 0.34);
      stache.rotation.z = -dir * 1.25;
      headGroup.add(stache);
    });
  } else if (faceAcc === 'goatee') {
    const goat = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 8), hairMat);
    goat.position.set(0, -0.32, 0.28);
    goat.rotation.x = Math.PI;
    headGroup.add(goat);
  } else if (faceAcc === 'war_paint') {
    const paintMat = mat('#dc2626', 0.4, 0.1, '#ef4444', 0.5);
    [-0.16, 0.16].forEach((px) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.03), paintMat);
      stripe.position.set(px, -0.04, 0.34);
      headGroup.add(stripe);
    });
  } else if (faceAcc === 'glasses' || faceAcc === 'sunglasses') {
    const frameMat = mat('#fbbf24', 0.25, 0.85);
    const lensMat = mat('#0f172a', 0.15, 0.8);
    [-0.13, 0.13].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 8, 18), frameMat);
      rim.position.set(gx, 0.02, 0.36);
      headGroup.add(rim);
      if (faceAcc === 'sunglasses') {
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), lensMat);
        lens.position.set(gx, 0.02, 0.365);
        headGroup.add(lens);
      }
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.02), frameMat);
    bridge.position.set(0, 0.03, 0.36);
    headGroup.add(bridge);
  } else if (faceAcc === 'oni_mask') {
    const maskMat = mat('#991b1b', 0.35, 0.3, '#dc2626', 0.35);
    const mask = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.26, 12, 1, false, -Math.PI * 0.45, Math.PI * 0.9), maskMat);
    mask.rotation.y = Math.PI / 2;
    mask.position.set(0, -0.12, 0.1);
    headGroup.add(mask);
    [-1, 1].forEach((dir) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 8), whiteMat);
      tusk.position.set(dir * 0.16, -0.1, 0.36);
      tusk.rotation.x = 0.65;
      headGroup.add(tusk);
    });
  }

  // Hair styles (10 Distinct Styles!)
  const style = appearance.hairStyle || 'spiky';
  if (style !== 'bald') {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.395, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.position.y = 0.04;
    hairCap.rotation.x = -0.18;
    headGroup.add(hairCap);
  }

  if (style === 'long') {
    const backHair = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.85, 14), hairMat);
    backHair.position.set(0, -0.28, -0.15);
    headGroup.add(backHair);
  } else if (style === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.72, 12), hairMat);
    tail.position.set(0, -0.02, -0.46);
    tail.rotation.x = -0.85;
    headGroup.add(tail);
  } else if (style === 'twin') {
    [-1, 1].forEach((dir) => {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.68, 12), hairMat);
      tail.position.set(dir * 0.36, -0.1, -0.18);
      tail.rotation.z = dir * 0.48;
      tail.rotation.x = 2.6;
      headGroup.add(tail);
    });
  } else if (style === 'spiky') {
    for (let i = 0; i < 7; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 8), hairMat);
      const angle = (i / 7) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 0.22, 0.36, Math.sin(angle) * 0.22);
      spike.rotation.z = -Math.cos(angle) * 0.48;
      spike.rotation.x = Math.sin(angle) * 0.48;
      headGroup.add(spike);
    }
  } else if (style === 'samurai') {
    const knotBase = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), hairMat);
    knotBase.position.set(0, 0.42, -0.1);
    headGroup.add(knotBase);
    const topKnot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.32, 10), hairMat);
    topKnot.position.set(0, 0.54, -0.18);
    topKnot.rotation.x = -0.45;
    headGroup.add(topKnot);
  } else if (style === 'bob') {
    const bobMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.43, 0.42, 16, 1, true, Math.PI * 0.25, Math.PI * 1.5), hairMat);
    bobMesh.rotation.y = Math.PI / 2;
    bobMesh.position.set(0, -0.05, -0.04);
    headGroup.add(bobMesh);
  } else if (style === 'mohawk') {
    for (let i = 0; i < 5; i++) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 6), hairMat);
      fin.position.set(0, 0.36 - Math.abs(i - 2) * 0.04, 0.22 - i * 0.14);
      fin.rotation.x = (2 - i) * 0.25;
      headGroup.add(fin);
    }
  } else if (style === 'afro') {
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.54, 18, 16), hairMat);
    afro.position.set(0, 0.16, -0.04);
    headGroup.add(afro);
  } else if (style === 'crown_braid') {
    const braid = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.085, 10, 24), hairMat);
    braid.rotation.x = Math.PI / 2.2;
    braid.position.set(0, 0.22, -0.02);
    headGroup.add(braid);
  }

  // Headgear / Crowns / Horns / Halo (9 Distinct 3D Headgears!)
  const headgear = appearance.headgear || 'none';
  if (headgear === 'gold_crown') {
    const crownMat = mat('#fbbf24', 0.2, 0.85, '#f59e0b', 0.4);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 16, 1, true), crownMat);
    band.position.y = 0.38;
    headGroup.add(band);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), crownMat);
      point.position.set(Math.cos(a) * 0.31, 0.5, Math.sin(a) * 0.31);
      headGroup.add(point);
    }
  } else if (headgear === 'laurel') {
    const leafMat = mat('#10b981', 0.4, 0.2, '#059669', 0.3);
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.045, 8, 22, Math.PI * 1.55), leafMat);
    wreath.rotation.x = Math.PI / 2;
    wreath.rotation.z = -Math.PI * 0.28;
    wreath.position.y = 0.22;
    headGroup.add(wreath);
  } else if (headgear === 'demon_horns' || headgear === 'dragon_horns') {
    const hMat = headgear === 'demon_horns'
      ? mat('#18181b', 0.35, 0.4, '#dc2626', 0.45)
      : mat('#fef3c7', 0.35, 0.2);
    [-1, 1].forEach((dir) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.58, 10), hMat);
      horn.position.set(dir * 0.32, 0.44, 0.04);
      horn.rotation.z = -dir * 0.55;
      horn.rotation.x = headgear === 'dragon_horns' ? -0.45 : 0.35;
      headGroup.add(horn);
    });
  } else if (headgear === 'halo') {
    const haloMat = mat('#fef08a', 0.1, 0.3, '#fde047', 1.6);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.038, 10, 28), haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.62;
    headGroup.add(halo);
  } else if (headgear === 'wizard_hat') {
    const hatMat = mat('#312e81', 0.6, 0.15);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.04, 20), hatMat);
    brim.position.y = 0.34;
    headGroup.add(brim);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.85, 16), hatMat);
    cone.position.y = 0.76;
    cone.rotation.x = -0.15;
    headGroup.add(cone);
  } else if (headgear === 'viking_helm') {
    const helmMat = mat('#475569', 0.35, 0.75);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.41, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), helmMat);
    dome.position.y = 0.06;
    headGroup.add(dome);
    [-1, 1].forEach((dir) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.46, 10), mat('#fef3c7', 0.3));
      horn.position.set(dir * 0.48, 0.28, 0.05);
      horn.rotation.z = -dir * 0.9;
      headGroup.add(horn);
    });
  } else if (headgear === 'cat_ears') {
    [-1, 1].forEach((dir) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 4), hairMat);
      ear.position.set(dir * 0.24, 0.42, 0.04);
      ear.rotation.z = -dir * 0.32;
      headGroup.add(ear);
    });
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

  // Height & Body Width scaling
  const hScale = Math.max(0.8, Math.min(1.28, appearance.heightScale || 1.0));
  const wScale = Math.max(0.75, Math.min(1.38, appearance.bodyWidthScale || 1.0));
  bodyRoot.scale.set(hScale * wScale, hScale, hScale * wScale);

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

    if (leftWingPivot && rightWingPivot) {
      const flap = Math.sin(walkClock * (isMoving ? 1.5 : 1.1)) * 0.28;
      leftWingPivot.rotation.y = 0.22 + flap;
      rightWingPivot.rotation.y = -0.22 - flap;
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
 * Skyrim Undead Mini-Boss: Draugr Deathlord (Lv.11 — Uses Dragon Shout Fus Ro Dah!)
 */
export function createDraugrLordModel() {
  const g = new THREE.Group();
  const boneSkin = mat('#334155', 0.8);
  const armorMat = mat('#0f172a', 0.35, 0.75);
  const frostEyeMat = mat('#38bdf8', 0.1, 0, '#0ea5e9', 2.0);
  const hornMat = mat('#cbd5e1', 0.4, 0.2);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.25, 14), armorMat);
  torso.position.y = 1.3;
  torso.castShadow = true;
  g.add(torso);

  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.08), mat('#1e293b', 0.85));
  cape.position.set(0, 1.25, -0.35);
  g.add(cape);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), boneSkin);
  head.position.set(0, 2.15, 0.08);
  g.add(head);

  // Ancient Nord Horned Helm
  [-1, 1].forEach((dir) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.68, 10), hornMat);
    horn.position.set(dir * 0.48, 2.38, 0.1);
    horn.rotation.z = -dir * 0.85;
    g.add(horn);
  });

  [-0.13, 0.13].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), frostEyeMat);
    eye.position.set(ex, 2.18, 0.42);
    g.add(eye);
  });

  // Ebony Great Battleaxe
  const arm = new THREE.Group();
  arm.position.set(0.62, 1.65, 0.15);
  const axe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.08), frostEyeMat);
  axe.position.set(0, 0.25, 0.85);
  arm.add(axe);
  g.add(arm);

  const hpBar = createNameplateSprite('❄️ 天際屍鬼死靈大君 [龍吼菁英 Lv.11]', '#38bdf8', true);
  hpBar.sprite.scale.set(4.1, 1.1, 1);
  hpBar.sprite.position.set(0, 3.25, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9 : 2.8);
    torso.position.y = 1.3 + (moving ? Math.abs(Math.sin(clk)) * 0.15 : 0);
    arm.rotation.x = attacking ? -Math.sin(clk * 2.4) * 1.45 : Math.sin(clk) * 0.28;
  }

  return { group: g, hpBar, animate };
}

/**
 * Ancient Greek Mythology Elite: Chiron the Centaur War-Archer (Lv.11)
 */
export function createCentaurModel() {
  const g = new THREE.Group();
  const horseMat = mat('#78350f', 0.72);
  const skinMat = mat('#d97706', 0.55);
  const goldMat = mat('#fbbf24', 0.25, 0.85, '#f59e0b', 0.35);

  // Quadruped Horse Body
  const horseBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.15, 10, 14), horseMat);
  horseBody.rotation.x = Math.PI / 2;
  horseBody.position.set(0, 1.18, -0.2);
  horseBody.castShadow = true;
  g.add(horseBody);

  // 4 Galloping Horse Legs
  const legs = [];
  [[-0.32, 0.35], [0.32, 0.35], [-0.32, -0.75], [0.32, -0.75]].forEach(([lx, lz], i) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.75, 8, 10), horseMat);
    leg.position.set(lx, 0.55, lz);
    g.add(leg);
    legs.push({ leg, phase: i * 1.5 });
  });

  // Upper Human Warrior Torso & Golden Greek Helmet
  const humanTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.95, 14), goldMat);
  humanTorso.position.set(0, 1.85, 0.45);
  g.add(humanTorso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), skinMat);
  head.position.set(0, 2.55, 0.48);
  g.add(head);

  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.65), mat('#dc2626', 0.5));
  crest.position.set(0, 2.95, 0.45);
  g.add(crest);

  // Golden Warbow
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.055, 8, 18, Math.PI), goldMat);
  bow.rotation.y = Math.PI / 2;
  bow.position.set(0.45, 1.95, 0.95);
  g.add(bow);

  const hpBar = createNameplateSprite('🏹 喀戎・古希臘半人馬戰神 [神射 Lv.11]', '#fcd34d', true);
  hpBar.sprite.scale.set(4.1, 1.1, 1);
  hpBar.sprite.position.set(0, 3.6, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 11 : 3);
    legs.forEach((l) => {
      l.leg.rotation.x = moving ? Math.sin(clk + l.phase) * 0.65 : 0;
    });
    if (attacking) bow.rotation.x = Math.sin(clk * 2) * 0.35;
  }

  return { group: g, hpBar, animate };
}

/**
 * Ancient Greek Mythology Boss 5: Cerberus the 3-Headed Underworld Hellhound (Lv.16)
 */
export function createCerberusModel() {
  const g = new THREE.Group();
  const furMat = mat('#18181b', 0.65, 0.2);
  const magmaMat = mat('#dc2626', 0.3, 0.2, '#f97316', 1.2);
  const eyeMat = mat('#fef08a', 0.1, 0, '#f97316', 2.0);

  // Giant Hound Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.65, 12, 16), furMat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 1.35, 0);
  body.castShadow = true;
  g.add(body);

  // Blazing Hellfire Mane Collar
  const mane = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.24, 10, 22), magmaMat);
  mane.position.set(0, 1.55, 0.78);
  g.add(mane);

  // 3 Snarling Wolf Heads (Left, Center, Right)
  const heads = [];
  [-0.75, 0, 0.75].forEach((hx, i) => {
    const hg = new THREE.Group();
    hg.position.set(hx, 1.95 + (i === 1 ? 0.18 : 0), 1.15);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), furMat);
    hg.add(skull);

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.78, 10), furMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.06, 0.52);
    hg.add(snout);

    [-0.16, 0.16].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 6), furMat);
      ear.position.set(ex, 0.45, -0.05);
      hg.add(ear);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
      eye.position.set(ex, 0.12, 0.4);
      hg.add(eye);
    });

    g.add(hg);
    heads.push({ hg, phase: i * 2.0 });
  });

  // 4 Muscular Hound Legs
  const legs = [];
  [[-0.55, 0.75], [0.55, 0.75], [-0.55, -0.85], [0.55, -0.85]].forEach(([lx, lz], i) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.85, 8, 10), furMat);
    leg.position.set(lx, 0.6, lz);
    g.add(leg);
    legs.push({ leg, phase: i * 1.6 });
  });

  const hpBar = createNameplateSprite('🐺 刻耳柏洛斯・冥界三頭地獄犬 [冥火 Boss Lv.16]', '#fb7185', true);
  hpBar.sprite.scale.set(4.6, 1.2, 1);
  hpBar.sprite.position.set(0, 3.65, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 11 : 3.5);
    legs.forEach((l) => {
      l.leg.rotation.x = moving ? Math.sin(clk + l.phase) * 0.7 : 0;
    });
    heads.forEach((h) => {
      h.hg.rotation.x = attacking ? Math.sin((clk + h.phase) * 2.5) * 0.45 : Math.sin(clk + h.phase) * 0.12;
    });
  }

  return { group: g, hpBar, animate };
}

/**
 * Ancient Greek Mythology Boss 6: Chimera (Lion Head + Goat Back Head + Venom Serpent Tail + Wings Lv.17)
 */
export function createChimeraModel() {
  const g = new THREE.Group();
  const lionMat = mat('#d97706', 0.65);
  const maneMat = mat('#991b1b', 0.7, 0.1, '#dc2626', 0.4);
  const goatMat = mat('#475569', 0.7);
  const snakeMat = mat('#10b981', 0.45, 0.2, '#059669', 0.4);
  const eyeMat = mat('#fef08a', 0.1, 0, '#f59e0b', 1.8);

  // Lion Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 1.6, 12, 16), lionMat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 1.4, 0);
  body.castShadow = true;
  g.add(body);

  // 1. Roaring Lion Head with Crimson Mane
  const lionMane = new THREE.Mesh(new THREE.SphereGeometry(0.76, 14, 12), maneMat);
  lionMane.position.set(0, 2.0, 1.05);
  g.add(lionMane);

  const lionHead = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), lionMat);
  lionHead.position.set(0, 2.02, 1.32);
  g.add(lionHead);

  [-0.18, 0.18].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), eyeMat);
    eye.position.set(ex, 2.12, 1.76);
    g.add(eye);
  });

  // 2. Horned Goat Head rising from the back!
  const goatHead = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.85, 10), goatMat);
  goatHead.position.set(0, 2.55, 0.05);
  goatHead.rotation.x = 0.55;
  g.add(goatHead);

  [-0.22, 0.22].forEach((gx) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.65, 8), mat('#fef3c7', 0.35));
    horn.position.set(gx, 2.95, -0.15);
    horn.rotation.x = -0.5;
    g.add(horn);
  });

  // 3. Venomous Serpent Head as the Tail!
  const snakeTail = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.75, 10), snakeMat);
  snakeTail.position.set(0, 1.9, -1.35);
  snakeTail.rotation.x = -0.65;
  g.add(snakeTail);

  // Flapping Dragon Wings
  const wingL = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 5), maneMat);
  wingL.scale.set(1.2, 1, 0.16);
  wingL.position.set(-1.35, 2.2, 0.1);
  wingL.rotation.z = 0.95;
  g.add(wingL);

  const wingR = wingL.clone();
  wingR.position.x = 1.35;
  wingR.rotation.z = -0.95;
  g.add(wingR);

  const hpBar = createNameplateSprite('🦁 奇美拉・獅頭羊身蛇尾魔獸 [烈焰劇毒 Boss Lv.17]', '#fbbf24', true);
  hpBar.sprite.scale.set(4.8, 1.22, 1);
  hpBar.sprite.position.set(0, 3.9, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9.5 : 3.5);
    wingL.rotation.z = 0.85 + Math.sin(clk * 1.6) * 0.38;
    wingR.rotation.z = -0.85 - Math.sin(clk * 1.6) * 0.38;
    snakeTail.rotation.z = Math.sin(clk) * 0.35;
    if (attacking) lionHead.position.z = 1.32 + Math.sin(clk * 2.5) * 0.22;
  }

  return { group: g, hpBar, animate };
}

/**
 * Village NPC 2: Legendary Dwarf Blacksmith Brok (Monster Hunter × Baldur's Gate Forge!)
 */
export function createBlacksmithNpcModel() {
  const npc = createCharacterModel(
    {
      hairStyle: 'bald',
      hairColor: '#b45309',
      skinColor: '#e2a776',
      eyeStyle: 'sharp',
      eyeColor: '#f59e0b',
      earStyle: 'human',
      faceAccessory: 'beard_full',
      headgear: 'viking_helm',
      wingStyle: 'none',
      outfitPrimary: '#78350f',
      outfitSecondary: '#fbbf24',
      cape: false,
      heightScale: 0.92,
      bodyWidthScale: 1.28
    },
    { style: 'hammer', color: '#f97316', glow: '#fb923c' },
    { def: 20, tint: '#451a03' }
  );
  const label = createNameplateSprite('⚒️ 矮人鐵匠・神兵鍛造 [按 G]', '#fbbf24', false);
  label.sprite.scale.set(3.4, 0.58, 1);
  label.sprite.position.set(0, 2.85, 0);
  npc.group.add(label.sprite);
  return npc;
}

/**
 * Village NPC 3: Baldur's Gate Arcane Sage & Alchemist Gale
 */
export function createAlchemistNpcModel() {
  const npc = createCharacterModel(
    {
      hairStyle: 'long',
      hairColor: '#4c1d95',
      skinColor: '#f5cfa0',
      eyeStyle: 'glowing',
      eyeColor: '#a855f7',
      earStyle: 'elf',
      faceAccessory: 'goatee',
      headgear: 'wizard_hat',
      wingStyle: 'none',
      outfitPrimary: '#3b0764',
      outfitSecondary: '#c084fc',
      cape: true,
      capeColor: '#6d28d9',
      heightScale: 1.05,
      bodyWidthScale: 0.95
    },
    { style: 'tome_staff', color: '#c084fc', glow: '#a855f7' },
    { def: 10, tint: '#4c1d95' }
  );
  const label = createNameplateSprite('🧙 秘法鍊金賢者・秘藥卷軸 [按 G]', '#e879f9', false);
  label.sprite.scale.set(3.5, 0.58, 1);
  label.sprite.position.set(0, 3.2, 0);
  npc.group.add(label.sprite);
  return npc;
}

/**
 * Village NPC 4: World Codex & Bestiary Guide Homer
 */
export function createGuideNpcModel() {
  const npc = createCharacterModel(
    {
      hairStyle: 'crown_braid',
      hairColor: '#e2e8f0',
      skinColor: '#f5cfa0',
      eyeStyle: 'normal',
      eyeColor: '#06b6d4',
      earStyle: 'elf',
      faceAccessory: 'glasses',
      headgear: 'laurel',
      wingStyle: 'angel',
      wingColor: '#fef08a',
      outfitPrimary: '#0369a1',
      outfitSecondary: '#fef08a',
      cape: true,
      capeColor: '#0284c7',
      heightScale: 1.04,
      bodyWidthScale: 0.96
    },
    { style: 'staff', color: '#38bdf8', glow: '#fde047' },
    null
  );
  const label = createNameplateSprite('📖 世界圖鑑導師・素材掉落表 [按 G]', '#7dd3fc', false);
  label.sprite.scale.set(3.6, 0.58, 1);
  label.sprite.position.set(0, 3.1, 0);
  npc.group.add(label.sprite);
  return npc;
}

/**
 * Ocean Boss 1: Deep-Sea Kraken (Giant Tentacled Squid Monster)
 */
export function createKrakenModel() {
  const g = new THREE.Group();
  const bodyMat = mat('#7f1d1d', 0.45, 0.2, '#991b1b', 0.35);
  const suckerMat = mat('#f43f5e', 0.5);
  const eyeMat = mat('#fef08a', 0.1, 0, '#f59e0b', 2.0);

  // Towering Squid Mantle Head
  const mantle = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.6, 14), bodyMat);
  mantle.position.y = 3.2;
  mantle.castShadow = true;
  g.add(mantle);

  const headSphere = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 14), bodyMat);
  headSphere.position.y = 1.65;
  g.add(headSphere);

  [-0.55, 0.55].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), eyeMat);
    eye.position.set(ex, 1.78, 1.15);
    g.add(eye);
  });

  // 6 Undulating Kraken Tentacles radiating around base
  const tentacles = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 1.1, 1.05, Math.sin(a) * 1.1);
    pivot.rotation.y = -a;
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.32, 3.2, 8), i % 2 === 0 ? bodyMat : suckerMat);
    arm.rotation.z = -Math.PI / 2.6;
    arm.position.set(1.25, -0.35, 0);
    pivot.add(arm);
    g.add(pivot);
    tentacles.push({ pivot, phase: i * 1.1 });
  }

  const hpBar = createNameplateSprite('🦑 北海巨妖・深海克拉肯 [Boss Lv.18]', '#fb7185', true);
  hpBar.sprite.scale.set(4.8, 1.25, 1);
  hpBar.sprite.position.set(0, 5.4, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 7.5 : 3.2);
    mantle.rotation.z = Math.sin(clk) * 0.08;
    tentacles.forEach((t) => {
      t.pivot.rotation.z = Math.sin(clk * (attacking ? 2.2 : 1.1) + t.phase) * 0.42;
    });
  }
  return { group: g, hpBar, animate };
}

/**
 * Ocean Boss 2: Abyssal Sea Dragon Leviathan
 */
export function createLeviathanModel() {
  const g = new THREE.Group();
  const scaleMat = mat('#0369a1', 0.3, 0.45, '#0284c7', 0.45);
  const finMat = mat('#22d3ee', 0.2, 0.3, '#06b6d4', 1.1);
  const eyeMat = mat('#fef08a', 0.1, 0, '#fde047', 1.8);

  const segments = [];
  for (let i = 0; i < 6; i++) {
    const r = 1.25 - i * 0.14;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), scaleMat);
    seg.position.set(0, 1.5 + Math.sin(i * 0.9) * 0.45, 2.2 - i * 1.25);
    seg.castShadow = true;
    g.add(seg);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.0, 6), finMat);
    fin.position.set(0, r + 0.35, 0);
    seg.add(fin);
    segments.push({ seg, idx: i });
  }

  // Sea-Dragon Snout & Horns
  const head = segments[0].seg;
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.9, 10), scaleMat);
  jaw.rotation.x = Math.PI / 2;
  jaw.position.set(0, 0, 1.45);
  head.add(jaw);
  [-0.45, 0.45].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), eyeMat);
    eye.position.set(ex, 0.35, 1.05);
    head.add(eye);
  });

  const hpBar = createNameplateSprite('🌊 利維坦・深淵太古海龍 [Boss Lv.21]', '#38bdf8', true);
  hpBar.sprite.scale.set(5.0, 1.25, 1);
  hpBar.sprite.position.set(0, 4.6, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 8 : 3.5);
    segments.forEach((s) => {
      s.seg.position.x = Math.sin(clk - s.idx * 0.7) * 0.55;
      s.seg.position.y = 1.55 + Math.cos(clk - s.idx * 0.7) * 0.35 + (attacking && s.idx === 0 ? 0.35 : 0);
    });
  }
  return { group: g, hpBar, animate };
}

/**
 * Frost Peaks Elite: Himalayan Alpine Yeti
 */
export function createYetiModel() {
  const g = new THREE.Group();
  const furMat = mat('#f1f5f9', 0.8);
  const iceMat = mat('#38bdf8', 0.2, 0.4, '#0ea5e9', 0.65);
  const faceMat = mat('#64748b', 0.7);

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 14), furMat);
  body.scale.set(1.15, 1.25, 1.0);
  body.position.y = 1.75;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), furMat);
  head.position.set(0, 3.15, 0.2);
  g.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), faceMat);
  face.position.set(0, 3.1, 0.52);
  g.add(face);

  [-1, 1].forEach((dir) => {
    const iceHorn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 8), iceMat);
    iceHorn.position.set(dir * 0.55, 3.62, 0.15);
    iceHorn.rotation.z = -dir * 0.45;
    g.add(iceHorn);
  });

  const arm = new THREE.Group();
  arm.position.set(1.25, 2.25, 0.15);
  const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), iceMat);
  fist.position.set(0, -0.65, 0.45);
  arm.add(fist);
  g.add(arm);

  const hpBar = createNameplateSprite('🦍 喜馬拉雅雪峰巨獸・雪怪 [菁英 Lv.15]', '#bae6fd', true);
  hpBar.sprite.scale.set(4.4, 1.15, 1);
  hpBar.sprite.position.set(0, 4.4, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 8 : 2.6);
    body.position.y = 1.75 + (moving ? Math.abs(Math.sin(clk)) * 0.2 : 0);
    arm.rotation.x = attacking ? -Math.sin(clk * 2.4) * 1.6 : Math.sin(clk) * 0.35;
  }
  return { group: g, hpBar, animate };
}

/**
 * Reusable Colored Winged Elder Dragon Builder (Frost Wyrm / Storm Dragon)
 */
function createElementalDragonModel(bodyColor, wingColor, glowColor, labelText, labelColor, scale = 1.05) {
  const g = new THREE.Group();
  const bodyMat = mat(bodyColor, 0.35, 0.45, glowColor, 0.35);
  const wingMat = mat(wingColor, 0.4, 0.3, glowColor, 0.55);
  const eyeMat = mat(glowColor, 0.1, 0, glowColor, 2.0);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 2.35, 12, 16), bodyMat);
  torso.rotation.x = Math.PI / 2.2;
  torso.position.set(0, 2.2, 0);
  torso.castShadow = true;
  g.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.72, 2.1, 12), bodyMat);
  neck.position.set(0, 3.35, 1.65);
  neck.rotation.x = 0.5;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.8, 10), bodyMat);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 4.2, 2.65);
  g.add(head);

  [-0.3, 0.3].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), eyeMat);
    eye.position.set(ex, 4.35, 2.9);
    g.add(eye);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.3, 8), eyeMat);
    horn.position.set(ex * 1.4, 4.85, 2.05);
    horn.rotation.x = -0.65;
    g.add(horn);
  });

  const wingL = new THREE.Group();
  wingL.position.set(-1.1, 2.8, 0.2);
  const wingLMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 2.2), wingMat);
  wingLMesh.position.x = -2.1;
  wingL.add(wingLMesh);
  g.add(wingL);

  const wingR = new THREE.Group();
  wingR.position.set(1.1, 2.8, 0.2);
  const wingRMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 2.2), wingMat);
  wingRMesh.position.x = 2.1;
  wingR.add(wingRMesh);
  g.add(wingR);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.4, 10), bodyMat);
  tail.rotation.x = -Math.PI / 2.2;
  tail.position.set(0, 1.45, -2.9);
  g.add(tail);

  g.scale.setScalar(scale);

  const hpBar = createNameplateSprite(labelText, labelColor, true);
  hpBar.sprite.scale.set(5.2, 1.3, 1);
  hpBar.sprite.position.set(0, 6.2, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 7.5 : 3.2);
    const flap = Math.sin(clk * 1.5) * 0.45;
    wingL.rotation.z = 0.25 + flap;
    wingR.rotation.z = -0.25 - flap;
    g.position.y = Math.sin(clk) * 0.22 + (attacking ? 0.35 : 0);
    tail.rotation.z = Math.sin(clk) * 0.25;
  }
  return { group: g, hpBar, animate };
}

export function createFrostWyrmModel() {
  return createElementalDragonModel('#0284c7', '#bae6fd', '#38bdf8', '❄️ 辛達苟薩・極寒冰霜古龍 [Boss Lv.21]', '#7dd3fc', 1.05);
}

export function createStormDragonModel() {
  return createElementalDragonModel('#312e81', '#facc15', '#38bdf8', '⚡ 巴哈姆特・蒼穹雷霆古龍 [Boss Lv.23]', '#fde047', 1.15);
}

/**
 * Cthulhu Mythos 1: Innsmouth Deep One Cultist
 */
export function createDeepOneModel() {
  const g = new THREE.Group();
  const skinMat = mat('#15803d', 0.55, 0.2, '#064e3b', 0.25);
  const finMat = mat('#22c55e', 0.4);
  const eyeMat = mat('#fde047', 0.1, 0, '#eab308', 1.8);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.05, 10, 12), skinMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), skinMat);
  head.scale.set(1.0, 0.9, 1.25);
  head.position.set(0, 2.08, 0.12);
  g.add(head);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.72), finMat);
  fin.position.set(0, 2.48, -0.05);
  g.add(fin);

  [-0.22, 0.22].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), eyeMat);
    eye.position.set(ex, 2.15, 0.48);
    g.add(eye);
  });

  const hpBar = createNameplateSprite('🐟 深潛者・魚人邪教徒 [Lv.14]', '#4ade80', true);
  hpBar.sprite.position.set(0, 3.1, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9.5 : 3);
    torso.position.y = 1.25 + (moving ? Math.abs(Math.sin(clk)) * 0.15 : 0);
    if (attacking) head.position.z = 0.12 + Math.sin(clk * 2) * 0.25;
  }
  return { group: g, hpBar, animate };
}

/**
 * Cthulhu Mythos 2: Shoggoth (Many-Eyed Protoplasmic Eldritch Horror)
 */
export function createShoggothModel() {
  const g = new THREE.Group();
  const blobMat = mat('#1e1b4b', 0.35, 0.3, '#581c87', 0.55);
  const eyeMat = mat('#4ade80', 0.1, 0, '#22c55e', 1.8);

  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 1), blobMat);
  core.position.y = 1.65;
  core.castShadow = true;
  g.add(core);

  // 10 Glowing Eldritch Eyes covering the Shoggoth surface!
  const eyes = [];
  for (let i = 0; i < 10; i++) {
    const phi = Math.acos(-1 + (2 * i) / 10);
    const theta = Math.sqrt(10 * Math.PI) * phi;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), eyeMat);
    eye.position.set(
      1.55 * Math.cos(theta) * Math.sin(phi),
      1.65 + 1.45 * Math.cos(phi),
      1.55 * Math.sin(theta) * Math.sin(phi)
    );
    g.add(eye);
    eyes.push(eye);
  }

  const hpBar = createNameplateSprite('👁️ 修格斯・萬眼原生質魔物 [再生菁英 Lv.18]', '#c084fc', true);
  hpBar.sprite.scale.set(4.6, 1.2, 1);
  hpBar.sprite.position.set(0, 3.85, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 7 : 3);
    core.scale.set(1 + Math.sin(clk) * 0.12, 1 + Math.cos(clk * 1.3) * 0.12, 1 + Math.sin(clk * 0.8) * 0.12);
    core.rotation.y += dt * (attacking ? 1.8 : 0.6);
  }
  return { group: g, hpBar, animate };
}

/**
 * Cthulhu Mythos Boss: Great Old One CTHULHU of R'lyeh!
 */
export function createCthulhuModel() {
  const g = new THREE.Group();
  const skinMat = mat('#064e3b', 0.5, 0.25, '#047857', 0.4);
  const wingMat = mat('#1e1b4b', 0.55, 0.2, '#4c1d95', 0.45);
  const eyeMat = mat('#a3e635', 0.1, 0, '#4ade80', 2.2);

  // Towering Eldritch Titan Body
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 3.1, 16), skinMat);
  torso.position.y = 2.4;
  torso.castShadow = true;
  g.add(torso);

  // Octopoid Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.05, 18, 14), skinMat);
  head.scale.set(0.95, 1.25, 1.05);
  head.position.set(0, 4.45, 0.2);
  g.add(head);

  // 6 Glowing Madness Eyes
  [[-0.42, 4.65], [0.42, 4.65], [-0.24, 4.88], [0.24, 4.88]].forEach(([ex, ey]) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), eyeMat);
    eye.position.set(ex, ey, 1.05);
    g.add(eye);
  });

  // 6 Writhing Face Tentacles
  const tentacles = [];
  for (let i = 0; i < 6; i++) {
    const tx = (i - 2.5) * 0.28;
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.75, 8), skinMat);
    t.rotation.x = Math.PI + 0.15;
    t.position.set(tx, 3.45, 0.98);
    g.add(t);
    tentacles.push({ t, phase: i * 1.1 });
  }

  // Enormous Bat-Dragon Eldritch Wings
  const wingL = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.4, 5), wingMat);
  wingL.scale.set(1.3, 1.0, 0.18);
  wingL.position.set(-2.35, 3.6, -0.75);
  wingL.rotation.z = 0.85;
  g.add(wingL);

  const wingR = wingL.clone();
  wingR.position.x = 2.35;
  wingR.rotation.z = -0.85;
  g.add(wingR);

  // Floating Eldritch Sanity Halo
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.85, 0.08, 8, 28),
    mat('#4ade80', 0.1, 0.2, '#22c55e', 1.6)
  );
  halo.position.set(0, 5.2, -0.5);
  g.add(halo);

  const hpBar = createNameplateSprite('🐙 克蘇魯・拉萊耶舊日支配者 [神話終極 Boss Lv.25]', '#4ade80', true);
  hpBar.sprite.scale.set(5.4, 1.35, 1);
  hpBar.sprite.position.set(0, 6.75, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 6.5 : 2.8);
    g.position.y = 0.25 + Math.sin(clk) * 0.22;
    wingL.rotation.z = 0.85 + Math.sin(clk * 1.3) * 0.25;
    wingR.rotation.z = -0.85 - Math.sin(clk * 1.3) * 0.25;
    halo.rotation.z += dt * 1.2;
    tentacles.forEach((o) => {
      o.t.rotation.z = Math.sin(clk * (attacking ? 2.6 : 1.4) + o.phase) * 0.35;
    });
  }
  return { group: g, hpBar, animate };
}

/**
 * Japanese Yokai 1: Kurama Great Tengu
 */
export function createTenguModel() {
  const g = new THREE.Group();
  const robeMat = mat('#f8fafc', 0.65);
  const redSkin = mat('#dc2626', 0.55);
  const wingMat = mat('#18181b', 0.6);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 1.3, 14), robeMat);
  torso.position.y = 1.3;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), redSkin);
  head.position.set(0, 2.18, 0.05);
  g.add(head);

  // Iconic Long Tengu Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 8), redSkin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.15, 0.62);
  g.add(nose);

  // Black Raven Wings
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 0.12), wingMat);
  wingL.position.set(-1.05, 1.85, -0.35);
  wingL.rotation.z = 0.35;
  g.add(wingL);

  const wingR = wingL.clone();
  wingR.position.x = 1.05;
  wingR.rotation.z = -0.35;
  g.add(wingR);

  // Giant Red Tengu Leaf Fan (Uchiwa)
  const fan = new THREE.Mesh(new THREE.CircleGeometry(0.55, 8), mat('#ef4444', 0.4, 0.1, '#dc2626', 0.4));
  fan.position.set(0.72, 1.65, 0.55);
  g.add(fan);

  const hpBar = createNameplateSprite('👺 鞍馬山大天狗・疾風劍豪 [妖怪菁英 Lv.15]', '#fca5a5', true);
  hpBar.sprite.scale.set(4.4, 1.15, 1);
  hpBar.sprite.position.set(0, 3.25, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 10 : 3.5);
    g.position.y = 0.32 + Math.sin(clk) * 0.2;
    wingL.rotation.z = 0.35 + Math.sin(clk * 1.8) * 0.35;
    wingR.rotation.z = -0.35 - Math.sin(clk * 1.8) * 0.35;
    if (attacking) fan.rotation.x = Math.sin(clk * 2.5) * 0.85;
  }
  return { group: g, hpBar, animate };
}

/**
 * Japanese Yokai Boss 2: Shuten-Doji Oni King
 */
export function createShutenDojiModel() {
  const g = new THREE.Group();
  const oniSkin = mat('#b91c1c', 0.6);
  const tigerPelt = mat('#eab308', 0.75);
  const ironMat = mat('#18181b', 0.35, 0.8);
  const hornMat = mat('#fef08a', 0.3, 0.4);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.72, 1.75, 16), oniSkin);
  torso.position.y = 1.85;
  torso.castShadow = true;
  g.add(torso);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.85, 0.55, 16), tigerPelt);
  waist.position.y = 1.0;
  g.add(waist);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), oniSkin);
  head.position.set(0, 3.0, 0.12);
  g.add(head);

  [-0.28, 0.28].forEach((hx) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.85, 10), hornMat);
    horn.position.set(hx, 3.65, 0.2);
    horn.rotation.z = hx > 0 ? -0.3 : 0.3;
    g.add(horn);
  });

  // Colossal Studded Iron Kanabo Club
  const arm = new THREE.Group();
  arm.position.set(1.08, 2.25, 0.2);
  const kanabo = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.14, 2.85, 10), ironMat);
  kanabo.rotation.x = Math.PI / 2.2;
  kanabo.position.set(0, -0.1, 0.95);
  arm.add(kanabo);
  g.add(arm);

  const hpBar = createNameplateSprite('👹 酒吞童子・大江山百鬼鬼王 [Boss Lv.18]', '#f87171', true);
  hpBar.sprite.scale.set(4.8, 1.2, 1);
  hpBar.sprite.position.set(0, 4.5, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 8.5 : 2.8);
    torso.position.y = 1.85 + (moving ? Math.abs(Math.sin(clk)) * 0.18 : 0);
    arm.rotation.x = attacking ? -Math.sin(clk * 2.5) * 1.65 : Math.sin(clk) * 0.35;
  }
  return { group: g, hpBar, animate };
}

/**
 * Japanese Yokai Boss 3: Nine-Tailed Kitsune Tamamo-no-Mae (Kyubi — 9 Fanning Glowing Tails!)
 */
export function createKyubiModel() {
  const g = new THREE.Group();
  const furMat = mat('#fef3c7', 0.45, 0.15, '#fbbf24', 0.35);
  const tipMat = mat('#ef4444', 0.3, 0.2, '#f97316', 0.85);
  const fireMat = mat('#38bdf8', 0.1, 0, '#0ea5e9', 2.0);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.68, 1.45, 12, 16), furMat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 1.25, 0);
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.25, 10), furMat);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 1.85, 1.15);
  g.add(head);

  [-0.28, 0.28].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 6), furMat);
    ear.position.set(ex, 2.38, 0.72);
    g.add(ear);
  });

  // 9 Mystical Fanning Kitsune Tails!
  const tailsGroup = new THREE.Group();
  tailsGroup.position.set(0, 1.35, -0.95);
  const tails = [];
  for (let i = 0; i < 9; i++) {
    const angle = ((i - 4) / 4) * 1.15;
    const tPivot = new THREE.Group();
    tPivot.rotation.z = angle;
    const tMesh = new THREE.Mesh(new THREE.ConeGeometry(0.24, 2.55, 8), i % 2 === 0 ? furMat : tipMat);
    tMesh.position.set(0, 1.35, -0.45);
    tMesh.rotation.x = -0.35;
    tPivot.add(tMesh);
    tailsGroup.add(tPivot);
    tails.push({ tPivot, base: angle, phase: i * 0.7 });
  }
  g.add(tailsGroup);

  // Orbiting Blue Foxfire Orbs
  const orbRing = new THREE.Group();
  orbRing.position.y = 2.0;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), fireMat);
    orb.position.set(Math.cos(a) * 1.85, 0, Math.sin(a) * 1.85);
    orbRing.add(orb);
  }
  g.add(orbRing);

  const hpBar = createNameplateSprite('🦊 玉藻前・白面金毛九尾妖狐 [狐火 Boss Lv.20]', '#fde047', true);
  hpBar.sprite.scale.set(5.0, 1.25, 1);
  hpBar.sprite.position.set(0, 4.35, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 9.5 : 3.5);
    orbRing.rotation.y += dt * (attacking ? 4.5 : 1.8);
    tails.forEach((t) => {
      t.tPivot.rotation.z = t.base + Math.sin(clk + t.phase) * 0.14;
    });
  }
  return { group: g, hpBar, animate };
}

/**
 * Japanese Yokai Boss 4: Yamata no Orochi (5-Headed Mythic Serpent Dragon!)
 */
export function createYamataOrochiModel() {
  const g = new THREE.Group();
  const bodyMat = mat('#18181b', 0.4, 0.45, '#581c87', 0.45);
  const accentMat = mat('#991b1b', 0.35, 0.3, '#dc2626', 0.6);
  const eyeMat = mat('#ef4444', 0.1, 0, '#ef4444', 2.2);

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 16), bodyMat);
  body.scale.set(1.25, 0.9, 1.65);
  body.position.y = 1.65;
  body.castShadow = true;
  g.add(body);

  // 5 Towering Snapping Serpent Heads!
  const heads = [];
  [-1.65, -0.82, 0, 0.82, 1.65].forEach((ox, idx) => {
    const ng = new THREE.Group();
    ng.position.set(ox, 2.35, 1.25);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.4, 10), idx % 2 === 0 ? bodyMat : accentMat);
    neck.position.set(0, 1.0, 0.55);
    neck.rotation.x = 0.42;
    ng.add(neck);

    const head = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.35, 10), accentMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 2.15, 1.25);
    ng.add(head);

    [-0.16, 0.16].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
      eye.position.set(ex, 2.3, 1.4);
      ng.add(eye);
    });
    g.add(ng);
    heads.push({ ng, phase: idx * 1.3 });
  });

  const hpBar = createNameplateSprite('🐍 八岐大蛇・出雲神話滅世妖龍 [再生炎毒 Boss Lv.24]', '#c084fc', true);
  hpBar.sprite.scale.set(5.4, 1.35, 1);
  hpBar.sprite.position.set(0, 5.65, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 7.5 : 3.2);
    heads.forEach((h) => {
      h.ng.rotation.y = Math.sin(clk + h.phase) * 0.3;
      h.ng.rotation.x = attacking ? Math.sin((clk + h.phase) * 2.5) * 0.55 : Math.sin(clk + h.phase) * 0.18;
    });
  }
  return { group: g, hpBar, animate };
}

/**
 * Mayan Culture 1: Obsidian Jaguar Warrior Elite
 */
export function createJaguarWarriorModel() {
  const g = new THREE.Group();
  const jaguarMat = mat('#ca8a04', 0.65);
  const jadeMat = mat('#10b981', 0.3, 0.5, '#059669', 0.45);
  const obsidianMat = mat('#09090b', 0.2, 0.85, '#a855f7', 0.4);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.25, 14), jaguarMat);
  torso.position.y = 1.3;
  torso.castShadow = true;
  g.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.55), jadeMat);
  chest.position.y = 1.5;
  g.add(chest);

  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), jaguarMat);
  helm.position.set(0, 2.2, 0.08);
  g.add(helm);

  // Feathered Mayan Plume Headdress
  for (let i = -2; i <= 2; i++) {
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.72, 6), jadeMat);
    plume.position.set(i * 0.14, 2.72, -0.1);
    plume.rotation.z = -i * 0.22;
    g.add(plume);
  }

  // Obsidian Macuahuitl Saw-Blade
  const arm = new THREE.Group();
  arm.position.set(0.62, 1.55, 0.15);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.55, 0.08), obsidianMat);
  blade.rotation.x = Math.PI / 2.2;
  blade.position.set(0, 0, 0.75);
  arm.add(blade);
  g.add(arm);

  const hpBar = createNameplateSprite('🐆 馬雅黑曜石美洲豹戰士 [菁英 Lv.16]', '#fde047', true);
  hpBar.sprite.scale.set(4.5, 1.15, 1);
  hpBar.sprite.position.set(0, 3.45, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 10 : 3);
    torso.position.y = 1.3 + (moving ? Math.abs(Math.sin(clk)) * 0.16 : 0);
    arm.rotation.x = attacking ? -Math.sin(clk * 2.6) * 1.55 : Math.sin(clk) * 0.35;
  }
  return { group: g, hpBar, animate };
}

/**
 * Mayan Culture Boss: Quetzalcoatl / Kukulkan Feathered Sun Serpent Dragon!
 */
export function createQuetzalcoatlModel() {
  const g = new THREE.Group();
  const jadeMat = mat('#059669', 0.3, 0.4, '#10b981', 0.55);
  const goldMat = mat('#fbbf24', 0.2, 0.85, '#f59e0b', 0.65);
  const crimsonMat = mat('#dc2626', 0.35, 0.2, '#ef4444', 0.65);

  const segments = [];
  for (let i = 0; i < 7; i++) {
    const r = 1.18 - i * 0.11;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), i % 2 === 0 ? jadeMat : goldMat);
    seg.position.set(0, 2.2 + Math.sin(i * 0.85) * 0.5, 2.6 - i * 1.15);
    seg.castShadow = true;
    g.add(seg);
    segments.push({ seg, idx: i });
  }

  // Radiant Sun-Halo Crest & Feathered Wings on Head
  const head = segments[0].seg;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.35, 6), i % 2 === 0 ? crimsonMat : goldMat);
    feather.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, -0.1);
    feather.rotation.z = a - Math.PI / 2;
    head.add(feather);
  }

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 1.65), jadeMat);
  wingL.position.set(-2.2, 0.3, -0.5);
  segments[1].seg.add(wingL);

  const wingR = wingL.clone();
  wingR.position.x = 2.2;
  segments[1].seg.add(wingR);

  const hpBar = createNameplateSprite('🪶 羽蛇神・庫庫爾坎 [馬雅太陽神龍 Boss Lv.23]', '#34d399', true);
  hpBar.sprite.scale.set(5.2, 1.3, 1);
  hpBar.sprite.position.set(0, 5.25, 0);
  g.add(hpBar.sprite);

  let clk = Math.random() * 10;
  function animate(dt, moving, attacking) {
    clk += dt * (moving ? 8.5 : 3.5);
    segments.forEach((s) => {
      s.seg.position.x = Math.sin(clk - s.idx * 0.65) * 0.65;
      s.seg.position.y = 2.35 + Math.cos(clk - s.idx * 0.65) * 0.45 + (attacking && s.idx === 0 ? 0.35 : 0);
    });
    wingL.rotation.z = Math.sin(clk * 1.7) * 0.48;
    wingR.rotation.z = -Math.sin(clk * 1.7) * 0.48;
  }
  return { group: g, hpBar, animate };
}

/**
 * Factory helper to create any of the 28 mob models by its type key.
 */
export function createMobModelByType(typeKey) {
  if (typeKey === 'goblin') return createGoblinModel();
  if (typeKey === 'orc') return createOrcModel();
  if (typeKey === 'ogre') return createOgreModel();
  if (typeKey === 'troll') return createTrollModel();
  if (typeKey === 'gnome') return createGnomeModel();
  if (typeKey === 'zombie') return createZombieModel();
  if (typeKey === 'draugr_lord') return createDraugrLordModel();
  if (typeKey === 'vampire') return createVampireModel();
  if (typeKey === 'centaur') return createCentaurModel();
  if (typeKey === 'minotaur') return createMinotaurModel();
  if (typeKey === 'medusa') return createMedusaModel();
  if (typeKey === 'cyclops') return createCyclopsModel();
  if (typeKey === 'cerberus') return createCerberusModel();
  if (typeKey === 'chimera') return createChimeraModel();
  if (typeKey === 'hydra') return createHydraModel();
  if (typeKey === 'kraken') return createKrakenModel();
  if (typeKey === 'leviathan') return createLeviathanModel();
  if (typeKey === 'yeti') return createYetiModel();
  if (typeKey === 'frost_wyrm') return createFrostWyrmModel();
  if (typeKey === 'storm_dragon') return createStormDragonModel();
  if (typeKey === 'deep_one') return createDeepOneModel();
  if (typeKey === 'shoggoth') return createShoggothModel();
  if (typeKey === 'cthulhu') return createCthulhuModel();
  if (typeKey === 'tengu') return createTenguModel();
  if (typeKey === 'shuten_doji') return createShutenDojiModel();
  if (typeKey === 'kyubi') return createKyubiModel();
  if (typeKey === 'yamata_orochi') return createYamataOrochiModel();
  if (typeKey === 'jaguar_warrior') return createJaguarWarriorModel();
  if (typeKey === 'quetzalcoatl') return createQuetzalcoatlModel();
  return createDragonModel();
}
