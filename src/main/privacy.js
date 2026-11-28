'use strict';

/**
 * The three switchable protections: tracking-parameter stripping, WebRTC IP leak
 * protection and anti-fingerprinting noise. One rule for all of them: a protection
 * acts on a page only when Shields are on, the site is not paused, and its own
 * switch is on.
 * Has no Electron import, so it can be tested with plain objects.
 */

const crypto = require('crypto');
const { isPaused, hostOf } = require('./shields-guard');

const OPTION_NAMES = ['fingerprint', 'webrtc', 'params'];
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', '_ga', 'msclkid', 'mc_eid']);
const isTrackingParam = (name) => name.startsWith('utm_') || TRACKING_PARAMS.has(name);

/**
 * The address without tracking parameters, or null when there is nothing to
 * remove. The rest of the query is kept exactly as written: re-encoding it can
 * break signed links and search queries.
 */
function stripTrackingParams(address) {
  let url;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || !url.search) return null;

  const parts = url.search.slice(1).split('&');
  const kept = parts.filter((part) => {
    const raw = part.split('=')[0];
    let name = raw;
    try { name = decodeURIComponent(raw); } catch {}
    return !isTrackingParam(name.toLowerCase());
  });
  if (kept.length === parts.length) return null;

  const hash = url.hash;
  url.hash = '';
  url.search = '';
  return url.href + (kept.length ? `?${kept.join('&')}` : '') + hash;
}

const REMEMBERED_REQUESTS = 200;

function createPrivacy({ isShieldsEnabled, pausedHosts, secret = crypto.randomBytes(32) }) {
  const options = { fingerprint: true, webrtc: true, params: true };
  const stripped = new Map(); // request id -> addresses already cleaned in its redirect chain

  function setOptions(next = {}) {
    for (const name of OPTION_NAMES) {
      if (typeof next[name] === 'boolean') options[name] = next[name];
    }
    return { ...options };
  }

  /** Whether protection `name` applies to a page, given the addresses involved. */
  function isActive(name, ...addresses) {
    return Boolean(options[name]) && isShieldsEnabled() && !isPaused(pausedHosts, addresses.map(hostOf));
  }

  /** Where to send a page the user is opening instead, or null to leave it. */
  function cleanNavigation(details) {
    if (details.method !== 'GET' || !isActive('params', details.url)) return null;
    const clean = stripTrackingParams(details.url);
    if (!clean) return null;
    // A server that puts the parameter back would loop. The redirects of one load
    // share a request id, so the same address twice means let it through.
    const seen = stripped.get(details.id) || new Set();
    if (seen.has(details.url)) return null;
    seen.add(details.url);
    stripped.set(details.id, seen);
    if (stripped.size > REMEMBERED_REQUESTS) stripped.delete(stripped.keys().next().value);
    return clean;
  }

  /** `disable_non_proxied_udp` also stops WebRTC going around a container's proxy. */
  function webrtcPolicy(pageAddress) {
    return isActive('webrtc', pageAddress) ? 'disable_non_proxied_udp' : 'default';
  }

  /** What the preload should do in a frame. `topAddress` is the page in the tab. */
  function fingerprintConfig(frameAddress, topAddress) {
    const page = /^https?:/.test(topAddress || '') ? topAddress : frameAddress;
    if (!/^https?:/.test(page || '') || !isActive('fingerprint', page, frameAddress)) {
      return { fingerprint: false };
    }
    // The same for one site during one run, different after a restart
    const seed = crypto.createHmac('sha256', secret).update(hostOf(page)).digest().readUInt32LE(0);
    return { fingerprint: true, seed };
  }

  return { options, setOptions, isActive, cleanNavigation, webrtcPolicy, fingerprintConfig };
}

module.exports = { createPrivacy, stripTrackingParams };
