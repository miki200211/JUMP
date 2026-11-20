/**
 * 3D Fantasy World Builder (Elder Scrolls & Roguelike Edition)
 * - Central Elf Village (Safe Zone)
 * - Greenskin Warfront (Goblins, Orcs, Ogres, Trolls)
 * - Zombie Plague Cavern (3D Cave Dome + Stalactites + Toxic Pools + Ancient Treasure Chest!)
 * - Gnome & Vampire Blood Forest (Glowing Mushrooms + Blood Moon Altar)
 * - Dragon Volcano Lair (Obsidian Spires + Elder Scrolls Word Wall)
 */
import * as THREE from 'three';
import { ZONES } from './data.js?v=4.3.0';
import {
  createElfMerchantModel,
  createBlacksmithNpcModel,
  createAlchemistNpcModel,
  createGuideNpcModel,
  createTreasureChestModel
} from './models.js?v=4.3.0';

function createPainterlyGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#183326';
  ctx.fillRect(0, 0, 512, 512);
  // Subtle painterly grass tufts & mossy patches
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 2 + Math.random() * 7;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(46, 125, 86, 0.22)' : i % 3 === 1 ? 'rgba(18, 42, 30, 0.28)' : 'rgba(101, 163, 13, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  return tex;
}

export function buildWorld(scene) {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // --- Elevated Atmospheric Lighting, Twilight Fog & Starry Twin-Moon Sky ---
  scene.background = new THREE.Color('#090d1f');
  scene.fog = new THREE.FogExp2('#0b1026', 0.0036);

  const hemiLight = new THREE.HemisphereLight('#c7d2fe', '#1e293b', 0.95);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight('#fef3c7', 1.45);
  dirLight.position.set(55, 95, 42);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 320;
  const d = 160;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // Rim moon-blue fill light for richer 3D silhouettes
  const rimLight = new THREE.DirectionalLight('#60a5fa', 0.45);
  rimLight.position.set(-70, 50, -65);
  scene.add(rimLight);

  // Starfield Sky Dome + Twin Fantasy Moons
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 650; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.44;
    const r = 245;
    starVerts.push(r * Math.sin(phi) * Math.cos(theta), 16 + r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  const starPoints = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: '#e0e7ff', size: 1.45, transparent: true, opacity: 0.85, fog: false })
  );
  worldGroup.add(starPoints);

  const moon1 = new THREE.Mesh(
    new THREE.SphereGeometry(12, 20, 16),
    new THREE.MeshBasicMaterial({ color: '#fef9c3', fog: false })
  );
  moon1.position.set(-110, 125, -165);
  worldGroup.add(moon1);

  const moon2 = new THREE.Mesh(
    new THREE.SphereGeometry(6.5, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#c084fc', fog: false })
  );
  moon2.position.set(-82, 112, -172);
  worldGroup.add(moon2);

  // Floating Ambient Magic Fireflies / Sakura / Snow Sparks
  const motesGeo = new THREE.BufferGeometry();
  const motesVerts = [];
  for (let i = 0; i < 300; i++) {
    motesVerts.push((Math.random() - 0.5) * 320, 1.2 + Math.random() * 14, (Math.random() - 0.5) * 320);
  }
  motesGeo.setAttribute('position', new THREE.Float32BufferAttribute(motesVerts, 3));
  const magicMotes = new THREE.Points(
    motesGeo,
    new THREE.PointsMaterial({ color: '#fde047', size: 0.55, transparent: true, opacity: 0.72 })
  );
  worldGroup.add(magicMotes);

  // --- Main Expanded Ground (Painterly Textured ±245m Continent) ---
  const groundTex = createPainterlyGroundTexture();
  const groundGeo = new THREE.CircleGeometry(245, 72);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.88,
    metalness: 0.04
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const ringMat = new THREE.MeshBasicMaterial({
    color: '#34d399',
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
  });

  // --- 1. Elf Village (Safe Zone at 0, 0) ---
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(ZONES.village.radius - 1, ZONES.village.radius, 0.14, 48),
    new THREE.MeshStandardMaterial({ color: '#2b334e', roughness: 0.82 })
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
    emissiveIntensity: 0.38,
    roughness: 0.55
  });
  [[0, 8.6, -8, 4.2], [-2.5, 7.2, -7.2, 2.8], [2.6, 7.4, -7.5, 2.7], [0, 7.4, -5.2, 2.5]].forEach(([x, y, z, r]) => {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), foliageMat);
    crown.position.set(x, y, z);
    crown.castShadow = true;
    worldGroup.add(crown);
  });

  const treeLight = new THREE.PointLight('#34d399', 2.4, 34);
  treeLight.position.set(0, 8, -7);
  worldGroup.add(treeLight);

  function addElfHouse(x, z, rotY) {
    const house = new THREE.Group();
    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.5, 3.8, 10),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.72 })
    );
    walls.position.y = 1.9;
    walls.castShadow = true;
    house.add(walls);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 3.4, 10),
      new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.62 })
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
  addElfHouse(-16, -11, 0.6);
  addElfHouse(16, -12, -0.7);
  addElfHouse(-16, 12, 2.3);

  // --- 4 Interactive Village NPCs! ---
  // NPC 1: Elf Equipment Merchant
  const merchantPos = new THREE.Vector3(-8.5, 0, 3.5);
  const elfMerchant = createElfMerchantModel();
  elfMerchant.group.position.copy(merchantPos);
  elfMerchant.group.rotation.y = 0.65;
  worldGroup.add(elfMerchant.group);

  // NPC 2: Legendary Dwarf Blacksmith (Monster Hunter × Baldur's Gate Forge!)
  const blacksmithPos = new THREE.Vector3(9.0, 0, 4.5);
  const blacksmithNpc = createBlacksmithNpcModel();
  blacksmithNpc.group.position.copy(blacksmithPos);
  blacksmithNpc.group.rotation.y = -0.8;
  worldGroup.add(blacksmithNpc.group);

  // Blacksmith Iron Anvil & Blazing Forge Furnace
  const anvil = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.9, 0.7),
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.35, metalness: 0.85 })
  );
  anvil.position.set(blacksmithPos.x + 1.8, 0.45, blacksmithPos.z - 0.5);
  worldGroup.add(anvil);

  const forgeFurnace = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.4, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: '#44403c', roughness: 0.9 })
  );
  forgeFurnace.position.set(blacksmithPos.x + 2.2, 1.1, blacksmithPos.z - 2.3);
  worldGroup.add(forgeFurnace);

  const forgeGlow = new THREE.PointLight('#f97316', 2.4, 18);
  forgeGlow.position.set(blacksmithPos.x + 1.6, 1.9, blacksmithPos.z - 1.5);
  worldGroup.add(forgeGlow);

  // NPC 3: Baldur's Gate Arcane Sage & Alchemist
  const alchemistPos = new THREE.Vector3(7.5, 0, -6.5);
  const alchemistNpc = createAlchemistNpcModel();
  alchemistNpc.group.position.copy(alchemistPos);
  alchemistNpc.group.rotation.y = -2.2;
  worldGroup.add(alchemistNpc.group);

  const alchemyCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.65, 0),
    new THREE.MeshStandardMaterial({ color: '#c084fc', emissive: '#a855f7', emissiveIntensity: 1.4 })
  );
  alchemyCrystal.position.set(alchemistPos.x + 1.5, 2.1, alchemistPos.z);
  worldGroup.add(alchemyCrystal);

  // NPC 4: World Codex & Bestiary Guide
  const guidePos = new THREE.Vector3(-8.5, 0, -6.5);
  const guideNpc = createGuideNpcModel();
  guideNpc.group.position.copy(guidePos);
  guideNpc.group.rotation.y = 2.1;
  worldGroup.add(guideNpc.group);

  const npcs = [
    { id: 'merchant', label: '🧝 按 G 開啟【精靈裝備商店】（金幣裝備 / 藥水）', pos: merchantPos },
    { id: 'blacksmith', label: '⚒️ 按 G 開啟【矮人神兵鍛造工坊】（狩獵素材鍛造頂級武器防具）', pos: blacksmithPos },
    { id: 'alchemist', label: '🧙 按 G 開啟【柏德之門秘法鍊金舖】（至高秘藥 / 肉鴿卷軸 / 秘銀）', pos: alchemistPos },
    { id: 'guide', label: '📖 按 G 開啟【世界圖鑑與狩獵素材掉落指南】', pos: guidePos }
  ];

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

  // --- 5. Ancient Greek Temple Ruins & Cretan Labyrinth (North-West: -54, -50) ---
  const greekCenter = ZONES.greekPantheon.center;
  const greekRadius = ZONES.greekPantheon.radius;

  const marbleFloor = new THREE.Mesh(
    new THREE.CircleGeometry(greekRadius, 40),
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.72 })
  );
  marbleFloor.rotation.x = -Math.PI / 2;
  marbleFloor.position.set(greekCenter.x, 0.05, greekCenter.z);
  marbleFloor.receiveShadow = true;
  worldGroup.add(marbleFloor);

  const goldMosaicRing = new THREE.Mesh(
    new THREE.RingGeometry(11.5, 13.2, 36),
    new THREE.MeshBasicMaterial({ color: '#f59e0b', side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
  );
  goldMosaicRing.rotation.x = -Math.PI / 2;
  goldMosaicRing.position.set(greekCenter.x, 0.08, greekCenter.z);
  worldGroup.add(goldMosaicRing);

  const marbleColMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.5, metalness: 0.1 });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    emissive: '#d97706',
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.8
  });

  // 10 Parthenon Marble Columns & Broken Lintels
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const cx = greekCenter.x + Math.cos(a) * 20;
    const cz = greekCenter.z + Math.sin(a) * 20;
    const colH = i % 3 === 0 ? 4.8 : 7.2;

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 2.1), marbleColMat);
    base.position.set(cx, 0.28, cz);
    worldGroup.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, colH, 14), marbleColMat);
    pillar.position.set(cx, 0.55 + colH / 2, cz);
    pillar.castShadow = true;
    worldGroup.add(pillar);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.45, 1.95), goldTrimMat);
    capital.position.set(cx, 0.55 + colH + 0.22, cz);
    worldGroup.add(capital);
  }

  // Cretan Labyrinth Stone Walls
  const labWallMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 });
  [
    [greekCenter.x - 9, greekCenter.z + 7, 7.5, 2.6, 1.2],
    [greekCenter.x + 9, greekCenter.z - 7, 7.5, 2.6, 1.2],
    [greekCenter.x - 8, greekCenter.z - 8, 1.2, 2.6, 7.5],
    [greekCenter.x + 8, greekCenter.z + 8, 1.2, 2.6, 7.5]
  ].forEach(([wx, wz, w, h, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), labWallMat);
    wall.position.set(wx, h / 2, wz);
    wall.castShadow = true;
    worldGroup.add(wall);
  });

  // Central Olympus Golden Altar
  const olympusAltar = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 1.1, 12), marbleColMat);
  olympusAltar.position.set(greekCenter.x, 0.55, greekCenter.z);
  worldGroup.add(olympusAltar);

  const olympusLight = new THREE.PointLight('#fbbf24', 2.8, 38);
  olympusLight.position.set(greekCenter.x, 7, greekCenter.z);
  worldGroup.add(olympusLight);

  // --- 6. Dragon Volcano Lair & Elder Scrolls Word Wall (North: 0, -72) ---
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

  // --- 7. 🌊 Ocean Abyss & Atlantis Bay (South: 0, 92) ---
  const oceanCenter = ZONES.oceanAbyss.center;
  const oceanRadius = ZONES.oceanAbyss.radius;
  const oceanWater = new THREE.Mesh(
    new THREE.CircleGeometry(oceanRadius, 48),
    new THREE.MeshStandardMaterial({
      color: '#0284c7',
      emissive: '#0369a1',
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.55,
      transparent: true,
      opacity: 0.88
    })
  );
  oceanWater.rotation.x = -Math.PI / 2;
  oceanWater.position.set(oceanCenter.x, 0.08, oceanCenter.z);
  worldGroup.add(oceanWater);

  // Sunken Atlantis Archway & Glowing Coral Reefs
  const atlantisMat = new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.4, metalness: 0.2 });
  [-6.5, 6.5].forEach((ox) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 9.5, 12), atlantisMat);
    col.position.set(oceanCenter.x + ox, 4.75, oceanCenter.z + 18);
    worldGroup.add(col);
  });
  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(15.5, 1.4, 2.2), atlantisMat);
  archBeam.position.set(oceanCenter.x, 10.0, oceanCenter.z + 18);
  worldGroup.add(archBeam);

  const coralColors = ['#f43f5e', '#fb923c', '#22d3ee', '#c084fc'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const coral = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.8 + (i % 3) * 1.2, 6),
      new THREE.MeshStandardMaterial({
        color: coralColors[i % coralColors.length],
        emissive: coralColors[i % coralColors.length],
        emissiveIntensity: 0.4
      })
    );
    coral.position.set(oceanCenter.x + Math.cos(a) * 26, 1.4, oceanCenter.z + Math.sin(a) * 26);
    worldGroup.add(coral);
  }
  const oceanLight = new THREE.PointLight('#38bdf8', 3.0, 52);
  oceanLight.position.set(oceanCenter.x, 9, oceanCenter.z);
  worldGroup.add(oceanLight);

  // --- 8. 🏔️ Alpine Frost Peaks & Glacier (North-East: 108, -102) ---
  const frostCenter = ZONES.frostPeaks.center;
  const frostRadius = ZONES.frostPeaks.radius;
  const snowFloor = new THREE.Mesh(
    new THREE.CircleGeometry(frostRadius, 44),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.62, metalness: 0.12 })
  );
  snowFloor.rotation.x = -Math.PI / 2;
  snowFloor.position.set(frostCenter.x, 0.06, frostCenter.z);
  snowFloor.receiveShadow = true;
  worldGroup.add(snowFloor);

  // Towering Snow-Capped Alpine Mountain Peaks & Giant Ice Crystals
  const rockPeakMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 });
  const snowCapMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.75,
    roughness: 0.15,
    metalness: 0.35
  });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    if (a > 1.8 && a < 3.0) continue; // Entrance valley
    const h = 15 + (i % 3) * 7;
    const r = 6.5 + (i % 2) * 3;
    const mx = frostCenter.x + Math.cos(a) * 31;
    const mz = frostCenter.z + Math.sin(a) * 31;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockPeakMat);
    peak.position.set(mx, h / 2, mz);
    peak.castShadow = true;
    worldGroup.add(peak);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.45, h * 0.42, 7), snowCapMat);
    cap.position.set(mx, h * 0.8, mz);
    worldGroup.add(cap);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), crystalMat);
    shard.scale.set(0.65, 2.6, 0.65);
    shard.position.set(frostCenter.x + Math.cos(a) * 16, 2.8, frostCenter.z + Math.sin(a) * 16);
    worldGroup.add(shard);
  }
  const frostLight = new THREE.PointLight('#7dd3fc', 3.0, 55);
  frostLight.position.set(frostCenter.x, 12, frostCenter.z);
  worldGroup.add(frostLight);

  // --- 9. 🐙 Cthulhu R'lyeh Eldritch Abyss (South-West: -106, 92) ---
  const rlyehCenter = ZONES.cthulhuRlyeh.center;
  const rlyehRadius = ZONES.cthulhuRlyeh.radius;
  const rlyehFloor = new THREE.Mesh(
    new THREE.CircleGeometry(rlyehRadius, 44),
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85 })
  );
  rlyehFloor.rotation.x = -Math.PI / 2;
  rlyehFloor.position.set(rlyehCenter.x, 0.06, rlyehCenter.z);
  worldGroup.add(rlyehFloor);

  const eldritchRing = new THREE.Mesh(
    new THREE.RingGeometry(13, 15.5, 36),
    new THREE.MeshBasicMaterial({ color: '#22c55e', side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
  );
  eldritchRing.rotation.x = -Math.PI / 2;
  eldritchRing.position.set(rlyehCenter.x, 0.1, rlyehCenter.z);
  worldGroup.add(eldritchRing);

  // Non-Euclidean Tilted Obsidian Monoliths & Rising Abyssal Tentacles
  const monoMat = new THREE.MeshStandardMaterial({ color: '#064e3b', roughness: 0.45, metalness: 0.35 });
  const tentacleMat = new THREE.MeshStandardMaterial({ color: '#3b0764', emissive: '#581c87', emissiveIntensity: 0.45 });
  const rlyehTentacles = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const mono = new THREE.Mesh(new THREE.BoxGeometry(2.4, 12 + (i % 3) * 4, 2.4), monoMat);
    mono.position.set(rlyehCenter.x + Math.cos(a) * 26, 5.5, rlyehCenter.z + Math.sin(a) * 26);
    mono.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.24;
    mono.rotation.x = 0.14;
    worldGroup.add(mono);

    const tent = new THREE.Mesh(new THREE.ConeGeometry(0.95, 8.5, 8), tentacleMat);
    tent.position.set(rlyehCenter.x + Math.cos(a + 0.4) * 18, 4.0, rlyehCenter.z + Math.sin(a + 0.4) * 18);
    tent.rotation.z = Math.cos(a) * 0.35;
    worldGroup.add(tent);
    rlyehTentacles.push({ tent, phase: i * 0.9 });
  }
  const rlyehLight = new THREE.PointLight('#22c55e', 3.4, 58);
  rlyehLight.position.set(rlyehCenter.x, 10, rlyehCenter.z);
  worldGroup.add(rlyehLight);

  // --- 10. ⛩️ Japanese Yokai Shrine & Sakura Grove (East: 118, 16) ---
  const yokaiCenter = ZONES.yokaiShrine.center;
  const yokaiRadius = ZONES.yokaiShrine.radius;
  const shrineFloor = new THREE.Mesh(
    new THREE.CircleGeometry(yokaiRadius, 40),
    new THREE.MeshStandardMaterial({ color: '#2e1025', roughness: 0.88 })
  );
  shrineFloor.rotation.x = -Math.PI / 2;
  shrineFloor.position.set(yokaiCenter.x, 0.06, yokaiCenter.z);
  worldGroup.add(shrineFloor);

  // Iconic Vermilion Shinto Torii Gates!
  const toriiRed = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45 });
  const toriiDark = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.5 });
  function addToriiGate(gx, gz, rotY = 0) {
    const tg = new THREE.Group();
    [-3.2, 3.2].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 8.5, 10), toriiRed);
      post.position.set(px, 4.25, 0);
      tg.add(post);
    });
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.85, 0.95), toriiDark);
    kasagi.position.y = 8.4;
    tg.add(kasagi);
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.55, 0.65), toriiRed);
    nuki.position.y = 6.9;
    tg.add(nuki);
    tg.position.set(gx, 0, gz);
    tg.rotation.y = rotY;
    worldGroup.add(tg);
  }
  addToriiGate(yokaiCenter.x - 24, yokaiCenter.z, Math.PI / 2);
  addToriiGate(yokaiCenter.x - 14, yokaiCenter.z, Math.PI / 2);

  // Blooming Pink Sakura Trees & Glowing Paper Lanterns
  const sakuraMat = new THREE.MeshStandardMaterial({
    color: '#f472b6',
    emissive: '#db2777',
    emissiveIntensity: 0.35,
    roughness: 0.6
  });
  const lanternMat = new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#f59e0b', emissiveIntensity: 1.5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tx = yokaiCenter.x + Math.cos(a) * 24;
    const tz = yokaiCenter.z + Math.sin(a) * 24;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 5.2, 8), new THREE.MeshStandardMaterial({ color: '#451a03' }));
    trunk.position.set(tx, 2.6, tz);
    worldGroup.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(3.2, 14, 10), sakuraMat);
    crown.position.set(tx, 6.0, tz);
    worldGroup.add(crown);

    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 8), lanternMat);
    lantern.position.set(yokaiCenter.x + Math.cos(a) * 12, 2.2, yokaiCenter.z + Math.sin(a) * 12);
    worldGroup.add(lantern);
  }
  const yokaiLight = new THREE.PointLight('#f472b6', 3.0, 52);
  yokaiLight.position.set(yokaiCenter.x, 9, yokaiCenter.z);
  worldGroup.add(yokaiLight);

  // --- 11. 🗿 Mayan Golden Pyramid of Kukulkan (South-East: 106, 102) ---
  const mayanCenter = ZONES.mayanTemple.center;
  const mayanRadius = ZONES.mayanTemple.radius;
  const mayanFloor = new THREE.Mesh(
    new THREE.CircleGeometry(mayanRadius, 44),
    new THREE.MeshStandardMaterial({ color: '#423620', roughness: 0.9 })
  );
  mayanFloor.rotation.x = -Math.PI / 2;
  mayanFloor.position.set(mayanCenter.x, 0.06, mayanCenter.z);
  worldGroup.add(mayanFloor);

  // Multi-Tiered Stepped Mayan Sandstone & Jade Pyramid (Chichen Itza landmark)
  const sandMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.82 });
  const jadeTrim = new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#059669', emissiveIntensity: 0.55 });
  const pyrX = mayanCenter.x + 12;
  const pyrZ = mayanCenter.z + 12;
  for (let tier = 0; tier < 5; tier++) {
    const size = 18 - tier * 3.1;
    const step = new THREE.Mesh(new THREE.BoxGeometry(size, 2.2, size), tier % 2 === 0 ? sandMat : jadeTrim);
    step.position.set(pyrX, 1.1 + tier * 2.2, pyrZ);
    step.castShadow = true;
    worldGroup.add(step);
  }
  // Golden Sun Altar atop the Pyramid
  const sunDisc = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.35, 10, 24),
    new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 1.3 })
  );
  sunDisc.position.set(pyrX, 13.8, pyrZ);
  worldGroup.add(sunDisc);

  const mayanLight = new THREE.PointLight('#fbbf24', 3.4, 56);
  mayanLight.position.set(mayanCenter.x, 12, mayanCenter.z);
  worldGroup.add(mayanLight);

  let worldTime = 0;
  function update(dt, chestCooldown = 0) {
    worldTime += dt;
    elfMerchant.animate(dt, false, 0, 0, false);
    blacksmithNpc.animate(dt, false, 0, 0, false);
    alchemistNpc.animate(dt, false, 0, 0, false);
    guideNpc.animate(dt, false, 0, 0, false);
    treasureChest.animate(dt, chestCooldown > 0, chestCooldown);

    bloodCrystal.rotation.y += dt * 1.4;
    bloodCrystal.position.y = 2.8 + Math.sin(worldTime * 2.5) * 0.25;
    alchemyCrystal.rotation.y -= dt * 1.8;
    alchemyCrystal.position.y = 2.1 + Math.sin(worldTime * 3.0) * 0.18;
    sunDisc.rotation.y += dt * 0.9;
    oceanWater.position.y = 0.08 + Math.sin(worldTime * 2.2) * 0.06;
    eldritchRing.rotation.z += dt * 0.45;
    magicMotes.rotation.y += dt * 0.025;
    magicMotes.position.y = Math.sin(worldTime * 1.1) * 0.55;
    rlyehTentacles.forEach((o) => {
      o.tent.rotation.x = Math.sin(worldTime * 1.8 + o.phase) * 0.25;
    });

    flameMesh.scale.y = 0.85 + Math.sin(worldTime * 11) * 0.2;
    fireLight.intensity = 2.2 + Math.sin(worldTime * 13) * 0.4;
    forgeGlow.intensity = 2.2 + Math.sin(worldTime * 15) * 0.5;
    treeLight.intensity = 2.2 + Math.sin(worldTime * 2.5) * 0.35;
  }

  return { npcs, merchantPos, chestPos, update };
}
