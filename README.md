🎬 FL Movie Wall

Turn Filelist browse into a cinematic movie wall.

Release
 • Issues

✨ What is FL Movie Wall?

A lightweight userscript that transforms Filelist browse pages into a modern poster grid while keeping the OG Filelist look and performance.

No plugins. No extensions. Just one script.

🚀 Install (Auto Update Enabled)

Install / Update Script:

https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js

Open the link and Tampermonkey or Violentmonkey will prompt Install automatically.

⚙️ Features

Persistent genre filter

Poster movie grid

Thumbnails from details.php (cached)

Draggable panel with saved position

Grid / List toggle

Hide original list option

Lightweight and fast

🔄 Updates

The script updates automatically thanks to the updateURL and downloadURL fields inside the userscript header.

To release a new version:

Edit dist/fl-movie-wall.user.js

Increase version number (example: 2.4 → 2.5)

Push changes to main

Users will receive the update automatically.

🏷️ Release Flow (Optional)

Create a release tag:

git tag v2.5
git push --tags

GitHub Actions will create a Release and attach the userscript.

🧰 Troubleshooting

Posters missing?

Open browser console and run:

localStorage.removeItem('fl_thumb_cache_v1')
location.reload()

📁 Project Structure

dist → Installable userscript
src → Source copy
.github → workflows and templates

⚠️ Disclaimer

Unofficial community userscript.
Not affiliated with Filelist.

⭐ Support

If you like this project:

Star the repo
Open issues
Suggest features
