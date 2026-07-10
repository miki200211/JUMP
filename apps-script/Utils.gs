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
 * Basic HTML/JS injection sanitizer.
 */
function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
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
 * Record a link click.
 * Payload includes linkId, referrer, userAgent.
 */
function recordClick(linkId, e) {
  const payload = JSON.parse(e.postData.contents);
  const referrer = payload.referrer || '';
  const userAgent = payload.userAgent || '';
  const ts = new Date().getTime();
  
  return withLock(function() {
    const ss = getSpreadsheet(ANALYTICS_FILE);
    const sheet = ss.getSheets()[0];
    sheet.appendRow([ts, linkId, referrer, userAgent]);
    return { success: true };
  });
}
