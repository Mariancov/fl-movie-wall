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

**FL Movie Wall** is a lightweight userscript that transforms Filelist browse pages into a modern **poster grid** while keeping the classic OG Filelist look.

No plugins. No bloat. Just one script.

---

## 🚀 Install / Update (Auto-Update Enabled)

👉 Install / Update Script:

https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js

Open the link and Tampermonkey (or Violentmonkey) will prompt **Install** automatically.

---

## 🧩 Step-by-step: install Tampermonkey (Chrome / Edge / Brave)

### 1) Install the Tampermonkey extension
Open the official store page for your browser and click **Add to browser**:

- **Chrome Web Store (Chrome / Brave / most Chromium browsers):**  
  https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

- **Microsoft Edge Add-ons:**  
  https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd

---

### 2) Enable Developer Mode (required in some setups)
This helps browsers allow userscripts properly.

#### Brave
1. Open: `brave://extensions/`
2. Toggle **Developer mode** (top-right)
3. Click **Tampermonkey**
4. Make sure **Enabled** is ON  
   (Optional: **Allow in private**)

#### Chrome
1. Open: `chrome://extensions/`
2. Toggle **Developer mode** (top-right)
3. Click **Tampermonkey**
4. Make sure **Enabled** is ON  
   (Optional: **Allow in incognito**)

#### Edge
1. Open: `edge://extensions/`
2. Toggle **Developer mode**
3. Click **Tampermonkey**
4. Make sure **Enabled** is ON

---

### 3) Tampermonkey settings (recommended)
1. Click the **Tampermonkey** icon in the toolbar
2. Open **Dashboard**
3. Go to **Settings**
4. Recommended:
   - ✅ **Script update**: Enabled
   - ✅ **Check for updates**: Daily (or more often)

---

### 4) Install FL Movie Wall
1. Open:
   https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js
2. Tampermonkey opens the install screen
3. Click **Install**

Done ✅

---

## ▶️ Use it
Open Filelist browse:
- https://filelist.io/browse.php

You’ll see the panel + grid (depending on your saved view mode).

---

## ⚙️ Features

- **Poster grid view** (OG Filelist vibe)
- **Persistent genre filters**
- **Genres learned per Filelist category (`cat`)**  
  The script remembers genres you encounter for each category (Filme HD-RO, Filme 4K, etc.) so the list becomes complete over time.
- **Old genre format fix**  
  If Filelist shows genres like `Action | Comedy | Crime | Thriller`, the script auto-splits them (no more “one huge genre” duplicates).
- **Thumbnails + rating + trailer id pulled from `details.php` (cached)**  
  Faster after first load (local cache).
- **Draggable control panel** (position remembered)
- **Grid / List toggle**
- **Hide original list**
- **Trailer preview on card hover (3s delay)**  
  Hover a poster card for 3 seconds → trailer popup opens automatically (autoplay muted) if a YouTube trailer exists on the details page.
- **Hover arming indicator**  
  A small progress bar animates at the bottom of the card while it’s “arming” the trailer preview.
- **Trailer popup pinning**
  - Click empty space on a card (not links) to pin/unpin the trailer popup
  - Press **Esc** to close
- **Auto-fill results after filtering (less empty pages)**  
  If filtering leaves only a few visible items, the script can load the next pages automatically until it reaches about **20 visible results** (or hits limits).

---

## 🔄 Updates

This userscript supports automatic updates via `@updateURL` and `@downloadURL`.

Workflow:
- Edit `dist/fl-movie-wall.user.js`
- Increase `@version`
- Push to `main`

Users will receive updates automatically (depending on their Tampermonkey update settings).

---

## 🆕 What’s new (since v2.5)
When users install/update to the latest version, the script shows a one-time popup with:
- Trailer preview on hover (3s) + progress bar
- Better rating extraction
- Genre learning per Filelist category (`cat`)
- Old `Action | Comedy | ...` format auto-splitting
- Auto-fill to reduce pages with 0–5 results
- UI fix: Refresh button stays inside the draggable panel header

---
