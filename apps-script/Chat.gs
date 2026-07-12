/**
 * Fetch messages since timestamp.
 * If since is null, fetch the last 50 messages.
 */
function fetchMessages(since, fingerprint) {
  const ss = getSpreadsheet(MESSAGES_FILE);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  const serverTs = new Date().getTime();
  const onlineCount = updateOnlineStatus(fingerprint);
  
  if (lastRow <= 1) {
    return { messages: [], serverTs: serverTs, onlineCount: onlineCount };
  }
  
  // Optimization: Read only bottom range
  const fetchLimit = since ? 100 : 50;
  const startRow = Math.max(2, lastRow - fetchLimit + 1);
  const numRows = lastRow - startRow + 1;
  
  const range = sheet.getRange(startRow, 1, numRows, 5); // columns: id, ts, nickname, text, clientHash
  const values = range.getValues();
  
  const messages = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const msgId = row[0];
    const ts = parseInt(row[1], 10);
    const nickname = row[2];
    const text = row[3];
    
    if (!since || ts > since) {
      messages.push({
        id: msgId,
        ts: ts,
        nickname: nickname,
        text: text
      });
    }
  }
  
  return { messages: messages, serverTs: serverTs, onlineCount: onlineCount };
}

/**
 * Add a new message to the sheet.
 * Uses LockService to handle concurrency.
 */
function addMessage(nickname, text, e) {
  if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0 || nickname.trim().length > 20) {
    throw new Error('INVALID_NICKNAME: Nickname must be between 1 and 20 characters.');
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0 || text.trim().length > 500) {
    throw new Error('INVALID_TEXT: Text must be between 1 and 500 characters.');
  }
  
  const payload = JSON.parse(e.postData.contents);
  const msgId = payload.id || Utilities.getUuid();
  const fingerprint = payload.fingerprint || 'anonymous';
  
  const sanitizedNick = sanitizeInput(nickname.trim());
  const sanitizedText = sanitizeInput(text.trim());
  
  // Rate limiting
  checkRateLimit(fingerprint);
  
  const ts = new Date().getTime();
  
  return withLock(function() {
    const ss = getSpreadsheet(MESSAGES_FILE);
    const sheet = ss.getSheets()[0];
    
    sheet.appendRow([msgId, ts, sanitizedNick, sanitizedText, fingerprint]);
    
    return {
      id: msgId,
      ts: ts,
      nickname: sanitizedNick,
      text: sanitizedText
    };
  });
}
