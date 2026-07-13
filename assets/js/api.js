/**
 * API Service wrapper for Google Apps Script Web App endpoints.
 * POST bodies use Content-Type text/plain so requests stay CORS "simple
 * requests" — Apps Script cannot answer a preflight OPTIONS.
 */
const api = {
  async getMessages(since, fingerprint, nickname) {
    try {
      let url = `${CONFIG.API_BASE}?action=messages`;
      if (since) {
        url += `&since=${since}`;
      }
      if (fingerprint) {
        url += `&fingerprint=${encodeURIComponent(fingerprint)}`;
      }
      if (nickname) {
        url += `&nickname=${encodeURIComponent(nickname)}`;
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
   * Send a chat message. type: 'text' | 'image' | 'sticker'.
   * mediaUrl is only set on image messages (URL returned by uploadImage).
   */
  async sendMessage(nickname, text, fingerprint, messageId, type = 'text', mediaUrl = '') {
    try {
      const payload = {
        action: 'send',
        id: messageId,
        nickname: nickname,
        text: text,
        type: type,
        mediaUrl: mediaUrl,
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
   * Upload an image/GIF as base64 (without the data: prefix).
   * Returns { ok, data: { fileId, url, bytes } } on success.
   */
  async uploadImage(base64Data, mimeType, fingerprint) {
    try {
      const payload = {
        action: 'upload',
        data: base64Data,
        mimeType: mimeType,
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
      console.error('uploadImage error:', err);
      return { ok: false, error: { code: 'NETWORK_ERROR', message: err.toString() } };
    }
  }
};
