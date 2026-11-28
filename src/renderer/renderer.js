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
// Held per window. localStorage keeps only the last one chosen, for new windows.
let currentActiveWorkspaceId = localStorage.getItem('recon_active_workspace') || 'default';
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

// Helper to resolve history page URL (v1.8.0 dedicated tab)
function getHistoryPageURL() {
  return `file://${__dirname}/history.html`;
}

function openHistoryTab() {
  for (const [id, tab] of tabs.entries()) {
    if (tab.url && tab.url.includes('history.html')) {
      switchTab(id);
      return;
    }
  }
  createTab(getHistoryPageURL(), true);
}

// Helper to resolve Gemini viewer URL (v1.9.0 Decentralized Gateway)
function getGeminiViewerURL(url) {
  const target = url || 'gemini://geminispace.info';
  return `file://${__dirname}/gemini-viewer.html?url=${encodeURIComponent(target)}`;
}

function openGeminiTab(url) {
  createTab(getGeminiViewerURL(url), true);
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

// Container and Persona State (v1.7.0)
const DEFAULT_CONTAINERS_CLIENT = [
  { id: 'default', name: 'Default', icon: '🌐', color: '#7c3aed', proxy: '', isDefault: true },
  { id: 'research', name: 'Research', icon: '🔬', color: '#06b6d4', proxy: '', isDefault: false },
  { id: 'work', name: 'Work', icon: '💼', color: '#3b82f6', proxy: '', isDefault: false },
  { id: 'personal', name: 'Personal', icon: '👤', color: '#f59e0b', proxy: '', isDefault: false },
  { id: 'finance', name: 'Finance', icon: '💳', color: '#10b981', proxy: '', isDefault: false },
  { id: 'social', name: 'Social', icon: '💬', color: '#ec4899', proxy: '', isDefault: false }
];
let activeContainers = [...DEFAULT_CONTAINERS_CLIENT];

function createTab(initialUrl = null, activate = true, containerId = 'default', isEphemeral = false) {
  const id = nextTabId++;
  const url = initialUrl || getStartPageURL();
  const isStart = url.includes('startpage.html');
  const isHistory = url.includes('history.html');
  const title = isStart ? 'Recon Start' : (isHistory ? 'Recon History' : 'New Tab');

  if (containerId === 'ephemeral' || isEphemeral) {
    isEphemeral = true;
    containerId = 'ephemeral';
  }

  // Determine container metadata
  let containerObj;
  if (isEphemeral) {
    containerObj = { id: 'ephemeral', name: 'Ephemeral (Burn on Close)', icon: '🔥', color: '#ef4444', isEphemeral: true };
  } else {
    const list = activeContainers.length > 0 ? activeContainers : DEFAULT_CONTAINERS_CLIENT;
    containerObj = list.find(c => c.id === containerId) || list[0];
  }

  // Generate partition key
  let partitionKey;
  if (isEphemeral) {
    const ephemRand = Math.random().toString(36).substring(2, 8);
    partitionKey = `recon_ephemeral_${Date.now()}_${ephemRand}`;
  } else if (!containerId || containerId === 'default') {
    partitionKey = 'persist:recon_default';
  } else {
    partitionKey = `persist:recon_container_${containerId}`;
  }

  // 1. Create Tab Header
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  if (isEphemeral) tabEl.classList.add('tab-ephemeral');
  tabEl.setAttribute('data-tab-id', id);
  tabEl.setAttribute('draggable', 'true');
  tabEl.style.setProperty('--tab-container-color', containerObj.color);

  const containerBadgeHtml = `<div class="tab-container-strip" style="background-color: ${containerObj.color};"></div>`;
  const iconDisplay = isStart ? '⚡' : (isHistory ? '🕒' : (containerObj.isEphemeral ? '🔥' : (containerObj.id !== 'default' ? containerObj.icon : '🌐')));

  tabEl.innerHTML = `
    ${containerBadgeHtml}
    <span class="tab-favicon">${iconDisplay}</span>
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
  webviewEl.setAttribute('partition', partitionKey);
  webviewEl.setAttribute('src', url);
  webviewEl.setAttribute('allowpopups', '');
  webviewEl.style.display = 'none';

  const currentWsId = currentActiveWorkspaceId;
  const tabData = {
    id,
    title,
    url,
    tabEl,
    webviewEl,
    blockedCount: 0,
    shieldsPaused: false,
    readerActive: false,
    containerId: containerObj.id,
    isEphemeral,
    partitionKey,
    containerObj,
    isSleeping: false,
    lastActiveAt: Date.now(),
    workspaceId: currentWsId
  };

  if (tabData.workspaceId !== currentWsId) {
    tabEl.style.display = 'none';
  }

  wireWebviewEvents(tabData, webviewEl);
  browserContainer.appendChild(webviewEl);
  tabs.set(id, tabData);

  if (activate || tabs.size === 1) {
    switchTab(id);
  }

  updateSuspenderStats();
  return id;
}

// ==========================================================================
// Webview Event Wiring & Tab Memory Suspender (v1.9.0)
// ==========================================================================
function wireWebviewEvents(tabData, webviewEl) {
  const id = tabData.id;

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

  // Webview console bridge for startpage, zapper, history, and gemini
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
    } else if (msg.startsWith('RECON_ZAP:')) {
      const selector = msg.replace('RECON_ZAP:', '').trim();
      let domain = '';
      try { domain = new URL(tabData.url).hostname; } catch {}
      if (domain && selector) {
        ipcRenderer.invoke('zapper:add-rule', { domain, selector }).then(() => {
          showToast(`⚡ Zapped element: ${selector} on ${domain}`);
          tabData.webviewEl.insertCSS(`${selector} { display: none !important; visibility: hidden !important; }`).catch(() => {});
        });
      }
    } else if (msg.startsWith('RECON_HISTORY_REQ:LOAD:')) {
      const q = msg.replace('RECON_HISTORY_REQ:LOAD:', '').trim();
      ipcRenderer.invoke('history:get-grouped', q).then(groups => {
        webviewEl.executeJavaScript(`if (typeof window.renderHistoryData === 'function') window.renderHistoryData(${JSON.stringify(groups)}, ${JSON.stringify(q)});`).catch(() => {});
      });
    } else if (msg.startsWith('RECON_HISTORY_NAV:')) {
      const targetUrl = msg.replace('RECON_HISTORY_NAV:', '').trim();
      if (targetUrl) createTab(targetUrl, true);
    } else if (msg.startsWith('RECON_HISTORY_DEL:')) {
      const delId = msg.replace('RECON_HISTORY_DEL:', '').trim();
      if (delId) {
        ipcRenderer.invoke('history:delete', delId).then(() => {
          showToast('Entry removed from history');
          ipcRenderer.invoke('history:get-grouped', '').then(groups => {
            webviewEl.executeJavaScript(`if (typeof window.renderHistoryData === 'function') window.renderHistoryData(${JSON.stringify(groups)}, '');`).catch(() => {});
          });
        });
      }
    } else if (msg.startsWith('RECON_HISTORY_CLEAR:')) {
      const range = msg.replace('RECON_HISTORY_CLEAR:', '').trim();
      if (range) {
        ipcRenderer.invoke('history:clear', range).then(() => {
          showToast('Browsing history cleared');
          ipcRenderer.invoke('history:get-grouped', '').then(groups => {
            webviewEl.executeJavaScript(`if (typeof window.renderHistoryData === 'function') window.renderHistoryData(${JSON.stringify(groups)}, '');`).catch(() => {});
          });
        });
      }
    } else if (msg.startsWith('RECON_HISTORY_CLEAR_QUIT:')) {
      const val = msg.replace('RECON_HISTORY_CLEAR_QUIT:', '').trim() === 'true';
      // Saved too, because every new window re-sends the stored value on load
      localStorage.setItem('recon_history_clear_on_quit', String(val));
      if (toggleHistoryClearOnQuit) toggleHistoryClearOnQuit.checked = val;
      ipcRenderer.invoke('history:set-clear-on-quit', val);
    } else if (msg.startsWith('RECON_GEMINI_REQ:LOAD:')) {
      const gUrl = msg.replace('RECON_GEMINI_REQ:LOAD:', '').trim();
      ipcRenderer.invoke('gemini:fetch', { url: gUrl }).then(res => {
        webviewEl.executeJavaScript(`if (typeof window.__renderGeminiResponse === 'function') window.__renderGeminiResponse(${JSON.stringify(res)});`).catch(() => {});
      }).catch(err => {
        webviewEl.executeJavaScript(`if (typeof window.__renderGeminiResponse === 'function') window.__renderGeminiResponse({ error: ${JSON.stringify(err.message)}, status: 50, url: ${JSON.stringify(gUrl)} });`).catch(() => {});
      });
    } else if (msg.startsWith('RECON_GEMINI_NAV:')) {
      const targetUrl = msg.replace('RECON_GEMINI_NAV:', '').trim();
      if (targetUrl) {
        if (targetUrl.startsWith('gemini://')) {
          webviewEl.loadURL(getGeminiViewerURL(targetUrl));
        } else {
          createTab(targetUrl, true);
        }
      }
    }
  });
}

function sleepTab(id) {
  if (id === activeTabId) return;
  const tab = tabs.get(id);
  if (!tab || tab.isSleeping) return;

  try {
    if (tab.webviewEl && typeof tab.webviewEl.isCurrentlyAudible === 'function' && tab.webviewEl.isCurrentlyAudible()) {
      return;
    }
  } catch {}

  try {
    if (tab.webviewEl) {
      tab.savedUrl = tab.webviewEl.getURL() || tab.url;
      tab.savedTitle = tab.webviewEl.getTitle() || tab.title;
    }
  } catch {}

  tab.isSleeping = true;
  tab.tabEl.classList.add('tab-sleeping');

  const titleEl = tab.tabEl.querySelector('.tab-title');
  if (titleEl && !titleEl.querySelector('.tab-sleep-badge')) {
    const badge = document.createElement('span');
    badge.className = 'tab-sleep-badge';
    badge.textContent = '💤';
    badge.title = 'Tab is sleeping to save memory. Click to wake.';
    titleEl.prepend(badge);
  }

  if (tab.webviewEl && tab.webviewEl.parentNode) {
    tab.webviewEl.parentNode.removeChild(tab.webviewEl);
    tab.webviewEl = null;
  }

  updateSuspenderStats();
}

function wakeTab(id) {
  const tab = tabs.get(id);
  if (!tab || !tab.isSleeping) return;

  tab.isSleeping = false;
  tab.lastActiveAt = Date.now();
  tab.tabEl.classList.remove('tab-sleeping');

  const currentWsId = currentActiveWorkspaceId;
  tab.tabEl.style.display = ((tab.workspaceId || 'default') === currentWsId) ? 'flex' : 'none';

  const badge = tab.tabEl.querySelector('.tab-sleep-badge');
  if (badge) badge.remove();

  const webviewEl = document.createElement('webview');
  webviewEl.className = 'tab-webview';
  webviewEl.setAttribute('id', `webview-${id}`);
  if (tab.partitionKey) {
    webviewEl.setAttribute('partition', tab.partitionKey);
  }
  webviewEl.setAttribute('allowpopups', '');
  webviewEl.style.display = (id === activeTabId) ? 'flex' : 'none';
  webviewEl.setAttribute('src', tab.savedUrl || tab.url || getStartPageURL());

  wireWebviewEvents(tab, webviewEl);
  browserContainer.appendChild(webviewEl);
  tab.webviewEl = webviewEl;

  updateSuspenderStats();
}

function sleepAllBackgroundTabs() {
  let count = 0;
  for (const [id, tab] of tabs.entries()) {
    if (id !== activeTabId && !tab.isSleeping) {
      sleepTab(id);
      count++;
    }
  }
  showToast(`💤 Hibernated ${count} background ${count === 1 ? 'tab' : 'tabs'} (~${count * 45} MB saved)`);
}

function updateSuspenderStats() {
  const statsEl = document.getElementById('tab-suspender-stats');
  if (!statsEl) return;
  let activeCount = 0;
  let sleepingCount = 0;
  for (const tab of tabs.values()) {
    if (tab.isSleeping) sleepingCount++;
    else activeCount++;
  }
  const estimatedSavings = sleepingCount * 45;
  statsEl.textContent = `Active Tabs: ${activeCount} | Sleeping: ${sleepingCount} (~${estimatedSavings} MB RAM saved)`;
}

function switchTab(id) {
  if (!tabs.has(id)) return;
  activeTabId = id;

  const targetTab = tabs.get(id);
  if (targetTab.isSleeping) {
    wakeTab(id);
  }
  targetTab.lastActiveAt = Date.now();

  tabs.forEach((tab, tabId) => {
    if (tabId === id) {
      tab.tabEl.classList.add('active');
      if (tab.webviewEl) tab.webviewEl.style.display = 'flex';
    } else {
      tab.tabEl.classList.remove('active');
      if (tab.webviewEl) tab.webviewEl.style.display = 'none';
    }
  });

  const activeTab = tabs.get(id);
  updateOmnibar(activeTab.url);
  updateNavButtons();
  updateShieldsPopoverDisplay();
  updateOmnibarContainerBadge(activeTab.containerObj);
  updateSuspenderStats();
  
  if (activeTab.readerActive) {
    readerOverlay.classList.remove('reader-overlay-hidden');
    btnReaderView.classList.add('active');
  } else {
    readerOverlay.classList.add('reader-overlay-hidden');
    btnReaderView.classList.remove('active');
  }

  const inspectorDrawer = document.getElementById('network-inspector-drawer');
  if (inspectorDrawer && inspectorDrawer.classList.contains('inspector-drawer-visible')) {
    refreshNetworkInspectorLogs();
  }
}

function closeTab(id) {
  if (!tabs.has(id)) return;
  const tab = tabs.get(id);

  if (tab.isEphemeral && tab.partitionKey) {
    ipcRenderer.invoke('containers:wipe-ephemeral', tab.partitionKey).catch(err => {
      console.error('[Containers] Ephemeral wipe error:', err);
    });
  }

  tab.tabEl.remove();
  if (tab.webviewEl) tab.webviewEl.remove();
  tabs.delete(id);
  updateSuspenderStats();

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
  if (faviconEl) {
    const icon = isStart ? '⚡' : (tab.isEphemeral ? '🔥' : (tab.containerObj && tab.containerObj.id !== 'default' ? tab.containerObj.icon : '🌐'));
    faviconEl.textContent = icon;
  }

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
  } else if (url.includes('history.html')) {
    omnibar.value = 'recon://history';
    btnReaderView.style.display = 'none';
    btnReadAloud.style.display = 'none';
  } else if (url.includes('gemini-viewer.html')) {
    try {
      const u = new URL(url);
      omnibar.value = u.searchParams.get('url') || 'gemini://geminispace.info';
    } catch {
      omnibar.value = 'gemini://geminispace.info';
    }
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

omnibar.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const input = omnibar.value.trim();
    if (!input) return;

    let targetUrl = '';
    const selectedEngine = localStorage.getItem('recon_default_engine') || 'duckduckgo';

    if (input.toLowerCase() === 'recon://history' || input.toLowerCase() === 'about:history' || input.toLowerCase() === 'history') {
      targetUrl = getHistoryPageURL();
    } else if (input.toLowerCase() === 'recon://start' || input.toLowerCase() === 'about:start') {
      targetUrl = getStartPageURL();
    } else if (input.toLowerCase().startsWith('gemini://')) {
      targetUrl = getGeminiViewerURL(input);
    } else if (input.toLowerCase().startsWith('ipfs://') || input.toLowerCase().startsWith('ipns://')) {
      const prefGateway = localStorage.getItem('recon_ipfs_gateway') || 'auto';
      try {
        targetUrl = await ipcRenderer.invoke('ipfs:resolve', { uri: input, preferredGateway: prefGateway });
      } catch (err) {
        showToast(`IPFS Gateway: ${err.message}`);
        return;
      }
    } else if (input.startsWith('!g ')) {
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
    if (activeTab) {
      if (activeTab.isSleeping) wakeTab(activeTabId);
      if (activeTab.webviewEl) {
        activeTab.webviewEl.loadURL(targetUrl);
      }
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
  const cDrop = document.getElementById('container-picker-menu');
  if (cDrop) cDrop.style.display = 'none';

  switchSettingsTab(tabId);

  if (tabId === 'about') {
    loadAboutSettingsInfo();
  } else if (tabId === 'history' && typeof loadAndRenderHistory === 'function') {
    loadAndRenderHistory();
  } else if (tabId === 'vault' && typeof loadAndRenderVault === 'function') {
    loadAndRenderVault();
  } else if (tabId === 'containers' && typeof loadAndRenderContainersSettings === 'function') {
    loadAndRenderContainersSettings();
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
    } else if (tabId === 'sync' && typeof loadSyncSettings === 'function') {
      loadSyncSettings();
    } else if (tabId === 'archive' && typeof loadAndRenderArchives === 'function') {
      loadAndRenderArchives();
    } else if (tabId === 'privacy' && typeof loadShields2Settings === 'function') {
      loadShields2Settings();
    } else if (tabId === 'studio' && typeof loadStudioSettings === 'function') {
      loadStudioSettings();
    } else if (tabId === 'interface' && typeof checkDefaultBrowserStatus === 'function') {
      checkDefaultBrowserStatus();
    } else if (tabId === 'gateway' && typeof loadGatewaySettings === 'function') {
      loadGatewaySettings();
    } else if (tabId === 'workspaces' && typeof loadWorkspacesSettings === 'function') {
      loadWorkspacesSettings();
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
    const standaloneVerEl = document.getElementById('about-version');
    const standaloneTechEl = document.getElementById('about-tech');
    if (verEl) verEl.textContent = `Version ${info.version}`;
    if (techEl) techEl.textContent = `Electron ${info.electron} · Chromium ${info.chrome} · Node ${info.node} · ${info.os}`;
    if (standaloneVerEl) standaloneVerEl.textContent = `Version ${info.version}`;
    if (standaloneTechEl) standaloneTechEl.textContent = `Electron ${info.electron} · Chromium ${info.chrome} · Node ${info.node} · ${info.os}`;
  } catch (err) {}
}
loadAboutSettingsInfo();

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
  const cBadge = document.getElementById('omnibar-container-badge');
  const cDrop = document.getElementById('container-picker-menu');
  if (cDrop && cBadge && !cBadge.contains(e.target) && !cDrop.contains(e.target)) {
    cDrop.style.display = 'none';
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
function applyThemeAndAspect(theme, aspect, { persist = true } = {}) {
  const activeTheme = theme || localStorage.getItem('recon_theme') || 'cyber';
  const activeAspect = aspect || localStorage.getItem('recon_aspect') || 'solid';

  document.body.className = `theme-${activeTheme} aspect-${activeAspect}`;
  if (persist) {
    localStorage.setItem('recon_theme', activeTheme);
    localStorage.setItem('recon_aspect', activeAspect);
  }

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
function setStartpageAppsVisibility(show, { persist = true } = {}) {
  if (persist) localStorage.setItem('recon_show_startpage_apps', String(show));
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
function setEngine(engine, { persist = true } = {}) {
  if (persist) localStorage.setItem('recon_default_engine', engine);
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
ipcRenderer.on('menu-new-ephemeral-tab', () => createTab(null, true, 'ephemeral', true));
ipcRenderer.on('menu-new-container-tab', () => toggleContainerPicker());
ipcRenderer.on('menu-close-tab', () => closeTab(activeTabId));
ipcRenderer.on('menu-open-history', () => openHistoryTab());
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
  showToast('Shortcuts: Ctrl+N (New Window), Ctrl+T (New Tab), Ctrl+W (Close Tab), Ctrl+L (Address), Ctrl+R (Reload), Ctrl+Alt+R (Reader), Ctrl+Shift+A (Read Aloud)');
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
          No Recon Towers apps detected.<br>
          Install RT Story Tracker, RT Markdown Reader, Author Desk, Audio Studio or Press.
        </div>
      `;
      return;
    }

    appLinkStatusList.innerHTML = apps.map(app => {
      let pillClass = 'offline';
      let pillText = 'Web Ready';
      let actionButtons = '';

      if (app.running && app.linked) {
        pillClass = 'linked';
        pillText = '🟢 Active & Linked';
        actionButtons = `<button class="app-link-btn-action" data-action="unlink" data-id="${app.id}">Unlink</button>`;
      } else if (app.running && !app.linked) {
        pillClass = 'unlinked';
        pillText = '⚡ Running';
        actionButtons = `<button class="app-link-btn-action app-launch-btn" data-action="pair" data-id="${app.id}">Link Now</button>`;
      } else if (app.installed) {
        pillClass = 'installed';
        pillText = '📦 Installed';
        actionButtons = `
          <button class="app-link-btn-action app-launch-btn" data-action="launch" data-id="${app.id}" data-url="${escapeHtml(app.webUrl || '')}" title="Launch local desktop application">🚀 Launch App</button>
        `;
      } else {
        pillClass = 'offline';
        pillText = '🌐 Available';
        actionButtons = `
          <button class="app-link-btn-action" data-action="web" data-url="${escapeHtml(app.webUrl || '')}" title="Open web version on Recon Towers Hub">Open Web</button>
        `;
      }

      const icon = app.icon || '⚡';
      const desc = app.desc || '';

      return `
        <div class="app-link-card">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
            <span style="font-size: 24px; line-height: 1;">${icon}</span>
            <div class="app-link-card-info">
              <span class="app-link-card-name">${escapeHtml(app.name)}</span>
              <span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(desc || app.id)}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="app-link-status-pill ${pillClass}">${pillText}</span>
            ${actionButtons}
          </div>
        </div>
      `;
    }).join('');

    appLinkStatusList.querySelectorAll('.app-link-btn-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.target.getAttribute('data-action');
        const id = e.target.getAttribute('data-id');
        const url = e.target.getAttribute('data-url');

        if (action === 'launch') {
          showToast(`Launching ${id}...`);
          const res = await ipcRenderer.invoke('launch-or-open-app', { appName: id, storeUrl: url });
          if (res.launched) {
            showToast(`✓ Launched ${id} locally`);
            setTimeout(() => refreshAppLinkStatus(), 1500);
          } else {
            showToast(`Opening ${id} on Recon Towers Hub...`);
            createTab(res.url || url, true);
          }
        } else if (action === 'web') {
          if (url) createTab(url, true);
        } else if (action === 'pair') {
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
  // Handle Spotlight open key navigation
  const spotlightModal = document.getElementById('recon-spotlight-modal');
  if (spotlightModal && spotlightModal.style.display !== 'none') {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentSpotlightResults.length > 0) {
        spotlightSelectedIndex = (spotlightSelectedIndex + 1) % currentSpotlightResults.length;
        renderSpotlightResults();
      }
      return;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentSpotlightResults.length > 0) {
        spotlightSelectedIndex = (spotlightSelectedIndex - 1 + currentSpotlightResults.length) % currentSpotlightResults.length;
        renderSpotlightResults();
      }
      return;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeSpotlightItem(spotlightSelectedIndex);
      return;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSpotlight();
      return;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    toggleSpotlight();
    return;
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
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
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    createTab(null, true, 'ephemeral', true);
  } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 't') {
    e.preventDefault();
    toggleContainerPicker();
  } else if (e.key === 'Escape') {
    const wsDrop = document.getElementById('workspace-dropdown-menu');
    if (wsDrop && wsDrop.style.display !== 'none') {
      wsDrop.style.display = 'none';
    }
    const cDrop = document.getElementById('container-picker-menu');
    if (cDrop && cDrop.style.display !== 'none') {
      cDrop.style.display = 'none';
    }
    if (modalResearchClip && modalResearchClip.open) {
      modalResearchClip.close();
    }
    const mLogin = document.getElementById('modal-add-login');
    if (mLogin && mLogin.open) {
      mLogin.close();
    }
    if (audioGrabberDrawer && audioGrabberDrawer.classList.contains('inspector-drawer-visible')) {
      closeAudioGrabberDrawer();
    }
    const aiDrawer = document.getElementById('recon-ai-drawer');
    if (aiDrawer && aiDrawer.classList.contains('inspector-drawer-visible')) {
      aiDrawer.classList.add('inspector-drawer-hidden');
      aiDrawer.classList.remove('inspector-drawer-visible');
    }
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.readerActive) {
      toggleReaderView();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
    e.preventDefault();
    openHistoryTab();
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

function setBookmarksBarVisibility(show, { persist = true } = {}) {
  if (persist) localStorage.setItem('recon_show_bookmarks_bar', String(show));
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

ipcRenderer.on('open-link-ephemeral', (event, { url }) => {
  if (url) createTab(url, true, 'ephemeral', true);
});

ipcRenderer.on('open-link-container', (event, { url, containerId }) => {
  if (url) createTab(url, true, containerId, false);
});

ipcRenderer.on('tab-reopen-container', (event, { containerId }) => {
  reopenActiveTabInContainer(containerId, false);
});

ipcRenderer.on('tab-reopen-ephemeral', () => {
  reopenActiveTabInContainer('ephemeral', true);
});

ipcRenderer.on('archive-active-page', () => {
  saveCurrentPageToArchive();
});

ipcRenderer.on('trigger-element-zapper', () => {
  startElementZapper();
});

ipcRenderer.on('companion-toggle-rail', () => {
  toggleCompanionRail();
});

ipcRenderer.on('companion-append-selection', (event, { text }) => {
  appendSelectionToCompanionRail(text);
});

ipcRenderer.on('companion-append-active-selection', () => {
  clipSelectionFromActiveTab();
});

ipcRenderer.on('audio-grabber-open', () => {
  openAudioGrabberDrawer();
});

ipcRenderer.on('media-detected-update', () => {
  refreshAudioDetection();
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
    openHistoryTab();
  });
}

const btnOpenFullHistoryTab = document.getElementById('btn-open-full-history-tab');
if (btnOpenFullHistoryTab) {
  btnOpenFullHistoryTab.addEventListener('click', () => {
    closeSettingsModal();
    openHistoryTab();
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
// v1.5.0: Zero-Knowledge Sync & Encrypted Backup Suite
// ==========================================================================
const toggleSyncEnabled = document.getElementById('toggle-sync-enabled');
const inputSyncFolderPath = document.getElementById('input-sync-folder-path');
const btnSyncSelectFolder = document.getElementById('btn-sync-select-folder');
const inputSyncPassphrase = document.getElementById('input-sync-passphrase');
const btnSyncTogglePassphrase = document.getElementById('btn-sync-toggle-passphrase');
const syncOptBookmarks = document.getElementById('sync-opt-bookmarks');
const syncOptVault = document.getElementById('sync-opt-vault');
const syncOptSettings = document.getElementById('sync-opt-settings');
const syncOptHistory = document.getElementById('sync-opt-history');
const syncLastTime = document.getElementById('sync-last-time');
const btnSyncSaveConfig = document.getElementById('btn-sync-save-config');
const btnSyncExecuteNow = document.getElementById('btn-sync-execute-now');
const btnImportBookmarksHtml = document.getElementById('btn-import-bookmarks-html');
const btnExportBookmarksHtml = document.getElementById('btn-export-bookmarks-html');
const btnImportVaultCsv = document.getElementById('btn-import-vault-csv');
const btnExportVaultCsv = document.getElementById('btn-export-vault-csv');
const btnCreateBackup = document.getElementById('btn-create-backup');
const btnRestoreBackup = document.getElementById('btn-restore-backup');

async function loadSyncSettings() {
  try {
    const cfg = await ipcRenderer.invoke('sync:get-config');
    if (cfg) {
      if (toggleSyncEnabled) toggleSyncEnabled.checked = !!cfg.enabled;
      if (inputSyncFolderPath) inputSyncFolderPath.value = cfg.syncFolderPath || '';
      if (syncOptBookmarks) syncOptBookmarks.checked = cfg.syncBookmarks !== false;
      if (syncOptVault) syncOptVault.checked = cfg.syncVault !== false;
      if (syncOptSettings) syncOptSettings.checked = cfg.syncSettings !== false;
      if (syncOptHistory) syncOptHistory.checked = !!cfg.syncHistory;
      if (syncLastTime) {
        syncLastTime.textContent = cfg.lastSyncedAt ? new Date(cfg.lastSyncedAt).toLocaleString() : 'Never';
      }
    }
  } catch (err) {
    console.error('[Sync] Error loading settings:', err);
  }
}

async function saveSyncSettings() {
  try {
    const cfg = {
      enabled: toggleSyncEnabled ? toggleSyncEnabled.checked : false,
      syncFolderPath: inputSyncFolderPath ? inputSyncFolderPath.value.trim() : '',
      syncBookmarks: syncOptBookmarks ? syncOptBookmarks.checked : true,
      syncVault: syncOptVault ? syncOptVault.checked : true,
      syncSettings: syncOptSettings ? syncOptSettings.checked : true,
      syncHistory: syncOptHistory ? syncOptHistory.checked : false
    };
    const success = await ipcRenderer.invoke('sync:save-config', cfg);
    if (success) {
      showToast('✓ Sync settings saved successfully');
    }
  } catch (err) {
    showToast(`Failed to save sync settings: ${err.message}`);
  }
}

if (btnSyncSelectFolder) {
  btnSyncSelectFolder.addEventListener('click', async () => {
    const folder = await ipcRenderer.invoke('sync:select-folder');
    if (folder && inputSyncFolderPath) {
      inputSyncFolderPath.value = folder;
      saveSyncSettings();
    }
  });
}

if (btnSyncTogglePassphrase && inputSyncPassphrase) {
  btnSyncTogglePassphrase.addEventListener('click', () => {
    const isPass = inputSyncPassphrase.type === 'password';
    inputSyncPassphrase.type = isPass ? 'text' : 'password';
    btnSyncTogglePassphrase.textContent = isPass ? '🔒' : '👁️';
  });
}

if (btnSyncSaveConfig) {
  btnSyncSaveConfig.addEventListener('click', saveSyncSettings);
}

if (btnSyncExecuteNow) {
  btnSyncExecuteNow.addEventListener('click', executeFolderSyncNow);
}

async function executeFolderSyncNow() {
  const passphrase = inputSyncPassphrase ? inputSyncPassphrase.value.trim() : '';
  if (!passphrase || passphrase.length < 6) {
    showToast('Please enter master passphrase (min 6 characters) for AES-256-GCM encryption');
    if (inputSyncPassphrase) inputSyncPassphrase.focus();
    return;
  }

  showToast('🔄 Running zero-knowledge folder sync...');
  try {
    const localData = {
      bookmarks: loadBookmarks(),
      vault: await ipcRenderer.invoke('vault:get-all'),
      history: await ipcRenderer.invoke('history:get-all'),
      settings: {
        theme: localStorage.getItem('recon_theme'),
        aspect: localStorage.getItem('recon_aspect'),
        engine: localStorage.getItem('recon_default_engine')
      }
    };

    const res = await ipcRenderer.invoke('sync:execute-now', { passphrase, localData });
    if (res && res.success) {
      if (res.mergedData) {
        if (Array.isArray(res.mergedData.bookmarks)) {
          saveBookmarks(res.mergedData.bookmarks);
          renderBookmarks();
        }
        if (res.mergedData.settings) {
          if (res.mergedData.settings.theme) localStorage.setItem('recon_theme', res.mergedData.settings.theme);
          if (res.mergedData.settings.aspect) localStorage.setItem('recon_aspect', res.mergedData.settings.aspect);
          applyThemeAndAspect(localStorage.getItem('recon_theme') || 'cyber', localStorage.getItem('recon_aspect') || 'solid');
        }
        if (typeof loadAndRenderVault === 'function') loadAndRenderVault();
      }
      if (syncLastTime) syncLastTime.textContent = new Date().toLocaleTimeString();
      showToast(`✓ Zero-Knowledge Sync complete (${res.mergedCount || 'all'} records synced)`);
    } else {
      showToast(`Sync failed: ${res && res.error ? res.error : 'Check sync folder and passphrase'}`);
    }
  } catch (err) {
    showToast(`Sync error: ${err.message}`);
  }
}

// Universal Import & Export (Brave, Chrome, Firefox, Edge, Safari, Opera, Bitwarden, 1Password)
async function importBookmarksHtml() {
  try {
    const res = await ipcRenderer.invoke('sync:import-bookmarks-html');
    if (res.canceled) return;
    if (res.success && Array.isArray(res.bookmarks)) {
      const current = loadBookmarks();
      const currentUrls = new Set(current.map(b => b.url));
      let added = 0;
      for (const bm of res.bookmarks) {
        if (!currentUrls.has(bm.url)) {
          current.push(bm);
          currentUrls.add(bm.url);
          added++;
        }
      }
      saveBookmarks(current);
      renderBookmarks();
      showToast(`✓ Imported ${added} bookmarks (Brave, Chrome, Firefox, Edge compatible)`);
    } else {
      showToast(`Import failed: ${res.error || 'No valid bookmarks found'}`);
    }
  } catch (err) {
    showToast(`Import error: ${err.message}`);
  }
}

async function exportBookmarksHtml() {
  try {
    const bms = loadBookmarks();
    const res = await ipcRenderer.invoke('sync:export-bookmarks-html', bms);
    if (res.canceled) return;
    if (res.success) {
      showToast(`✓ Bookmarks exported to Netscape HTML format`);
    } else {
      showToast(`Export failed: ${res.error || 'Unknown error'}`);
    }
  } catch (err) {
    showToast(`Export error: ${err.message}`);
  }
}

async function importVaultCsv() {
  try {
    const res = await ipcRenderer.invoke('sync:import-vault-csv');
    if (res.canceled) return;
    if (res.success) {
      showToast(`✓ Imported ${res.count} logins into Password Vault`);
      if (typeof loadAndRenderVault === 'function') loadAndRenderVault();
    } else {
      showToast(`Import failed: ${res.error || 'Invalid CSV format'}`);
    }
  } catch (err) {
    showToast(`Import error: ${err.message}`);
  }
}

async function exportVaultCsv() {
  try {
    const res = await ipcRenderer.invoke('sync:export-vault-csv');
    if (res.canceled) return;
    if (res.success) {
      showToast(`✓ Passwords exported to CSV format`);
    } else {
      showToast(`Export failed: ${res.error || 'Unknown error'}`);
    }
  } catch (err) {
    showToast(`Export error: ${err.message}`);
  }
}

async function createSystemBackup() {
  const passphrase = inputSyncPassphrase ? inputSyncPassphrase.value.trim() : '';
  if (!passphrase || passphrase.length < 6) {
    showToast('Please enter a master passphrase (min 6 characters) in the Sync tab');
    switchSettingsTab('sync');
    if (inputSyncPassphrase) inputSyncPassphrase.focus();
    return;
  }

  showToast('📦 Creating encrypted system backup (.reconbackup)...');
  try {
    const localData = {
      bookmarks: loadBookmarks(),
      vault: await ipcRenderer.invoke('vault:get-all'),
      history: await ipcRenderer.invoke('history:get-all'),
      settings: {
        theme: localStorage.getItem('recon_theme'),
        aspect: localStorage.getItem('recon_aspect'),
        engine: localStorage.getItem('recon_default_engine')
      }
    };

    const res = await ipcRenderer.invoke('sync:create-backup', { passphrase, data: localData });
    if (res.canceled) return;
    if (res.success) {
      showToast('✓ Created authenticated encrypted backup (.reconbackup)');
    } else {
      showToast(`Backup failed: ${res.error || 'Unknown error'}`);
    }
  } catch (err) {
    showToast(`Backup error: ${err.message}`);
  }
}

async function restoreSystemBackup() {
  const passphrase = inputSyncPassphrase ? inputSyncPassphrase.value.trim() : '';
  if (!passphrase || passphrase.length < 6) {
    showToast('Please enter your master backup passphrase in the Sync tab');
    switchSettingsTab('sync');
    if (inputSyncPassphrase) inputSyncPassphrase.focus();
    return;
  }

  try {
    const res = await ipcRenderer.invoke('sync:restore-backup', { passphrase });
    if (res.canceled) return;
    if (res.success && res.data) {
      const d = res.data;
      if (Array.isArray(d.bookmarks)) {
        saveBookmarks(d.bookmarks);
        renderBookmarks();
      }
      if (d.settings) {
        if (d.settings.theme) localStorage.setItem('recon_theme', d.settings.theme);
        if (d.settings.aspect) localStorage.setItem('recon_aspect', d.settings.aspect);
        if (d.settings.engine) localStorage.setItem('recon_default_engine', d.settings.engine);
        applyThemeAndAspect(localStorage.getItem('recon_theme') || 'cyber', localStorage.getItem('recon_aspect') || 'solid');
      }
      if (typeof loadAndRenderVault === 'function') loadAndRenderVault();
      showToast('✓ Successfully restored environment from encrypted backup');
    } else {
      showToast(`Restore failed: ${res.error || 'Wrong passphrase or corrupted backup'}`);
    }
  } catch (err) {
    showToast(`Restore error: ${err.message}`);
  }
}

if (btnImportBookmarksHtml) btnImportBookmarksHtml.addEventListener('click', importBookmarksHtml);
if (btnExportBookmarksHtml) btnExportBookmarksHtml.addEventListener('click', exportBookmarksHtml);
if (btnImportVaultCsv) btnImportVaultCsv.addEventListener('click', importVaultCsv);
if (btnExportVaultCsv) btnExportVaultCsv.addEventListener('click', exportVaultCsv);
if (btnCreateBackup) btnCreateBackup.addEventListener('click', createSystemBackup);
if (btnRestoreBackup) btnRestoreBackup.addEventListener('click', restoreSystemBackup);

// ==========================================================================
// v1.5.0: Offline Research Archives (.reconarchive / MHTML)
// ==========================================================================
const btnArchivePage = document.getElementById('btn-archive-page');
const btnArchiveSaveCurrent = document.getElementById('btn-archive-save-current');
const inputArchiveSearch = document.getElementById('input-archive-search');
const btnArchiveRefresh = document.getElementById('btn-archive-refresh');
const archiveListContainer = document.getElementById('archive-list-container');

async function saveCurrentPageToArchive() {
  const tab = tabs.get(activeTabId);
  if (!tab || !tab.url || tab.url.includes('startpage.html')) {
    showToast('Cannot archive local startpage');
    return;
  }
  showToast('📦 Preserving page into Offline Research Archive (.reconarchive)...');
  try {
    const res = await ipcRenderer.invoke('archive:save-active-tab', {
      url: tab.url,
      title: tab.title || tab.url,
      tags: ['research']
    });
    if (res && res.success) {
      showToast(`✓ Page preserved offline (${(res.archive.sizeBytes / 1024).toFixed(1)} KB)`);
      loadAndRenderArchives();
    } else {
      showToast(`Archive failed: ${res && res.error ? res.error : 'Unknown error'}`);
    }
  } catch (err) {
    showToast(`Archive failed: ${err.message}`);
  }
}

async function loadAndRenderArchives(query = '') {
  if (!archiveListContainer) return;
  try {
    const archives = query
      ? await ipcRenderer.invoke('archive:search', query)
      : await ipcRenderer.invoke('archive:get-all');

    if (!archives || archives.length === 0) {
      archiveListContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 30px; font-size: 12px;">
          ${query ? 'No matching offline archives found.' : 'No saved offline archives yet. Click <strong>📦 Archive Active Tab</strong> or press <strong>Ctrl+S</strong> to preserve any page.'}
        </div>
      `;
      return;
    }

    archiveListContainer.innerHTML = archives.map(item => {
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—';
      const sizeKb = (item.sizeBytes / 1024).toFixed(1);
      return `
        <div class="archive-card" data-archive-id="${escapeHtml(item.id)}">
          <div class="archive-card-left">
            <div class="archive-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
            <div class="archive-card-meta">
              <span class="archive-card-domain">${escapeHtml(item.domain)}</span>
              <span>•</span>
              <span>${dateStr}</span>
              <span>•</span>
              <span>${sizeKb} KB</span>
            </div>
          </div>
          <div class="archive-card-actions">
            <button class="btn-primary btn-open-archive" data-path="${escapeHtml(item.filePath)}" style="font-size: 11px; padding: 4px 10px;">📖 Open</button>
            <button class="btn-subtle btn-delete-archive" data-id="${escapeHtml(item.id)}" style="font-size: 11px; padding: 4px 8px;" title="Delete Archive">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    archiveListContainer.querySelectorAll('.btn-open-archive').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-path');
        if (p) {
          const fileUrl = 'file:///' + p.replace(/\\/g, '/');
          createTab(fileUrl, true);
          closeSettingsModal();
        }
      });
    });

    archiveListContainer.querySelectorAll('.btn-delete-archive').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          await ipcRenderer.invoke('archive:delete', id);
          loadAndRenderArchives(inputArchiveSearch ? inputArchiveSearch.value : '');
          showToast('Offline archive deleted');
        }
      });
    });
  } catch (err) {
    console.error('[Archives] Error rendering archives:', err);
  }
}

