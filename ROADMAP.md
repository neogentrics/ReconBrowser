# Roadmap

A short summary of where Recon Browser is and where it is going. The long, detailed plan is in
[docs/ROADMAP.md](docs/ROADMAP.md), and every release is listed in the [changelog](CHANGELOG.md).
Anything that sends data off your computer, or connects to an account, is meant to be **opt-in**.

## Released

The latest release is [v1.10.0](https://github.com/neogentrics/ReconBrowser/releases/tag/v1.10.0).

- Tabs with isolated sessions, native Shields and DNS-over-HTTPS, DuckDuckGo search
- Recon themes with Solid, Metallic and Glass finishes
- Reader View and Read Aloud
- Encrypted password vault with opt-in autofill, bookmarks and history
- Zero-knowledge folder sync, bookmark and password import and export, offline research archives
- App Link: send research clips to RT Story Tracker and RT Markdown Reader
- Recon Spotlight (`Ctrl+K`) and named project workspaces

## In progress

- Opening a second window instead of a second process, so settings and themes carry across windows (fixed on main, not yet released)
- An update system that works like the other Recon Towers apps (in review)
- Fixing the open bugs, in order
- A review of every button and setting, to remove duplicates and anything nobody asked for

## Planned

- Right-click menus on tabs and bookmarks, and smoother tab dragging
- Edge-style workspaces and Chrome-style tab groups
- One settings store shared by every window
- Opening images, PDF, audio, video, JSON and CSV files in a tab
- The shared Recon Towers themes, taken in from one place so every app matches
- App Link parity with the other apps: an apps panel, app status, and handling the files an app sends back
- An optional local AI helper (Ollama) that connects only when you ask, and optional Claude and Gemini AI sign-in
- Audio Grabber fixes: detect, preview and save audio from a page
- The `gemini://` viewer, renamed Capsule Reader, and off unless you turn it on

## On hold

- Sending grabbed audio to RT Audio Studio (until Audio Studio exists)
- The companion rail, hidden until it is decided what it is for
- Neural local read aloud, a research canvas, home-server sync and a hardware-key vault (not scheduled)
- Native IPFS support is being removed, because nothing in the suite uses it
