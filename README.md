<div align="center">

# Recon Browser

**A privacy-hardened, bloat-free web browser built for the Recon Apps ecosystem.**  
*By the Recon Towers Dev Department — [recontowers.com](https://recontowers.com)*

<br>

[![Latest Release](https://img.shields.io/github/v/release/neogentrics/ReconBrowser?style=for-the-badge&color=7c3aed&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser/releases/latest)
[![Tests](https://img.shields.io/github/actions/workflow/status/neogentrics/ReconBrowser/ci.yml?branch=main&style=for-the-badge&label=tests&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser/actions/workflows/ci.yml)
[![Build Status](https://img.shields.io/github/actions/workflow/status/neogentrics/ReconBrowser/release.yml?branch=main&style=for-the-badge&label=builds&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser/actions)
[![License](https://img.shields.io/badge/license-proprietary-f2b417?style=for-the-badge&labelColor=150e22)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-1f6feb?style=for-the-badge&labelColor=150e22)](#downloads)
[![Default Search](https://img.shields.io/badge/search-DuckDuckGo-de5833?style=for-the-badge&logo=duckduckgo&logoColor=white&labelColor=150e22)](https://duckduckgo.com)
[![Shields](https://img.shields.io/badge/shields-native_blocking-da3633?style=for-the-badge&labelColor=150e22)](#key-highlights)

<br>

[Downloads](#downloads) • [What’s New](#whats-new) • [Roadmap](#roadmap) • [Recon Towers Hub](https://recontowers.com)

</div>

---

## Downloads

The latest version is **v1.10.0**. Download it from [GitHub Releases](https://github.com/neogentrics/ReconBrowser/releases/latest). Each file name carries the version, shown here as `<version>`:

| Platform | Download Package | Description |
| :--- | :--- | :--- |
| **Windows** | [**ReconBrowser-`<version>`-Setup.exe**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Installer with desktop and Start menu shortcuts. Installs for you only and updates itself |
| **Windows** | [**ReconBrowser-`<version>`-Portable.exe**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Nothing to install. Runs from wherever you put it |
| **Linux** | [**ReconBrowser-`<version>`-linux-x86_64.AppImage**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Runs on most distributions (Ubuntu, Fedora, Arch and others). Updates itself |
| **Linux** | [**ReconBrowser-`<version>`-linux-amd64.deb**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Debian, Ubuntu and Mint package |
| **macOS** | [**ReconBrowser-`<version>`-mac-arm64.dmg**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Apple silicon (M1 and later) |
| **macOS** | [**ReconBrowser-`<version>`-mac-x64.dmg**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Intel Macs |

**Before your first run**

- **Windows:** the builds aren't code-signed yet, so SmartScreen may say "Windows protected your PC". Choose *More info*, then *Run anyway*.
- **macOS:** the first time you open it, macOS blocks it. Go to *System Settings → Privacy & Security* and choose *Open Anyway*.
- **Linux:** on Ubuntu and Debian, install the package with `sudo apt install ./ReconBrowser-<version>-linux-amd64.deb`. For the AppImage, make it executable first. Ubuntu 24.04 needs `libfuse2t64` to run an AppImage.

**Updates.** Windows installs and the Linux AppImage download new versions themselves. Portable, macOS and `.deb` copies check GitHub and tell you when a new version is out, with a link to it. There's also a *Check for Updates* command in the Help menu.

An Android companion is planned but not built yet. See the [roadmap](#roadmap).

---

## Overview

**Recon Browser** is engineered from the ground up to strip away corporate telemetry, tracking scripts, and bloatware. Drawing architectural inspiration from Netscape’s open foundation and modernized with a multi-process sandbox, native Brave-style shields, and modern web engines.

### Key Highlights
- **Zero Telemetry & Pingbacks**: No background diagnostics, no Mozilla/Google tracking URLs, no Pocket integrations.
- **Native Recon Shields**: In-memory tracker and ad blocking prior to network dispatch—no third-party extensions required.
- **Search Freedom**: Pre-configured with **DuckDuckGo** as default, with instant one-click fallbacks for **Google** (`!g`) and **Bing** (`!b`).
- **Recon Apps Integration**: Built to seamlessly link with **Author Desk**, **Audio Studio**, **StoryTracker**, and **Markdown Reader**.
- **Memory Safety & Sandboxing**: Process-isolated tab architectures to prevent arbitrary code execution and memory corruption.

---

## What's New

### v1.10.0: Unified Recon Spotlight & Project Workspaces

- **Unified Recon Spotlight (`Ctrl+K` / `Cmd+K`)**:
  - Global fuzzy search modal across open tabs, bookmarks, browsing history, offline archives, and system actions.
  - Prefix filters: `>` for commands (shields, password vault, hibernate tabs, dedicated history), `@` for active tabs, `*` for bookmarks, and `?` for history.
  - Keyboard navigation with instant Enter execution.
- **Named Project Workspaces**:
  - Partition tabs into named project workspaces (Main, Research, Lore & Story, Studio, or custom).
  - Workspace selector pill in tab strip with active workspace badge counts and dropdown switcher.
  - Full workspaces manager in Settings (`#panel-workspaces`) with create, edit, color customization, and tab migration.
- **Dynamic Version Synchronization**:
  - Dynamic runtime version binding (`app.getVersion()`) for About panels and dialogs, ensuring the About screen always reflects the running release.

### v1.9.0: Decentralized Gateway & Generation 1 Hardening

- **Decentralized Protocol Gateway**:
  - **Native IPFS & IPNS (`ipfs://`, `ipns://`)**: Native URI resolution with automatic local IPFS daemon detection (`127.0.0.1:5001`) and resilient public gateway fallback cascade (`ipfs.io`, `dweb.link`, `cloudflare-ipfs`, `pinata`).
  - **Native Gemini Protocol (`gemini://`)**: Pure Node.js TLS 1.3 Gemini client (port 1965) with TOFU certificate tracking and cyber Gemtext reader (`gemini-viewer.html`).
  - **Omnibar Native Decentralized Routing**: Direct entry of `ipfs://`, `ipns://`, and `gemini://` addresses.
- **Intelligent Tab Memory Suspender (< 250MB RAM)**:
  - Background tab memory suspender automatically unloads idle `<webview>` processes after configurable timeout (15m, 30m, 1h), keeping 10+ tabs well under 250MB RAM.
  - Smooth one-click wake restores exact URL, title, and container partition without losing context.
  - "💤 Hibernate Background Tabs Now" button and live RAM savings indicator.
- **Zero-Data-Loss Migration & Store Health Verifier**:
  - Automatic validation, backup, and migration across all 7 user stores (Bookmarks, History, Vault, Containers, Archives, Sync, Companion Notes).

### v1.8.0: Recon AI — Local Intelligence Bridge

- **Recon AI (`🤖` / `Ctrl+Shift+I`)**: A fully local AI research assistant powered by your own **Ollama** instance. Zero data leaves your machine.
  - **Summarize** any page or selected text in 50, 100, 200, or 500 words.
  - **Extract Claims**: pulls out numbered factual claims from articles and documents.
  - **Ask AI**: answer research questions using page text as context — entirely local.
  - **Rewrite**: reshape selected text with presets (Concise, Formal, Simplify) or custom instructions.
  - Live Ollama connection status (🟢 / 🔴) and automatic model discovery from `localhost:11434`.
  - New **Recon AI** Settings panel with connection test, model list, and privacy guarantee.

### v1.7.1: Universal High-Contrast Theme & Text Legibility Overhaul

- **Universal High-Contrast Theme & Palette Overhaul**:
  - Eliminated text blurring, low contrast, and color clashes across all 19 themes (Warm Sepia, Mist, Cyber, Aero, Solar, Cobalt Ocean, Dusk, etc.) and all 3 visual finishes (Solid, Metallic, Glass).
  - Main text contrast upgraded to exceed 14:1 (WCAG AAA) on light themes and muted text contrast boosted above 7:1 (WCAG AAA).
  - Light theme metallic finishes re-engineered with clean specular plates and highlights, completely eliminating dark smudge / sludge gradient smears (`rgba(0,0,0,0.32)`) under search inputs and stat cards.
  - `#btn-ecosystem` ("Recon Apps") button locked to crisp white text on purple accent across all finishes, eliminating low-contrast beige-on-beige.
  - Added dedicated, high-contrast `::placeholder` styling for the Omnibar and Start Page search input so placeholders are immediately visible and never washed out.
  - High-visibility tab titles, close buttons, navigation controls (back/forward/refresh/home), and shields pill badges.
  - Automated WCAG 2.1 contrast verification test suite (`tests/test_v171_contrast.mjs`) ensuring 100% compliance across all 19 themes.

### v1.7.0: Recon Containers, Isolated Persona Jars & Ephemeral Disposable Tabs

- **Recon Containers & Isolated Persona Jars**:
  - True partition-level cryptographic isolation for cookies, localStorage, indexedDB, and cache across separate containers.
  - Six pre-configured personas with distinct color identities and icons: **Research** (`🔬` cyan), **Work** (`💼` blue), **Personal** (`👤` amber), **Finance** (`💳` emerald), **Social** (`💬` pink), and **Default** (`🌐` purple).
  - Custom container creation: easily define custom persona names, icons, color accents, and dedicated network routing.
  - Zero cross-jar tracking: signing into accounts or tracking scripts in one container cannot access or correlate cookies from any other container.
- **Ephemeral Disposable Tabs (`Ctrl+Shift+N` / 🔥)**:
  - Non-persistent volatile in-memory sessions (`recon_ephemeral_*`) that leave zero remnants on disk.
  - Automatic cryptographic wipe: closing the tab immediately triggers storage incineration (`clearStorageData()` + `clearCache()`), completely burning session cookies, storage, and cache.
  - Glowing visual indicator with flame icon (`🔥`) and orange/red border highlights.
- **Per-Container SOCKS5 / Tor Proxy Routing**:
  - Independent proxy configuration per container persona routed directly through Electron's partition session network stack.
  - 1-click **Tor SOCKS5 Preset** (`socks5://127.0.0.1:9050`) for onion darknet routing in dedicated containers without leaking traffic from your other normal tabs.
  - Supports SOCKS5, HTTP, and HTTPS proxies with custom authentication endpoints.
- **Container UI, Omnibar Badge & Switching Suite**:
  - **Omnibar Container Persona Pill**: interactive container badge in the address bar displaying active persona and privacy mode.
  - **Quick Container Switcher Dropdown**: switch current active tab into another container persona, open fresh container tabs, or launch disposable ephemeral tabs with a single click.
  - Color-coded tab indicators (`.tab-container-strip`) clearly marking container affiliation.
  - Webview context menu options: `Open Link in Ephemeral Tab`, `Open Link in Container...`, `Reopen in Container...`, and `Reopen in Ephemeral Session`.
  - Settings *Containers & Proxies* panel (`panel-containers`): full CRUD management, container data wipe / purge buttons, proxy configuration, and ephemeral tab launcher.

### v1.6.0: Docked Author Desk Companion Rail, RT Audio Studio Grabber & Studio Suite Hub

- **Docked Author Desk Companion Rail (`Ctrl+Shift+D` / Omnibar `✍️`)**:
  - Split-screen drafting scratchpad docked alongside active browsing tabs for simultaneous research and manuscript writing.
  - Multi-note drafting canvas with live Markdown rendering, note switcher, and real-time word/character counts.
  - Quick "Clip to Rail" button and keyboard shortcut (`Ctrl+Shift+E` / context menu) to append highlighted web text with formatted blockquotes and source attribution (`[Title](URL) — accessed Date`).
  - Customizable dock position: toggle between docking on the Right or Left (`↔️`), with draggable split-view resizer.
  - 1-click **Export to Markdown** (`.md`) and direct **Send to RT Author Desk** via App Link protocol.
- **RT Audio Studio Media & Stream Grabber (`Ctrl+Shift+G` / Omnibar `🎙️`)**:
  - In-page media sniffer automatically detecting audio streams, podcast episodes, and media files (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.opus`, `.webm`).
  - Sliding **Audio Studio Grabber Drawer** with per-tab detected streams counter, in-browser audio preview player, and 1-click download directly into RT Audio Studio's project library (`userData/audio_studio_clips/`).
  - Mini audio reference player embedded in the bottom of the Companion Rail for quick scrubbing and playback while writing.
  - Saved clips catalog management with 1-click deletion and direct file paths.
- **Recon Studio Dispatch Hub & Studio Menu**:
  - Dedicated top-level **Studio** application menu with accelerators for toggling the Companion Rail (`Ctrl+Shift+D`), clipping active text (`Ctrl+Shift+E`), opening the Audio Grabber (`Ctrl+Shift+G`), and saving offline archives (`Ctrl+S`).
  - Settings *Studio Suite* tab (`panel-studio`) for companion rail preferences, auto-sniffing toggles, and direct drawer access.

### v1.5.0: Zero-Knowledge Sync, Universal Import/Export, Shields 2.0 & Offline Research Archives

- **Zero-Knowledge Sync & Encrypted Vault / Backup Suite**:
  - Accountless folder sync encrypted with authenticated AES-256-GCM and scrypt key derivation. Works over Syncthing, Nextcloud, local network folders, or USB keys without remote cloud servers.
  - Multi-device union merging for bookmarks, password vault, history, and preferences.
  - **Universal Netscape Bookmarks HTML Import & Export**: 1-click bookmarks import and export fully compatible with **Brave**, Google Chrome, Mozilla Firefox, Microsoft Edge, Safari, and Opera.
  - **Universal Passwords CSV Import & Export**: Seamless credential import and export compatible with **Brave**, Bitwarden, 1Password, Chrome, and Firefox CSV exports.
  - **Encrypted System Backup (.reconbackup)**: 1-click password-protected snapshot generation and restore for your entire Recon environment.
- **Recon Shields 2.0 & Live Network Inspector**:
  - Filter list subscriptions with built-in EasyPrivacy and Fanboy's Annoyance lists, plus custom external filter URL subscriptions.
  - **Live Network Inspector Drawer** (`🔍 Live Inspector`): sliding panel at the bottom of the window displaying real-time per-tab requests, HTTP methods, resource types, block reasons, and filter counts.
  - **Cosmetic Element Zapper** (`⚡ Zap Element on Page`): interactive element highlighter and click-to-zap tool to permanently hide cookie banners and invasive overlays per-domain.
- **Offline Research Archives (.reconarchive / MHTML)**:
  - 1-click page preservation (`Ctrl+S` or omnibar `📦` button) bundling complete DOM, stylesheets, and images into self-contained offline MHTML files.
  - Searchable **Offline Research Library** in Settings with 1-click launch, tag filters, file size metrics, and deletion.

### v1.4.0: Native Bookmarks System, Daily History & Hardware Password Vault

- **Native Bookmarks System & Toolbar**: Bookmarks bar (`Ctrl+Shift+B`), navbar button (`★` / `Ctrl+B`), folders (Favorites, Recon Apps, Search), and right-click link bookmarking.
- **Daily-Sorted Browsing History**: Local history tracker grouped chronologically (*Today*, *Yesterday*, or full date), search filtering, and granular time-range clearing.
- **Encrypted Password Vault & Opt-In Autofill**: Hardware-backed OS encryption (`safeStorage`), permission-based opt-in autofill, and built-in cryptographically secure password generator.
- **Background Auto-Updater & Default Browser Integration**: Streaming binary download in the background with native elevation, plus 1-click Default Browser setting.

- **Centered Tabbed Settings Modal**: Replaced the sliding right-hand sidebar with a focused, centered pop-up window featuring 6 organized tabs (*Appearance*, *Interface & Layout*, *Search & Privacy*, *Read Aloud*, *Recon App Link*, *About*). Clicking outside the modal or pressing `Esc` instantly dismisses it so you can get right back to the page.
- **View Menu Quick Theme Switching**: Added native `Themes` and `Theme Finishes & Aspects` submenus under the application menu bar `View`, allowing one-click theme switching across all 15 palettes and 3 finishes without opening settings.
- **Start Page & Site Shields Bidirectional Sync**: Fixed site-specific paused shields so the Start Page badge displays `Paused` in red when shields are paused for that site, and clicking it unpauses the site.
- **Precise Site Shields Bypass**: Enhanced request filtering so when a user pauses shields for complex media sites like YouTube Music, media chunks and background streams bypass shields cleanly without ticking up blocked counts.
- **Recon Apps Hub Toggle Placement**: Added a quick `Show Apps on Start Page` switch directly inside the `⚡ Recon Apps` dropdown menu as well as within the Settings modal, keeping both synchronized in real time.
- **Interactive Ultra Telemetry Hub**: Clicking the center `Ultra / Zero Telemetry Overhead` badge on the Start Page opens directly into the *Search & Privacy* tab detailing Recon's zero-telemetry architecture and local-only processing.

### v1.3.2: Tab Dragging, Spectrum Themes & Auto-Updater Pipeline

- **Tab Dragging & Rearranging**: full drag-and-drop support to reorder open tabs dynamically with smooth visual indicators and synced keyboard navigation.
- **Spectrum Theme Pairs**: balanced the palette spectrum with 4 new themes, including dedicated blues:
  - **Blue Pair**: Cobalt Abyss (`ocean`) and Glacial Azure (`azure`).
  - **Red Pair**: Crimson Horizon (`red`) and Scarlet Blaze (`scarlet`).
  - **Yellow Pair**: Amber Sunset (`yellow`) and Solar Flare (`solar`).
  - **Green Pair**: Deep Forest (`forest`) and Evergreen (`evergreen`).
  - **Purple Pair**: Recon Cyber Dark (`cyber`) and Midnight Dusk (`dusk`).
- **In-App Auto-Updater Publishing**: configured `build.publish` and update manifests (`latest.yml`, `latest-linux.yml`, blockmaps) so background updates and "Restart to install" execute smoothly.
- **Interactive Check for Updates**: manual check opens direct download and install dialogues when an update is available.

### v1.3.1: App Link Research Clips & Ecosystem Polish

- **Research Clips via App Link** (`Ctrl+Shift+C`): send text selections directly to **RT Story Tracker** (files directly into lore/character/research) and **RT Markdown Reader** (opens in a live editor tab) using the secure App Link protocol v1.
- **YAML Front Matter & Markdown**: clean markdown conversion, sanitization (stripping scripts, iframes, styles), proper YAML quoting, and automated metadata citations (`source_url`, `source_title`, `source_author`, `source_date`, `accessed`).
- **1 MB Guardrail & Safe Filenames**: automatically truncates selections exceeding 1 MB with user alerts; filenames are slugified from clip titles without ever exposing web addresses or raw excerpt text.
- **Settings Persistence**: shields state, DoH state, and UI toggles reliably persist across application restarts.
- **Bidirectional Shields & DoH Sync**: start page badges synchronize immediately with top navigation popovers and settings drawer switches; added Cloudflare resolver diagnostics test button.
- **Enhanced Finish Gradients**: rich surface shading, directional gradients, and specular edge bevels across Solid Matte, Metallic Brushed Sheen, and Frosted Glass finishes.
- **Interactive Telemetry Badge**: clicking the center telemetry badge confirms zero telemetry overhead and local privacy.

### v1.2.0: Reader View, Read Aloud and new looks

- **Reader View** (`Ctrl+Alt+R`): a distraction-free view of the article, with `A-` and `A+` for the text size. Press `Esc` to leave.
- **Read Aloud** (`Ctrl+Shift+A`, stop with `Ctrl+Shift+X`): reads the page aloud with the voices already on your computer, highlighting the line being read, at 0.75x to 1.5x speed.
- **Aspects:** Solid, Metallic or Glass, on top of any theme.
- **14 themes**, including Crimson Horizon, Amber Sunset, a High Contrast theme, and two colorblind-safe palettes (Blue-Orange and Cyan-Magenta).
- **Your home page:** the Recon Towers site, the Recon Start Page, or any address you choose.
- **Recon Apps:** the menu and start page launch an app that's installed on your computer instead of only opening a link.
- A longer built-in tracker list.

### v1.1.0: Updates, tabs and shields

- **Updates** from GitHub Releases, as described under [Downloads](#downloads).
- **Tabs that keep their own state:** each tab is its own webview, so scroll position, form entries and history don't mix between tabs. Closing the last tab opens a fresh Start Page.
- **Shields popover:** click the Shields badge for the current site's blocked count and its switches. The gear opens the full settings drawer.
- **Search engine:** the choice in Settings now applies to the address bar and the Start Page together.
- **About window:** the version, release notes, issue tracker and a *Copy Version Details* button.
- New application icons.

### v1.0.0

The first stable release: multi-tab browsing, the DuckDuckGo address bar with `!g` and `!b`, native Recon Shields, and installers for Windows, macOS and Linux.

---

## Comparison Matrix

| Feature | Recon Browser | Stock Firefox | Google Chrome | Brave Browser |
| :--- | :---: | :---: | :---: | :---: |
| **Default Search** | **DuckDuckGo** | Google | Google | Brave Search |
| **Native Ad/Tracker Shields** | **Yes (Built-in)** | Add-on Needed | Blocked (Manifest v3) | Yes (Brave Shields) |
| **Telemetry & Pingbacks** | **Disabled / Stripped** | Enabled | Enabled | Minimal |
| **Crypto / Token Rewards Bloat**| **None (Pure Web)** | None | None | Enabled (BAT/Wallet) |
| **Recon Apps Ecosystem Sync** | **Native** | None | None | None |
| **Encrypted DoH by Default** | **Yes (Cloudflare/Quad9)**| Optional | Optional | Enabled |

---

## Keyboard Shortcuts

- `Ctrl+N` / `Cmd+N`: Open a new window (starting the app again does the same)
- `Ctrl+Shift+W` / `Cmd+Shift+W`: Close the current window
- `Ctrl+T` / `Cmd+T`: Open new tab (defaults to Recon Start)
- `Ctrl+W` / `Cmd+W`: Close active tab
- `Ctrl+L` / `Cmd+L`: Focus and select omnibar
- `Ctrl+R` / `Cmd+R`: Reload current page
- `Ctrl+,` / `Cmd+,`: Open settings
- `Ctrl+Shift+D` / `Cmd+Shift+D`: Toggle Author Desk Companion Rail
- `Ctrl+Shift+E` / `Cmd+Shift+E`: Append highlighted text to Companion Rail
- `Ctrl+Shift+G` / `Cmd+Shift+G`: Open RT Audio Studio Media Grabber
- `Ctrl+Shift+C` / `Cmd+Shift+C`: Send Research Clip to Recon Apps (RT Story Tracker / RT Markdown Reader)
- `Ctrl+Alt+R` / `Cmd+Alt+R`: Toggle Reader View (`Esc` leaves it)
- `Ctrl+Shift+A` / `Cmd+Shift+A`: Read the page aloud
- `Ctrl+Shift+X` / `Cmd+Shift+X`: Stop reading
- `Ctrl+S` / `Cmd+S`: Save active page to Offline Research Archive (`.reconarchive`)
- `!g <query>`: Instant search redirect to Google
- `!b <query>`: Instant search redirect to Bing

---

## Roadmap

What is released, what is in progress and what is planned is in [ROADMAP.md](ROADMAP.md). The detailed plan is in [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Contributing & Local Development

```bash
# Clone the repository
git clone https://github.com/neogentrics/ReconBrowser.git
cd ReconBrowser

# Install dependencies and launch local build
npm install
npm start

# Run automated test suite
npm test
```

---

<div align="center">
Part of the <a href="https://recontowers.com">Recon Towers</a> digital ecosystem.
</div>