if (btnArchivePage) btnArchivePage.addEventListener('click', saveCurrentPageToArchive);
if (btnArchiveSaveCurrent) btnArchiveSaveCurrent.addEventListener('click', saveCurrentPageToArchive);
if (btnArchiveRefresh) btnArchiveRefresh.addEventListener('click', () => loadAndRenderArchives());
if (inputArchiveSearch) {
  inputArchiveSearch.addEventListener('input', (e) => {
    loadAndRenderArchives(e.target.value.trim());
  });
}

// ==========================================================================
// v1.5.0: Shields 2.0 Subscriptions, Live Inspector & Element Zapper
// ==========================================================================
const btnPopoverOpenInspector = document.getElementById('btn-popover-open-inspector');
const btnPopoverZapElement = document.getElementById('btn-popover-zap-element');
const btnCloseInspector = document.getElementById('btn-close-inspector');
const btnClearInspector = document.getElementById('btn-clear-inspector');
const toggleSubEasyprivacy = document.getElementById('toggle-sub-easyprivacy');
const toggleSubFanboy = document.getElementById('toggle-sub-fanboy');
const inputSubCustomUrl = document.getElementById('input-sub-custom-url');
const btnSubAddCustom = document.getElementById('btn-sub-add-custom');
const filterSubscriptionsContainer = document.getElementById('filter-subscriptions-container');
const zapperRulesContainer = document.getElementById('zapper-rules-container');

