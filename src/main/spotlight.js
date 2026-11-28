/**
 * Recon Browser — Unified Spotlight Search & Command Manager (v1.10.0)
 * Fast, zero-telemetry fuzzy search across open tabs, bookmarks,
 * browsing history, offline archives, and system commands.
 */

class SpotlightManager {
  constructor(options = {}) {
    this.historyManager = options.historyManager || null;
    this.vault = options.vault || null;
    this.archiveManager = options.archiveManager || null;
  }

  setManagers({ historyManager, archiveManager }) {
    if (historyManager) this.historyManager = historyManager;
    if (archiveManager) this.archiveManager = archiveManager;
  }

  /**
   * Search across all sources with query and category scoring
   * @param {string} query - raw search string
   * @param {Object} context - { openTabs: [], bookmarks: [], recentArchives: [] }
   */
  async search(query, context = {}) {
    const q = (query || '').trim();
    if (!q) {
      return this.getDefaultSuggestions(context);
    }

    const qLower = q.toLowerCase();
    const results = [];

    // Prefix detection
    // ">" for commands
    // "@" for open tabs
    // "*" for bookmarks
    // "?" or "h:" for history
    const isCommandOnly = qLower.startsWith('>') || qLower.startsWith('/command');
    const isTabOnly = qLower.startsWith('@') || qLower.startsWith('/tab');
    const isBookmarkOnly = qLower.startsWith('*') || qLower.startsWith('/bm');
    const isHistoryOnly = qLower.startsWith('?') || qLower.startsWith('/hist');

    const cleanQuery = (isCommandOnly || isTabOnly || isBookmarkOnly || isHistoryOnly)
      ? q.slice(1).trim().toLowerCase()
      : qLower;

    // 1. Commands
    if (!isTabOnly && !isBookmarkOnly && !isHistoryOnly) {
      const commands = this.getSystemCommands();
      for (const cmd of commands) {
        const score = this.scoreMatch(cleanQuery, cmd.title, cmd.keywords);
        if (score > 0 || !cleanQuery) {
          results.push({
            type: 'command',
            category: 'Commands & Actions',
            icon: cmd.icon,
            title: cmd.title,
            subtitle: cmd.subtitle,
            action: cmd.action,
            payload: cmd.payload,
            score: score + (isCommandOnly ? 100 : 20)
          });
        }
      }
    }

    // 2. Open Tabs
    if (!isCommandOnly && !isBookmarkOnly && !isHistoryOnly && Array.isArray(context.openTabs)) {
      for (const tab of context.openTabs) {
        const score = this.scoreMatch(cleanQuery, tab.title, tab.url);
        if (score > 0) {
          results.push({
            type: 'tab',
            category: 'Open Tabs',
            icon: tab.isSleeping ? '💤' : (tab.icon || '🌐'),
            title: tab.title || tab.url,
            subtitle: tab.url,
            tabId: tab.id,
            container: tab.containerName,
            isSleeping: tab.isSleeping,
            score: score + (isTabOnly ? 100 : 50) // Open tabs prioritized
          });
        }
      }
    }

    // 3. Bookmarks
    if (!isCommandOnly && !isTabOnly && !isHistoryOnly && Array.isArray(context.bookmarks)) {
      for (const bm of context.bookmarks) {
        const score = this.scoreMatch(cleanQuery, bm.title, bm.url);
        if (score > 0) {
          results.push({
            type: 'bookmark',
            category: 'Bookmarks',
            icon: '★',
            title: bm.title || bm.url,
            subtitle: bm.url,
            url: bm.url,
            score: score + (isBookmarkOnly ? 100 : 30)
          });
        }
      }
    }

    // 4. Browsing History
    if (!isCommandOnly && !isTabOnly && !isBookmarkOnly && this.historyManager) {
      try {
        const historyItems = this.historyManager.search(cleanQuery, 15);
        for (const item of historyItems) {
          const score = this.scoreMatch(cleanQuery, item.title, item.url);
          if (score > 0) {
            results.push({
              type: 'history',
              category: 'History',
              icon: '🕒',
              title: item.title || item.url,
              subtitle: item.url,
              url: item.url,
              score: score + (isHistoryOnly ? 100 : 10)
            });
          }
        }
      } catch {}
    }

    // 5. Offline Archives
    if (!isCommandOnly && !isTabOnly && !isBookmarkOnly && !isHistoryOnly && this.archiveManager) {
      try {
        const archives = this.archiveManager.getAll();
        for (const arc of archives) {
          const score = this.scoreMatch(cleanQuery, arc.title, arc.url);
          if (score > 0) {
            results.push({
              type: 'archive',
              category: 'Offline Archives',
              icon: '📦',
              title: arc.title || 'Archived Page',
              subtitle: arc.url || arc.filePath,
              archiveId: arc.id,
              score: score + 15
            });
          }
        }
      } catch {}
    }

    // Sort by score descending and cap results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 25);
  }

  /**
   * Fast fuzzy match scorer
   */
  scoreMatch(query, text, extraText = '') {
    if (!query) return 1;
    const t = (text || '').toLowerCase();
    const e = (extraText || '').toLowerCase();

    if (t === query) return 100;
    if (t.startsWith(query)) return 80;
    if (t.includes(query)) return 50;
    if (e.includes(query)) return 30;

    // Word boundary match
    const words = query.split(/\s+/);
    let matchedWords = 0;
    for (const w of words) {
      if (t.includes(w) || e.includes(w)) matchedWords++;
    }
    if (matchedWords === words.length) return 40;

    return 0;
  }

