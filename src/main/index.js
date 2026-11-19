const { app, BrowserWindow, session, ipcMain, Menu, shell, clipboard, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Updater } = require('./updater');
const { PasswordVault } = require('./vault');
const { HistoryManager } = require('./history');
const { SyncManager } = require('./sync');
const { ArchiveManager } = require('./archive');
const { ShieldsManager } = require('./shields2');
const { CompanionRailManager } = require('./companion-rail');
const { AudioGrabberManager } = require('./audio-grabber');
const { ContainerManager } = require('./containers');
const { OllamaManager } = require('./ollama');
const ollamaManager = new OllamaManager();
const { IPFSManager } = require('./ipfs');
const { GeminiManager } = require('./gemini');
const { MigrationManager } = require('./migration');
const ipfsManager = new IPFSManager();
const geminiManager = new GeminiManager();
const migrationManager = new MigrationManager();
const { exportBookmarksToHtml, parseBookmarksHtml, exportVaultToCsv, parseVaultCsv } = require('./importer-exporter');
const { AppLink, LinkError, sharedFolder, toPlainWords } = require('./app-link');
const { buildClipDocument, htmlToCleanMarkdown, safeDocumentName } = require('./clip-builder');

let mainWindow;
let blockedCount = 0;
let shieldsEnabled = true;
const pausedHosts = new Set();
let updater = null;
const vault = new PasswordVault();
const historyManager = new HistoryManager();
const syncManager = new SyncManager();
const archiveManager = new ArchiveManager();
const shieldsManager = new ShieldsManager();
const companionRailManager = new CompanionRailManager();
const audioGrabberManager = new AudioGrabberManager();
const containerManager = new ContainerManager();

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
          label: 'New Ephemeral Tab (Burn on Close)',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow && mainWindow.webContents.send('menu-new-ephemeral-tab')
        },
        {
          label: 'New Container Tab...',
          accelerator: 'CmdOrCtrl+Alt+T',
          click: () => mainWindow && mainWindow.webContents.send('menu-new-container-tab')
        },
        { type: 'separator' },
        {
          label: 'Browsing History',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow && mainWindow.webContents.send('menu-open-history')
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
          label: 'New Ephemeral Tab (Burn on Close)',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow && mainWindow.webContents.send('menu-new-ephemeral-tab')
        },
        {
          label: 'New Container Tab...',
          accelerator: 'CmdOrCtrl+Alt+T',
          click: () => mainWindow && mainWindow.webContents.send('menu-new-container-tab')
        },
        { type: 'separator' },
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
      label: 'Studio',
      submenu: [
        {
          label: 'Toggle Author Desk Companion Rail',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow && mainWindow.webContents.send('companion-toggle-rail')
        },
        {
          label: 'Append Highlighted Text to Companion Rail',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow && mainWindow.webContents.send('companion-append-active-selection')
        },
        { type: 'separator' },
        {
          label: 'Open Audio Grabber (RT Audio Studio)...',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => mainWindow && mainWindow.webContents.send('audio-grabber-open')
        },
        {
          label: 'Save Active Page to Offline Archive',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow && mainWindow.webContents.send('archive-active-page')
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

  // Network request interception (Recon Shields 2.0 & Live Inspector)
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!shieldsEnabled) {
      shieldsManager.logRequest(details.webContentsId, {
        url: details.url,
        method: details.method,
        resourceType: details.resourceType,
        blocked: false,
        reason: 'Shields Global Disabled'
      });
      return callback({ cancel: false });
    }

    try {
      if (isSiteShieldsPaused(details)) {
        shieldsManager.logRequest(details.webContentsId, {
          url: details.url,
          method: details.method,
          resourceType: details.resourceType,
          blocked: false,
          reason: 'Site Shield Paused'
        });
        return callback({ cancel: false });
      }

      const url = new URL(details.url);
      const host = url.hostname.toLowerCase();

      let isBlocked = false;
      let reason = '';

      for (const domain of trackingDomains) {
        if (host === domain || host.endsWith('.' + domain)) {
          isBlocked = true;
          reason = 'Suffix Tracker Filter';
          break;
        }
      }

      if (!isBlocked && shieldsManager.isDomainBlocked(host)) {
        isBlocked = true;
        reason = 'Shields 2.0 Subscription';
      }

      if (isBlocked) {
        blockedCount++;
        shieldsManager.logRequest(details.webContentsId, {
          url: details.url,
          host,
          method: details.method,
          resourceType: details.resourceType,
          blocked: true,
          reason
        });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shield-blocked-update', { count: blockedCount, blockedUrl: host });
        }
        return callback({ cancel: true });
      }

      shieldsManager.logRequest(details.webContentsId, {
        url: details.url,
        host,
        method: details.method,
        resourceType: details.resourceType,
        blocked: false,
        reason: 'Allowed'
      });

      if (details.resourceType === 'media' || /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)(\?.*)?$/i.test(details.url)) {
        audioGrabberManager.recordDetectedMedia(details.webContentsId, { url: details.url });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('media-detected-update', { url: details.url });
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
  }, () => mainWindow);
  updater.start();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
}

