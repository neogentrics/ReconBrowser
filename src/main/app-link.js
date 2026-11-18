'use strict';

/**
 * App Link (v1.0): Recon Towers apps on one computer find each other,
 * agree to work together and send each other documents.
 * 
 * Spec: docs/app-link.md in rt-markdown-reader
 * App ID: recon-browser
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const os = require('node:os');

const PROTOCOL = 1;
const APP_ID = 'recon-browser';
const APP_NAME = 'Recon Browser';
const ACCEPTS = ['markdown', 'text'];
const MAX_LINE = 8 * 1024 * 1024; // 8 MB maximum line
const ASK_MS = 120_000;            // 2 minutes for user approval in target app
const CALL_MS = 5_000;
const SEND_MS = 15_000;
const DECLINED_MS = 30_000;        // cooldown after decline

const validId = (id) => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id);

/**
 * A refusal with a reason other apps can act on.
 */
class LinkError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Shared directory where running Recon Towers apps leave presence files.
 */
function sharedFolder({ env = process.env, platform = process.platform, home = os.homedir() } = {}) {
  if (env.NMR_LINK_DIR) return env.NMR_LINK_DIR;
  const base = platform === 'win32'
    ? env.APPDATA || path.join(home, 'AppData', 'Roaming')
    : platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support')
      : env.XDG_CONFIG_HOME || path.join(home, '.config');
  return path.join(base, 'Recon Towers', 'app-link');
}

/**
 * Named pipe or Unix socket endpoint.
 */
function endpointFor(dir, platform = process.platform) {
  if (platform !== 'win32') return path.join(dir, 'app-link.sock');
  return `\\\\.\\pipe\\rt-app-link-${crypto.createHash('sha256').update(dir.toLowerCase()).digest('hex').slice(0, 16)}`;
}

/**
 * Validates endpoint string: strictly pipe or absolute unix socket path.
 */
function validEndpoint(endpoint, platform = process.platform) {
  if (typeof endpoint !== 'string' || !endpoint || endpoint.length > 1024) return false;
  if (platform === 'win32') return /^\\\\\.\\pipe\\[^\\/]+$/.test(endpoint);
  return path.isAbsolute(endpoint);
}

/**
 * Cleans string of control or direction-reversing characters.
 */
function cleanName(name, fallback = '') {
  if (typeof name !== 'string') return fallback;
  return name.replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, '').trim().slice(0, 80) || fallback;
}

/**
 * Ensures safe document filename without directory separators.
 */
function documentName(name) {
  const base = cleanName(typeof name === 'string' ? name.split(/[\\/]/).pop() : '', 'Sent document');
  return /\.[a-z0-9]{1,8}$/i.test(base) ? base : `${base}.md`;
}

/**
 * Constant-time key comparison.
 */
function sameKey(a, b) {
  if (!a || !b) return false;
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

/**
 * One request to another app over its pipe/socket.
 */
function call(endpoint, method, params, timeout = CALL_MS) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(endpoint);
    let buf = '';
    const stop = (fn, value) => {
      clearTimeout(timer);
      sock.destroy();
      fn(value);
    };
    const timer = setTimeout(() => stop(reject, new LinkError('timed_out', 'That app didn’t answer.')), timeout);
    sock.setEncoding('utf8');
    sock.on('error', () => stop(reject, new LinkError('not_running', 'That app isn’t running.')));
    sock.on('connect', () => sock.write(`${JSON.stringify({ id: 1, method, params })}\n`));
    sock.on('data', (chunk) => {
      buf += chunk;
      if (buf.length > MAX_LINE) {
        stop(reject, new LinkError('too_big', 'That app sent too much.'));
        return;
      }
      const at = buf.indexOf('\n');
      if (at < 0) return;
      let reply;
      try {
        reply = JSON.parse(buf.slice(0, at));
      } catch {
        stop(reject, new LinkError('failed', 'That app sent something unreadable.'));
        return;
      }
      if (reply?.error) {
        stop(reject, new LinkError(String(reply.error.code || 'failed'), cleanName(reply.error.message, 'That app couldn’t do it.')));
      } else {
        stop(resolve, reply?.result);
      }
    });
  });
}

/**
 * Translates App Link error codes into plain words for the user.
 */
function toPlainWords(err, targetName = 'The destination app') {
  if (!err) return '';
  const code = err.code || 'failed';
  switch (code) {
    case 'not_linked':
      return `${targetName} is not linked yet. Please approve the link in that app first.`;
    case 'busy':
      return `${targetName} is busy (20 clips are already waiting in its inbox). Please review or clear them in ${targetName} first.`;
    case 'not_allowed':
      return `${targetName} refused the clip (for example, the active project is password-locked).`;
    case 'declined':
      return `The link request was declined in ${targetName}.`;
    case 'timed_out':
      return `${targetName} did not answer in time.`;
    case 'not_running':
      return `${targetName} is not currently running.`;
    case 'too_big':
      return 'The clip is too large to send over App Link (maximum 8 MB).';
    case 'no_safe_store':
      return 'Encrypted storage is unavailable on this computer to safely store the key.';
    default:
      return err.message || `${targetName} could not accept the document.`;
  }
}

