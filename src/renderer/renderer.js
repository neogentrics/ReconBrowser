const { ipcRenderer } = require('electron');

const browserContainer = document.getElementById('browser-container');
const tabsContainer = document.getElementById('tabs-container');
const btnNewTab = document.getElementById('btn-new-tab');
const omnibar = document.getElementById('omnibar');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');
const btnReload = document.getElementById('btn-reload');
const btnHome = document.getElementById('btn-home');
const searchBadge = document.getElementById('search-badge');
const btnReaderView = document.getElementById('btn-reader-view');
const btnReadAloud = document.getElementById('btn-read-aloud');

// Shields elements
const shieldsWidget = document.getElementById('shields-widget');
const shieldStatus = document.getElementById('shield-status');
const blockedCountEl = document.getElementById('blocked-count');
const shieldsPopover = document.getElementById('shields-popover');
const btnClosePopover = document.getElementById('btn-close-popover');
const shieldsPopoverDomain = document.getElementById('shields-popover-domain');
const popoverStatCount = document.getElementById('popover-stat-count');
const popoverToggleSite = document.getElementById('popover-toggle-site');
const popoverProtectionsList = document.getElementById('popover-protections-list');
const btnPopoverOpenSettings = document.getElementById('btn-popover-open-settings');

// Popover switches
const popoverOptAdblock = document.getElementById('popover-opt-adblock');
const popoverOptFingerprint = document.getElementById('popover-opt-fingerprint');
const popoverOptWebrtc = document.getElementById('popover-opt-webrtc');
const popoverOptParams = document.getElementById('popover-opt-params');

// Settings Modal
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal');
const btnCloseSettingsModalFooter = document.getElementById('btn-close-settings-modal-footer');
const settingsNavBtns = document.querySelectorAll('.settings-nav-btn');
const settingsPanels = document.querySelectorAll('.settings-panel');
const selectTheme = document.getElementById('select-theme');
const selectAspect = document.getElementById('select-aspect');
const selectEngine = document.getElementById('select-engine');
const selectHomeDest = document.getElementById('select-home-dest');
const customHomeGroup = document.getElementById('custom-home-group');
const inputCustomHome = document.getElementById('input-custom-home');
const toggleStartpageApps = document.getElementById('toggle-startpage-apps');
const dropdownToggleStartpageApps = document.getElementById('dropdown-toggle-startpage-apps');
const dropdownItemToggleApps = document.getElementById('dropdown-item-toggle-apps');
const toggleNavbarApps = document.getElementById('toggle-navbar-apps');
const toggleDoh = document.getElementById('toggle-doh');
const toggleAdblock = document.getElementById('toggle-adblock');
const toggleFingerprint = document.getElementById('toggle-fingerprint');
const toggleWebrtc = document.getElementById('toggle-webrtc');
const toggleStripParams = document.getElementById('toggle-strip-params');
const btnDrawerStartRead = document.getElementById('btn-drawer-start-read');
const selectVoiceSpeed = document.getElementById('select-voice-speed');
const toggleTtsHighlight = document.getElementById('toggle-tts-highlight');
const btnSettingsCheckUpdates = document.getElementById('btn-settings-check-updates');
const settingsAboutCopy = document.getElementById('settings-about-copy');

// Ecosystem Menu
const btnEcosystem = document.getElementById('btn-ecosystem');
const ecosystemDropdown = document.getElementById('ecosystem-dropdown');
const ecosystemContainer = document.getElementById('ecosystem-menu-container');

// Floating Read Aloud Bar
const readAloudBar = document.getElementById('read-aloud-bar');
const speechStatus = document.getElementById('speech-status');
const btnSpeechPause = document.getElementById('btn-speech-pause');
const btnSpeechStop = document.getElementById('btn-speech-stop');
const selectSpeechSpeed = document.getElementById('select-speech-speed');
const btnSpeechClose = document.getElementById('btn-speech-close');

// Reader View Overlay
const readerOverlay = document.getElementById('reader-overlay');
const readerSiteName = document.getElementById('reader-site-name');
const readerTimeEst = document.getElementById('reader-time-est');
const readerTitle = document.getElementById('reader-title');
const readerByline = document.getElementById('reader-byline');
const readerBody = document.getElementById('reader-body');
const btnReaderListen = document.getElementById('btn-reader-listen');
const btnReaderSizeDown = document.getElementById('btn-reader-size-down');
const btnReaderSizeUp = document.getElementById('btn-reader-size-up');
const btnReaderClose = document.getElementById('btn-reader-close');

// About Dialog
const btnOpenAbout = document.getElementById('btn-open-about');
const aboutDlg = document.getElementById('about-dlg');
const aboutClose = document.getElementById('about-close');
const aboutDone = document.getElementById('about-done');
const aboutCopy = document.getElementById('about-copy');
const toastEl = document.getElementById('toast');

// Research Clip & App Link Elements (v1.3.1)
const btnClipResearch = document.getElementById('btn-clip-research');
const menuSendClip = document.getElementById('menu-send-clip');
const appLinkStatusList = document.getElementById('app-link-status-list');
const btnRefreshAppLink = document.getElementById('btn-refresh-app-link');

const modalResearchClip = document.getElementById('modal-research-clip');
const clipModalClose = document.getElementById('clip-modal-close');
const clipTruncateWarning = document.getElementById('clip-truncate-warning');
const clipInputTitle = document.getElementById('clip-input-title');
const clipSelectCategory = document.getElementById('clip-select-category');
const clipInputTags = document.getElementById('clip-input-tags');
const clipMetaPageTitle = document.getElementById('clip-meta-page-title');
const clipMetaUrl = document.getElementById('clip-meta-url');
const clipMetaAuthor = document.getElementById('clip-meta-author');
const clipMetaDate = document.getElementById('clip-meta-date');
const clipMetaAccessed = document.getElementById('clip-meta-accessed');
const clipPreviewText = document.getElementById('clip-preview-text');
const clipDestinations = document.getElementById('clip-destinations');
const btnClipCopyMd = document.getElementById('btn-clip-copy-md');
const btnClipCancel = document.getElementById('btn-clip-cancel');
const btnClipSend = document.getElementById('btn-clip-send');

// State
const tabs = new Map(); // tabId -> { id, title, url, tabEl, webviewEl, blockedCount, shieldsPaused, readerActive }
let activeTabId = null;
let nextTabId = 1;
let shieldsGlobalActive = localStorage.getItem('recon_shields_active') !== 'false';
let totalBlockedCount = 0;
let readerFontSize = 17;
let currentClipContext = null;
let selectedDestAppId = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Speech Synthesis State
let ttsSentences = [];
let ttsIndex = 0;
let ttsSpeaking = false;
let ttsPaused = false;

// Helper to resolve startpage URL
function getStartPageURL() {
  return `file://${__dirname}/startpage.html`;
}

function showToast(message, duration = 3000) {
  toastEl.textContent = message;
  toastEl.classList.remove('toast-hidden');
  setTimeout(() => {
    toastEl.classList.add('toast-hidden');
  }, duration);
}

// ==========================================================================
// Tab Management (Independent Webview per Tab & Drag-and-Drop)
// ==========================================================================
let draggedTabEl = null;

function reorderTabsFromDom() {
  const tabEls = tabsContainer.querySelectorAll('.tab');
  const newTabsMap = new Map();
  tabEls.forEach(el => {
    const tabId = parseInt(el.getAttribute('data-tab-id'), 10);
    if (tabs.has(tabId)) {
      newTabsMap.set(tabId, tabs.get(tabId));
    }
  });
  tabs.clear();
  newTabsMap.forEach((val, key) => tabs.set(key, val));
}

function createTab(initialUrl = null, activate = true) {
  const id = nextTabId++;
  const url = initialUrl || getStartPageURL();
  const isStart = url.includes('startpage.html');
  const title = isStart ? 'Recon Start' : 'New Tab';

  // 1. Create Tab Header
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.setAttribute('data-tab-id', id);
  tabEl.setAttribute('draggable', 'true');
  tabEl.innerHTML = `
    <span class="tab-favicon">${isStart ? '⚡' : '🌐'}</span>
    <span class="tab-title">${title}</span>
    <span class="tab-close" title="Close Tab (Ctrl+W)">×</span>
  `;

  // Drag and drop tab reordering
  tabEl.addEventListener('dragstart', (e) => {
    draggedTabEl = tabEl;
    tabEl.classList.add('tab-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  });

  tabEl.addEventListener('dragend', () => {
    tabEl.classList.remove('tab-dragging');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-drag-over-left', 'tab-drag-over-right'));
    draggedTabEl = null;
  });

  tabEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedTabEl || draggedTabEl === tabEl) return;
    const rect = tabEl.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (e.clientX < midX) {
      tabEl.classList.add('tab-drag-over-left');
      tabEl.classList.remove('tab-drag-over-right');
    } else {
      tabEl.classList.add('tab-drag-over-right');
      tabEl.classList.remove('tab-drag-over-left');
    }
  });

  tabEl.addEventListener('dragleave', () => {
    tabEl.classList.remove('tab-drag-over-left', 'tab-drag-over-right');
  });

  tabEl.addEventListener('drop', (e) => {
    e.preventDefault();
    tabEl.classList.remove('tab-drag-over-left', 'tab-drag-over-right');
    if (!draggedTabEl || draggedTabEl === tabEl) return;
    const rect = tabEl.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (e.clientX < midX) {
      tabsContainer.insertBefore(draggedTabEl, tabEl);
    } else {
      tabsContainer.insertBefore(draggedTabEl, tabEl.nextSibling);
    }
    reorderTabsFromDom();
  });

  tabEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) {
      e.stopPropagation();
      closeTab(id);
    } else {
      switchTab(id);
    }
  });

  tabsContainer.appendChild(tabEl);

  // 2. Create Dedicated Webview
  const webviewEl = document.createElement('webview');
  webviewEl.className = 'tab-webview';
  webviewEl.setAttribute('id', `webview-${id}`);
  webviewEl.setAttribute('src', url);
  webviewEl.setAttribute('allowpopups', '');
  webviewEl.style.display = 'none';

  // Native App Launching & Navigation Guard
  webviewEl.addEventListener('will-navigate', async (e) => {
    const navUrl = e.url;
    if (navUrl.includes('/apps/rt-markdown-reader/')) {
      const res = await ipcRenderer.invoke('launch-or-open-app', { appName: 'rt-markdown-reader', storeUrl: navUrl });
      if (res && res.launched) {
        e.preventDefault();
        showToast('Launched RT Markdown Reader locally');
        return;
      }
    } else if (navUrl.includes('/apps/rt-story-tracker/')) {
      const res = await ipcRenderer.invoke('launch-or-open-app', { appName: 'rt-story-tracker', storeUrl: navUrl });
      if (res && res.launched) {
        e.preventDefault();
        showToast('Launched RT Story Tracker locally');
        return;
      }
    }
  });

  // Attach webview lifecycle events
  webviewEl.addEventListener('did-navigate', (e) => {
    onTabNavigated(id, e.url);
  });
  webviewEl.addEventListener('did-navigate-in-page', (e) => {
    onTabNavigated(id, e.url);
  });
  webviewEl.addEventListener('page-title-updated', (e) => {
    onTabTitleUpdated(id, e.title);
  });
  webviewEl.addEventListener('did-start-loading', () => {
    if (id === activeTabId) btnReload.textContent = '✕';
  });
  webviewEl.addEventListener('did-stop-loading', () => {
    if (id === activeTabId) btnReload.textContent = '↻';
    updateNavButtons();
    syncThemeToWebview(webviewEl);
  });

  // Webview console bridge for startpage bidirectional actions
  webviewEl.addEventListener('console-message', (e) => {
    const msg = e.message;
    if (msg === 'RECON_ACTION:TOGGLE_SHIELDS') {
      if (tabData && tabData.shieldsPaused) {
        tabData.shieldsPaused = false;
        popoverToggleSite.checked = true;
        let domain = 'startpage';
        if (tabData.url && !tabData.url.includes('startpage.html')) {
          try { domain = new URL(tabData.url).hostname; } catch {}
        }
        ipcRenderer.send('set-site-shields', { host: domain, enabled: true });
        updateShieldsPopoverDisplay();
        syncThemeToWebview(tabData);
        showToast('Recon Shields: Resumed for this site');
      } else {
        shieldsGlobalActive = !shieldsGlobalActive;
        toggleAdblock.checked = shieldsGlobalActive;
        popoverOptAdblock.checked = shieldsGlobalActive;
        localStorage.setItem('recon_shields_active', String(shieldsGlobalActive));
        localStorage.setItem('recon_opt_adblock', String(shieldsGlobalActive));
        ipcRenderer.send('toggle-shields', shieldsGlobalActive);
        updateShieldsPopoverDisplay();
        tabs.forEach(tab => syncThemeToWebview(tab));
        showToast(shieldsGlobalActive ? 'Recon Shields: Active' : 'Recon Shields: Paused');
      }
    } else if (msg === 'RECON_ACTION:TOGGLE_DOH') {
      const current = localStorage.getItem('recon_doh_enabled') !== 'false';
      const next = !current;
      localStorage.setItem('recon_doh_enabled', String(next));
      if (toggleDoh) toggleDoh.checked = next;
      ipcRenderer.send('toggle-doh', next);
      tabs.forEach(tab => syncThemeToWebview(tab));
      showToast(next ? 'DNS-over-HTTPS: Encrypted (Cloudflare)' : 'DNS-over-HTTPS: Standard (System DNS)');
    } else if (msg === 'RECON_ACTION:SHOW_TELEMETRY_INFO') {
      openSettingsModal('privacy');
    }
  });

  browserContainer.appendChild(webviewEl);

  const tabData = {
    id,
    title,
    url,
    tabEl,
    webviewEl,
    blockedCount: 0,
    shieldsPaused: false,
    readerActive: false
  };

  tabs.set(id, tabData);

  if (activate || tabs.size === 1) {
    switchTab(id);
  }

  return id;
}