// App Launching / Detection Logic & Ecosystem Catalog
const RECON_APP_CATALOG = [
  {
    id: 'rt-story-tracker',
    name: 'RT Story Tracker',
    icon: '📚',
    desc: 'Character bibles, series arcs, canon management & timelines',
    webUrl: 'https://recontowers.com/apps/rt-story-tracker/',
    exeNames: ['RT Story Tracker.exe', 'rt-story-tracker.exe', 'StoryTracker.exe'],
    projectDirs: ['StoryTracker', 'StoryTracker-v3.0', 'rt-story-tracker']
  },
  {
    id: 'rt-markdown-reader',
    name: 'RT Markdown Reader',
    icon: '📝',
    desc: 'Distraction-free Markdown editor, manuscript viewer & research notes',
    webUrl: 'https://recontowers.com/apps/rt-markdown-reader/',
    exeNames: ['RT Markdown Reader.exe', 'rt-markdown-reader.exe', 'neo-markdown-reader.exe'],
    projectDirs: ['rt-markdown-reader-v3.11', 'neo-markdown-reader', 'rt-markdown-reader']
  },
  {
    id: 'rt-author-desk',
    name: 'RT Author Desk',
    icon: '✍️',
    desc: 'Creative drafting desk, chapter builder & companion rail',
    webUrl: 'https://recontowers.com/apps/rt-author-desk/',
    exeNames: ['RT Author Desk.exe', 'rt-author-desk.exe', 'author-desk.exe'],
    projectDirs: ['rt-author-desk', 'author-desk']
  },
  {
    id: 'rt-audio-studio',
    name: 'RT Audio Studio',
    icon: '🎙️',
    desc: 'Voice generation, audio stream capture & audio references',
    webUrl: 'https://recontowers.com/apps/rt-audio-studio/',
    exeNames: ['RT Audio Studio.exe', 'rt-audio-studio.exe', 'audio-studio.exe'],
    projectDirs: ['rt-audio-studio', 'audio-studio']
  },
  {
    id: 'rt-press',
    name: 'RT Press',
    icon: '📰',
    desc: 'Book typesetting, EPUB/PDF publishing & print layout',
    webUrl: 'https://recontowers.com/apps/rt-press/',
    exeNames: ['RT Press.exe', 'rt-press.exe', 'press.exe'],
    projectDirs: ['rt-press', 'press']
  }
];

