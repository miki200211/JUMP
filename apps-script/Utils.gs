/**
 * Standard JSON Success Response
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Standard JSON Error Response
 */
function jsonError(code, message) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    error: {
      code: code,
      message: message
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Concurrency lock runner helper.
 */
function withLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('LOCK_TIMEOUT: Failed to acquire lock within 10 seconds.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Store text as typed: only strip control characters (keep \n) and trim.
 * HTML escaping happens exactly once, at render time in the client —
 * escaping here as well caused double-encoded text like "A &amp; B".
 */
function stripControlChars(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim();
}

/**
 * Rate limit checker using CacheService.
 * Restricts client fingerprints to 1 post per 3 seconds.
 */
function checkRateLimit(fingerprint) {
  if (!fingerprint) return;

  const cache = CacheService.getScriptCache();
  const cacheKey = 'rl_' + fingerprint;
  const lastSent = cache.get(cacheKey);

  if (lastSent) {
    throw new Error('RATE_LIMITED: Sending too fast. Please wait 3 seconds.');
  }

  // Save cache key for 3 seconds
  cache.put(cacheKey, '1', 3);
}

/**
 * Separate, slower rate limit for image uploads (1 per 10 seconds), so an
 * upload does not consume the 3-second message budget of the follow-up send.
 */
function checkUploadRateLimit(fingerprint) {
  if (!fingerprint) return;

  const cache = CacheService.getScriptCache();
  const cacheKey = 'rlu_' + fingerprint;

  if (cache.get(cacheKey)) {
    throw new Error('RATE_LIMITED: Uploading too fast. Please wait 10 seconds.');
  }

  cache.put(cacheKey, '1', 10);
}

const ONLINE_WINDOW_MS = 15000;   // presence expires after 15s without a poll
const ONLINE_MAP_MAX = 500;       // hard cap on stored fingerprints (CacheService value limit)
const ONLINE_LIST_MAX = 50;       // max nicknames returned to clients

/**
 * Update online status in CacheService and return the active users.
 * Stores { "<fingerprint>": { "n": "<nickname>", "t": <lastSeenMs> } }.
 * Tolerates the legacy format where values were bare timestamps (those
 * entries age out within one 15-second window anyway).
 * Returns { count: Number, users: [nickname, ...] } with users deduped.
 */
function updateOnlineStatus(fingerprint, nickname) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'online_users_list';
  let onlineUsers = {};

  try {
    const cached = cache.get(cacheKey);
    if (cached) {
      onlineUsers = JSON.parse(cached);
    }
  } catch (err) {
    // Ignore parse/fetch errors
  }

  const now = new Date().getTime();
  const nick = (typeof nickname === 'string' ? nickname : '').trim().slice(0, 20);

  if (fingerprint && fingerprint !== 'anonymous') {
    onlineUsers[fingerprint] = { n: nick, t: now };
  }

  // Keep only entries seen within the window, newest first
  const threshold = now - ONLINE_WINDOW_MS;
  const active = [];
  for (const fp in onlineUsers) {
    const raw = onlineUsers[fp];
    const entry = (raw && typeof raw === 'object') ? raw : { n: '', t: raw };
    if (typeof entry.t === 'number' && entry.t > threshold) {
      active.push({
        fp: fp,
        n: typeof entry.n === 'string' ? entry.n : '',
        t: entry.t
      });
    }
  }
  active.sort(function(a, b) { return b.t - a.t; });
  if (active.length > ONLINE_MAP_MAX) {
    active.length = ONLINE_MAP_MAX;
  }

  const cleanedUsers = {};
  const users = [];
  const seenNames = {};
  for (let i = 0; i < active.length; i++) {
    cleanedUsers[active[i].fp] = { n: active[i].n, t: active[i].t };
    const name = active[i].n;
    if (name && !seenNames[name] && users.length < ONLINE_LIST_MAX) {
      seenNames[name] = true;
      users.push(name);
    }
  }

  try {
    cache.put(cacheKey, JSON.stringify(cleanedUsers), 600); // cache for 10 minutes
  } catch (err) {
    // Fail silently
  }

  return { count: Math.max(1, active.length), users: users };
}