function switchTab(id) {
  if (!tabs.has(id)) return;
  activeTabId = id;

  tabs.forEach((tab, tabId) => {
    if (tabId === id) {
      tab.tabEl.classList.add('active');
      tab.webviewEl.style.display = 'flex';
    } else {
      tab.tabEl.classList.remove('active');
      tab.webviewEl.style.display = 'none';
    }
  });

  const activeTab = tabs.get(id);
  updateOmnibar(activeTab.url);
  updateNavButtons();
  updateShieldsPopoverDisplay();
  
  if (activeTab.readerActive) {
    readerOverlay.classList.remove('reader-overlay-hidden');
    btnReaderView.classList.add('active');
  } else {
    readerOverlay.classList.add('reader-overlay-hidden');
    btnReaderView.classList.remove('active');
  }
}

function closeTab(id) {
  if (!tabs.has(id)) return;
  const tab = tabs.get(id);
  tab.tabEl.remove();
  tab.webviewEl.remove();
  tabs.delete(id);

  if (tabs.size === 0) {
    createTab();
  } else if (activeTabId === id) {
    const remaining = Array.from(tabs.keys());
    switchTab(remaining[remaining.length - 1]);
  }
}

function onTabNavigated(id, newUrl) {
  if (!tabs.has(id)) return;
  const tab = tabs.get(id);
  tab.url = newUrl;
  tab.readerActive = false;
  if (id === activeTabId) {
    readerOverlay.classList.add('reader-overlay-hidden');
    btnReaderView.classList.remove('active');
  }

  const isStart = newUrl.includes('startpage.html');
  const faviconEl = tab.tabEl.querySelector('.tab-favicon');
  if (faviconEl) faviconEl.textContent = isStart ? '⚡' : '🌐';

  if (isStart) {
    onTabTitleUpdated(id, 'Recon Start');
  } else {
    try {
      const host = new URL(newUrl).hostname;
      onTabTitleUpdated(id, host);
    } catch {
      onTabTitleUpdated(id, newUrl);
    }
  }

  if (id === activeTabId) {
    updateOmnibar(newUrl);
    updateNavButtons();
    updateShieldsPopoverDisplay();
  }
}

function onTabTitleUpdated(id, newTitle) {
  if (!tabs.has(id)) return;
  const tab = tabs.get(id);
  tab.title = newTitle || 'Tab';
  const titleEl = tab.tabEl.querySelector('.tab-title');
  if (titleEl) titleEl.textContent = tab.title;
}

function updateOmnibar(url) {
  if (!url || url.includes('startpage.html')) {
    omnibar.value = '';
    const engine = localStorage.getItem('recon_default_engine') || 'duckduckgo';
    omnibar.placeholder = `Search with ${getEngineDisplayName(engine)} or enter address (!g for Google, !b for Bing)...`;
    btnReaderView.style.display = 'none';
    btnReadAloud.style.display = 'none';
  } else {
    omnibar.value = url;
    btnReaderView.style.display = 'flex';
    btnReadAloud.style.display = 'flex';
  }
}

function updateNavButtons() {
  const activeTab = tabs.get(activeTabId);
  if (!activeTab || !activeTab.webviewEl) return;
  try {
    btnBack.disabled = !activeTab.webviewEl.canGoBack();
    btnForward.disabled = !activeTab.webviewEl.canGoForward();
  } catch {
    btnBack.disabled = true;
    btnForward.disabled = true;
  }
}

// ==========================================================================
// Omnibar & Search Routing
// ==========================================================================
function getEngineDisplayName(engine) {
  if (engine === 'google') return 'Google';
  if (engine === 'bing') return 'Bing';
  return 'DuckDuckGo';
}

function updateEngineBadge(engine) {
  if (engine === 'google') {
    searchBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M8 12h8"></path></svg>';
    searchBadge.title = 'Default Engine: Google';
  } else if (engine === 'bing') {
    searchBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008373" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polygon points="2 17 12 22 22 17"></polygon></svg>';
    searchBadge.title = 'Default Engine: Bing';
  } else {
    searchBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#de5833" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    searchBadge.title = 'Default Engine: DuckDuckGo';
  }
}

omnibar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const input = omnibar.value.trim();
    if (!input) return;

    let targetUrl = '';
    const selectedEngine = localStorage.getItem('recon_default_engine') || 'duckduckgo';

    if (input.startsWith('!g ')) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(input.substring(3).trim())}`;
    } else if (input.startsWith('!b ')) {
      targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(input.substring(3).trim())}`;
    } else if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('file://')) {
      targetUrl = input;
    } else if (input.includes('.') && !input.includes(' ')) {
      targetUrl = 'https://' + input;
    } else {
      if (selectedEngine === 'google') {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
      } else if (selectedEngine === 'bing') {
        targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(input)}`;
      } else {
        targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(input)}`;
      }
    }

    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.webviewEl) {
      activeTab.webviewEl.loadURL(targetUrl);
    }
  }
});

// Navigation Controls
btnBack.addEventListener('click', () => {
  const activeTab = tabs.get(activeTabId);
  if (activeTab && activeTab.webviewEl.canGoBack()) activeTab.webviewEl.goBack();
});

btnForward.addEventListener('click', () => {
  const activeTab = tabs.get(activeTabId);
  if (activeTab && activeTab.webviewEl.canGoForward()) activeTab.webviewEl.goForward();
});

btnReload.addEventListener('click', () => {
  const activeTab = tabs.get(activeTabId);
  if (activeTab && activeTab.webviewEl) {
    if (activeTab.webviewEl.isLoading()) {
      activeTab.webviewEl.stop();
    } else {
      activeTab.webviewEl.reload();
    }
  }
});

// Home Button Navigation (Configurable Destination)
btnHome.addEventListener('click', () => {
  const activeTab = tabs.get(activeTabId);
  if (!activeTab || !activeTab.webviewEl) return;

  const homeDest = localStorage.getItem('recon_home_dest') || 'recontowers';
  let targetUrl = 'https://recontowers.com';

  if (homeDest === 'startpage') {
    targetUrl = getStartPageURL();
  } else if (homeDest === 'custom') {
    targetUrl = localStorage.getItem('recon_home_custom_url') || 'https://recontowers.com';
  }

  activeTab.webviewEl.loadURL(targetUrl);
});

btnNewTab.addEventListener('click', () => createTab());

// ==========================================================================
// Shields Popover & Settings Modal Controls
// ==========================================================================
shieldsWidget.addEventListener('click', (e) => {
  e.stopPropagation();
  closeSettingsModal();
  ecosystemDropdown.style.display = 'none';
  shieldsPopover.classList.toggle('popover-hidden');
  updateShieldsPopoverDisplay();
});

btnClosePopover.addEventListener('click', () => {
  shieldsPopover.classList.add('popover-hidden');
});

btnSettingsToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  shieldsPopover.classList.add('popover-hidden');
  ecosystemDropdown.style.display = 'none';
  openSettingsModal('appearance');
});

function openSettingsModal(tabId = 'appearance') {
  shieldsPopover.classList.add('popover-hidden');
  ecosystemDropdown.style.display = 'none';
  const bDrop = document.getElementById('bookmarks-dropdown');
  if (bDrop) bDrop.style.display = 'none';
  const vDrop = document.getElementById('vault-dropdown');
  if (vDrop) vDrop.style.display = 'none';

  switchSettingsTab(tabId);

  if (tabId === 'about') {
    loadAboutSettingsInfo();
  } else if (tabId === 'history' && typeof loadAndRenderHistory === 'function') {
    loadAndRenderHistory();
  } else if (tabId === 'vault' && typeof loadAndRenderVault === 'function') {
    loadAndRenderVault();
  } else if (tabId === 'interface' && typeof checkDefaultBrowserStatus === 'function') {
    checkDefaultBrowserStatus();
  }

  if (settingsModal && !settingsModal.open) {
    settingsModal.showModal();
  }
}

function closeSettingsModal() {
  if (settingsModal && settingsModal.open) {
    settingsModal.close();
  }
}

