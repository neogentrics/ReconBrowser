'use strict';

/**
 * Recon Shields request blocking. Every tab has its own session partition and
 * Electron's webRequest handlers belong to one session, so `attach` is called for
 * each session as it is created.
 * Has no Electron import, so it can be tested with plain objects.
 */

const WEB_PROTOCOLS = new Set(['http:', 'https:', 'ws:', 'wss:']);
const MEDIA_FILE = /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)(\?.*)?$/i;

/** Reads `||domain^` and `||domain/path` rules. A path rule blocks only that path. */
function parseFilterList(text) {
  const rules = [];
  for (const line of String(text).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || /^[!#[@]/.test(trimmed)) continue;
    const body = trimmed.replace(/^\|\|/, '').replace(/\$.*$/, '').replace(/\^.*$/, '');
    const slash = body.indexOf('/');
    const domain = (slash === -1 ? body : body.slice(0, slash)).trim().toLowerCase();
    const path = slash === -1 ? '' : body.slice(slash).replace(/\*.*$/, '').trim();
    if (domain) rules.push({ domain, path: path === '/' ? '' : path });
  }
  return rules;
}

const isWithin = (host, domain) => host === domain || host.endsWith('.' + domain);

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** True when the request, its referrer or the tab's page is on a site the user paused. */
function isPaused(pausedHosts, hosts) {
  if (!pausedHosts || pausedHosts.size === 0) return false;
  const strip = (h) => h.replace(/^www\./, '');
  for (const host of hosts) {
    if (!host) continue;
    for (const paused of pausedHosts) {
      const a = strip(host);
      const b = strip(paused.toLowerCase().trim());
      if (a === b || a.endsWith('.' + b) || b.endsWith('.' + a)) return true;
    }
  }
  return false;
}

/**
 * @param {object} options
 * @param {{domain: string, path: string}[]} options.rules  from parseFilterList
 * @param {(host: string) => boolean} [options.isDomainBlocked]  the extra Shields 2.0 list
 * @param {() => boolean} options.isEnabled  the global switch
 * @param {Set<string>} options.pausedHosts  sites the user paused
 * @param {(webContentsId: number) => string} [options.pageUrlOf]  the page a tab is showing
 */
function createShieldsGuard({
  rules,
  isDomainBlocked = () => false,
  isEnabled,
  pausedHosts,
  pageUrlOf = () => '',
  log = () => {},
  onBlocked = () => {},
  onMedia = () => {}
}) {
  const attached = new WeakSet();

  /** Why a request should be blocked, or null to let it through. */
  function blockReason(url, pageHost) {
    const host = url.hostname.toLowerCase();
    const rule = rules.find(r => isWithin(host, r.domain) && url.pathname.startsWith(r.path));
    if (rule) {
      // A site you are on may load its own files
      return isWithin(pageHost, rule.domain) ? null : 'Suffix Tracker Filter';
    }
    return isDomainBlocked(host) && !isWithin(pageHost, host) ? 'Shields 2.0 Subscription' : null;
  }

  function decide(details) {
    let url;
    try {
      url = new URL(details.url);
    } catch {
      return {};
    }
    if (!WEB_PROTOCOLS.has(url.protocol)) return {};

    const entry = {
      url: details.url,
      host: url.hostname.toLowerCase(),
      method: details.method,
      resourceType: details.resourceType
    };
    const allow = (reason) => {
      log(details.webContentsId, { ...entry, blocked: false, reason });
      if (details.resourceType === 'media' || MEDIA_FILE.test(details.url)) onMedia(details);
      return {};
    };

    if (!isEnabled()) return allow('Shields Global Disabled');

    // A page the user opens is never cancelled, only what pages load
    if (details.resourceType === 'mainFrame') return allow('Allowed');

    const pageHost = hostOf(details.webContentsId ? pageUrlOf(details.webContentsId) : '') || hostOf(details.referrer);
    if (isPaused(pausedHosts, [entry.host, hostOf(details.referrer), pageHost])) return allow('Site Shield Paused');

    const reason = blockReason(url, pageHost);
    if (!reason) return allow('Allowed');

    log(details.webContentsId, { ...entry, blocked: true, reason });
    onBlocked(details, entry.host);
    return { cancel: true };
  }

  function handle(details, callback) {
    let result = {};
    try {
      result = decide(details);
    } catch (err) {
      console.warn('[Recon Shields] Request check failed:', err.message);
    }
    callback({ cancel: false, ...result });
  }

  /** Safe to call more than once: a session keeps only one onBeforeRequest handler. */
  function attach(ses) {
    if (!ses || attached.has(ses)) return false;
    attached.add(ses);
    ses.webRequest.onBeforeRequest(handle);
    return true;
  }

  return { attach, handle };
}

module.exports = { createShieldsGuard, parseFilterList };
