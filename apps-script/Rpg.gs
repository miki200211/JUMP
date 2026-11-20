/**
 * RPG Account Authentication & Cloud Save Module
 * Stores player accounts, character customization, inventory, and progression
 * in the 'rpg_players' spreadsheet inside JumpApp folder.
 */

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const MAX_JSON_LEN = 8000;

/**
 * Register a new RPG account.
 * Payload: { username, passwordHash, nickname, appearance, state }
 */
function rpgRegister(payload) {
  const username = String(payload.username || '').trim().toLowerCase();
  const passwordHash = String(payload.passwordHash || '').trim().toLowerCase();
  const nickname = stripControlChars(String(payload.nickname || username)).slice(0, 20);

  if (!USERNAME_RE.test(username)) {
    throw new Error('INVALID_USERNAME: 帳號必須為 3-20 字元英文、數字或底線。');
  }
  if (!SHA256_RE.test(passwordHash)) {
    throw new Error('INVALID_PASSWORD: 密碼格式錯誤。');
  }
  if (!nickname) {
    throw new Error('INVALID_NICKNAME: 角色名稱不可為空。');
  }

  const appearanceJson = safeSerializeJson(payload.appearance || {}, MAX_JSON_LEN);
  const stateJson = safeSerializeJson(payload.state || {}, MAX_JSON_LEN);
  const now = new Date().getTime();

  return withLock(function() {
    const ss = getSpreadsheet(PLAYERS_FILE);
    const sheet = ss.getSheets()[0];
    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      const existingNames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < existingNames.length; i++) {
        if (String(existingNames[i][0] || '').trim().toLowerCase() === username) {
          throw new Error('USER_EXISTS: 此帳號已被註冊，請換一個或直接登入。');
        }
      }
    }

    const nextRow = lastRow + 1;
    sheet.getRange(nextRow, 1, 1, 5).setNumberFormat('@');
    sheet.getRange(nextRow, 1, 1, 6).setValues([[
      username,
      passwordHash,
      nickname,
      appearanceJson,
      stateJson,
      now
    ]]);

    return {
      username: username,
      nickname: nickname,
      appearance: safeParseJson(appearanceJson, null),
      state: safeParseJson(stateJson, null),
      updatedAt: now
    };
  });
}

/**
 * Login with existing RPG account.
 * Payload: { username, passwordHash }
 */
function rpgLogin(payload) {
  const username = String(payload.username || '').trim().toLowerCase();
  const passwordHash = String(payload.passwordHash || '').trim().toLowerCase();

  if (!USERNAME_RE.test(username) || !SHA256_RE.test(passwordHash)) {
    throw new Error('INVALID_CREDENTIALS: 帳號或密碼格式不正確。');
  }

  const ss = getSpreadsheet(PLAYERS_FILE);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    throw new Error('INVALID_CREDENTIALS: 帳號不存在或密碼錯誤。');
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  for (let i = 0; i < rows.length; i++) {
    const rowUser = String(rows[i][0] || '').trim().toLowerCase();
    const rowHash = String(rows[i][1] || '').trim().toLowerCase();
    if (rowUser === username) {
      if (rowHash !== passwordHash) {
        throw new Error('INVALID_CREDENTIALS: 帳號不存在或密碼錯誤。');
      }
      return {
        username: rowUser,
        nickname: String(rows[i][2] || rowUser),
        appearance: safeParseJson(String(rows[i][3] || ''), null),
        state: safeParseJson(String(rows[i][4] || ''), null),
        updatedAt: parseInt(rows[i][5], 10) || 0
      };
    }
  }

  throw new Error('INVALID_CREDENTIALS: 帳號不存在或密碼錯誤。');
}

/**
 * Save RPG character appearance and progression.
 * Payload: { username, passwordHash, nickname, appearance, state }
 */
function rpgSave(payload) {
  const username = String(payload.username || '').trim().toLowerCase();
  const passwordHash = String(payload.passwordHash || '').trim().toLowerCase();

  if (!USERNAME_RE.test(username) || !SHA256_RE.test(passwordHash)) {
    throw new Error('UNAUTHORIZED: 登入憑證無效。');
  }

  const nickname = stripControlChars(String(payload.nickname || '')).slice(0, 20);
  const appearanceJson = safeSerializeJson(payload.appearance || {}, MAX_JSON_LEN);
  const stateJson = safeSerializeJson(payload.state || {}, MAX_JSON_LEN);
  const now = new Date().getTime();

  return withLock(function() {
    const ss = getSpreadsheet(PLAYERS_FILE);
    const sheet = ss.getSheets()[0];
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      throw new Error('UNAUTHORIZED: 找不到該帳號。');
    }

    const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (let i = 0; i < rows.length; i++) {
      const rowUser = String(rows[i][0] || '').trim().toLowerCase();
      const rowHash = String(rows[i][1] || '').trim().toLowerCase();
      if (rowUser === username) {
        if (rowHash !== passwordHash) {
          throw new Error('UNAUTHORIZED: 密碼驗證失敗。');
        }
        const targetRow = i + 2;
        const finalNick = nickname || String(rows[i][2] || username);
        sheet.getRange(targetRow, 3, 1, 3).setNumberFormat('@');
        sheet.getRange(targetRow, 3, 1, 4).setValues([[
          finalNick,
          appearanceJson,
          stateJson,
          now
        ]]);
        return { saved: true, updatedAt: now };
      }
    }

    throw new Error('UNAUTHORIZED: 找不到該帳號。');
  });
}

function safeSerializeJson(obj, maxLen) {
  const str = JSON.stringify(obj || {});
  if (str.length > maxLen) {
    throw new Error('PAYLOAD_TOO_LARGE: 存檔資料過大。');
  }
  return str;
}

function safeParseJson(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (_) {
    return fallback;
  }
}