function switchSettingsTab(tabId) {
  const navBtns = document.querySelectorAll('.settings-nav-btn');
  const panels = document.querySelectorAll('.settings-panel');
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  panels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabId}`);
  });
}

if (btnCloseSettingsModal) {
  btnCloseSettingsModal.addEventListener('click', closeSettingsModal);
}
if (btnCloseSettingsModalFooter) {
  btnCloseSettingsModalFooter.addEventListener('click', closeSettingsModal);
}

settingsNavBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.getAttribute('data-tab');
    switchSettingsTab(tabId);
    if (tabId === 'about') {
      loadAboutSettingsInfo();
    } else if (tabId === 'history' && typeof loadAndRenderHistory === 'function') {
      loadAndRenderHistory();
    } else if (tabId === 'vault' && typeof loadAndRenderVault === 'function') {
      loadAndRenderVault();
    } else if (tabId === 'interface' && typeof checkDefaultBrowserStatus === 'function') {
      checkDefaultBrowserStatus();
    }
  });
});

if (settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });
}

// Draggable Settings Modal
function setupDraggableSettingsModal() {
  const modalHeader = document.querySelector('.settings-modal-header');
  if (!modalHeader || !settingsModal) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  modalHeader.addEventListener('mousedown', (e) => {
    if (e.target.closest('.modal-close-btn')) return;

    isDragging = true;
    settingsModal.classList.add('is-dragging');

    const rect = settingsModal.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;

    settingsModal.style.position = 'fixed';
    settingsModal.style.margin = '0';
    settingsModal.style.left = `${initialLeft}px`;
    settingsModal.style.top = `${initialTop}px`;

    function onMouseMove(moveEvent) {
      if (!isDragging) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      const maxLeft = Math.max(0, window.innerWidth - rect.width);
      const maxTop = Math.max(0, window.innerHeight - rect.height);

      newLeft = Math.max(0, Math.min(maxLeft, newLeft));
      newTop = Math.max(0, Math.min(maxTop, newTop));

      settingsModal.style.left = `${newLeft}px`;
      settingsModal.style.top = `${newTop}px`;
    }

    function onMouseUp() {
      isDragging = false;
      settingsModal.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
setupDraggableSettingsModal();

async function loadAboutSettingsInfo() {
  try {
    const info = await ipcRenderer.invoke('get-app-info');
    const verEl = document.getElementById('settings-about-version');
    const techEl = document.getElementById('settings-about-tech');
    if (verEl) verEl.textContent = `Version ${info.version}`;
    if (techEl) techEl.textContent = `Electron ${info.electron} · Chromium ${info.chrome} · Node ${info.node} · ${info.os}`;
  } catch (err) {}
}

if (btnSettingsCheckUpdates) {
  btnSettingsCheckUpdates.addEventListener('click', () => {
    ipcRenderer.send('check-updates-manual');
  });
}

if (settingsAboutCopy) {
  settingsAboutCopy.addEventListener('click', async () => {
    const info = await ipcRenderer.invoke('get-app-info');
    const details = [
      `Recon Browser ${info.version}`,
      `Electron ${info.electron} · Chromium ${info.chrome} · Node ${info.node}`,
      `${info.os}`
    ].join('\n');
    ipcRenderer.send('copy-to-clipboard', details);
    showToast('Version details copied to clipboard');
  });
}

btnPopoverOpenSettings.addEventListener('click', (e) => {
  e.stopPropagation();
  shieldsPopover.classList.add('popover-hidden');
  openSettingsModal('privacy');
});

document.addEventListener('click', (e) => {
  if (!shieldsPopover.contains(e.target) && !shieldsWidget.contains(e.target)) {
    shieldsPopover.classList.add('popover-hidden');
  }
  if (!btnEcosystem.contains(e.target) && !ecosystemDropdown.contains(e.target)) {
    ecosystemDropdown.style.display = 'none';
  }
  const bToggle = document.getElementById('btn-bookmarks-toggle');
  const bDrop = document.getElementById('bookmarks-dropdown');
  if (bDrop && bToggle && !bToggle.contains(e.target) && !bDrop.contains(e.target)) {
    bDrop.style.display = 'none';
  }
  const vToggle = document.getElementById('btn-vault-toggle');
  const vDrop = document.getElementById('vault-dropdown');
  if (vDrop && vToggle && !vToggle.contains(e.target) && !vDrop.contains(e.target)) {
    vDrop.style.display = 'none';
  }
});

function updateShieldsPopoverDisplay() {
  const activeTab = tabs.get(activeTabId);
  if (!activeTab) return;

  let domain = 'Local Start Page';
  let host = 'startpage';
  if (activeTab.url && !activeTab.url.includes('startpage.html')) {
    try {
      host = new URL(activeTab.url).hostname;
      domain = host;
    } catch {
      domain = activeTab.url;
    }
  }

  shieldsPopoverDomain.textContent = domain;
  const isPaused = activeTab.shieldsPaused || !shieldsGlobalActive;
  popoverToggleSite.checked = !isPaused;
  document.getElementById('site-protection-state').textContent = !isPaused ? 'Active protection enabled' : 'Shields paused for this site';
  document.getElementById('site-protection-state').style.color = !isPaused ? '#22c55e' : '#ef4444';

  if (isPaused) {
    shieldStatus.textContent = shieldsGlobalActive ? 'PAUSED' : 'OFF';
    shieldStatus.style.color = '#ef4444';
    shieldsWidget.classList.add('shields-paused');
    popoverProtectionsList.classList.add('protections-disabled');
    blockedCountEl.textContent = '0';
    popoverStatCount.textContent = '0';
    blockedCountEl.classList.remove('has-blocked');
  } else {
    shieldStatus.textContent = 'ON';
    shieldStatus.style.color = '#22c55e';
    shieldsWidget.classList.remove('shields-paused');
    popoverProtectionsList.classList.remove('protections-disabled');
    const count = activeTab.blockedCount || 0;
    popoverStatCount.textContent = count;
    blockedCountEl.textContent = count;
    if (count > 0) {
      blockedCountEl.classList.add('has-blocked');
    } else {
      blockedCountEl.classList.remove('has-blocked');
    }
  }
}

// Track blocked items from main process
ipcRenderer.on('shield-blocked-update', (event, data) => {
  totalBlockedCount++;
  const activeTab = tabs.get(activeTabId);
  if (activeTab && !activeTab.shieldsPaused && shieldsGlobalActive) {
    activeTab.blockedCount = (activeTab.blockedCount || 0) + 1;
    updateShieldsPopoverDisplay();
  }
});

// Toggle Global Shields
toggleAdblock.addEventListener('change', (e) => {
  shieldsGlobalActive = e.target.checked;
  localStorage.setItem('recon_shields_active', String(shieldsGlobalActive));
  localStorage.setItem('recon_opt_adblock', String(shieldsGlobalActive));
  popoverOptAdblock.checked = shieldsGlobalActive;
  ipcRenderer.send('toggle-shields', shieldsGlobalActive);
  updateShieldsPopoverDisplay();
  tabs.forEach(tab => syncThemeToWebview(tab));
});

// Per-Site Shields Toggle
popoverToggleSite.addEventListener('change', (e) => {
  const siteActive = e.target.checked;
  const activeTab = tabs.get(activeTabId);
  if (!activeTab) return;

  activeTab.shieldsPaused = !siteActive;
  if (!siteActive) {
    activeTab.blockedCount = 0;
  }
  let host = 'startpage';
  if (activeTab.url && !activeTab.url.includes('startpage.html')) {
    try {
      host = new URL(activeTab.url).hostname;
    } catch {}
  }

  ipcRenderer.send('set-site-shields', { host, enabled: siteActive });
  updateShieldsPopoverDisplay();
  tabs.forEach(tab => syncThemeToWebview(tab));
});

// Synchronize Popover Protection Switches
function bindProtectionSwitch(popoverEl, drawerEl, storageKey) {
  popoverEl.checked = localStorage.getItem(storageKey) !== 'false';
  drawerEl.checked = popoverEl.checked;

  popoverEl.addEventListener('change', (e) => {
    drawerEl.checked = e.target.checked;
    localStorage.setItem(storageKey, String(e.target.checked));
  });

  drawerEl.addEventListener('change', (e) => {
    popoverEl.checked = e.target.checked;
    localStorage.setItem(storageKey, String(e.target.checked));
  });
}

bindProtectionSwitch(popoverOptAdblock, toggleAdblock, 'recon_opt_adblock');
bindProtectionSwitch(popoverOptFingerprint, toggleFingerprint, 'recon_opt_fingerprint');
bindProtectionSwitch(popoverOptWebrtc, toggleWebrtc, 'recon_opt_webrtc');
bindProtectionSwitch(popoverOptParams, toggleStripParams, 'recon_opt_params');

// ==========================================================================
// Themes & Aspects Management
// ==========================================================================
function applyThemeAndAspect(theme, aspect) {
  const activeTheme = theme || localStorage.getItem('recon_theme') || 'cyber';
  const activeAspect = aspect || localStorage.getItem('recon_aspect') || 'solid';

  document.body.className = `theme-${activeTheme} aspect-${activeAspect}`;
  localStorage.setItem('recon_theme', activeTheme);
  localStorage.setItem('recon_aspect', activeAspect);

  if (selectTheme) selectTheme.value = activeTheme;
  if (selectAspect) selectAspect.value = activeAspect;

  // Broadcast to all active webviews
  tabs.forEach(tab => {
    syncThemeToWebview(tab, activeTheme, activeAspect);
  });
}

function syncThemeToWebview(target, theme = null, aspect = null) {
  let webviewEl = target;
  let tab = null;
  if (target && target.webviewEl) {
    tab = target;
    webviewEl = target.webviewEl;
  } else {
    for (const [, t] of tabs) {
      if (t.webviewEl === target) {
        tab = t;
        break;
      }
    }
    if (!tab) tab = tabs.get(activeTabId);
  }

  if (!webviewEl) return;

  const activeTheme = theme || localStorage.getItem('recon_theme') || 'cyber';
  const activeAspect = aspect || localStorage.getItem('recon_aspect') || 'solid';
  const engine = localStorage.getItem('recon_default_engine') || 'duckduckgo';
  const showApps = localStorage.getItem('recon_show_startpage_apps') !== 'false';
  
  const isPaused = !shieldsGlobalActive || (tab && tab.shieldsPaused);
  const shieldsActive = !isPaused;
  const dohActive = localStorage.getItem('recon_doh_enabled') !== 'false';

  try {
    webviewEl.executeJavaScript(`
      if (typeof window.applyReconTheme === 'function') {
        window.applyReconTheme('${activeTheme}', '${activeAspect}');
      }
      if (typeof window.applyReconEngine === 'function') {
        window.applyReconEngine('${engine}');
      }
      if (typeof window.applyReconAppsVisibility === 'function') {
        window.applyReconAppsVisibility(${showApps});
      }
      if (typeof window.applyReconShieldsState === 'function') {
        window.applyReconShieldsState(${shieldsActive});
      }
      if (typeof window.applyReconDohState === 'function') {
        window.applyReconDohState(${dohActive});
      }
    `).catch(() => {});
  } catch (err) {}
}

selectTheme.addEventListener('change', (e) => {
  applyThemeAndAspect(e.target.value, localStorage.getItem('recon_aspect') || 'solid');
});

selectAspect.addEventListener('change', (e) => {
  applyThemeAndAspect(localStorage.getItem('recon_theme') || 'cyber', e.target.value);
});

// ==========================================================================
// Interface & Layout Settings
// ==========================================================================
// Home Destination Setting
function setupHomeSetting() {
  const homeDest = localStorage.getItem('recon_home_dest') || 'recontowers';
  selectHomeDest.value = homeDest;
  customHomeGroup.style.display = homeDest === 'custom' ? 'block' : 'none';
  inputCustomHome.value = localStorage.getItem('recon_home_custom_url') || 'https://recontowers.com';

  selectHomeDest.addEventListener('change', (e) => {
    const val = e.target.value;
    localStorage.setItem('recon_home_dest', val);
    customHomeGroup.style.display = val === 'custom' ? 'block' : 'none';
  });

  inputCustomHome.addEventListener('change', (e) => {
    localStorage.setItem('recon_home_custom_url', e.target.value.trim());
  });
}
setupHomeSetting();

// Start Page Apps Hub Toggle (Synchronized across Settings Modal & Recon Apps dropdown)
function setStartpageAppsVisibility(show) {
  localStorage.setItem('recon_show_startpage_apps', String(show));
  if (toggleStartpageApps) toggleStartpageApps.checked = show;
  if (dropdownToggleStartpageApps) dropdownToggleStartpageApps.checked = show;
  tabs.forEach(tab => syncThemeToWebview(tab));
}

const initialAppsVisibility = localStorage.getItem('recon_show_startpage_apps') !== 'false';
if (toggleStartpageApps) {
  toggleStartpageApps.checked = initialAppsVisibility;
  toggleStartpageApps.addEventListener('change', (e) => setStartpageAppsVisibility(e.target.checked));
}

if (dropdownToggleStartpageApps) {
  dropdownToggleStartpageApps.checked = initialAppsVisibility;
  dropdownToggleStartpageApps.addEventListener('change', (e) => setStartpageAppsVisibility(e.target.checked));
}

if (dropdownItemToggleApps) {
  dropdownItemToggleApps.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Navbar Recon Apps Button Toggle
toggleNavbarApps.checked = localStorage.getItem('recon_show_navbar_apps') !== 'false';
ecosystemContainer.style.display = toggleNavbarApps.checked ? 'flex' : 'none';
toggleNavbarApps.addEventListener('change', (e) => {
  const show = e.target.checked;
  localStorage.setItem('recon_show_navbar_apps', String(show));
  ecosystemContainer.style.display = show ? 'flex' : 'none';
});

// ==========================================================================
// Search Engine Setting & Sync
// ==========================================================================
function setEngine(engine) {
  localStorage.setItem('recon_default_engine', engine);
  selectEngine.value = engine;
  updateEngineBadge(engine);
  const activeTab = tabs.get(activeTabId);
  if (activeTab) updateOmnibar(activeTab.url);

  // Broadcast to all startpages
  tabs.forEach(tab => {
    syncThemeToWebview(tab.webviewEl);
  });
}

selectEngine.addEventListener('change', (e) => {
  setEngine(e.target.value);
  showToast(`Default search set to ${getEngineDisplayName(e.target.value)}`);
});

// ==========================================================================
// DNS-over-HTTPS (DoH) Management & Verification
// ==========================================================================
const btnVerifyDoh = document.getElementById('btn-verify-doh');
if (toggleDoh) {
  toggleDoh.checked = localStorage.getItem('recon_doh_enabled') !== 'false';
  toggleDoh.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('recon_doh_enabled', String(enabled));
    ipcRenderer.send('toggle-doh', enabled);
    tabs.forEach(tab => syncThemeToWebview(tab.webviewEl));
    showToast(enabled ? 'DNS-over-HTTPS: Encrypted (Cloudflare)' : 'DNS-over-HTTPS: Standard (System DNS)');
  });
}

if (btnVerifyDoh) {
  btnVerifyDoh.addEventListener('click', () => {
    createTab('https://one.one.one.one/help', true);
    closeSettingsModal();
  });
}

// Initial DoH sync to main process
ipcRenderer.send('toggle-doh', localStorage.getItem('recon_doh_enabled') !== 'false');

// ==========================================================================
// Ecosystem Quick Menu & Native App Launching
// ==========================================================================
btnEcosystem.addEventListener('click', (e) => {
  e.stopPropagation();
  shieldsPopover.classList.add('popover-hidden');
  closeSettingsModal();
  const isShown = ecosystemDropdown.style.display === 'block';
  ecosystemDropdown.style.display = isShown ? 'none' : 'block';
});

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    e.preventDefault();
    const appName = item.getAttribute('data-app');
    const url = item.getAttribute('data-url');

    if (appName) {
      const res = await ipcRenderer.invoke('launch-or-open-app', { appName, storeUrl: url });
      if (res && res.launched) {
        showToast(`Launched ${item.textContent.trim()} locally`);
        ecosystemDropdown.style.display = 'none';
        return;
      }
    }

    if (url) {
      const activeTab = tabs.get(activeTabId);
      if (activeTab && activeTab.webviewEl) activeTab.webviewEl.loadURL(url);
      ecosystemDropdown.style.display = 'none';
    }
  });
});

// ==========================================================================
// Reader View (Distraction-Free Reading Mode)
// ==========================================================================
async function toggleReaderView() {
  const activeTab = tabs.get(activeTabId);
  if (!activeTab || !activeTab.webviewEl) return;

  if (activeTab.readerActive) {
    activeTab.readerActive = false;
    readerOverlay.classList.add('reader-overlay-hidden');
    btnReaderView.classList.remove('active');
    stopReadAloud();
    return;
  }

  if (activeTab.url.includes('startpage.html')) {
    showToast('Reader View is only available on web articles.');
    return;
  }

  showToast('Extracting article for Reader View...');

  try {
    const extractScript = `
      (() => {
        const title = document.querySelector('h1')?.innerText || document.title || 'Untitled Article';
        const byline = document.querySelector('.byline, [rel="author"], meta[name="author"]')?.content || 
                       document.querySelector('.author, .date, time')?.innerText || '';
        
        // Find best article container
        const candidates = Array.from(document.querySelectorAll('article, main, .article-body, .post-content, #content, body'));
        let best = candidates[0];
        let maxP = 0;
        candidates.forEach(el => {
          const pCount = el.querySelectorAll('p').length;
          if (pCount > maxP) {
            maxP = pCount;
            best = el;
          }
        });

        // Clone and sanitize
        const clone = best.cloneNode(true);
        clone.querySelectorAll('script, style, iframe, nav, header, footer, noscript, .ad, .advertisement, [class*="banner"], [id*="banner"]').forEach(n => n.remove());

        const text = clone.innerText || '';
        const words = text.split(/\\s+/).filter(Boolean).length;

        return {
          title,
          byline,
          contentHtml: clone.innerHTML,
          textContent: text,
          words
        };
      })()
    `;

    const article = await activeTab.webviewEl.executeJavaScript(extractScript);

    if (!article || article.words < 20) {
      showToast('Could not find enough readable article content.');
      return;
    }

    readerTitle.textContent = article.title;
    readerByline.textContent = article.byline ? `By ${article.byline}` : `From ${new URL(activeTab.url).hostname}`;
    readerSiteName.textContent = new URL(activeTab.url).hostname;
    readerTimeEst.textContent = `${Math.max(1, Math.ceil(article.words / 200))} min read (${article.words} words)`;
    readerBody.innerHTML = article.contentHtml;

    activeTab.readerActive = true;
    readerOverlay.classList.remove('reader-overlay-hidden');
    btnReaderView.classList.add('active');
  } catch (err) {
    console.error('Reader view extraction error:', err);
    showToast('Failed to load Reader View on this page.');
  }
}

btnReaderView.addEventListener('click', () => toggleReaderView());
btnReaderClose.addEventListener('click', () => toggleReaderView());

btnReaderSizeDown.addEventListener('click', () => {
  readerFontSize = Math.max(14, readerFontSize - 2);
  document.querySelector('.reader-article').style.fontSize = `${readerFontSize}px`;
});

btnReaderSizeUp.addEventListener('click', () => {
  readerFontSize = Math.min(26, readerFontSize + 2);
  document.querySelector('.reader-article').style.fontSize = `${readerFontSize}px`;
});

// ==========================================================================
// Read Aloud & Speech Synthesis (with Sentence Auto-Highlighting)
// ==========================================================================
function getSentenceList(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
    return Array.from(segmenter.segment(text)).map(s => s.segment.trim()).filter(Boolean);
  }
  return text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
}

async function startReadAloud() {
  const activeTab = tabs.get(activeTabId);
  if (!activeTab) return;

  if (ttsSpeaking && !ttsPaused) {
    pauseReadAloud();
    return;
  }
  if (ttsPaused) {
    resumeReadAloud();
    return;
  }

  let textToRead = '';
  if (activeTab.readerActive) {
    textToRead = readerBody.innerText || readerTitle.innerText;
  } else if (!activeTab.url.includes('startpage.html')) {
    try {
      textToRead = await activeTab.webviewEl.executeJavaScript(`
        (() => {
          const main = document.querySelector('article, main') || document.body;
          return main.innerText || '';
        })()
      `);
    } catch {
      textToRead = '';
    }
  }

  if (!textToRead || textToRead.trim().length < 5) {
    showToast('No readable text found on active page.');
    return;
  }

  ttsSentences = getSentenceList(textToRead);
  ttsIndex = 0;
  ttsSpeaking = true;
  ttsPaused = false;

  readAloudBar.classList.remove('speech-bar-hidden');
  btnReadAloud.classList.add('active');
  btnSpeechPause.textContent = '⏸';

  speakCurrentSentence();
}

function speakCurrentSentence() {
  if (ttsIndex >= ttsSentences.length) {
    stopReadAloud();
    return;
  }

  window.speechSynthesis.cancel();
  const text = ttsSentences[ttsIndex];
  speechStatus.textContent = `Reading ${ttsIndex + 1}/${ttsSentences.length}`;

  const utterance = new SpeechSynthesisUtterance(text);
  const speed = parseFloat(selectSpeechSpeed.value) || 1.0;
  utterance.rate = speed;

  utterance.onend = () => {
    if (ttsSpeaking && !ttsPaused) {
      ttsIndex++;
      speakCurrentSentence();
    }
  };

  utterance.onerror = () => {
    stopReadAloud();
  };

  window.speechSynthesis.speak(utterance);
}

function pauseReadAloud() {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    ttsPaused = true;
    btnSpeechPause.textContent = '▶';
    speechStatus.textContent = 'Paused';
  }
}

function resumeReadAloud() {
  if (ttsPaused) {
    window.speechSynthesis.resume();
    ttsPaused = false;
    btnSpeechPause.textContent = '⏸';
    speechStatus.textContent = `Reading ${ttsIndex + 1}/${ttsSentences.length}`;
  }
}

function stopReadAloud() {
  window.speechSynthesis.cancel();
  ttsSpeaking = false;
  ttsPaused = false;
  ttsIndex = 0;
  readAloudBar.classList.add('speech-bar-hidden');
  btnReadAloud.classList.remove('active');
}

btnReadAloud.addEventListener('click', () => startReadAloud());
btnReaderListen.addEventListener('click', () => startReadAloud());
btnDrawerStartRead.addEventListener('click', () => {
  closeSettingsModal();
  startReadAloud();
});

btnSpeechPause.addEventListener('click', () => {
  if (ttsPaused) resumeReadAloud();
  else pauseReadAloud();
});

btnSpeechStop.addEventListener('click', () => stopReadAloud());
btnSpeechClose.addEventListener('click', () => stopReadAloud());

selectSpeechSpeed.addEventListener('change', () => {
  if (ttsSpeaking && !ttsPaused) {
    speakCurrentSentence();
  }
});

selectVoiceSpeed.addEventListener('change', (e) => {
  const val = e.target.value;
  selectSpeechSpeed.value = val;
});

// ==========================================================================
// About Modal (Modeled directly on RT Markdown Reader)
// ==========================================================================
async function openAboutDialog() {
  const info = await ipcRenderer.invoke('get-app-info');
  document.getElementById('about-version').textContent = `Version ${info.version}`;
  document.getElementById('about-tech').textContent = `Electron ${info.electron} · Chromium ${info.chrome} · Node ${info.node} · ${info.os}`;
  document.getElementById('about-copyright-text').textContent = `© ${info.year} Recon Towers. All rights reserved.`;

  aboutDlg.showModal();
}

if (btnOpenAbout) {
  btnOpenAbout.addEventListener('click', () => {
    openSettingsModal('about');
  });
}

if (aboutClose) aboutClose.addEventListener('click', () => aboutDlg?.close());
if (aboutDone) aboutDone.addEventListener('click', () => aboutDlg?.close());

if (aboutCopy) {
  aboutCopy.addEventListener('click', async () => {
    const info = await ipcRenderer.invoke('get-app-info');
    const details = [
      `Recon Browser ${info.version}`,
      `Electron ${info.electron} · Chromium ${info.chrome} · Node ${info.node}`,
      `${info.os}`
    ].join('\n');

    ipcRenderer.send('copy-to-clipboard', details);
    showToast('Version details copied to clipboard');
  });
}

// External Links in About Modal & Settings Modal
const externalLinks = {
  'about-website': 'https://recontowers.com',
  'about-notes': 'https://github.com/neogentrics/ReconBrowser/releases',
  'about-issue': 'https://github.com/neogentrics/ReconBrowser/issues',
  'about-source': 'https://github.com/neogentrics/ReconBrowser',
  'about-license': 'https://github.com/neogentrics/ReconBrowser/blob/main/LICENSE',
  'about-notices': 'https://github.com/neogentrics/ReconBrowser/blob/main/README.md',
  'settings-about-neogentrics': 'https://neogentrics.com',
  'settings-about-website': 'https://recontowers.com',
  'settings-about-notes': 'https://github.com/neogentrics/ReconBrowser/releases',
  'settings-about-issue': 'https://github.com/neogentrics/ReconBrowser/issues',
  'settings-about-source': 'https://github.com/neogentrics/ReconBrowser'
};

for (const [id, url] of Object.entries(externalLinks)) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      ipcRenderer.send('open-external-url', url);
    });
  }
}

// Menu IPC Events
ipcRenderer.on('open-about-dialog', () => openSettingsModal('about'));
ipcRenderer.on('menu-set-theme', (_, theme) => {
  applyThemeAndAspect(theme, null);
  showToast(`Theme switched to: ${theme}`);
});
ipcRenderer.on('menu-set-aspect', (_, aspect) => {
  applyThemeAndAspect(null, aspect);
  showToast(`Theme finish switched to: ${aspect}`);
});
ipcRenderer.on('menu-new-tab', () => createTab());
ipcRenderer.on('menu-close-tab', () => closeTab(activeTabId));
ipcRenderer.on('menu-reload', () => {
  const activeTab = tabs.get(activeTabId);
  if (activeTab && activeTab.webviewEl) activeTab.webviewEl.reload();
});
ipcRenderer.on('menu-next-tab', () => {
  const keys = Array.from(tabs.keys());
  const idx = keys.indexOf(activeTabId);
  if (idx !== -1) {
    const nextKey = keys[(idx + 1) % keys.length];
    switchTab(nextKey);
  }
});
ipcRenderer.on('menu-prev-tab', () => {
  const keys = Array.from(tabs.keys());
  const idx = keys.indexOf(activeTabId);
  if (idx !== -1) {
    const prevKey = keys[(idx - 1 + keys.length) % keys.length];
    switchTab(prevKey);
  }
});
ipcRenderer.on('menu-shortcuts', () => {
  showToast('Shortcuts: Ctrl+T (New Tab), Ctrl+W (Close Tab), Ctrl+L (Address), Ctrl+R (Reload), Ctrl+Alt+R (Reader), Ctrl+Shift+A (Read Aloud)');
});
ipcRenderer.on('menu-toggle-reader', () => toggleReaderView());
ipcRenderer.on('menu-read-aloud', () => startReadAloud());
ipcRenderer.on('menu-stop-reading', () => stopReadAloud());
ipcRenderer.on('menu-open-settings', () => {
  openSettingsModal('appearance');
});

// Auto-Updater status listener
ipcRenderer.on('updater-status', (event, status) => {
  if (status.state === 'checking') {
    showToast('Checking GitHub for updates...');
  } else if (status.state === 'current') {
    showToast(`Recon Browser is up to date (v${status.version})`);
  } else if (status.state === 'available') {
    showToast(`Update available: v${status.version}! Click Help → Check for Updates to download.`, 6000);
  } else if (status.state === 'ready') {
    showToast(`Update v${status.version} ready. Restart to apply update!`, 8000);
  }
});

// ==========================================================================
// Recon App Link & Research Clips (v1.3.1)
// ==========================================================================
async function refreshAppLinkStatus() {
  if (!appLinkStatusList) return;
  try {
    const status = await ipcRenderer.invoke('app-link:get-status');
    const apps = status.apps || [];
    if (apps.length === 0) {
      appLinkStatusList.innerHTML = `
        <div style="font-size: 11.5px; color: var(--text-muted); padding: 4px 0;">
          No Recon Towers apps detected in presence directory.<br>
          Launch RT Story Tracker or RT Markdown Reader to connect.
        </div>
      `;
      return;
    }

    appLinkStatusList.innerHTML = apps.map(app => {
      let pillClass = 'offline';
      let pillText = 'Offline';
      let actionBtn = '';

      if (app.running && app.linked) {
        pillClass = 'linked';
        pillText = 'Linked';
        actionBtn = `<button class="app-link-btn-action" data-action="unlink" data-id="${app.id}">Unlink</button>`;
      } else if (app.running && !app.linked) {
        pillClass = 'unlinked';
        pillText = 'Unlinked';
        actionBtn = `<button class="app-link-btn-action" data-action="pair" data-id="${app.id}">Link Now</button>`;
      } else if (!app.running && app.linked) {
        pillClass = 'linked';
        pillText = 'Linked (Offline)';
        actionBtn = `<button class="app-link-btn-action" data-action="unlink" data-id="${app.id}">Unlink</button>`;
      }

      return `
        <div class="app-link-card">
          <div class="app-link-card-info">
            <span class="app-link-card-name">${escapeHtml(app.name)}</span>
            <span style="font-size: 10.5px; color: var(--text-muted);">${app.id} (v${app.version || '1.0'})</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="app-link-status-pill ${pillClass}">${pillText}</span>
            ${actionBtn}
          </div>
        </div>
      `;
    }).join('');

    appLinkStatusList.querySelectorAll('.app-link-btn-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.target.getAttribute('data-action');
        const id = e.target.getAttribute('data-id');
        if (action === 'pair') {
          showToast(`Requesting link with ${id}... approve in the other app.`);
          const res = await ipcRenderer.invoke('app-link:pair-with', id);
          if (res.success) {
            showToast(`Successfully linked with ${res.name || id}!`);
          } else {
            showToast(`Could not link with ${id}: ${res.message || res.code}`);
          }
          refreshAppLinkStatus();
        } else if (action === 'unlink') {
          await ipcRenderer.invoke('app-link:unlink', id);
          showToast(`Unlinked ${id}`);
          refreshAppLinkStatus();
        }
      });
    });
  } catch (err) {
    console.error('App Link status error:', err);
    appLinkStatusList.innerHTML = `<div style="font-size: 11px; color: #ef4444;">Error scanning App Link presence.</div>`;
  }
}

if (btnRefreshAppLink) {
  btnRefreshAppLink.addEventListener('click', () => refreshAppLinkStatus());
}

async function extractSelectionAndMetadata(overrideSelection = null) {
  const activeTab = tabs.get(activeTabId);
  if (!activeTab || !activeTab.webviewEl) {
    return null;
  }

  // Safety check: Never send from private window
  if (activeTab.isPrivate) {
    showToast('Cannot send research clips from a private window.');
    return null;
  }

  try {
    const extractScript = `
      (function() {
        const sel = window.getSelection();
        let text = '';
        let html = '';
        if (sel && sel.rangeCount > 0) {
          text = sel.toString();
          const div = document.createElement('div');
          for (let i = 0; i < sel.rangeCount; i++) {
            div.appendChild(sel.getRangeAt(i).cloneContents());
          }
          html = div.innerHTML;
        }

        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const docTitle = document.title || ogTitle || '';

        const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
        const pageUrl = canonical ? new URL(canonical, window.location.href).href : window.location.href;

        const metaAuthor = document.querySelector('meta[name="author"]')?.getAttribute('content')
          || document.querySelector('meta[property="article:author"]')?.getAttribute('content')
          || document.querySelector('[rel="author"]')?.textContent?.trim()
          || '';

        const metaDate = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content')
          || document.querySelector('meta[name="date"]')?.getAttribute('content')
          || document.querySelector('meta[name="pubdate"]')?.getAttribute('content')
          || document.querySelector('time')?.getAttribute('datetime')
          || '';

        return {
          selectionText: text,
          selectionHtml: html,
          pageTitle: docTitle,
          pageUrl: pageUrl,
          pageAuthor: metaAuthor,
          pageDate: metaDate
        };
      })()
    `;

    const data = await activeTab.webviewEl.executeJavaScript(extractScript);
    if (overrideSelection) {
      data.selectionText = overrideSelection;
      data.selectionHtml = overrideSelection;
    }
    return data;
  } catch (err) {
    console.error('Failed to extract selection from page:', err);
    return null;
  }
}

async function triggerClipWorkflow(overrideText = null, preferredTargetId = null) {
  const data = await extractSelectionAndMetadata(overrideText);
  if (!data || (!data.selectionText && !overrideText)) {
    showToast('Select text on the page first to send a research clip.');
    return;
  }

  openResearchClipModal(data, preferredTargetId);
}

async function openResearchClipModal(meta, preferredTargetId = null) {
  currentClipContext = meta;
  selectedDestAppId = preferredTargetId;

  const cleanMarkdown = await ipcRenderer.invoke('app-link:clean-html', meta.selectionHtml || meta.selectionText);

  const clipOptions = {
    text: cleanMarkdown,
    sourceUrl: meta.pageUrl && !meta.pageUrl.startsWith('file://') ? meta.pageUrl : undefined,
    sourceTitle: meta.pageTitle || 'Web Research Clip',
    sourceAuthor: meta.pageAuthor || undefined,
    sourceDate: meta.pageDate ? meta.pageDate.slice(0, 10) : undefined,
    category: clipSelectCategory.value || 'general',
    tags: clipInputTags.value.split(',').map(t => t.trim()).filter(Boolean),
    clipTitle: meta.pageTitle || 'Web Research Clip'
  };

  const formatted = await ipcRenderer.invoke('app-link:format-clip', clipOptions);

  clipInputTitle.value = clipOptions.clipTitle;
  clipPreviewText.value = cleanMarkdown;
  clipTruncateWarning.style.display = formatted.truncated ? 'block' : 'none';

  clipMetaPageTitle.textContent = meta.pageTitle || 'Untitled Page';
  clipMetaUrl.textContent = clipOptions.sourceUrl || 'Local / Internal Page';
  clipMetaAuthor.textContent = clipOptions.sourceAuthor || '—';
  clipMetaDate.textContent = clipOptions.sourceDate || '—';
  clipMetaAccessed.textContent = formatted.accessed || new Date().toISOString().slice(0, 10);

  await renderClipDestinations();
  modalResearchClip.showModal();
}

async function renderClipDestinations() {
  const status = await ipcRenderer.invoke('app-link:get-status');
  const apps = status.apps || [];
  const runningLinked = apps.filter(a => a.running && a.linked);

  if (runningLinked.length === 0) {
    clipDestinations.innerHTML = `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 10px 12px; border-radius: 6px; font-size: 12px; color: var(--text-muted);">
        No linked Recon apps are currently running.
        <div style="margin-top: 4px; font-size: 11px;">
          Start <strong>RT Story Tracker</strong> or <strong>RT Markdown Reader</strong> to send directly, or use <strong>Copy as Markdown</strong> below.
        </div>
      </div>
    `;
    btnClipSend.disabled = true;
    btnClipSend.textContent = 'No Apps Running';
    return;
  }

  if (!selectedDestAppId || !runningLinked.some(a => a.id === selectedDestAppId)) {
    selectedDestAppId = runningLinked[0].id;
  }

  clipDestinations.innerHTML = runningLinked.map(a => {
    const isChecked = a.id === selectedDestAppId;
    return `
      <div class="clip-dest-card ${isChecked ? 'selected' : ''}" data-id="${a.id}">
        <div class="clip-dest-left">
          <input type="radio" name="clip-dest-radio" value="${a.id}" class="clip-dest-radio" ${isChecked ? 'checked' : ''} />
          <div class="clip-dest-info">
            <span class="clip-dest-name">${escapeHtml(a.name)}</span>
            <span class="clip-dest-desc">${a.id === 'rt-story-tracker' ? 'Author & lore workspace — files into project' : 'Distraction-free markdown workspace — opens tab'}</span>
          </div>
        </div>
        <span class="app-link-status-pill linked">Ready</span>
      </div>
    `;
  }).join('');

  clipDestinations.querySelectorAll('.clip-dest-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      selectedDestAppId = id;
      clipDestinations.querySelectorAll('.clip-dest-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      btnClipSend.disabled = false;
      const targetApp = runningLinked.find(a => a.id === id);
      btnClipSend.textContent = `Send to ${targetApp ? targetApp.name : 'App'}`;
    });
  });

  const selectedApp = runningLinked.find(a => a.id === selectedDestAppId);
  btnClipSend.disabled = false;
  btnClipSend.textContent = `Send to ${selectedApp ? selectedApp.name : 'App'}`;
}

async function sendActiveClip() {
  if (!selectedDestAppId) {
    showToast('Please select a destination app.');
    return;
  }

  btnClipSend.disabled = true;
  btnClipSend.textContent = 'Sending...';

  const clipOptions = {
    text: clipPreviewText.value,
    sourceUrl: currentClipContext.pageUrl && !currentClipContext.pageUrl.startsWith('file://') ? currentClipContext.pageUrl : undefined,
    sourceTitle: clipMetaPageTitle.textContent !== 'Untitled Page' ? clipMetaPageTitle.textContent : undefined,
    sourceAuthor: clipMetaAuthor.textContent !== '—' ? clipMetaAuthor.textContent : undefined,
    sourceDate: clipMetaDate.textContent !== '—' ? clipMetaDate.textContent : undefined,
    category: clipSelectCategory.value,
    tags: clipInputTags.value.split(',').map(t => t.trim()).filter(Boolean),
    clipTitle: clipInputTitle.value.trim() || 'Web Research Clip'
  };

  const res = await ipcRenderer.invoke('app-link:send-clip', {
    appId: selectedDestAppId,
    clipOptions
  });

  btnClipSend.disabled = false;
  btnClipSend.textContent = 'Send Clip';

  if (res.success) {
    modalResearchClip.close();
    showToast(`✓ Research clip successfully sent to ${res.name || selectedDestAppId}!`);
  } else {
    showToast(`⚠️ Could not send clip: ${res.message || res.code}`, 6000);
  }
}

async function copyActiveClipAsMarkdown() {
  const clipOptions = {
    text: clipPreviewText.value,
    sourceUrl: currentClipContext.pageUrl && !currentClipContext.pageUrl.startsWith('file://') ? currentClipContext.pageUrl : undefined,
    sourceTitle: clipMetaPageTitle.textContent !== 'Untitled Page' ? clipMetaPageTitle.textContent : undefined,
    sourceAuthor: clipMetaAuthor.textContent !== '—' ? clipMetaAuthor.textContent : undefined,
    sourceDate: clipMetaDate.textContent !== '—' ? clipMetaDate.textContent : undefined,
    category: clipSelectCategory.value,
    tags: clipInputTags.value.split(',').map(t => t.trim()).filter(Boolean),
    clipTitle: clipInputTitle.value.trim() || 'Web Research Clip'
  };

  const formatted = await ipcRenderer.invoke('app-link:format-clip', clipOptions);
  await navigator.clipboard.writeText(formatted.markdown);
  showToast('✓ Research clip with front matter copied to clipboard as Markdown');
}

clipModalClose.addEventListener('click', () => modalResearchClip.close());
btnClipCancel.addEventListener('click', () => modalResearchClip.close());
btnClipSend.addEventListener('click', () => sendActiveClip());
btnClipCopyMd.addEventListener('click', () => copyActiveClipAsMarkdown());

btnClipResearch.addEventListener('click', () => triggerClipWorkflow());
if (menuSendClip) {
  menuSendClip.addEventListener('click', (e) => {
    e.preventDefault();
    ecosystemDropdown.classList.remove('dropdown-open');
    triggerClipWorkflow();
  });
}

ipcRenderer.on('open-clip-dialog', (event, data) => {
  triggerClipWorkflow(data ? data.selectedText : null, data ? data.targetAppId : null);
});

ipcRenderer.on('menu-open-clip', () => {
  triggerClipWorkflow();
});

ipcRenderer.on('copy-clip-as-markdown', async (event, data) => {
  const meta = await extractSelectionAndMetadata(data ? data.selectedText : null);
  if (!meta) return;
  const cleanMarkdown = await ipcRenderer.invoke('app-link:clean-html', meta.selectionHtml || meta.selectionText);
  const clipOptions = {
    text: cleanMarkdown,
    sourceUrl: meta.pageUrl && !meta.pageUrl.startsWith('file://') ? meta.pageUrl : undefined,
    sourceTitle: meta.pageTitle || 'Web Research Clip',
    sourceAuthor: meta.pageAuthor || undefined,
    sourceDate: meta.pageDate ? meta.pageDate.slice(0, 10) : undefined,
    category: 'general',
    tags: ['research', 'web-clip'],
    clipTitle: meta.pageTitle || 'Web Research Clip'
  };
  const formatted = await ipcRenderer.invoke('app-link:format-clip', clipOptions);
  await navigator.clipboard.writeText(formatted.markdown);
  showToast('✓ Research clip copied to clipboard as Markdown');
});

btnSettingsToggle.addEventListener('click', () => {
  refreshAppLinkStatus();
});

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    omnibar.focus();
    omnibar.select();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
    e.preventDefault();
    createTab();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    closeTab(activeTabId);
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.webviewEl) activeTab.webviewEl.reload();
  } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    toggleReaderView();
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    startReadAloud();
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
    e.preventDefault();
    stopReadAloud();
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    triggerClipWorkflow();
  } else if (e.key === 'Escape') {
    if (modalResearchClip && modalResearchClip.open) {
      modalResearchClip.close();
    }
    const mLogin = document.getElementById('modal-add-login');
    if (mLogin && mLogin.open) {
      mLogin.close();
    }
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.readerActive) {
      toggleReaderView();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
    e.preventDefault();
    openSettingsModal('history');
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    const vToggle = document.getElementById('btn-vault-toggle');
    if (vToggle) vToggle.click();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.shiftKey) {
    e.preventDefault();
    const bToggle = document.getElementById('btn-bookmarks-toggle');
    if (bToggle) bToggle.click();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    const activeTab = tabs.get(activeTabId);
    if (activeTab) addBookmark(activeTab.url, activeTab.title);
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    const current = localStorage.getItem('recon_show_bookmarks_bar') === 'true';
    setBookmarksBarVisibility(!current);
  } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault();
    if (settingsModal && settingsModal.open) {
      closeSettingsModal();
    } else {
      openSettingsModal('appearance');
    }
  }
});

// ==========================================================================
// Native Bookmarks System (v1.4.0)
// ==========================================================================
const btnBookmarksToggle = document.getElementById('btn-bookmarks-toggle');
const bookmarksDropdown = document.getElementById('bookmarks-dropdown');
const btnAddBookmark = document.getElementById('btn-add-bookmark');
const btnNewBookmarkFolder = document.getElementById('btn-new-bookmark-folder');
const selectBookmarkSort = document.getElementById('select-bookmark-sort');
const selectBookmarkFolder = document.getElementById('select-bookmark-folder');
const bookmarksList = document.getElementById('bookmarks-list');
const toggleBookmarksBar = document.getElementById('toggle-bookmarks-bar');
const settingsToggleBookmarksBar = document.getElementById('settings-toggle-bookmarks-bar');
const bookmarksBar = document.getElementById('bookmarks-bar');

const DEFAULT_BOOKMARKS = [
  { id: 'bm_1', title: 'Recon Towers Hub', url: 'https://recontowers.com', folder: 'Favorites', favicon: '⚡', createdAt: 1000 },
  { id: 'bm_2', title: 'Neo Gentrics', url: 'https://neogentrics.com', folder: 'Favorites', favicon: '🏢', createdAt: 2000 },
  { id: 'bm_3', title: 'RT Markdown Reader', url: 'https://recontowers.com/apps/rt-markdown-reader/', folder: 'Recon Apps', favicon: '📝', createdAt: 3000 },
  { id: 'bm_4', title: 'RT Story Tracker', url: 'https://recontowers.com/apps/rt-story-tracker/', folder: 'Recon Apps', favicon: '📚', createdAt: 4000 },
  { id: 'bm_5', title: 'DuckDuckGo', url: 'https://duckduckgo.com', folder: 'Search', favicon: '🦆', createdAt: 5000 }
];

function loadBookmarks() {
  try {
    const raw = localStorage.getItem('recon_bookmarks');
    if (raw) return JSON.parse(raw);
  } catch (err) {}
  try {
    localStorage.setItem('recon_bookmarks', JSON.stringify(DEFAULT_BOOKMARKS));
  } catch (err) {}
  return DEFAULT_BOOKMARKS;
}

function saveBookmarks(bms) {
  try {
    localStorage.setItem('recon_bookmarks', JSON.stringify(bms));
  } catch (err) {}
  renderBookmarks();
}

function addBookmark(url, title, folder = null, favicon = '★') {
  if (!url) return;
  const bms = loadBookmarks();
  const existingIdx = bms.findIndex(b => b.url === url);
  if (existingIdx !== -1) {
    bms[existingIdx].title = title || bms[existingIdx].title;
    if (folder) bms[existingIdx].folder = folder;
    saveBookmarks(bms);
    showToast(`★ Updated bookmark: ${bms[existingIdx].title}`);
    return;
  }
  const cleanTitle = title || (url.includes('startpage.html') ? 'Recon Start' : url);
  const targetFolder = folder || (selectBookmarkFolder && selectBookmarkFolder.value !== 'all' ? selectBookmarkFolder.value : 'Favorites');
  const newBm = {
    id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    title: cleanTitle,
    url,
    folder: targetFolder,
    favicon: favicon || (url.includes('startpage.html') ? '⚡' : '🌐'),
    createdAt: Date.now()
  };
  bms.push(newBm);
  saveBookmarks(bms);
  showToast(`★ Bookmarked: ${newBm.title} in [${newBm.folder}]`);
}

function deleteBookmark(id) {
  const bms = loadBookmarks().filter(b => b.id !== id);
  saveBookmarks(bms);
  showToast('Bookmark removed');
}

function renderBookmarks() {
  const bms = loadBookmarks();

  // Populate folder select filter
  if (selectBookmarkFolder) {
    const currentFolder = selectBookmarkFolder.value || 'all';
    const folders = Array.from(new Set(bms.map(b => b.folder || 'Favorites'))).sort();
    selectBookmarkFolder.innerHTML = `<option value="all">All Folders</option>` +
      folders.map(f => `<option value="${escapeHtml(f)}" ${currentFolder === f ? 'selected' : ''}>📁 ${escapeHtml(f)}</option>`).join('');
  }

  const sortMode = selectBookmarkSort ? selectBookmarkSort.value : 'recent';
  const folderFilter = selectBookmarkFolder ? selectBookmarkFolder.value : 'all';

  let filtered = [...bms];
  if (folderFilter !== 'all') {
    filtered = filtered.filter(b => (b.folder || 'Favorites') === folderFilter);
  }

  if (sortMode === 'az') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortMode === 'folder') {
    filtered.sort((a, b) => (a.folder || 'Favorites').localeCompare(b.folder || 'Favorites') || (a.title || '').localeCompare(b.title || ''));
  } else {
    // Recent
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  // 1. Render Dropdown List
  if (bookmarksList) {
    if (filtered.length === 0) {
      bookmarksList.innerHTML = `<div class="bookmark-empty" style="padding: 10px; color: var(--text-muted); text-align: center; font-size: 11.5px;">No bookmarks in this view. Press + or Ctrl+D to bookmark.</div>`;
    } else {
      let lastFolder = null;
      let html = '';
      filtered.forEach(b => {
        const fName = b.folder || 'Favorites';
        if (sortMode === 'folder' && fName !== lastFolder) {
          html += `<div class="bookmark-folder-header">📁 ${escapeHtml(fName)}</div>`;
          lastFolder = fName;
        }
        html += `
          <div class="bookmark-dropdown-item" data-url="${escapeHtml(b.url)}">
            <div class="bm-info" title="${escapeHtml(b.url)}">
              <span class="bm-favicon">${b.favicon || '★'}</span>
              <span class="bm-title">${escapeHtml(b.title)}</span>
              ${sortMode !== 'folder' && b.folder ? `<span class="bookmark-folder-badge">${escapeHtml(b.folder)}</span>` : ''}
            </div>
            <button class="bm-del-btn" data-del-id="${b.id}" title="Delete Bookmark">×</button>
          </div>
        `;
      });
      bookmarksList.innerHTML = html;

      bookmarksList.querySelectorAll('.bookmark-dropdown-item').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.bm-del-btn')) {
            e.stopPropagation();
            const delId = e.target.closest('.bm-del-btn').getAttribute('data-del-id');
            deleteBookmark(delId);
            return;
          }
          const url = el.getAttribute('data-url');
          if (url) {
            const activeTab = tabs.get(activeTabId);
            if (activeTab && activeTab.webviewEl) {
              activeTab.webviewEl.loadURL(url);
            } else {
              createTab(url, true);
            }
            if (bookmarksDropdown) bookmarksDropdown.style.display = 'none';
          }
        });
      });
    }
  }

  // 2. Render Bookmarks Bar
  if (bookmarksBar) {
    bookmarksBar.innerHTML = bms.map(b => `
      <div class="bookmark-bar-item" data-url="${escapeHtml(b.url)}" title="${escapeHtml(b.title)} (${escapeHtml(b.url)})">
        <span class="bm-favicon">${b.favicon || '★'}</span>
        <span class="bm-title">${escapeHtml(b.title)}</span>
      </div>
    `).join('');

    bookmarksBar.querySelectorAll('.bookmark-bar-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const url = el.getAttribute('data-url');
        if (url) {
          if (e.button === 1 || e.ctrlKey || e.metaKey) {
            createTab(url, true);
          } else {
            const activeTab = tabs.get(activeTabId);
            if (activeTab && activeTab.webviewEl) {
              activeTab.webviewEl.loadURL(url);
            } else {
              createTab(url, true);
            }
          }
        }
      });
    });
  }
}

function setBookmarksBarVisibility(show) {
  localStorage.setItem('recon_show_bookmarks_bar', String(show));
  if (bookmarksBar) bookmarksBar.style.display = show ? 'flex' : 'none';
  if (toggleBookmarksBar) toggleBookmarksBar.checked = show;
  if (settingsToggleBookmarksBar) settingsToggleBookmarksBar.checked = show;
}

if (selectBookmarkSort) selectBookmarkSort.addEventListener('change', renderBookmarks);
if (selectBookmarkFolder) selectBookmarkFolder.addEventListener('change', renderBookmarks);
if (btnNewBookmarkFolder) {
  btnNewBookmarkFolder.addEventListener('click', () => {
    const fName = prompt('Enter new bookmark folder name:');
    if (fName && fName.trim()) {
      const activeTab = tabs.get(activeTabId);
      if (activeTab) {
        addBookmark(activeTab.url, activeTab.title, fName.trim());
      }
    }
  });
}
if (settingsToggleBookmarksBar) {
  settingsToggleBookmarksBar.checked = localStorage.getItem('recon_show_bookmarks_bar') === 'true';
  settingsToggleBookmarksBar.addEventListener('change', (e) => {
    setBookmarksBarVisibility(e.target.checked);
  });
}

if (btnBookmarksToggle) {
  btnBookmarksToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    shieldsPopover.classList.add('popover-hidden');
    ecosystemDropdown.style.display = 'none';
    const vDrop = document.getElementById('vault-dropdown');
    if (vDrop) vDrop.style.display = 'none';
    closeSettingsModal();
    const isShown = bookmarksDropdown.style.display === 'block';
    bookmarksDropdown.style.display = isShown ? 'none' : 'block';
    renderBookmarks();
  });
}

if (btnAddBookmark) {
  btnAddBookmark.addEventListener('click', () => {
    const activeTab = tabs.get(activeTabId);
    if (activeTab) {
      addBookmark(activeTab.url, activeTab.title);
    }
  });
}

if (toggleBookmarksBar) {
  toggleBookmarksBar.checked = localStorage.getItem('recon_show_bookmarks_bar') === 'true';
  setBookmarksBarVisibility(toggleBookmarksBar.checked);
  toggleBookmarksBar.addEventListener('change', (e) => {
    setBookmarksBarVisibility(e.target.checked);
  });
}

// IPC Bookmarks Listeners from native context menu
ipcRenderer.on('bookmark-active-tab', () => {
  const activeTab = tabs.get(activeTabId);
  if (activeTab) {
    addBookmark(activeTab.url, activeTab.title);
  }
});

ipcRenderer.on('bookmark-link', (event, { url, title }) => {
  if (url) {
    addBookmark(url, title || url);
  }
});

ipcRenderer.on('open-link-new-tab', (event, { url }) => {
  if (url) {
    createTab(url, true);
  }
});

// ==========================================================================
// Browsing History Tracking System (v1.4.0)
// ==========================================================================
const btnHistoryToggle = document.getElementById('btn-history-toggle');
const inputHistorySearch = document.getElementById('input-history-search');
const selectClearHistoryRange = document.getElementById('select-clear-history-range');
const btnClearHistory = document.getElementById('btn-clear-history');
const toggleHistoryClearOnQuit = document.getElementById('toggle-history-clear-on-quit');
const historyGroupsContainer = document.getElementById('history-groups-container');

async function loadAndRenderHistory(query = '') {
  if (!historyGroupsContainer) return;
  try {
    const groups = await ipcRenderer.invoke('history:get-grouped', query);
    if (!groups || groups.length === 0) {
      historyGroupsContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 32px 16px; font-size: 12px;">
          ${query ? 'No history matching your search.' : 'No browsing history recorded yet.'}
        </div>`;
      return;
    }

    historyGroupsContainer.innerHTML = groups.map(group => {
      const itemsHtml = group.items.map(item => {
        const d = new Date(item.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="history-item-row" data-url="${escapeHtml(item.url)}">
            <span class="history-time">${timeStr}</span>
            <div class="history-item-info">
              <span class="history-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
              <span class="history-item-url" title="${escapeHtml(item.url)}">${escapeHtml(item.url)}</span>
            </div>
            <button class="history-item-del" data-id="${item.id}" title="Remove from history">×</button>
          </div>
        `;
      }).join('');

      return `
        <div class="history-day-card">
          <div class="history-day-header">
            <div class="history-day-left">
              <span class="day-toggle-arrow">▼</span>
              <span class="day-title">${escapeHtml(group.label)}</span>
            </div>
            <span class="day-count">${group.items.length} ${group.items.length === 1 ? 'page' : 'pages'}</span>
          </div>
          <div class="history-items-list">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');

    // Wire day card collapsible toggle
    historyGroupsContainer.querySelectorAll('.history-day-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const card = hdr.closest('.history-day-card');
        if (card) card.classList.toggle('collapsed');
      });
    });

    // Wire click to navigate and delete
    historyGroupsContainer.querySelectorAll('.history-item-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.history-item-del')) {
          e.stopPropagation();
          const delId = e.target.closest('.history-item-del').getAttribute('data-id');
          if (delId) deleteHistoryItem(delId);
          return;
        }
        const url = row.getAttribute('data-url');
        if (url) {
          closeSettingsModal();
          const activeTab = tabs.get(activeTabId);
          if (activeTab && activeTab.webviewEl) {
            activeTab.webviewEl.loadURL(url);
          } else {
            createTab(url, true);
          }
        }
      });
    });
  } catch (err) {
    console.error('[Recon History] Failed to load history:', err);
    historyGroupsContainer.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">Failed to load history</div>`;
  }
}

