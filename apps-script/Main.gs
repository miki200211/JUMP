/**
 * GET Entrypoint
 * Handles:
 * - action=messages : Fetch chat messages + online users
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'messages') {
      const since = e.parameter.since ? parseInt(e.parameter.since, 10) : null;
      const fingerprint = e.parameter.fingerprint || 'anonymous';
      const nickname = (e.parameter.nickname || '').trim().slice(0, 20);
      const result = fetchMessages(since, fingerprint, nickname);
      return jsonResponse(result);
    }

    return jsonError('INVALID_ACTION', 'Action is invalid or not specified.');
  } catch (err) {
    return errorToResponse(err);
  }
}

/**
 * POST Entrypoint
 * Handles simple requests (Content-Type: text/plain) to avoid CORS preflight.
 * Payload: { action: 'send', id, nickname, text, type, mediaUrl, fingerprint }
 * Payload: { action: 'upload', data, mimeType, fingerprint }
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonError('MISSING_BODY', 'Post body is empty.');
    }

    // Parse JSON from text/plain body
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'send') {
      return jsonResponse(addMessage(payload));
    }

    if (action === 'upload') {
      return jsonResponse(uploadImage(payload));
    }

    return jsonError('INVALID_ACTION', 'Action is invalid or not specified.');
  } catch (err) {
    return errorToResponse(err);
  }
}

/**
 * Map thrown Error("CODE: message") strings onto the JSON error envelope.
 */
function errorToResponse(err) {
  const errMsg = err.toString();
  let code = 'SERVER_ERROR';
  let message = errMsg;

  const match = errMsg.match(/Error:\s*([A-Z_]+):\s*(.*)/) || errMsg.match(/([A-Z_]+):\s*(.*)/);
  if (match) {
    code = match[1];
    message = match[2];
  }
  return jsonError(code, message.trim());
}
