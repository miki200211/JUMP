/**
 * API Service wrapper for Google Apps Script Web App endpoints.
 * Handles AJAX requests and click analytics beaconing.
 */
const api = {
  /**
   * Fetch configured redirect links
   */
  async getLinks() {
    try {
      const response = await fetch(`${CONFIG.API_BASE}?action=links`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('getLinks error:', err);
      return { ok: false, error: { code: 'NETWORK_ERROR', message: err.toString() } };
    }
  },

  /**
   * Fetch chat messages since a specific timestamp.
   * If since is null/omitted, fetches recent messages.
   */
  async getMessages(since) {
    try {
      let url = `${CONFIG.API_BASE}?action=messages`;
      if (since) {
        url += `&since=${since}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('getMessages error:', err);
      return { ok: false, error: { code: 'NETWORK_ERROR', message: err.toString() } };
    }
  },

  /**
   * Send a chat message.
   * Uses text/plain to bypass CORS preflight checks.
   */
  async sendMessage(nickname, text, fingerprint, messageId) {
    try {
      const payload = {
        action: 'send',
        id: messageId,
        nickname: nickname,
        text: text,
        fingerprint: fingerprint
      };

      const response = await fetch(CONFIG.API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('sendMessage error:', err);
      return { ok: false, error: { code: 'NETWORK_ERROR', message: err.toString() } };
    }
  },

  /**
   * Track link clicks asynchronously without blocking navigation.
   * Uses navigator.sendBeacon with text/plain body.
   */
  trackClick(linkId) {
    try {
      const payload = JSON.stringify({
        action: 'track',
        linkId: linkId,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      });

      const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
      return navigator.sendBeacon(CONFIG.API_BASE, blob);
    } catch (err) {
      console.error('trackClick error:', err);
      return false;
    }
  }
};
