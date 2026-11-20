/**
 * 3D Visual Effects (VFX) Manager
 * Lightning, Fire, Water, Earth elemental skills + sword slash + boss telegraph rings.
 */
import * as THREE from 'three';

export function createVfxManager(scene) {
  const activeEffects = [];

  function addEffect(mesh, duration, updater) {
    scene.add(mesh);
    activeEffects.push({ mesh, elapsed: 0, duration, updater });
  }

  /** Normal melee slash arc */
  function spawnSlash(pos, yaw, color = '#a5b4fc') {
    const geo = new THREE.RingGeometry(1.1, 2.35, 18, 1, -Math.PI * 0.35, Math.PI * 0.7);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y + 1.25, pos.z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = yaw - Math.PI / 2;

    addEffect(mesh, 0.22, (t) => {
      mesh.scale.setScalar(1 + t * 0.35);
      mat.opacity = 0.85 * (1 - t);
    });
  }

  /** ⚡ Lightning Bolt from sky + chain arcs */
  function spawnLightning(targetPos, chainPositions = []) {
    const group = new THREE.Group();

    function makeBolt(p1, p2, thickness = 0.14) {
      const pts = [];
      const segs = 7;
      for (let i = 0; i <= segs; i++) {
        const f = i / segs;
        const jitter = (i === 0 || i === segs) ? 0 : 0.55;
        pts.push(new THREE.Vector3(
          THREE.MathUtils.lerp(p1.x, p2.x, f) + (Math.random() - 0.5) * jitter,
          THREE.MathUtils.lerp(p1.y, p2.y, f) + (Math.random() - 0.5) * jitter * 0.5,
          THREE.MathUtils.lerp(p1.z, p2.z, f) + (Math.random() - 0.5) * jitter
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 12, thickness, 6, false);
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.95 }));
    }

    const skyPos = new THREE.Vector3(targetPos.x, targetPos.y + 16, targetPos.z);
    group.add(makeBolt(skyPos, new THREE.Vector3(targetPos.x, targetPos.y + 0.4, targetPos.z), 0.18));

    // Ground electric ring
    const ringMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 2.2, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(targetPos.x, 0.14, targetPos.z);
    group.add(ring);

    // Chain arcs to secondary targets
    let prev = new THREE.Vector3(targetPos.x, targetPos.y + 1.2, targetPos.z);
    chainPositions.forEach((cp) => {
      const next = new THREE.Vector3(cp.x, cp.y + 1.2, cp.z);
      group.add(makeBolt(prev, next, 0.1));
      prev = next;
    });

    const flash = new THREE.PointLight('#38bdf8', 5, 18);
    flash.position.set(targetPos.x, targetPos.y + 2.5, targetPos.z);
    group.add(flash);

    addEffect(group, 0.45, (t) => {
      ring.scale.setScalar(1 + t * 1.4);
      flash.intensity = 5 * (1 - t);
      group.traverse((child) => {
        if (child.material && child.material.transparent) {
          child.material.opacity = Math.max(0, 1 - t);
        }
      });
    });
  }

  /** 🔥 Fireball projectile + AoE explosion */
  function spawnFireball(startPos, dir, maxDist, checkHitFn, onExplodeFn) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#fef08a' })
    );
    const outer = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.72 })
    );
    const light = new THREE.PointLight('#f97316', 3.5, 14);
    group.add(core, outer, light);
    group.position.set(startPos.x, startPos.y + 1.35, startPos.z);

    const speed = 26;
    const duration = maxDist / speed;
    let exploded = false;

    const entry = {
      mesh: group,
      elapsed: 0,
      duration,
      updater: (t, dt) => {
        if (exploded) return;
        group.position.addScaledVector(dir, speed * dt);
        outer.scale.setScalar(1 + Math.sin(t * 40) * 0.15);
        if (checkHitFn(group.position) || t >= 0.98) {
          exploded = true;
          entry.elapsed = entry.duration; // end projectile
          spawnFireExplosion(group.position.clone());
          onExplodeFn(group.position.clone());
        }
      }
    };
    scene.add(group);
    activeEffects.push(entry);
  }

  function spawnFireExplosion(pos) {
    const group = new THREE.Group();
    const sphereMat = new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.78 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), sphereMat);
    sphere.position.set(pos.x, 1.0, pos.z);
    group.add(sphere);

    const ringMat = new THREE.MeshBasicMaterial({ color: '#ef4444', side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.5, 28), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.16, pos.z);
    group.add(ring);

    addEffect(group, 0.55, (t) => {
      sphere.scale.setScalar(1 + t * 4.2);
      ring.scale.setScalar(1 + t * 4.5);
      sphereMat.opacity = 0.78 * (1 - t);
      ringMat.opacity = 0.9 * (1 - t);
    });
  }

  /** 💧 Water Tidal Wave (heal allies + knockback enemies) */
  function spawnWaterWave(centerPos, radius = 7.5) {
    const group = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.2, 36), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(centerPos.x, 0.18, centerPos.z);
    group.add(ring);

    const droplets = [];
    const dropMat = new THREE.MeshBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.9 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 0.8 + Math.random() * 1.4;
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), dropMat);
      drop.position.set(centerPos.x + Math.cos(a) * r, 0.5, centerPos.z + Math.sin(a) * r);
      group.add(drop);
      droplets.push(drop);
    }

    addEffect(group, 0.65, (t) => {
      ring.scale.setScalar(1 + t * (radius / 1.15));
      ringMat.opacity = 0.85 * (1 - t);
      dropMat.opacity = 0.9 * (1 - t);
      droplets.forEach((d, idx) => {
        d.position.y = 0.4 + t * (2.6 + (idx % 3) * 0.5);
      });
    });
  }

  /** 🪨 Earth Spikes erupting in a line ahead */
  function spawnEarthSpikes(startPos, dir, range = 11) {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#a8a29e',
      emissive: '#d97706',
      emissiveIntensity: 0.35,
      roughness: 0.85,
      transparent: true,
      opacity: 1
    });

    const spikes = [];
    const count = 6;
    for (let i = 1; i <= count; i++) {
      const dist = (i / count) * range;
      const h = 1.4 + (i / count) * 1.6;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.55, h, 6), rockMat);
      spike.position.set(
        startPos.x + dir.x * dist + (Math.random() - 0.5) * 0.45,
        -h / 2,
        startPos.z + dir.z * dist + (Math.random() - 0.5) * 0.45
      );
      spike.userData = { targetY: h * 0.45, delay: (i - 1) * 0.06 };
      group.add(spike);
      spikes.push(spike);
    }

    addEffect(group, 0.95, (t) => {
      spikes.forEach((s) => {
        const localT = Math.max(0, Math.min(1, (t - s.userData.delay) * 3.5));
        s.position.y = THREE.MathUtils.lerp(-1.2, s.userData.targetY, Math.sin(localT * Math.PI * 0.5));
      });
      if (t > 0.7) {
        rockMat.opacity = Math.max(0, 1 - (t - 0.7) / 0.3);
      }
    });
  }

  /** Gnome parabolic bomb throw */
  function spawnBombProjectile(startPos, targetPos, onExplode) {
    const bomb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#1f2937', emissive: '#ef4444', emissiveIntensity: 0.7 })
    );
    bomb.position.copy(startPos);
    const p0 = startPos.clone();
    const p1 = targetPos.clone();
    let done = false;

    addEffect(bomb, 0.75, (t) => {
      bomb.position.x = THREE.MathUtils.lerp(p0.x, p1.x, t);
      bomb.position.z = THREE.MathUtils.lerp(p0.z, p1.z, t);
      bomb.position.y = 1.0 + Math.sin(t * Math.PI) * 3.8;
      if (t >= 0.98 && !done) {
        done = true;
        spawnFireExplosion(p1);
        onExplode(p1);
      }
    });
  }

  /** Dragon Boss red ground telegraph circle -> Flame burst */
  function spawnDragonBreathWarning(centerPos, radius, duration, onDetonate) {
    const group = new THREE.Group();
    const outerMat = new THREE.MeshBasicMaterial({
      color: '#ef4444',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const outer = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), outerMat);
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(centerPos.x, 0.14, centerPos.z);
    group.add(outer);

    const fillMat = new THREE.MeshBasicMaterial({
      color: '#f97316',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.48
    });
    const fill = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), fillMat);
    fill.rotation.x = -Math.PI / 2;
    fill.position.set(centerPos.x, 0.16, centerPos.z);
    fill.scale.setScalar(0.05);
    group.add(fill);

    let triggered = false;
    addEffect(group, duration, (t) => {
      fill.scale.setScalar(Math.max(0.05, t));
      if (t >= 0.98 && !triggered) {
        triggered = true;
        spawnFireExplosion(centerPos);
        onDetonate(centerPos);
      }
    });
  }

  /** 🗣️ Elder Scrolls Dragon Shout (Fus Ro Dah Sonic Rings) */
  function spawnDragonShout(startPos, dir, range = 14) {
    const group = new THREE.Group();
    const rings = [];
    const yaw = Math.atan2(dir.x, dir.z);

    for (let i = 0; i < 3; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? '#fde047' : '#38bdf8',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const rMesh = new THREE.Mesh(new THREE.RingGeometry(0.5 + i * 0.25, 0.9 + i * 0.3, 28), rMat);
      rMesh.rotation.y = yaw;
      rMesh.userData = { offset: i * 0.14, mat: rMat };
      group.add(rMesh);
      rings.push(rMesh);
    }

    addEffect(group, 0.55, (t) => {
      rings.forEach((r) => {
        const lt = Math.max(0, Math.min(1, (t - r.userData.offset) * 1.35));
        const dist = lt * range;
        r.position.set(
          startPos.x + dir.x * dist,
          startPos.y + 1.35,
          startPos.z + dir.z * dist
        );
        r.scale.setScalar(0.6 + lt * 2.6);
        r.userData.mat.opacity = 0.9 * (1 - lt);
      });
    });
  }

  /** ❄️ Roguelike Frost Nova */
  function spawnFrostNova(centerPos, radius = 7.5) {
    const group = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#bae6fd',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.3, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(centerPos.x, 0.2, centerPos.z);
    group.add(ring);

    addEffect(group, 0.55, (t) => {
      ring.scale.setScalar(1 + t * (radius / 1.2));
      ringMat.opacity = 0.85 * (1 - t);
    });
  }

  /** ☣️ Zombie Plague Infection Poison Burst */
  function spawnPoisonCloud(pos) {
    const mat = new THREE.MeshBasicMaterial({ color: '#84cc16', transparent: true, opacity: 0.65 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), mat);
    sphere.position.set(pos.x, 1.15, pos.z);
    addEffect(sphere, 0.65, (t) => {
      sphere.scale.setScalar(1 + t * 1.8);
      mat.opacity = 0.65 * (1 - t);
    });
  }

  function update(dt) {
    for (let i = activeEffects.length - 1; i >= 0; i--) {
      const fx = activeEffects[i];
      fx.elapsed += dt;
      const t = Math.min(1, fx.elapsed / fx.duration);
      if (fx.updater) fx.updater(t, dt);
      if (fx.elapsed >= fx.duration) {
        scene.remove(fx.mesh);
        fx.mesh.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        activeEffects.splice(i, 1);
      }
    }
  }

  return {
    spawnSlash,
    spawnLightning,
    spawnFireball,
    spawnWaterWave,
    spawnEarthSpikes,
    spawnBombProjectile,
    spawnDragonBreathWarning,
    spawnDragonShout,
    spawnFrostNova,
    spawnPoisonCloud,
    update
  };
}
