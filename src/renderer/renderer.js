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

// Settings Drawer
const settingsDrawer = document.getElementById('settings-drawer');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const selectTheme = document.getElementById('select-theme');
const selectAspect = document.getElementById('select-aspect');
const selectEngine = document.getElementById('select-engine');
const selectHomeDest = document.getElementById('select-home-dest');
const customHomeGroup = document.getElementById('custom-home-group');
const inputCustomHome = document.getElementById('input-custom-home');
const toggleStartpageApps = document.getElementById('toggle-startpage-apps');
const toggleNavbarApps = document.getElementById('toggle-navbar-apps');
const toggleDoh = document.getElementById('toggle-doh');
const toggleAdblock = document.getElementById('toggle-adblock');
const toggleFingerprint = document.getElementById('toggle-fingerprint');
const toggleWebrtc = document.getElementById('toggle-webrtc');
const toggleStripParams = document.getElementById('toggle-strip-params');
const btnDrawerStartRead = document.getElementById('btn-drawer-start-read');
const selectVoiceSpeed = document.getElementById('select-voice-speed');
const toggleTtsHighlight = document.getElementById('toggle-tts-highlight');
const btnOpenAbout = document.getElementById('btn-open-about');

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
      shieldsGlobalActive = !shieldsGlobalActive;
      toggleAdblock.checked = shieldsGlobalActive;
      popoverOptAdblock.checked = shieldsGlobalActive;
      localStorage.setItem('recon_shields_active', String(shieldsGlobalActive));
      localStorage.setItem('recon_opt_adblock', String(shieldsGlobalActive));
      ipcRenderer.send('toggle-shields', shieldsGlobalActive);
      updateShieldsPopoverDisplay();
      tabs.forEach(tab => syncThemeToWebview(tab.webviewEl));
      showToast(shieldsGlobalActive ? 'Recon Shields: Active' : 'Recon Shields: Paused');
    } else if (msg === 'RECON_ACTION:TOGGLE_DOH') {
      const current = localStorage.getItem('recon_doh_enabled') !== 'false';
      const next = !current;
      localStorage.setItem('recon_doh_enabled', String(next));
      if (toggleDoh) toggleDoh.checked = next;
      ipcRenderer.send('toggle-doh', next);
      tabs.forEach(tab => syncThemeToWebview(tab.webviewEl));
      showToast(next ? 'DNS-over-HTTPS: Encrypted (Cloudflare)' : 'DNS-over-HTTPS: Standard (System DNS)');
    } else if (msg === 'RECON_ACTION:SHOW_TELEMETRY_INFO') {
      showToast('⚡ Ultra Mode Active: Zero telemetry, zero usage pings, and 100% local privacy.');
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
// Shields Popover vs Settings Drawer Separation
// ==========================================================================
shieldsWidget.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsDrawer.classList.add('drawer-closed');
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
  settingsDrawer.classList.toggle('drawer-closed');
});

btnCloseDrawer.addEventListener('click', () => {
  settingsDrawer.classList.add('drawer-closed');
});

btnPopoverOpenSettings.addEventListener('click', (e) => {
  e.stopPropagation();
  shieldsPopover.classList.add('popover-hidden');
  settingsDrawer.classList.remove('drawer-closed');
});

