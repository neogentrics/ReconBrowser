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

// Shields elements
const shieldsWidget = document.getElementById('shields-widget');
const shieldStatus = document.getElementById('shield-status');
const blockedCountEl = document.getElementById('blocked-count');
const shieldsPopover = document.getElementById('shields-popover');
const btnClosePopover = document.getElementById('btn-close-popover');
const shieldsPopoverDomain = document.getElementById('shields-popover-domain');
const popoverStatCount = document.getElementById('popover-stat-count');
const popoverToggleSite = document.getElementById('popover-toggle-site');
const btnPopoverOpenSettings = document.getElementById('btn-popover-open-settings');

// Settings Drawer
const settingsDrawer = document.getElementById('settings-drawer');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const selectTheme = document.getElementById('select-theme');
const selectEngine = document.getElementById('select-engine');
const btnOpenAbout = document.getElementById('btn-open-about');

// Ecosystem Menu
const btnEcosystem = document.getElementById('btn-ecosystem');
const ecosystemDropdown = document.getElementById('ecosystem-dropdown');

// About Dialog
const aboutDlg = document.getElementById('about-dlg');
const aboutClose = document.getElementById('about-close');
const aboutDone = document.getElementById('about-done');
const aboutCopy = document.getElementById('about-copy');
const toastEl = document.getElementById('toast');

// State
const tabs = new Map(); // tabId -> { id, title, url, tabEl, webviewEl, blockedCount }
let activeTabId = null;
let nextTabId = 1;
let shieldsGlobalActive = true;
let totalBlockedCount = 0;

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
// Tab Management (Independent Webview per Tab)
// ==========================================================================
function createTab(initialUrl = null, activate = true) {
  const id = nextTabId++;
  const url = initialUrl || getStartPageURL();
  const isStart = url.includes('startpage.html');
  const title = isStart ? 'Recon Start' : 'New Tab';

  // 1. Create Tab Header
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.setAttribute('data-tab-id', id);
  tabEl.innerHTML = `
    <span class="tab-favicon">${isStart ? '⚡' : '🌐'}</span>
    <span class="tab-title">${title}</span>
    <span class="tab-close" title="Close Tab (Ctrl+W)">×</span>
  `;

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

  browserContainer.appendChild(webviewEl);

  const tabData = {
    id,
    title,
    url,
    tabEl,
    webviewEl,
    blockedCount: 0
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
  } else {
    omnibar.value = url;
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

btnHome.addEventListener('click', () => {
  const activeTab = tabs.get(activeTabId);
  if (activeTab && activeTab.webviewEl) {
    activeTab.webviewEl.loadURL(getStartPageURL());
  }
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

btnPopoverOpenSettings.addEventListener('click', () => {
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
  if (activeTab.url && !activeTab.url.includes('startpage.html')) {
    try {
      domain = new URL(activeTab.url).hostname;
    } catch {
      domain = activeTab.url;
    }
  }
  shieldsPopoverDomain.textContent = domain;
  popoverStatCount.textContent = activeTab.blockedCount || 0;
  blockedCountEl.textContent = activeTab.blockedCount || 0;
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
document.getElementById('toggle-adblock').addEventListener('change', (e) => {
  shieldsGlobalActive = e.target.checked;
  shieldStatus.textContent = shieldsGlobalActive ? 'ON' : 'OFF';
  shieldStatus.style.color = shieldsGlobalActive ? '#22c55e' : '#ef4444';
  ipcRenderer.send('toggle-shields', shieldsGlobalActive);
});

popoverToggleSite.addEventListener('change', (e) => {
  const siteActive = e.target.checked;
  document.getElementById('site-protection-state').textContent = siteActive ? 'Active protection enabled' : 'Shields paused for this site';
  document.getElementById('site-protection-state').style.color = siteActive ? '#22c55e' : '#ef4444';
});

// ==========================================================================
// Themes Management (11 Themes)
// ==========================================================================
function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
  localStorage.setItem('recon_theme', theme);
  selectTheme.value = theme;

  // Broadcast to all active webviews
  tabs.forEach(tab => {
    syncThemeToWebview(tab.webviewEl, theme);
  });
}

function syncThemeToWebview(webviewEl, theme = null) {
  const activeTheme = theme || localStorage.getItem('recon_theme') || 'cyber';
  const engine = localStorage.getItem('recon_default_engine') || 'duckduckgo';
  try {
    webviewEl.executeJavaScript(`
      if (typeof window.applyReconTheme === 'function') {
        window.applyReconTheme('${activeTheme}');
      }
      if (typeof window.applyReconEngine === 'function') {
        window.applyReconEngine('${engine}');
      }
    `);
  } catch {}
}

selectTheme.addEventListener('change', (e) => {
  applyTheme(e.target.value);
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
// Ecosystem Quick Menu
// ==========================================================================
btnEcosystem.addEventListener('click', (e) => {
  e.stopPropagation();
  const isShown = ecosystemDropdown.style.display === 'block';
  ecosystemDropdown.style.display = isShown ? 'none' : 'block';
});

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const url = item.getAttribute('data-url');
    if (url) {
      const activeTab = tabs.get(activeTabId);
      if (activeTab && activeTab.webviewEl) activeTab.webviewEl.loadURL(url);
      ecosystemDropdown.style.display = 'none';
    }
  });
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
  showToast('Shortcuts: Ctrl+T (New Tab), Ctrl+W (Close Tab), Ctrl+L (Address), Ctrl+R (Reload)');
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
  } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault();
    settingsDrawer.classList.toggle('drawer-closed');
  }
});

// ==========================================================================
// Initialization
// ==========================================================================
const savedTheme = localStorage.getItem('recon_theme') || 'cyber';
applyTheme(savedTheme);

const savedEngine = localStorage.getItem('recon_default_engine') || 'duckduckgo';
setEngine(savedEngine);

// Create First Tab
createTab(getStartPageURL());
