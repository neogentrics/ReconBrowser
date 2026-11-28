import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { WindowManager, cascadeBounds } = require('../src/main/window-manager.js');
const main = fs.readFileSync(path.join(root, 'src/main/index.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');

let nextId = 1;
function fakeWindow() {
  const handlers = {};
  const win = {
    sent: [],
    destroyed: false,
    isDestroyed: () => win.destroyed,
    on: (name, fn) => { handlers[name] = fn; },
    emit: (name) => handlers[name]?.(),
    close: () => { win.destroyed = true; handlers.closed?.(); }
  };
  win.webContents = { id: nextId++, send: (...args) => win.sent.push(args) };
  return win;
}

function twoWindows() {
  const manager = new WindowManager();
  const first = manager.add(fakeWindow());
  const second = manager.add(fakeWindow());
  return { manager, first, second };
}

describe('Issue #18: window manager', () => {
  it('treats the newest, then the most recently focused, window as active', () => {
    const { manager, first, second } = twoWindows();
    assert.equal(manager.active(), second);
    first.emit('focus');
    assert.equal(manager.active(), first);
    assert.equal(manager.count, 2);
  });

  it('closing either window leaves the other one working', () => {
    for (const closing of ['first', 'second']) {
      const windows = twoWindows();
      const { manager } = windows;
      const survivor = windows[closing === 'first' ? 'second' : 'first'];
      windows[closing].close();
      assert.equal(manager.count, 1);
      assert.equal(manager.active(), survivor);
      assert.equal(manager.send(null, 'menu-new-tab'), true);
      assert.deepEqual(survivor.sent, [['menu-new-tab']]);
    }
  });

  it('sends to the requested window only, not to the active one', () => {
    const { manager, first, second } = twoWindows();
    manager.send(first, 'menu-set-theme', 'sepia');
    assert.deepEqual(first.sent, [['menu-set-theme', 'sepia']]);
    assert.deepEqual(second.sent, []);
  });

  it('falls back to the active window for a popup or closed target', () => {
    const { manager, first, second } = twoWindows();
    manager.send(fakeWindow(), 'a');
    first.close();
    manager.send(first, 'b');
    assert.deepEqual(second.sent, [['a'], ['b']]);
    second.close();
    assert.equal(manager.send(null, 'c'), false);
    assert.equal(manager.active(), null);
  });

  it('finds the window for its own page and for a tab inside it', () => {
    const { manager, first, second } = twoWindows();
    assert.equal(manager.windowFor(first.webContents), first);
    assert.equal(manager.windowFor({ id: 999, hostWebContents: second.webContents }), second);
    assert.equal(manager.windowFor({ id: 999 }), null);
    assert.equal(manager.windowFor(null), null);
  });

  it('broadcasts to every window except the one left out', () => {
    const { manager, first, second } = twoWindows();
    manager.broadcast('workspaces-changed', { deletedId: 'x' }, { except: first });
    assert.deepEqual(first.sent, []);
    assert.deepEqual(second.sent, [['workspaces-changed', { deletedId: 'x' }]]);
  });
});

describe('Issue #18: new window placement', () => {
  const area = { x: 0, y: 0, width: 1920, height: 1040 };
  const inside = (b, a) => b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width && b.y + b.height <= a.y + a.height;

  it('offsets from the source window instead of covering it exactly', () => {
    const next = cascadeBounds({ x: 320, y: 100, width: 1280, height: 840 }, area);
    assert.deepEqual(next, { x: 352, y: 132, width: 1280, height: 840 });
  });

  it('stays on screen and still differs when there is no room down and right', () => {
    const from = { x: 640, y: 200, width: 1280, height: 840 };
    const next = cascadeBounds(from, area);
    assert.ok(inside(next, area));
    assert.ok(next.x !== from.x && next.y !== from.y);
  });

  it('shrinks to stay visibly offset from a window that fills the screen', () => {
    const next = cascadeBounds(area, area);
    assert.ok(inside(next, area));
    assert.ok(next.width < area.width && next.height < area.height);
  });

  it('skips positions other windows already hold, even when offsetting from an older one', () => {
    const first = { x: 320, y: 100, width: 1280, height: 840 };
    const second = cascadeBounds(first, area, { taken: [first] });
    const third = cascadeBounds(first, area, { taken: [first, second] });
    assert.deepEqual([third.x, third.y], [384, 164]);
  });

  it('keeps every window of a long run on its own spot', () => {
    const taken = [{ x: 320, y: 100, width: 1280, height: 840 }];
    for (let i = 0; i < 8; i++) taken.push(cascadeBounds(taken[0], area, { taken }));
    assert.equal(new Set(taken.map(b => `${b.x},${b.y}`)).size, taken.length);
    assert.ok(taken.every(b => inside(b, area)));
  });

  it('respects a second monitor with a negative origin', () => {
    const left = { x: -1920, y: 0, width: 1920, height: 1040 };
    assert.ok(inside(cascadeBounds({ x: -1700, y: 50, width: 1280, height: 840 }, left), left));
  });
});

describe('Issue #18: wiring', () => {
  it('takes the single-instance lock before anything can touch the profile', () => {
    const lock = main.indexOf('app.requestSingleInstanceLock()');
    assert.ok(lock > -1);
    assert.ok(lock < main.indexOf("require('./"), 'lock must come before every local module');
    assert.match(main.slice(lock, lock + 100), /app\.quit\(\);\s*return;/);
  });

  it('opens another window on a second launch and from the File menu', () => {
    assert.match(main, /app\.on\('second-instance',[\s\S]{0,80}openWindow\(\)/);
    assert.match(main, /label: 'New Window',\s*accelerator: 'CmdOrCtrl\+N',\s*click: \(\) => openWindow\(\)/);
  });

  it('no longer assumes there is a single main window', () => {
    assert.doesNotMatch(main, /\bmainWindow\b/);
  });

  it('sets up the shared session, menu and updater once, not per window', () => {
    const create = main.slice(main.indexOf('function createWindow()'), main.indexOf('function openWindow()'));
    assert.doesNotMatch(create, /webRequest|new Updater|buildMenu/);
  });

  it('never writes shared storage while reacting to another window', () => {
    const block = renderer.slice(renderer.indexOf('const showOnly'), renderer.indexOf("window.addEventListener('storage'"));
    assert.ok(block.length > 0);
    assert.doesNotMatch(block, /setItem/);
    for (const fn of ['applyThemeAndAspect', 'setEngine', 'setStartpageAppsVisibility', 'setBookmarksBarVisibility']) {
      assert.match(block, new RegExp(`${fn}\\([^\\n]*showOnly\\)`));
    }
  });

  it('keeps shared settings in step and the active workspace per window', () => {
    assert.match(renderer, /addEventListener\('storage'/);
    assert.match(renderer, /ipcRenderer\.on\('workspaces-changed'/);
    assert.doesNotMatch(renderer, /const currentWsId = localStorage/);
    assert.ok(renderer.indexOf('let currentActiveWorkspaceId') < renderer.indexOf('function createTab('));
  });
});
