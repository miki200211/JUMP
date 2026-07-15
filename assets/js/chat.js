/**
 * Chat Room Client Module
 * Nickname setup, incremental polling with backoff, optimistic sends,
 * rich-text rendering (clickable links + inline image/GIF embeds),
 * emoji/sticker composer, image uploads, and the online-users panel.
 */
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const messagesContainer = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const nicknameDisplay = document.getElementById('nickname-display');
  const changeNicknameBtn = document.getElementById('change-nickname-btn');
  const chatPanel = document.querySelector('.chat-panel');

  // Composer Elements
  const emojiBtn = document.getElementById('emoji-btn');
  const stickerBtn = document.getElementById('sticker-btn');
  const composerPopover = document.getElementById('composer-popover');
  const composerTabs = Array.from(document.querySelectorAll('.composer-tab'));
  const emojiGrid = document.getElementById('emoji-grid');
  const stickerGrid = document.getElementById('sticker-grid');
  const imageInput = document.getElementById('image-input');

  // Online Users Elements
  const onlineBtn = document.getElementById('online-btn');
  const onlinePopover = document.getElementById('online-popover');
  const onlineList = document.getElementById('online-list');

  // Lightbox Elements
  const lightboxOverlay = document.getElementById('lightbox-overlay');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxOpenLink = document.getElementById('lightbox-open-link');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');

  // Nickname Modal Elements
  const nicknameModal = document.getElementById('nickname-modal');
  const nicknameForm = document.getElementById('nickname-form');
  const nicknameInput = document.getElementById('nickname-input');
  const nicknameCloseBtn = document.getElementById('nickname-close-btn');

  // Application State
  let nickname = localStorage.getItem('chat_nickname') || '';
  let fingerprint = localStorage.getItem('chat_fingerprint') || '';
  let lastServerTs = 0;
  let pollTimeoutId = null;
  let currentPollInterval = CONFIG.POLL_INTERVAL_MS;
  let sentMessageIds = new Set(); // To prevent duplicates from optimistic updates
  let consecutiveErrors = 0; // To handle transient network glitches before backing off
  let onlineState = { count: 0, users: [] };

  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

  // Generate unique client fingerprint if not exists
  if (!fingerprint) {
    fingerprint = 'fp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('chat_fingerprint', fingerprint);
  }

  // ==================== Rendering: escape / linkify / embed ====================

  const URL_RE = /https?:\/\/[^\s<>"'`]+/g;
  const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp)([?#]\S*)?$/i;
  // Must match the backend's allowlist for uploaded media
  const MEDIA_URL_RE = /^https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]{20,100}$/;
  const TRAILING_PUNCT_RE = /[),.!?;:。，！？、」』）】]+$/;

  /**
   * Escape user content for interpolation into HTML.
   * Every user-controlled string passes through here exactly once.
   */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Older backend versions stored messages entity-encoded. Decode exactly
   * those six entities (&amp; last) so legacy rows render as typed.
   */
  function normalizeLegacyEntities(str) {
    if (!str) return '';
    return String(str)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&amp;/g, '&');
  }

  /**
   * Tokenize-then-escape pipeline: URLs become links (https image URLs become
   * inline embeds), every other segment is escaped as plain text. Escaping
   * after linkifying would corrupt URLs containing '&'; this order cannot.
   */
  function renderRichText(raw) {
    const text = normalizeLegacyEntities(raw || '');
    let html = '';
    let cursor = 0;

    for (const match of text.matchAll(URL_RE)) {
      let url = match[0];
      let trailing = '';
      const punct = url.match(TRAILING_PUNCT_RE);
      if (punct) {
        trailing = punct[0];
        url = url.slice(0, url.length - trailing.length);
      }

      html += escapeHTML(text.slice(cursor, match.index));
      html += urlToHtml(url);
      html += escapeHTML(trailing);
      cursor = match.index + match[0].length;
    }

    html += escapeHTML(text.slice(cursor));
    return html;
  }

  function urlToHtml(url) {
    const safeUrl = escapeHTML(url);
    // Only https image URLs embed (http would be mixed content on Pages)
    if (url.indexOf('https://') === 0 && IMAGE_URL_RE.test(url)) {
      return imageEmbedHtml(safeUrl);
    }
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
  }

  /** safeSrc must already be escaped by the caller. */
  function imageEmbedHtml(safeSrc) {
    return `<a href="${safeSrc}" class="chat-image-link" target="_blank" rel="noopener noreferrer">` +
      `<img class="chat-image" src="${safeSrc}" alt="圖片" loading="lazy" referrerpolicy="no-referrer"></a>`;
  }

  function videoEmbedHtml(safeSrc) {
    return `<video class="chat-video" src="${safeSrc}" controls preload="metadata" playsinline></video>`;
  }

  /**
   * Render a single message bubble into the container.
   * localPreviewUrl: blob: URL for our own optimistic image bubbles only —
   * never taken from server data.
   */
  function renderMessage(msg, isOptimistic = false, localPreviewUrl = '') {
    // Check if message already exists
    if (document.getElementById(`msg-${msg.id}`)) {
      return;
    }

    const type = msg.type === 'image' || msg.type === 'video' || msg.type === 'sticker' ? msg.type : 'text';
    const isOwnMessage = msg.nickname === nickname;
    const msgElement = document.createElement('div');
    msgElement.id = `msg-${msg.id}`;
    msgElement.className = `message message-type-${type} ${isOwnMessage ? 'message-own' : ''}`;

    if (isOptimistic) {
      msgElement.classList.add('message-sending');
    }

    let bodyHtml = '';
    if (type === 'sticker') {
      bodyHtml = `<div class="message-sticker">${escapeHTML(msg.text)}</div>`;
    } else if (type === 'image') {
      // Server-fed URLs must match the upload host allowlist; anything else
      // renders as a placeholder instead of an <img>.
      const src = localPreviewUrl || (MEDIA_URL_RE.test(msg.mediaUrl || '') ? msg.mediaUrl : '');
      bodyHtml = src ? imageEmbedHtml(escapeHTML(src)) : `<div class="message-text">[圖片]</div>`;
      if (msg.text) {
        bodyHtml += `<div class="message-text">${renderRichText(msg.text)}</div>`;
      }
    } else if (type === 'video') {
      const src = localPreviewUrl || (MEDIA_URL_RE.test(msg.mediaUrl || '') ? msg.mediaUrl : '');
      bodyHtml = src ? videoEmbedHtml(escapeHTML(src)) : `<div class="message-text">[影片]</div>`;
      if (msg.text) {
        bodyHtml += `<div class="message-text">${renderRichText(msg.text)}</div>`;
      }
    } else {
      bodyHtml = `<div class="message-text">${renderRichText(msg.text)}</div>`;
    }

    const timeStr = msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    msgElement.innerHTML = `
      <div class="message-bubble-wrapper">
        <div class="message-sender">${escapeHTML(normalizeLegacyEntities(msg.nickname))}</div>
        <div class="message-bubble">
          ${bodyHtml}
          <div class="message-meta">
            <span class="message-time">${timeStr}</span>
            ${isOptimistic ? '<span class="message-status-icon">...</span>' : ''}
          </div>
        </div>
      </div>
    `;

    msgElement.querySelectorAll('img.chat-image').forEach(attachImageBehaviors);

    messagesContainer.appendChild(msgElement);
    scrollToBottom();
  }

  /**
   * Lightbox on click; on load errors fall back lh3 → Drive thumbnail →
   * plain link, so a dead image URL never leaves a broken bubble.
   */
  function attachImageBehaviors(img) {
    img.addEventListener('load', scrollToBottom, { once: true });

    img.addEventListener('error', () => {
      const src = img.getAttribute('src') || '';
      if (src.indexOf('blob:') === 0) return; // local preview; upload flow owns this bubble

      const idMatch = src.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/);
      if (idMatch && !img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = 'https://drive.google.com/thumbnail?id=' + idMatch[1] + '&sz=w1600';
        return;
      }

      const link = img.closest('a.chat-image-link');
      if (link) {
        const fallbackLink = document.createElement('a');
        fallbackLink.href = link.href;
        fallbackLink.target = '_blank';
        fallbackLink.rel = 'noopener noreferrer';
        fallbackLink.textContent = link.href;
        link.replaceWith(fallbackLink);
      }
    });

    const link = img.closest('a.chat-image-link');
    if (link) {
      link.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return; // keep browser open-in-tab gestures
        e.preventDefault();
        openLightbox(img.currentSrc || img.src, link.href);
      });
    }
  }

  /**
   * Scroll messages viewport to bottom
   */
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ==================== Lightbox ====================

  function openLightbox(src, originalUrl) {
    if (!lightboxOverlay) return;
    lightboxImage.src = src;
    lightboxOpenLink.href = originalUrl || src;
    lightboxOverlay.classList.add('active');
  }

  function closeLightbox() {
    if (!lightboxOverlay) return;
    lightboxOverlay.classList.remove('active');
    lightboxImage.src = '';
  }

  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', closeLightbox);
  }
  if (lightboxOverlay) {
    lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === lightboxOverlay) closeLightbox();
    });
  }

  // ==================== Nickname ====================

  function setNickname(newNick) {
    nickname = newNick.trim();
    localStorage.setItem('chat_nickname', nickname);
    if (nicknameDisplay) {
      nicknameDisplay.textContent = nickname;
    }
  }

  function showNicknameModal(canClose = true) {
    if (!nicknameModal) return;
    nicknameInput.value = nickname;
    nicknameModal.classList.add('active');

    // Hide close button if nickname is empty (initial force setup)
    if (nicknameCloseBtn) {
      nicknameCloseBtn.style.display = canClose ? 'block' : 'none';
    }
  }

  function hideNicknameModal() {
    if (nicknameModal) {
      nicknameModal.classList.remove('active');
    }
  }

  function requireNickname() {
    if (!nickname) {
      showNicknameModal(false);
      return false;
    }
    return true;
  }

  if (nicknameForm) {
    nicknameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = nicknameInput.value.trim();
      if (value.length < 1 || value.length > 20) {
        alert('暱稱必須在 1 到 20 個字元之間');
        return;
      }
      setNickname(value);
      hideNicknameModal();

      // Start polling if it was not running
      if (!pollTimeoutId) {
        startPolling();
      }
    });
  }

  if (changeNicknameBtn) {
    changeNicknameBtn.addEventListener('click', () => showNicknameModal(true));
  }
  if (nicknameCloseBtn) {
    nicknameCloseBtn.addEventListener('click', hideNicknameModal);
  }

  // Prompt nickname on startup if not set
  if (!nickname) {
    showNicknameModal(false);
  } else {
    setNickname(nickname);
  }

  // ==================== Sending ====================

  function createTempId() {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  function finalizeSentBubble(bubble, serverData, tempId) {
    if (!bubble) return;
    bubble.classList.remove('message-sending');
    const icon = bubble.querySelector('.message-status-icon');
    if (icon) icon.remove();

    // Update temp ID to actual DB ID
    if (serverData.id && serverData.id !== tempId) {
      bubble.id = `msg-${serverData.id}`;
      sentMessageIds.add(serverData.id);
    }
  }

  function markBubbleFailed(bubble, label) {
    if (!bubble) return;
    bubble.classList.remove('message-sending', 'message-uploading');
    bubble.classList.add('message-failed');
    const icon = bubble.querySelector('.message-status-icon');
    if (icon) icon.textContent = label;
  }

  /**
   * Optimistic sending: render message immediately, trigger API call
   */
  async function handleSendMessage(text, type = 'text', mediaUrl = '') {
    const tempId = createTempId();
    const tempMsg = {
      id: tempId,
      ts: Date.now(),
      nickname: nickname,
      text: text,
      type: type,
      mediaUrl: mediaUrl
    };

    // Render grayed out bubble
    renderMessage(tempMsg, true);
    sentMessageIds.add(tempId);

    const response = await api.sendMessage(nickname, text, fingerprint, tempId, type, mediaUrl);
    const bubble = document.getElementById(`msg-${tempId}`);

    if (response && response.ok && response.data) {
      finalizeSentBubble(bubble, response.data, tempId);
      currentPollInterval = CONFIG.POLL_INTERVAL_MS; // reset error backoff
      return true;
    }

    markBubbleFailed(bubble, '⚠️ 傳送失敗');
    if (response && response.error && response.error.code === 'RATE_LIMITED') {
      alert('傳送速度過快，請間隔 3 秒再試。');
    }
    return false;
  }

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!requireNickname()) return;

      const text = chatInput.value.trim();
      if (!text) return;
      if (text.length > 500) {
        alert('訊息內容不可超過 500 字元');
        return;
      }

      chatInput.value = '';
      autoGrowInput();
      handleSendMessage(text, 'text');
    });
  }

  // ==================== Image upload flow ====================

  function userError(message) {
    const err = new Error(message);
    err.userMessage = message;
    return err;
  }

  async function handleImageFile(file) {
    if (!file) return;
    if (!requireNickname()) return;

    const mime = (file.type || '').toLowerCase();
    const isImage = SUPPORTED_IMAGE_TYPES.indexOf(mime) !== -1;
    const isVideo = SUPPORTED_VIDEO_TYPES.indexOf(mime) !== -1;

    if (!isImage && !isVideo) {
      alert('僅支援 JPG / PNG / GIF / WebP 圖片與 MP4 / WebM / OGG 影片');
      return;
    }

    let prepared;
    try {
      if (isImage) {
        prepared = await prepareImageForUpload(file, mime);
      } else {
        if (file.size > CONFIG.UPLOAD_MAX_RAW_BYTES) {
          throw userError('影片檔案過大（上限 4MB），請換一個。');
        }
        prepared = {
          base64: await blobToBase64(file),
          mimeType: mime,
          previewBlob: file
        };
      }
    } catch (err) {
      alert(err && err.userMessage ? err.userMessage : '檔案處理失敗，請換一個試試。');
      return;
    }

    // Optimistic bubble with a local blob preview + spinner overlay
    const previewUrl = URL.createObjectURL(prepared.previewBlob);
    const tempId = createTempId();
    const type = isVideo ? 'video' : 'image';
    renderMessage(
      { id: tempId, ts: Date.now(), nickname: nickname, text: '', type: type, mediaUrl: '' },
      true,
      previewUrl
    );
    sentMessageIds.add(tempId);

    const bubble = document.getElementById(`msg-${tempId}`);
    if (bubble) bubble.classList.add('message-uploading');
    const icon = bubble ? bubble.querySelector('.message-status-icon') : null;
    if (icon) icon.textContent = '上傳中…';

    const uploadRes = await api.uploadImage(prepared.base64, prepared.mimeType, fingerprint);
    if (!(uploadRes && uploadRes.ok && uploadRes.data && uploadRes.data.url)) {
      markBubbleFailed(bubble, '⚠️ 上傳失敗');
      const code = uploadRes && uploadRes.error && uploadRes.error.code;
      if (code === 'RATE_LIMITED') {
        alert('上傳過於頻繁，請稍候 10 秒再試。');
      } else if (code === 'PAYLOAD_TOO_LARGE') {
        alert('檔案過大（上限 4MB）。');
      } else if (code === 'UNSUPPORTED_TYPE') {
        alert('僅支援 JPG / PNG / GIF / WebP 圖片與 MP4 / WebM / OGG 影片');
      }
      return;
    }

    if (bubble) bubble.classList.remove('message-uploading');
    if (icon) icon.textContent = '...';
    const mediaUrl = uploadRes.data.url;

    const sendRes = await api.sendMessage(nickname, '', fingerprint, tempId, type, mediaUrl);
    if (sendRes && sendRes.ok && sendRes.data) {
      finalizeSentBubble(bubble, sendRes.data, tempId);
      // Keep showing the local preview (instant, already decoded); just point
      // the link/lightbox at the hosted copy for this session.
      if (type === 'image') {
        const link = bubble ? bubble.querySelector('a.chat-image-link') : null;
        if (link) link.href = mediaUrl;
      } else {
        const video = bubble ? bubble.querySelector('video.chat-video') : null;
        if (video) video.src = mediaUrl;
      }
      currentPollInterval = CONFIG.POLL_INTERVAL_MS;
    } else {
      markBubbleFailed(bubble, '⚠️ 傳送失敗');
      if (sendRes && sendRes.error && sendRes.error.code === 'RATE_LIMITED') {
        alert('傳送速度過快，請間隔 3 秒再試。');
      }
    }
  }

  /**
   * GIFs upload as-is (re-encoding would drop the animation) under a hard
   * size cap. Small stills upload untouched; large ones downscale to JPEG.
   * Returns { base64, mimeType, previewBlob }.
   */
  async function prepareImageForUpload(file, mime) {
    const maxBytes = CONFIG.UPLOAD_MAX_RAW_BYTES;

    if (mime === 'image/gif') {
      if (file.size > maxBytes) {
        throw userError('GIF 檔案過大（上限 4MB），請換一張。');
      }
      return { base64: await blobToBase64(file), mimeType: mime, previewBlob: file };
    }

    // Small enough and within dimensions: upload original bytes (keeps PNG transparency)
    if (file.size <= 1048576) {
      const dims = await readImageDimensions(file);
      if (dims.width <= CONFIG.IMAGE_MAX_DIMENSION && dims.height <= CONFIG.IMAGE_MAX_DIMENSION) {
        return { base64: await blobToBase64(file), mimeType: mime, previewBlob: file };
      }
    }

    let blob = await downscaleImage(file, CONFIG.IMAGE_MAX_DIMENSION, CONFIG.IMAGE_JPEG_QUALITY);
    if (blob.size > maxBytes) {
      blob = await downscaleImage(file, CONFIG.IMAGE_MAX_DIMENSION, 0.7);
    }
    if (blob.size > maxBytes) {
      throw userError('圖片壓縮後仍超過 4MB，請換一張。');
    }
    return { base64: await blobToBase64(blob), mimeType: 'image/jpeg', previewBlob: blob };
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.slice(result.indexOf(',') + 1)); // strip the data:...;base64, prefix
      };
      reader.onerror = () => reject(userError('讀取圖片失敗，請重試。'));
      reader.readAsDataURL(blob);
    });
  }

  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(userError('無法解析這張圖片，請換一張。'));
      };
      img.src = url;
    });
  }

  async function readImageDimensions(file) {
    const { img, url } = await loadImageElement(file);
    const dims = { width: img.naturalWidth, height: img.naturalHeight };
    URL.revokeObjectURL(url);
    return dims;
  }

  async function downscaleImage(file, maxDimension, quality) {
    const { img, url } = await loadImageElement(file);
    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

    const ctx = canvas.getContext('2d');
    // JPEG has no alpha channel — composite transparency onto white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(userError('圖片壓縮失敗，請重試。'))),
        'image/jpeg',
        quality
      );
    });
  }

  // Upload entry point 1: file picker
  if (imageInput) {
    imageInput.addEventListener('change', () => {
      const file = imageInput.files && imageInput.files[0];
      imageInput.value = ''; // allow picking the same file again
      if (file) handleImageFile(file);
    });
  }

  // Upload entry point 2: paste image/video from clipboard
  if (chatInput) {
    chatInput.addEventListener('paste', (e) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && (item.type.indexOf('image/') === 0 || item.type.indexOf('video/') === 0)) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageFile(file);
          return;
        }
      }
    });
  }

  // Upload entry point 3: drag & drop onto the chat panel
  if (chatPanel) {
    let dragDepth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') !== -1;

    chatPanel.addEventListener('dragenter', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth++;
      chatPanel.classList.add('drop-active');
    });
    chatPanel.addEventListener('dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    });
    chatPanel.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) chatPanel.classList.remove('drop-active');
    });
    chatPanel.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      chatPanel.classList.remove('drop-active');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    });
  }

  // ==================== Composer: textarea / emoji / stickers ====================

  function autoGrowInput() {
    if (!chatInput) return;
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  }

  if (chatInput) {
    chatInput.addEventListener('input', autoGrowInput);
    chatInput.addEventListener('keydown', (e) => {
      // Enter sends, Shift+Enter breaks a line; 229 = IME composition in progress
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        chatForm.requestSubmit();
      }
    });
  }

  function insertAtCaret(text) {
    chatInput.focus();
    const start = chatInput.selectionStart != null ? chatInput.selectionStart : chatInput.value.length;
    const end = chatInput.selectionEnd != null ? chatInput.selectionEnd : chatInput.value.length;
    chatInput.setRangeText(text, start, end, 'end');
    autoGrowInput();
  }

  function populateComposerGrids() {
    const emojis = typeof EMOJI_LIST !== 'undefined' ? EMOJI_LIST : [];
    const stickers = typeof STICKER_LIST !== 'undefined' ? STICKER_LIST : [];

    emojis.forEach((emoji) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-item';
      btn.textContent = emoji;
      btn.addEventListener('click', () => insertAtCaret(emoji));
      emojiGrid.appendChild(btn);
    });

    stickers.forEach((sticker) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sticker-item';
      btn.textContent = sticker;
      btn.addEventListener('click', () => {
        hideComposerPopover();
        if (!requireNickname()) return;
        handleSendMessage(sticker, 'sticker');
      });
      stickerGrid.appendChild(btn);
    });
  }

  function activeComposerTab() {
    const active = composerTabs.find((tab) => tab.classList.contains('active'));
    return active ? active.dataset.tab : 'emoji';
  }

  function switchComposerTab(tab) {
    composerTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
    emojiGrid.hidden = tab !== 'emoji';
    stickerGrid.hidden = tab !== 'sticker';
  }

  function toggleComposerPopover(tab) {
    if (!composerPopover.hidden && activeComposerTab() === tab) {
      hideComposerPopover();
      return;
    }
    switchComposerTab(tab);
    composerPopover.hidden = false;
  }

  function hideComposerPopover() {
    if (composerPopover) composerPopover.hidden = true;
  }

  if (emojiBtn) emojiBtn.addEventListener('click', () => toggleComposerPopover('emoji'));
  if (stickerBtn) stickerBtn.addEventListener('click', () => toggleComposerPopover('sticker'));
  composerTabs.forEach((btn) => btn.addEventListener('click', () => switchComposerTab(btn.dataset.tab)));

  populateComposerGrids();

  // ==================== Online users panel ====================

  function updateOnlineUI(online) {
    onlineState = online && typeof online.count === 'number' ? online : { count: 0, users: [] };
    if (!onlineBtn) return;

    if (onlineState.count > 0) {
      onlineBtn.textContent = `🟢 ${onlineState.count} 人在線`;
      onlineBtn.hidden = false;
    } else {
      onlineBtn.hidden = true;
      hideOnlinePopover();
    }

    if (onlinePopover && !onlinePopover.hidden) {
      renderOnlineList();
    }
  }

  function setOnlineUnavailable() {
    if (onlineBtn) onlineBtn.hidden = true;
    hideOnlinePopover();
  }

  function renderOnlineList() {
    if (!onlineList) return;
    onlineList.textContent = '';
    const users = onlineState.users || [];

    users.forEach((name) => {
      const li = document.createElement('li');
      if (name === nickname) {
        li.classList.add('online-self');
        li.textContent = `${name}（你）`;
      } else {
        li.textContent = name;
      }
      onlineList.appendChild(li);
    });

    const anonymous = onlineState.count - users.length;
    if (anonymous > 0) {
      const li = document.createElement('li');
      li.className = 'online-anonymous';
      li.textContent = `…及 ${anonymous} 位匿名訪客`;
      onlineList.appendChild(li);
    }

    if (!onlineList.children.length) {
      const li = document.createElement('li');
      li.className = 'online-anonymous';
      li.textContent = '目前只有你在線上';
      onlineList.appendChild(li);
    }
  }

  function hideOnlinePopover() {
    if (onlinePopover) onlinePopover.hidden = true;
    if (onlineBtn) onlineBtn.setAttribute('aria-expanded', 'false');
  }

  if (onlineBtn) {
    onlineBtn.addEventListener('click', () => {
      if (onlinePopover.hidden) {
        renderOnlineList();
        onlinePopover.hidden = false;
        onlineBtn.setAttribute('aria-expanded', 'true');
      } else {
        hideOnlinePopover();
      }
    });
  }

  // Close popovers when clicking elsewhere / pressing Escape
  document.addEventListener('click', (e) => {
    if (composerPopover && !composerPopover.hidden &&
        !composerPopover.contains(e.target) &&
        e.target !== emojiBtn && e.target !== stickerBtn) {
      hideComposerPopover();
    }
    if (onlinePopover && !onlinePopover.hidden &&
        !onlinePopover.contains(e.target) &&
        e.target !== onlineBtn) {
      hideOnlinePopover();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideComposerPopover();
      hideOnlinePopover();
      closeLightbox();
    }
  });

  // ==================== Polling ====================

  async function pollMessages() {
    // Skip polling if document is hidden or if API_BASE is placeholder
    if (document.hidden || CONFIG.API_BASE.includes('YOUR_DEPLOYMENT_ID')) {
      scheduleNextPoll();
      return;
    }

    const statusDot = document.querySelector('.user-avatar-dot');
    const res = await api.getMessages(lastServerTs, fingerprint, nickname);

    if (res && res.ok && res.data) {
      consecutiveErrors = 0; // reset error count
      if (statusDot) {
        statusDot.classList.remove('offline', 'connecting');
        statusDot.title = '連線正常';
      }

      // Online users (new backend sends {count, users}; fall back to the
      // legacy onlineCount field during rollout)
      updateOnlineUI(res.data.online || { count: res.data.onlineCount || 0, users: [] });

      // Reset polling interval
      currentPollInterval = CONFIG.POLL_INTERVAL_MS;

      const messages = res.data.messages || [];
      messages.forEach((msg) => {
        // Skip messages we optimistically sent and verified ourselves
        if (sentMessageIds.has(msg.id)) return;
        renderMessage(msg, false);
      });

      if (res.data.serverTs) {
        lastServerTs = res.data.serverTs;
      }
    } else {
      consecutiveErrors++;
      if (statusDot) {
        if (consecutiveErrors >= 3) {
          statusDot.classList.add('offline');
          statusDot.classList.remove('connecting');
          statusDot.title = '連線失敗，請檢查網路連線。';
          setOnlineUnavailable();
        } else {
          statusDot.classList.add('connecting');
          statusDot.classList.remove('offline');
          statusDot.title = `連線不穩定，正在重試 (第 ${consecutiveErrors} 次)...`;
        }
      }

      // Stable error retry system
      if (consecutiveErrors <= 2) {
        currentPollInterval = 2000; // Fast retry
        console.warn(`Transient polling error. Quick retrying in 2s (Attempt ${consecutiveErrors})...`);
      } else {
        currentPollInterval = Math.min(
          currentPollInterval * 1.5,
          CONFIG.RETRY_DELAY_MAX_MS
        );
        console.warn(`Persistent polling error. Backoff interval set to: ${currentPollInterval}ms`);
      }
    }

    scheduleNextPoll();
  }

  function scheduleNextPoll() {
    if (pollTimeoutId) clearTimeout(pollTimeoutId);
    pollTimeoutId = setTimeout(pollMessages, currentPollInterval);
  }

  function startPolling() {
    const statusDot = document.querySelector('.user-avatar-dot');
    if (statusDot && !CONFIG.API_BASE.includes('YOUR_DEPLOYMENT_ID')) {
      statusDot.classList.add('connecting');
      statusDot.title = '連線中...';
    }
    if (pollTimeoutId) clearTimeout(pollTimeoutId);
    pollTimeoutId = setTimeout(pollMessages, 500); // quick first check
  }

  // Handle Visibility API to pause polling on hidden tab
  document.addEventListener('visibilitychange', () => {
    const statusDot = document.querySelector('.user-avatar-dot');
    if (document.hidden) {
      console.log('Tab hidden. Polling paused.');
      if (statusDot) {
        statusDot.classList.add('connecting');
        statusDot.title = '已暫停輪詢';
      }
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
        pollTimeoutId = null;
      }
    } else {
      console.log('Tab active. Polling resumed.');
      startPolling();
    }
  });

  // Start initial polling if nickname is set
  if (nickname) {
    startPolling();
  }
});