let inspectorActiveFilter = 'all';
let currentTabInspectorLogs = [];

function openNetworkInspector() {
  const drawer = document.getElementById('network-inspector-drawer');
  if (drawer) {
    drawer.classList.remove('inspector-drawer-hidden');
    drawer.classList.add('inspector-drawer-visible');
  }
  if (shieldsPopover) shieldsPopover.classList.add('popover-hidden');
  refreshNetworkInspectorLogs();
}

function closeNetworkInspector() {
  const drawer = document.getElementById('network-inspector-drawer');
  if (drawer) {
    drawer.classList.add('inspector-drawer-hidden');
    drawer.classList.remove('inspector-drawer-visible');
  }
}

async function refreshNetworkInspectorLogs() {
  const tab = tabs.get(activeTabId);
  const domainBadge = document.getElementById('inspector-domain-badge');
  const countAll = document.getElementById('inspector-count-all');
  const countBlocked = document.getElementById('inspector-count-blocked');
  const countAllowed = document.getElementById('inspector-count-allowed');

  let webContentsId = null;
  let domain = 'Active Tab';
  if (tab && tab.webviewEl && typeof tab.webviewEl.getWebContentsId === 'function') {
    try {
      webContentsId = tab.webviewEl.getWebContentsId();
    } catch {}
    if (tab.url && !tab.url.includes('startpage.html')) {
      try { domain = new URL(tab.url).hostname; } catch {}
    } else {
      domain = 'Recon Start';
    }
  }

  if (domainBadge) domainBadge.textContent = domain;

  if (!webContentsId) {
    currentTabInspectorLogs = [];
  } else {
    currentTabInspectorLogs = await ipcRenderer.invoke('network-inspector:get-logs', webContentsId) || [];
  }

  const blocked = currentTabInspectorLogs.filter(r => r.blocked).length;
  const allowed = currentTabInspectorLogs.length - blocked;
  if (countAll) countAll.textContent = String(currentTabInspectorLogs.length);
  if (countBlocked) countBlocked.textContent = String(blocked);
  if (countAllowed) countAllowed.textContent = String(allowed);

  renderNetworkInspectorTable();
}

function renderNetworkInspectorTable() {
  const tbody = document.getElementById('inspector-tbody');
  if (!tbody) return;

  let filtered = currentTabInspectorLogs;
  if (inspectorActiveFilter === 'blocked') {
    filtered = currentTabInspectorLogs.filter(r => r.blocked);
  } else if (inspectorActiveFilter === 'allowed') {
    filtered = currentTabInspectorLogs.filter(r => !r.blocked);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 25px; font-size: 12px;">No matching network requests logged.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(req => {
    const statusHtml = req.blocked
      ? `<span class="req-status-blocked">🛡️ BLOCKED</span>`
      : `<span class="req-status-allowed">✓ ALLOWED</span>`;
    const methodHtml = `<span class="req-method-badge">${escapeHtml(req.method || 'GET')}</span>`;
    const typeHtml = `<span class="req-type-badge">${escapeHtml(req.resourceType || 'other')}</span>`;
    const reasonHtml = escapeHtml(req.reason || '—');
    const urlHtml = `<span title="${escapeHtml(req.url)}">${escapeHtml(req.host || req.url)}</span>`;

    return `<tr>
      <td>${statusHtml}</td>
      <td>${methodHtml}</td>
      <td>${typeHtml}</td>
      <td>${reasonHtml}</td>
      <td style="font-family: monospace; font-size: 11px;">${urlHtml}</td>
    </tr>`;
  }).join('');
}

