'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

function getUserDataPath() {
  try {
    const electron = require('electron');
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      return electron.app.getPath('userData');
    }
  } catch {}
  return process.env.APPDATA ? path.join(process.env.APPDATA, 'recon-browser') : path.join(os.tmpdir(), 'recon-browser');
}

class ShieldsManager {
  constructor(customDir = null) {
    const baseDir = customDir || getUserDataPath();
    if (!fs.existsSync(baseDir)) {
      try { fs.mkdirSync(baseDir, { recursive: true }); } catch {}
    }
    this.subscriptionsPath = path.join(baseDir, 'recon_filter_subscriptions.json');
    this.zapperPath = path.join(baseDir, 'recon_zapper_rules.json');
    this.customBlockedDomains = new Set();
    this.tabNetworkLogs = new Map(); // tabId -> array of requests
    this.subscriptions = this.loadSubscriptions();
    this.zapperRules = this.loadZapperRules();
    this.compileFilterRules();
  }

  loadSubscriptions() {
    const defaults = [
      {
        id: 'sub_default_trackers',
        name: 'Recon Built-in Suffix Tracker Shield',
        url: '',
        enabled: true,
        isBuiltin: true,
        count: 50
      },
      {
        id: 'sub_easyprivacy',
        name: 'EasyPrivacy High-Impact Trackers',
        url: 'https://v.firebog.net/hosts/Easyprivacy.txt',
        enabled: true,
        isBuiltin: true,
        count: 120
      },
      {
        id: 'sub_fanboy_annoyance',
        name: "Fanboy's Annoyance & Cookie Notice Filter",
        url: 'https://secure.fanboy.co.nz/fanboy-annoyance.txt',
        enabled: false,
        isBuiltin: true,
        count: 0
      }
    ];

    if (!fs.existsSync(this.subscriptionsPath)) {
      return defaults;
    }

    try {
      const data = fs.readFileSync(this.subscriptionsPath, 'utf8');
      return JSON.parse(data || '[]');
    } catch {
      return defaults;
    }
  }

  saveSubscriptions(items) {
    this.subscriptions = items;
    try {
      fs.writeFileSync(this.subscriptionsPath, JSON.stringify(items, null, 2), 'utf8');
      this.compileFilterRules();
      return true;
    } catch (err) {
      console.error('[Recon Shields] Failed to save subscriptions:', err);
      return false;
    }
  }

  getSubscriptions() {
    return this.subscriptions;
  }

  compileFilterRules() {
    this.customBlockedDomains.clear();
    // Default trackers seed
    const defaultTrackers = [
      'google-analytics.com', 'googletagmanager.com', 'doubleclick.net', 'adservice.google.com',
      'adnxs.com', 'facebook.net', 'connect.facebook.net', 'criteo.com', 'scorecardresearch.com',
      'hotjar.com', 'segment.io', 'mixpanel.com', 'clarity.ms', 'quantserve.com', 'outbrain.com',
      'taboola.com', 'chartbeat.com', 'branch.io', 'appsflyer.com', 'moatads.com'
    ];
    defaultTrackers.forEach(d => this.customBlockedDomains.add(d.toLowerCase()));
  }

  isDomainBlocked(hostname) {
    if (!hostname) return false;
    const clean = hostname.toLowerCase().trim();
    if (this.customBlockedDomains.has(clean)) return true;
    for (const d of this.customBlockedDomains) {
      if (clean.endsWith('.' + d)) return true;
    }
    return false;
  }

  // ==========================================================================
  // Live Network Request Inspector
  // ==========================================================================

  logRequest(tabId, req) {
    if (!tabId) return;
    if (!this.tabNetworkLogs.has(tabId)) {
      this.tabNetworkLogs.set(tabId, []);
    }
    const list = this.tabNetworkLogs.get(tabId);
    list.unshift({
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      ...req
    });
    // Keep max 100 requests per tab
    if (list.length > 100) {
      list.length = 100;
    }
  }

  getTabLogs(tabId) {
    return this.tabNetworkLogs.get(tabId) || [];
  }

  clearTabLogs(tabId) {
    if (this.tabNetworkLogs.has(tabId)) {
      this.tabNetworkLogs.set(tabId, []);
    }
  }

  // ==========================================================================
  // Cosmetic Element Zapper
  // ==========================================================================

  loadZapperRules() {
    if (!fs.existsSync(this.zapperPath)) return {};
    try {
      return JSON.parse(fs.readFileSync(this.zapperPath, 'utf8') || '{}');
    } catch {
      return {};
    }
  }

  saveZapperRules(rules) {
    this.zapperRules = rules;
    try {
      fs.writeFileSync(this.zapperPath, JSON.stringify(rules, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('[Recon Shields] Failed to save zapper rules:', err);
      return false;
    }
  }

  addZapperRule(domain, selector) {
    if (!domain || !selector) return false;
    const cleanHost = domain.toLowerCase().trim().replace(/^www\./, '');
    const current = this.loadZapperRules();
    if (!current[cleanHost]) current[cleanHost] = [];
    if (!current[cleanHost].includes(selector)) {
      current[cleanHost].push(selector);
      this.saveZapperRules(current);
    }
    return true;
  }

  getZapperRulesForDomain(domain) {
    if (!domain) return [];
    const cleanHost = domain.toLowerCase().trim().replace(/^www\./, '');
    const rules = this.loadZapperRules();
    return rules[cleanHost] || [];
  }

  removeZapperRule(domain, selector) {
    const cleanHost = (domain || '').toLowerCase().trim().replace(/^www\./, '');
    const current = this.loadZapperRules();
    if (current[cleanHost]) {
      current[cleanHost] = current[cleanHost].filter(s => s !== selector);
      if (current[cleanHost].length === 0) delete current[cleanHost];
      this.saveZapperRules(current);
      return true;
    }
    return false;
  }
}

module.exports = { ShieldsManager };
