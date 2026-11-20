/**
 * 3D Fantasy World Builder
 * Central Elf Village (Safe Zone), Goblin Camp, Gnome Mushroom Forest, Dragon Volcano Lair.
 */
import * as THREE from 'three';
import { ZONES } from './data.js';
import { createElfMerchantModel } from './models.js';

export function buildWorld(scene) {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // --- Lighting & Atmosphere ---
  scene.background = new THREE.Color('#0f1226');
  scene.fog = new THREE.FogExp2('#0f1226', 0.0068);

  const hemiLight = new THREE.HemisphereLight('#c7d2fe', '#1e293b', 0.9);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight('#fef3c7', 1.35);
  dirLight.position.set(45, 70, 35);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 220;
  const d = 95;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // --- Main Ground ---
  const groundGeo = new THREE.CircleGeometry(130, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: '#1b3b2b', roughness: 0.92, metalness: 0.02 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  // Subtle decorative ground grid / stones for spatial sense
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#34d399',
    transparent: true,
    opacity: 0.28,
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

  // Glowing Life Tree in village center
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

  // Elf Village Cottages
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

  // --- 2. Goblin Camp (East-South: 46, 22) ---
  const goblinGround = new THREE.Mesh(
    new THREE.CircleGeometry(ZONES.goblinCamp.radius, 32),
    new THREE.MeshStandardMaterial({ color: '#3b3322', roughness: 0.95 })
  );
  goblinGround.rotation.x = -Math.PI / 2;
  goblinGround.position.set(ZONES.goblinCamp.center.x, 0.05, ZONES.goblinCamp.center.z);
  goblinGround.receiveShadow = true;
  worldGroup.add(goblinGround);

  // Campfire in Goblin Camp
  const fireLight = new THREE.PointLight('#f97316', 2.4, 24);
  fireLight.position.set(ZONES.goblinCamp.center.x, 2.2, ZONES.goblinCamp.center.z);
  worldGroup.add(fireLight);

  const flameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 2.0, 8),
    new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ef4444', emissiveIntensity: 1.2 })
  );
  flameMesh.position.set(ZONES.goblinCamp.center.x, 1.0, ZONES.goblinCamp.center.z);
  worldGroup.add(flameMesh);

  // Wooden spikes around camp
  const spikeMat = new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.9 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    if (a > 2.2 && a < 3.6) continue; // Entrance facing village
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.2, 6), spikeMat);
    spike.position.set(
      ZONES.goblinCamp.center.x + Math.cos(a) * (ZONES.goblinCamp.radius - 2),
      1.6,
      ZONES.goblinCamp.center.z + Math.sin(a) * (ZONES.goblinCamp.radius - 2)
    );
    spike.castShadow = true;
    worldGroup.add(spike);
  }

  // --- 3. Gnome Mushroom Forest (West: -48, 16) ---
  const gnomeGround = new THREE.Mesh(
    new THREE.CircleGeometry(ZONES.gnomeForest.radius, 32),
    new THREE.MeshStandardMaterial({ color: '#1e2749', roughness: 0.92 })
  );
  gnomeGround.rotation.x = -Math.PI / 2;
  gnomeGround.position.set(ZONES.gnomeForest.center.x, 0.05, ZONES.gnomeForest.center.z);
  gnomeGround.receiveShadow = true;
  worldGroup.add(gnomeGround);

  const mushLight = new THREE.PointLight('#818cf8', 2.0, 30);
  mushLight.position.set(ZONES.gnomeForest.center.x, 4, ZONES.gnomeForest.center.z);
  worldGroup.add(mushLight);

  const mushCapMat = new THREE.MeshStandardMaterial({
    color: '#6366f1',
    emissive: '#4f46e5',
    emissiveIntensity: 0.45,
    roughness: 0.45
  });
  const mushStemMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const dist = 10 + (i % 3) * 4.5;
    const mx = ZONES.gnomeForest.center.x + Math.cos(a) * dist;
    const mz = ZONES.gnomeForest.center.z + Math.sin(a) * dist;
    const scale = 0.8 + (i % 3) * 0.4;
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

  // --- 4. Dragon Volcano Lair (North: 0, -64) ---
  const lavaGround = new THREE.Mesh(
    new THREE.CircleGeometry(ZONES.dragonLair.radius, 40),
    new THREE.MeshStandardMaterial({ color: '#27171c', roughness: 0.9 })
  );
  lavaGround.rotation.x = -Math.PI / 2;
  lavaGround.position.set(ZONES.dragonLair.center.x, 0.06, ZONES.dragonLair.center.z);
  lavaGround.receiveShadow = true;
  worldGroup.add(lavaGround);

  // Glowing Lava Ring
  const lavaPool = new THREE.Mesh(
    new THREE.RingGeometry(15, 18.5, 40),
    new THREE.MeshBasicMaterial({ color: '#f97316', side: THREE.DoubleSide })
  );
  lavaPool.rotation.x = -Math.PI / 2;
  lavaPool.position.set(ZONES.dragonLair.center.x, 0.09, ZONES.dragonLair.center.z);
  worldGroup.add(lavaPool);

  const dragonLight = new THREE.PointLight('#ef4444', 3.0, 42);
  dragonLight.position.set(ZONES.dragonLair.center.x, 8, ZONES.dragonLair.center.z);
  worldGroup.add(dragonLight);

  // Obsidian Spires
  const obsidianMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.4, metalness: 0.3 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (a > 1.1 && a < 2.1) continue; // South entrance
    const h = 7 + (i % 3) * 4;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, h, 7), obsidianMat);
    spire.position.set(
      ZONES.dragonLair.center.x + Math.cos(a) * (ZONES.dragonLair.radius - 1.5),
      h / 2,
      ZONES.dragonLair.center.z + Math.sin(a) * (ZONES.dragonLair.radius - 1.5)
    );
    spire.castShadow = true;
    worldGroup.add(spire);
  }

  // Scattered Fantasy Pine Trees outside zones
  const pineTrunkMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
  const pineLeafMat = new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.8 });
  const treeCoords = [
    [26, -24], [-28, -26], [32, -8], [-32, -10], [22, 36], [-24, 38],
    [0, 40], [12, 46], [-14, 48], [62, -16], [-64, -18], [52, -46], [-52, -48]
  ];
  treeCoords.forEach(([tx, tz]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 2.2, 8), pineTrunkMat);
    t.position.set(tx, 1.1, tz);
    worldGroup.add(t);
    const l1 = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.6, 8), pineLeafMat);
    l1.position.set(tx, 4.1, tz);
    l1.castShadow = true;
    worldGroup.add(l1);
  });

  let worldTime = 0;
  function update(dt) {
    worldTime += dt;
    elfMerchant.animate(dt, false, 0, 0, false);
    flameMesh.scale.y = 0.85 + Math.sin(worldTime * 11) * 0.2;
    fireLight.intensity = 2.1 + Math.sin(worldTime * 13) * 0.4;
    treeLight.intensity = 2.0 + Math.sin(worldTime * 2.5) * 0.35;
  }

  return { merchantPos, update };
}