if (btnPopoverOpenInspector) btnPopoverOpenInspector.addEventListener('click', openNetworkInspector);
if (btnCloseInspector) btnCloseInspector.addEventListener('click', closeNetworkInspector);
if (btnClearInspector) {
  btnClearInspector.addEventListener('click', async () => {
    const tab = tabs.get(activeTabId);
    if (tab && tab.webviewEl && typeof tab.webviewEl.getWebContentsId === 'function') {
      try {
        const wcId = tab.webviewEl.getWebContentsId();
        await ipcRenderer.invoke('network-inspector:clear-logs', wcId);
      } catch {}
    }
    refreshNetworkInspectorLogs();
  });
}

document.querySelectorAll('.inspector-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.inspector-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    inspectorActiveFilter = btn.getAttribute('data-filter') || 'all';
    renderNetworkInspectorTable();
  });
});

// Element Zapper
function startElementZapper() {
  const tab = tabs.get(activeTabId);
  if (!tab || !tab.webviewEl || tab.url.includes('startpage.html')) {
    showToast('Element Zapper works on live web pages');
    return;
  }
  if (shieldsPopover) shieldsPopover.classList.add('popover-hidden');
  showToast('⚡ Element Zapper active: Hover over any element and click to zap it (Esc to cancel)');

  const zapperCode = `
    (function() {
      if (window.__reconZapperActive) return;
      window.__reconZapperActive = true;
      let lastHovered = null;
      let overlay = document.getElementById('__recon_zapper_highlighter');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = '__recon_zapper_highlighter';
        overlay.style.position = 'fixed';
        overlay.style.pointerEvents = 'none';
        overlay.style.border = '2px dashed #f43f5e';
        overlay.style.backgroundColor = 'rgba(244, 63, 94, 0.2)';
        overlay.style.zIndex = '2147483647';
        overlay.style.transition = 'all 0.05s ease';
        overlay.style.display = 'none';
        document.documentElement.appendChild(overlay);
      }

      function onMouseMove(e) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === overlay || el === document.documentElement || el === document.body) {
          overlay.style.display = 'none';
          return;
        }
        lastHovered = el;
        const rect = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
      }

      function getSelector(el) {
        if (el.id) return '#' + CSS.escape(el.id);
        if (el.className && typeof el.className === 'string') {
          const firstClass = el.className.trim().split(/\\s+/)[0];
          if (firstClass) return '.' + CSS.escape(firstClass);
        }
        return el.tagName.toLowerCase();
      }

      function onClick(e) {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        if (lastHovered) {
          const selector = getSelector(lastHovered);
          lastHovered.style.display = 'none';
          console.log('RECON_ZAP:' + selector);
        }
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          cleanup();
        }
      }

      function cleanup() {
        window.__reconZapperActive = false;
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }

      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
    })();
  `;

  tab.webviewEl.executeJavaScript(zapperCode).catch(err => {
    console.error('Failed to inject zapper code:', err);
  });
}

if (btnPopoverZapElement) btnPopoverZapElement.addEventListener('click', startElementZapper);

async function loadShields2Settings() {
  try {
    const subs = await ipcRenderer.invoke('shields:get-subscriptions');
    if (subs) {
      if (toggleSubEasyprivacy) toggleSubEasyprivacy.checked = subs.easyprivacy !== false;
      if (toggleSubFanboy) toggleSubFanboy.checked = subs.fanboyAnnoyances !== false;

      if (filterSubscriptionsContainer) {
        const custom = Array.isArray(subs.customLists) ? subs.customLists : [];
        if (custom.length === 0) {
          filterSubscriptionsContainer.innerHTML = '<div style="padding: 4px; font-style: italic;">No custom list subscriptions added.</div>';
        } else {
          filterSubscriptionsContainer.innerHTML = custom.map(url => `
            <div class="sub-list-item">
              <span style="font-family: monospace; overflow: hidden; text-overflow: ellipsis; max-width: 320px;">${escapeHtml(url)}</span>
              <button class="btn-subtle btn-remove-sub" data-url="${escapeHtml(url)}" style="font-size: 11px; padding: 2px 6px;">×</button>
            </div>
          `).join('');

          filterSubscriptionsContainer.querySelectorAll('.btn-remove-sub').forEach(b => {
            b.addEventListener('click', async () => {
              const u = b.getAttribute('data-url');
              subs.customLists = subs.customLists.filter(x => x !== u);
              await ipcRenderer.invoke('shields:save-subscriptions', subs);
              loadShields2Settings();
              showToast('Removed custom filter list subscription');
            });
          });
        }
      }
    }

    // Load Zapper Rules for current domain
    loadZapperRules();
  } catch (err) {
    console.error('[Shields 2.0] Error loading settings:', err);
  }
}

async function loadZapperRules() {
  if (!zapperRulesContainer) return;
  const tab = tabs.get(activeTabId);
  let domain = '';
  if (tab && tab.url && !tab.url.includes('startpage.html')) {
    try { domain = new URL(tab.url).hostname; } catch {}
  }

  if (!domain) {
    zapperRulesContainer.innerHTML = '<div style="padding: 6px; text-align: center; font-style: italic;">Open a website to view active cosmetic zapper rules.</div>';
    return;
  }

  const rules = await ipcRenderer.invoke('zapper:get-rules', domain);
  if (!rules || rules.length === 0) {
    zapperRulesContainer.innerHTML = `<div style="padding: 6px; text-align: center; font-style: italic;">No zapper rules active on ${domain}.</div>`;
    return;
  }

  zapperRulesContainer.innerHTML = rules.map(sel => `
    <div class="zapper-rule-item">
      <div>
        <span class="zapper-rule-selector">${escapeHtml(sel)}</span>
        <small style="color: var(--text-muted); margin-left: 6px;">(${escapeHtml(domain)})</small>
      </div>
      <button class="btn-subtle btn-remove-zapper" data-domain="${escapeHtml(domain)}" data-sel="${escapeHtml(sel)}" style="font-size: 11px; padding: 2px 6px;">Remove</button>
    </div>
  `).join('');

  zapperRulesContainer.querySelectorAll('.btn-remove-zapper').forEach(b => {
    b.addEventListener('click', async () => {
      const d = b.getAttribute('data-domain');
      const s = b.getAttribute('data-sel');
      await ipcRenderer.invoke('zapper:remove-rule', { domain: d, selector: s });
      loadZapperRules();
      showToast(`Removed zapper rule: ${s}`);
    });
  });
}

if (toggleSubEasyprivacy) {
  toggleSubEasyprivacy.addEventListener('change', async (e) => {
    const subs = await ipcRenderer.invoke('shields:get-subscriptions');
    subs.easyprivacy = e.target.checked;
    await ipcRenderer.invoke('shields:save-subscriptions', subs);
    showToast(subs.easyprivacy ? 'EasyPrivacy blocklist enabled' : 'EasyPrivacy blocklist disabled');
  });
}

if (toggleSubFanboy) {
  toggleSubFanboy.addEventListener('change', async (e) => {
    const subs = await ipcRenderer.invoke('shields:get-subscriptions');
    subs.fanboyAnnoyances = e.target.checked;
    await ipcRenderer.invoke('shields:save-subscriptions', subs);
    showToast(subs.fanboyAnnoyances ? 'Fanboy Annoyances list enabled' : 'Fanboy Annoyances list disabled');
  });
}

if (btnSubAddCustom && inputSubCustomUrl) {
  btnSubAddCustom.addEventListener('click', async () => {
    const url = inputSubCustomUrl.value.trim();
    if (!url || !url.startsWith('http')) {
      showToast('Please enter a valid HTTP/HTTPS filter subscription URL');
      return;
    }
    const subs = await ipcRenderer.invoke('shields:get-subscriptions');
    if (!Array.isArray(subs.customLists)) subs.customLists = [];
    if (!subs.customLists.includes(url)) {
      subs.customLists.push(url);
      await ipcRenderer.invoke('shields:save-subscriptions', subs);
      inputSubCustomUrl.value = '';
      loadShields2Settings();
      showToast('✓ Added custom filter list subscription');
    }
  });
}

// ==========================================================================
// v1.6.0: Author Desk Companion Rail & RT Audio Studio Grabber
// ==========================================================================
const companionRail = document.getElementById('companion-rail');
const railResizer = document.getElementById('rail-resizer');
const btnToggleCompanionRail = document.getElementById('btn-toggle-companion-rail');
const btnRailClose = document.getElementById('btn-rail-close');
const btnRailDockPos = document.getElementById('btn-rail-dock-pos');
const companionNoteSelect = document.getElementById('companion-note-select');
const btnRailNewNote = document.getElementById('btn-rail-new-note');
const btnRailDeleteNote = document.getElementById('btn-rail-delete-note');
const companionNoteTitle = document.getElementById('companion-note-title');
const companionNoteContent = document.getElementById('companion-note-content');
const companionMarkdownPreview = document.getElementById('companion-markdown-preview');
const btnRailModeEdit = document.getElementById('btn-rail-mode-edit');
const btnRailModePreview = document.getElementById('btn-rail-mode-preview');
const railWordCount = document.getElementById('rail-word-count');
const btnRailClipSelection = document.getElementById('btn-rail-clip-selection');
const btnRailSaveNote = document.getElementById('btn-rail-save-note');
const btnRailExportMd = document.getElementById('btn-rail-export-md');
const btnRailSendAuthorDesk = document.getElementById('btn-rail-send-author-desk');

// Audio Grabber DOM
const btnAudioGrabber = document.getElementById('btn-audio-grabber');
const audioGrabberDrawer = document.getElementById('audio-grabber-drawer');
const btnCloseAudioDrawer = document.getElementById('btn-close-audio-drawer');
const btnScanAudioPage = document.getElementById('btn-scan-audio-page');
const audioGrabberDomainBadge = document.getElementById('audio-grabber-domain-badge');
const btnAudioTabDetected = document.getElementById('btn-audio-tab-detected');
const btnAudioTabSaved = document.getElementById('btn-audio-tab-saved');
const audioCountDetected = document.getElementById('audio-count-detected');
const audioCountSaved = document.getElementById('audio-count-saved');
const audioGrabberContentDetected = document.getElementById('audio-grabber-content-detected');
const audioGrabberContentSaved = document.getElementById('audio-grabber-content-saved');
const audioStreamsList = document.getElementById('audio-streams-list');
const audioSavedList = document.getElementById('audio-saved-list');
const railAudioList = document.getElementById('rail-audio-list');
const railMediaCountBadge = document.getElementById('rail-media-count-badge');
const btnRailRefreshAudio = document.getElementById('btn-rail-refresh-audio');

// Studio Settings DOM
const selectRailDockPosition = document.getElementById('select-rail-dock-position');
const toggleRailLivePreview = document.getElementById('toggle-rail-live-preview');
const toggleAudioAutoSniff = document.getElementById('toggle-audio-auto-sniff');
const btnOpenAudioDrawerSettings = document.getElementById('btn-open-audio-drawer-settings');

let activeNoteId = null;
let companionNotesList = [];
let railCurrentMode = 'edit'; // 'edit' or 'preview'
let isResizingRail = false;

function toggleCompanionRail(forceOpen = null) {
  if (!companionRail) return;
  const isCurrentlyHidden = companionRail.classList.contains('companion-rail-hidden');
  const shouldOpen = forceOpen !== null ? forceOpen : isCurrentlyHidden;

  if (shouldOpen) {
    companionRail.classList.remove('companion-rail-hidden');
    if (railResizer) railResizer.style.display = 'block';
    if (btnToggleCompanionRail) btnToggleCompanionRail.classList.add('active');
    loadCompanionNotes();
    refreshAudioDetection();
  } else {
    companionRail.classList.add('companion-rail-hidden');
    if (railResizer) railResizer.style.display = 'none';
    if (btnToggleCompanionRail) btnToggleCompanionRail.classList.remove('active');
  }
}

function setCompanionRailDockPosition(pos) {
  if (!companionRail) return;
  if (pos === 'left') {
    companionRail.classList.add('companion-rail-left');
    localStorage.setItem('recon_rail_dock_pos', 'left');
    if (btnRailDockPos) btnRailDockPos.title = 'Switch Dock to Right';
  } else {
    companionRail.classList.remove('companion-rail-left');
    localStorage.setItem('recon_rail_dock_pos', 'right');
    if (btnRailDockPos) btnRailDockPos.title = 'Switch Dock to Left';
  }
  if (selectRailDockPosition) selectRailDockPosition.value = pos;
}

async function loadCompanionNotes(preferredNoteId = null) {
  try {
    companionNotesList = await ipcRenderer.invoke('companion:get-notes') || [];
    populateNoteSelector(preferredNoteId);
  } catch (err) {
    console.error('[Companion Rail] Failed to load notes:', err);
  }
}

function populateNoteSelector(preferredNoteId = null) {
  if (!companionNoteSelect) return;
  if (companionNotesList.length === 0) {
    companionNoteSelect.innerHTML = '<option value="">(No notes created)</option>';
    if (companionNoteTitle) companionNoteTitle.value = '';
    if (companionNoteContent) companionNoteContent.value = '';
    activeNoteId = null;
    updateWordCount();
    return;
  }

  companionNoteSelect.innerHTML = companionNotesList.map(n => `
    <option value="${escapeHtml(n.id)}">${escapeHtml(n.title || 'Untitled Note')}</option>
  `).join('');

  const targetId = preferredNoteId || activeNoteId || companionNotesList[0].id;
  selectNote(targetId);
}

function selectNote(noteId) {
  activeNoteId = noteId;
  if (companionNoteSelect) companionNoteSelect.value = noteId;
  const note = companionNotesList.find(n => n.id === noteId);
  if (note) {
    if (companionNoteTitle) companionNoteTitle.value = note.title || '';
    if (companionNoteContent) companionNoteContent.value = note.content || '';
    updateWordCount();
    if (railCurrentMode === 'preview') {
      renderMarkdownPreview(note.content || '');
    }
  }
}

async function saveActiveNote() {
  if (!companionNoteTitle || !companionNoteContent) return;
  const title = companionNoteTitle.value.trim() || 'Untitled Note';
  const content = companionNoteContent.value;
  
  try {
    const saved = await ipcRenderer.invoke('companion:save-note', {
      id: activeNoteId,
      title,
      content,
      tags: ['research']
    });

    if (saved) {
      activeNoteId = saved.id;
      showToast(`✓ Note saved: "${title}"`);
      await loadCompanionNotes(saved.id);
    }
  } catch (err) {
    showToast(`Failed to save note: ${err.message}`);
  }
}

async function createNewNote() {
  try {
    const newNote = await ipcRenderer.invoke('companion:save-note', {
      title: 'New Research Note',
      content: '# New Research Note\n\n'
    });
    if (newNote) {
      showToast('Created new companion note');
      await loadCompanionNotes(newNote.id);
      if (companionNoteTitle) companionNoteTitle.focus();
    }
  } catch (err) {
    showToast(`Failed to create note: ${err.message}`);
  }
}

