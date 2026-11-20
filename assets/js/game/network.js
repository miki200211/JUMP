/**
 * JUMP 3D RPG — Real-Time Multiplayer Network Engine (Firebase Realtime Database)
 * Handles:
 * - Player position / rotation / animation / appearance / HP sync (~13Hz + Lerp)
 * - Automatic ghost cleanup via onDisconnect().remove()
 * - Party system (Create / Invite / Accept / Join by code / Friendly-Fire protection)
 * - PvP damage & Water-skill ally heal event delivery
 * - Elemental VFX broadcast (Lightning / Fire / Water / Earth)
 * - Monster co-op sync via automatic Host Election (lowest online UID runs mob AI)
 */

export function createMultiplayerNetwork(callbacks) {
  const uid = 'p_' + (localStorage.getItem('chat_fingerprint') || (Date.now() + '_' + Math.random().toString(36).slice(2, 8)))
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  let connected = false;
  let db = null;
  let fb = null; // firebase-database module exports
  let myPlayerRef = null;
  let isHost = true; // Single-player default is host; updated dynamically when connected

  const remotePlayers = new Map(); // uid -> raw state from Firebase
  let lastPushTs = 0;
  let lastMobPushTs = 0;

  function isConfigured() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.FIREBASE_CONFIG) || null;
    return !!(cfg && cfg.databaseURL && !cfg.databaseURL.includes('YOUR_'));
  }

  async function connect(initialPlayerData) {
    if (!isConfigured()) {
      connected = false;
      isHost = true;
      if (callbacks.onStatusChange) callbacks.onStatusChange(false, '單機模式（尚未設定 Firebase）');
      return false;
    }

    try {
      const [appMod, dbMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js')
      ]);

      fb = dbMod;
      const app = appMod.getApps().length
        ? appMod.getApps()[0]
        : appMod.initializeApp(CONFIG.FIREBASE_CONFIG);
      db = fb.getDatabase(app);

      myPlayerRef = fb.ref(db, `world/players/${uid}`);
      const myHitsRef = fb.ref(db, `world/hits/${uid}`);
      const myInvitesRef = fb.ref(db, `world/invites/${uid}`);

      // Automatically clean up player & inbox when tab closes or disconnects
      fb.onDisconnect(myPlayerRef).remove();
      fb.onDisconnect(myHitsRef).remove();
      fb.onDisconnect(myInvitesRef).remove();

      await fb.set(myPlayerRef, { ...initialPlayerData, uid, updatedAt: Date.now() });
      connected = true;

      // 1. Watch all online players & elect Mob AI Host
      const playersRef = fb.ref(db, 'world/players');
      fb.onValue(playersRef, (snap) => {
        const val = snap.val() || {};
        const now = Date.now();
        const activeUids = [];

        remotePlayers.clear();
        for (const [pUid, pData] of Object.entries(val)) {
          if (!pData || (now - (pData.updatedAt || 0) > 25000)) continue;
          activeUids.push(pUid);
          if (pUid !== uid) {
            remotePlayers.set(pUid, pData);
          }
        }

        activeUids.sort();
        isHost = activeUids.length === 0 || activeUids[0] === uid;

        if (callbacks.onPlayersUpdate) {
          callbacks.onPlayersUpdate(remotePlayers, isHost);
        }
      });

      // 2. Watch incoming PvP hits & ally heals
      fb.onChildAdded(myHitsRef, (snap) => {
        const hit = snap.val();
        fb.remove(snap.ref).catch(() => {});
        if (!hit || Date.now() - (hit.ts || 0) > 8000) return;
        if (callbacks.onIncomingHit) callbacks.onIncomingHit(hit);
      });

      // 3. Watch incoming Party invites
      fb.onChildAdded(myInvitesRef, (snap) => {
        const inv = snap.val();
        fb.remove(snap.ref).catch(() => {});
        if (!inv || Date.now() - (inv.ts || 0) > 20000) return;
        if (callbacks.onPartyInvite) callbacks.onPartyInvite(inv);
      });

      // 4. Watch remote elemental VFX
      const fxRef = fb.ref(db, 'world/fx');
      const bootTs = Date.now();
      fb.onChildAdded(fxRef, (snap) => {
        const fx = snap.val();
        if (!fx || fx.casterUid === uid || (fx.ts || 0) < bootTs - 1500) return;
        if (callbacks.onRemoteFx) callbacks.onRemoteFx(fx);
      });

      // 5. Watch synced mobs (for non-host clients)
      const mobsRef = fb.ref(db, 'world/mobs');
      fb.onValue(mobsRef, (snap) => {
        if (isHost) return;
        const val = snap.val();
        if (val && callbacks.onMobsSync) callbacks.onMobsSync(val);
      });

      // 6. Watch mob hit requests (Host processes damage from remote players)
      const mobHitsRef = fb.ref(db, 'world/mobHits');
      fb.onChildAdded(mobHitsRef, (snap) => {
        if (!isHost) return;
        const req = snap.val();
        fb.remove(snap.ref).catch(() => {});
        if (!req || Date.now() - (req.ts || 0) > 8000) return;
        if (callbacks.onHostMobHit) callbacks.onHostMobHit(req);
      });

      // 7. Watch shared party kill rewards
      const killsRef = fb.ref(db, 'world/kills');
      fb.onChildAdded(killsRef, (snap) => {
        const ev = snap.val();
        if (!ev || (ev.ts || 0) < bootTs - 1500) return;
        if (callbacks.onKillBroadcast) callbacks.onKillBroadcast(ev);
      });

      if (callbacks.onStatusChange) callbacks.onStatusChange(true, '🟢 多人連線中');
      return true;
    } catch (err) {
      console.warn('Firebase multiplayer connect failed:', err);
      connected = false;
      isHost = true;
      if (callbacks.onStatusChange) callbacks.onStatusChange(false, '單機模式（連線失敗）');
      return false;
    }
  }

  function pushPlayerState(data, force = false) {
    if (!connected || !myPlayerRef || !fb) return;
    const now = Date.now();
    if (!force && now - lastPushTs < 75) return;
    lastPushTs = now;
    fb.update(myPlayerRef, { ...data, uid, updatedAt: now }).catch(() => {});
  }

  function pushMobsState(mobsMap) {
    if (!connected || !isHost || !db || !fb) return;
    const now = Date.now();
    if (now - lastMobPushTs < 150) return;
    lastMobPushTs = now;
    fb.set(fb.ref(db, 'world/mobs'), mobsMap).catch(() => {});
  }

  function sendMobHitToHost(mobId, damage, color, isCrit, statusEffects = null) {
    if (!connected || !db || !fb) return;
    const r = fb.push(fb.ref(db, 'world/mobHits'));
    fb.set(r, {
      mobId,
      damage,
      color,
      isCrit,
      statusEffects,
      fromUid: uid,
      ts: Date.now()
    }).catch(() => {});
  }

  function broadcastKillReward(mobType, mobName, killerUid, killerPartyId, x, z, exp, gold) {
    if (!connected || !db || !fb) return;
    const r = fb.push(fb.ref(db, 'world/kills'));
    fb.set(r, {
      mobType,
      mobName,
      killerUid,
      killerPartyId: killerPartyId || null,
      x,
      z,
      exp,
      gold,
      ts: Date.now()
    }).catch(() => {});
    setTimeout(() => fb.remove(r).catch(() => {}), 3000);
  }

  function sendPlayerHit(targetUid, hitPayload) {
    if (!connected || !db || !fb || !targetUid) return;
    const r = fb.push(fb.ref(db, `world/hits/${targetUid}`));
    fb.set(r, { ...hitPayload, fromUid: uid, ts: Date.now() }).catch(() => {});
  }

  function sendPartyInvite(targetUid, partyId, fromName) {
    if (!connected || !db || !fb || !targetUid) return;
    const r = fb.push(fb.ref(db, `world/invites/${targetUid}`));
    fb.set(r, { partyId, fromUid: uid, fromName, ts: Date.now() }).catch(() => {});
  }

  function broadcastFx(fxPayload) {
    if (!connected || !db || !fb) return;
    const r = fb.push(fb.ref(db, 'world/fx'));
    fb.set(r, { ...fxPayload, casterUid: uid, ts: Date.now() }).catch(() => {});
    setTimeout(() => fb.remove(r).catch(() => {}), 2000);
  }

  return {
    uid,
    isConfigured,
    isConnected: () => connected,
    isHost: () => isHost,
    getRemotePlayers: () => remotePlayers,
    connect,
    pushPlayerState,
    pushMobsState,
    sendMobHitToHost,
    broadcastKillReward,
    sendPlayerHit,
    sendPartyInvite,
    broadcastFx
  };
}
