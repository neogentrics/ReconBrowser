# Changelog

All notable changes to **Recon Browser** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