async function deleteHistoryItem(id) {
  try {
    await ipcRenderer.invoke('history:delete', id);
    const q = inputHistorySearch ? inputHistorySearch.value.trim() : '';
    await loadAndRenderHistory(q);
    showToast('Entry removed from history');
  } catch (err) {
    showToast('Failed to delete history entry');
  }
}

if (btnClearHistory) {
  btnClearHistory.addEventListener('click', async () => {
    const range = selectClearHistoryRange ? selectClearHistoryRange.value : '24h';
    const rangeLabels = { '1h': 'last hour', '24h': 'last 24 hours', '7d': 'last 7 days', 'all': 'all time' };
    try {
      await ipcRenderer.invoke('history:clear', range);
      await loadAndRenderHistory();
      showToast(`Browsing history cleared (${rangeLabels[range] || range})`);
    } catch (err) {
      showToast('Failed to clear history');
    }
  });
}

let historySearchTimer = null;
if (inputHistorySearch) {
  inputHistorySearch.addEventListener('input', (e) => {
    clearTimeout(historySearchTimer);
    historySearchTimer = setTimeout(() => {
      loadAndRenderHistory(e.target.value.trim());
    }, 200);
  });
}

if (toggleHistoryClearOnQuit) {
  const savedVal = localStorage.getItem('recon_history_clear_on_quit') === 'true';
  toggleHistoryClearOnQuit.checked = savedVal;
  ipcRenderer.invoke('history:set-clear-on-quit', savedVal);
  toggleHistoryClearOnQuit.addEventListener('change', (e) => {
    localStorage.setItem('recon_history_clear_on_quit', String(e.target.checked));
    ipcRenderer.invoke('history:set-clear-on-quit', e.target.checked);
  });
}

