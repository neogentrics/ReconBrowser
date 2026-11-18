const { ipcRenderer } = require('electron');

const webview = document.getElementById('browser-view');
const omnibar = document.getElementById('omnibar');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');
const btnReload = document.getElementById('btn-reload');
const shieldsWidget = document.getElementById('shields-widget');
const shieldStatus = document.getElementById('shield-status');
const blockedCountEl = document.getElementById('blocked-count');
const btnEcosystem = document.getElementById('btn-ecosystem');
const ecosystemDropdown = document.getElementById('ecosystem-dropdown');

let shieldsActive = true;

// Navigation buttons
btnBack.addEventListener('click', () => {
  if (webview.canGoBack()) webview.goBack();
});

btnForward.addEventListener('click', () => {
  if (webview.canGoForward()) webview.goForward();
});

btnReload.addEventListener('click', () => {
  webview.reload();
});

// Omnibar search and URL submission
omnibar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    let input = omnibar.value.trim();
    if (!input) return;

    let targetUrl = '';

    // Quick search bangs (!g for Google, !b for Bing)
    if (input.startsWith('!g ')) {
      const q = encodeURIComponent(input.substring(3).trim());
      targetUrl = `https://www.google.com/search?q=${q}`;
    } else if (input.startsWith('!b ')) {
      const q = encodeURIComponent(input.substring(3).trim());
      targetUrl = `https://www.bing.com/search?q=${q}`;
    } else if (input.startsWith('http://') || input.startsWith('https://')) {
      targetUrl = input;
    } else if (input.includes('.') && !input.includes(' ')) {
      targetUrl = 'https://' + input;
    } else {
      // Default to DuckDuckGo
      const q = encodeURIComponent(input);
      targetUrl = `https://duckduckgo.com/?q=${q}`;
    }

    webview.loadURL(targetUrl);
  }
});

// Sync omnibar address with navigation
webview.addEventListener('did-navigate', (e) => {
  omnibar.value = e.url;
});

webview.addEventListener('did-navigate-in-page', (e) => {
  omnibar.value = e.url;
});

// Shields counter update from main process
ipcRenderer.on('shield-blocked-update', (event, data) => {
  blockedCountEl.textContent = data.count;
});

// Shields toggle
shieldsWidget.addEventListener('click', () => {
  shieldsActive = !shieldsActive;
  shieldStatus.textContent = shieldsActive ? 'ON' : 'OFF';
  shieldStatus.style.color = shieldsActive ? '#22c55e' : '#ef4444';
  ipcRenderer.send('toggle-shields', shieldsActive);
  webview.reload();
});

// Recon Apps Menu Toggle
btnEcosystem.addEventListener('click', (e) => {
  e.stopPropagation();
  const isShown = ecosystemDropdown.style.display === 'block';
  ecosystemDropdown.style.display = isShown ? 'none' : 'block';
});

document.addEventListener('click', () => {
  ecosystemDropdown.style.display = 'none';
});

// Ecosystem links
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
