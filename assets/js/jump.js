/**
 * Embedded Media Hub Component
 * Handles tab switching, dynamic iframe URL parsing, and action tracking.
 */
document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('media-viewport');
  const externalLink = document.getElementById('external-app-link');
  const tabs = document.querySelectorAll('.media-tab');

  if (!viewport) return;

  // Fallback defaults if API configuration fails
  const DEFAULT_LINKS = [
    {
      id: 'youtube',
      label: 'YouTube',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Default Lofi Girl stream
      enabled: true
    },
    {
      id: 'instagram',
      label: 'Instagram',
      url: 'https://www.instagram.com/p/CG4t_SgnV2x/', // Instagram official post
      enabled: true
    },
    {
      id: 'facebook',
      label: 'Facebook',
      url: 'https://www.facebook.com/facebook', // Facebook page
      enabled: true
    }
  ];

  let linksData = [];
  let currentPlatform = 'youtube';

  /**
   * Parse profile/video/post links to their respective embeddable iframe URLs
   */
  function getEmbedUrl(platform, configUrl) {
    if (!configUrl) return '';

    if (platform === 'youtube') {
      let videoId = '';
      // Watch URL: watch?v=VIDEO_ID
      const watchMatch = configUrl.match(/[?&]v=([^&#]+)/);
      if (watchMatch) {
        videoId = watchMatch[1];
      } else {
        // Short URL: youtu.be/VIDEO_ID
        const shortMatch = configUrl.match(/youtu\.be\/([^&#?]+)/);
        if (shortMatch) {
          videoId = shortMatch[1];
        } else {
          // Shorts URL: shorts/VIDEO_ID
          const shortsMatch = configUrl.match(/shorts\/([^&#?]+)/);
          if (shortsMatch) {
            videoId = shortsMatch[1];
          } else {
            // Embed URL: embed/VIDEO_ID
            const embedMatch = configUrl.match(/embed\/([^&#?]+)/);
            if (embedMatch) {
              videoId = embedMatch[1];
            }
          }
        }
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
      }
      
      // Fallback if it is a channel link (YouTube doesn't allow profile iframes)
      return 'https://www.youtube.com/embed/jfKfPfyJRdk';
    }

    if (platform === 'facebook') {
      // Use official Meta Page Plugin URL
      const encodedUrl = encodeURIComponent(configUrl);
      return `https://www.facebook.com/plugins/page.php?href=${encodedUrl}&tabs=timeline&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false&height=400`;
    }

    if (platform === 'instagram') {
      // Check if it's a post or reel path
      const postMatch = configUrl.match(/\/(p|reel)\/([^/?#]+)/);
      if (postMatch) {
        const postId = postMatch[2];
        return `https://www.instagram.com/p/${postId}/embed`;
      }
      
      // Fallback post if configUrl is just a profile link (Instagram blocks profile iframes)
      return 'https://www.instagram.com/p/CG4t_SgnV2x/embed';
    }

    return configUrl;
  }

  /**
   * Load active platform iframe into the viewport
   */
  function renderActivePlatform() {
    const linkInfo = linksData.find(l => l.id === currentPlatform);
    if (!linkInfo || linkInfo.enabled === false) {
      viewport.innerHTML = `<p class="error-msg" style="padding:2rem;color:var(--text-secondary);">該平台目前處於停用狀態。</p>`;
      return;
    }

    viewport.innerHTML = `
      <div class="spinner"></div>
      <p style="margin-top:1rem;font-size:0.9rem;color:var(--text-secondary);">載入播放器中...</p>
    `;

    const embedUrl = getEmbedUrl(currentPlatform, linkInfo.url);

    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.style.opacity = '0';
    iframe.style.transition = 'opacity 0.3s ease';

    // Fade-in when fully loaded
    iframe.onload = () => {
      iframe.style.opacity = '1';
      const spinner = viewport.querySelector('.spinner');
      const text = viewport.querySelector('p');
      if (spinner) spinner.remove();
      if (text) text.remove();
    };

    viewport.innerHTML = '';
    viewport.appendChild(iframe);

    // Configure external button links & action beacons
    if (externalLink) {
      externalLink.href = linkInfo.url;
      externalLink.textContent = `在 ${linkInfo.label || currentPlatform.toUpperCase()} 開啟`;
      
      // Click analytics tracker
      externalLink.onclick = () => {
        api.trackClick(currentPlatform);
      };
    }
  }

  // Setup tab event handlers
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      currentPlatform = tab.getAttribute('data-platform');
      renderActivePlatform();
    });
  });

  /**
   * Initialize Media Hub configurations
   */
  async function initMediaHub() {
    if (CONFIG.API_BASE.includes('YOUR_DEPLOYMENT_ID')) {
      console.warn('API_BASE is the default placeholder. Using client-side fallbacks.');
      linksData = DEFAULT_LINKS;
      renderActivePlatform();
      return;
    }

    const res = await api.getLinks();
    if (res && res.ok && res.data && res.data.links) {
      linksData = res.data.links;
    } else {
      console.error('Failed to load links from API, loading client fallbacks.');
      linksData = DEFAULT_LINKS;
    }
    renderActivePlatform();
  }

  // Top-Level Navigation Tab Switcher
  const mainTabs = document.querySelectorAll('.main-nav-tab');
  const viewPanels = document.querySelectorAll('.view-panel');

  mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mainTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const targetView = tab.getAttribute('data-tab');
      viewPanels.forEach(panel => {
        if (panel.id === targetView) {
          panel.classList.add('active');
          panel.style.display = 'flex';
          
          // Trigger scroll-to-bottom if switching back to chat view
          if (targetView === 'chat-view') {
            const chatMsgs = document.getElementById('chat-messages');
            if (chatMsgs) {
              chatMsgs.scrollTop = chatMsgs.scrollHeight;
            }
          }
        } else {
          panel.classList.remove('active');
          panel.style.display = 'none';
        }
      });
    });
  });

  initMediaHub();
});