if (btnHistoryToggle) {
  btnHistoryToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    openSettingsModal('history');
  });
}

// ==========================================================================
// Encrypted Password Vault & Opt-In Autofill (v1.4.0)
// ==========================================================================
const btnVaultToggle = document.getElementById('btn-vault-toggle');
const vaultDropdown = document.getElementById('vault-dropdown');
const btnVaultOpenSettings = document.getElementById('btn-vault-open-settings');
const vaultDropdownDomainLabel = document.getElementById('vault-dropdown-domain-label');
const vaultDropdownLoginsList = document.getElementById('vault-dropdown-logins-list');
const btnVaultQuickAdd = document.getElementById('btn-vault-quick-add');
const btnVaultQuickGenerate = document.getElementById('btn-vault-quick-generate');

// Settings Vault Elements
const inputVaultSearch = document.getElementById('input-vault-search');
const btnVaultAddLogin = document.getElementById('btn-vault-add-login');
const vaultLoginsContainer = document.getElementById('vault-logins-container');
const inputGeneratedPassword = document.getElementById('input-generated-password');
const btnGeneratorCopy = document.getElementById('btn-generator-copy');
const btnGeneratorCreate = document.getElementById('btn-generator-create');
const sliderPasswordLength = document.getElementById('slider-password-length');
const labelPassLength = document.getElementById('label-pass-length');
const genOptUpper = document.getElementById('gen-opt-upper');
const genOptLower = document.getElementById('gen-opt-lower');
const genOptNum = document.getElementById('gen-opt-num');
const genOptSym = document.getElementById('gen-opt-sym');