function findLocalAppPath(appName) {
  const platform = process.platform;
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const appEntry = RECON_APP_CATALOG.find(a => a.id === appName || a.name.toLowerCase() === appName.toLowerCase()) || {
    id: appName,
    name: appName,
    exeNames: [`${appName}.exe`],
    projectDirs: [appName]
  };

  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const roaming = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const searchDirs = [
      path.join(local, 'Programs'),
      process.env.ProgramFiles,
      process.env['ProgramFiles(x86)'],
      path.join(home, 'Desktop'),
      path.join(roaming, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.resolve(__dirname, '../../..'),
      'E:\\Github Projects',
      'D:\\Github Projects',
      'C:\\Github Projects'
    ].filter(Boolean);

    for (const baseDir of searchDirs) {
      if (!fs.existsSync(baseDir)) continue;
      // Direct executable checks
      for (const exeName of appEntry.exeNames) {
        const direct = path.join(baseDir, exeName);
        if (fs.existsSync(direct)) return direct;
      }
      // Subfolder checks
      const candidateFolders = [appEntry.name, appEntry.id, ...(appEntry.projectDirs || [])];
      for (const folder of candidateFolders) {
        for (const exeName of appEntry.exeNames) {
          const checkPaths = [
            path.join(baseDir, folder, exeName),
            path.join(baseDir, folder, 'release', 'win-unpacked', exeName),
            path.join(baseDir, folder, 'dist', 'win-unpacked', exeName),
            path.join(baseDir, folder, 'build', exeName)
          ];
          for (const cp of checkPaths) {
            try {
              if (fs.existsSync(cp)) return cp;
            } catch {}
          }
        }
      }
    }
  } else if (platform === 'darwin') {
    const appNames = [appEntry.name, appEntry.id];
    for (const name of appNames) {
      for (const p of [`/Applications/${name}.app`, path.join(home, 'Applications', `${name}.app`)]) {
        if (fs.existsSync(p)) return p;
      }
    }
  } else if (platform === 'linux') {
    for (const exe of [appEntry.id, appEntry.name.toLowerCase().replace(/\s+/g, '-')]) {
      for (const p of [`/usr/bin/${exe}`, `/opt/${appEntry.name}/${exe}`, `/usr/local/bin/${exe}`]) {
        if (fs.existsSync(p)) return p;
      }
    }
    const devBases = ['/mnt/e/Github Projects', '/mnt/d/Github Projects', path.resolve(__dirname, '../../..')];
    for (const base of devBases) {
      for (const folder of (appEntry.projectDirs || [])) {
        for (const exe of appEntry.exeNames) {
          const cp = path.join(base, folder, 'release', 'win-unpacked', exe);
          if (fs.existsSync(cp)) return cp;
        }
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
    const isDownloading = updater.isDownloading;
    const hasInstaller = Boolean(updater.downloadedInstallerPath);

    if (hasInstaller) {
      const { response } = await dialog.showMessageBox(parent, {
        type: 'info',
        title: 'Update Ready to Install',
        message: `Recon Browser v${res.version} has been downloaded!`,
        detail: 'Click "Install & Restart" to apply the update now. Windows may ask for administrative (UAC) permission.',
        buttons: ['Install & Restart', 'Later'],
        defaultId: 0,
        cancelId: 1
      });
      if (response === 0) {
        updater.installNow();
      }
    } else {
      dialog.showMessageBox(parent, {
        type: 'info',
        title: 'Update Available',
        message: `Recon Browser v${res.version} is available!`,
        detail: isDownloading
          ? 'Recon Browser is currently downloading the installer in the background. You will be prompted as soon as it is ready to install.'
          : 'The update is downloading in the background. You can continue browsing.',
        buttons: ['OK']
      });
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
// Password Vault IPC Handlers (v1.4.0)
// ==========================================================================
ipcMain.handle('vault:get-all', () => vault.getAll());
ipcMain.handle('vault:get-for-domain', (event, domain) => vault.getForDomain(domain));
ipcMain.handle('vault:save', (event, cred) => vault.addOrUpdate(cred));
ipcMain.handle('vault:delete', (event, id) => vault.delete(id));
ipcMain.handle('vault:generate-password', (event, options) => vault.generatePassword(options));
ipcMain.handle('vault:is-available', () => vault.isAvailable());

// ==========================================================================
// Browsing History IPC Handlers (v1.4.0)
// ==========================================================================
let historyClearOnQuit = false;
ipcMain.handle('history:get-grouped', (event, query) => historyManager.getGroupedByDay(query));
ipcMain.handle('history:add', (event, item) => historyManager.add(item));
ipcMain.handle('history:delete', (event, id) => historyManager.delete(id));
ipcMain.handle('history:clear', (event, range) => historyManager.clear(range));
ipcMain.handle('history:get-clear-on-quit', () => historyClearOnQuit);
ipcMain.handle('history:set-clear-on-quit', (event, val) => {
  historyClearOnQuit = Boolean(val);
  return historyClearOnQuit;
});

// ==========================================================================
// Default Browser Integration IPC (v1.4.0)
// ==========================================================================
ipcMain.handle('default-browser:status', () => {
  try {
    return app.isDefaultProtocolClient('http');
  } catch {
    return false;
  }
});
ipcMain.handle('default-browser:set', () => {
  try {
    const r1 = app.setAsDefaultProtocolClient('http');
    const r2 = app.setAsDefaultProtocolClient('https');
    return Boolean(r1 && r2);
  } catch (err) {
    console.error('[Recon System] Failed to set default protocol client:', err);
    return false;
  }
});

// ==========================================================================
// Zero-Knowledge Sync & Encrypted Backup IPC (v1.5.0)
// ==========================================================================
ipcMain.handle('sync:get-config', () => syncManager.getConfig());
ipcMain.handle('sync:save-config', (event, cfg) => syncManager.saveConfig(cfg));
ipcMain.handle('sync:select-folder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder for Zero-Knowledge Sync',
    properties: ['openDirectory', 'createDirectory']
  });
  if (!res.canceled && res.filePaths.length > 0) {
    return res.filePaths[0];
  }
  return null;
});

ipcMain.handle('sync:execute-now', async (event, { passphrase, localData }) => {
  try {
    return syncManager.executeFolderSync(passphrase, localData);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync:create-backup', async (event, { passphrase, data }) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Encrypted Recon Browser Backup',
      defaultPath: `ReconBrowser-Backup-${today}.reconbackup`,
      filters: [{ name: 'Recon Browser Backup', extensions: ['reconbackup'] }]
    });
    if (res.canceled || !res.filePath) return { canceled: true };
    const r = syncManager.createBackup(res.filePath, passphrase, data);
    return { success: true, path: r.path };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync:restore-backup', async (event, { passphrase }) => {
  try {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Recon Browser Backup to Restore',
      filters: [{ name: 'Recon Browser Backup', extensions: ['reconbackup'] }],
      properties: ['openFile']
    });
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    const data = syncManager.restoreBackup(res.filePaths[0], passphrase);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Universal Importer & Exporter (Chrome, Brave, Firefox, Edge, Safari)
ipcMain.handle('sync:import-bookmarks-html', async () => {
  try {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Bookmarks (Chrome, Brave, Firefox, Edge, Safari)',
      filters: [{ name: 'HTML Bookmarks File', extensions: ['html', 'htm'] }],
      properties: ['openFile']
    });
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    const content = fs.readFileSync(res.filePaths[0], 'utf8');
    const bookmarks = parseBookmarksHtml(content);
    return { success: true, bookmarks, count: bookmarks.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync:export-bookmarks-html', async (event, bookmarks) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Bookmarks to Standard HTML',
      defaultPath: `bookmarks_${today}.html`,
      filters: [{ name: 'HTML File', extensions: ['html'] }]
    });
    if (res.canceled || !res.filePath) return { canceled: true };
    const html = exportBookmarksToHtml(bookmarks);
    fs.writeFileSync(res.filePath, html, 'utf8');
    return { success: true, path: res.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync:import-vault-csv', async () => {
  try {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Passwords CSV (Bitwarden, Chrome, Firefox, Brave, 1Password)',
      filters: [{ name: 'CSV File', extensions: ['csv'] }],
      properties: ['openFile']
    });
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    const content = fs.readFileSync(res.filePaths[0], 'utf8');
    const creds = parseVaultCsv(content);
    let added = 0;
    for (const c of creds) {
      vault.addOrUpdate(c);
      added++;
    }
    return { success: true, count: added };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync:export-vault-csv', async () => {
  try {
    const all = vault.getAll();
    const today = new Date().toISOString().slice(0, 10);
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Passwords to CSV',
      defaultPath: `recon_passwords_${today}.csv`,
      filters: [{ name: 'CSV File', extensions: ['csv'] }]
    });
    if (res.canceled || !res.filePath) return { canceled: true };
    const csv = exportVaultToCsv(all);
    fs.writeFileSync(res.filePath, csv, 'utf8');
    return { success: true, path: res.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ==========================================================================
// Offline Research Archives IPC (v1.5.0)
// ==========================================================================
ipcMain.handle('archive:save-active-tab', async (event, metadata) => {
  try {
    const allWebContents = session.defaultSession.getAllWebContents();
    const webviewContents = allWebContents.find(wc => wc.getType() === 'webview' && !wc.isDestroyed() && wc.getURL() === metadata.url);
    if (!webviewContents) {
      throw new Error('Active page contents not found for archiving');
    }
    const saved = await archiveManager.savePageArchive(webviewContents, metadata);
    return { success: true, archive: saved };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('archive:get-all', () => archiveManager.getAll());
ipcMain.handle('archive:search', (event, query) => archiveManager.search(query));
ipcMain.handle('archive:delete', (event, id) => archiveManager.delete(id));

// ==========================================================================
// Shields 2.0 & Live Network Inspector IPC (v1.5.0)
// ==========================================================================
ipcMain.handle('shields:get-subscriptions', () => shieldsManager.getSubscriptions());
ipcMain.handle('shields:save-subscriptions', (event, subs) => shieldsManager.saveSubscriptions(subs));
ipcMain.handle('network-inspector:get-logs', (event, tabId) => shieldsManager.getTabLogs(tabId));
ipcMain.handle('network-inspector:clear-logs', (event, tabId) => {
  shieldsManager.clearTabLogs(tabId);
  return true;
});
ipcMain.handle('zapper:get-rules', (event, domain) => shieldsManager.getZapperRulesForDomain(domain));
ipcMain.handle('zapper:add-rule', (event, { domain, selector }) => shieldsManager.addZapperRule(domain, selector));
ipcMain.handle('zapper:remove-rule', (event, { domain, selector }) => shieldsManager.removeZapperRule(domain, selector));

// ==========================================================================
// Author Desk Companion Rail & Audio Studio Grabber IPC (v1.6.0)
// ==========================================================================
ipcMain.handle('companion:get-notes', () => companionRailManager.getAllNotes());
ipcMain.handle('companion:save-note', (event, note) => companionRailManager.saveNote(note));
ipcMain.handle('companion:delete-note', (event, id) => companionRailManager.deleteNote(id));
ipcMain.handle('companion:append-snippet', (event, { noteId, data }) => companionRailManager.appendSnippet(noteId, data));
ipcMain.handle('companion:export-note-md', async (event, { title, content }) => {
  try {
    const safeTitle = (title || 'companion_note').replace(/[^a-zA-Z0-9_-]/g, '_');
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Note to Markdown',
      defaultPath: `${safeTitle}.md`,
      filters: [{ name: 'Markdown File', extensions: ['md', 'markdown'] }]
    });
    if (res.canceled || !res.filePath) return { canceled: true };
    fs.writeFileSync(res.filePath, content, 'utf8');
    return { success: true, path: res.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('audio-grabber:get-detected', (event, tabId) => audioGrabberManager.getDetectedMedia(tabId));
ipcMain.handle('audio-grabber:record-detected', (event, { tabId, mediaItem }) => {
  audioGrabberManager.recordDetectedMedia(tabId, mediaItem);
  return true;
});
ipcMain.handle('audio-grabber:download-clip', async (event, params) => {
  try {
    const saved = await audioGrabberManager.downloadClip(params);
    return { success: true, clip: saved };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('audio-grabber:get-saved-clips', () => audioGrabberManager.getSavedClips());
ipcMain.handle('audio-grabber:delete-clip', (event, id) => audioGrabberManager.deleteClip(id));

// ==========================================================================
// Recon Containers & Isolated Persona Jars IPC (v1.7.0)
// ==========================================================================
ipcMain.handle('containers:get-all', () => containerManager.getAll());
ipcMain.handle('containers:get', (event, id) => containerManager.getContainer(id));
ipcMain.handle('containers:save', (event, data) => containerManager.saveContainer(data));
ipcMain.handle('containers:delete', (event, id) => containerManager.deleteContainer(id));
ipcMain.handle('containers:clear-data', (event, id) => containerManager.clearContainerData(id));
ipcMain.handle('containers:wipe-ephemeral', (event, key) => containerManager.wipeEphemeralPartition(key));
ipcMain.handle('containers:get-partition-key', (event, { containerId, isEphemeral, ephemeralId }) => {
  return containerManager.getPartitionKey(containerId, isEphemeral, ephemeralId);
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
  const rawPeers = appLinkInstance ? await appLinkInstance.list() : [];

  const catalogWithStatus = RECON_APP_CATALOG.map(cat => {
    const peer = rawPeers.find(p => p.id === cat.id);
    const localExe = findLocalAppPath(cat.id);
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      desc: cat.desc,
      webUrl: cat.webUrl,
      version: peer?.version || '',
      running: !!peer?.running,
      linked: !!peer?.linked,
      installed: !!localExe,
      localPath: localExe || ''
    };
  });

  // Also include any other running App Link peers not in catalog
  for (const p of rawPeers) {
    if (!catalogWithStatus.some(c => c.id === p.id)) {
      catalogWithStatus.push({
        id: p.id,
        name: p.name,
        icon: '⚡',
        desc: 'Recon Towers App Link Peer',
        webUrl: 'https://recontowers.com',
        version: p.version || '',
        running: !!p.running,
        linked: !!p.linked,
        installed: true,
        localPath: ''
      });
    }
  }

  return {
    enabled: true,
    safe: isSecureStorage(),
    apps: catalogWithStatus
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

// Recon AI — Ollama IPC Handlers (v1.8.0)
ipcMain.handle('ollama:check', () => ollamaManager.checkConnection());
ipcMain.handle('ollama:list-models', () => ollamaManager.listModels());
ipcMain.handle('ollama:summarize', (event, { text, model, maxWords }) => ollamaManager.summarize(text, model, maxWords));
ipcMain.handle('ollama:extract-claims', (event, { text, model }) => ollamaManager.extractClaims(text, model));
ipcMain.handle('ollama:ask', (event, { question, context, model }) => ollamaManager.askQuestion(question, context, model));
ipcMain.handle('ollama:rewrite', (event, { text, instruction, model }) => ollamaManager.rewriteSelection(text, instruction, model));

// Decentralized Gateway IPC Handlers (v1.9.0)
ipcMain.handle('ipfs:resolve', async (event, { uri, preferredGateway }) => {
  return await ipfsManager.resolveUrl(uri, preferredGateway);
});
ipcMain.handle('ipfs:check-local', async (event, { port }) => {
  return await ipfsManager.checkLocalNode(port);
});
ipcMain.handle('ipfs:get-gateways', () => {
  return ipfsManager.getGatewayList();
});
ipcMain.handle('gemini:fetch', async (event, { url }) => {
  return await geminiManager.fetch(url);
});
ipcMain.handle('migration:audit', async () => {
  return await migrationManager.runAuditAndMigrate();
});

// Context menu & history logging on web contents
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('did-navigate', (event, url) => {
      const title = contents.getTitle() || url;
      historyManager.add({ url, title });
    });
    contents.on('did-navigate-in-page', (event, url) => {
      const title = contents.getTitle() || url;
      historyManager.add({ url, title });
    });

    contents.on('did-finish-load', () => {
      try {
        const u = contents.getURL();
        if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
          const host = new URL(u).hostname;
          const rules = shieldsManager.getZapperRulesForDomain(host);
          if (rules && rules.length > 0) {
            const css = `${rules.join(', ')} { display: none !important; visibility: hidden !important; }`;
            contents.insertCSS(css).catch(() => {});
          }
        }
      } catch {}
    });

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
            label: '🔥 Open Link in Ephemeral Tab',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('open-link-ephemeral', { url: params.linkURL });
              }
            }
          },
          {
            label: '📦 Open Link in Container',
            submenu: containerManager.getAll().map(c => ({
              label: `${c.icon} ${c.name}`,
              click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('open-link-container', { url: params.linkURL, containerId: c.id });
                }
              }
            }))
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

        menuTemplate.push({
          label: '📝 Append to Companion Rail',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('companion-append-selection', { text: params.selectionText });
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
            label: '📦 Reopen in Container',
            submenu: containerManager.getAll().map(c => ({
              label: `${c.icon} ${c.name}`,
              click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('tab-reopen-container', { containerId: c.id });
                }
              }
            }))
          },
          {
            label: '🔥 Reopen in Ephemeral Session',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('tab-reopen-ephemeral');
              }
            }
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
          },
          {
            label: '📦 Save Page to Offline Archive',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('archive-active-page');
              }
            }
          },
          {
            label: '⚡ Zap Element on Page...',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('trigger-element-zapper');
              }
            }
          },
          { type: 'separator' },
          {
            label: '✍️ Toggle Author Desk Companion Rail',
            accelerator: 'CmdOrCtrl+Shift+D',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('companion-toggle-rail');
              }
            }
          },
          {
            label: '🎙️ Grab Audio from Page (Audio Studio)...',
            accelerator: 'CmdOrCtrl+Shift+G',
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('audio-grabber-open');
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
  try {
    await migrationManager.runAuditAndMigrate();
  } catch (err) {
    console.warn('[Recon Migration] Startup audit warning:', err.message);
  }
  applyDohConfig(dohEnabled);
  await initAppLink();
  createWindow();
});

app.on('will-quit', async () => {
  if (historyClearOnQuit) {
    try {
      historyManager.clear('all');
    } catch {}
  }
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