  /**
   * Default suggestion list when query is empty
   */
  getDefaultSuggestions(context = {}) {
    const results = [];

    // Top open tabs
    if (Array.isArray(context.openTabs) && context.openTabs.length > 0) {
      context.openTabs.slice(0, 4).forEach(tab => {
        results.push({
          type: 'tab',
          category: 'Active Tabs',
          icon: tab.isSleeping ? '💤' : (tab.icon || '🌐'),
          title: tab.title || tab.url,
          subtitle: tab.url,
          tabId: tab.id,
          score: 50
        });
      });
    }

    // Top Bookmarks
    if (Array.isArray(context.bookmarks)) {
      context.bookmarks.slice(0, 5).forEach(bm => {
        results.push({
          type: 'bookmark',
          category: 'Bookmarks',
          icon: '⭐',
          title: bm.title || bm.url,
          subtitle: bm.url,
          url: bm.url,
          score: 45
        });
      });
    }

    // Frequently used commands
    const topCommands = [
      { icon: '➕', title: 'New Tab', subtitle: 'Open a blank tab (Ctrl+T)', action: 'new-tab' },
      { icon: '🔥', title: 'New Ephemeral Tab', subtitle: 'Disposable tab burned on close (Ctrl+Shift+N)', action: 'new-ephemeral-tab' },
      { icon: '🤖', title: 'Open Recon AI', subtitle: 'Local Ollama intelligence bridge (Ctrl+Shift+I)', action: 'open-ai' },
      { icon: '📚', title: 'Dedicated History Tab', subtitle: 'Browse complete history (Ctrl+H)', action: 'open-history' },
      { icon: '💤', title: 'Hibernate Background Tabs', subtitle: 'Free up memory immediately', action: 'hibernate-tabs' },
      { icon: '⚙️', title: 'Open Settings', subtitle: 'Preferences, themes, and shields', action: 'open-settings' }
    ];

    topCommands.forEach((cmd, idx) => {
      results.push({
        type: 'command',
        category: 'Quick Commands',
        icon: cmd.icon,
        title: cmd.title,
        subtitle: cmd.subtitle,
        action: cmd.action,
        score: 40 - idx
      });
    });

    return results;
  }

  /**
   * Built-in action registry
   */
  getSystemCommands() {
    return [
      { icon: '➕', title: 'New Tab', subtitle: 'Open a blank tab', action: 'new-tab', keywords: 'tab create open add' },
      { icon: '🔥', title: 'New Ephemeral Tab', subtitle: 'Incognito disposable session burned on close', action: 'new-ephemeral-tab', keywords: 'incognito private ephemeral burn disposable' },
      { icon: '📦', title: 'New Container Tab', subtitle: 'Open tab in isolated container jar', action: 'new-container-tab', keywords: 'container persona jar isolate' },
      { icon: '🤖', title: 'Open Recon AI', subtitle: 'Local intelligence summarizer & claim extractor', action: 'open-ai', keywords: 'ai ollama summarize claims rewrite assistant' },
      { icon: '📚', title: 'Browsing History', subtitle: 'Open full-page dedicated history manager', action: 'open-history', keywords: 'history past visits logs' },
      { icon: '🛡️', title: 'Toggle Recon Shields', subtitle: 'Enable or pause tracker and ad blocking', action: 'toggle-shields', keywords: 'shields adblock tracker privacy' },
      { icon: '🔒', title: 'Open Password Vault', subtitle: 'Hardware-encrypted safe credentials store', action: 'open-vault', keywords: 'vault passwords login credentials safe' },
      { icon: '💤', title: 'Hibernate Background Tabs', subtitle: 'Free memory (< 250MB RAM)', action: 'hibernate-tabs', keywords: 'sleep hibernate ram memory freeze discard' },
      { icon: '📖', title: 'Toggle Reader View', subtitle: 'Distraction-free article reader', action: 'toggle-reader', keywords: 'reader text clean read' },
      { icon: '🔊', title: 'Read Aloud (TTS)', subtitle: 'Listen to page content with speech synthesis', action: 'read-aloud', keywords: 'speech voice read aloud listen tts' },
      { icon: '✍️', title: 'Open Author Desk Companion Rail', subtitle: 'Research notes and scratchpad', action: 'open-rail', keywords: 'notes companion scratchpad author desk' },
      { icon: '🎙️', title: 'Open Audio Studio Grabber', subtitle: 'In-page audio stream sniffer', action: 'open-audio-grabber', keywords: 'audio stream record grab music podcast' },
      { icon: '🪐', title: 'Open Decentralized Gateway', subtitle: 'IPFS, IPNS, and Gemini settings', action: 'open-gateway', keywords: 'ipfs ipns gemini decentralized gateway' },
      { icon: '🚀', title: 'Launch Gemini Space', subtitle: 'Navigate gemini:// capsule space', action: 'launch-gemini', keywords: 'gemini space capsule protocol' },
      { icon: '⚙️', title: 'Open Recon Settings', subtitle: 'Configure appearance, privacy, and ecosystem', action: 'open-settings', keywords: 'settings preferences config options theme' },
      { icon: '⚡', title: 'Recon Apps Ecosystem', subtitle: 'Launch companion RT desktop applications', action: 'open-ecosystem', keywords: 'apps storytracker markdown reader desk press audio' }
    ];
  }
}

module.exports = {
  SpotlightManager
};