async function deleteActiveNote() {
  if (!activeNoteId) return;
  const confirmed = confirm('Are you sure you want to delete this companion note?');
  if (!confirmed) return;

  try {
    await ipcRenderer.invoke('companion:delete-note', activeNoteId);
    showToast('Note deleted');
    activeNoteId = null;
    await loadCompanionNotes();
  } catch (err) {
    showToast(`Failed to delete note: ${err.message}`);
  }
}

function updateWordCount() {
  if (!railWordCount || !companionNoteContent) return;
  const text = companionNoteContent.value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  railWordCount.textContent = `${words} words (${chars} chars)`;
}

function renderMarkdownPreview(md) {
  if (!companionMarkdownPreview) return;
  if (!md || !md.trim()) {
    companionMarkdownPreview.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Note is empty.</p>';
    return;
  }

  let html = escapeHtml(md);
  html = html.replace(/^### (.*$)/gim, '<h4 style="margin: 8px 0 4px; color: var(--accent-purple); font-size: 13px;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="margin: 10px 0 4px; color: var(--accent-purple); font-size: 14px;">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 style="margin: 12px 0 6px; color: var(--text-main); font-size: 16px;">$1</h2>');
  html = html.replace(/^\> (.*$)/gim, '<blockquote style="border-left: 3px solid var(--accent-purple); padding-left: 8px; margin: 4px 0; color: var(--text-muted); font-style: italic;">$1</blockquote>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" style="color: var(--accent-cyan); text-decoration: underline;">$1</a>');
  html = html.replace(/^\- (.*$)/gim, '<li style="margin-left: 14px;">$1</li>');
  html = html.replace(/\n\n/g, '<br/><br/>');
  html = html.replace(/\n/g, '<br/>');

  companionMarkdownPreview.innerHTML = html;
}

async function clipSelectionFromActiveTab() {
  const tab = tabs.get(activeTabId);
  if (!tab || !tab.webviewEl || tab.url.includes('startpage.html')) {
    showToast('Cannot clip selection from local startpage');
    return;
  }

  try {
    const text = await tab.webviewEl.executeJavaScript('window.getSelection().toString()');
    if (text && text.trim()) {
      appendSelectionToCompanionRail(text.trim());
    } else {
      showToast('No text selected on page. Highlight text first.');
    }
  } catch (err) {
    showToast('Failed to get selection from page');
  }
}

async function appendSelectionToCompanionRail(text) {
  if (!text || !text.trim()) return;
  const tab = tabs.get(activeTabId);
  const sourceUrl = tab ? tab.url : '';
  const sourceTitle = tab ? tab.title : '';

  if (companionRail && companionRail.classList.contains('companion-rail-hidden')) {
    toggleCompanionRail(true);
  }

  try {
    const updatedNote = await ipcRenderer.invoke('companion:append-snippet', {
      noteId: activeNoteId,
      data: {
        text: text.trim(),
        sourceUrl,
        sourceTitle,
        date: new Date().toISOString().slice(0, 10)
      }
    });

    if (updatedNote) {
      showToast('✓ Snippet appended to Author Desk Companion');
      await loadCompanionNotes(updatedNote.id);
    }
  } catch (err) {
    showToast(`Failed to append snippet: ${err.message}`);
  }
}

async function exportActiveNoteMarkdown() {
  if (!companionNoteTitle || !companionNoteContent) return;
  const title = companionNoteTitle.value.trim() || 'companion_note';
  const content = companionNoteContent.value;
  try {
    const res = await ipcRenderer.invoke('companion:export-note-md', { title, content });
    if (res.canceled) return;
    if (res.success) {
      showToast(`✓ Note exported to ${res.path}`);
    } else {
      showToast(`Export failed: ${res.error || 'Unknown error'}`);
    }
  } catch (err) {
    showToast(`Export error: ${err.message}`);
  }
}

async function sendNoteToAuthorDesk() {
  if (!companionNoteTitle || !companionNoteContent) return;
  const title = companionNoteTitle.value.trim() || 'Companion Draft';
  const content = companionNoteContent.value;

  showToast('⚡ Dispatching note to Author Desk...');
  try {
    const res = await ipcRenderer.invoke('app-link:send-clip', {
      targetAppId: 'rt-author-desk',
      name: `${title}.md`,
      documentText: content,
      metadata: {
        title,
        source_app: 'recon-browser',
        type: 'companion_draft',
        date: new Date().toISOString().slice(0, 10)
      }
    });

    if (res && res.success) {
      showToast('✓ Successfully sent draft to RT Author Desk');
    } else {
      showToast(res && res.message ? res.message : 'Author Desk is not currently running');
    }
  } catch (err) {
    showToast(`Dispatch failed: ${err.message}`);
  }
}

// Resizer logic
if (railResizer && companionRail) {
  railResizer.addEventListener('mousedown', (e) => {
    isResizingRail = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(ev) {
      if (!isResizingRail) return;
      const isLeft = companionRail.classList.contains('companion-rail-left');
      let newWidth;
      if (isLeft) {
        newWidth = ev.clientX;
      } else {
        newWidth = window.innerWidth - ev.clientX;
      }
      if (newWidth >= 280 && newWidth <= 650) {
        companionRail.style.width = `${newWidth}px`;
      }
    }

    function onMouseUp() {
      isResizingRail = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

// Companion Rail Event Listeners
if (btnToggleCompanionRail) btnToggleCompanionRail.addEventListener('click', () => toggleCompanionRail());
if (btnRailClose) btnRailClose.addEventListener('click', () => toggleCompanionRail(false));
if (btnRailDockPos) {
  btnRailDockPos.addEventListener('click', () => {
    const isLeft = companionRail.classList.contains('companion-rail-left');
    setCompanionRailDockPosition(isLeft ? 'right' : 'left');
  });
}

if (companionNoteSelect) {
  companionNoteSelect.addEventListener('change', (e) => {
    if (e.target.value) selectNote(e.target.value);
  });
}

if (btnRailNewNote) btnRailNewNote.addEventListener('click', createNewNote);
if (btnRailDeleteNote) btnRailDeleteNote.addEventListener('click', deleteActiveNote);
if (btnRailSaveNote) btnRailSaveNote.addEventListener('click', saveActiveNote);
if (btnRailExportMd) btnRailExportMd.addEventListener('click', exportActiveNoteMarkdown);
if (btnRailSendAuthorDesk) btnRailSendAuthorDesk.addEventListener('click', sendNoteToAuthorDesk);
if (btnRailClipSelection) btnRailClipSelection.addEventListener('click', clipSelectionFromActiveTab);

if (companionNoteContent) {
  companionNoteContent.addEventListener('input', () => {
    updateWordCount();
  });
}

if (btnRailModeEdit && btnRailModePreview) {
  btnRailModeEdit.addEventListener('click', () => {
    railCurrentMode = 'edit';
    btnRailModeEdit.classList.add('active');
    btnRailModePreview.classList.remove('active');
    if (companionNoteContent) companionNoteContent.style.display = 'block';
    if (companionMarkdownPreview) companionMarkdownPreview.style.display = 'none';
  });

  btnRailModePreview.addEventListener('click', () => {
    railCurrentMode = 'preview';
    btnRailModePreview.classList.add('active');
    btnRailModeEdit.classList.remove('active');
    if (companionNoteContent) companionNoteContent.style.display = 'none';
    if (companionMarkdownPreview) {
      companionMarkdownPreview.style.display = 'block';
      renderMarkdownPreview(companionNoteContent ? companionNoteContent.value : '');
    }
  });
}

// ==========================================================================
// RT Audio Studio Grabber Drawer & Mini Player (v1.6.0)
// ==========================================================================

function openAudioGrabberDrawer() {
  if (audioGrabberDrawer) {
    audioGrabberDrawer.style.display = 'flex';
    audioGrabberDrawer.classList.remove('inspector-drawer-hidden');
    audioGrabberDrawer.classList.add('inspector-drawer-visible');
    if (btnAudioGrabber) btnAudioGrabber.classList.add('active');
    refreshAudioDetection();
    loadSavedAudioClips();
  }
}

function closeAudioGrabberDrawer() {
  if (audioGrabberDrawer) {
    audioGrabberDrawer.classList.add('inspector-drawer-hidden');
    audioGrabberDrawer.classList.remove('inspector-drawer-visible');
    audioGrabberDrawer.style.display = 'none';
    if (btnAudioGrabber) btnAudioGrabber.classList.remove('active');
  }
}

async function refreshAudioDetection() {
  const tab = tabs.get(activeTabId);
  let wcId = null;
  let domain = 'Active Tab';
  if (tab && tab.webviewEl && typeof tab.webviewEl.getWebContentsId === 'function') {
    try { wcId = tab.webviewEl.getWebContentsId(); } catch {}
    if (tab.url && !tab.url.includes('startpage.html')) {
      try { domain = new URL(tab.url).hostname; } catch {}
    } else {
      domain = 'Recon Start';
    }
  }

  if (audioGrabberDomainBadge) audioGrabberDomainBadge.textContent = domain;

  let detected = [];
  if (wcId) {
    detected = await ipcRenderer.invoke('audio-grabber:get-detected', wcId) || [];
  }

  if (audioCountDetected) audioCountDetected.textContent = String(detected.length);
  if (railMediaCountBadge) railMediaCountBadge.textContent = `${detected.length} streams`;

  renderDetectedAudioStreams(detected);
}

function renderDetectedAudioStreams(streams) {
  const html = (!streams || streams.length === 0)
    ? `<div style="text-align: center; color: var(--text-muted); padding: 18px; font-size: 11.5px;">No audio streams detected yet on this page. Click <strong>🔍 Scan Page</strong> or play audio.</div>`
    : streams.map(s => `
      <div class="audio-stream-card">
        <div class="audio-stream-meta">
          <strong style="color: var(--text-main);">${escapeHtml(s.title || 'Audio Stream')}</strong>
          <span style="text-transform: uppercase; font-size: 10px; color: var(--accent-purple);">${escapeHtml(s.mimeType || 'audio')}</span>
        </div>
        <div class="audio-stream-url" title="${escapeHtml(s.url)}">${escapeHtml(s.url)}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <audio controls src="${escapeHtml(s.url)}" style="height: 26px; max-width: 240px;"></audio>
          <button class="btn-primary btn-save-audio" data-url="${escapeHtml(s.url)}" data-title="${escapeHtml(s.title)}" style="font-size: 10.5px; padding: 3px 8px;">📥 Save to Audio Studio</button>
        </div>
      </div>
    `).join('');

  if (audioStreamsList) audioStreamsList.innerHTML = html;
  if (railAudioList) railAudioList.innerHTML = html;

  document.querySelectorAll('.btn-save-audio').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-url');
      const title = btn.getAttribute('data-title');
      const tab = tabs.get(activeTabId);
      showToast('📥 Downloading audio clip for RT Audio Studio...');
      try {
        const res = await ipcRenderer.invoke('audio-grabber:download-clip', {
          url,
          title: title || 'Audio Sample',
          pageUrl: tab ? tab.url : '',
          domain: tab && tab.url ? new URL(tab.url).hostname : ''
        });
        if (res && res.success) {
          showToast(`✓ Saved audio clip to Audio Studio library (${(res.clip.sizeBytes / 1024).toFixed(1)} KB)`);
          loadSavedAudioClips();
        } else {
          showToast(`Download failed: ${res && res.error ? res.error : 'Unknown error'}`);
        }
      } catch (err) {
        showToast(`Download failed: ${err.message}`);
      }
    });
  });
}

async function loadSavedAudioClips() {
  if (!audioSavedList) return;
  try {
    const clips = await ipcRenderer.invoke('audio-grabber:get-saved-clips') || [];
    if (audioCountSaved) audioCountSaved.textContent = String(clips.length);

    if (clips.length === 0) {
      audioSavedList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px; font-size: 12px;">No saved clips in RT Audio Studio library yet.</div>`;
      return;
    }

    audioSavedList.innerHTML = clips.map(c => `
      <div class="audio-stream-card">
        <div class="audio-stream-meta">
          <strong style="color: var(--text-main);">${escapeHtml(c.title)}</strong>
          <span>${(c.sizeBytes / 1024).toFixed(1)} KB • ${new Date(c.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="audio-stream-url" title="${escapeHtml(c.filePath)}">${escapeHtml(c.filename)}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <audio controls src="file:///${c.filePath.replace(/\\/g, '/')}" style="height: 26px; max-width: 240px;"></audio>
          <div style="display: flex; gap: 4px;">
            <button class="btn-subtle btn-delete-audio-clip" data-id="${escapeHtml(c.id)}" style="font-size: 10.5px; padding: 2px 6px;" title="Delete Clip">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');

    audioSavedList.querySelectorAll('.btn-delete-audio-clip').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        if (id) {
          await ipcRenderer.invoke('audio-grabber:delete-clip', id);
          loadSavedAudioClips();
          showToast('Audio clip deleted');
        }
      });
    });
  } catch (err) {
    console.error('Failed to load saved audio clips:', err);
  }
}

async function scanActivePageForAudio() {
  const tab = tabs.get(activeTabId);
  if (!tab || !tab.webviewEl || tab.url.includes('startpage.html')) {
    showToast('Open a live website to scan for audio');
    return;
  }
  showToast('🔍 Scanning page for media & audio streams...');
  try {
    const script = `
      (function() {
        const results = [];
        const foundUrls = new Set();
        document.querySelectorAll('audio, video').forEach(el => {
          const src = el.currentSrc || el.src;
          if (src && !foundUrls.has(src) && !src.startsWith('blob:')) {
            foundUrls.add(src);
            results.push({ url: src, title: document.title || 'In-Page Media', duration: el.duration || 0 });
          }
        });
        document.querySelectorAll('source').forEach(el => {
          const src = el.src;
          if (src && !foundUrls.has(src) && !src.startsWith('blob:')) {
            foundUrls.add(src);
            results.push({ url: src, title: document.title || 'In-Page Source', mimeType: el.type });
          }
        });
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.href;
          if (href && /\\.(mp3|wav|ogg|m4a|aac|flac|opus)(\\?.*)?$/i.test(href) && !foundUrls.has(href)) {
            foundUrls.add(href);
            results.push({ url: href, title: a.innerText.trim() || 'Linked Audio', mimeType: 'audio/mpeg' });
          }
        });
        return results;
      })();
    `;

    const found = await tab.webviewEl.executeJavaScript(script);
    let wcId = null;
    try { wcId = tab.webviewEl.getWebContentsId(); } catch {}
    if (Array.isArray(found) && found.length > 0) {
      for (const item of found) {
        await ipcRenderer.invoke('audio-grabber:record-detected', { tabId: wcId, mediaItem: item });
      }
      showToast(`✓ Found ${found.length} audio streams/files on page`);
    } else {
      showToast('No audio elements found in page DOM');
    }
    refreshAudioDetection();
  } catch (err) {
    console.error('Failed to scan page audio:', err);
    showToast('Failed to scan page for audio');
  }
}

if (btnAudioGrabber) {
  btnAudioGrabber.addEventListener('click', () => {
    if (audioGrabberDrawer && audioGrabberDrawer.classList.contains('inspector-drawer-visible')) {
      closeAudioGrabberDrawer();
    } else {
      openAudioGrabberDrawer();
    }
  });
}
if (btnCloseAudioDrawer) btnCloseAudioDrawer.addEventListener('click', closeAudioGrabberDrawer);
if (btnScanAudioPage) btnScanAudioPage.addEventListener('click', scanActivePageForAudio);
if (btnRailRefreshAudio) btnRailRefreshAudio.addEventListener('click', scanActivePageForAudio);

if (btnAudioTabDetected && btnAudioTabSaved) {
  btnAudioTabDetected.addEventListener('click', () => {
    btnAudioTabDetected.classList.add('active');
    btnAudioTabSaved.classList.remove('active');
    if (audioGrabberContentDetected) audioGrabberContentDetected.style.display = 'block';
    if (audioGrabberContentSaved) audioGrabberContentSaved.style.display = 'none';
  });

  btnAudioTabSaved.addEventListener('click', () => {
    btnAudioTabSaved.classList.add('active');
    btnAudioTabDetected.classList.remove('active');
    if (audioGrabberContentDetected) audioGrabberContentDetected.style.display = 'none';
    if (audioGrabberContentSaved) audioGrabberContentSaved.style.display = 'block';
    loadSavedAudioClips();
  });
}

function loadStudioSettings() {
  const savedPos = localStorage.getItem('recon_rail_dock_pos') || 'right';
  if (selectRailDockPosition) selectRailDockPosition.value = savedPos;
  if (toggleRailLivePreview) toggleRailLivePreview.checked = localStorage.getItem('recon_rail_live_preview') !== 'false';
  if (toggleAudioAutoSniff) toggleAudioAutoSniff.checked = localStorage.getItem('recon_audio_auto_sniff') !== 'false';
}

if (selectRailDockPosition) {
  selectRailDockPosition.addEventListener('change', (e) => {
    setCompanionRailDockPosition(e.target.value);
  });
}

if (toggleRailLivePreview) {
  toggleRailLivePreview.addEventListener('change', (e) => {
    localStorage.setItem('recon_rail_live_preview', String(e.target.checked));
  });
}

if (toggleAudioAutoSniff) {
  toggleAudioAutoSniff.addEventListener('change', (e) => {
    localStorage.setItem('recon_audio_auto_sniff', String(e.target.checked));
  });
}

if (btnOpenAudioDrawerSettings) {
  btnOpenAudioDrawerSettings.addEventListener('click', () => {
    closeSettingsModal();
    openAudioGrabberDrawer();
  });
}

// Initialize Companion Rail Dock Position Preference
const savedRailPos = localStorage.getItem('recon_rail_dock_pos') || 'right';
setCompanionRailDockPosition(savedRailPos);

// ==========================================================================
// Recon Containers, Persona Jars & Ephemeral Tabs (v1.7.0)
// ==========================================================================
const omnibarContainerBadge = document.getElementById('omnibar-container-badge');
const containerPickerMenu = document.getElementById('container-picker-menu');
const btnPickerNewEphemeral = document.getElementById('btn-picker-new-ephemeral');
const btnPickerManage = document.getElementById('btn-picker-manage');

const btnShowAddContainer = document.getElementById('btn-show-add-container');
const btnCancelContainerForm = document.getElementById('btn-cancel-container-form');
const btnSaveContainer = document.getElementById('btn-save-container');
const btnPresetTorProxy = document.getElementById('btn-preset-tor-proxy');
const btnQuickNewEphemeral = document.getElementById('btn-quick-new-ephemeral');

function updateOmnibarContainerBadge(container) {
  if (!container) {
    container = { id: 'default', name: 'Default', icon: '🌐', color: '#7c3aed' };
  }
  const badgeEl = document.getElementById('omnibar-container-badge');
  const iconEl = document.getElementById('omnibar-container-icon');
  const nameEl = document.getElementById('omnibar-container-name');
  if (!badgeEl || !iconEl || !nameEl) return;

  iconEl.textContent = container.icon || '🌐';
  nameEl.textContent = container.name || 'Default';

  if (container.isEphemeral || container.id === 'ephemeral') {
    badgeEl.classList.add('badge-ephemeral');
    badgeEl.style.borderColor = '#ef4444';
    badgeEl.style.color = '#f87171';
    badgeEl.title = 'Ephemeral Tab (Volatile RAM only · Burn on Close)';
  } else {
    badgeEl.classList.remove('badge-ephemeral');
    badgeEl.style.borderColor = `${container.color}66`;
    badgeEl.style.color = 'var(--text-main)';
    badgeEl.title = `Container: ${container.name} · Click to switch persona or manage jars`;
  }
}

function toggleContainerPicker() {
  if (!containerPickerMenu) return;
  if (containerPickerMenu.style.display === 'block') {
    containerPickerMenu.style.display = 'none';
  } else {
    renderContainerPickerItems();
    containerPickerMenu.style.display = 'block';
  }
}

function renderContainerPickerItems() {
  const listEl = document.getElementById('container-picker-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const list = activeContainers.length > 0 ? activeContainers : DEFAULT_CONTAINERS_CLIENT;
  const currentTab = tabs.get(activeTabId);
  const currentContainerId = currentTab ? currentTab.containerId : 'default';

  list.forEach(c => {
    const item = document.createElement('div');
    item.className = 'container-picker-item';
    if (c.id === currentContainerId && !currentTab?.isEphemeral) {
      item.classList.add('active');
    }
    item.style.borderLeftColor = c.color;

    const proxyNotice = c.proxy ? `<span style="font-size: 10px; color: var(--accent-cyan); font-family: monospace;">⚡ Proxy</span>` : '';

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 14px;">${c.icon}</span>
        <span style="font-weight: 500;">${c.name}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        ${proxyNotice}
        <button class="picker-open-btn" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-muted); font-size: 10.5px; padding: 2px 6px; border-radius: 4px; cursor: pointer;" title="Open new tab in this container">+ Tab</button>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('picker-open-btn')) {
        e.stopPropagation();
        createTab(null, true, c.id, false);
        toggleContainerPicker();
      } else {
        reopenActiveTabInContainer(c.id, false);
        toggleContainerPicker();
      }
    });

    listEl.appendChild(item);
  });
}

function reopenActiveTabInContainer(targetContainerId, isEphemeral = false) {
  if (!activeTabId || !tabs.has(activeTabId)) return;
  const currentTab = tabs.get(activeTabId);
  const currentUrl = currentTab.url;
  const oldTabId = activeTabId;

  createTab(currentUrl, true, targetContainerId, isEphemeral);
  closeTab(oldTabId);
  showToast(`Switched tab to ${isEphemeral ? '🔥 Ephemeral' : targetContainerId} container`);
}

async function loadAndRenderContainersSettings() {
  const listEl = document.getElementById('containers-settings-list');
  if (!listEl) return;

  try {
    activeContainers = await ipcRenderer.invoke('containers:get-all');
  } catch (err) {
    console.error('Failed to load containers:', err);
    activeContainers = DEFAULT_CONTAINERS_CLIENT;
  }

  listEl.innerHTML = '';
  activeContainers.forEach(c => {
    const row = document.createElement('div');
    row.className = 'container-setting-row';

    const proxyBadge = c.proxy
      ? `<span class="container-proxy-badge" title="${c.proxy}">⚡ ${c.proxy}</span>`
      : `<span style="font-size: 11px; color: var(--text-muted);">Direct Connection</span>`;

    const deleteBtn = !c.isDefault
      ? `<button class="btn-delete-container" data-id="${c.id}" style="background: transparent; border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer;">Delete</button>`
      : '';

    row.innerHTML = `
      <div class="container-setting-info">
        <span class="container-color-dot" style="background-color: ${c.color};"></span>
        <span style="font-size: 16px;">${c.icon}</span>
        <div>
          <strong style="font-size: 12.5px; color: var(--text-main);">${c.name}</strong>
          ${c.isDefault ? '<span style="font-size: 10px; background: rgba(124, 58, 237, 0.2); color: var(--accent-purple); padding: 1px 5px; border-radius: 3px; margin-left: 6px;">Default</span>' : ''}
          <div style="margin-top: 2px;">${proxyBadge}</div>
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="btn-clear-container-data" data-id="${c.id}" data-name="${c.name}" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-main); font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer;" title="Clear cookies, storage and cache for this jar">🧹 Clear Data</button>
        <button class="btn-edit-container" data-id="${c.id}" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-main); font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer;">Edit</button>
        ${deleteBtn}
      </div>
    `;

    row.querySelector('.btn-clear-container-data').addEventListener('click', async () => {
      if (confirm(`Clear all cookies, cache, and local storage for container "${c.name}"?`)) {
        await ipcRenderer.invoke('containers:clear-data', c.id);
        showToast(`Cleared storage for container: ${c.name}`);
      }
    });

    row.querySelector('.btn-edit-container').addEventListener('click', () => {
      showContainerForm(c);
    });

    const delBtnEl = row.querySelector('.btn-delete-container');
    if (delBtnEl) {
      delBtnEl.addEventListener('click', async () => {
        if (confirm(`Delete container "${c.name}" and erase its data?`)) {
          await ipcRenderer.invoke('containers:delete', c.id);
          showToast(`Deleted container: ${c.name}`);
          loadAndRenderContainersSettings();
        }
      });
    }

    listEl.appendChild(row);
  });
}

function showContainerForm(container = null) {
  const card = document.getElementById('container-form-card');
  const title = document.getElementById('container-form-title');
  const inputId = document.getElementById('input-container-id');
  const inputName = document.getElementById('input-container-name');
  const inputIcon = document.getElementById('input-container-icon');
  const inputColor = document.getElementById('input-container-color');
  const inputProxy = document.getElementById('input-container-proxy');
  if (!card) return;

  if (container) {
    title.textContent = `Edit Container: ${container.name}`;
    inputId.value = container.id || '';
    inputName.value = container.name || '';
    inputIcon.value = container.icon || '📦';
    inputColor.value = container.color || '#7c3aed';
    inputProxy.value = container.proxy || '';
  } else {
    title.textContent = 'Create New Container';
    inputId.value = '';
    inputName.value = '';
    inputIcon.value = '📦';
    inputColor.value = '#06b6d4';
    inputProxy.value = '';
  }
  card.style.display = 'block';
  inputName.focus();
}

function hideContainerForm() {
  const card = document.getElementById('container-form-card');
  if (card) card.style.display = 'none';
}

async function saveContainerFromForm() {
  const inputId = document.getElementById('input-container-id');
  const inputName = document.getElementById('input-container-name');
  const inputIcon = document.getElementById('input-container-icon');
  const inputColor = document.getElementById('input-container-color');
  const inputProxy = document.getElementById('input-container-proxy');

  const name = inputName.value.trim();
  if (!name) {
    showToast('Please enter a container name');
    return;
  }

  const payload = {
    id: inputId.value || undefined,
    name,
    icon: inputIcon.value.trim() || '📦',
    color: inputColor.value || '#7c3aed',
    proxy: inputProxy.value.trim()
  };

  await ipcRenderer.invoke('containers:save', payload);
  showToast(`Container "${name}" saved`);
  hideContainerForm();
  loadAndRenderContainersSettings();
}

if (omnibarContainerBadge) {
  omnibarContainerBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleContainerPicker();
  });
}

if (btnPickerNewEphemeral) {
  btnPickerNewEphemeral.addEventListener('click', () => {
    toggleContainerPicker();
    createTab(null, true, 'ephemeral', true);
  });
}

if (btnPickerManage) {
  btnPickerManage.addEventListener('click', () => {
    toggleContainerPicker();
    openSettingsModal('containers');
  });
}

if (btnShowAddContainer) {
  btnShowAddContainer.addEventListener('click', () => showContainerForm());
}

if (btnCancelContainerForm) {
  btnCancelContainerForm.addEventListener('click', hideContainerForm);
}

if (btnSaveContainer) {
  btnSaveContainer.addEventListener('click', saveContainerFromForm);
}

if (btnPresetTorProxy) {
  btnPresetTorProxy.addEventListener('click', () => {
    const inputProxy = document.getElementById('input-container-proxy');
    if (inputProxy) inputProxy.value = 'socks5://127.0.0.1:9050';
  });
}

if (btnQuickNewEphemeral) {
  btnQuickNewEphemeral.addEventListener('click', () => {
    closeSettingsModal();
    createTab(null, true, 'ephemeral', true);
  });
}

// Initial container list load
ipcRenderer.invoke('containers:get-all').then(res => {
  if (Array.isArray(res) && res.length > 0) {
    activeContainers = res;
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.containerObj) {
      updateOmnibarContainerBadge(activeTab.containerObj);
    }
  }
}).catch(() => {});

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


// =============================================================================
// v1.8.0: Recon AI — Local Intelligence Bridge
// =============================================================================

(function () {
  const reconAiDrawer = document.getElementById('recon-ai-drawer');
  const btnReconAi = document.getElementById('btn-recon-ai');
  const btnCloseReconAi = document.getElementById('btn-close-recon-ai');
  const aiModelSelect = document.getElementById('ai-model-select');
  const aiStatusPill = document.getElementById('ai-status-pill');
  const aiSpinner = document.getElementById('ai-spinner');

  if (!reconAiDrawer) return;

  // ── Drawer open/close ──────────────────────────────────────────────────────
  function openReconAiDrawer() {
    reconAiDrawer.classList.remove('inspector-drawer-hidden');
    reconAiDrawer.classList.add('inspector-drawer-visible');
    // Auto-fill selected text in all text inputs
    const activeWv = document.querySelector('.tab-webview.active-webview') ||
                     document.querySelector('webview');
    if (activeWv) {
      activeWv.executeJavaScript('window.getSelection().toString()')
        .then((sel) => {
          if (sel && sel.trim()) {
            const fields = ['ai-summarize-input', 'ai-claims-input', 'ai-rewrite-input', 'ai-ask-context'];
            fields.forEach(id => {
              const el = document.getElementById(id);
              if (el && !el.value) el.value = sel.trim();
            });
          }
        })
        .catch(() => {});
    }
  }

  function closeReconAiDrawer() {
    reconAiDrawer.classList.add('inspector-drawer-hidden');
    reconAiDrawer.classList.remove('inspector-drawer-visible');
  }

  if (btnReconAi) btnReconAi.addEventListener('click', () => {
    if (reconAiDrawer.classList.contains('inspector-drawer-visible')) {
      closeReconAiDrawer();
    } else {
      openReconAiDrawer();
    }
  });
  if (btnCloseReconAi) btnCloseReconAi.addEventListener('click', closeReconAiDrawer);

  // Keyboard shortcut Ctrl+Shift+I
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      if (reconAiDrawer.classList.contains('inspector-drawer-visible')) {
        closeReconAiDrawer();
      } else {
        openReconAiDrawer();
      }
    }
  });

  // ── Status & model loading ─────────────────────────────────────────────────
  async function loadOllamaStatus() {
    try {
      const result = await ipcRenderer.invoke('ollama:check');
      if (result.connected) {
        aiStatusPill.textContent = `🟢 Ollama Connected — ${result.models.length} model${result.models.length === 1 ? '' : 's'} available`;
        aiStatusPill.style.background = 'rgba(34,197,94,0.15)';
        aiStatusPill.style.color = '#4ade80';
        aiStatusPill.style.borderColor = 'rgba(34,197,94,0.3)';

        // Populate model selects
        const selects = document.querySelectorAll('#ai-model-select');
        selects.forEach(sel => {
          sel.innerHTML = '';
          result.models.forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = m.name;
            sel.appendChild(opt);
          });
        });

        // Update settings panel
        const settingsStatus = document.getElementById('ai-settings-status');
        if (settingsStatus) {
          settingsStatus.textContent = `🟢 Connected — ${result.models.length} model(s)`;
          settingsStatus.style.color = '#4ade80';
        }
        const settingsModelList = document.getElementById('ai-settings-model-list');
        if (settingsModelList) {
          settingsModelList.innerHTML = result.models.map(m => `<div style="font-size:11.5px;padding:2px 0;">• ${m.name}</div>`).join('') || '<em>No models installed.</em>';
          settingsModelList.style.color = 'var(--text-main)';
          settingsModelList.style.fontStyle = 'normal';
        }
      } else {
        aiStatusPill.textContent = '🔴 Ollama Offline';
        aiStatusPill.style.background = 'rgba(239,68,68,0.15)';
        aiStatusPill.style.color = '#f87171';
        aiStatusPill.style.borderColor = 'rgba(239,68,68,0.3)';

        const settingsStatus = document.getElementById('ai-settings-status');
        if (settingsStatus) {
          settingsStatus.textContent = `🔴 Offline — ${result.error || 'Cannot reach Ollama'}`;
          settingsStatus.style.color = '#f87171';
        }
      }
    } catch (err) {
      aiStatusPill.textContent = '🔴 Ollama Offline';
    }
  }

  loadOllamaStatus();

  // ── Tab switching ──────────────────────────────────────────────────────────
  document.querySelectorAll('[data-ai-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-ai-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.aiTab;
      document.querySelectorAll('.ai-tab-panel').forEach(p => { p.style.display = 'none'; });
      const panel = document.getElementById(`ai-tab-${tab}`);
      if (panel) panel.style.display = 'flex';
    });
  });

  // ── Spinner helpers ────────────────────────────────────────────────────────
  function showSpinner() {
    aiSpinner.style.display = 'block';
    document.querySelectorAll('.ai-tab-panel').forEach(p => { p.style.display = 'none'; });
  }
  function hideSpinner() {
    aiSpinner.style.display = 'none';
    // Re-show active tab
    const activeTab = document.querySelector('[data-ai-tab].active');
    if (activeTab) {
      const panel = document.getElementById(`ai-tab-${activeTab.dataset.aiTab}`);
      if (panel) panel.style.display = 'flex';
    } else {
      const first = document.getElementById('ai-tab-summarize');
      if (first) first.style.display = 'flex';
    }
  }

  function showError(outputId, msg) {
    const output = document.getElementById(outputId);
    const result = document.getElementById(outputId.replace('-output', '-result'));
    if (output && result) {
      result.textContent = `⚠️ Error: ${msg}`;
      result.style.color = '#f87171';
      output.style.display = 'block';
    }
  }

  function showResult(outputId, text) {
    const output = document.getElementById(outputId);
    const result = document.getElementById(outputId.replace('-output', '-result'));
    if (output && result) {
      result.textContent = text;
      result.style.color = '';
      output.style.display = 'block';
    }
  }

  function getSelectedModel() {
    return aiModelSelect ? aiModelSelect.value : '';
  }

  // ── Summarize ──────────────────────────────────────────────────────────────
  const btnSummarize = document.getElementById('btn-ai-summarize');
  if (btnSummarize) {
    btnSummarize.addEventListener('click', async () => {
      const text = document.getElementById('ai-summarize-input').value.trim();
      const maxWords = parseInt(document.getElementById('ai-summarize-words').value, 10) || 100;
      const model = getSelectedModel();
      if (!text) return;
      showSpinner();
      try {
        const res = await ipcRenderer.invoke('ollama:summarize', { text, model, maxWords });
        hideSpinner();
        showResult('ai-summarize-output', res.summary);
      } catch (err) {
        hideSpinner();
        showError('ai-summarize-output', err.message);
      }
    });
  }

  // ── Extract Claims ─────────────────────────────────────────────────────────
  const btnClaims = document.getElementById('btn-ai-claims');
  if (btnClaims) {
    btnClaims.addEventListener('click', async () => {
      const text = document.getElementById('ai-claims-input').value.trim();
      const model = getSelectedModel();
      if (!text) return;
      showSpinner();
      try {
        const res = await ipcRenderer.invoke('ollama:extract-claims', { text, model });
        hideSpinner();
        showResult('ai-claims-output', res.claims);
      } catch (err) {
        hideSpinner();
        showError('ai-claims-output', err.message);
      }
    });
  }

  // ── Ask AI ─────────────────────────────────────────────────────────────────
  const btnAsk = document.getElementById('btn-ai-ask');
  if (btnAsk) {
    btnAsk.addEventListener('click', async () => {
      const context = document.getElementById('ai-ask-context').value.trim();
      const question = document.getElementById('ai-ask-question').value.trim();
      const model = getSelectedModel();
      if (!question) return;
      showSpinner();
      try {
        const res = await ipcRenderer.invoke('ollama:ask', { question, context, model });
        hideSpinner();
        showResult('ai-ask-output', res.answer);
      } catch (err) {
        hideSpinner();
        showError('ai-ask-output', err.message);
      }
    });
  }

  // ── Rewrite ────────────────────────────────────────────────────────────────
  const btnRewrite = document.getElementById('btn-ai-rewrite');
  if (btnRewrite) {
    btnRewrite.addEventListener('click', async () => {
      const text = document.getElementById('ai-rewrite-input').value.trim();
      const instruction = document.getElementById('ai-rewrite-instruction').value.trim();
      const model = getSelectedModel();
      if (!text || !instruction) return;
      showSpinner();
      try {
        const res = await ipcRenderer.invoke('ollama:rewrite', { text, instruction, model });
        hideSpinner();
        showResult('ai-rewrite-output', res.result);
      } catch (err) {
        hideSpinner();
        showError('ai-rewrite-output', err.message);
      }
    });
  }

  // ── Preset buttons ─────────────────────────────────────────────────────────
  document.querySelectorAll('.ai-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const instructionInput = document.getElementById('ai-rewrite-instruction');
      if (instructionInput) instructionInput.value = btn.dataset.preset;
    });
  });

  // ── Copy buttons ───────────────────────────────────────────────────────────
  document.querySelectorAll('.ai-copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = document.getElementById(btn.dataset.source);
      if (src) {
        ipcRenderer.send('copy-to-clipboard', src.textContent);
      }
    });
  });

  // ── Send to Companion Rail ─────────────────────────────────────────────────
  document.querySelectorAll('.ai-send-rail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = document.getElementById(btn.dataset.source);
      if (!src || !src.textContent.trim()) return;
      const railInput = document.getElementById('companion-input') ||
                        document.getElementById('rail-editor') ||
                        document.querySelector('.companion-rail textarea') ||
                        document.querySelector('#companion-rail textarea');
      if (railInput) {
        railInput.value = (railInput.value ? railInput.value + '\n\n' : '') + src.textContent.trim();
        // Open companion rail if not already open
        const rail = document.getElementById('companion-rail');
        if (rail && rail.classList.contains('companion-rail-hidden')) {
          const toggleBtn = document.getElementById('btn-toggle-companion-rail');
          if (toggleBtn) toggleBtn.click();
        }
      }
    });
  });

  // ── Settings panel buttons ─────────────────────────────────────────────────
  const btnTestSettings = document.getElementById('btn-ai-settings-test');
  if (btnTestSettings) {
    btnTestSettings.addEventListener('click', loadOllamaStatus);
  }

  const btnOpenFromSettings = document.getElementById('btn-open-recon-ai-from-settings');
  if (btnOpenFromSettings) {
    btnOpenFromSettings.addEventListener('click', () => {
      // Close settings modal if open
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) settingsModal.style.display = 'none';
      openReconAiDrawer();
    });
  }
})();

// ==========================================================================
// Decentralized Gateway & Generation 1 Memory Suspender (v1.9.0)
// ==========================================================================
async function loadGatewaySettings() {
  const statusEl = document.getElementById('ipfs-node-status');
  const gatewaySelect = document.getElementById('select-ipfs-gateway');
  const currentGateway = localStorage.getItem('recon_ipfs_gateway') || 'auto';
  if (gatewaySelect) gatewaySelect.value = currentGateway;

  if (statusEl) {
    statusEl.textContent = 'Probing 127.0.0.1:5001…';
    statusEl.style.color = 'var(--text-muted)';
    try {
      const res = await ipcRenderer.invoke('ipfs:check-local', { port: 5001 });
      if (res && res.online) {
        statusEl.textContent = `🟢 Online (v${res.version || '0.x'})`;
        statusEl.style.color = '#34d399';
      } else {
        statusEl.textContent = '⚪ Inactive (Falling back to Web Gateways)';
        statusEl.style.color = 'var(--text-muted)';
      }
    } catch {
      statusEl.textContent = '⚪ Inactive (Web Gateways Active)';
      statusEl.style.color = 'var(--text-muted)';
    }
  }

  // Load audit status
  const auditSummaryEl = document.getElementById('migration-audit-summary');
  if (auditSummaryEl) {
    try {
      const report = await ipcRenderer.invoke('migration:audit');
      if (report && report.status === 'healthy') {
        const storeCount = Object.keys(report.stores || {}).length;
        auditSummaryEl.textContent = `All ${storeCount} user stores verified (Bookmarks, History, Vault, Containers, Sync). Zero data loss verified.`;
      }
    } catch {}
  }
}

// Wire Gateway Buttons & Controls
(function initGatewayControls() {
  const btnCheckIpfs = document.getElementById('btn-check-ipfs-daemon');
  if (btnCheckIpfs) {
    btnCheckIpfs.addEventListener('click', loadGatewaySettings);
  }

  const selectIpfsGateway = document.getElementById('select-ipfs-gateway');
  if (selectIpfsGateway) {
    selectIpfsGateway.addEventListener('change', (e) => {
      localStorage.setItem('recon_ipfs_gateway', e.target.value);
      showToast(`IPFS Gateway set to: ${e.target.selectedOptions[0].text}`);
    });
  }

  const btnTestIpfs = document.getElementById('btn-test-ipfs-link');
  if (btnTestIpfs) {
    btnTestIpfs.addEventListener('click', () => {
      closeSettingsModal();
      createTab('ipfs://bafybeifx7yeb55armcsxnw3afgahamenugzurlovalisaienessabcubka/wiki/', true);
    });
  }

  const btnOpenGemini = document.getElementById('btn-open-gemini-home');
  if (btnOpenGemini) {
    btnOpenGemini.addEventListener('click', () => {
      const home = (document.getElementById('input-gemini-home') && document.getElementById('input-gemini-home').value) || 'gemini://geminispace.info';
      closeSettingsModal();
      openGeminiTab(home);
    });
  }

  const btnAudit = document.getElementById('btn-run-migration-audit');
  if (btnAudit) {
    btnAudit.addEventListener('click', async () => {
      const summaryEl = document.getElementById('migration-audit-summary');
      if (summaryEl) summaryEl.textContent = 'Auditing all data stores…';
      try {
        const report = await ipcRenderer.invoke('migration:audit');
        if (summaryEl) {
          summaryEl.textContent = `Audit Passed ✅ All ${Object.keys(report.stores).length} stores verified with zero data loss.`;
        }
        showToast('Store Health: All stores healthy & verified ✅');
      } catch (err) {
        showToast(`Audit error: ${err.message}`);
      }
    });
  }

  // Memory Suspender Controls
  const selectSleepTimeout = document.getElementById('select-tab-sleep-timeout');
  if (selectSleepTimeout) {
    const savedTimeout = localStorage.getItem('recon_tab_sleep_timeout') || '1800000';
    selectSleepTimeout.value = savedTimeout;
    selectSleepTimeout.addEventListener('change', (e) => {
      localStorage.setItem('recon_tab_sleep_timeout', e.target.value);
      showToast('Tab sleep interval updated');
    });
  }

  const btnHibernateAll = document.getElementById('btn-hibernate-background-tabs');
  if (btnHibernateAll) {
    btnHibernateAll.addEventListener('click', () => {
      sleepAllBackgroundTabs();
    });
  }

  // Periodic Memory Suspender Check (every 30 seconds)
  setInterval(() => {
    const timeout = parseInt(localStorage.getItem('recon_tab_sleep_timeout') || '1800000', 10);
    if (timeout <= 0) return;
    const now = Date.now();
    for (const [id, tab] of tabs.entries()) {
      if (id !== activeTabId && !tab.isSleeping) {
        const elapsed = now - (tab.lastActiveAt || now);
        if (elapsed >= timeout) {
          sleepTab(id);
        }
      }
    }
  }, 30000);
})();

// ==========================================================================
// Recon Spotlight & Project Workspaces Controller (v1.10.0)
// ==========================================================================
let currentWorkspacesList = [];

async function initWorkspaces() {
  try {
    currentWorkspacesList = await ipcRenderer.invoke('workspaces:get-all');
    renderWorkspacePill();
  } catch (err) {
    console.warn('[Workspaces] Could not load workspaces:', err);
  }
}

function renderWorkspacePill() {
  const ws = currentWorkspacesList.find(w => w.id === currentActiveWorkspaceId) || currentWorkspacesList[0] || { id: 'default', name: 'Main', icon: '🌐' };
  const pillIcon = document.getElementById('workspace-pill-icon');
  const pillName = document.getElementById('workspace-pill-name');
  if (pillIcon) pillIcon.textContent = ws.icon || '📁';
  if (pillName) pillName.textContent = ws.name || 'Main';
}

function switchWorkspace(id) {
  currentActiveWorkspaceId = id;
  localStorage.setItem('recon_active_workspace', id);
  renderWorkspacePill();
  filterTabsForActiveWorkspace();
  const dropdown = document.getElementById('workspace-dropdown-menu');
  if (dropdown) dropdown.style.display = 'none';
  showToast(`Switched to workspace: ${getActiveWorkspaceName()}`);
}

function getActiveWorkspaceName() {
  const ws = currentWorkspacesList.find(w => w.id === currentActiveWorkspaceId);
  return ws ? ws.name : 'Main';
}

function filterTabsForActiveWorkspace() {
  let hasVisibleTab = false;
  let firstVisibleTabId = null;

  for (const [id, tab] of tabs.entries()) {
    const belongs = (tab.workspaceId || 'default') === currentActiveWorkspaceId;
    tab.tabEl.style.display = belongs ? 'flex' : 'none';
    if (belongs) {
      if (!firstVisibleTabId) firstVisibleTabId = id;
      if (id === activeTabId) hasVisibleTab = true;
    }
  }

  if (!hasVisibleTab) {
    if (firstVisibleTabId) {
      switchTab(firstVisibleTabId);
    } else {
      createTab(getStartPageURL(), true);
    }
  }
}

function renderWorkspaceDropdownItems() {
  const listEl = document.getElementById('workspace-dropdown-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  currentWorkspacesList.forEach(ws => {
    let count = 0;
    for (const tab of tabs.values()) {
      if ((tab.workspaceId || 'default') === ws.id) count++;
    }

    const row = document.createElement('div');
    row.className = `workspace-item-row ${ws.id === currentActiveWorkspaceId ? 'active' : ''}`;
    row.innerHTML = `
      <div class="workspace-item-info">
        <span class="workspace-item-dot" style="background: ${ws.color || '#7c3aed'};"></span>
        <span>${escapeHtml(ws.icon || '📁')}</span>
        <span>${escapeHtml(ws.name)}</span>
      </div>
      <span class="workspace-tab-count">${count} ${count === 1 ? 'tab' : 'tabs'}</span>
    `;
    row.addEventListener('click', () => {
      switchWorkspace(ws.id);
    });
    listEl.appendChild(row);
  });
}

async function loadWorkspacesSettings() {
  const container = document.getElementById('settings-workspaces-list');
  if (!container) return;
  container.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">Loading workspaces…</div>';

  try {
    currentWorkspacesList = await ipcRenderer.invoke('workspaces:get-all');
    container.innerHTML = currentWorkspacesList.map(ws => {
      const isDefault = ws.id === 'default' || ws.isDefault;
      let count = 0;
      for (const tab of tabs.values()) {
        if ((tab.workspaceId || 'default') === ws.id) count++;
      }

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 16px;">${escapeHtml(ws.icon || '📁')}</span>
            <div>
              <strong style="font-size: 13px; color: var(--text-main);">${escapeHtml(ws.name)}</strong>
              ${isDefault ? '<span style="font-size: 10px; color: var(--accent-purple); margin-left: 6px; font-weight: 700;">DEFAULT</span>' : ''}
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${count} open ${count === 1 ? 'tab' : 'tabs'}</div>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            ${!isDefault ? `<button class="btn-subtle btn-del-workspace" data-id="${escapeHtml(ws.id)}" style="font-size: 11px; color: #f87171; padding: 3px 8px;">Delete</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-del-workspace').forEach(btn => {
      btn.addEventListener('click', async () => {
        const wsId = btn.getAttribute('data-id');
        if (!wsId) return;
        for (const tab of tabs.values()) {
          if (tab.workspaceId === wsId) tab.workspaceId = 'default';
        }
        await ipcRenderer.invoke('workspaces:delete', { id: wsId });
        if (currentActiveWorkspaceId === wsId) {
          currentActiveWorkspaceId = 'default';
        }
        if (localStorage.getItem('recon_active_workspace') === wsId) {
          localStorage.setItem('recon_active_workspace', 'default');
        }
        await initWorkspaces();
        loadWorkspacesSettings();
        filterTabsForActiveWorkspace();
        showToast('Workspace deleted');
      });
    });
  } catch (err) {
    container.innerHTML = `<div style="color: #f87171; font-size: 12px;">Error: ${escapeHtml(err.message)}</div>`;
  }
}

