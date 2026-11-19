# Changelog

All notable changes to **Recon Browser** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-11-19

### Added
- **Docked Author Desk Companion Rail (`Ctrl+Shift+D` / Omnibar `✍️`)**:
  - Split-screen companion panel docked right alongside active browsing tabs for simultaneous research and drafting.
  - Multi-note drafting canvas with live Markdown rendering, note switcher, and word/character counters.
  - Quick "Clip to Rail" button and keyboard shortcut (`Ctrl+Shift+E` / context menu) to append highlighted web text with formatted blockquotes and source attribution (`[Title](URL) — accessed Date`).
  - Customizable dock position: toggle seamlessly between docking on the Right or Left (`↔️`), with draggable split-view resizer.
  - 1-click **Export to Markdown** (`.md`) and direct **Send to RT Author Desk** via App Link protocol.
- **RT Audio Studio Media & Stream Grabber (`Ctrl+Shift+G` / Omnibar `🎙️`)**:
  - In-page media sniffer automatically detecting audio streams, podcast episodes, and media files (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.opus`, `.webm`).
  - Sliding **Audio Studio Grabber Drawer** with per-tab detected streams counter, in-browser audio preview player, and 1-click download directly into RT Audio Studio's project library (`userData/audio_studio_clips/`).
  - Mini audio reference player embedded in the bottom of the Companion Rail for quick scrubbing and playback while writing.
  - Saved clips catalog management with 1-click deletion and direct file paths.
- **Recon Studio Dispatch Hub & Studio Menu**:
  - Dedicated top-level **Studio** application menu with accelerators for toggling the Companion Rail (`Ctrl+Shift+D`), clipping active text (`Ctrl+Shift+E`), opening the Audio Grabber (`Ctrl+Shift+G`), and saving offline archives (`Ctrl+S`).
  - Webview context menu integration for instant text appending and audio capture.
  - Settings *Studio Suite* tab (`panel-studio`) for companion rail preferences, auto-sniffing toggles, and direct drawer access.

## [1.5.0] - 2026-11-19

### Added
- **Zero-Knowledge Sync & Encrypted Vault / Backup Suite**:
  - Accountless folder-based sync encrypted via authenticated `AES-256-GCM` with `scrypt` key derivation.
  - Sync across any user directory: Syncthing, Nextcloud, local network share, or USB drive with zero accounts and zero remote cloud trust.
  - Multi-device union merging for bookmarks, password vault, history, and preferences.
  - **Universal Netscape Bookmarks HTML Import & Export**:
    - Full 1-click import and export support for bookmarks from **Brave**, Google Chrome, Mozilla Firefox, Microsoft Edge, Safari, and Opera.
    - Preserves nested `<H3>` folder structures, timestamps (`ADD_DATE`), and URLs with automatic deduplication.
  - **Universal Passwords CSV Import & Export**:
    - Full import and export compatibility with **Brave**, Bitwarden, 1Password, Chrome, and Firefox CSV formats.
    - Handles multiline quotes, comma-escaping, and domain normalization.
  - **Encrypted Complete System Backup & Restore (`.reconbackup`)**:
    - 1-click encrypted snapshot generation protecting bookmarks, logins, history, and settings under a user-defined master passphrase.
- **Recon Shields 2.0 & Live Network Inspector**:
  - Custom filter list subscription manager (`EasyPrivacy`, `Fanboy's Annoyance List`, and custom external URL subscriptions).
  - Sliding **Live Network Inspector Drawer** (`🔍 Live Inspector`):
    - Real-time logging of network requests per tab (status, HTTP method, resource type, block reason, and target URL).
    - Granular filters: All, Blocked, Allowed.
    - Visual status badges for blocked trackers vs allowed assets.
  - **Cosmetic Element Zapper (`⚡ Zap Element on Page`)**:
    - Interactive element picker via right-click context menu or Shields popover button.
    - Real-time hover outline and 1-click removal with instant DOM removal and persistent per-domain CSS rule injection.
    - Persistent rule manager in Settings *Privacy* panel with 1-click rule removal.
- **Offline Research Archives (`.reconarchive` / MHTML)**:
  - 1-click webpage preservation into self-contained single-file MHTML archives bundling complete DOM, stylesheets, and images (`Ctrl+S` or omnibar `📦` button).
  - Built-in **Offline Research Library** in Settings with real-time search, file sizes, creation dates, domain tags, 1-click tab launch, and archive deletion.

## [1.4.0] - 2026-11-19

### Added
- **Native Bookmarks System & Toolbar**:
  - Optional Bookmarks Bar right below the navigation bar (`Ctrl+Shift+B` or Settings toggle).
  - Dedicated navbar Bookmarks button (`★` / `Ctrl+B`) for 1-click access even when the bar is hidden.
  - Multi-folder organization (Favorites, Recon Apps, Search, and custom user folders).
  - Sorting support: Recent, Alphabetical (A-Z), and Grouped by Folder.
  - Webview right-click context menu "★ Bookmark Link" action to save links without needing to open them.
  - Keyboard shortcut `Ctrl+D` to bookmark the active page.
- **Daily-Sorted Browsing History Tracker**:
  - Local history tracker recorded automatically on page navigation without telemetry (`userData/recon_history.json`).
  - History viewer grouped and sorted chronologically by day (*Today*, *Yesterday*, or full date).
  - Dedicated navbar History button (`🕒` / `Ctrl+H`) and Settings *Browsing History* tab.
  - Instant live search filtering across titles and URLs with debouncing.
  - Granular history clearing by time range (*Last hour*, *Last 24 hours*, *Last 7 days*, *All time*).
  - Optional "Clear on browser exit" setting with background execution on quit.
  - Individual item deletion (`×`) and 1-click navigation.
- **Encrypted Password Vault & Opt-In Autofill**:
  - Local hardware-backed encryption via Electron `safeStorage` (Windows DPAPI / macOS Keychain) stored at `userData/recon_vault.enc`.
  - Dedicated navbar Password Vault button (`🔑` / `Ctrl+Shift+L`) and Settings *Password Vault* tab.
  - Strictly opt-in autofill: detects active tab host and suggests matching logins, with click-to-autofill DOM injection without auto-submitting forms.
  - Built-in cryptographically secure random password generator (`crypto.randomInt`) with customizable length (8-64), uppercase, lowercase, numbers, and symbols.
  - Vault management: search credentials, masked password with reveal toggle (👁️/🙈), 1-click copy username/password, edit, and delete.
  - Add/Edit Credential dialog modal with pre-filled domain from active tab.
- **Native In-App Background Updater & Default Browser**:
  - True background binary downloading of installers via `net.fetch()` streamed to `%TEMP%`.
  - 1-click "Install & Restart" launching installer with native Windows UAC elevation, zero external browser redirects.
  - First-run Default Browser notice banner with 1-click setup.
  - Settings *Interface* Default Browser row with system status indicator and toggle (`app.setAsDefaultProtocolClient`).

### Fixed & Polished
- **Startup Black Screen / Tab Creation Fix**:
  - Resolved `btnOpenAbout` reference guard and eliminated `loadBookmarks` recursion to guarantee clean first tab creation on initial launch.
- **Shields Widget Redundancy Cleanup**:
  - Removed redundant "Shields:" word from the top-right navbar widget, streamlining it to `🛡️ ON [0]` to accommodate Bookmarks, History, and Vault icons.
- **DoH Fortification**:
  - Upgraded DNS-over-HTTPS resolvers to direct IP endpoints (`https://1.1.1.1/dns-query`, `https://1.0.0.1/dns-query`, `https://dns.google/dns-query`) to prevent DNS bootstrap leak loops.
- **Draggable Settings Modal**:
  - Added header drag handle with `grab`/`grabbing` cursor states.

## [1.3.3] - 2026-11-18

### Added
- **Centered Tabbed Settings Modal**:
  - Replaced sliding sidebar drawer with a centered pop-up window `<dialog id="settings-modal">`.
  - 6 dedicated tab navigation panels: *Appearance*, *Interface & Layout*, *Search & Privacy*, *Read Aloud*, *Recon App Link*, and *About*.
  - Outside backdrop click dismiss and `Esc` key support to avoid blocking web interaction.
- **View Menu Quick Themes & Finishes**:
  - Direct theme switching under application menu `View → Themes` for all 15 color palettes.
  - Quick finish switching under `View → Theme Finishes & Aspects` (Solid, Metallic, Glass).
- **Recon Apps Hub Start Page Toggle**:
  - Added `Show Apps on Start Page` quick switch in both the `⚡ Recon Apps` dropdown menu and Settings modal with two-way real-time synchronization.

### Fixed
- **Start Page & Site Shields Bidirectional Sync**:
  - Resolved issue where Start Page badge displayed "Active" while site shields were paused.
  - Clicking the Start Page badge when paused unpauses the site.
- **Precise Site Shields Bypass for Media Streams**:
  - Fixed request matching in main process `onBeforeRequest` using webContents URL and base host comparison so media streaming (e.g. YouTube Music) functions without false tracker increments when paused.
  - Reset active blocked count to 0 when shields are paused for a site to eliminate confusing status indicators.
- **Start Page Ultra Badge Interactivity**:
  - Clicking the center `Ultra / Zero Telemetry Overhead` badge now opens directly to the *Search & Privacy* tab with detailed zero-telemetry architecture explanations.

## [1.3.2] - 2026-11-18

### Added
- **Tab Dragging & Rearranging**:
  - Full HTML5 drag-and-drop tab reordering across the tab strip with visual drop indicators.
  - Keyboard navigation dynamically updates to reflect custom tab arrangements.
- **Spectrum Theme Pairs**:
  - Added 4 new rich color themes to balance the palette spectrum:
    - **Blue Pair**: Cobalt Abyss (`ocean`) and Glacial Azure (`azure`).
    - **Red Pair**: Crimson Horizon (`red`) and Scarlet Blaze (`scarlet`).
    - **Yellow Pair**: Amber Sunset (`yellow`) and Solar Flare (`solar`).
    - **Green Pair**: Deep Forest (`forest`) and Evergreen (`evergreen`).
    - **Purple Pair**: Recon Cyber Dark (`cyber`) and Midnight Dusk (`dusk`).

### Fixed
- **In-App Auto-Updater & Manifest Publishing**:
  - Configured `build.publish` with GitHub Releases provider so `electron-builder` generates update manifests.
  - Added `latest.yml`, `latest-linux.yml`, and blockmaps to release workflow assets for automatic background downloading and "Restart to update".
  - Interactive "Check for Updates" modal displaying direct download and install actions.

## [1.3.1] - 2026-11-18

### Added
- **App Link Protocol v1 Integration**:
  - Implemented `recon-browser` App Link presence file registration in shared directory (`%APPDATA%\Recon Towers\app-link` / `~/.config/Recon Towers/app-link`).
  - Automatic discovery and secure pairing with **RT Story Tracker** (`rt-story-tracker`) and **RT Markdown Reader** (`rt-markdown-reader`).
  - Encrypted key storage via Electron `safeStorage` (in-memory fallback when encryption backend is unavailable).
  - Document transmission using `open_document` with `kind: "research"`.
- **Research Clips & Pre-Send Review Modal** (`Ctrl+Shift+C`):
  - "Send Research Clip..." action in omnibar, ecosystem dropdown, Edit menu, and webview right-click context menu.
  - Review dialog displaying Title, Category (`lore`, `character`, `setting`, `historical`, `science`, `general`), Tags, Citation metadata, and Excerpt preview.
  - Front matter formatting with `source_url`, `source_title`, `source_author`, `source_date`, `accessed`, and citation trailer.
  - Clean Markdown conversion stripping scripts, styles, iframes, and tracking tags.
  - 1 MB safety guardrail with automatic truncation marker and warning.
  - Safe filename generation slugifying clip titles without leaking URLs or body excerpts.
  - "Copy as Markdown" fallback for offline/unlinked workflows.
- **Recon App Link Drawer Card**:
  - Live listing of discovered companion apps, running status, and pairing state in Settings Drawer.
- **Interactive Telemetry Badge**:
  - Start page center badge provides click feedback confirming zero telemetry architecture.

### Fixed
- **Shields & DoH State Persistence**:
  - Global shields and DNS-over-HTTPS settings now persist across browser restarts ([#5](https://github.com/neogentrics/ReconBrowser/issues/5)).
- **Bidirectional Shields Synchronization**:
  - Toggling shields on the start page synchronizes immediately with top bar indicator, settings drawer, and webview filtering ([#2](https://github.com/neogentrics/ReconBrowser/issues/2)).
- **Bidirectional DNS-over-HTTPS Synchronization**:
  - Start page DoH badge and settings drawer toggle stay in sync; added Cloudflare resolver diagnostics button ([#3](https://github.com/neogentrics/ReconBrowser/issues/3)).
- **Theme Finishes Visual Contrast**:
  - Distinct directional gradients, brushed metallic sheen, and frosted glass blur layers across all 14 palettes ([#4](https://github.com/neogentrics/ReconBrowser/issues/4)).
- **Middle Telemetry Badge**:
  - Added interactive affordance and confirmation for zero telemetry overhead ([#6](https://github.com/neogentrics/ReconBrowser/issues/6)).

## [1.2.0] - 2026-11-18
### Added
- Reader View overlay (`Ctrl+Alt+R`) with font scaling controls.
- Read Aloud (`Ctrl+Shift+A`, stop `Ctrl+Shift+X`) using local speech synthesis and active line highlighting.
- 14 Theme Palettes including high contrast and ADA-compliant colorblind modes.
- Solid (Matte), Metallic (Brushed Sheen), and Glass (Frosted Acrylic) finishes.
- Configurable Home URL (Recon Towers, Start Page, or Custom).

## [1.1.0] - 2026-11-18
### Added
- Multi-tab isolation architecture with independent webviews.
- Anchored Shields Popover and separate Settings Drawer.
- Auto-updater engine with GitHub Releases polling.
- About Recon Browser dialog.

## [1.0.0] - 2026-11-18
### Added
- Initial stable release.
- Native Recon Shields tracker and ad blocking.
- DuckDuckGo default omnibar with search bangs (`!g`, `!b`).
- Multi-platform installers for Windows, macOS, and Linux.
