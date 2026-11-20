/**
 * JUMP 3D RPG — Real-Time Multiplayer Network Engine (Firebase Realtime Database)
 * v4.3 Fixes:
 * - Synchronized Firebase server clock (.info/serverTimeOffset) so PC clock drift NEVER drops mob hits or teammates!
 * - Foreground-aware Host Election (active visible tab is preferred over backgrounded tabs)
 * - Per-tab unique session UID so opening multiple tabs never collides
 * - Reliable mob damage, AoE VFX, party invite, and kill reward delivery
 */

export function createMultiplayerNetwork(callbacks) {
  let tabSuffix = sessionStorage.getItem('jump_rpg_tab_id');
  if (!tabSuffix) {
    tabSuffix = Math.random().toString(36).slice(2, 7);
    sessionStorage.setItem('jump_rpg_tab_id', tabSuffix);
  }
  const baseFp = (localStorage.getItem('chat_fingerprint') || Date.now().toString(36))
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 16);
  const uid = `p_${baseFp}_${tabSuffix}`;

  let connected = false;
  let db = null;
  let fb = null; // firebase-database module exports
  let myPlayerRef = null;
  let isHost = true; // Single-player default is host; updated dynamically when connected
  let serverOffsetMs = 0; // Synced via .info/serverTimeOffset to immune against PC clock drift!
  let hasServerOffset = false;
  let bootServerTs = Date.now();

  const remotePlayers = new Map(); // uid -> raw state from Firebase
  let lastPushTs = 0;
  let lastMobPushTs = 0;

  function serverNow() {
    return Date.now() + serverOffsetMs;
  }

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

      // 0. Sync server time offset immediately to eliminate PC clock skew between teammates!
      const offsetRef = fb.ref(db, '.info/serverTimeOffset');
      fb.onValue(offsetRef, (snap) => {
        const off = Number(snap.val()) || 0;
        serverOffsetMs = off;
        if (!hasServerOffset) {
          hasServerOffset = true;
          bootServerTs = Date.now() + off;
        }
      });

      myPlayerRef = fb.ref(db, `world/players/${uid}`);
      const myHitsRef = fb.ref(db, `world/hits/${uid}`);
      const myInvitesRef = fb.ref(db, `world/invites/${uid}`);

      // Automatically clean up player & inbox when tab closes or disconnects
      fb.onDisconnect(myPlayerRef).remove();
      fb.onDisconnect(myHitsRef).remove();
      fb.onDisconnect(myInvitesRef).remove();

      await fb.set(myPlayerRef, {
        ...initialPlayerData,
        uid,
        active: document.hidden ? 0 : 1,
        updatedAt: fb.serverTimestamp()
      });
      connected = true;

      // 1. Watch all online players & elect Mob AI Host (prefer active foreground tab!)
      const playersRef = fb.ref(db, 'world/players');
      fb.onValue(playersRef, (snap) => {
        const val = snap.val() || {};
        const now = serverNow();
        const activeCandidates = [];

        remotePlayers.clear();
        for (const [pUid, pData] of Object.entries(val)) {
          if (!pData) continue;
          // Only apply age cutoff once Firebase server time offset has synced!
          const age = (hasServerOffset && pData.updatedAt) ? (now - pData.updatedAt) : 0;
          if (age > 45000) continue;
          activeCandidates.push({ uid: pUid, active: pData.active ? 1 : 0 });
          if (pUid !== uid) {
            remotePlayers.set(pUid, pData);
          }
        }

        // Foreground active players always take priority for Host election so mobs never freeze
        activeCandidates.sort((a, b) => {
          if (b.active !== a.active) return b.active - a.active;
          return a.uid.localeCompare(b.uid);
        });
        isHost = activeCandidates.length === 0 || activeCandidates[0].uid === uid;

        if (callbacks.onPlayersUpdate) {
          callbacks.onPlayersUpdate(remotePlayers, isHost);
        }
      });

      // 2. Watch incoming Mob hits, PvP hits & ally heals (clock-skew proof!)
      fb.onChildAdded(myHitsRef, (snap) => {
        const hit = snap.val();
        fb.remove(snap.ref).catch(() => {});
        if (!hit) return;
        if (hasServerOffset && hit.ts && (serverNow() - hit.ts) > 30000) return;
        if (callbacks.onIncomingHit) callbacks.onIncomingHit(hit);
      });

      // 3. Watch incoming Party invites
      fb.onChildAdded(myInvitesRef, (snap) => {
        const inv = snap.val();
        fb.remove(snap.ref).catch(() => {});
        if (!inv) return;
        if (hasServerOffset && inv.ts && (serverNow() - inv.ts) > 45000) return;
        if (callbacks.onPartyInvite) callbacks.onPartyInvite(inv);
      });

      // 4. Watch remote elemental & Boss VFX
      const fxRef = fb.ref(db, 'world/fx');
      fb.onChildAdded(fxRef, (snap) => {
        const fx = snap.val();
        if (!fx || fx.casterUid === uid) return;
        if (hasServerOffset && fx.ts && fx.ts < bootServerTs - 6000) return;
        if (callbacks.onRemoteFx) callbacks.onRemoteFx(fx);
      });

      // 5. Watch synced mobs (for non-host clients)
      const mobsRef = fb.ref(db, 'world/mobs');
      fb.onValue(mobsRef, (snap) => {
        if (isHost) return;
        const val = snap.val();
        if (val && callbacks.onMobsSync) callbacks.onMobsSync(val);
      });

      // 6. Watch mob hit requests (Host processes damage & aggro from remote teammates!)
      const mobHitsRef = fb.ref(db, 'world/mobHits');
      fb.onChildAdded(mobHitsRef, (snap) => {
        if (!isHost) return;
        const req = snap.val();
        fb.remove(snap.ref).catch(() => {});
        if (!req) return;
        if (hasServerOffset && req.ts && (serverNow() - req.ts) > 30000) return;
        if (callbacks.onHostMobHit) callbacks.onHostMobHit(req);
      });

      // 7. Watch shared party kill rewards
      const killsRef = fb.ref(db, 'world/kills');
      fb.onChildAdded(killsRef, (snap) => {
        const ev = snap.val();
        if (!ev) return;
        if (hasServerOffset && ev.ts && ev.ts < bootServerTs - 6000) return;
        if (callbacks.onKillBroadcast) callbacks.onKillBroadcast(ev);
      });

      // Notify visibility changes immediately so Host election hands off if tab is backgrounded
      document.addEventListener('visibilitychange', () => {
        if (connected && myPlayerRef && fb) {
          fb.update(myPlayerRef, {
            active: document.hidden ? 0 : 1,
            updatedAt: fb.serverTimestamp()
          }).catch(() => {});
        }
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
    fb.update(myPlayerRef, {
      ...data,
      uid,
      active: document.hidden ? 0 : 1,
      updatedAt: fb.serverTimestamp()
    }).catch(() => {});
  }

  function pushMobsState(mobsMap) {
    if (!connected || !isHost || !db || !fb) return;
    const now = Date.now();
    if (now - lastMobPushTs < 130) return;
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
      ts: fb.serverTimestamp()
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
      ts: fb.serverTimestamp()
    }).catch(() => {});
    setTimeout(() => fb.remove(r).catch(() => {}), 3500);
  }

  function sendPlayerHit(targetUid, hitPayload) {
    if (!connected || !db || !fb || !targetUid) return;
    const r = fb.push(fb.ref(db, `world/hits/${targetUid}`));
    fb.set(r, { ...hitPayload, fromUid: uid, ts: fb.serverTimestamp() }).catch(() => {});
  }

  function sendPartyInvite(targetUid, partyId, fromName) {
    if (!connected || !db || !fb || !targetUid) return;
    const r = fb.push(fb.ref(db, `world/invites/${targetUid}`));
    fb.set(r, { partyId, fromUid: uid, fromName, ts: fb.serverTimestamp() }).catch(() => {});
  }

  function broadcastFx(fxPayload) {
    if (!connected || !db || !fb) return;
    const r = fb.push(fb.ref(db, 'world/fx'));
    fb.set(r, { ...fxPayload, casterUid: uid, ts: fb.serverTimestamp() }).catch(() => {});
    setTimeout(() => fb.remove(r).catch(() => {}), 2200);
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
