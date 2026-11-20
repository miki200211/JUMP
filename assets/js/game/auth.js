/**
 * RPG Account Authentication & Cloud Save Client (via Google Apps Script)
 * Supports SHA-256 hashed account login/register + local guest fallback.
 */
import { DEFAULT_APPEARANCE, DEFAULT_PLAYER_STATE, RPG_DATA_EPOCH } from './data.js?v=4.4.0';

const STORAGE_AUTH_KEY = 'jump_rpg_auth_v1';
const STORAGE_LOCAL_SAVE_KEY = 'jump_rpg_local_save_v1';
const STORAGE_EPOCH_KEY = 'jump_rpg_data_epoch';

/**
 * Automatically wipe stale client-side RPG session & local save when the
 * server database epoch advances (Season Wipe), while preserving chat data.
 */
export function enforceClientDataEpoch() {
  try {
    const savedEpoch = parseInt(localStorage.getItem(STORAGE_EPOCH_KEY) || '1', 10);
    if (savedEpoch < RPG_DATA_EPOCH) {
      localStorage.removeItem(STORAGE_AUTH_KEY);
      localStorage.removeItem(STORAGE_LOCAL_SAVE_KEY);
      localStorage.setItem(STORAGE_EPOCH_KEY, String(RPG_DATA_EPOCH));
      return true;
    }
  } catch (_) {}
  return false;
}

export async function hashPassword(username, password) {
  const input = `jump_rpg_salt_v1:${username.trim().toLowerCase()}:${password}`;
  if (window.crypto && window.crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const hashBuf = await window.crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic 64-hex hash if crypto.subtle unavailable (e.g. non-localhost HTTP)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const part = ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
  return part.repeat(4).slice(0, 64);
}

async function postGas(payload) {
  const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE) || '';
  if (!base || base.includes('YOUR_DEPLOYMENT_ID')) {
    return { ok: false, error: { code: 'NO_BACKEND', message: '尚未設定後端網址' } };
  }
  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.toString() } };
  }
}

export function loadSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function saveSession(session) {
  if (!session) {
    localStorage.removeItem(STORAGE_AUTH_KEY);
  } else {
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(session));
  }
}

export function loadLocalFallbackSave() {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function writeLocalFallbackSave(nickname, appearance, state) {
  try {
    localStorage.setItem(STORAGE_LOCAL_SAVE_KEY, JSON.stringify({
      nickname,
      appearance,
      state,
      updatedAt: Date.now()
    }));
  } catch (_) {}
}

export async function registerAccount(username, password, nickname, appearance, state) {
  const passwordHash = await hashPassword(username, password);
  const res = await postGas({
    action: 'rpg_register',
    username,
    passwordHash,
    nickname,
    appearance: appearance || DEFAULT_APPEARANCE,
    state: state || DEFAULT_PLAYER_STATE
  });
  if (res && res.ok && res.data) {
    saveSession({ username: res.data.username, passwordHash, nickname: res.data.nickname });
  }
  return res;
}

export async function loginAccount(username, password) {
  const passwordHash = await hashPassword(username, password);
  const res = await postGas({
    action: 'rpg_login',
    username,
    passwordHash
  });
  if (res && res.ok && res.data) {
    saveSession({ username: res.data.username, passwordHash, nickname: res.data.nickname });
  }
  return res;
}

export async function autoLoginFromSession() {
  const session = loadSavedSession();
  if (!session || !session.username || !session.passwordHash) return null;
  const res = await postGas({
    action: 'rpg_login',
    username: session.username,
    passwordHash: session.passwordHash
  });
  if (res && res.ok && res.data) {
    return { ...res.data, passwordHash: session.passwordHash };
  }
  return null;
}

export async function cloudSaveProgress(nickname, appearance, state) {
  writeLocalFallbackSave(nickname, appearance, state);
  const session = loadSavedSession();
  if (!session || !session.username || !session.passwordHash) {
    return { ok: false, localOnly: true };
  }
  return await postGas({
    action: 'rpg_save',
    username: session.username,
    passwordHash: session.passwordHash,
    nickname,
    appearance,
    state
  });
}