document.addEventListener('click', (e) => {
  if (!shieldsPopover.contains(e.target) && !shieldsWidget.contains(e.target)) {
    shieldsPopover.classList.add('popover-hidden');
  }
  if (!settingsDrawer.contains(e.target) && !btnSettingsToggle.contains(e.target)) {
    settingsDrawer.classList.add('drawer-closed');
  }
  if (!btnEcosystem.contains(e.target) && !ecosystemDropdown.contains(e.target)) {
    ecosystemDropdown.style.display = 'none';
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
  const count = activeTab.blockedCount || 0;
  popoverStatCount.textContent = count;
  blockedCountEl.textContent = count;

  if (count > 0) {
    blockedCountEl.classList.add('has-blocked');
  } else {
    blockedCountEl.classList.remove('has-blocked');
  }

  const isPaused = activeTab.shieldsPaused || !shieldsGlobalActive;
  popoverToggleSite.checked = !isPaused;
  document.getElementById('site-protection-state').textContent = !isPaused ? 'Active protection enabled' : 'Shields paused for this site';
  document.getElementById('site-protection-state').style.color = !isPaused ? '#22c55e' : '#ef4444';

  if (isPaused) {
    shieldStatus.textContent = shieldsGlobalActive ? 'PAUSED' : 'OFF';
    shieldStatus.style.color = '#ef4444';
    shieldsWidget.classList.add('shields-paused');
    popoverProtectionsList.classList.add('protections-disabled');
  } else {
    shieldStatus.textContent = 'ON';
    shieldStatus.style.color = '#22c55e';
    shieldsWidget.classList.remove('shields-paused');
    popoverProtectionsList.classList.remove('protections-disabled');
  }
}

// Track blocked items from main process
ipcRenderer.on('shield-blocked-update', (event, data) => {
  totalBlockedCount++;
  const activeTab = tabs.get(activeTabId);
  if (activeTab) {
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
  tabs.forEach(tab => syncThemeToWebview(tab.webviewEl));
});

// Per-Site Shields Toggle
popoverToggleSite.addEventListener('change', (e) => {
  const siteActive = e.target.checked;
  const activeTab = tabs.get(activeTabId);
  if (!activeTab) return;

  activeTab.shieldsPaused = !siteActive;
  let host = 'startpage';
  if (activeTab.url && !activeTab.url.includes('startpage.html')) {
    try {
      host = new URL(activeTab.url).hostname;
    } catch {}
  }

  ipcRenderer.send('set-site-shields', { host, enabled: siteActive });
  updateShieldsPopoverDisplay();
  tabs.forEach(tab => syncThemeToWebview(tab.webviewEl));
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

  selectTheme.value = activeTheme;
  selectAspect.value = activeAspect;

  // Broadcast to all active webviews
  tabs.forEach(tab => {
    syncThemeToWebview(tab.webviewEl, activeTheme, activeAspect);
  });
}

function syncThemeToWebview(webviewEl, theme = null, aspect = null) {
  const activeTheme = theme || localStorage.getItem('recon_theme') || 'cyber';
  const activeAspect = aspect || localStorage.getItem('recon_aspect') || 'solid';
  const engine = localStorage.getItem('recon_default_engine') || 'duckduckgo';
  const showApps = localStorage.getItem('recon_show_startpage_apps') !== 'false';
  const shieldsActive = shieldsGlobalActive;
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
    `);
  } catch {}
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

// Start Page Apps Hub Toggle
toggleStartpageApps.checked = localStorage.getItem('recon_show_startpage_apps') !== 'false';
toggleStartpageApps.addEventListener('change', (e) => {
  const show = e.target.checked;
  localStorage.setItem('recon_show_startpage_apps', String(show));
  tabs.forEach(tab => syncThemeToWebview(tab.webviewEl));
});

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
    settingsDrawer.classList.add('drawer-hidden');
  });
}

// Initial DoH sync to main process
ipcRenderer.send('toggle-doh', localStorage.getItem('recon_doh_enabled') !== 'false');

// ==========================================================================
// Ecosystem Quick Menu & Native App Launching
// ==========================================================================
btnEcosystem.addEventListener('click', (e) => {
  e.stopPropagation();
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
  settingsDrawer.classList.add('drawer-closed');
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

btnOpenAbout.addEventListener('click', () => {
  settingsDrawer.classList.add('drawer-closed');
  openAboutDialog();
});

aboutClose.addEventListener('click', () => aboutDlg.close());
aboutDone.addEventListener('click', () => aboutDlg.close());

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

// External Links in About Modal
const externalLinks = {
  'about-website': 'https://recontowers.com',
  'about-notes': 'https://github.com/neogentrics/ReconBrowser/releases',
  'about-issue': 'https://github.com/neogentrics/ReconBrowser/issues',
  'about-source': 'https://github.com/neogentrics/ReconBrowser',
  'about-license': 'https://github.com/neogentrics/ReconBrowser/blob/main/LICENSE',
  'about-notices': 'https://github.com/neogentrics/ReconBrowser/blob/main/README.md'
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
ipcRenderer.on('open-about-dialog', () => openAboutDialog());
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
  shieldsPopover.classList.add('popover-hidden');
  settingsDrawer.classList.toggle('drawer-closed');
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
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.readerActive) {
      toggleReaderView();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault();
    settingsDrawer.classList.toggle('drawer-closed');
  }
});

// ==========================================================================
// Initialization
// ==========================================================================
const savedTheme = localStorage.getItem('recon_theme') || 'cyber';
const savedAspect = localStorage.getItem('recon_aspect') || 'solid';
applyThemeAndAspect(savedTheme, savedAspect);

const savedEngine = localStorage.getItem('recon_default_engine') || 'duckduckgo';
setEngine(savedEngine);

// Global Shields & DoH Initial State Sync
toggleAdblock.checked = shieldsGlobalActive;
popoverOptAdblock.checked = shieldsGlobalActive;
ipcRenderer.send('toggle-shields', shieldsGlobalActive);
updateShieldsPopoverDisplay();

// Initial App Link Status Check
refreshAppLinkStatus();

// Create First Tab
createTab(getStartPageURL());