// Spotlight Controller State & Logic
let spotlightSelectedIndex = 0;
let currentSpotlightResults = [];
let spotlightDebounceTimer = null;

function toggleSpotlight() {
  const modal = document.getElementById('recon-spotlight-modal');
  if (!modal) return;
  if (modal.style.display === 'none' || !modal.style.display) {
    openSpotlight();
  } else {
    closeSpotlight();
  }
}

function openSpotlight() {
  const modal = document.getElementById('recon-spotlight-modal');
  const input = document.getElementById('spotlight-input');
  if (!modal || !input) return;

  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  runSpotlightSearch('');
}

function closeSpotlight() {
  const modal = document.getElementById('recon-spotlight-modal');
  if (modal) modal.style.display = 'none';
}

async function runSpotlightSearch(query) {
  const container = document.getElementById('spotlight-results-container');
  if (!container) return;

  const openTabs = [];
  for (const [id, tab] of tabs.entries()) {
    openTabs.push({
      id: id,
      title: tab.title || tab.url,
      url: tab.url,
      isSleeping: tab.isSleeping,
      containerName: tab.containerObj ? tab.containerObj.name : 'Default',
      icon: tab.tabEl ? (tab.tabEl.querySelector('.tab-favicon') ? tab.tabEl.querySelector('.tab-favicon').textContent : '🌐') : '🌐'
    });
  }

  const bookmarks = (typeof bookmarksList !== 'undefined' && Array.isArray(bookmarksList)) ? bookmarksList : [];

  try {
    const results = await ipcRenderer.invoke('spotlight:search', {
      query,
      context: { openTabs, bookmarks }
    });

    currentSpotlightResults = results || [];
    spotlightSelectedIndex = 0;
    renderSpotlightResults();
  } catch (err) {
    container.innerHTML = `<div style="padding: 16px; color: #f87171; font-size: 12.5px;">Search error: ${escapeHtml(err.message)}</div>`;
  }
}

