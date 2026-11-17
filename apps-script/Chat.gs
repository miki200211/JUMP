// Message types the chat accepts. 'image' or 'video' rows carry a mediaUrl that must
// point at a file this backend uploaded itself (see MEDIA_URL_RE).
const MESSAGE_TYPES = { text: true, image: true, video: true, sticker: true };
const MEDIA_URL_RE = /^https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]{20,100}$/;

const UPLOAD_MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogg',
  'video/quicktime': 'mov'
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

  // columns: id, ts, nickname, text, clientHash, type, mediaUrl, replyTo
  // (legacy rows predate the extra columns and read back as '')
  const range = sheet.getRange(startRow, 1, numRows, 8);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();

  const messages = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const ts = parseInt(row[1], 10);

    let textVal = row[3];
    // Prevent Google Sheets from auto-casting time strings like "8:46" or "1:30" into 1899 Date objects
    if (textVal instanceof Date) {
      const disp = displayValues[i] && displayValues[i][3];
      if (disp && disp.indexOf('1899') === -1) {
        textVal = disp;
      } else {
        const h = textVal.getHours();
        const m = String(textVal.getMinutes()).padStart(2, '0');
        const s = textVal.getSeconds();
        textVal = s > 0 ? `${h}:${m}:${String(s).padStart(2, '0')}` : `${h}:${m}`;
      }
    } else {
      textVal = String(textVal != null ? textVal : '');
    }

    let replyTo = null;
    if (row[7]) {
      try {
        const parsed = JSON.parse(String(row[7]));
        if (parsed && typeof parsed === 'object' && parsed.id) {
          replyTo = {
            id: String(parsed.id).slice(0, 64),
            nickname: String(parsed.nickname || '').slice(0, 20),
            text: String(parsed.text || '').slice(0, 120)
          };
        }
      } catch (_) {}
    }

    if (!since || ts > since) {
      messages.push({
        id: row[0],
        ts: ts,
        nickname: String(row[2] || ''),
        text: textVal,
        type: row[5] || 'text',
        mediaUrl: row[6] || '',
        replyTo: replyTo
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
  if (type === 'image' || type === 'video') {
    if (!MEDIA_URL_RE.test(mediaUrl)) {
      throw new Error('INVALID_MEDIA_URL: Image or video messages require a URL returned by the upload action.');
    }
    if (text.length > 500) {
      throw new Error('INVALID_TEXT: Caption must be at most 500 characters.');
    }
  } else if (mediaUrl) {
    throw new Error('INVALID_MEDIA_URL: mediaUrl is only allowed on image or video messages.');
  }

  const msgId = payload.id || Utilities.getUuid();
  const fingerprint = payload.fingerprint || 'anonymous';

  let replyToObj = null;
  let replyToJson = '';
  if (payload.replyTo && typeof payload.replyTo === 'object' && payload.replyTo.id) {
    replyToObj = {
      id: stripControlChars(String(payload.replyTo.id)).slice(0, 64),
      nickname: stripControlChars(String(payload.replyTo.nickname || '')).slice(0, 20),
      text: stripControlChars(String(payload.replyTo.text || '')).slice(0, 120)
    };
    replyToJson = JSON.stringify(replyToObj);
  }

  // Rate limiting
  checkRateLimit(fingerprint);

  const ts = new Date().getTime();

  const result = withLock(function() {
    const ss = getSpreadsheet(MESSAGES_FILE);
    const sheet = ss.getSheets()[0];

    const nextRow = sheet.getLastRow() + 1;
    // Set nickname (col 3), text (col 4), and replyTo (col 8) to plain text format (@) BEFORE writing
    sheet.getRange(nextRow, 3, 1, 2).setNumberFormat('@');
    sheet.getRange(nextRow, 8).setNumberFormat('@');
    sheet.getRange(nextRow, 1, 1, 8).setValues([[msgId, ts, nickname, text, fingerprint, type, mediaUrl, replyToJson]]);

    return {
      id: msgId,
      ts: ts,
      nickname: nickname,
      text: text,
      type: type,
      mediaUrl: mediaUrl,
      replyTo: replyToObj
    };
  });

  // Trigger offline Web Push notification (for users whose browser tab is closed)
  if (typeof sendPushNotification === 'function') {
    sendPushNotification();
  }

  return result;
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
    throw new Error('UNSUPPORTED_TYPE: Only JPG, PNG, GIF, WebP images and MP4, WebM, OGG, MOV videos are allowed.');
  }
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('MISSING_DATA: Upload data is empty.');
  }
  if (data.length > UPLOAD_MAX_BASE64_CHARS) {
    throw new Error('PAYLOAD_TOO_LARGE: File exceeds the 4MB limit.');
  }

  checkUploadRateLimit(fingerprint);

  let bytes;
  try {
    bytes = Utilities.base64Decode(data);
  } catch (err) {
    throw new Error('INVALID_DATA: Data is not valid base64.');
  }

  assertMagicBytes(bytes, mimeType);

  // Filename is server-generated; client filenames are never accepted.
  const isVideo = mimeType.indexOf('video/') === 0;
  const prefix = isVideo ? 'vid_' : 'img_';
  const blob = Utilities.newBlob(bytes, mimeType, prefix + new Date().getTime() + '.' + ext);
  const file = getUploadsFolder().createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    console.warn('setSharing failed (possible Workspace domain policy restriction): ' + err.toString());
  }

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
    } else if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
      ok = at(4) === 0x66 && at(5) === 0x74 && at(6) === 0x79 && at(7) === 0x70; // 'ftyp'
    } else if (mimeType === 'video/webm') {
      ok = at(0) === 0x1A && at(1) === 0x45 && at(2) === 0xDF && at(3) === 0xA3; // WebM EBML
    } else if (mimeType === 'video/ogg') {
      ok = at(0) === 0x4F && at(1) === 0x67 && at(2) === 0x67 && at(3) === 0x53; // 'OggS'
    }
  }

  if (!ok) {
    throw new Error('UNSUPPORTED_TYPE: File content does not match its declared type.');
  }
}

/**
 * Proxy media file as base64 data URL when client networks or Workspace
 * policies block direct lh3 / Drive image embedding.
 */
function fetchMediaBase64(fileId) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(fileId)) {
    throw new Error('INVALID_FILE_ID: File ID is invalid.');
  }

  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  const mimeType = blob.getContentType() || 'application/octet-stream';

  if (!UPLOAD_MIME_EXT[mimeType]) {
    throw new Error('UNSUPPORTED_TYPE: Only allowed image/video types can be fetched.');
  }

  const bytes = blob.getBytes();
  // Keep response well under Apps Script's ~50MB ContentService cap (limit to 6MB raw)
  if (bytes.length > 6291456) {
    throw new Error('PAYLOAD_TOO_LARGE: Media is too large to proxy.');
  }

  const base64 = Utilities.base64Encode(bytes);
  return {
    mimeType: mimeType,
    dataUrl: 'data:' + mimeType + ';base64,' + base64
  };
}
