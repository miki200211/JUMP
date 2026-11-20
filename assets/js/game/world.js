/**
 * 3D Fantasy World Builder (Elder Scrolls & Roguelike Edition)
 * - Central Elf Village (Safe Zone)
 * - Greenskin Warfront (Goblins, Orcs, Ogres, Trolls)
 * - Zombie Plague Cavern (3D Cave Dome + Stalactites + Toxic Pools + Ancient Treasure Chest!)
 * - Gnome & Vampire Blood Forest (Glowing Mushrooms + Blood Moon Altar)
 * - Dragon Volcano Lair (Obsidian Spires + Elder Scrolls Word Wall)
 */
import * as THREE from 'three';
import { ZONES } from './data.js';
import { createElfMerchantModel, createTreasureChestModel } from './models.js';

export function buildWorld(scene) {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // --- Lighting & Atmosphere ---
  scene.background = new THREE.Color('#0c0e1e');
  scene.fog = new THREE.FogExp2('#0c0e1e', 0.0062);

  const hemiLight = new THREE.HemisphereLight('#c7d2fe', '#1e293b', 0.88);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight('#fef3c7', 1.35);
  dirLight.position.set(45, 75, 35);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 230;
  const d = 105;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // --- Main Ground ---
  const groundGeo = new THREE.CircleGeometry(135, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: '#1a3628', roughness: 0.92, metalness: 0.02 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const ringMat = new THREE.MeshBasicMaterial({
    color: '#34d399',
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  // --- 1. Elf Village (Safe Zone at 0, 0) ---
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(ZONES.village.radius - 1, ZONES.village.radius, 0.14, 48),
    new THREE.MeshStandardMaterial({ color: '#2b334e', roughness: 0.85 })
  );
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  worldGroup.add(plaza);

  const safeRing = new THREE.Mesh(new THREE.RingGeometry(ZONES.village.radius - 0.5, ZONES.village.radius, 64), ringMat);
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.12;
  worldGroup.add(safeRing);

  // Glowing Life Tree
  const treeTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.85, 7.5, 12),
    new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.9 })
  );
  treeTrunk.position.set(0, 3.75, -8);
  treeTrunk.castShadow = true;
  worldGroup.add(treeTrunk);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: '#10b981',
    emissive: '#059669',
    emissiveIntensity: 0.35,
    roughness: 0.6
  });
  [[0, 8.6, -8, 4.2], [-2.5, 7.2, -7.2, 2.8], [2.6, 7.4, -7.5, 2.7], [0, 7.4, -5.2, 2.5]].forEach(([x, y, z, r]) => {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), foliageMat);
    crown.position.set(x, y, z);
    crown.castShadow = true;
    worldGroup.add(crown);
  });

  const treeLight = new THREE.PointLight('#34d399', 2.2, 32);
  treeLight.position.set(0, 8, -7);
  worldGroup.add(treeLight);

  function addElfHouse(x, z, rotY) {
    const house = new THREE.Group();
    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.5, 3.8, 10),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.75 })
    );
    walls.position.y = 1.9;
    walls.castShadow = true;
    house.add(walls);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 3.4, 10),
      new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.65 })
    );
    roof.position.y = 5.4;
    roof.castShadow = true;
    house.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 2.2, 0.3),
      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 })
    );
    door.position.set(0, 1.1, 3.3);
    house.add(door);

    house.position.set(x, 0, z);
    house.rotation.y = rotY;
    worldGroup.add(house);
  }
  addElfHouse(-13, -9, 0.6);
  addElfHouse(14, -10, -0.7);
  addElfHouse(-14, 11, 2.3);

  // Elf Merchant NPC
  const merchantPos = new THREE.Vector3(6.5, 0, -4.5);
  const elfMerchant = createElfMerchantModel();
  elfMerchant.group.position.copy(merchantPos);
  elfMerchant.group.rotation.y = -0.45;
  worldGroup.add(elfMerchant.group);

  // --- 2. Greenskin Warfront (East-South: 52, 26) ---
  const campCenter = ZONES.greenskinWarfront.center;
  const campRadius = ZONES.greenskinWarfront.radius;
  const goblinGround = new THREE.Mesh(
    new THREE.CircleGeometry(campRadius, 36),
    new THREE.MeshStandardMaterial({ color: '#3b2f1e', roughness: 0.95 })
  );
  goblinGround.rotation.x = -Math.PI / 2;
  goblinGround.position.set(campCenter.x, 0.05, campCenter.z);
  goblinGround.receiveShadow = true;
  worldGroup.add(goblinGround);

  const fireLight = new THREE.PointLight('#f97316', 2.6, 28);
  fireLight.position.set(campCenter.x, 2.5, campCenter.z);
  worldGroup.add(fireLight);

  const flameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ef4444', emissiveIntensity: 1.2 })
  );
  flameMesh.position.set(campCenter.x, 1.2, campCenter.z);
  worldGroup.add(flameMesh);

  const spikeMat = new THREE.MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.9 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (a > 2.3 && a < 3.7) continue;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.6, 4.2, 6), spikeMat);
    spike.position.set(
      campCenter.x + Math.cos(a) * (campRadius - 2),
      2.1,
      campCenter.z + Math.sin(a) * (campRadius - 2)
    );
    spike.castShadow = true;
    worldGroup.add(spike);
  }

  // --- 3. ☠️ Zombie Plague Cavern (East-North: 54, -46) ---
  const caveCenter = ZONES.zombieCavern.center;
  const caveRadius = ZONES.zombieCavern.radius;
  const caveFloor = new THREE.Mesh(
    new THREE.CircleGeometry(caveRadius, 36),
    new THREE.MeshStandardMaterial({ color: '#18221f', roughness: 0.9 })
  );
  caveFloor.rotation.x = -Math.PI / 2;
  caveFloor.position.set(caveCenter.x, 0.06, caveCenter.z);
  caveFloor.receiveShadow = true;
  worldGroup.add(caveFloor);

  // Glowing Toxic Acid Pools inside the Cave
  const acidMat = new THREE.MeshBasicMaterial({ color: '#84cc16', transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  [[caveCenter.x - 5, caveCenter.z + 4, 3.8], [caveCenter.x + 6, caveCenter.z + 2, 3.2], [caveCenter.x - 2, caveCenter.z - 6, 4.2]].forEach(([px, pz, pr]) => {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(pr, 24), acidMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(px, 0.1, pz);
    worldGroup.add(pool);
  });

  // Cavern Rock Archway, Walls & Stalactites (Open towards South-West entrance so player can walk inside!)
  const caveRockMat = new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.92, metalness: 0.1 });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    // Leave wide cave mouth facing SW (towards village at 0,0)
    if (a > 1.75 && a < 3.15) continue;
    const dist = caveRadius - 2.5;
    const rx = caveCenter.x + Math.cos(a) * dist;
    const rz = caveCenter.z + Math.sin(a) * dist;
    const h = 9 + (i % 3) * 3.5;

    const wallPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(4.2, 1), caveRockMat);
    wallPillar.scale.set(1.1, h / 4.2, 1.1);
    wallPillar.position.set(rx, h * 0.45, rz);
    wallPillar.castShadow = true;
    worldGroup.add(wallPillar);

    // Overhead stalactites arching inward
    const roofRock = new THREE.Mesh(new THREE.DodecahedronGeometry(4.8, 1), caveRockMat);
    roofRock.position.set(
      caveCenter.x + Math.cos(a) * (dist * 0.62),
      11.5 + (i % 2) * 1.5,
      caveCenter.z + Math.sin(a) * (dist * 0.62)
    );
    worldGroup.add(roofRock);

    const stalactite = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.8, 6), caveRockMat);
    stalactite.rotation.x = Math.PI;
    stalactite.position.set(
      caveCenter.x + Math.cos(a) * (dist * 0.55),
      9.2,
      caveCenter.z + Math.sin(a) * (dist * 0.55)
    );
    worldGroup.add(stalactite);
  }

  // Cave entrance stone arch sign
  const caveLight = new THREE.PointLight('#84cc16', 2.8, 36);
  caveLight.position.set(caveCenter.x, 6.5, caveCenter.z);
  worldGroup.add(caveLight);

  // Ancient Treasure Chest deep inside the Zombie Cavern!
  const chestPos = new THREE.Vector3(caveCenter.x + 5, 0, caveCenter.z - 5);
  const treasureChest = createTreasureChestModel();
  treasureChest.group.position.copy(chestPos);
  treasureChest.group.rotation.y = -2.35;
  worldGroup.add(treasureChest.group);

  // --- 4. Gnome & Vampire Blood Forest (West: -52, 14) ---
  const forestCenter = ZONES.gnomeForest.center;
  const forestRadius = ZONES.gnomeForest.radius;
  const gnomeGround = new THREE.Mesh(
    new THREE.CircleGeometry(forestRadius, 36),
    new THREE.MeshStandardMaterial({ color: '#1e1b38', roughness: 0.92 })
  );
  gnomeGround.rotation.x = -Math.PI / 2;
  gnomeGround.position.set(forestCenter.x, 0.05, forestCenter.z);
  gnomeGround.receiveShadow = true;
  worldGroup.add(gnomeGround);

  const bloodLight = new THREE.PointLight('#e11d48', 2.6, 34);
  bloodLight.position.set(forestCenter.x, 5, forestCenter.z);
  worldGroup.add(bloodLight);

  // Vampire Blood Moon Altar in center of West Forest
  const altar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.4, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.5 })
  );
  altar.position.set(forestCenter.x, 0.6, forestCenter.z);
  worldGroup.add(altar);

  const bloodCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.15, 0),
    new THREE.MeshStandardMaterial({ color: '#e11d48', emissive: '#be123c', emissiveIntensity: 1.1 })
  );
  bloodCrystal.position.set(forestCenter.x, 2.8, forestCenter.z);
  worldGroup.add(bloodCrystal);

  const mushCapMat = new THREE.MeshStandardMaterial({
    color: '#7c3aed',
    emissive: '#5b21b6',
    emissiveIntensity: 0.45,
    roughness: 0.45
  });
  const mushStemMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const dist = 11 + (i % 3) * 5;
    const mx = forestCenter.x + Math.cos(a) * dist;
    const mz = forestCenter.z + Math.sin(a) * dist;
    const scale = 0.85 + (i % 3) * 0.4;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 2.6 * scale, 10), mushStemMat);
    stem.position.set(mx, 1.3 * scale, mz);
    worldGroup.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1.7 * scale, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mushCapMat
    );
    cap.position.set(mx, 2.5 * scale, mz);
    worldGroup.add(cap);
  }

  // --- 5. Dragon Volcano Lair & Elder Scrolls Word Wall (North: 0, -72) ---
  const lairCenter = ZONES.dragonLair.center;
  const lairRadius = ZONES.dragonLair.radius;
  const lavaGround = new THREE.Mesh(
    new THREE.CircleGeometry(lairRadius, 40),
    new THREE.MeshStandardMaterial({ color: '#27171c', roughness: 0.9 })
  );
  lavaGround.rotation.x = -Math.PI / 2;
  lavaGround.position.set(lairCenter.x, 0.06, lairCenter.z);
  lavaGround.receiveShadow = true;
  worldGroup.add(lavaGround);

  const lavaPool = new THREE.Mesh(
    new THREE.RingGeometry(15, 19, 40),
    new THREE.MeshBasicMaterial({ color: '#f97316', side: THREE.DoubleSide })
  );
  lavaPool.rotation.x = -Math.PI / 2;
  lavaPool.position.set(lairCenter.x, 0.09, lairCenter.z);
  worldGroup.add(lavaPool);

  // Skyrim-style Ancient Dragon Word Wall at the north edge of the lair
  const wordWall = new THREE.Mesh(
    new THREE.BoxGeometry(14, 7.5, 2.2),
    new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.85 })
  );
  wordWall.position.set(lairCenter.x, 3.75, lairCenter.z - 21);
  wordWall.castShadow = true;
  worldGroup.add(wordWall);

  const dragonLight = new THREE.PointLight('#ef4444', 3.2, 45);
  dragonLight.position.set(lairCenter.x, 8, lairCenter.z);
  worldGroup.add(dragonLight);

  const obsidianMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.4, metalness: 0.3 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (a > 1.1 && a < 2.1) continue;
    const h = 7 + (i % 3) * 4.5;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.5, h, 7), obsidianMat);
    spire.position.set(
      lairCenter.x + Math.cos(a) * (lairRadius - 1.5),
      h / 2,
      lairCenter.z + Math.sin(a) * (lairRadius - 1.5)
    );
    spire.castShadow = true;
    worldGroup.add(spire);
  }

  let worldTime = 0;
  function update(dt, chestCooldown = 0) {
    worldTime += dt;
    elfMerchant.animate(dt, false, 0, 0, false);
    treasureChest.animate(dt, chestCooldown > 0, chestCooldown);
    bloodCrystal.rotation.y += dt * 1.4;
    bloodCrystal.position.y = 2.8 + Math.sin(worldTime * 2.5) * 0.25;
    flameMesh.scale.y = 0.85 + Math.sin(worldTime * 11) * 0.2;
    fireLight.intensity = 2.2 + Math.sin(worldTime * 13) * 0.4;
    treeLight.intensity = 2.0 + Math.sin(worldTime * 2.5) * 0.35;
  }

  return { merchantPos, chestPos, update };
}