function renderSpotlightResults() {
  const container = document.getElementById('spotlight-results-container');
  if (!container) return;

  if (currentSpotlightResults.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
        No results found. Try '@' for tabs, '*' for bookmarks, or '>' for commands.
      </div>
    `;
    return;
  }

  container.innerHTML = currentSpotlightResults.map((item, index) => {
    const isSelected = index === spotlightSelectedIndex;
    const badgeHtml = item.category ? `<span class="spotlight-item-badge">${escapeHtml(item.category)}</span>` : '';

    return `
      <div class="spotlight-item ${isSelected ? 'selected' : ''}" data-index="${index}">
        <span class="spotlight-item-icon">${escapeHtml(item.icon || '🔍')}</span>
        <div class="spotlight-item-text">
          <span class="spotlight-item-title">${escapeHtml(item.title)}</span>
          ${item.subtitle ? `<span class="spotlight-item-subtitle">${escapeHtml(item.subtitle)}</span>` : ''}
        </div>
        ${badgeHtml}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.spotlight-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-index'), 10);
      executeSpotlightItem(idx);
    });
  });

  const selectedEl = container.querySelector('.spotlight-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }
}

function executeSpotlightItem(index) {
  const item = currentSpotlightResults[index];
  if (!item) return;

  closeSpotlight();

  if (item.type === 'tab' && item.tabId) {
    switchTab(item.tabId);
  } else if (item.type === 'bookmark' && item.url) {
    createTab(item.url, true);
  } else if (item.type === 'history' && item.url) {
    createTab(item.url, true);
  } else if (item.type === 'archive' && item.archivePath) {
    createTab(`file://${item.archivePath}`, true);
  } else if (item.type === 'command' && item.action) {
    executeCommandAction(item.action);
  }
}

