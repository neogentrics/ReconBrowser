const { app, BrowserWindow, session, ipcMain, Menu, shell, clipboard, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Updater } = require('./updater');
const { AppLink, LinkError, sharedFolder, toPlainWords } = require('./app-link');
const { buildClipDocument, htmlToCleanMarkdown, safeDocumentName } = require('./clip-builder');

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
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Send Research Clip...',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow && mainWindow.webContents.send('menu-open-clip')
        }
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
          label: 'Themes',
          submenu: [
            { label: 'Recon Cyber Dark (Default)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'cyber') },
            { label: 'Pure Obsidian', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'obsidian') },
            { label: 'Recon Slate', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'slate') },
            { label: 'Warm Sepia', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'sepia') },
            { label: 'Nordic Mist', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'mist') },
            { type: 'separator' },
            { label: 'Cobalt Abyss (Deep Blue)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'ocean') },
            { label: 'Glacial Azure (Light Blue)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'azure') },
            { type: 'separator' },
            { label: 'Midnight Dusk (Royal Purple)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'dusk') },
            { label: 'Classic Recon Dark', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'dark') },
            { type: 'separator' },
            { label: 'Crimson Horizon (Burgundy Red)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'red') },
            { label: 'Scarlet Blaze (Vivid Red)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'scarlet') },
            { type: 'separator' },
            { label: 'Amber Sunset (Bronze Yellow)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'yellow') },
            { label: 'Solar Flare (Cyber Gold)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'solar') },
            { type: 'separator' },
            { label: 'Deep Forest (Dark Green)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'forest') },
            { label: 'Evergreen (Vivid Green)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'evergreen') },
            { type: 'separator' },
            { label: 'High Contrast (ADA Compliant)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'contrast') },
            { label: 'Colorblind Blue-Orange (ADA)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'colorblind-blue-orange') },
            { label: 'Colorblind Cyan-Magenta (ADA)', click: () => mainWindow && mainWindow.webContents.send('menu-set-theme', 'colorblind-cyan-magenta') }
          ]
        },
        {
          label: 'Theme Finishes & Aspects',
          submenu: [
            { label: 'Solid (Matte)', click: () => mainWindow && mainWindow.webContents.send('menu-set-aspect', 'solid') },
            { label: 'Metallic (Brushed Sheen)', click: () => mainWindow && mainWindow.webContents.send('menu-set-aspect', 'metallic') },
            { label: 'Glass (Frosted Acrylic)', click: () => mainWindow && mainWindow.webContents.send('menu-set-aspect', 'glass') }
          ]
        },
        {
          label: 'Settings...',
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
            checkForUpdatesInteractive(mainWindow);
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

  function isSiteShieldsPaused(details) {
    if (!pausedHosts || pausedHosts.size === 0) return false;

    const candidates = [];
    try {
      const url = new URL(details.url);
      if (url.hostname) candidates.push(url.hostname.toLowerCase());
    } catch {}

    if (details.initiator) {
      try {
        const initUrl = new URL(details.initiator);
        if (initUrl.hostname) candidates.push(initUrl.hostname.toLowerCase());
      } catch {}
    }

    if (details.referrer) {
      try {
        const refUrl = new URL(details.referrer);
        if (refUrl.hostname) candidates.push(refUrl.hostname.toLowerCase());
      } catch {}
    }

    if (details.webContentsId) {
      try {
        const wc = webContents.fromId(details.webContentsId);
        if (wc && !wc.isDestroyed()) {
          const pageUrl = wc.getURL();
          if (pageUrl) {
            const u = new URL(pageUrl);
            if (u.hostname) candidates.push(u.hostname.toLowerCase());
          }
        }
      } catch {}
    }

    for (const candidate of candidates) {
      const baseCandidate = candidate.replace(/^www\./, '');
      for (const p of pausedHosts) {
        const cleanP = p.toLowerCase().trim();
        const baseP = cleanP.replace(/^www\./, '');
        if (
          candidate === cleanP ||
          candidate.endsWith('.' + cleanP) ||
          cleanP.endsWith('.' + candidate) ||
          baseCandidate === baseP ||
          baseCandidate.endsWith('.' + baseP) ||
          baseP.endsWith('.' + baseCandidate)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // Network request interception (Recon Shields)
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!shieldsEnabled) {
      return callback({ cancel: false });
    }

    try {
      if (isSiteShieldsPaused(details)) {
        return callback({ cancel: false });
      }

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
let dohEnabled = true;

function applyDohConfig(enabled) {
  dohEnabled = enabled;
  if (app.configureHostResolver) {
    try {
      if (enabled) {
        app.configureHostResolver({
          enableBuiltInResolver: true,
          secureDnsMode: 'secure',
          secureDnsServers: [
            'https://1.1.1.1/dns-query',
            'https://1.0.0.1/dns-query',
            'https://cloudflare-dns.com/dns-query',
            'https://dns.google/dns-query'
          ]
        });
        console.log('[Recon Network] DoH Configured: Cloudflare 1.1.1.1 & Google DNS Secure Mode');
      } else {
        app.configureHostResolver({
          enableBuiltInResolver: false,
          secureDnsMode: 'off',
          secureDnsServers: []
        });
        console.log('[Recon Network] DoH Disabled: Standard System DNS Resolver');
      }
    } catch (err) {
      console.error('[Recon Network] Failed to configure host resolver:', err);
    }
  }
}

ipcMain.on('toggle-doh', (event, enabled) => {
  applyDohConfig(enabled);
});

ipcMain.on('toggle-shields', (event, enabled) => {
  shieldsEnabled = enabled;
  console.log(`[Recon Shields] Global State toggled: ${shieldsEnabled ? 'ACTIVE' : 'DISABLED'}`);
});

ipcMain.on('set-site-shields', (event, { host, enabled }) => {
  if (!host) return;
  const cleanHost = host.toLowerCase().trim();
  const baseHost = cleanHost.replace(/^www\./, '');
  if (enabled) {
    pausedHosts.delete(cleanHost);
    pausedHosts.delete(baseHost);
  } else {
    pausedHosts.add(cleanHost);
    pausedHosts.add(baseHost);
  }
  console.log(`[Recon Shields] Host ${cleanHost} (${baseHost}) set to: ${enabled ? 'ACTIVE' : 'PAUSED'}`);
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

async function checkForUpdatesInteractive(win) {
  if (!updater) return;
  const parent = win || mainWindow;
  const res = await updater.check({ silent: false });
  if (res.state === 'current') {
    dialog.showMessageBox(parent, {
      type: 'info',
      title: 'Check for Updates',
      message: 'You’re up to date',
      detail: `Recon Browser ${app.getVersion()} is the latest version.`,
      buttons: ['OK']
    });
  } else if (res.state === 'available') {
    const { response } = await dialog.showMessageBox(parent, {
      type: 'info',
      title: 'Update Available',
      message: `Recon Browser v${res.version} is available!`,
      detail: 'A new version of Recon Browser is ready for download from GitHub Releases.',
      buttons: ['Download Update', 'Later'],
      defaultId: 0,
      cancelId: 1
    });
    if (response === 0) {
      shell.openExternal(res.url || 'https://github.com/neogentrics/ReconBrowser/releases/latest');
    }
  } else if (res.state === 'downloading' || res.state === 'ready') {
    const isReady = res.state === 'ready';
    const { response } = await dialog.showMessageBox(parent, {
      type: 'info',
      title: isReady ? 'Update Ready to Install' : 'Downloading Update',
      message: `Recon Browser v${res.version} is ${isReady ? 'ready to install' : 'downloading in the background'}`,
      detail: isReady ? 'Restart Recon Browser now to apply the update?' : 'You will be notified as soon as the download finishes.',
      buttons: isReady ? ['Restart to Update', 'Later'] : ['OK'],
      defaultId: 0,
      cancelId: 1
    });
    if (isReady && response === 0) {
      updater.installNow();
    }
  } else if (res.state === 'error') {
    dialog.showMessageBox(parent, {
      type: 'warning',
      title: 'Update Check',
      message: 'Couldn’t check for updates',
      detail: res.message || 'Check your internet connection and try again.'
    });
  }
}

ipcMain.on('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
});

ipcMain.on('check-updates-manual', () => {
  checkForUpdatesInteractive(mainWindow);
});

ipcMain.on('install-update-now', () => {
  if (updater) updater.installNow();
});

// ==========================================================================
// Recon App Link & Research Clips (v1.3.0)
// ==========================================================================
let appLinkInstance = null;
let linksMemory = null;
const linksFile = () => path.join(app.getPath('userData'), 'links.bin');

function isSecureStorage() {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) return false;
  if (process.platform === 'linux' && typeof safeStorage.getSelectedStorageBackend === 'function') {
    const backend = safeStorage.getSelectedStorageBackend();
    if (backend === 'basic_text' || backend === 'unknown') return false;
  }
  return true;
}

function loadLinks() {
  if (linksMemory) return { ...linksMemory };
  if (!isSecureStorage()) return {};
  try {
    const raw = fs.readFileSync(linksFile());
    const decrypted = safeStorage.decryptString(raw);
    const parsed = JSON.parse(decrypted);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLinks(links) {
  if (isSecureStorage()) {
    try {
      const encrypted = safeStorage.encryptString(JSON.stringify(links));
      fs.writeFileSync(linksFile(), encrypted);
    } catch (e) {
      linksMemory = { ...links };
    }
  } else {
    // Kept in memory only until app closes, never in plain text
    linksMemory = { ...links };
  }
}

async function initAppLink() {
  if (appLinkInstance) return;
  const shared = sharedFolder({ home: app.getPath('home') });
  const userData = app.getPath('userData');

  appLinkInstance = new AppLink({
    folder: shared,
    dataDir: userData,
    version: app.getVersion() || '1.3.0',
    load: loadLinks,
    save: saveLinks,
    ask: async ({ name }) => {
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'App Link Request',
        message: `Link ${name} with Recon Browser?`,
        detail: `${name} wants to link with Recon Browser. This allows sending documents between apps.\n\nOnly approve if you requested this in ${name}.`,
        buttons: ['Link Apps', 'Don’t Link'],
        defaultId: 0,
        cancelId: 1
      });
      return response === 0;
    },
    open: async ({ from, name, text, kind }) => {
      if (mainWindow) {
        mainWindow.webContents.send('app-link-received-document', { from, name, text, kind });
      }
    }
  });

  try {
    await appLinkInstance.start();
    console.log('[App Link] Recon Browser presence registered on App Link');
  } catch (err) {
    console.error('[App Link] Failed to start App Link presence:', err);
  }
}

// App Link IPC Handlers
ipcMain.handle('app-link:get-status', async () => {
  if (!appLinkInstance) await initAppLink();
  const apps = appLinkInstance ? await appLinkInstance.list() : [];
  return {
    enabled: true,
    safe: isSecureStorage(),
    apps
  };
});

ipcMain.handle('app-link:pair-with', async (event, appId) => {
  if (!appLinkInstance) await initAppLink();
  try {
    const res = await appLinkInstance.pairWith(appId);
    return { success: true, name: res.name, id: res.id };
  } catch (err) {
    return {
      success: false,
      code: err.code || 'failed',
      message: toPlainWords(err, appId)
    };
  }
});

ipcMain.handle('app-link:unlink', async (event, appId) => {
  if (!appLinkInstance) return { success: true };
  await appLinkInstance.unlink(appId);
  return { success: true };
});

ipcMain.handle('app-link:format-clip', (event, clipOptions) => {
  return buildClipDocument(clipOptions);
});

ipcMain.handle('app-link:clean-html', (event, html) => {
  return htmlToCleanMarkdown(html);
});

ipcMain.handle('app-link:send-clip', async (event, { appId, clipOptions }) => {
  if (!appLinkInstance) await initAppLink();
  const clip = buildClipDocument(clipOptions);

  try {
    const res = await appLinkInstance.sendClip(appId, {
      name: clip.fileName,
      text: clip.markdown
    });
    return {
      success: true,
      name: res.name,
      fileName: clip.fileName
    };
  } catch (err) {
    return {
      success: false,
      code: err.code || 'failed',
      message: toPlainWords(err, appId)
    };
  }
});

// Context menu on web contents for selection clipping
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('context-menu', async (e, params) => {
      const menuTemplate = [];

      // 1. Link Context Actions (Bookmark link, open in new tab, copy address)
      if (params.linkURL) {
        menuTemplate.push(
          {
            label: 'Open Link in New Tab',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('open-link-new-tab', { url: params.linkURL });
              }
            }
          },
          {
            label: '★ Bookmark Link',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('bookmark-link', {
                  url: params.linkURL,
                  title: params.linkText || params.linkURL
                });
              }
            }
          },
          {
            label: 'Copy Link Address',
            click: () => clipboard.writeText(params.linkURL)
          }
        );
      }

      // 2. Selection Context Actions (Research clips, markdown quote, copy)
      if (params.selectionText && params.selectionText.trim().length > 0) {
        if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });

        const apps = appLinkInstance ? await appLinkInstance.list() : [];
        const runningLinked = apps.filter(a => a.running && a.linked);

        menuTemplate.push({
          label: 'Send Research Clip...',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-clip-dialog', { selectedText: params.selectionText });
            }
          }
        });

        if (runningLinked.length > 0) {
          runningLinked.forEach(a => {
            menuTemplate.push({
              label: `Send to ${a.name}`,
              click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('open-clip-dialog', {
                    selectedText: params.selectionText,
                    targetAppId: a.id
                  });
                }
              }
            });
          });
        }

        menuTemplate.push(
          {
            label: 'Copy as Markdown Quote',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('copy-clip-as-markdown', { selectedText: params.selectionText });
              }
            }
          },
          { type: 'separator' },
          { role: 'copy' }
        );
      }

      // 3. Editable Input Actions
      if (params.isEditable) {
        if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });
        menuTemplate.push(
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        );
      }

      // 4. General Page Navigation & Bookmark fallback
      if (!params.linkURL && (!params.selectionText || !params.selectionText.trim()) && !params.isEditable) {
        menuTemplate.push(
          {
            label: 'Back',
            enabled: contents.canGoBack(),
            click: () => contents.goBack()
          },
          {
            label: 'Forward',
            enabled: contents.canGoForward(),
            click: () => contents.goForward()
          },
          {
            label: 'Reload',
            click: () => contents.reload()
          },
          { type: 'separator' },
          {
            label: '★ Bookmark This Page',
            accelerator: 'CmdOrCtrl+D',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('bookmark-active-tab');
              }
            }
          }
        );
      }

      if (menuTemplate.length > 0) {
        const menu = Menu.buildFromTemplate(menuTemplate);
        menu.popup();
      }
    });
  }
});

app.whenReady().then(async () => {
  applyDohConfig(dohEnabled);
  await initAppLink();
  createWindow();
});

app.on('will-quit', async () => {
  if (appLinkInstance) {
    await appLinkInstance.stop();
    appLinkInstance = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
