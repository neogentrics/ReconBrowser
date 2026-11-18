# Recon Browser — Development Roadmap

This roadmap outlines the development cycle for **Recon Browser** from early alpha through full ecosystem integration.

---

## Current Status: v0.1.0-alpha &rarr; v0.2.0-beta

### Milestone 1: v0.1.0-alpha (Baseline Scaffold) — [Complete]
- [x] Initial repository structure and GitHub linkage (`neogentrics/ReconBrowser`).
- [x] Privacy search engine configuration (DuckDuckGo default, Google/Bing fallbacks).
- [x] Telemetry stripping plan and architecture documentation.

### Milestone 2: v0.2.0-beta (Recon Shields Engine) — [In Progress]
- [x] Rule parser and filter matcher for Adblock Plus / EasyList syntax.
- [x] Tracking query parameter stripper (`utm_*`, `fbclid`, `gclid`).
- [x] Content-script canvas micro-noise injection (`fingerprint_guard.js`).
- [x] AudioContext and WebRTC IP leak mitigation.
- [ ] Integration with Gecko network request interception hooks.

### Milestone 3: v0.3.0 (Recon UI & Custom Shell) — [Planned]
- [ ] Dark minimalist Recon theme inspired by ReconOS aesthetics.
- [ ] Native shield status indicator in the address bar.
- [ ] Dedicated start page featuring DuckDuckGo search and Recon Apps shortcuts.
- [ ] Memory-efficient tab suspension for background tabs.

### Milestone 4: v1.0.0 (Production Release) — [Planned]
- [ ] Standalone installer packages for Windows, Linux, and macOS.
- [ ] Multi-process site isolation security audits.
- [ ] Comprehensive benchmark against memory footprint and page load speeds.

### Milestone 5: v1.1.0+ (Recon Towers Ecosystem Sync) — [Future]
- [ ] Encrypted local sync fixture for bookmarks, tabs, and history.
- [ ] Direct export to **Author Desk** and **Markdown Reader**.
- [ ] Zero cloud account requirement; peer-to-peer pairing.
