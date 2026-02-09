# 🎬 FL Movie Wall

<p align="center">
  Turn Filelist browse into a cinematic movie wall.
</p>

<p align="center">
  <a href="https://github.com/Mariancov/fl-movie-wall/releases">
    <img src="https://img.shields.io/github/v/release/Mariancov/fl-movie-wall?label=Release&style=flat-square" alt="Release">
  </a>
  <a href="https://github.com/Mariancov/fl-movie-wall/stargazers">
    <img src="https://img.shields.io/github/stars/Mariancov/fl-movie-wall?style=flat-square" alt="Stars">
  </a>
  <a href="https://github.com/Mariancov/fl-movie-wall/issues">
    <img src="https://img.shields.io/github/issues/Mariancov/fl-movie-wall?style=flat-square" alt="Issues">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/Mariancov/fl-movie-wall?style=flat-square" alt="License">
  </a>
</p>

---

## ✨ About

FL Movie Wall is a lightweight userscript that transforms Filelist browse pages into a modern **poster grid** while keeping the classic OG Filelist look and performance.

No plugins. No extensions. Just one script.

---

## 🚀 Install (Auto-Update Enabled)

👉 Install / Update Script:

https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js

Open the link and Tampermonkey or Violentmonkey will prompt **Install** automatically.

---

## ⚙️ Features

- Persistent genre filter  
- Movie poster grid view  
- Thumbnails fetched from `details.php` and cached  
- Draggable control panel (position remembered)  
- Grid / List toggle  
- Hide original list option  
- Lightweight — no external dependencies  
- **Card hover trailer preview (3s delay):** Hover any poster card for 3 seconds to auto-open an autoplay (muted) trailer preview popup (if a YouTube trailer exists on `details.php`).
- **Hover arming indicator:** While hovering, a small progress bar animates at the bottom of the card so the user knows the trailer preview is about to load.
- **Trailer popup pinning:** Click empty space on a card (not links) to pin/unpin the trailer preview popup; press **Esc** to close.

---

## 🔄 Updates

The script supports automatic updates via the `@updateURL` and `@downloadURL` fields.

New version workflow:

- Edit `dist/fl-movie-wall.user.js`
- Increase `@version`
- Push to `main`

Users will receive updates automatically.