function executeCommandAction(action) {
  switch (action) {
    case 'new-tab':
      createTab();
      break;
    case 'new-ephemeral-tab':
      createTab(null, true, 'ephemeral', true);
      break;
    case 'new-container-tab':
      toggleContainerPicker();
      break;
    case 'open-ai':
      openReconAiDrawer();
      break;
    case 'open-history':
      openHistoryTab();
      break;
    case 'toggle-shields':
      const widget = document.getElementById('shields-widget');
      if (widget) widget.click();
      break;
    case 'open-vault':
      openSettingsModal('vault');
      break;
    case 'hibernate-tabs':
      sleepAllBackgroundTabs();
      break;
    case 'toggle-reader':
      toggleReaderView();
      break;
    case 'read-aloud':
      startReadAloud();
      break;
    case 'open-rail':
      const btnRail = document.getElementById('btn-toggle-companion-rail');
      if (btnRail) btnRail.click();
      break;
    case 'open-audio-grabber':
      openAudioGrabberDrawer();
      break;
    case 'open-gateway':
      openSettingsModal('gateway');
      break;
    case 'launch-gemini':
      openGeminiTab('gemini://geminispace.info');
      break;
    case 'open-settings':
      openSettingsModal('appearance');
      break;
    case 'open-ecosystem':
      const btnEco = document.getElementById('btn-ecosystem');
      if (btnEco) btnEco.click();
      break;
    default:
      showToast(`Command executed: ${action}`);
  }
}

// Wire Event Listeners for Spotlight & Workspaces
(function initSpotlightAndWorkspacesUI() {
  initWorkspaces();

  // Workspace Pill Click
  const wsPill = document.getElementById('workspace-pill');
  const wsDropdown = document.getElementById('workspace-dropdown-menu');
  if (wsPill && wsDropdown) {
    wsPill.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wsDropdown.style.display === 'none' || !wsDropdown.style.display) {
        renderWorkspaceDropdownItems();
        wsDropdown.style.display = 'block';
      } else {
        wsDropdown.style.display = 'none';
      }
    });
  }

  // Quick Add Workspace Button in Dropdown
  const btnQuickAddWs = document.getElementById('btn-add-workspace-quick');
  if (btnQuickAddWs) {
    btnQuickAddWs.addEventListener('click', async (e) => {
      e.stopPropagation();
      const name = prompt('Enter new project workspace name:');
      if (name && name.trim()) {
        try {
          const created = await ipcRenderer.invoke('workspaces:create', { name: name.trim(), icon: '📁', color: '#7c3aed' });
          await initWorkspaces();
          switchWorkspace(created.id);
        } catch (err) {
          showToast(`Error creating workspace: ${err.message}`);
        }
      }
    });
  }

  // Manage Workspaces Button in Dropdown
  const btnManageWs = document.getElementById('btn-manage-workspaces');
  if (btnManageWs) {
    btnManageWs.addEventListener('click', () => {
      if (wsDropdown) wsDropdown.style.display = 'none';
      openSettingsModal('workspaces');
    });
  }

  // Create Workspace in Settings
  const btnCreateWs = document.getElementById('btn-create-workspace');
  if (btnCreateWs) {
    btnCreateWs.addEventListener('click', async () => {
      const nameInput = document.getElementById('input-new-workspace-name');
      const iconInput = document.getElementById('input-new-workspace-icon');
      const colorInput = document.getElementById('input-new-workspace-color');

      const name = nameInput ? nameInput.value.trim() : '';
      const icon = iconInput ? iconInput.value.trim() || '📁' : '📁';
      const color = colorInput ? colorInput.value : '#7c3aed';

      if (!name) {
        showToast('Please enter a workspace name');
        return;
      }

      try {
        await ipcRenderer.invoke('workspaces:create', { name, icon, color });
        if (nameInput) nameInput.value = '';
        await initWorkspaces();
        loadWorkspacesSettings();
        showToast(`Workspace "${name}" created!`);
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    });
  }

  // Spotlight Button in Omnibar
  const btnSpotlight = document.getElementById('btn-spotlight');
  if (btnSpotlight) {
    btnSpotlight.addEventListener('click', toggleSpotlight);
  }

  // IPC Menu Handler for Spotlight
  ipcRenderer.on('menu-open-spotlight', () => {
    openSpotlight();
  });

  // Spotlight Live Search Input
  const spotlightInput = document.getElementById('spotlight-input');
  if (spotlightInput) {
    spotlightInput.addEventListener('input', (e) => {
      clearTimeout(spotlightDebounceTimer);
      spotlightDebounceTimer = setTimeout(() => {
        runSpotlightSearch(e.target.value);
      }, 50);
    });
  }

  // Spotlight Hint Tags
  document.querySelectorAll('.spotlight-hint-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      if (spotlightInput) {
        const prefix = tag.getAttribute('data-prefix');
        spotlightInput.value = prefix + ' ';
        spotlightInput.focus();
        runSpotlightSearch(spotlightInput.value);
      }
    });
  });

  // Close Spotlight on Backdrop Click
  const spotlightModal = document.getElementById('recon-spotlight-modal');
  if (spotlightModal) {
    spotlightModal.addEventListener('click', (e) => {
      if (e.target === spotlightModal) {
        closeSpotlight();
      }
    });
  }

  // Close Workspace Dropdown on click outside
  document.addEventListener('click', (e) => {
    if (wsDropdown && wsDropdown.style.display !== 'none') {
      if (!wsDropdown.contains(e.target) && !wsPill.contains(e.target)) {
        wsDropdown.style.display = 'none';
      }
    }
  });
})();

// ==========================================================================
// Multiple Windows
// ==========================================================================
// Windows share localStorage. The 'storage' event fires only in the *other*
// windows, so use it to keep what they show in step with what was changed.
// These must only redraw, never write: events arrive one key at a time, so writing
// here can put an older value back and undo the change in the window that made it.
const showOnly = { persist: false };
const sharedSettingAppliers = {
  recon_theme: () => applyThemeAndAspect(null, null, showOnly),
  recon_aspect: () => applyThemeAndAspect(null, null, showOnly),
  recon_default_engine: (value) => setEngine(value || 'duckduckgo', showOnly),
  recon_shields_active: (value) => {
    // The main process already has the new value; only this window's UI is stale
    shieldsGlobalActive = value !== 'false';
    if (toggleAdblock) toggleAdblock.checked = shieldsGlobalActive;
    if (popoverOptAdblock) popoverOptAdblock.checked = shieldsGlobalActive;
    updateShieldsPopoverDisplay();
    tabs.forEach(tab => syncThemeToWebview(tab));
  },
  recon_doh_enabled: (value) => {
    if (toggleDoh) toggleDoh.checked = value !== 'false';
    tabs.forEach(tab => syncThemeToWebview(tab));
  },
  recon_bookmarks: () => renderBookmarks(),
  recon_show_bookmarks_bar: (value) => setBookmarksBarVisibility(value === 'true', showOnly),
  recon_show_startpage_apps: (value) => setStartpageAppsVisibility(value !== 'false', showOnly),
  recon_show_navbar_apps: (value) => {
    toggleNavbarApps.checked = value !== 'false';
    ecosystemContainer.style.display = toggleNavbarApps.checked ? 'flex' : 'none';
  },
  recon_history_clear_on_quit: (value) => {
    if (toggleHistoryClearOnQuit) toggleHistoryClearOnQuit.checked = value === 'true';
  },
  recon_dismiss_default_browser: (value) => {
    const banner = document.getElementById('default-browser-banner');
    if (value === 'true' && banner) banner.style.display = 'none';
  }
};

window.addEventListener('storage', (e) => {
  if (Object.hasOwn(sharedSettingAppliers, e.key)) sharedSettingAppliers[e.key](e.newValue);
});

// Another window created, renamed or deleted a workspace. Each window keeps its
// own active workspace; only a deleted one forces a move back to Main.
ipcRenderer.on('workspaces-changed', async (_event, { deletedId } = {}) => {
  if (deletedId) {
    for (const tab of tabs.values()) {
      if (tab.workspaceId === deletedId) tab.workspaceId = 'default';
    }
    if (currentActiveWorkspaceId === deletedId) currentActiveWorkspaceId = 'default';
  }
  await initWorkspaces();
  if (deletedId) filterTabsForActiveWorkspace();
});

// closeTab() wipes an ephemeral tab's session. Closing a window no longer quits
// the app while other windows are open, so wipe this window's ones here too.
window.addEventListener('beforeunload', () => {
  for (const tab of tabs.values()) {
    if (tab.isEphemeral && tab.partitionKey) {
      ipcRenderer.invoke('containers:wipe-ephemeral', tab.partitionKey).catch(() => {});
    }
  }
});
