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
      const result = fetchMessages(since);
      return jsonResponse(result);
    }
    
    return jsonError('INVALID_ACTION', 'Action is invalid or not specified.');
  } catch (err) {
    return jsonError('SERVER_ERROR', err.toString());
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
    return jsonError('SERVER_ERROR', err.toString());
  }
}
