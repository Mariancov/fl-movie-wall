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

## ✨ What is FL Movie Wall?

A lightweight userscript that transforms Filelist browse pages into a modern poster grid while keeping the OG Filelist look and performance.

No plugins. No extensions. Just one script.

---

## 🚀 Install (Auto Update Enabled)

👉 **Install / Update Script**

https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js

Open the link and Tampermonkey or Violentmonkey will prompt **Install** automatically.

---

## ⚙️ Features

- Persistent genre filter  
- Poster movie grid  
- Thumbnails from `details.php` (cached)  
- Draggable panel with saved position  
- Grid / List toggle  
- Hide original list option  
- Lightweight and fast (no dependencies)

---

## 🔄 Updates

The script updates automatically thanks to the `@updateURL` and `@downloadURL` fields inside the userscript header.

To release a new version:

1. Edit `dist/fl-movie-wall.user.js`  
2. Increase version number (example: `2.4` → `2.5`)  
3. Push changes to `main`

Users will receive the update automatically.

---

## 🏷️ Release Flow (Optional)

```bash
git tag v2.5
git push --tags