// Add Login Modal Elements
const modalAddLogin = document.getElementById('modal-add-login');
const vaultModalTitle = document.getElementById('vault-modal-title');
const vaultFormId = document.getElementById('vault-form-id');
const vaultFormDomain = document.getElementById('vault-form-domain');
const vaultFormUsername = document.getElementById('vault-form-username');
const vaultFormPassword = document.getElementById('vault-form-password');
const vaultFormNotes = document.getElementById('vault-form-notes');
const btnVaultFormGenerate = document.getElementById('btn-vault-form-generate');
const btnVaultFormTogglePass = document.getElementById('btn-vault-form-toggle-pass');
const btnVaultModalClose = document.getElementById('btn-vault-modal-close');
const btnVaultModalCancel = document.getElementById('btn-vault-modal-cancel');
const btnVaultModalSave = document.getElementById('btn-vault-modal-save');

async function generatePasswordWithOptions() {
  const options = {
    length: sliderPasswordLength ? parseInt(sliderPasswordLength.value, 10) : 18,
    uppercase: genOptUpper ? genOptUpper.checked : true,
    lowercase: genOptLower ? genOptLower.checked : true,
    numbers: genOptNum ? genOptNum.checked : true,
    symbols: genOptSym ? genOptSym.checked : true
  };
  try {
    const pw = await ipcRenderer.invoke('vault:generate-password', options);
    if (inputGeneratedPassword) inputGeneratedPassword.value = pw;
    return pw;
  } catch (err) {
    console.error('[Recon Vault] Password generator error:', err);
    return '';
  }
}

