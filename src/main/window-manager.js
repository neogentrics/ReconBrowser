'use strict';

/**
 * Keeps track of the browser windows inside the one running Recon Browser process.
 * Has no Electron import, so it can be tested with plain objects.
 */

const CASCADE_STEP = 32;

class WindowManager {
  constructor() {
    this.windows = []; // most recently focused last
  }

  add(win) {
    this.windows.push(win);
    win.on('focus', () => this.markFocused(win));
    win.on('closed', () => this.remove(win));
    return win;
  }

  markFocused(win) {
    if (!this.windows.includes(win)) return;
    this.remove(win);
    this.windows.push(win);
  }

  remove(win) {
    this.windows = this.windows.filter(w => w !== win);
  }

  all() {
    return this.windows.filter(w => !w.isDestroyed());
  }

  get count() {
    return this.all().length;
  }

  /** The browser window used most recently, or null when none is open. */
  active() {
    const open = this.all();
    return open[open.length - 1] || null;
  }

  /** The browser window showing these web contents (its own page or one of its tabs), or null. */
  windowFor(contents) {
    if (!contents) return null;
    const host = contents.hostWebContents || contents;
    return this.all().find(w => w.webContents.id === host.id) || null;
  }

  /**
   * Sends to `target` when it is one of our open windows. Anything else (nothing,
   * a closed window, a web page popup) falls back to the most recently used window.
   */
  send(target, channel, ...args) {
    const win = this.all().includes(target) ? target : this.active();
    if (!win) return false;
    win.webContents.send(channel, ...args);
    return true;
  }

  /** Sends to every open window, optionally leaving one out. */
  broadcast(channel, payload, { except = null } = {}) {
    for (const win of this.all()) {
      if (win !== except) win.webContents.send(channel, payload);
    }
  }
}

// One step down the screen, wrapping to the edge when the window would not fit
function cascadeAxis(pos, size, areaPos, areaSize, step) {
  const next = pos + step;
  return next >= areaPos && next + size <= areaPos + areaSize ? next : areaPos;
}

/**
 * Bounds for a new window, offset from an existing one so it does not land on top
 * of it and look like it replaced it. `taken` lists the bounds of open windows,
 * whose positions are skipped: which one is `from` depends on focus events, which
 * can arrive late when several windows open at once.
 */
function cascadeBounds(from, workArea, { taken = [], step = CASCADE_STEP, minWidth = 800, minHeight = 600 } = {}) {
  const width = Math.max(minWidth, Math.min(from.width, workArea.width - step));
  const height = Math.max(minHeight, Math.min(from.height, workArea.height - step));
  const advance = (b) => ({
    x: cascadeAxis(b.x, width, workArea.x, workArea.width, step),
    y: cascadeAxis(b.y, height, workArea.y, workArea.height, step),
    width,
    height
  });
  let next = advance(from);
  for (let i = 0; i < taken.length && taken.some(t => t.x === next.x && t.y === next.y); i++) {
    next = advance(next);
  }
  return next;
}

module.exports = { WindowManager, cascadeBounds, CASCADE_STEP };
