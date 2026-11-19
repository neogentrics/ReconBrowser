'use strict';

/**
 * Universal Importer & Exporter for Recon Browser (v1.5.0)
 * Handles:
 * 1. Netscape Bookmarks HTML (compatible with Chrome, Firefox, Brave, Safari, Edge)
 * 2. Passwords CSV (compatible with Bitwarden, Chrome, Firefox, 1Password)
 */

// ==========================================================================
// Bookmarks Netscape HTML Export & Import
// ==========================================================================

function exportBookmarksToHtml(bookmarks) {
  const items = Array.isArray(bookmarks) ? bookmarks : [];
  
  // Group by folder
  const foldersMap = new Map();
  for (const bm of items) {
    const fName = bm.folder || 'Bookmarks';
    if (!foldersMap.has(fName)) {
      foldersMap.set(fName, []);
    }
    foldersMap.get(fName).push(bm);
  }

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Recon Browser Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  for (const [folderName, bms] of foldersMap.entries()) {
    const folderEpoch = Math.floor(Date.now() / 1000);
    html += `    <DT><H3 ADD_DATE="${folderEpoch}">${escapeHtml(folderName)}</H3>\n    <DL><p>\n`;
    for (const b of bms) {
      const addDate = b.createdAt ? Math.floor(b.createdAt / 1000) : folderEpoch;
      html += `        <DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${addDate}">${escapeHtml(b.title || b.url)}</A>\n`;
    }
    html += `    </DL><p>\n`;
  }

  html += `</DL><p>\n`;
  return html;
}

function parseBookmarksHtml(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') return [];
  const results = [];
  const lines = htmlString.split(/\r?\n/);
  
  let currentFolder = 'Imported Bookmarks';
  const folderStack = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Detect folder header: <DT><H3 ...>FolderName</H3> or <H3 ...>FolderName</H3>
    const folderMatch = line.match(/<H3[^>]*>([^<]+)<\/H3>/i);
    if (folderMatch) {
      currentFolder = unescapeHtml(folderMatch[1].trim());
      folderStack.push(currentFolder);
      continue;
    }

    // Detect end of folder: </DL>
    if (/<\/DL>/i.test(line)) {
      if (folderStack.length > 0) {
        folderStack.pop();
        currentFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : 'Bookmarks';
      }
      continue;
    }

    // Detect bookmark link: <DT><A HREF="url" ...>Title</A> or <A HREF="url" ...>Title</A>
    const linkMatch = line.match(/<A\s+[^>]*HREF=["']([^"']+)["'][^>]*>([^<]*)<\/A>/i);
    if (linkMatch) {
      const url = linkMatch[1].trim();
      let title = unescapeHtml(linkMatch[2].trim());
      if (!title) title = url;

      // Extract ADD_DATE attribute if present
      let createdAt = Date.now();
      const dateMatch = line.match(/ADD_DATE=["'](\d+)["']/i);
      if (dateMatch) {
        const sec = parseInt(dateMatch[1], 10);
        if (!isNaN(sec) && sec > 0) {
          createdAt = sec * 1000;
        }
      }

      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://') || url.startsWith('file://')) {
        results.push({
          id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          title,
          url,
          folder: currentFolder || 'Imported Bookmarks',
          favicon: '★',
          createdAt
        });
      }
    }
  }

  return results;
}

// ==========================================================================
// Passwords CSV Export & Import
// ==========================================================================

function exportVaultToCsv(vaultItems) {
  const items = Array.isArray(vaultItems) ? vaultItems : [];
  let csv = 'url,username,password,notes\n';

  for (const item of items) {
    const url = escapeCsvField(item.domain.startsWith('http') ? item.domain : `https://${item.domain}`);
    const user = escapeCsvField(item.username || '');
    const pass = escapeCsvField(item.password || '');
    const notes = escapeCsvField(item.notes || '');
    csv += `${url},${user},${pass},${notes}\n`;
  }

  return csv;
}

function parseVaultCsv(csvString) {
  if (!csvString || typeof csvString !== 'string') return [];
  const rows = parseCsvRows(csvString);
  if (rows.length === 0) return [];

  // Identify column indices from header
  const header = rows[0].map(c => c.toLowerCase().trim());
  let urlIdx = header.findIndex(c => c === 'url' || c === 'website' || c === 'domain' || c === 'hostname');
  let userIdx = header.findIndex(c => c === 'username' || c === 'user' || c === 'login' || c === 'email');
  let passIdx = header.findIndex(c => c === 'password' || c === 'pass');
  let notesIdx = header.findIndex(c => c === 'notes' || c === 'note' || c === 'extra');

  // Fallback defaults if header missing
  if (urlIdx === -1 && userIdx === -1 && passIdx === -1) {
    urlIdx = 0; userIdx = 1; passIdx = 2; notesIdx = 3;
  }

  const results = [];
  const startRow = (urlIdx !== -1 && (header[urlIdx] === 'url' || header[urlIdx] === 'website' || header[urlIdx] === 'domain')) ? 1 : 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;

    const rawDomain = (urlIdx !== -1 && row[urlIdx]) ? row[urlIdx].trim() : '';
    const username = (userIdx !== -1 && row[userIdx]) ? row[userIdx].trim() : '';
    const password = (passIdx !== -1 && row[passIdx]) ? row[passIdx] : '';
    const notes = (notesIdx !== -1 && row[notesIdx]) ? row[notesIdx].trim() : '';

    if (!rawDomain || !username || !password) continue;

    let cleanDomain = rawDomain;
    try {
      if (rawDomain.startsWith('http://') || rawDomain.startsWith('https://')) {
        cleanDomain = new URL(rawDomain).hostname.toLowerCase();
      }
    } catch {}
    cleanDomain = cleanDomain.toLowerCase().replace(/^www\./, '');

    results.push({
      domain: cleanDomain,
      username,
      password,
      notes
    });
  }

  return results;
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvRows(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nextCh = text[i + 1];

    if (insideQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          currentField += '"';
          i++; // skip next quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        insideQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\n' || (ch === '\r' && nextCh === '\n')) {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        if (ch === '\r') i++; // skip \n
      } else if (ch !== '\r') {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

module.exports = {
  exportBookmarksToHtml,
  parseBookmarksHtml,
  exportVaultToCsv,
  parseVaultCsv
};
