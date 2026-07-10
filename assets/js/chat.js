/**
 * Chat Room Client Module
 * Handles nickname setup, incremental polling with backoff, optimistic UI updates, and visibility-aware sync.
 */
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const messagesContainer = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const nicknameDisplay = document.getElementById('nickname-display');
  const changeNicknameBtn = document.getElementById('change-nickname-btn');
  
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

  // Generate unique client fingerprint if not exists
  if (!fingerprint) {
    fingerprint = 'fp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('chat_fingerprint', fingerprint);
  }

  /**
   * Helper to escape HTML tags to prevent XSS
   */
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Update Nickname in State and Header UI
   */
  function setNickname(newNick) {
    nickname = newNick.trim();
    localStorage.setItem('chat_nickname', nickname);
    if (nicknameDisplay) {
      nicknameDisplay.textContent = nickname;
    }
  }

  /**
   * Show Nickname Dialog
   */
  function showNicknameModal(canClose = true) {
    if (!nicknameModal) return;
    nicknameInput.value = nickname;
    nicknameModal.classList.add('active');
    
    // Hide close button if nickname is empty (initial force setup)
    if (nicknameCloseBtn) {
      nicknameCloseBtn.style.display = canClose ? 'block' : 'none';
    }
  }

  /**
   * Hide Nickname Dialog
   */
  function hideNicknameModal() {
    if (nicknameModal) {
      nicknameModal.classList.remove('active');
    }
  }

  // Handle Nickname Form Submit
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

  // Change nickname trigger
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

  /**
   * Render a single message bubble into the container
   */
  function renderMessage(msg, isOptimistic = false) {
    // Check if message already exists
    if (document.getElementById(`msg-${msg.id}`)) {
      return;
    }

    const isOwnMessage = msg.nickname === nickname;
    const msgElement = document.createElement('div');
    msgElement.id = `msg-${msg.id}`;
    msgElement.className = `message ${isOwnMessage ? 'message-own' : ''}`;
    
    if (isOptimistic) {
      msgElement.classList.add('message-sending');
    }

    const timeStr = msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    msgElement.innerHTML = `
      <div class="message-bubble-wrapper">
        <div class="message-sender">${escapeHTML(msg.nickname)}</div>
        <div class="message-bubble">
          <div class="message-text">${escapeHTML(msg.text)}</div>
          <div class="message-meta">
            <span class="message-time">${timeStr}</span>
            ${isOptimistic ? '<span class="message-status-icon">...</span>' : ''}
          </div>
        </div>
      </div>
    `;

    messagesContainer.appendChild(msgElement);
    scrollToBottom();
  }

  /**
   * Scroll messages viewport to bottom
   */
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Optimistic sending: render message immediately, trigger API call
   */
  async function handleSendMessage(text) {
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const tempMsg = {
      id: tempId,
      ts: Date.now(),
      nickname: nickname,
      text: text
    };

    // Render grayed out bubble
    renderMessage(tempMsg, true);
    sentMessageIds.add(tempId);

    // Call API
    const response = await api.sendMessage(nickname, text, fingerprint, tempId);
    
    const tempBubble = document.getElementById(`msg-${tempId}`);
    if (response && response.ok && response.data) {
      // Success: transform to active style
      if (tempBubble) {
        tempBubble.classList.remove('message-sending');
        const icon = tempBubble.querySelector('.message-status-icon');
        if (icon) icon.remove();
        
        // Update temp ID to actual DB ID
        if (response.data.id && response.data.id !== tempId) {
          tempBubble.id = `msg-${response.data.id}`;
          sentMessageIds.add(response.data.id);
        }
      }
      currentPollInterval = CONFIG.POLL_INTERVAL_MS; // reset error backoff
    } else {
      // Fail
      if (tempBubble) {
        tempBubble.classList.remove('message-sending');
        tempBubble.classList.add('message-failed');
        const icon = tempBubble.querySelector('.message-status-icon');
        if (icon) icon.textContent = '⚠️ 傳送失敗';
        
        // Show rate-limit message if applicable
        if (response && response.error && response.error.code === 'RATE_LIMITED') {
          alert('傳送速度過快，請間隔 3 秒再試。');
        }
      }
    }
  }

  // Handle Form submission
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (!nickname) {
        showNicknameModal(false);
        return;
      }

      const text = chatInput.value.trim();
      if (!text) return;
      if (text.length > 500) {
        alert('訊息內容不可超過 500 字元');
        return;
      }

      chatInput.value = '';
      handleSendMessage(text);
    });
  }

  /**
   * Recurrent Polling Function
   */
  async function pollMessages() {
    // Skip polling if document is hidden or if API_BASE is placeholder
    if (document.hidden || CONFIG.API_BASE.includes('YOUR_DEPLOYMENT_ID')) {
      scheduleNextPoll();
      return;
    }

    const res = await api.getMessages(lastServerTs);
    
    if (res && res.ok && res.data) {
      // Reset exponential backoff
      currentPollInterval = CONFIG.POLL_INTERVAL_MS;

      const messages = res.data.messages || [];
      if (messages.length > 0) {
        messages.forEach(msg => {
          // Skip messages we optimistically sent and verified ourselves
          if (sentMessageIds.has(msg.id)) return;
          renderMessage(msg, false);
        });
      }
      
      if (res.data.serverTs) {
        lastServerTs = res.data.serverTs;
      }
    } else {
      // Exponential backoff on network errors
      currentPollInterval = Math.min(
        currentPollInterval * 1.5,
        CONFIG.RETRY_DELAY_MAX_MS
      );
      console.warn(`Polling error. Backoff interval set to: ${currentPollInterval}ms`);
    }

    scheduleNextPoll();
  }

  function scheduleNextPoll() {
    if (pollTimeoutId) clearTimeout(pollTimeoutId);
    pollTimeoutId = setTimeout(pollMessages, currentPollInterval);
  }

  function startPolling() {
    if (pollTimeoutId) clearTimeout(pollTimeoutId);
    pollTimeoutId = setTimeout(pollMessages, 500); // quick first check
  }

  // Handle Visibility API to pause polling on hidden tab
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('Tab hidden. Polling paused.');
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
