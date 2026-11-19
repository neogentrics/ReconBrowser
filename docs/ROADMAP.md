# Recon Browser — Development Roadmap (v1.0.0 → v3.0.0)

> [!NOTE]
> **Recon Browser** is the privacy-hardened, bloat-free cyber browser engineered for the **Recon Apps** ecosystem hosted at [recontowers.com](https://recontowers.com). Inspired by the classic open architecture of Netscape Communicator and fortified with modern zero-telemetry shields, it acts as the primary web portal, research station, and content ingestion engine for **RT Story Tracker**, **RT Markdown Reader**, **Author Desk**, **Audio Studio**, and **ReconOS**.

---

## 1. Release Philosophy & Cadence

Following the established standard of **RT Story Tracker** and **RT Markdown Reader**:

1. **Point Releases (`v1.x`, `v2.x`) = Feature Introductions & Active Staging**:
   - Each minor release introduces a focused, cohesive capability (e.g., Linked Apps, Citation Vault, Local AI Summarizer, Multi-Workspace Trees).
   - Features undergo active testing with companion Recon applications across Windows, macOS, Linux, and Android.
2. **Major Versions (`v1.0`, `v2.0`, `v3.0`) = Hardened Production Baselines**:
   - Major version releases graduate all tested features into zero-test, fully hardened production status.
   - Guaranteed backwards compatibility: seamless zero-data-loss database and config migrations from the prior version.
   - Clean install on an unconfigured machine without external cloud dependencies or server setups.
3. **Recon Ecosystem First**:
   - Zero mandatory cloud accounts.
   - Zero telemetry, analytics, or remote tracking.
   - End-to-end encrypted local sync (via user-owned folders, local network pairing, or home servers).

---

## 2. Release Milestones Summary

| Version | Status | Primary Theme | Core Features |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | ✅ **Live** | Production Release Baseline | Multi-tab UI, DuckDuckGo Omnibar, Native Shields, Cross-Platform GitHub Actions CI/CD |
| **v1.1.0** | ✅ **Live** | Ecosystem Bridge, Auto-Updates & Polish | Auto-updater via GitHub Releases, 11 Recon themes, Linked Apps IPC, Shields Popover vs Settings Drawer, About Us modal |
| **v1.2.0** | 🚀 **Live** | Reader View, Read Aloud & Universal Aspects | Distraction-free Reader View, Read Aloud TTS with sentence highlighting, Solid/Metallic/Glass Aspects, ADA & Colorblind themes, configurable Home URL, local app auto-launch |
| **v1.3.1** | ✅ **Live** | App Link Research Clips & Stability | App Link v1 protocol (`recon-browser`), research clip ingestion to RT Story Tracker & RT Markdown Reader, safe storage encryption, shields & DoH persistence, rich finish gradients |
| **v1.3.2** | ✅ **Live** | Tab Dragging, Spectrum Themes & Auto-Updater | Tab dragging & rearranging, 4 new paired spectrum themes (blues, reds, yellows), auto-updater manifest pipeline & interactive check dialog |
| **v1.3.3** | ✅ **Live** | Tabbed Settings, High Contrast, Draggable Modal | Centered tabbed modal with drag handle, high-contrast typography & system info badge, individual ecosystem suite links |
| **v1.4.0** | ✅ **Live** | Password Vault, Opt-In Autofill, Bookmarks & History | Encrypted credential vault (`safeStorage`), permission-based opt-in autofill, bookmarks bar & right-click bookmarking, daily-sorted history manager, in-app updater |
| **v1.5.0** | ✅ **Live** | Zero-Knowledge Sync, Shields 2.0 & Offline Research Archives | Accountless AES-256-GCM folder sync, universal bookmarks import/export (**Brave**, Chrome, Firefox, Edge, Safari), passwords CSV import/export, encrypted backup (`.reconbackup`), custom filter list subscriptions, live sliding network inspector drawer, cosmetic element zapper, and `.reconarchive` (MHTML) offline library |
| **v1.6.0** | ✅ **Live** | Creative Suite Dock & Audio Grabber | Docked Author Desk companion rail, multi-note scratchpad, contextual citations (`Ctrl+Shift+E`), in-page audio stream sniffer & RT Audio Studio grabber |
| **v1.7.0** | ✅ **Live** | Containers & Ephemeral Personas | Isolated cookie & cache containers, per-container SOCKS5/Tor routing, ephemeral disposable tabs (`Ctrl+Shift+N`) with cryptographic wipe on close |
| **v1.7.1** | ✅ **Live** | High-Contrast Theme & Text Legibility | Universal WCAG AAA contrast overhaul across all 19 themes, eliminated dark metallic sludge smears on light themes, explicit high-contrast placeholder styling, high-visibility controls |
| **v1.8.0** | 📋 Planned | Local AI Integration | Ollama bridge (`localhost:11434`), zero-cloud summarization & claim extraction |
| **v1.9.0** | 📋 Planned | Decentralized Gateway | Native IPFS (`ipfs://`) and Gemini (`gemini://`) protocol handlers |
| **v2.0.0** | 🎯 Milestone | The Connected Studio Browser | **All Gen 1 features graduate to permanent production**; unified Recon Spotlight (`Ctrl+K`) |
| **v2.1.0** | 📋 Planned | Workspaces & Tree Tabs | Collapsible tab trees, project workspaces, intelligent tab memory sleep |
| **v2.2.0** | 📋 Planned | Decentralized Gateway | Native IPFS (`ipfs://`) and Gemini (`gemini://`) protocol handlers |
| **v2.3.0** | 📋 Planned | Home Server Sync | WebDAV & Nextcloud integration, remote device tab handoff |
| **v2.4.0** | 📋 Planned | Security Toolkit | In-browser CSP analyzer, cookie security scanner, TLS cipher auditor |
| **v2.5.0** | 📋 Planned | Spatial Research Canvas | Infinite 2D research whiteboard with direct export to StoryTracker |
| **v2.6.0** | 📋 Planned | Local Voice Reader | High-fidelity neural local TTS, audio streaming to RT Audio Studio |
| **v2.7.0** | 📋 Planned | Hardware Vault & Panic | Hardware security key (FIDO2) integration, single-keystroke panic lock |
| **v2.8.0** | 📋 Planned | ReconOS Wayland Layer | Zero-copy framebuffer compositor for native ReconOS desktop environment |
| **v2.9.0** | 📋 Planned | Gen 2 Hardening | Cross-architecture stress testing (x86_64, aarch64, RISC-V), 72h fuzzing |
| **v3.0.0** | 🏆 Grand Goal | The Sovereign Cyber Navigator | **Full Gen 2 graduation to production**; flagship browser of ReconOS and sovereign suite |

---

## 3. Milestone Details

### Milestone 1: v1.0.0 Stable — Production Release [Complete & Live]
- [x] Initial release packaged and distributed on GitHub Releases.
- [x] Suffix-tree tracking domain blocklist with instant query parameter stripping.
- [x] Canvas micro-noise and AudioContext jitter protection.
- [x] DuckDuckGo privacy routing with `!g` and `!b` search bangs.
- [x] Multi-platform matrix compiler for Windows (`.exe`), Linux (`.AppImage`, `.deb`), macOS (`.dmg`), and Android.

### Milestone 2: v1.1.0 — Ecosystem Bridge, Auto-Updates & Polish [In Progress]
- [x] **Auto-Update Engine**: Cross-platform update detection against GitHub Releases (`src/main/updater.js`), background downloading on Windows/Linux, and manual "Check for Updates..." in Help menu.
- [x] **Native App Branding & Icons**: High-resolution icons (`icon.ico`, `icon.png`, `icon.svg`) configured for Windows, macOS, Linux, and Android.
- [x] **Multi-Tab Isolation Fix**: Independent `<webview>` per tab; scroll, state, and form preservation; zero navigation collision; seamless closing and automatic fallback to Recon Start.
- [x] **Shields Popover vs. Settings Drawer Separation**:
  - Clicking Shield icon opens anchored site-specific status popover with live blocked counter.
  - Clicking ⚙ Gear icon opens full Recon Settings Drawer.
- [x] **Search Engine Preference Sync**: Changing default engine in Settings immediately updates Omnibar and Start Page search routing (DuckDuckGo, Google, Bing).
- [x] **11 Recon Themes**: Support for Cyber Dark, Pure Obsidian, Slate, Dark, Sepia, Mist, Forest, Dusk, Evergreen, Aero Glass, and High Contrast Cyber.
- [x] **About Recon Browser Modal**: Full About dialog modeled directly on RT Markdown Reader with tech specs, release notes, license, and one-click "Copy Version Details".

### Milestone 3: v1.2.0 — Reader View, Read Aloud & Universal Aspects [Complete & Live]
- [x] **Distraction-Free Reader View (`Ctrl+Alt+R`)**: Cleans advertising, headers, and navigation noise into pure typography with estimated read times.
- [x] **Read Aloud TTS Engine (`Ctrl+Shift+A`, `Ctrl+Shift+X`)**: Integrated speech synthesis with interactive floating controller bar, adjustable speeds (0.75x–1.5x), and live sentence highlighting.
- [x] **Universal Aspects (Finishes)**: Real-time rendering of Solid (Matte), Metallic (Brushed Sheen & Chamfered edges), and Glass (Frosted Acrylic blur & glow) across tabs, navbars, and startpages.
- [x] **Accessibility & ADA Themes**: High Contrast, Colorblind Blue-Orange, and Colorblind Cyan-Magenta palettes.
- [x] **Configurable Home Destination**: Instant routing to Recon Towers, Recon Start, or custom user URLs.
- [x] **Local Companion App Auto-Launch**: Direct launch invocation of installed Recon ecosystem desktop apps from the start page and navbar.

### Milestone 4: v1.3.x — App Link Research Clips, Tab Dragging & UI Polish [Active / Current]
- [x] **App Link Protocol v1 (`recon-browser`)**: Registered presence file in `%APPDATA%\Recon Towers\app-link` / `~/.config/Recon Towers/app-link`, local socket/pipe endpoints, and handshake (v1.3.1).
- [x] **Cross-App Pairing & Safe Storage**: Secure pairing with **RT Story Tracker** and **RT Markdown Reader**; 32-byte shared keys encrypted via Electron `safeStorage` (v1.3.1).
- [x] **Pre-Send Review Modal (`Ctrl+Shift+C`)**: Title, category taxonomy (`lore`, `character`, `setting`, `historical`, `science`, `general`), tags, metadata, and markdown preview before transmission (v1.3.1).
- [x] **Document Sanitization & Citation Formatting**: YAML front matter (`source_url`, `source_title`, `source_author`, `source_date`, `accessed`), stripped scripts/styles/embeds, and bottom citation line (v1.3.1).
- [x] **Safety Guardrails**: 1 MB clip truncation warning, safe document naming from title slugs without leaking URLs/body text (v1.3.1).
- [x] **Shields & DoH Persistence**: Preferences reliably persist across reboots, with bidirectional sync between startpage badges and top bar popovers (v1.3.1).
- [x] **Tab Dragging & Rearranging**: Smooth HTML5 drag-and-drop tab ordering with animated insertion indicators (v1.3.2).
- [x] **Paired Spectrum Themes**: 4 new paired color schemes (Cobalt Abyss / Glacial Azure, Crimson Horizon / Scarlet Blaze, Amber Sunset / Solar Flare, Deep Forest / Evergreen) (v1.3.2).
- [x] **Auto-Updater Release Manifest**: Embedded `publish` configuration and CI/CD artifact inclusion for `latest.yml` & `*.blockmap` (v1.3.2).
- [x] **Tabbed Settings Modal (v1.3.3)**: Centered pop-up window with 6 organized tabs (*Appearance*, *Interface*, *Privacy & Shields*, *Read Aloud*, *Recon App Link*, *About*) and clean backdrop dismiss.
- [x] **View Menu Quick Themes (v1.3.3)**: Instant theme and aspect switching directly from the native application menu bar.
- [x] **Shields & Apps Hub Sync (v1.3.3)**: Real-time synchronization of site-specific paused shields to the Start Page badge, and quick toggle for Recon Apps in both dropdown and settings.

### Milestone 5: v1.4.0 — Encrypted Password Vault, Opt-In Autofill, Bookmarks & History [Complete & Live]
- [x] **Native Encrypted Password Vault**: Secure credential store encrypted with Electron `safeStorage` (hardware/OS DPAPI / Keychain), protecting logins from malware and plain-text file snooping.
- [x] **Permission-Based Opt-In Autofill**: Strictly user-initiated credential suggestions. Never autofills automatically or exposes data without explicit user request.
- [x] **Credential Update & Generator**: Prompts to update saved passwords upon change detection; built-in cryptographically secure random password generator.
- [x] **Native Bookmarks Suite**:
  - Bookmarks Bar located directly below the navigation bar (toggleable via `Ctrl+B` or Settings).
  - Dedicated `★` toolbar button next to Settings gear for quick bookmarks access and folder management.
  - Page bookmarking shortcut (`Ctrl+D`) and right-click context menu "Bookmark Link" on any hyperlink.
  - Folder hierarchy, custom naming, and date/name sorting.
- [x] **Local History Tracker with Daily Sorting**:
  - Full local-only browsing history grouped and sorted by day (`Today`, `Yesterday`, specific dates).
  - Filterable search and privacy clearing options (1 hour, 24 hours, 7 days, all-time, or auto-wipe on exit) located in Settings.
- [x] **In-App Background Auto-Updater**: Direct background binary downloads and one-click "Update Now" with clean UAC elevation, eliminating external browser redirects.
- [x] **Default Browser Integration**: First-run prompt and Settings toggle to set Recon Browser as the default system browser via `app.setAsDefaultProtocolClient()`.

### Milestone 6: v1.5.0 — Zero-Knowledge Sync, Shields 2.0 & Offline Research Archives [Complete & Live]
- [x] Custom filter list subscriptions (EasyPrivacy, Fanboy Annoyances, uBlock Badware).
- [x] Live HTTP/3, QUIC, and TLS 1.3 network request inspector drawer.
- [x] Per-domain cosmetic element zapper.
- [x] Zero-knowledge AES-256-GCM folder sync & encrypted backup (`.reconbackup`).
- [x] Universal bookmarks import/export (Brave, Chrome, Firefox, Edge, Safari) & passwords CSV import/export.
- [x] Offline Research Archives (`.reconarchive` / MHTML) library with full-text search.

### Milestone 7: v1.6.0 — Creative Suite Dock & Audio Grabber [Complete & Live]
- [x] Author Desk docked companion rail with multi-note scratchpad and Markdown live preview.
- [x] RT Audio Studio media grabber for audio/video streams, podcasts, and media asset ingestion (`Ctrl+Shift+G`).
- [x] Contextual quick citations (`Ctrl+Shift+E`) appending selections to companion rail.

### Milestone 8: v1.7.0 — Containers & Ephemeral Personas [Complete & Live]
- [x] Recon Containers & Isolated Persona Jars: Partition-isolated cookie, storage, and cache jars for Research (`🔬`), Personal (`👤`), Work (`💼`), Finance (`💳`), Social (`💬`), and Custom containers.
- [x] Per-container proxy routing: Independent proxy rules per container (e.g. `socks5://127.0.0.1:9050` for Tor / SOCKS5 / HTTP proxies) via Electron session partition routing.
- [x] Ephemeral disposable tabs (`Ctrl+Shift+N`): Volatile in-memory sessions (`recon_ephemeral_*`) with zero disk footprint and cryptographic purge on close.
- [x] Omnibar container picker badge & quick switcher dropdown.
- [x] Container settings & proxy manager panel with one-click Tor preset and jar wipe actions.

### Milestone 9: v1.8.0 — Local AI & Ollama Integration
- [ ] Ollama bridge (`http://localhost:11434`) for local private AI (Qwen, Llama, Gemma).
- [ ] In-browser article summarizer with zero cloud transmission.
- [ ] Fact-check and claim extractor for StoryTracker.

### Milestone 10: v1.9.0 — Generation 1 Hardening & Security Audit
- [ ] Memory profiling: Enforce <250MB RAM with 10 open tabs.
- [ ] Sandbox escape and CVE penetration testing.
- [ ] Automated zero-data-loss migration tests.

### Milestone 11: v2.0.0 Stable — The Connected Studio Browser [Production Milestone]
- [ ] **Graduation Milestone**: All features from v1.1.0–v1.9.0 graduate from test to permanent production.
- [ ] Unified Recon Spotlight (`Ctrl+K`) searching tabs, bookmarks, archives, and companion Recon apps.
- [ ] Bi-directional studio sync across the entire workstation.

### Milestone 12: v2.1.0 to v2.9.0 — Sovereign Web & Decentralized Systems
- [ ] Workspaces & Tree Tabs with memory sleep.
- [ ] Native IPFS (`ipfs://`) and Gemini (`gemini://`) decentralized protocol gateway.
- [ ] ReconOS-Server & private Home Server sync (WebDAV, Nextcloud).
- [ ] In-browser security and CSP penetration toolkit.
- [ ] Spatial 2D research canvas exporting to StoryTracker Storyboards.
- [ ] Hardware security key (FIDO2/YubiKey) vault lock.
- [ ] ReconOS Wayland zero-copy compositor engine.

### Milestone 13: v3.0.0 Stable — The Sovereign Cyber Navigator [Grand Milestone]
- [ ] **Universal Studio Pipeline**: Complete closed-loop workflow from Web Discovery (Recon Browser) → Lore (StoryTracker) → Drafting (Author Desk) → Review (RT Markdown Reader) → Narration (Audio Studio) → Publishing (RT Press).
- [ ] Default flagship browser for **ReconOS**.