class AppLink {
  /**
   * @param {object} o
   * @param {string} o.folder   the shared folder (%APPDATA%/Recon Towers/app-link)
   * @param {string} o.dataDir  this app's own folder (app.getPath('userData'))
   * @param {string} o.version  browser version (e.g. 1.3.0)
   * @param {() => object} o.load   load encrypted links
   * @param {(links: object) => void} o.save save encrypted links
   * @param {(asker: { id, name }) => Promise<boolean>} o.ask ask person to approve pairing
   * @param {(doc: { from, name, text, path, kind }) => Promise<void>} o.open take received document
   */
  constructor({ folder, dataDir, version, load, save, ask, open, platform = process.platform }) {
    Object.assign(this, { folder, dataDir, version, load, save, ask, open, platform });
    this.server = null;
    this.asking = false;
    this.declined = new Map();
    this.file = path.join(folder, `${APP_ID}.json`);
    this.id = APP_ID;
    this.name = APP_NAME;
  }

  get running() {
    return !!this.server;
  }

  async start() {
    if (this.server) return;
    const endpoint = endpointFor(this.dataDir, this.platform);
    if (this.platform !== 'win32') fs.rmSync(endpoint, { force: true });

    const server = net.createServer((sock) => this.serve(sock));
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(endpoint, resolve);
    });
    server.removeAllListeners('error');
    server.on('error', () => {});

    if (this.platform !== 'win32') {
      try { fs.chmodSync(endpoint, 0o600); } catch {}
    }

    // Write presence file to shared folder
    fs.mkdirSync(this.folder, { recursive: true });
    fs.writeFileSync(
      this.file,
      JSON.stringify({ protocol: PROTOCOL, id: APP_ID, name: APP_NAME, version: this.version, endpoint }, null, 2)
    );
    this.server = server;
  }

  async stop() {
    const server = this.server;
    this.server = null;
    try { fs.rmSync(this.file, { force: true }); } catch {}
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  serve(sock) {
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('error', () => {});
    sock.on('data', (chunk) => {
      buf += chunk;
      if (buf.length > MAX_LINE) { sock.destroy(); return; }
      for (let at = buf.indexOf('\n'); at >= 0; at = buf.indexOf('\n')) {
        const line = buf.slice(0, at);
        buf = buf.slice(at + 1);
        this.answer(sock, line);
      }
    });
  }

  async answer(sock, line) {
    let req;
    try { req = JSON.parse(line); } catch { sock.destroy(); return; }
    let reply;
    try {
      reply = { id: req?.id, result: await this.handle(req?.method, req?.params || {}) };
    } catch (err) {
      reply = err instanceof LinkError
        ? { id: req?.id, error: { code: err.code, message: err.message } }
        : { id: req?.id, error: { code: 'failed', message: 'Recon Browser couldn’t do that.' } };
    }
    if (!sock.destroyed) sock.write(`${JSON.stringify(reply)}\n`);
  }

  handle(method, params) {
    if (method === 'hello') return { protocol: PROTOCOL, app: APP_ID, name: APP_NAME, version: this.version, accepts: ACCEPTS };
    if (method === 'pair') return this.pairRequest(params);
    if (method === 'open_document') return this.openRequest(params);
    if (method === 'unlink') return this.unlinkRequest(params);
    throw new LinkError('unknown_method', 'Recon Browser doesn’t have that method.');
  }

  caller({ app: id, key }) {
    const link = validId(id) && Object.hasOwn(this.load(), id) ? this.load()[id] : null;
    if (!link || !sameKey(key, link.key)) throw new LinkError('not_linked', 'That app isn’t linked. Link it first.');
    return { id, ...link };
  }

  async pairRequest({ app: id, name }) {
    if (!validId(id) || id === APP_ID) throw new LinkError('bad_request', 'Give the app’s id.');
    const shown = cleanName(name);
    if (!shown) throw new LinkError('bad_request', 'Give the app’s name.');
    if (this.asking) throw new LinkError('busy', 'Recon Browser is already asking something.');
    if (Date.now() - (this.declined.get(id) || -Infinity) < DECLINED_MS) throw new LinkError('declined', 'The link was declined.');
    this.asking = true;
    let timer;
    try {
      const answer = await Promise.race([
        this.ask ? this.ask({ id, name: shown }) : Promise.resolve(false),
        new Promise((resolve) => { timer = setTimeout(() => resolve('timed_out'), ASK_MS); }),
      ]);
      if (answer === 'timed_out') throw new LinkError('timed_out', 'Nobody answered.');
      if (answer !== true) {
        this.declined.set(id, Date.now());
        throw new LinkError('declined', 'The link was declined.');
      }
    } finally {
      clearTimeout(timer);
      this.asking = false;
    }
    const key = crypto.randomBytes(32).toString('hex');
    this.save({ ...this.load(), [id]: { name: shown, key } });
    return { key, app: APP_ID, name: APP_NAME };
  }

  async openRequest(params) {
    const from = this.caller(params);
    const { name, text, path: file, kind } = params;
    if (this.open) {
      if (typeof file === 'string' && file) await this.open({ from: from.name, path: file, kind });
      else if (typeof text === 'string') await this.open({ from: from.name, name: documentName(name), text, kind });
      else throw new LinkError('bad_request', 'Give the document’s text or its path.');
    }
    return { opened: true };
  }

  unlinkRequest(params) {
    const { id } = this.caller(params);
    const links = this.load();
    delete links[id];
    this.save(links);
    return { unlinked: true };
  }

  // ---------------------------------------------------------------- Reaching other apps

  /**
   * Discovers all running App Link apps by inspecting presence files in sharedFolder.
   */
  async found() {
    let names = [];
    try { names = fs.readdirSync(this.folder); } catch { return []; }
    const seen = await Promise.all(names.filter((n) => n.endsWith('.json') && n !== `${APP_ID}.json`).map(async (n) => {
      try {
        const info = JSON.parse(fs.readFileSync(path.join(this.folder, n), 'utf8'));
        if (info?.protocol !== PROTOCOL || !validId(info.id) || `${info.id}.json` !== n || !validEndpoint(info.endpoint, this.platform)) return null;
        await call(info.endpoint, 'hello', {}, 1500);
        return { id: info.id, name: cleanName(info.name, info.id), endpoint: info.endpoint, version: info.version };
      } catch { return null; }
    }));
    return seen.filter(Boolean);
  }

  /**
   * Returns list of running apps and known linked apps.
   */
  async list() {
    const running = await this.found();
    const links = this.load();
    const apps = running.map((a) => ({
      id: a.id,
      name: links[a.id]?.name || a.name,
      version: a.version || '',
      linked: Object.hasOwn(links, a.id),
      running: true
    }));
    for (const [id, link] of Object.entries(links)) {
      if (!apps.some((a) => a.id === id)) {
        apps.push({ id, name: link.name, version: '', linked: true, running: false });
      }
    }
    return apps.sort((a, b) => a.name.localeCompare(b.name));
  }

  async reach(id) {
    const app = (await this.found()).find((a) => a.id === id);
    if (!app) throw new LinkError('not_running', 'That app isn’t running.');
    return app;
  }

  /**
   * Asks another app to link once. The person answers in the other app.
   */
  async pairWith(id) {
    const app = await this.reach(id);
    const res = await call(app.endpoint, 'pair', { app: APP_ID, name: APP_NAME }, ASK_MS + 5000);
    if (typeof res?.key !== 'string' || res.key.length < 32) {
      throw new LinkError('failed', 'That app didn’t finish linking.');
    }
    this.save({ ...this.load(), [id]: { name: app.name, key: res.key } });
    return { name: app.name, id };
  }

  /**
   * Sends research clip to destination app via open_document with kind: "research".
   * Never sends attachments or pictures.
   */
  async sendClip(id, { name, text }) {
    const links = this.load();
    const link = links[id];
    if (!link) throw new LinkError('not_linked', `${cleanName(id)} isn’t linked.`);
    const app = await this.reach(id);
    const res = await call(app.endpoint, 'open_document', {
      app: APP_ID,
      key: link.key,
      name: documentName(name),
      text,
      kind: 'research'
    }, SEND_MS);
    return { name: link.name, result: res };
  }

  /**
   * Unlinks an app locally and notifies it over App Link if running.
   */
  async unlink(id) {
    const links = this.load();
    const link = links[id];
    if (!link) return;
    delete links[id];
    this.save(links);
    try {
      const app = await this.reach(id);
      await call(app.endpoint, 'unlink', { app: APP_ID, key: link.key }, 3000);
    } catch {}
  }
}

module.exports = {
  AppLink,
  LinkError,
  PROTOCOL,
  APP_ID,
  APP_NAME,
  ACCEPTS,
  sharedFolder,
  endpointFor,
  validEndpoint,
  validId,
  cleanName,
  documentName,
  sameKey,
  call,
  toPlainWords
};
