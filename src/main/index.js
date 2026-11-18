const { app, BrowserWindow, session, ipcMain, Menu, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { Updater } = require('./updater');

let mainWindow;
let blockedCount = 0;
let shieldsEnabled = true;
let updater = null;

// Load tracking domains blocklist
const filterPath = path.join(__dirname, '../../config/filters/default-trackers.txt');
const trackingDomains = new Set();

try {
  const content = fs.readFileSync(filterPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('!') && !trimmed.startsWith('[')) {
      const clean = trimmed.replace(/^\|\|/, '').replace(/\^.*$/, '');
      if (clean) trackingDomains.add(clean.toLowerCase());
    }
  });
  console.log(`[Recon Shields] Loaded ${trackingDomains.size} tracking rules.`);
} catch (e) {
  console.warn('[Recon Shields] Could not load blocklist from disk, using default fallbacks.');
  ['google-analytics.com', 'doubleclick.net', 'criteo.com', 'facebook.net'].forEach(d => trackingDomains.add(d));
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow && mainWindow.webContents.send('menu-new-tab')
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow && mainWindow.webContents.send('menu-close-tab')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.webContents.send('menu-reload')
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow && mainWindow.webContents.send('menu-reload')
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Tabs',
      submenu: [
        {
          label: 'Next Tab',
          accelerator: 'Ctrl+Tab',
          click: () => mainWindow && mainWindow.webContents.send('menu-next-tab')
        },
        {
          label: 'Previous Tab',
          accelerator: 'Ctrl+Shift+Tab',
          click: () => mainWindow && mainWindow.webContents.send('menu-prev-tab')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Help Center',
          accelerator: 'F1',
          click: () => shell.openExternal('https://recontowers.com')
        },
        {
          label: 'Recon Towers Ecosystem',
          click: () => shell.openExternal('https://recontowers.com')
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => mainWindow && mainWindow.webContents.send('menu-shortcuts')
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            if (updater) updater.check({ silent: false });
          }
        },
        { type: 'separator' },
        {
          label: 'About Recon Browser',
          click: () => mainWindow && mainWindow.webContents.send('open-about-dialog')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const iconPath = path.join(__dirname, '../../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f111a',
    title: 'Recon Browser',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Network request interception (Recon Shields)
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!shieldsEnabled) {
      return callback({ cancel: false });
    }

    try {
      const url = new URL(details.url);
      const host = url.hostname.toLowerCase();

      for (const domain of trackingDomains) {
        if (host === domain || host.endsWith('.' + domain)) {
          blockedCount++;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('shield-blocked-update', { count: blockedCount, blockedUrl: host });
          }
          return callback({ cancel: true });
        }
      }
    } catch (err) {
      // Ignore malformed URLs
    }

    callback({ cancel: false });
  });

  // Start updater
  updater = new Updater((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-status', status);
    }
  });
  updater.start();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
}

// IPC Handlers
ipcMain.on('toggle-shields', (event, enabled) => {
  shieldsEnabled = enabled;
  console.log(`[Recon Shields] State toggled: ${shieldsEnabled ? 'ACTIVE' : 'DISABLED'}`);
});

ipcMain.on('reset-blocked-count', () => {
  blockedCount = 0;
});

ipcMain.handle('get-app-info', () => {
  return {
    name: 'Recon Browser',
    version: app.getVersion() || '1.1.0',
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    os: `${process.platform} ${process.arch}`,
    year: new Date().getFullYear()
  };
});

ipcMain.on('open-external-url', (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

ipcMain.on('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
});

ipcMain.on('check-updates-manual', () => {
  if (updater) updater.check({ silent: false });
});

ipcMain.on('install-update-now', () => {
  if (updater) updater.installNow();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
