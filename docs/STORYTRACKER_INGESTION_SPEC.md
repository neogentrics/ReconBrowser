# Recon Browser → RT Story Tracker: Research & Lore Ingestion Specification

> **Target Version**: Recon Browser v1.3.0 & RT Story Tracker v3.8+  
> **Author**: Recon Towers Dev Department  
> **Purpose**: Technical hand-off specification for integrating direct web research and lore clipping between **Recon Browser** and **RT Story Tracker**.

---

## 1. Architectural Overview

Recon Browser acts as the research and discovery engine for the Recon Towers ecosystem. In **v1.3.0**, authors can highlight text, quotes, character inspirations, or reference imagery on any webpage and click **"Send to StoryTracker"** (or press `Ctrl+Shift+L`).

To support zero-configuration local communication between the two independent Electron desktop applications, this specification outlines:
1. **OS-Native Protocol Handlers (`rtstory://`)**: Primary instant trigger.
2. **Local Storage Inbox (`research-inbox`)**: Offline & queued batch fallback.
3. **Canonical Research Card Payload Schema**: Normalized data contract.
4. **StoryTracker Ingestion Handling**: Implementation guide for the StoryTracker codebase.

---

## 2. Ingestion Data Contract (JSON Payload Schema)

When Recon Browser pushes a research item, it formats the data as a UTF-8 JSON payload conforming to `IngestResearchPayload`:

```typescript
interface IngestResearchPayload {
  version: "1.0";
  id: string;                         // UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")
  timestamp: string;                  // ISO 8601 UTC (e.g., "2026-11-18T22:30:00.000Z")
  projectTarget?: string;             // Target project filename or "active" (default)
  category: "lore" | "character" | "setting" | "historical" | "science" | "general";
  title: string;                      // Card title (defaults to article title or selected heading)
  content: string;                    // Clean Markdown text of the highlighted excerpt
  source: {
    url: string;                      // Canonical web URL
    domain: string;                   // Clean hostname (e.g., "en.wikipedia.org")
    pageTitle: string;                // Full page title
    author?: string;                  // Extracted author/byline if available
    publishedDate?: string;           // Article publication date if detected
    accessedDate: string;             // ISO date when captured
  };
  snapshot?: {
    textSnippet?: string;             // Raw surrounding text context
    imageUrls?: string[];             // URLs of referenced images
    readerMarkdown?: string;          // Full stripped reader view text if captured in Reader View
  };
  tags?: string[];                    // Initial tags (e.g., ["research", "web-clip", "recon-browser"])
}
```

### Example Payload
```json
{
  "version": "1.0",
  "id": "c71a39f0-621b-4e12-b18b-94d75d312e09",
  "timestamp": "2026-11-18T22:45:12.000Z",
  "projectTarget": "active",
  "category": "setting",
  "title": "Medieval Aqueduct Architecture",
  "content": "Roman and medieval aqueducts relied strictly on gravity flow, utilizing continuous gradients ranging between 1:200 and 1:1000 over tens of kilometers.",
  "source": {
    "url": "https://recontowers.com/library/ancient-engineering",
    "domain": "recontowers.com",
    "pageTitle": "Ancient Civil Infrastructure & Mountain Aqueducts",
    "author": "Dr. Elena Vance",
    "publishedDate": "2026-04-12",
    "accessedDate": "2026-11-18"
  },
  "snapshot": {
    "imageUrls": ["https://recontowers.com/library/images/aqueduct-gradient.png"]
  },
  "tags": ["research", "worldbuilding", "aqueduct", "recon-browser"]
}
```

---

## 3. Communication Transports

### Transport A: OS URI Protocol (`rtstory://`) — Real-Time Instant Ingestion
Recon Browser encodes the payload into a URL-safe Base64 string and launches:
```
rtstory://ingest-research?payload=<base64_encoded_json>
```

#### Windows & Linux Handling:
- StoryTracker registers as default protocol client during startup:
  ```javascript
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('rtstory', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('rtstory');
  }
  ```
- Handled in `app.on('second-instance', (event, argv) => { ... })`:
  Inspect `argv` for arguments starting with `rtstory://`.

#### macOS Handling:
- Handled via `app.on('open-url', (event, url) => { ... })`:
  Inspect `url` starting with `rtstory://`.

---

### Transport B: Local File Drop Inbox — Offline / Queued Ingestion
If StoryTracker is closed or running on a separate profile, Recon Browser also deposits the payload into a shared local directory:

- **Windows**: `%LOCALAPPDATA%\ReconTowers\StoryTracker\inbox\<id>.json`
- **macOS**: `~/Library/Application Support/ReconTowers/StoryTracker/inbox/<id>.json`
- **Linux**: `~/.config/ReconTowers/StoryTracker/inbox/<id>.json`

StoryTracker scans or watches this directory on startup using `fs.watch`, ingests any pending files, and archives or deletes them once stored into SQLite.

---

## 4. Implementation Steps for RT Story Tracker

The Claude session working on **RT Story Tracker** should complete the following tasks:

### Task 1: Protocol Registration & Single-Instance IPC (`src/main/main.js`)
1. Ensure `app.setAsDefaultProtocolClient('rtstory')` is called during app initialization.
2. In `app.on('second-instance', (event, argv) => { ... })`:
   ```javascript
   const deepLink = argv.find(arg => arg.startsWith('rtstory://'));
   if (deepLink) {
     handleDeepLink(deepLink);
   }
   ```
3. In `app.on('open-url', (event, url) => { ... })`:
   ```javascript
   if (url.startsWith('rtstory://')) {
     event.preventDefault();
     handleDeepLink(url);
   }
   ```
4. Create helper `handleDeepLink(urlStr)`:
   - Extract URL query parameter `payload`.
   - Parse Base64 UTF-8 string to JSON.
   - Send to active window: `mainWindow.webContents.send('research-ingest-received', payload)`.

### Task 2: Inbox Directory Watcher (`src/main/inbox.js`)
1. Ensure the `inbox` directory exists at startup.
2. Check for existing `.json` files on startup and read their payloads.
3. Watch directory for new arrivals while the app is active.

### Task 3: Renderer Reception & Database Insertion (`src/renderer/research-ui.js`)
1. Listen for `ipcRenderer.on('research-ingest-received', (event, payload) => { ... })`.
2. Display non-intrusive toast or notification banner:
   > 📥 **Research Clipped**: *"[Title]"* from *[Domain]*  
   > `[Add to Active Project]` `[Choose Folder]` `[Dismiss]`
3. Store in StoryTracker's SQLite database (`better-sqlite3-multiple-ciphers`):
   - Table: `research_cards` (or current lore nodes table)
   - Store: `id`, `title`, `content`, `category`, `source_url`, `source_title`, `source_author`, `source_accessed`, `raw_snapshot`, `tags`, `created_at`.
4. Render formatted citation footer on the research card:
   ```markdown
   > Source: [Page Title](source_url) by Author (Accessed: YYYY-MM-DD)
   ```

---

## 5. Summary Checklist for StoryTracker Session

- [ ] Add `app.setAsDefaultProtocolClient('rtstory')` in `src/main/main.js`.
- [ ] Parse `rtstory://ingest-research?payload=...` in `second-instance` and `open-url`.
- [ ] Add `research-inbox` directory scanner for queued offline drops.
- [ ] Send parsed payload to renderer via `research-ingest-received` IPC channel.
- [ ] Create UI prompt to accept, categorize, and save the incoming card into the open project.
