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

No plugins. No extra apps. Just one script.

---

## 🚀 Install (Auto-Update Enabled)

👉 Install / Update Script:

https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js

Open the link and Tampermonkey or Violentmonkey will prompt **Install** automatically.

---

## 🧩 Step-by-step: install Tampermonkey (Chrome / Edge / Brave)

### 1) Install the Tampermonkey extension
Open the official store page for your browser and click **Add to browser**:

- **Chrome Web Store (Chrome / Brave / most Chromium browsers):**  
  https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

- **Microsoft Edge Add-ons:**  
  https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd

---

### 2) Enable Developer Mode (required on some setups)
This helps UserScripts run properly.

#### Chrome
1. Go to: `chrome://extensions/`
2. Toggle **Developer mode** (top-right)

#### Brave
1. Go to: `brave://extensions/`
2. Toggle **Developer mode** (top-right)

#### Edge
1. Go to: `edge://extensions/`
2. Toggle **Developer mode**

---

### 3) Tampermonkey recommended settings
1. Click the **Tampermonkey** icon in the browser toolbar
2. Open **Dashboard**
3. Go to **Settings**
4. Recommended:
   - ✅ **Script update**: Enabled
   - ✅ **Check for updates**: Daily (or more)

---

### 4) Install FL Movie Wall
1. Open:
   https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js
2. Tampermonkey will open an install page
3. Click **Install**

Done ✅

---

## ▶️ Use it
Open Filelist browse:
- https://filelist.io/browse.php

You’ll see the panel + grid (depending on your saved view mode).

---

## ⚙️ Features

- Persistent genre filter (saved)
- **Genre learning per Filelist category:** the script remembers genres it discovers over time (even if they’re not on the current page), so your genre list grows as you browse that category
- Movie poster grid view
- Thumbnails fetched from `details.php` and cached
- Rating extracted from `details.php` and shown on cards (cached)
- Draggable control panel (position remembered)
- Grid / List toggle
- Hide original list option
- Lightweight — no external dependencies

### 🎬 Trailer preview (card hover)
- **Hover any poster card for 3 seconds** → trailer preview popup opens automatically (if the details page has a YouTube embed)
- **Loading indicator:** a small progress bar animates at the bottom of the card while arming
- **Autoplay muted**
- **Pin/unpin:** click empty space on a card (not links) to pin/unpin the popup
- Press **Esc** to close

---

## 🔄 Updates

The script supports automatic updates via the `@updateURL` and `@downloadURL` fields.

New version workflow:
- Edit `dist/fl-movie-wall.user.js`
- Increase `@version`
- Push to `main`

Users receive updates automatically.