if (sliderPasswordLength) {
  sliderPasswordLength.addEventListener('input', (e) => {
    if (labelPassLength) labelPassLength.textContent = `Length: ${e.target.value}`;
    generatePasswordWithOptions();
  });
}
[genOptUpper, genOptLower, genOptNum, genOptSym].forEach(chk => {
  if (chk) chk.addEventListener('change', generatePasswordWithOptions);
});
if (btnGeneratorCreate) btnGeneratorCreate.addEventListener('click', generatePasswordWithOptions);
if (btnGeneratorCopy) {
  btnGeneratorCopy.addEventListener('click', () => {
    if (inputGeneratedPassword && inputGeneratedPassword.value) {
      ipcRenderer.send('copy-to-clipboard', inputGeneratedPassword.value);
      showToast('Generated password copied to clipboard');
    }
  });
}

async function loadAndRenderVault(query = '') {
  if (!vaultLoginsContainer) return;
  try {
    const all = await ipcRenderer.invoke('vault:get-all');
    let items = Array.isArray(all) ? all : [];
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(i => 
        (i.domain && i.domain.toLowerCase().includes(q)) ||
        (i.username && i.username.toLowerCase().includes(q)) ||
        (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    if (items.length === 0) {
      vaultLoginsContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 12px;">
          ${query ? 'No logins match your search.' : 'No saved credentials in vault. Click "+ Add Login" to create one.'}
        </div>`;
      return;
    }

    vaultLoginsContainer.innerHTML = items.map(item => `
      <div class="vault-login-card" data-id="${item.id}">
        <div class="vault-login-header">
          <span class="vault-login-domain">🌐 ${escapeHtml(item.domain)}</span>
          <div class="vault-login-actions">
            <button class="vault-action-btn btn-edit-login" data-id="${item.id}" title="Edit login">✏️ Edit</button>
            <button class="vault-action-btn btn-del-login" data-id="${item.id}" title="Delete login">🗑️</button>
          </div>
        </div>
        <div class="vault-login-row">
          <div class="vault-login-field-val">
            <span style="color: var(--text-muted); width: 65px;">User:</span>
            <strong>${escapeHtml(item.username)}</strong>
          </div>
          <button class="vault-action-btn btn-copy-user" data-user="${escapeHtml(item.username)}" title="Copy username">📋 Copy</button>
        </div>
        <div class="vault-login-row">
          <div class="vault-login-field-val">
            <span style="color: var(--text-muted); width: 65px;">Password:</span>
            <span class="vault-pass-masked" data-pass="${escapeHtml(item.password)}">••••••••••••</span>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="vault-action-btn btn-reveal-pass" title="Reveal/Mask password">👁️</button>
            <button class="vault-action-btn btn-copy-pass" data-pass="${escapeHtml(item.password)}" title="Copy password">📋 Copy</button>
          </div>
        </div>
        ${item.notes ? `<div style="font-size: 11px; color: var(--text-muted); font-style: italic; padding: 2px 4px;">Note: ${escapeHtml(item.notes)}</div>` : ''}
      </div>
    `).join('');

    // Wire card buttons
    vaultLoginsContainer.querySelectorAll('.btn-copy-user').forEach(btn => {
      btn.addEventListener('click', () => {
        ipcRenderer.send('copy-to-clipboard', btn.getAttribute('data-user') || '');
        showToast('Username copied to clipboard');
      });
    });

    vaultLoginsContainer.querySelectorAll('.btn-copy-pass').forEach(btn => {
      btn.addEventListener('click', () => {
        ipcRenderer.send('copy-to-clipboard', btn.getAttribute('data-pass') || '');
        showToast('Password copied to clipboard');
      });
    });

    vaultLoginsContainer.querySelectorAll('.btn-reveal-pass').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.vault-login-row');
        const passSpan = row?.querySelector('.vault-pass-masked');
        if (!passSpan) return;
        const realPass = passSpan.getAttribute('data-pass') || '';
        if (passSpan.textContent === '••••••••••••') {
          passSpan.textContent = realPass;
          btn.textContent = '🙈';
        } else {
          passSpan.textContent = '••••••••••••';
          btn.textContent = '👁️';
        }
      });
    });

    vaultLoginsContainer.querySelectorAll('.btn-del-login').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          await ipcRenderer.invoke('vault:delete', id);
          showToast('Login deleted from vault');
          loadAndRenderVault(inputVaultSearch ? inputVaultSearch.value.trim() : '');
        }
      });
    });

    vaultLoginsContainer.querySelectorAll('.btn-edit-login').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = items.find(i => i.id === id);
        if (item) openAddLoginModal(item);
      });
    });

  } catch (err) {
    console.error('[Recon Vault] Failed to load vault:', err);
    vaultLoginsContainer.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">Failed to load vault</div>`;
  }
}

let vaultSearchTimer = null;
if (inputVaultSearch) {
  inputVaultSearch.addEventListener('input', (e) => {
    clearTimeout(vaultSearchTimer);
    vaultSearchTimer = setTimeout(() => {
      loadAndRenderVault(e.target.value.trim());
    }, 200);
  });
}

function openAddLoginModal(editItem = null) {
  if (!modalAddLogin) return;
  if (editItem) {
    if (vaultModalTitle) vaultModalTitle.textContent = 'Edit Login Credential';
    if (vaultFormId) vaultFormId.value = editItem.id || '';
    if (vaultFormDomain) vaultFormDomain.value = editItem.domain || '';
    if (vaultFormUsername) vaultFormUsername.value = editItem.username || '';
    if (vaultFormPassword) vaultFormPassword.value = editItem.password || '';
    if (vaultFormNotes) vaultFormNotes.value = editItem.notes || '';
  } else {
    if (vaultModalTitle) vaultModalTitle.textContent = 'Save Login Credential';
    if (vaultFormId) vaultFormId.value = '';
    const activeTab = tabs.get(activeTabId);
    let host = '';
    if (activeTab && activeTab.url && !activeTab.url.includes('startpage.html')) {
      try { host = new URL(activeTab.url).hostname; } catch {}
    }
    if (vaultFormDomain) vaultFormDomain.value = host;
    if (vaultFormUsername) vaultFormUsername.value = '';
    if (vaultFormPassword) vaultFormPassword.value = '';
    if (vaultFormNotes) vaultFormNotes.value = '';
  }
  modalAddLogin.showModal();
}

if (btnVaultAddLogin) btnVaultAddLogin.addEventListener('click', () => openAddLoginModal());
if (btnVaultQuickAdd) {
  btnVaultQuickAdd.addEventListener('click', () => {
    if (vaultDropdown) vaultDropdown.style.display = 'none';
    openAddLoginModal();
  });
}
if (btnVaultModalClose) btnVaultModalClose.addEventListener('click', () => modalAddLogin?.close());
if (btnVaultModalCancel) btnVaultModalCancel.addEventListener('click', () => modalAddLogin?.close());

if (btnVaultFormGenerate) {
  btnVaultFormGenerate.addEventListener('click', async (e) => {
    e.preventDefault();
    const pw = await ipcRenderer.invoke('vault:generate-password', { length: 18 });
    if (vaultFormPassword) {
      vaultFormPassword.value = pw;
      vaultFormPassword.type = 'text';
    }
  });
}

if (btnVaultFormTogglePass) {
  btnVaultFormTogglePass.addEventListener('click', (e) => {
    e.preventDefault();
    if (vaultFormPassword) {
      vaultFormPassword.type = vaultFormPassword.type === 'password' ? 'text' : 'password';
      btnVaultFormTogglePass.textContent = vaultFormPassword.type === 'password' ? '👁️' : '🙈';
    }
  });
}

if (btnVaultModalSave) {
  btnVaultModalSave.addEventListener('click', async () => {
    const domain = vaultFormDomain ? vaultFormDomain.value.trim() : '';
    const username = vaultFormUsername ? vaultFormUsername.value.trim() : '';
    const password = vaultFormPassword ? vaultFormPassword.value : '';
    const notes = vaultFormNotes ? vaultFormNotes.value.trim() : '';

    if (!domain || !username || !password) {
      showToast('Please provide domain, username, and password');
      return;
    }

    try {
      await ipcRenderer.invoke('vault:save', { domain, username, password, notes });
      modalAddLogin?.close();
      showToast(`Saved credentials for ${domain}`);
      loadAndRenderVault(inputVaultSearch ? inputVaultSearch.value.trim() : '');
      if (vaultDropdown && vaultDropdown.style.display === 'block') {
        renderVaultDropdown();
      }
    } catch (err) {
      showToast('Failed to save credential to vault');
    }
  });
}

// Opt-In Autofill Dropdown in Top Bar
async function renderVaultDropdown() {
  if (!vaultDropdown) return;
  const activeTab = tabs.get(activeTabId);
  let domain = '';
  if (activeTab && activeTab.url && !activeTab.url.includes('startpage.html')) {
    try { domain = new URL(activeTab.url).hostname; } catch {}
  }

  if (vaultDropdownDomainLabel) {
    vaultDropdownDomainLabel.textContent = domain ? `Logins for ${domain}:` : 'Logins for current page:';
  }

  if (!domain) {
    if (vaultDropdownLoginsList) {
      vaultDropdownLoginsList.innerHTML = `<div class="vault-empty" style="padding: 10px; color: var(--text-muted); text-align: center; font-size: 11.5px;">Open a website to view matching logins.</div>`;
    }
    return;
  }

  try {
    const matching = await ipcRenderer.invoke('vault:get-for-domain', domain);
    if (!matching || matching.length === 0) {
      vaultDropdownLoginsList.innerHTML = `
        <div class="vault-empty" style="padding: 10px; color: var(--text-muted); text-align: center; font-size: 11.5px;">
          No saved logins for ${escapeHtml(domain)}.
        </div>`;
      return;
    }

    vaultDropdownLoginsList.innerHTML = matching.map(cred => `
      <div class="vault-dropdown-item">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 175px;">
          <strong style="color: var(--text-main); display: block;">${escapeHtml(cred.username)}</strong>
          <span style="font-size: 10.5px; color: var(--text-muted);">••••••••</span>
        </div>
        <button class="vault-autofill-btn" data-user="${escapeHtml(cred.username)}" data-pass="${escapeHtml(cred.password)}">Autofill</button>
      </div>
    `).join('');

    vaultDropdownLoginsList.querySelectorAll('.vault-autofill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const u = btn.getAttribute('data-user') || '';
        const p = btn.getAttribute('data-pass') || '';
        injectAutofillCredentials(u, p);
        vaultDropdown.style.display = 'none';
      });
    });
  } catch (err) {
    console.error('[Recon Vault] Error rendering dropdown:', err);
  }
}

