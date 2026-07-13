// Message types the chat accepts. 'image' rows carry a mediaUrl that must
// point at a file this backend uploaded itself (see MEDIA_URL_RE).
const MESSAGE_TYPES = { text: true, image: true, sticker: true };
const MEDIA_URL_RE = /^https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]{20,100}$/;

const UPLOAD_MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};
// 4MB of raw bytes ≈ 5.6M base64 characters
const UPLOAD_MAX_BASE64_CHARS = 5600000;

/**
 * Fetch messages since timestamp.
 * If since is null, fetch the last 50 messages.
 */
function fetchMessages(since, fingerprint, nickname) {
  const ss = getSpreadsheet(MESSAGES_FILE);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  const serverTs = new Date().getTime();
  const online = updateOnlineStatus(fingerprint, nickname);

  if (lastRow <= 1) {
    return { messages: [], serverTs: serverTs, onlineCount: online.count, online: online };
  }

  // Optimization: Read only bottom range
  const fetchLimit = since ? 100 : 50;
  const startRow = Math.max(2, lastRow - fetchLimit + 1);
  const numRows = lastRow - startRow + 1;

  // columns: id, ts, nickname, text, clientHash, type, mediaUrl
  // (legacy rows predate the last two columns and read back as '')
  const range = sheet.getRange(startRow, 1, numRows, 7);
  const values = range.getValues();

  const messages = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const ts = parseInt(row[1], 10);

    if (!since || ts > since) {
      messages.push({
        id: row[0],
        ts: ts,
        nickname: row[2],
        text: row[3],
        type: row[5] || 'text',
        mediaUrl: row[6] || ''
      });
    }
  }

  return { messages: messages, serverTs: serverTs, onlineCount: online.count, online: online };
}

/**
 * Add a new message to the sheet.
 * Uses LockService to handle concurrency.
 */
function addMessage(payload) {
  const nickname = stripControlChars(typeof payload.nickname === 'string' ? payload.nickname : '');
  const text = stripControlChars(typeof payload.text === 'string' ? payload.text : '');
  const type = payload.type ? String(payload.type) : 'text';
  const mediaUrl = typeof payload.mediaUrl === 'string' ? payload.mediaUrl.trim() : '';

  if (nickname.length === 0 || nickname.length > 20) {
    throw new Error('INVALID_NICKNAME: Nickname must be between 1 and 20 characters.');
  }
  if (!MESSAGE_TYPES[type]) {
    throw new Error('INVALID_TYPE: Message type must be text, image, or sticker.');
  }
  if (type === 'text' && (text.length === 0 || text.length > 500)) {
    throw new Error('INVALID_TEXT: Text must be between 1 and 500 characters.');
  }
  if (type === 'sticker' && (text.length === 0 || text.length > 16)) {
    throw new Error('INVALID_TEXT: Sticker must be between 1 and 16 characters.');
  }
  if (type === 'image') {
    if (!MEDIA_URL_RE.test(mediaUrl)) {
      throw new Error('INVALID_MEDIA_URL: Image messages require a URL returned by the upload action.');
    }
    if (text.length > 500) {
      throw new Error('INVALID_TEXT: Caption must be at most 500 characters.');
    }
  } else if (mediaUrl) {
    throw new Error('INVALID_MEDIA_URL: mediaUrl is only allowed on image messages.');
  }

  const msgId = payload.id || Utilities.getUuid();
  const fingerprint = payload.fingerprint || 'anonymous';

  // Rate limiting
  checkRateLimit(fingerprint);

  const ts = new Date().getTime();

  return withLock(function() {
    const ss = getSpreadsheet(MESSAGES_FILE);
    const sheet = ss.getSheets()[0];

    sheet.appendRow([msgId, ts, nickname, text, fingerprint, type, mediaUrl]);

    return {
      id: msgId,
      ts: ts,
      nickname: nickname,
      text: text,
      type: type,
      mediaUrl: mediaUrl
    };
  });
}

/**
 * Store an uploaded image in Drive and return its public URL.
 * Payload: { data: <base64 without data: prefix>, mimeType, fingerprint }.
 * The file is created by this script, so the drive.file scope suffices to
 * make it link-viewable. No LockService needed (no shared sheet state).
 */
function uploadImage(payload) {
  const fingerprint = typeof payload.fingerprint === 'string' ? payload.fingerprint : '';
  const mimeType = String(payload.mimeType || '').toLowerCase();
  const data = payload.data;

  if (!fingerprint) {
    throw new Error('INVALID_FINGERPRINT: Missing client fingerprint.');
  }
  const ext = UPLOAD_MIME_EXT[mimeType];
  if (!ext) {
    throw new Error('UNSUPPORTED_TYPE: Only JPG, PNG, GIF and WebP images are allowed.');
  }
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('MISSING_DATA: Image data is empty.');
  }
  if (data.length > UPLOAD_MAX_BASE64_CHARS) {
    throw new Error('PAYLOAD_TOO_LARGE: Image exceeds the 4MB limit.');
  }

  checkUploadRateLimit(fingerprint);

  let bytes;
  try {
    bytes = Utilities.base64Decode(data);
  } catch (err) {
    throw new Error('INVALID_DATA: Image data is not valid base64.');
  }

  assertMagicBytes(bytes, mimeType);

  // Filename is server-generated; client filenames are never accepted.
  const blob = Utilities.newBlob(bytes, mimeType, 'img_' + new Date().getTime() + '.' + ext);
  const file = getUploadsFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    fileId: file.getId(),
    url: 'https://lh3.googleusercontent.com/d/' + file.getId(),
    bytes: bytes.length
  };
}

/**
 * Cheap content sniff: the file's magic bytes must agree with the declared
 * mime type, so renamed non-images are rejected before touching Drive.
 */
function assertMagicBytes(bytes, mimeType) {
  // Apps Script byte arrays are signed (-128..127)
  function at(i) { return bytes[i] & 0xFF; }

  let ok = false;
  if (bytes.length >= 12) {
    if (mimeType === 'image/jpeg') {
      ok = at(0) === 0xFF && at(1) === 0xD8;
    } else if (mimeType === 'image/png') {
      ok = at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4E && at(3) === 0x47;
    } else if (mimeType === 'image/gif') {
      ok = at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38;
    } else if (mimeType === 'image/webp') {
      ok = at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
           at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50;
    }
  }

  if (!ok) {
    throw new Error('UNSUPPORTED_TYPE: File content does not match its declared image type.');
  }
}
