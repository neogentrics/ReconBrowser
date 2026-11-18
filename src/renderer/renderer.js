const { ipcRenderer } = require('electron');

const webview = document.getElementById('browser-view');
const omnibar = document.getElementById('omnibar');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');
const btnReload = document.getElementById('btn-reload');
const btnHome = document.getElementById('btn-home');
const shieldsWidget = document.getElementById('shields-widget');
const shieldStatus = document.getElementById('shield-status');
const blockedCountEl = document.getElementById('blocked-count');
const btnEcosystem = document.getElementById('btn-ecosystem');
const ecosystemDropdown = document.getElementById('ecosystem-dropdown');
const settingsDrawer = document.getElementById('settings-drawer');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const tabsContainer = document.getElementById('tabs-container');
const btnNewTab = document.getElementById('btn-new-tab');

let shieldsActive = true;
let tabCount = 1;
const tabs = {
  1: { title: 'Recon Start', url: 'startpage.html' }
};
let activeTabId = 1;

// Navigation
btnBack.addEventListener('click', () => {
  if (webview.canGoBack()) webview.goBack();
});

btnForward.addEventListener('click', () => {
  if (webview.canGoForward()) webview.goForward();
});

btnReload.addEventListener('click', () => {
  webview.reload();
});

btnHome.addEventListener('click', () => {
  webview.loadURL(pathToFileURL('startpage.html'));
});

function pathToFileURL(filename) {
  return `file://${__dirname}/${filename}`;
}

// Omnibar Navigation
omnibar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    let input = omnibar.value.trim();
    if (!input) return;

    let targetUrl = '';
    const selectedEngine = document.getElementById('select-engine').value;

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

    webview.loadURL(targetUrl);
  }
});

// Sync address on navigation
webview.addEventListener('did-navigate', (e) => {
  const url = e.url;
  if (url.includes('startpage.html')) {
    omnibar.value = '';
    omnibar.placeholder = 'Search with DuckDuckGo or enter address...';
    updateActiveTabTitle('Recon Start');
  } else {
    omnibar.value = url;
    updateActiveTabTitle(url.replace(/^https?:\/\//, '').split('/')[0]);
  }
});

webview.addEventListener('page-title-updated', (e) => {
  if (!webview.getURL().includes('startpage.html')) {
    updateActiveTabTitle(e.title || 'Tab');
  }
});

function updateActiveTabTitle(title) {
  const tabEl = document.querySelector(`.tab[data-tab-id="${activeTabId}"] .tab-title`);
  if (tabEl) {
    tabEl.textContent = title;
  }
  if (tabs[activeTabId]) {
    tabs[activeTabId].title = title;
  }
}

// Tabs Management
btnNewTab.addEventListener('click', () => {
  tabCount++;
  const newId = tabCount;
  tabs[newId] = { title: 'Recon Start', url: 'startpage.html' };

  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.setAttribute('data-tab-id', newId);
  tabEl.innerHTML = `
    <span class="tab-favicon">⚡</span>
    <span class="tab-title">Recon Start</span>
    <span class="tab-close" title="Close Tab">×</span>
  `;

  tabEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) {
      closeTab(newId);
    } else {
      switchTab(newId);
    }
  });

  tabsContainer.appendChild(tabEl);
  switchTab(newId);
});

function switchTab(id) {
  activeTabId = id;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const activeEl = document.querySelector(`.tab[data-tab-id="${id}"]`);
  if (activeEl) activeEl.classList.add('active');

  const tabData = tabs[id];
  if (tabData) {
    if (tabData.url === 'startpage.html') {
      webview.loadURL(pathToFileURL('startpage.html'));
    } else {
      webview.loadURL(tabData.url);
    }
  }
}

function closeTab(id) {
  const tabEl = document.querySelector(`.tab[data-tab-id="${id}"]`);
  if (tabEl) tabEl.remove();
  delete tabs[id];

  const remainingIds = Object.keys(tabs);
  if (remainingIds.length > 0) {
    switchTab(Number(remainingIds[remainingIds.length - 1]));
  } else {
    btnNewTab.click();
  }
}

// Initial tab listeners
document.querySelectorAll('.tab').forEach(tabEl => {
  const id = Number(tabEl.getAttribute('data-tab-id'));
  tabEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) {
      closeTab(id);
    } else {
      switchTab(id);
    }
  });
});

// Shields counter from main process
ipcRenderer.on('shield-blocked-update', (event, data) => {
  blockedCountEl.textContent = data.count;
});

// Drawer toggles
shieldsWidget.addEventListener('click', () => {
  toggleDrawer();
});

btnSettingsToggle.addEventListener('click', () => {
  toggleDrawer();
});

btnCloseDrawer.addEventListener('click', () => {
  settingsDrawer.classList.add('drawer-closed');
});

function toggleDrawer() {
  settingsDrawer.classList.toggle('drawer-closed');
}

// Protection toggles
document.getElementById('toggle-adblock').addEventListener('change', (e) => {
  shieldsActive = e.target.checked;
  shieldStatus.textContent = shieldsActive ? 'ON' : 'OFF';
  shieldStatus.style.color = shieldsActive ? '#22c55e' : '#ef4444';
  ipcRenderer.send('toggle-shields', shieldsActive);
});

// Recon Apps Menu
btnEcosystem.addEventListener('click', (e) => {
  e.stopPropagation();
  const isShown = ecosystemDropdown.style.display === 'block';
  ecosystemDropdown.style.display = isShown ? 'none' : 'block';
});

document.addEventListener('click', () => {
  ecosystemDropdown.style.display = 'none';
});

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const url = item.getAttribute('data-url');
    if (url) {
      webview.loadURL(url);
      ecosystemDropdown.style.display = 'none';
    }
  });
});
