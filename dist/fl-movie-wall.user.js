// ==UserScript==
// @name         Filelist Genre Filter + Movie Grid (OG FL look + draggable panel)
// @namespace    https://github.com/Mariancov/fl-movie-wall
// @version      2.6
// @description  Filter Filelist torrents by genre (persistent per category) + poster grid (thumbs via details.php + cache). OG Filelist-inspired design + draggable panel with remembered position.
// @author       Mariancov
// @match        https://filelist.io/browse.php*
// @match        https://www.filelist.io/browse.php*
// @run-at       document-end
// @grant        none
//
// @homepageURL  https://github.com/Mariancov/fl-movie-wall
// @supportURL   https://github.com/Mariancov/fl-movie-wall/issues
// @updateURL    https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js
// @downloadURL  https://raw.githubusercontent.com/Mariancov/fl-movie-wall/main/dist/fl-movie-wall.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ---------------- Keys ----------------
  // Filters are now stored PER CATEGORY (cat=...) so filters don't mix between "Filme HD-RO" / "Filme 4K" etc.
  const FILTER_BY_CAT_KEY = 'fl_genre_filter_bycat_v1';   // { [catKey]: { [genre]: true } }
  const GENRE_BANK_KEY    = 'fl_genre_bank_bycat_v1';     // { [catKey]: { [genreLower]: "Original Genre" } }

  const UI_KEY   = 'fl_genre_ui_v2';
  const VIEW_KEY = 'fl_genre_view_v2';

  // Panel position memory
  const PANEL_POS_KEY = 'fl_panel_pos_v1';

  // Details meta cache
  const META_CACHE_KEY = 'fl_thumb_cache_v3'; // {thumb,rating,ytId,ts}
  const META_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const FETCH_CONCURRENCY = 4;

  // Plex (kept, but currently hidden by CSS)
  const PLEX_HANDOFF_KEY = 'flmw_plex_handoff_v1';
  const PLEX_WEB_URL = 'https://app.plex.tv/desktop#!/';

  // Card hover trailer preview
  const CARD_HOVER_OPEN_MS = 1000; // you asked 3 seconds
  const CARD_HOVER_CLOSE_MS = 220;
  const CARD_PREVIEW_REQUIRE_YT = true; // only arm if ytId exists
  const CARD_PREVIEW_AUTOPLAY_MUTED = true;

  const DEFAULT_UI = {
    collapsed: false,
    cardSize: 180,
    hideOriginal: true,
    query: '',
  };

  function log(...a) { console.log('[FL Grid]', ...a); }
  function safeJSONParse(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

  // ---------------- Category handling ----------------
  function getCurrentCatKey() {
    // prefer URL cat param, fallback to select[name=cat]
    try {
      const u = new URL(location.href);
      const cat = (u.searchParams.get('cat') || '').trim();
      if (cat) return `cat:${cat}`;
    } catch {}

    const sel = document.querySelector('select[name="cat"]');
    const v = (sel && sel.value) ? String(sel.value).trim() : '';
    return `cat:${v || '0'}`; // 0 == (toate)
  }

  function getCurrentCatLabel() {
    const sel = document.querySelector('select[name="cat"]');
    if (!sel) return '';
    const opt = sel.querySelector('option:checked');
    return (opt?.textContent || '').trim();
  }

  // ---------------- Genre normalization (THIS FIXES your issue) ----------------
  function normalizeGenreToken(s) {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    return t;
  }

  function extractGenres(text) {
    // Accepts:
    // - "[Action, Comedy, Crime]"
    // - "Action | Comedy | Crime | Thriller"
    // - "Action / Comedy" or "Action • Comedy" etc.
    const s = String(text || '').trim();
    if (!s) return [];

    // remove [] wrappers if present
    const noBrackets = s.replace(/^\s*\[|\]\s*$/g, '');

    // normalize separators => comma
    const normalized = noBrackets
      .replace(/\s*\|\s*/g, ',')
      .replace(/\s*\/\s*/g, ',')
      .replace(/\s*•\s*/g, ',')
      .replace(/\s*·\s*/g, ',')
      .replace(/\s*;\s*/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const out = [];
    const seen = new Set();

    normalized.split(',').forEach(part => {
      const g = normalizeGenreToken(part);
      if (!g) return;
      const key = g.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(g);
    });

    return out;
  }

  // ---------------- Storage: filters per category ----------------
  function loadAllFilters() {
    return safeJSONParse(localStorage.getItem(FILTER_BY_CAT_KEY) || '{}', {});
  }
  function saveAllFilters(obj) {
    localStorage.setItem(FILTER_BY_CAT_KEY, JSON.stringify(obj || {}));
  }
  function getSavedFilter() {
    const catKey = getCurrentCatKey();
    const all = loadAllFilters();
    const raw = all[catKey] || {};
    return normalizeFilterKeys(raw);
  }
  function saveFilter(sel) {
    const catKey = getCurrentCatKey();
    const all = loadAllFilters();
    all[catKey] = normalizeFilterKeys(sel || {});
    saveAllFilters(all);
  }

  // auto-migrate weird keys like "Action | Comedy" -> {Action:true,Comedy:true}
  function normalizeFilterKeys(filterObj) {
    const out = {};
    for (const [k, v] of Object.entries(filterObj || {})) {
      if (!v) continue;
      extractGenres(k).forEach(g => { out[g] = true; });
    }
    return out;
  }

  // ---------------- Storage: learned genres per category ----------------
  function loadGenreBank() {
    return safeJSONParse(localStorage.getItem(GENRE_BANK_KEY) || '{}', {});
  }
  function saveGenreBank(obj) {
    localStorage.setItem(GENRE_BANK_KEY, JSON.stringify(obj || {}));
  }

  function learnGenresForCurrentCategory(genresArr) {
    const catKey = getCurrentCatKey();
    const bank = loadGenreBank();
    bank[catKey] = bank[catKey] || {}; // { lower: Original }

    (genresArr || []).forEach(g => {
      const clean = normalizeGenreToken(g);
      if (!clean) return;
      const lower = clean.toLowerCase();
      // keep first seen capitalization (or update - but stable looks nicer)
      if (!bank[catKey][lower]) bank[catKey][lower] = clean;
    });

    saveGenreBank(bank);
  }

  function getLearnedGenresForCurrentCategory() {
    const catKey = getCurrentCatKey();
    const bank = loadGenreBank();
    const obj = bank[catKey] || {};
    return Object.values(obj)
      .map(normalizeGenreToken)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  // ---------------- UI state ----------------
  function getUIState() { return { ...DEFAULT_UI, ...(safeJSONParse(localStorage.getItem(UI_KEY) || '{}', {})) }; }
  function saveUIState(data) { localStorage.setItem(UI_KEY, JSON.stringify(data || {})); }

  function getViewMode() { return localStorage.getItem(VIEW_KEY) || 'grid'; }
  function setViewMode(mode) { localStorage.setItem(VIEW_KEY, mode); }

  // Panel position
  function getPanelPos() { return safeJSONParse(localStorage.getItem(PANEL_POS_KEY) || 'null', null); }
  function savePanelPos(pos) { localStorage.setItem(PANEL_POS_KEY, JSON.stringify(pos)); }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function escapeHtml(s) {
    return String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeToAbs(url) {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return location.origin + url;
    return location.origin + '/' + url;
  }

  // ---------------- Page scan ----------------
  function findGenreFont(row) {
    return [...row.querySelectorAll('font.small')]
      .find(f => f.textContent.includes('[') && f.textContent.includes(']'));
  }

  function getAllRows() { return [...document.querySelectorAll('.torrentrow')]; }

  function scanGenresFromPageRows() {
    // Scans what's currently visible on this browse page
    const set = new Map(); // lower -> original
    getAllRows().forEach(row => {
      const f = findGenreFont(row);
      if (!f) return;
      const arr = extractGenres(f.textContent);
      arr.forEach(g => {
        const lower = g.toLowerCase();
        if (!set.has(lower)) set.set(lower, g);
      });
    });
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }

  function getAllGenresForThisCategory() {
    // learned (bank) + current page scan
    const learned = getLearnedGenresForCurrentCategory();
    const scanned = scanGenresFromPageRows();

    const map = new Map();
    learned.forEach(g => map.set(g.toLowerCase(), g));
    scanned.forEach(g => map.set(g.toLowerCase(), g));

    const all = [...map.values()].sort((a, b) => a.localeCompare(b));

    // learn newly discovered ones
    learnGenresForCurrentCategory(all);

    return all;
  }

  function applyFilter(selected) {
    const sel = normalizeFilterKeys(selected || {});
    const hasSelection = Object.keys(sel).length > 0;

    getAllRows().forEach(row => {
      const f = findGenreFont(row);
      if (!f) return;

      const genres = extractGenres(f.textContent);
      const show = !hasSelection || genres.some(g => sel[g]);

      row.style.display = show ? '' : 'none';
      row.dataset.flVisible = show ? '1' : '0';
    });
  }

  // ---------- Trailer popup ----------
  let hoverOpenT = 0;
  let hoverCloseT = 0;
  let popPinned = false;
  let armedCard = null;

  function ensureTrailerPopup() {
    if (document.getElementById('fl-trailer-pop')) return;

    const pop = document.createElement('div');
    pop.id = 'fl-trailer-pop';
    pop.style.cssText = `
      position: fixed;
      z-index: 99999999;
      width: min(520px, calc(100vw - 24px));
      background: rgba(15,22,32,.98);
      border: 1px solid #263141;
      border-radius: 12px;
      box-shadow: 0 18px 65px rgba(0,0,0,.65);
      overflow: hidden;
      display: none;
      font: 12px/1.35 Tahoma,Verdana,Arial,sans-serif;
      color: #d7dde6;
    `;

    pop.innerHTML = `
      <div style="
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding: 8px 10px;
        border-bottom: 1px solid #263141;
        background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0));
      ">
        <b style="letter-spacing:.2px;">Trailer preview</b>
        <div style="display:flex;gap:8px;align-items:center;">
          <span id="fl-trailer-pop-pin" title="Pin/unpin" style="cursor:pointer;opacity:.9;">📌</span>
          <span id="fl-trailer-pop-x" title="Close" style="cursor:pointer;opacity:.9;">✕</span>
        </div>
      </div>
      <div style="padding: 10px;">
        <div id="fl-trailer-pop-title" style="font-weight:800;margin-bottom:8px;opacity:.95;"></div>
        <div style="position:relative; width:100%; aspect-ratio:16/9; background:#000; border-radius:10px; overflow:hidden;">
          <iframe id="fl-trailer-pop-iframe"
            src=""
            style="position:absolute; inset:0; width:100%; height:100%; border:0;"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
        <div style="margin-top:8px; color:#97a4b6; font-size:11px;">
          Hover 3s on a card to preview • Click empty card space to pin • Esc closes
        </div>
      </div>
    `;

    pop.addEventListener('mouseenter', () => clearTimeout(hoverCloseT));
    pop.addEventListener('mouseleave', () => { if (!popPinned) scheduleClosePopup(); });

    pop.querySelector('#fl-trailer-pop-x').addEventListener('click', () => {
      popPinned = false;
      closePopup(true);
    });

    pop.querySelector('#fl-trailer-pop-pin').addEventListener('click', () => {
      popPinned = !popPinned;
      pop.querySelector('#fl-trailer-pop-pin').textContent = popPinned ? '📍' : '📌';
      if (!popPinned) scheduleClosePopup();
    });

    document.body.appendChild(pop);
  }

  function positionPopupNearCard(cardEl) {
    const pop = document.getElementById('fl-trailer-pop');
    if (!pop || !cardEl) return;

    const r = cardEl.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const margin = 10;

    let left = r.right + margin;
    let top = r.top;

    if (left + popRect.width > window.innerWidth - margin) {
      left = r.left - popRect.width - margin;
    }
    left = clamp(left, margin, window.innerWidth - popRect.width - margin);
    top = clamp(top, margin, window.innerHeight - popRect.height - margin);

    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
  }

  function openPopup(ytId, title, cardEl) {
    ensureTrailerPopup();
    const pop = document.getElementById('fl-trailer-pop');
    const iframe = document.getElementById('fl-trailer-pop-iframe');
    const titleEl = document.getElementById('fl-trailer-pop-title');

    clearTimeout(hoverCloseT);

    const qp = new URLSearchParams();
    if (CARD_PREVIEW_AUTOPLAY_MUTED) {
      qp.set('autoplay', '1');
      qp.set('mute', '1');
    } else {
      qp.set('autoplay', '0');
    }
    qp.set('rel', '0');

    titleEl.textContent = title || 'Trailer';
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(ytId)}?${qp.toString()}`;

    pop.style.display = 'block';
    requestAnimationFrame(() => positionPopupNearCard(cardEl));
  }

  function closePopup(force) {
    const pop = document.getElementById('fl-trailer-pop');
    const iframe = document.getElementById('fl-trailer-pop-iframe');
    if (!pop) return;

    if (!force && popPinned) return;

    pop.style.display = 'none';
    if (iframe) iframe.src = '';
  }

  function scheduleClosePopup() {
    clearTimeout(hoverCloseT);
    hoverCloseT = setTimeout(() => closePopup(false), CARD_HOVER_CLOSE_MS);
  }

  function setCardArming(cardEl, on) {
    if (!cardEl) return;
    cardEl.classList.toggle('fl-card-arming', !!on);
    cardEl.setAttribute('data-fl-arming', on ? '1' : '0');
  }

  function armCardPreview(cardEl) {
    clearTimeout(hoverOpenT);
    if (!cardEl) return;
    if (popPinned) return;

    const yt = cardEl.getAttribute('data-fl-yt') || '';
    if (CARD_PREVIEW_REQUIRE_YT && !yt) return;

    setCardArming(cardEl, true);
    armedCard = cardEl;

    hoverOpenT = setTimeout(() => {
      if (!cardEl.isConnected) return;
      if (popPinned) return;

      const ytId = cardEl.getAttribute('data-fl-yt') || '';
      const title = cardEl.getAttribute('data-fl-title') || '';
      if (!ytId) { setCardArming(cardEl, false); return; }

      setCardArming(cardEl, false);
      openPopup(ytId, title, cardEl);
    }, CARD_HOVER_OPEN_MS);
  }

  function disarmCardPreview(cardEl) {
    clearTimeout(hoverOpenT);
    if (cardEl) setCardArming(cardEl, false);
    if (!popPinned) scheduleClosePopup();
    armedCard = null;
  }

  // ---------- Styles ----------
  function injectStyles() {
    if (document.getElementById('fl-grid-styles')) return;

    const style = document.createElement('style');
    style.id = 'fl-grid-styles';

    style.textContent = `
      :root{
        --fl-bg: #0b1016;
        --fl-panel: #0f1620;
        --fl-panel2: #0c121a;
        --fl-border: #263141;
        --fl-border2:#1b2431;
        --fl-text: #d7dde6;
        --fl-muted:#97a4b6;
        --fl-accent:#7bd21f;
        --fl-shadow: rgba(0,0,0,.55);

        --plex-yellow: #e5a00d;
        --plex-yellow2:#ffd36b;
      }

      #fl-genre-panel{
        position:fixed;
        z-index: 999999;
        width: 372px;
        max-width: calc(100vw - 24px);
        color: var(--fl-text);
        background: linear-gradient(180deg, rgba(21,30,42,.98), rgba(11,16,22,.98));
        border: 1px solid var(--fl-border);
        border-radius: 10px;
        box-shadow: 0 18px 55px var(--fl-shadow);
        overflow: hidden;
        font: 12px/1.3 Tahoma, Verdana, Arial, sans-serif;
        user-select: none;
      }
      #fl-genre-panel *{box-sizing:border-box;}
     #fl-genre-panel .hdr{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding: 10px 10px 8px;
  gap: 10px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0)),
    linear-gradient(90deg, rgba(123,210,31,.18), rgba(123,210,31,0) 35%);
  border-bottom: 1px solid var(--fl-border);
  cursor: grab;

  /* FIX: prevent overflow */
  min-width: 0;
}
      #fl-genre-panel.dragging .hdr{ cursor: grabbing; }
     #fl-genre-panel .hdr b{
  font-size: 12.5px;
  letter-spacing: .2px;
  text-shadow: 0 0 12px rgba(123,210,31,.18);
  user-select:none;

  /* FIX: let title shrink instead of pushing buttons out */
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
      #fl-genre-panel .hdr .btn{
        cursor:pointer;
        user-select:none;
        padding: 5px 9px;
        border-radius: 7px;
        border: 1px solid var(--fl-border);
        background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
        color: var(--fl-text);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
      }
      #fl-genre-panel .hdr .btn:hover{
        border-color: rgba(123,210,31,.45);
        box-shadow: 0 0 0 2px rgba(123,210,31,.08), inset 0 1px 0 rgba(255,255,255,.05);
      }
      #fl-genre-panel .body{
        padding: 10px;
        background: radial-gradient(800px 300px at 15% 0%, rgba(123,210,31,.08), rgba(0,0,0,0) 55%);
        user-select: text;
      }
      #fl-genre-panel .row{display:flex;gap:8px;align-items:center;margin:8px 0;}
      #fl-genre-panel .hint{margin: 6px 0 2px;color: var(--fl-muted);font-size: 11px;}

      #fl-genre-panel input[type="text"]{
        width:100%;
        padding: 8px 9px;
        border-radius: 8px;
        border: 1px solid var(--fl-border2);
        background: linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.18));
        color: var(--fl-text);
        outline: none;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
      }
      #fl-genre-panel input[type="text"]:focus{
        border-color: rgba(123,210,31,.55);
        box-shadow: 0 0 0 2px rgba(123,210,31,.10), inset 0 1px 0 rgba(255,255,255,.04);
      }
      #fl-genre-panel input[type="range"]{ width:100%; accent-color: var(--fl-accent); }

      #fl-genre-panel .pillbar{display:flex;gap:7px;flex-wrap:wrap;margin-top:2px;}
      #fl-genre-panel .pill{
        cursor:pointer;user-select:none;
        padding: 6px 9px;border-radius:999px;
        border: 1px solid var(--fl-border);
        background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.015));
        color: var(--fl-text);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
        font-size: 11px;
      }
      #fl-genre-panel .pill:hover{ border-color: rgba(123,210,31,.45); }
      #fl-genre-panel .pill.active{
        border-color: rgba(123,210,31,.65);
        background: linear-gradient(180deg, rgba(123,210,31,.22), rgba(123,210,31,.08));
        box-shadow: 0 0 16px rgba(123,210,31,.15), inset 0 1px 0 rgba(255,255,255,.05);
      }

      #fl-genre-panel .genrelist{
        margin-top: 8px;
        max-height: 44vh;
        overflow: auto;
        padding-right: 4px;
        border: 1px solid var(--fl-border2);
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.12));
      }
      #fl-genre-panel .genrelist label{
        display:flex;gap: 8px;align-items:center;
        cursor:pointer;padding: 7px 8px;
        border-bottom: 1px dashed rgba(255,255,255,.06);
      }
      #fl-genre-panel .genrelist label:hover{ background: rgba(123,210,31,.06); }
      #fl-genre-panel .genrelist input{ transform: translateY(1px); accent-color: var(--fl-accent); }

      #fl-genre-panel.collapsed .body{display:none;}

      #fl-grid-wrap{
        width: min(1320px, calc(100% - 28px));
        margin: 14px auto 40px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid var(--fl-border);
        background: linear-gradient(180deg, rgba(16,24,34,.68), rgba(10,15,21,.68));
        box-shadow: 0 10px 35px rgba(0,0,0,.25);
      }
      #fl-grid-head{
        display:flex;align-items:center;justify-content:space-between;
        gap: 12px;margin-bottom: 10px;padding: 8px 10px;
        border: 1px solid var(--fl-border2);border-radius: 9px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.01)),
          radial-gradient(600px 120px at 10% 0%, rgba(123,210,31,.12), rgba(0,0,0,0) 55%);
      }
      #fl-grid-head .meta{ color: var(--fl-muted); font: 12px/1.3 Tahoma, Verdana, Arial, sans-serif; }
      #fl-grid-head .meta strong{ color: var(--fl-text); }

      #fl-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(var(--fl-card), 1fr)); gap: 10px; }

      .fl-card{
        position: relative;
        border-radius: 10px; overflow: hidden;
        border: 1px solid var(--fl-border);
        background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.01));
        box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 10px 22px rgba(0,0,0,.25);
        transition: transform .08s ease, box-shadow .08s ease, border-color .08s ease;
      }
      .fl-card:hover{
        transform: translateY(-2px);
        border-color: rgba(123,210,31,.45);
        box-shadow: 0 14px 28px rgba(0,0,0,.35), 0 0 0 2px rgba(123,210,31,.08), inset 0 1px 0 rgba(255,255,255,.04);
      }

      /* 3s arming bar at bottom of the CARD */
      .fl-card::after{
        content:"";
        position:absolute;
        left: 10px;
        right: 10px;
        bottom: 10px;
        height: 3px;
        border-radius: 99px;
        background: rgba(255,255,255,.10);
        transform-origin: left center;
        transform: scaleX(0);
        opacity: 0;
        pointer-events:none;
      }
      .fl-card.fl-card-arming::after{
        opacity: 1;
        animation: flCardArm ${CARD_HOVER_OPEN_MS}ms linear forwards;
        background: linear-gradient(90deg, rgba(120,180,255,.0), rgba(120,180,255,.95));
      }
      @keyframes flCardArm{
        from{ transform: scaleX(0); }
        to{ transform: scaleX(1); }
      }

      .fl-card a{ text-decoration:none; color: inherit; }
      .fl-poster{
        width: 100%; aspect-ratio: 2 / 3; position: relative; overflow:hidden;
        background:
          radial-gradient(800px 240px at 20% 0%, rgba(123,210,31,.10), rgba(0,0,0,0) 60%),
          linear-gradient(180deg, rgba(0,0,0,.30), rgba(0,0,0,.12));
      }
      .fl-poster img{
        width:100%; height:100%; object-fit: cover; display:block;
        filter: contrast(1.03) saturate(1.03);
      }
      .fl-poster::after{
        content:""; position:absolute; left:0; right:0; top:0; height: 22px;
        background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,0));
        pointer-events:none;
      }
      .fl-poster .loading{
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        color: var(--fl-muted); font-size: 11px; letter-spacing:.2px;
        background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.08), rgba(255,255,255,.03));
        animation: flshimmer 1.1s infinite linear;
      }
      @keyframes flshimmer{0%{filter:brightness(1);}50%{filter:brightness(1.2);}100%{filter:brightness(1);}}

      .fl-info{
        padding: 9px 9px 10px;
        border-top: 1px solid rgba(255,255,255,.06);
        background: linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.12));
      }
      .fl-title{
        font-weight: 700; font-size: 12px; line-height: 1.25;
        color: var(--fl-text); text-shadow: 0 1px 0 rgba(0,0,0,.5);
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .fl-sub{
        display:flex; flex-wrap:wrap; gap: 6px 10px;
        color: var(--fl-muted); font-size: 11px; margin-top: 6px;
      }
      .fl-badges{ margin-top: 8px; display:flex; gap: 6px; flex-wrap:wrap; align-items:center; }
      .fl-badge{
        font-size: 10.5px; padding: 4px 7px; border-radius: 999px;
        border: 1px solid var(--fl-border2);
        background: linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.08));
        color: var(--fl-text);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
      }
      .fl-badge.dl{
        border-color: rgba(123,210,31,.40);
        background: linear-gradient(180deg, rgba(123,210,31,.22), rgba(123,210,31,.08));
        color: #eaffd0;
      }

      body.fl-hide-original .torrentrow{ display:none !important; }

      /* TEMP: hide all Plex buttons */
      .flmw-plex-pill,
      .fl-badge.plex {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  // ---------- Plex ----------
  function plexNormalizeTitle(raw) {
    return String(raw || '')
      .replace(/[\._]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function plexSaveHandoff(payload) {
    localStorage.setItem(PLEX_HANDOFF_KEY, JSON.stringify(payload || {}));
  }

  function plexOpen(title, fromUrl) {
    const t = plexNormalizeTitle(title);
    if (!t) return;

    plexSaveHandoff({
      title: t,
      rawTitle: title,
      fromUrl: fromUrl || location.href,
      ts: Date.now(),
    });

    const url = `${PLEX_WEB_URL}?flmw_title=${encodeURIComponent(t)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function addPlexButtonsToRows() {
    const rows = getAllRows();
    rows.forEach(row => {
      if (row.dataset.flmwPlexInjected === '1') return;

      const dlA =
        row.querySelector('a[href^="download.php?id="]') ||
        row.querySelector('a[href*="download.php?id="]');
      if (!dlA) return;

      const titleA =
        row.querySelector('a[href^="details.php?id="]') ||
        row.querySelector('a[href*="details.php?id="]');
      if (!titleA) return;

      const rawTitle = (titleA.textContent || '').trim();
      if (!rawTitle) return;

      const cellSpan = dlA.closest('span');
      if (cellSpan) {
        const current = (cellSpan.style.width || '').trim();
        if (!current || current === '30px') cellSpan.style.width = '120px';
        cellSpan.style.overflow = 'visible';
        cellSpan.style.whiteSpace = 'nowrap';
      }

      const btn = document.createElement('a');
      btn.href = '#';
      btn.className = 'flmw-plex-pill';
      btn.textContent = 'PLEX';
      btn.title = 'Play in Plex after download';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        plexOpen(rawTitle, location.href);
      });

      dlA.parentElement?.appendChild(btn);
      row.dataset.flmwPlexInjected = '1';
    });
  }

  // ---------- Details meta ----------
  function loadMetaCache() { return safeJSONParse(localStorage.getItem(META_CACHE_KEY) || '{}', {}); }
  function saveMetaCache(cache) { localStorage.setItem(META_CACHE_KEY, JSON.stringify(cache || {})); }

  function getCachedMeta(detailsUrlAbs) {
    const cache = loadMetaCache();
    const item = cache[detailsUrlAbs];
    if (!item) return null;
    if (Date.now() - (item.ts || 0) > META_TTL_MS) return null;
    return item;
  }

  function setCachedMeta(detailsUrlAbs, meta) {
    const cache = loadMetaCache();
    cache[detailsUrlAbs] = { ...(meta || {}), ts: Date.now() };
    saveMetaCache(cache);
  }

  function extractThumbFromDetailsHTML(html) {
    if (!html) return null;
    let m = html.match(/https?:\/\/image\.tmdb\.org\/t\/p\/w300_and_h450_bestv2\/+[^"'<> ]+\.(jpg|jpeg|png|webp)/i);
    if (m && m[0]) return m[0];
    m = html.match(/https?:\/\/image\.tmdb\.org\/t\/p\/[^"'<> ]+\/+[^"'<> ]+\.(jpg|jpeg|png|webp)/i);
    if (m && m[0]) return m[0];
    return null;
  }

  function extractStarRatingFromDetailsHTML(html) {
    // robust: find a span that CONTAINS the starbig image, then read numeric text
    if (!html) return null;
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const img = doc.querySelector('img[src*="starbig.png"]');
      if (!img) return null;

      const span = img.closest('span') || img.parentElement;
      if (!span) return null;

      const clone = span.cloneNode(true);
      clone.querySelectorAll('img').forEach(i => i.remove());

      const txt = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      const m = txt.match(/(\d{1,2}(?:[.,]\d{1,2})?)/);
      return m?.[1] ? m[1].replace(',', '.') : null;
    } catch {
      return null;
    }
  }

  function extractYouTubeIdFromDetailsHTML(html) {
    if (!html) return null;
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const iframe = doc.querySelector('iframe[src*="youtube.com/embed/"]');
      const src = iframe?.getAttribute('src') || '';
      const m = src.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
      return m?.[1] || null;
    } catch {
      return null;
    }
  }

  async function fetchDetailsMeta(detailsUrl) {
    const abs = normalizeToAbs(detailsUrl);
    const cached = getCachedMeta(abs);
    if (cached) return cached;

    try {
      const res = await fetch(abs, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      const meta = {
        thumb: extractThumbFromDetailsHTML(html),
        rating: extractStarRatingFromDetailsHTML(html),
        ytId: extractYouTubeIdFromDetailsHTML(html),
      };

      setCachedMeta(abs, meta);
      return meta;
    } catch (e) {
      log('Details meta fetch failed:', abs, e);
      setCachedMeta(abs, { thumb: null, rating: null, ytId: null });
      return { thumb: null, rating: null, ytId: null };
    }
  }

  // Simple concurrency queue
  function createQueue(limit) {
    let active = 0;
    const q = [];
    const next = () => {
      if (active >= limit) return;
      const job = q.shift();
      if (!job) return;
      active++;
      Promise.resolve()
        .then(job.fn)
        .then(job.resolve, job.reject)
        .finally(() => { active--; next(); });
    };
    return (fn) => new Promise((resolve, reject) => { q.push({ fn, resolve, reject }); next(); });
  }
  const runQueued = createQueue(FETCH_CONCURRENCY);

  // ---------- Row -> data ----------
  function getRowData(row) {
    const titleLink =
      row.querySelector('a[href^="details.php?id="]') ||
      row.querySelector('a[href*="details.php?id="]');

    const title = titleLink ? titleLink.textContent.trim() : 'Untitled';
    const detailsHref = titleLink ? titleLink.getAttribute('href') : '#';

    const downloadLink =
      row.querySelector('a[href^="download.php?id="]') ||
      row.querySelector('a[href*="download.php?id="]');

    const downloadHref = downloadLink ? downloadLink.getAttribute('href') : null;

    const gf = findGenreFont(row);
    const genres = gf ? extractGenres(gf.textContent) : [];

    // Best-effort thumb from browse tooltip
    let thumb = null;
    const spanWithTooltip = row.querySelector('[data-original-title*="tmdb"], [data-original-title*="img"]');
    if (spanWithTooltip) {
      const raw = spanWithTooltip.getAttribute('data-original-title') || '';
      const mm = raw.match(/https?:\/\/image\.tmdb\.org\/[^"'<> ]+\.(jpg|jpeg|png|webp)/i);
      if (mm && mm[0]) thumb = mm[0];
    }

    const smallFonts = [...row.querySelectorAll('font.small')].map(f => f.textContent.replace(/\s+/g, ' ').trim());

    let sizeText = null;
    for (const t of smallFonts) {
      if (/\b(GB|MB|KB|TB)\b/i.test(t)) { sizeText = t.replace(' times', '').trim(); break; }
    }

    let dateText = null;
    for (const t of smallFonts) {
      if (/\b\d{2}\/\d{2}\/\d{4}\b/.test(t)) { dateText = t.match(/\b\d{2}\/\d{2}\/\d{4}\b/)[0]; break; }
    }

    const bNums = [...row.querySelectorAll('b')]
      .map(b => b.textContent.trim())
      .filter(x => /^\d+$/.test(x))
      .map(x => Number(x));

    let seeds = null, leech = null;
    if (bNums.length >= 2) {
      seeds = bNums[bNums.length - 2];
      leech = bNums[bNums.length - 1];
    }

    return { title, detailsHref, downloadHref, genres, thumb, sizeText, dateText, seeds, leech };
  }

  // ---------- Grid ----------
  function applyCardSize(px) {
    const grid = document.getElementById('fl-grid');
    if (!grid) return;
    grid.style.setProperty('--fl-card', `${px}px`);
  }

  function syncHideOriginal(hide) {
    document.body.classList.toggle('fl-hide-original', !!hide);
  }

  function ensureGridWrap() {
    let wrap = document.getElementById('fl-grid-wrap');
    if (wrap) return wrap;

    wrap = document.createElement('div');
    wrap.id = 'fl-grid-wrap';
    wrap.innerHTML = `
      <div id="fl-grid-head">
        <div class="meta" id="fl-grid-meta"></div>
        <div class="meta" id="fl-grid-hint"></div>
      </div>
      <div id="fl-grid"></div>
    `;

    const firstRow = document.querySelector('.torrentrow');
    if (firstRow && firstRow.parentElement) firstRow.parentElement.insertBefore(wrap, firstRow);
    else document.body.insertBefore(wrap, document.body.firstChild);

    return wrap;
  }

  function setGridVisible(visible) {
    const wrap = ensureGridWrap();
    wrap.style.display = visible ? 'block' : 'none';
  }

  async function fillMetaForCards(items) {
    const jobs = items.map(it => runQueued(async () => {
      const absDetails = normalizeToAbs(it.detailsHref);
      const meta = await fetchDetailsMeta(absDetails);

      // poster
      if (meta.thumb) {
        const img = document.querySelector(`#${CSS.escape(it.cardId)} img[data-fl-poster="1"]`);
        const loader = document.querySelector(`#${CSS.escape(it.cardId)} .loading`);
        if (img) {
          img.src = meta.thumb;
          img.removeAttribute('data-fl-needs');
        }
        if (loader) loader.remove();
      } else {
        const loader = document.querySelector(`#${CSS.escape(it.cardId)} .loading`);
        if (loader) loader.textContent = 'No poster';
      }

      // rating badge
      const ratingEl = document.querySelector(`#${CSS.escape(it.cardId)} [data-fl-rating="1"]`);
      if (ratingEl) {
        if (meta.rating) {
          ratingEl.textContent = `⭐ ${meta.rating}`;
          ratingEl.style.display = '';
        } else {
          ratingEl.style.display = 'none';
        }
      }

      // yt id for preview
      const cardRoot = document.getElementById(it.cardId);
      if (cardRoot) {
        if (meta.ytId) cardRoot.setAttribute('data-fl-yt', meta.ytId);
        else cardRoot.removeAttribute('data-fl-yt');
        cardRoot.setAttribute('data-fl-title', it.title || '');
      }
    }));

    await Promise.allSettled(jobs);
  }

  function rebuildGrid() {
    const mode = getViewMode();
    const ui = getUIState();

    if (mode !== 'grid') {
      setGridVisible(false);
      return;
    }

    setGridVisible(true);
    applyCardSize(ui.cardSize);
    syncHideOriginal(ui.hideOriginal);

    const wrap = ensureGridWrap();
    const grid = wrap.querySelector('#fl-grid');
    const metaEl = wrap.querySelector('#fl-grid-meta');
    const hint = wrap.querySelector('#fl-grid-hint');

    const visibleRows = getAllRows().filter(r => r.style.display !== 'none');
    const q = (ui.query || '').trim().toLowerCase();

    const data = visibleRows
      .map(getRowData)
      .filter(it => !q || it.title.toLowerCase().includes(q));

    const catLabel = getCurrentCatLabel();
    metaEl.innerHTML = `<strong>${data.length}</strong> rezultate (după filtre)${catLabel ? ` • <span style="opacity:.8">${escapeHtml(catLabel)}</span>` : ''}`;
    hint.textContent = ui.hideOriginal ? 'Lista originală e ascunsă.' : 'Grid activ.';

    const metaFetchList = [];
    grid.innerHTML = data.map((it, idx) => {
      const cardId = `fl-card-${idx}-${(it.detailsHref || '').replace(/\W+/g, '_')}`;

      const subBits = [];
      if (it.sizeText) subBits.push(escapeHtml(it.sizeText));
      if (it.dateText) subBits.push(escapeHtml(it.dateText));
      if (typeof it.seeds === 'number' && typeof it.leech === 'number') subBits.push(`S:${it.seeds} L:${it.leech}`);

      const badgeGenres = (it.genres || []).slice(0, 3);
      const extra = it.genres && it.genres.length > 3 ? `+${it.genres.length - 3}` : null;

      const absDetails = normalizeToAbs(it.detailsHref);
      const cachedMeta = getCachedMeta(absDetails);

      let thumb = it.thumb || cachedMeta?.thumb || null;
      const needsFetch = (!cachedMeta) && it.detailsHref && it.detailsHref.includes('details.php?id=');
      if (needsFetch) metaFetchList.push({ detailsHref: it.detailsHref, cardId, title: it.title });

      const dl = it.downloadHref
        ? `<a class="fl-badge dl" href="${escapeHtml(it.downloadHref)}" title="Download">⬇ Download</a>`
        : '';

      const plex = it.title
        ? `<a class="fl-badge plex" href="#" data-fl-plex="1" data-fl-title="${escapeHtml(it.title)}" title="Play in Plex after download">PLEX</a>`
        : '';

      const ratingBadge = `<span class="fl-badge" data-fl-rating="1" title="Filelist rating" style="display:${cachedMeta?.rating ? '' : 'none'}">⭐ ${escapeHtml(cachedMeta?.rating || '')}</span>`;

      const yt = cachedMeta?.ytId || '';
      const cardAttrs = `
        data-fl-title="${escapeHtml(it.title)}"
        ${yt ? `data-fl-yt="${escapeHtml(yt)}"` : ''}
      `;

      return `
        <div class="fl-card" id="${escapeHtml(cardId)}" ${cardAttrs}>
          <a href="${escapeHtml(it.detailsHref)}">
            <div class="fl-poster">
              <img data-fl-poster="1" ${thumb ? `src="${escapeHtml(thumb)}"` : `data-fl-needs="1"`} loading="lazy" referrerpolicy="no-referrer" alt="">
              ${thumb ? '' : `<div class="loading">Loading…</div>`}
            </div>
          </a>
          <div class="fl-info">
            <a href="${escapeHtml(it.detailsHref)}" class="fl-title">${escapeHtml(it.title)}</a>
            <div class="fl-sub">${subBits.map(b => `<span>${b}</span>`).join('')}</div>
            <div class="fl-badges">
              ${ratingBadge}
              ${badgeGenres.map(g => `<span class="fl-badge">${escapeHtml(g)}</span>`).join('')}
              ${extra ? `<span class="fl-badge">${escapeHtml(extra)}</span>` : ''}
              ${dl}
              ${plex}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (metaFetchList.length) fillMetaForCards(metaFetchList);

    // Plex (delegate)
    if (!grid.dataset.flPlexBound) {
      grid.dataset.flPlexBound = '1';
      grid.addEventListener('click', (e) => {
        const a = e.target.closest('a[data-fl-plex="1"]');
        if (!a) return;
        e.preventDefault();
        e.stopPropagation();
        const title = a.getAttribute('data-fl-title') || '';
        plexOpen(title, location.href);
      }, true);
    }

    // Card hover trailer preview (delegate)
    if (!grid.dataset.flCardHoverBound) {
      grid.dataset.flCardHoverBound = '1';

      grid.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.fl-card');
        if (!card) return;
        if (popPinned) return;

        const yt = card.getAttribute('data-fl-yt') || '';
        if (CARD_PREVIEW_REQUIRE_YT && !yt) return;

        armCardPreview(card);
      }, true);

      grid.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.fl-card');
        if (!card) return;
        if (popPinned) return;

        const related = e.relatedTarget;
        if (related && card.contains(related)) return;

        disarmCardPreview(card);
      }, true);

      // Click empty card space to pin/unpin popup (without navigating)
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.fl-card');
        if (!card) return;

        // allow normal clicks on links
        if (e.target.closest('a')) return;

        const yt = card.getAttribute('data-fl-yt') || '';
        const title = card.getAttribute('data-fl-title') || '';
        if (!yt) return;

        e.preventDefault();
        e.stopPropagation();

        ensureTrailerPopup();
        const pop = document.getElementById('fl-trailer-pop');
        const iframe = document.getElementById('fl-trailer-pop-iframe');
        const isSame = (iframe?.src || '').includes(`/embed/${yt}`);

        if (popPinned && isSame) {
          popPinned = false;
          pop.querySelector('#fl-trailer-pop-pin').textContent = '📌';
          closePopup(true);
          return;
        }

        popPinned = true;
        pop.querySelector('#fl-trailer-pop-pin').textContent = '📍';
        setCardArming(card, false);
        openPopup(yt, title, card);
      }, true);

      window.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          popPinned = false;
          closePopup(true);
          if (armedCard) setCardArming(armedCard, false);
        }
      });
    }
  }

  // ---------- Draggable panel ----------
  function applyInitialPanelPosition(panel) {
    const saved = getPanelPos();
    const defaultLeft = Math.max(12, window.innerWidth - 372 - 18);
    const defaultTop = 90;

    let left = saved?.left ?? defaultLeft;
    let top = saved?.top ?? defaultTop;

    const rect = panel.getBoundingClientRect();
    const w = rect.width || 372;
    const h = rect.height || 200;

    left = clamp(left, 8, Math.max(8, window.innerWidth - w - 8));
    top = clamp(top, 8, Math.max(8, window.innerHeight - h - 8));

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = 'auto';
  }

  function makePanelDraggable(panel) {
    const hdr = panel.querySelector('.hdr');
    if (!hdr || hdr.dataset.flDragBound === '1') return;
    hdr.dataset.flDragBound = '1';

    const isInteractive = (el) => !!el.closest('.btn');

    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    let dragging = false;
    let raf = 0;

    const onMove = (clientX, clientY) => {
      if (!dragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      const rect = panel.getBoundingClientRect();
      const w = rect.width;

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      newLeft = clamp(newLeft, 8, Math.max(8, window.innerWidth - w - 8));
      newTop = clamp(newTop, 8, Math.max(8, window.innerHeight - (rect.height || 200) - 8));

      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
      panel.style.right = 'auto';

      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          savePanelPos({ left: newLeft, top: newTop });
        });
      }
    };

    const onMouseMove = (e) => onMove(e.clientX, e.clientY);
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
    };

    hdr.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (isInteractive(e.target)) return;
      e.preventDefault();

      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      dragging = true;
      panel.classList.add('dragging');

      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    }, true);

    window.addEventListener('resize', () => {
      const rect = panel.getBoundingClientRect();
      const w = rect.width;

      let left = rect.left;
      let top = rect.top;

      left = clamp(left, 8, Math.max(8, window.innerWidth - w - 8));
      top = clamp(top, 8, Math.max(8, window.innerHeight - (rect.height || 200) - 8));

      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = 'auto';

      savePanelPos({ left, top });
    });
  }

  // ---------- UI ----------
  function buildPanel(genres) {
    let panel = document.getElementById('fl-genre-panel');
    if (panel) return panel;

    const ui = getUIState();

    panel = document.createElement('div');
    panel.id = 'fl-genre-panel';
    panel.className = ui.collapsed ? 'collapsed' : '';

    const catLabel = getCurrentCatLabel();
    const catInfo = catLabel ? ` • ${escapeHtml(catLabel)}` : '';

    panel.innerHTML = `
      <div class="hdr">
        <b>FILELIST • GENRE GRID${catInfo}</b>
        <div style="display:flex;gap:8px;align-items:center;flex:0 0 auto;white-space:nowrap;">
          <div class="btn" id="fl-collapse">${ui.collapsed ? '▶' : '▼'}</div>
          <div class="btn" id="fl-refresh">Refresh</div>
        </div>
      </div>

      <div class="body">
        <div class="row">
          <input id="fl-q" type="text" placeholder="Search title..." value="${escapeHtml(ui.query)}">
        </div>

        <div class="row">
          <div style="width:92px;color:var(--fl-muted)">Card size</div>
          <input id="fl-size" type="range" min="150" max="260" step="5" value="${ui.cardSize}">
          <div style="width:54px;text-align:right;color:var(--fl-muted)" id="fl-size-val">${ui.cardSize}px</div>
        </div>

        <div class="hint">
          Genres are learned per Filelist category (cat=...). Pipes like "Action | Comedy" are auto-split.
        </div>
        <div class="hint">
          Thumbs + rating + trailers from details.php (cached). Hover a card 3s for trailer.
        </div>

        <div class="row pillbar">
          <div class="pill ${getViewMode() === 'grid' ? 'active' : ''}" id="fl-view-grid">Grid</div>
          <div class="pill ${getViewMode() === 'list' ? 'active' : ''}" id="fl-view-list">List</div>
          <div class="pill ${ui.hideOriginal ? 'active' : ''}" id="fl-hide-original">Hide list</div>
          <div class="pill" id="fl-clear">Clear</div>
        </div>

        <div class="hint" style="margin-top:10px">Genres (persistent for this category):</div>
        <div class="genrelist" id="fl-genre-list"></div>
      </div>
    `;

    document.body.appendChild(panel);

    applyInitialPanelPosition(panel);
    makePanelDraggable(panel);

    const list = panel.querySelector('#fl-genre-list');

    function renderGenreList() {
      const saved = getSavedFilter();
      list.innerHTML = genres.map(g => {
        const id = 'g_' + g.replace(/\W+/g, '_');
        return `
          <label>
            <input type="checkbox" id="${id}" ${saved[g] ? 'checked' : ''}>
            <span>${escapeHtml(g)}</span>
          </label>
        `;
      }).join('');
    }
    renderGenreList();

    panel.querySelector('#fl-collapse').addEventListener('click', (e) => {
      e.stopPropagation();
      const uiNow = getUIState();
      uiNow.collapsed = !uiNow.collapsed;
      saveUIState(uiNow);
      panel.classList.toggle('collapsed', uiNow.collapsed);
      panel.querySelector('#fl-collapse').textContent = uiNow.collapsed ? '▶' : '▼';
      applyInitialPanelPosition(panel);
    });

    panel.querySelector('#fl-refresh').addEventListener('click', (e) => {
      e.stopPropagation();
      runAll(true);
    });

    panel.querySelector('#fl-clear').addEventListener('click', () => {
      saveFilter({});
      renderGenreList();
      runAll(false);
    });

    panel.querySelector('#fl-size').addEventListener('input', (e) => {
      const uiNow = getUIState();
      uiNow.cardSize = Number(e.target.value) || DEFAULT_UI.cardSize;
      saveUIState(uiNow);
      panel.querySelector('#fl-size-val').textContent = `${uiNow.cardSize}px`;
      applyCardSize(uiNow.cardSize);
    });

    panel.querySelector('#fl-hide-original').addEventListener('click', () => {
      const uiNow = getUIState();
      uiNow.hideOriginal = !uiNow.hideOriginal;
      saveUIState(uiNow);

      panel.querySelector('#fl-hide-original').classList.toggle('active', uiNow.hideOriginal);
      syncHideOriginal(uiNow.hideOriginal);

      if (getViewMode() === 'list' && uiNow.hideOriginal) {
        setViewMode('grid');
        panel.querySelector('#fl-view-grid').classList.add('active');
        panel.querySelector('#fl-view-list').classList.remove('active');
        rebuildGrid();
      }
    });

    panel.querySelector('#fl-view-grid').addEventListener('click', () => {
      setViewMode('grid');
      const uiNow = getUIState();
      syncHideOriginal(uiNow.hideOriginal);
      panel.querySelector('#fl-view-grid').classList.add('active');
      panel.querySelector('#fl-view-list').classList.remove('active');
      rebuildGrid();
    });

    panel.querySelector('#fl-view-list').addEventListener('click', () => {
      setViewMode('list');

      const uiNow = getUIState();
      uiNow.hideOriginal = false;
      saveUIState(uiNow);
      syncHideOriginal(false);

      panel.querySelector('#fl-hide-original').classList.remove('active');
      panel.querySelector('#fl-view-list').classList.add('active');
      panel.querySelector('#fl-view-grid').classList.remove('active');

      const wrap = document.getElementById('fl-grid-wrap');
      if (wrap) wrap.style.display = 'none';

      applyFilter(getSavedFilter());
      addPlexButtonsToRows();
    });

    panel.querySelector('#fl-q').addEventListener('input', (e) => {
      const uiNow = getUIState();
      uiNow.query = e.target.value || '';
      saveUIState(uiNow);
      rebuildGrid();
    });

    list.addEventListener('change', () => {
      const sel = {};
      genres.forEach(g => {
        const cb = document.getElementById('g_' + g.replace(/\W+/g, '_'));
        if (cb?.checked) sel[g] = true;
      });
      saveFilter(sel);
      runAll(false);
    });

    // If category dropdown changes, the page usually reloads anyway.
    // But some setups might not; so we detect cat changes and re-init.
    const catSelect = document.querySelector('select[name="cat"]');
    if (catSelect && !catSelect.dataset.flBound) {
      catSelect.dataset.flBound = '1';
      catSelect.addEventListener('change', () => {
        // let Filelist navigate; if it doesn't, we can re-run shortly
        setTimeout(() => {
          runAll(true);
        }, 700);
      });
    }

    return panel;
  }

  function runAll(rebuildPanel) {
    // 1) learn + get full genre list for this category
    const allGenres = getAllGenresForThisCategory();

    // 2) (optional) rebuild panel list if genres expanded
    if (rebuildPanel) {
      const old = document.getElementById('fl-genre-panel');
      if (old) old.remove();
      buildPanel(allGenres);
    }

    // 3) apply filter
    applyFilter(getSavedFilter());

    const ui = getUIState();
    syncHideOriginal(ui.hideOriginal);
    applyCardSize(ui.cardSize);

    // 4) view mode
    if (getViewMode() === 'grid') {
      rebuildGrid();
    } else {
      const wrap = document.getElementById('fl-grid-wrap');
      if (wrap) wrap.style.display = 'none';

      if (ui.hideOriginal) {
        ui.hideOriginal = false;
        saveUIState(ui);
        syncHideOriginal(false);
        const panel = document.getElementById('fl-genre-panel');
        panel?.querySelector?.('#fl-hide-original')?.classList?.remove?.('active');
      }
    }

    // 5) plex buttons (still injected but hidden)
    addPlexButtonsToRows();
  }

  function init() {
    injectStyles();

    const rows = getAllRows();
    if (!rows.length) { log('No rows yet, retrying…'); return false; }

    // Ensure we learn + show full list per category
    const allGenres = getAllGenresForThisCategory();
    if (!allGenres.length) { log('No genres found (yet)'); return false; }

    buildPanel(allGenres);

    const ui = getUIState();
    applyCardSize(ui.cardSize);

    if (getViewMode() === 'list') {
      ui.hideOriginal = false;
      saveUIState(ui);
      syncHideOriginal(false);
    } else {
      syncHideOriginal(ui.hideOriginal);
    }

    // normalize stored filter once (migration safety)
    saveFilter(getSavedFilter());

    runAll(false);
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    if (init() || ++tries > 30) clearInterval(timer);
  }, 300);

})();
