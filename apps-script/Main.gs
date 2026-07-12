/**
 * GET Entrypoint
 * Handles:
 * - action=links : Fetch social links
 * - action=messages : Fetch chat messages
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'links') {
      const links = getLinks();
      return jsonResponse({ links: links });
    }
    
    if (action === 'messages') {
      const since = e.parameter.since ? parseInt(e.parameter.since, 10) : null;
      const fingerprint = e.parameter.fingerprint || 'anonymous';
      const result = fetchMessages(since, fingerprint);
      return jsonResponse(result);
    }
    
    return jsonError('INVALID_ACTION', 'Action is invalid or not specified.');
  } catch (err) {
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
}

/**
 * POST Entrypoint
 * Handles simple requests (Content-Type: text/plain) to avoid CORS preflight.
 * Payload: { action: 'send', nickname: '...', text: '...' }
 * Payload: { action: 'track', linkId: '...' }
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
      const result = addMessage(payload.nickname, payload.text, e);
      return jsonResponse(result);
    }
    
    if (action === 'track') {
      const result = recordClick(payload.linkId, e);
      return jsonResponse(result);
    }
    
    return jsonError('INVALID_ACTION', 'Action is invalid or not specified.');
  } catch (err) {
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
}
