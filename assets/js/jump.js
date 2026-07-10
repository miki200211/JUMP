/**
 * Gateway Jump Link Component
 * Handles dynamic rendering of platform cards and analytics tracking.
 */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('jump-links-container');
  if (!container) return;

  const DEFAULT_LINKS = [
    {
      id: 'youtube',
      label: 'YouTube 頻道',
      url: 'https://www.youtube.com/',
      icon: 'yt.svg'
    },
    {
      id: 'instagram',
      label: 'Instagram',
      url: 'https://www.instagram.com/',
      icon: 'ig.svg'
    },
    {
      id: 'facebook',
      label: 'Facebook',
      url: 'https://www.facebook.com/',
      icon: 'fb.svg'
    }
  ];

  /**
   * Render link cards to DOM
   */
  function renderLinks(links) {
    container.innerHTML = '';
    
    links.forEach(link => {
      if (link.enabled === false) return;

      const card = document.createElement('a');
      card.className = 'jump-card';
      card.href = link.url;
      card.target = '_blank';
      card.setAttribute('rel', 'noopener noreferrer');
      card.setAttribute('data-id', link.id);
      
      // Attempt deep linking on mobile platforms
      if (link.appScheme && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        card.addEventListener('click', (e) => {
          // If app scheme works, browser opens it, otherwise fallback target="_blank" handles it
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = link.appScheme;
          document.body.appendChild(iframe);
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 500);
        });
      }

      card.innerHTML = `
        <div class="card-icon">
          <img src="assets/img/icons/${link.icon}" alt="${link.label} Icon" onerror="this.src='https://img.icons8.com/color/48/000000/link.png';">
        </div>
        <div class="card-info">
          <h3>${link.label}</h3>
          <p>開啟官方應用程式或網站</p>
        </div>
        <div class="card-arrow">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      `;

      container.appendChild(card);
    });
  }

  /**
   * Initialize links: Try API first, fallback to defaults if config placeholder or API fails
   */
  async function initLinks() {
    container.innerHTML = `
      <div class="links-loading">
        <div class="spinner"></div>
        <p>載入社群入口中...</p>
      </div>
    `;

    if (CONFIG.API_BASE.includes('YOUR_DEPLOYMENT_ID')) {
      console.warn('API_BASE is using the default placeholder. Using client-side fallbacks.');
      renderLinks(DEFAULT_LINKS);
      return;
    }

    const res = await api.getLinks();
    if (res && res.ok && res.data && res.data.links) {
      renderLinks(res.data.links);
    } else {
      console.error('API links loading failed. Falling back to default list.');
      renderLinks(DEFAULT_LINKS);
    }
  }

  // Event Delegation for tracking clicks
  container.addEventListener('click', (e) => {
    const card = e.target.closest('.jump-card');
    if (card) {
      const linkId = card.getAttribute('data-id');
      if (linkId) {
        api.trackClick(linkId);
      }
    }
  });

  initLinks();
});
