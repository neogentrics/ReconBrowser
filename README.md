<div align="center">

# Recon Browser

**A privacy-hardened, bloat-free web browser built for the Recon Apps ecosystem.**  
*By the Recon Towers Dev Department — [recontowers.com](https://recontowers.com)*

<br>

[![Version](https://img.shields.io/badge/version-0.1.0--alpha-7c3aed?style=for-the-badge&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser/releases)
[![Status](https://img.shields.io/badge/status-active_development-238636?style=for-the-badge&labelColor=150e22)](https://github.com/neogentrics/ReconBrowser)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge&labelColor=150e22)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux%20%7C%20macOS-1f6feb?style=for-the-badge&labelColor=150e22)](#platforms)
[![Default Search](https://img.shields.io/badge/search-DuckDuckGo-de5833?style=for-the-badge&logo=duckduckgo&logoColor=white&labelColor=150e22)](https://duckduckgo.com)
[![Shields](https://img.shields.io/badge/shields-native_blocking-da3633?style=for-the-badge&labelColor=150e22)](#recon-shields)

<br>

[Roadmap](docs/ROADMAP.md) • [Shields Spec](docs/SHIELDS_SPEC.md) • [Search Config](config/search-engines.json) • [Recon Towers Hub](https://recontowers.com)

</div>

---

## Overview

**Recon Browser** is engineered from the ground up to strip away corporate telemetry, tracking scripts, and bloatware. Drawing architectural inspiration from Netscape’s open foundation and modernized with a multi-process sandbox, native Brave-style shields, and modern Gecko/SpiderMonkey technologies.

### Key Highlights
- **Zero Telemetry & Pingbacks**: No background diagnostics, no Mozilla/Google tracking URLs, no Pocket integrations.
- **Native Recon Shields**: In-memory tracker and ad blocking prior to network dispatch—no third-party extensions required.
- **Search Freedom**: Pre-configured with **DuckDuckGo** as default, with instant one-click fallbacks for **Google** and **Bing**.
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

## Repository Structure

```text
ReconBrowser/
├── config/
│   ├── search-engines.json      # DuckDuckGo, Google, Bing presets
│   ├── shields-config.json      # Protection rules and DoH endpoints
│   └── filters/
│       └── default-trackers.txt # Core tracking & ad domain blocklist
├── docs/
│   ├── ROADMAP.md               # Phased delivery plan (v0.1.0 to v1.1.0)
│   └── SHIELDS_SPEC.md          # Technical specification for shields
├── src/
│   └── shields/
│       ├── filter_engine.py     # Rule parser and URL classifier
│       └── fingerprint_guard.js # Canvas, WebGL, and AudioContext guard
└── tests/
    └── test_shields.py          # Shields unit and benchmark suite
```

---

## Phased Development Roadmap

- [x] **v0.1.0-alpha**: Initial repository architecture, clean telemetry-stripped baseline, search presets.
- [ ] **v0.2.0-beta**: Native **Recon Shields Engine** (rule matcher, canvas noise injection, DoH resolver).
- [ ] **v0.3.0**: **Recon UI & Theme** (dark cyber aesthetics, minimalist omnibar, vertical tab option).
- [ ] **v1.0.0**: **Production Release** (multi-platform installers, audited process isolation).
- [ ] **v1.1.0+**: **Recon Ecosystem Sync** (peer-to-peer encrypted sync with Recon Towers apps).

---

## Contributing & Development

```bash
# Clone the repository
git clone https://github.com/neogentrics/ReconBrowser.git
cd ReconBrowser

# Run shields test suite
python3 -m unittest discover tests
```

---

<div align="center">
Part of the <a href="https://recontowers.com">Recon Towers</a> digital ecosystem.
</div>
