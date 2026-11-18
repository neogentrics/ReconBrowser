const { app, BrowserWindow, session, ipcMain, Menu, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Updater } = require('./updater');

let mainWindow;
let blockedCount = 0;
let shieldsEnabled = true;
const pausedHosts = new Set();
let updater = null;

// Load tracking domains blocklist
const filterPath = path.join(__dirname, '../../config/filters/default-trackers.txt');
const trackingDomains = new Set();

try {
  const content = fs.readFileSync(filterPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('!') && !trimmed.startsWith('#') && !trimmed.startsWith('[')) {
      let clean = trimmed.replace(/^\|\|/, '').replace(/\^.*$/, '').replace(/\$.*$/, '').replace(/\/.*$/, '').trim();
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
        {
          label: 'Toggle Reader View',
          accelerator: 'CmdOrCtrl+Alt+R',
          click: () => mainWindow && mainWindow.webContents.send('menu-toggle-reader')
        },
        {
          label: 'Read Aloud (Play / Pause)',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow && mainWindow.webContents.send('menu-read-aloud')
        },
        {
          label: 'Stop Reading Aloud',
          accelerator: 'CmdOrCtrl+Shift+X',
          click: () => mainWindow && mainWindow.webContents.send('menu-stop-reading')
        },
        { type: 'separator' },
        {
          label: 'Customize Themes & Aspects...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow && mainWindow.webContents.send('menu-open-settings')
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
          label: 'Recon Apps Store',
          click: () => shell.openExternal('https://recontowers.com/apps/')
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

  // Set clean standard Chrome User-Agent to prevent bot/captcha detection
  const defaultUA = session.defaultSession.getUserAgent();
  const cleanUA = defaultUA
    .replace(/Electron\/\S+\s?/, '')
    .replace(/recon-browser\/\S+\s?/, '');
  session.defaultSession.setUserAgent(cleanUA);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Network request interception (Recon Shields)
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!shieldsEnabled) {
      return callback({ cancel: false });
    }

    try {
      const url = new URL(details.url);
      const host = url.hostname.toLowerCase();

      // Check if site or initiator is paused
      let initiatorHost = '';
      if (details.initiator) {
        try { initiatorHost = new URL(details.initiator).hostname.toLowerCase(); } catch {}
      } else if (details.referrer) {
        try { initiatorHost = new URL(details.referrer).hostname.toLowerCase(); } catch {}
      }

      if (pausedHosts.has(host) || (initiatorHost && (pausedHosts.has(initiatorHost) || Array.from(pausedHosts).some(p => initiatorHost.endsWith('.' + p))))) {
        return callback({ cancel: false });
      }

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

// App Launching / Detection Logic
function findLocalAppPath(appName) {
  const platform = process.platform;
  const home = process.env.USERPROFILE || process.env.HOME || '';

  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const programs = [path.join(local, 'Programs'), process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean);

    if (appName === 'rt-markdown-reader') {
      const names = ['rt-markdown-reader', 'RT Markdown Reader'];
      for (const dir of programs) {
        for (const name of names) {
          const candidate = path.join(dir, name, 'RT Markdown Reader.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    } else if (appName === 'rt-story-tracker') {
      const names = ['rt-story-tracker', 'RT Story Tracker'];
      for (const dir of programs) {
        for (const name of names) {
          const candidate = path.join(dir, name, 'RT Story Tracker.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    }
  } else if (platform === 'darwin') {
    if (appName === 'rt-markdown-reader') {
      for (const p of ['/Applications/RT Markdown Reader.app', path.join(home, 'Applications', 'RT Markdown Reader.app')]) {
        if (fs.existsSync(p)) return p;
      }
    } else if (appName === 'rt-story-tracker') {
      for (const p of ['/Applications/RT Story Tracker.app', path.join(home, 'Applications', 'RT Story Tracker.app')]) {
        if (fs.existsSync(p)) return p;
      }
    }
  } else if (platform === 'linux') {
    if (appName === 'rt-markdown-reader') {
      for (const p of ['/usr/bin/rt-markdown-reader', '/opt/RT Markdown Reader/rt-markdown-reader']) {
        if (fs.existsSync(p)) return p;
      }
    } else if (appName === 'rt-story-tracker') {
      for (const p of ['/usr/bin/rt-story-tracker', '/opt/RT Story Tracker/rt-story-tracker']) {
        if (fs.existsSync(p)) return p;
      }
    }
  }

  return null;
}

// IPC Handlers
ipcMain.on('toggle-shields', (event, enabled) => {
  shieldsEnabled = enabled;
  console.log(`[Recon Shields] Global State toggled: ${shieldsEnabled ? 'ACTIVE' : 'DISABLED'}`);
});

ipcMain.on('set-site-shields', (event, { host, enabled }) => {
  if (!host) return;
  const cleanHost = host.toLowerCase().trim();
  if (enabled) {
    pausedHosts.delete(cleanHost);
  } else {
    pausedHosts.add(cleanHost);
  }
  console.log(`[Recon Shields] Host ${cleanHost} set to: ${enabled ? 'ACTIVE' : 'PAUSED'}`);
});

ipcMain.handle('launch-or-open-app', async (event, { appName, storeUrl }) => {
  const localExe = findLocalAppPath(appName);
  if (localExe) {
    try {
      if (process.platform === 'darwin') {
        spawn('open', ['-a', localExe], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn(localExe, [], { detached: true, stdio: 'ignore' }).unref();
      }
      return { launched: true, path: localExe };
    } catch (err) {
      console.error(`Failed to spawn ${localExe}:`, err);
    }
  }

  // Not installed or spawn failed -> return url to navigate
  return { launched: false, url: storeUrl };
});

ipcMain.on('reset-blocked-count', () => {
  blockedCount = 0;
});

ipcMain.handle('get-app-info', () => {
  return {
    name: 'Recon Browser',
    version: app.getVersion() || '1.2.0',
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
