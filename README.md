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

## 🧩 Step-by-step: install Tampermonkey (Chrome / Edge / Brave)

### 1) Install the Tampermonkey extension
Open the official store page for your browser and click **Add to browser**:

- **Chrome Web Store (Chrome / Brave / most Chromium browsers):**  
  https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

- **Microsoft Edge Add-ons:**  
  https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd

> If your browser blocks install from stores, you can also search “Tampermonkey extension” in your browser’s extension store.

---

### 2) Make sure extensions can run “UserScripts”
Some browsers require enabling UserScripts / Developer options.

#### Brave
1. Go to: `brave://extensions/`
2. Toggle **Developer mode** (top-right)
3. Click **Tampermonkey**
4. Enable **Allow access to file URLs** (optional) and **Allow in private** (optional)
5. Make sure Tampermonkey is **Enabled**

#### Chrome
1. Go to: `chrome://extensions/`
2. Toggle **Developer mode** (top-right)
3. Click **Tampermonkey**
4. (Optional) Enable **Allow in incognito**
5. Make sure Tampermonkey is **Enabled**

#### Edge
1. Go to: `edge://extensions/`
2. Toggle **Developer mode**
3. Click **Tampermonkey**
4. Make sure it’s **Enabled**

> Note: You generally do **not** need “file access” for this script (it runs on `filelist.io`), but enabling Developer mode helps in some setups.

---

### 3) Enable Tampermonkey settings (recommended)
1. Click the **Tampermonkey** icon in the browser toolbar
2. Open **Dashboard**
3. Go to **Settings**
4. Recommended toggles:
   - ✅ **Config mode**: **Beginner** or **Advanced** (either works)
   - ✅ **Check for updates**: **Daily** (or more frequent if you want)
   - ✅ **Script update**: **Enabled**

---

### 4) Install FL Movie Wall
1. Open this link:
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

