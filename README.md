# FL Movie Wall

[![Release](https://img.shields.io/github/v/release/Mariancov/fl-movie-wall?label=release)](https://github.com/Mariancov/fl-movie-wall/releases)
[![Stars](https://img.shields.io/github/stars/Mariancov/fl-movie-wall?style=flat)](https://github.com/Mariancov/fl-movie-wall/stargazers)
[![Issues](https://img.shields.io/github/issues/Mariancov/fl-movie-wall)](https://github.com/Mariancov/fl-movie-wall/issues)

Userscript (Tampermonkey / Violentmonkey) that turns Filelist browse into a movie wall:

- Persistent genre filter
- Poster grid (thumbs via details.php + cache)
- OG FL-inspired UI
- Draggable panel with remembered position
- Grid/List toggle + Hide list

## Install (auto-update)
➡️ **Install / Update**
https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js

Open the link, Tampermonkey will prompt Install.

## Updates
Bump `@version` inside `dist/fl-movie-wall.user.js`, then push to `main`.

## Release flow
Tag a release:

```bash
git tag v2.5
git push --tags
