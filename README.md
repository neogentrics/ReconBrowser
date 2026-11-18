<div align="center">

# Recon Browser

**A privacy-hardened, bloat-free web browser built for the Recon Apps ecosystem.**  
*By the Recon Towers Dev Department — [recontowers.com](https://recontowers.com)*

<br>

[![Latest Release](https://img.shields.io/github/v/release/neogentrics/ReconBrowser?style=for-the-badge&color=7c3aed&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser/releases/latest)
[![Build Status](https://img.shields.io/github/actions/workflow/status/neogentrics/ReconBrowser/release.yml?branch=main&style=for-the-badge&label=builds&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge&labelColor=150e22)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-1f6feb?style=for-the-badge&labelColor=150e22)](#downloads)
[![Default Search](https://img.shields.io/badge/search-DuckDuckGo-de5833?style=for-the-badge&logo=duckduckgo&logoColor=white&labelColor=150e22)](https://duckduckgo.com)
[![Shields](https://img.shields.io/badge/shields-native_blocking-da3633?style=for-the-badge&labelColor=150e22)](#key-highlights)

<br>

[Downloads](#downloads) • [What’s New](#whats-new) • [Roadmap](#roadmap) • [Recon Towers Hub](https://recontowers.com)

</div>

---

## Downloads

The latest version is **v1.2.0**. Download it from [GitHub Releases](https://github.com/neogentrics/ReconBrowser/releases/latest). Each file name carries the version, shown here as `<version>`:

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

--- | :--- | :--- |
| **Windows** | [**ReconBrowser-Setup.exe**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Complete Windows installer with desktop and start menu shortcuts |
| **Windows** | [**ReconBrowser-Portable.exe**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Zero-install standalone portable executable |
| **Linux** | [**ReconBrowser-x86_64.AppImage**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Universal Linux standalone executable (Ubuntu, Fedora, Arch, etc.) |
| **Linux** | [**ReconBrowser-amd64.deb**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Debian / Ubuntu / Mint system package |
| **macOS** | [**ReconBrowser-arm64.dmg**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Apple Silicon (M1 / M2 / M3 / M4) package |
| **macOS** | [**ReconBrowser-x64.dmg**](https://github.com/neogentrics/ReconBrowser/releases/latest) | Intel Mac package |

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

- `Ctrl+T` / `Cmd+T`: Open new tab (defaults to Recon Start)
- `Ctrl+W` / `Cmd+W`: Close active tab
- `Ctrl+L` / `Cmd+L`: Focus and select omnibar
- `Ctrl+R` / `Cmd+R`: Reload current page
- `Ctrl+,` / `Cmd+,`: Open settings
- `Ctrl+Alt+R` / `Cmd+Alt+R`: Toggle Reader View (`Esc` leaves it)
- `Ctrl+Shift+A` / `Cmd+Shift+A`: Read the page aloud
- `Ctrl+Shift+X` / `Cmd+Shift+X`: Stop reading
- `!g <query>`: Instant search redirect to Google
- `!b <query>`: Instant search redirect to Bing

---

## Roadmap

The full plan, with every feature, is in [docs/ROADMAP.md](docs/ROADMAP.md). In short:

| Version | Status | Theme |
| :--- | :--- | :--- |
| **v1.0** | Released | The first stable release |
| **v1.1** | Released | Updates, tab isolation, themes and the shields popover |
| **v1.2** | Released | Reader View, Read Aloud, aspects and accessible themes |
| **v1.3** | Planned | StoryTracker research: send a highlight to a lore entry, with its citation, and keep an offline copy of the source |
| **v1.4** | Planned | Sync with no account, through a folder you already sync, with encryption |
| **v1.5** | Planned | Offline archives: save a page as one file, search all your saved research |
| **v1.6** | Planned | Shields 2.0: filter list subscriptions and a live network inspector |
| **v1.7** | Planned | Creative suite hooks: a docked Author Desk rail and an audio grabber for RT Audio Studio |
| **v1.8** | Planned | Containers for separate identities, per-container proxies and disposable tabs |
| **v1.9** | Planned | A local AI helper through Ollama, with nothing sent to the cloud |
| **v2.0** | Milestone | The connected studio browser: everything from 1.x hardened, with a Recon Spotlight search (`Ctrl+K`) |
| **v2.x** | Planned | Workspaces and tree tabs, `ipfs://` and `gemini://`, home server sync, a security toolkit, a research canvas, a hardware-key vault |
| **v3.0** | Milestone | The default browser on ReconOS, and the browser for the whole Recon Towers suite |

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
