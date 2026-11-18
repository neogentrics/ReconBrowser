<div align="center">

# Recon Browser

**A privacy-hardened, bloat-free web browser built for the Recon Apps ecosystem.**  
*By the Recon Towers Dev Department — [recontowers.com](https://recontowers.com)*

<br>

[![Latest Release](https://img.shields.io/github/v/release/neogentrics/ReconBrowser?style=for-the-badge&color=7c3aed&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser/releases/latest)
[![Build Status](https://img.shields.io/github/actions/workflow/status/neogentrics/ReconBrowser/release.yml?branch=main&style=for-the-badge&label=builds&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge&labelColor=150e22)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Android-1f6feb?style=for-the-badge&labelColor=150e22)](#downloads)
[![Default Search](https://img.shields.io/badge/search-DuckDuckGo-de5833?style=for-the-badge&logo=duckduckgo&logoColor=white&labelColor=150e22)](https://duckduckgo.com)
[![Shields](https://img.shields.io/badge/shields-native_blocking-da3633?style=for-the-badge&labelColor=150e22)](#recon-shields)

<br>

[Downloads](#downloads) • [Roadmap](docs/ROADMAP.md) • [Shields Spec](docs/SHIELDS_SPEC.md) • [Recon Towers Hub](https://recontowers.com)

</div>

---

## Downloads

Download the latest standalone installer or portable build from [GitHub Releases](https://github.com/neogentrics/ReconBrowser/releases/latest):

| Platform | Download Package | Description |
| :--- | :--- | :--- |
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
- `!g <query>`: Instant search redirect to Google
- `!b <query>`: Instant search redirect to Bing

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