function injectAutofillCredentials(username, password) {
  const activeTab = tabs.get(activeTabId);
  if (!activeTab || !activeTab.webviewEl) return;

  const code = `
    (() => {
      const uVal = ${JSON.stringify(username)};
      const pVal = ${JSON.stringify(password)};
      const passInputs = Array.from(document.querySelectorAll('input[type="password"]'));
      const passInput = passInputs[0];
      const userInputs = Array.from(document.querySelectorAll('input[type="email"], input[type="text"], input:not([type])'));
      let userInput = userInputs.find(i => /user|email|login|name/i.test(i.name || i.id || i.getAttribute('autocomplete') || ''));
      if (!userInput && passInput) {
        const allInputs = Array.from(document.querySelectorAll('input'));
        const pIdx = allInputs.indexOf(passInput);
        if (pIdx > 0) userInput = allInputs[pIdx - 1];
      }
      if (userInput) {
        userInput.focus();
        userInput.value = uVal;
        userInput.dispatchEvent(new Event('input', { bubbles: true }));
        userInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (passInput) {
        passInput.focus();
        passInput.value = pVal;
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return Boolean(userInput || passInput);
    })();
  `;

  activeTab.webviewEl.executeJavaScript(code).then(filled => {
    if (filled) {
      showToast(`🔑 Autofilled credentials for ${username}`);
    } else {
      showToast('No login form detected on page');
    }
  }).catch(() => {
    showToast('Failed to autofill credentials');
  });
}

if (btnVaultToggle) {
  btnVaultToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    shieldsPopover.classList.add('popover-hidden');
    ecosystemDropdown.style.display = 'none';
    if (bookmarksDropdown) bookmarksDropdown.style.display = 'none';
    closeSettingsModal();
    const isShown = vaultDropdown.style.display === 'block';
    vaultDropdown.style.display = isShown ? 'none' : 'block';
    if (!isShown) renderVaultDropdown();
  });
}

if (btnVaultOpenSettings) {
  btnVaultOpenSettings.addEventListener('click', () => {
    if (vaultDropdown) vaultDropdown.style.display = 'none';
    openSettingsModal('vault');
  });
}

if (btnVaultQuickGenerate) {
  btnVaultQuickGenerate.addEventListener('click', async () => {
    const pw = await ipcRenderer.invoke('vault:generate-password', { length: 18 });
    ipcRenderer.send('copy-to-clipboard', pw);
    showToast(`⚡ Generated & copied password: ${pw.slice(0, 4)}••••`);
  });
}

// ==========================================================================
// Default Browser Integration (v1.4.0)
// ==========================================================================
const defaultBrowserBanner = document.getElementById('default-browser-banner');
const btnBannerSetDefault = document.getElementById('btn-banner-set-default');
const btnBannerDismissDefault = document.getElementById('btn-banner-dismiss-default');
const btnSetDefaultBrowser = document.getElementById('btn-set-default-browser');
const defaultBrowserStatusText = document.getElementById('default-browser-status-text');

async function checkDefaultBrowserStatus() {
  try {
    const isDefault = await ipcRenderer.invoke('default-browser:status');
    updateDefaultBrowserUI(isDefault);
    if (!isDefault && localStorage.getItem('recon_dismiss_default_browser') !== 'true') {
      if (defaultBrowserBanner) defaultBrowserBanner.style.display = 'flex';
    } else {
      if (defaultBrowserBanner) defaultBrowserBanner.style.display = 'none';
    }
  } catch (err) {
    console.warn('[DefaultBrowser] Failed to check status:', err);
  }
}

function updateDefaultBrowserUI(isDefault) {
  if (defaultBrowserStatusText) {
    defaultBrowserStatusText.textContent = isDefault 
      ? 'Recon Browser is currently your default web browser.'
      : 'Recon Browser is not your default web browser.';
  }
  if (btnSetDefaultBrowser) {
    btnSetDefaultBrowser.textContent = isDefault ? 'Default Browser ✓' : 'Make Default';
    btnSetDefaultBrowser.disabled = isDefault;
  }
}

async function setAsDefaultBrowser() {
  try {
    const success = await ipcRenderer.invoke('default-browser:set');
    if (success) {
      showToast('Recon Browser set as default web browser');
      if (defaultBrowserBanner) defaultBrowserBanner.style.display = 'none';
      updateDefaultBrowserUI(true);
    } else {
      showToast('Please confirm default browser prompt in Windows settings');
    }
  } catch (err) {
    showToast('Failed to set default browser');
  }
}

if (btnBannerSetDefault) btnBannerSetDefault.addEventListener('click', setAsDefaultBrowser);
if (btnSetDefaultBrowser) btnSetDefaultBrowser.addEventListener('click', setAsDefaultBrowser);
if (btnBannerDismissDefault) {
  btnBannerDismissDefault.addEventListener('click', () => {
    localStorage.setItem('recon_dismiss_default_browser', 'true');
    if (defaultBrowserBanner) defaultBrowserBanner.style.display = 'none';
  });
}

// ==========================================================================
// Initialization
// ==========================================================================
const savedTheme = localStorage.getItem('recon_theme') || 'cyber';
const savedAspect = localStorage.getItem('recon_aspect') || 'solid';
applyThemeAndAspect(savedTheme, savedAspect);

const savedEngine = localStorage.getItem('recon_default_engine') || 'duckduckgo';
setEngine(savedEngine);

// Global Shields & DoH Initial State Sync
if (toggleAdblock) toggleAdblock.checked = shieldsGlobalActive;
if (popoverOptAdblock) popoverOptAdblock.checked = shieldsGlobalActive;
ipcRenderer.send('toggle-shields', shieldsGlobalActive);
updateShieldsPopoverDisplay();

// Initial Bookmarks, App Link & Default Browser Check
renderBookmarks();
refreshAppLinkStatus();
checkDefaultBrowserStatus();

// Initialize password generator
generatePasswordWithOptions();

// Create First Tab
createTab(getStartPageURL());
