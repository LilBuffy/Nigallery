(function () {
"use strict";

const MEDIA_PATH = "media";
const RECENT_LIMIT = 60;

const CATEGORY_BY_EXT = {
  image: ["jpg", "jpeg", "png", "webp", "avif", "bmp", "svg"],
  gif: ["gif"],
  video: ["mp4", "webm", "mov", "ogv", "m4v"],
  audio: ["mp3", "wav", "m4a", "flac", "ogg"]
};
function extOf(filename) { return filename.split(".").pop().toLowerCase(); }
function categoryFor(filename) {
  const ext = extOf(filename);
  for (const [category, list] of Object.entries(CATEGORY_BY_EXT)) {
    if (list.includes(ext)) return category;
  }
  return null;
}

function detectRepo() {
  const host = location.hostname;
  if (!host.endsWith(".github.io")) return null;
  const owner = host.split(".")[0];
  const firstSegment = location.pathname.split("/").filter(Boolean)[0];
  const repo = firstSegment || `${owner}.github.io`;
  return { owner, repo };
}
const REPO = detectRepo();

const ICON_SIZE = 17;
const ICONS = {
  starOutline: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 17.3l-6.16 3.6 1.64-6.99-5.36-4.64 7.06-.6L12 2l2.82 6.67 7.06.6-5.36 4.64 1.64 6.99z"/></svg>`,
  starFilled: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="currentColor" stroke="currentColor" stroke-width="1.8"><path d="M12 17.3l-6.16 3.6 1.64-6.99-5.36-4.64 7.06-.6L12 2l2.82 6.67 7.06.6-5.36 4.64 1.64 6.99z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  download: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`,
  hide: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 8 11 8a21.6 21.6 0 01-2.6 3.79M14.12 14.12a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>`,
  unhide: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>`,
  play: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>`,
  video: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="M22 8l-5 4 5 4V8z"/></svg>`,
  music: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  file: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>`,
  broken: `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10.5 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2v-4.5M14 2v6h6M3 3l18 18"/></svg>`
};

const DB_NAME = "galleryLocalDB";
const STORE = "files";
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}
async function dbAdd(record) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(record);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function dbDelete(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function dbGetAll() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {  }
}

const DEFAULT_SETTINGS = {
  thumbScale: 1, autoplay: true, reduceMotion: false, confirmRemove: true, remember: true,
  viewMode: "standard", sortMode: "name-asc", filterType: "all"
};
let settings = Object.assign({}, DEFAULT_SETTINGS, loadJSON("nigallery_settings", {}));
let favorites = new Set(loadJSON("nigallery_favorites", []));
let hidden = new Set(loadJSON("nigallery_hidden", []));
let recentList = loadJSON("nigallery_recent", []);
let collections = loadJSON("nigallery_collections", []);

function saveSettings() { saveJSON("nigallery_settings", settings); }
function saveFavorites() { saveJSON("nigallery_favorites", Array.from(favorites)); }
function saveHidden() { saveJSON("nigallery_hidden", Array.from(hidden)); }
function saveRecent() { saveJSON("nigallery_recent", recentList); }
function saveCollections() { saveJSON("nigallery_collections", collections); }

let repoItems = [];
let localItems = [];
let items = [];
let filterType = settings.remember ? settings.filterType : "all";
let searchQuery = "";
let sortMode = settings.remember ? settings.sortMode : "name-asc";
let viewMode = settings.viewMode || "standard";
let currentLightboxList = [];
let currentLightboxIndex = -1;
let confirmResolver = null;
let lastRandomId = null;
let currentMediaEl = null;
let miniItem = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const galleryGrid = $("#galleryGrid");
const emptyLibrary = $("#emptyLibrary");
const emptyLibraryText = $("#emptyLibraryText");
const emptyResults = $("#emptyResults");
const emptyResultsTitle = $("#emptyResultsTitle");
const emptyResultsText = $("#emptyResultsText");
const searchInput = $("#searchInput");
const searchClearBtn = $("#searchClearBtn");
const searchCount = $("#searchCount");
const sortSelect = $("#sortSelect");
const filterNav = $("#filterNav");
const collectionsNav = $("#collectionsNav");
const collectionsEmptyHint = $("#collectionsEmptyHint");
const meterText = $("#meterText");
const fileInput = $("#fileInput");
const dragOverlay = $("#dragOverlay");
const sidebar = $("#sidebar");
const viewSwitch = $("#viewSwitch");

const lightbox = $("#lightbox");
const lbFilename = $("#lbFilename");
const lbIndex = $("#lbIndex");
const lbStage = $("#lbStage");
const lbFilmstrip = $("#lbFilmstrip");
const lbFavBtn = $("#lbFavBtn");
const lbRemoveBtn = $("#lbRemoveBtn");

const infoPanel = $("#infoPanel");
const infoBody = $("#infoBody");
const settingsPanel = $("#settingsPanel");
const collectionPanel = $("#collectionPanel");
const collectionPickList = $("#collectionPickList");
const shortcutsPanel = $("#shortcutsPanel");
const scrim = $("#scrim");

const confirmModal = $("#confirmModal");
const confirmTitle = $("#confirmTitle");
const confirmMessage = $("#confirmMessage");
const confirmCancelBtn = $("#confirmCancelBtn");
const confirmOkBtn = $("#confirmOkBtn");

const toastContainer = $("#toastContainer");
const miniPlayer = $("#miniPlayer");
const miniName = $("#miniName");
const miniScrubFill = $("#miniScrubFill");
const miniPlayPauseBtn = $("#miniPlayPauseBtn");

const ALL_PANELS = () => [infoPanel, settingsPanel, collectionPanel, shortcutsPanel];

function bytesToSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
function formatDuration(sec) {
  if (!sec || !isFinite(sec)) return "";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2); }

function showToast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 250); }, 2400);
}

function confirmDialog(title, message, okLabel = "Confirm") {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOkBtn.textContent = okLabel;
  confirmModal.classList.add("show");
  return new Promise((resolve) => { confirmResolver = resolve; });
}
function closeConfirm(result) {
  confirmModal.classList.remove("show");
  if (confirmResolver) { confirmResolver(result); confirmResolver = null; }
}
confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
confirmOkBtn.addEventListener("click", () => closeConfirm(true));
confirmModal.addEventListener("click", (e) => { if (e.target === confirmModal) closeConfirm(false); });

async function fetchRepoItems() {
  if (!REPO) return [];
  const url = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${MEDIA_PATH}`;
  let res;
  try { res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } }); }
  catch (e) { showToast("Couldn't reach GitHub to load repository media"); return []; }

  if (res.status === 404) return [];
  if (res.status === 403) { showToast("GitHub API rate limit reached, repository media will reappear shortly"); return []; }
  if (!res.ok) { showToast("Couldn't load repository media"); return []; }

  let entries;
  try { entries = await res.json(); } catch (e) { showToast("Repository media list came back malformed"); return []; }
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((e) => e.type === "file" && categoryFor(e.name))
    .map((e) => ({
      id: "repo:" + e.path,
      name: e.name,
      url: e.download_url,
      category: categoryFor(e.name),
      ext: extOf(e.name),
      size: e.size || 0,
      source: "repo",
      addedAt: 0
    }));
}

async function loadLocalItems() {
  try {
    const records = await dbGetAll();
    return records.map((r) => ({
      id: r.id, name: r.name, url: URL.createObjectURL(r.blob),
      category: r.category, ext: extOf(r.name), size: r.size, source: "local", addedAt: r.addedAt || 0
    }));
  } catch (e) { return []; }
}

function mergeItems() {
  items = repoItems.concat(localItems);
  items.forEach((i) => {
    i.width = i.width || 0; i.height = i.height || 0; i.duration = i.duration || 0;
    i.thumb = i.thumb || null; i.broken = i.broken || false;
    i.favorite = favorites.has(i.id);
  });
}

async function importFiles(fileList) {
  const files = Array.from(fileList).filter((f) => categoryFor(f.name));
  if (files.length === 0) { showToast("No supported media files found"); return; }
  for (const file of files) {
    const id = "local:" + uid();
    await dbAdd({ id, name: file.name, category: categoryFor(file.name), size: file.size, blob: file, addedAt: Date.now() });
  }
  localItems = await loadLocalItems();
  mergeItems();
  render();
  showToast(`Added ${files.length} file${files.length > 1 ? "s" : ""}, visible only in this browser`);
}

function addRecent(id) {
  recentList = recentList.filter((r) => r.id !== id);
  recentList.unshift({ id, viewedAt: Date.now() });
  if (recentList.length > RECENT_LIMIT) recentList = recentList.slice(0, RECENT_LIMIT);
  saveRecent();
}
function getRecentItems() {
  const byId = new Map(items.map((i) => [i.id, i]));
  return recentList.map((r) => byId.get(r.id)).filter(Boolean);
}

function createCollection(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const coll = { id: uid(), name: trimmed, itemIds: [] };
  collections.push(coll);
  saveCollections();
  renderCollectionsNav();
  return coll;
}
function deleteCollection(id) {
  collections = collections.filter((c) => c.id !== id);
  saveCollections();
  if (filterType === "coll:" + id) { filterType = "all"; persistFilterSort(); }
  renderCollectionsNav();
  render();
}
function toggleItemInCollection(collId, itemId) {
  const coll = collections.find((c) => c.id === collId);
  if (!coll) return;
  const idx = coll.itemIds.indexOf(itemId);
  if (idx === -1) coll.itemIds.push(itemId); else coll.itemIds.splice(idx, 1);
  saveCollections();
  renderCollectionsNav();
  if (filterType === "coll:" + collId) render();
}
function getCollectionItems(collId) {
  const coll = collections.find((c) => c.id === collId);
  if (!coll) return [];
  const byId = new Map(items.map((i) => [i.id, i]));
  return coll.itemIds.map((id) => byId.get(id)).filter(Boolean);
}
function collectionIconSvg() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 6a2 2 0 01-2-2V3a1 1 0 011-1h18a1 1 0 011 1v1a2 2 0 01-2 2M4 6v13a2 2 0 002 2h12a2 2 0 002-2V6"/></svg>`;
}
function renderCollectionsNav() {
  collectionsEmptyHint.classList.toggle("hidden", collections.length !== 0);
  collectionsNav.innerHTML = collections.map((c) => `
    <button class="filter-chip ${filterType === "coll:" + c.id ? "active" : ""}" data-filter="coll:${c.id}">
      <span class="fc-left">${collectionIconSvg()}${escapeHtml(c.name)}</span>
      <span class="count" data-count="coll:${c.id}">${c.itemIds.length}</span>
      <span class="collection-chip-remove" data-remove-collection="${c.id}" role="button" aria-label="Delete collection">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </span>
    </button>`).join("");
}

function itemDate(i) { return i.addedAt || 0; }
function itemDim(i) { return (i.width || 0) * (i.height || 0); }

function getBaseListForFilter(type) {
  if (type === "recent") return getRecentItems().filter((i) => !hidden.has(i.id));
  if (type === "hidden") return items.filter((i) => hidden.has(i.id));
  const visible = items.filter((i) => !hidden.has(i.id));
  if (type === "favorites") return visible.filter((i) => i.favorite);
  if (type.startsWith("coll:")) return getCollectionItems(type.slice(5)).filter((i) => !hidden.has(i.id));
  if (type === "all") return visible;
  return visible.filter((i) => i.category === type);
}

function applySearchAndSort(list) {
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.ext.includes(q) ||
      i.category.includes(q) ||
      (q === "gif" && i.category === "gif") ||
      (q === "video" && i.category === "video") ||
      (q === "audio" && i.category === "audio") ||
      (q === "image" && i.category === "image")
    );
  }
  list = list.slice();
  switch (sortMode) {
    case "name-desc": list.sort((a, b) => b.name.localeCompare(a.name)); break;
    case "size-desc": list.sort((a, b) => b.size - a.size); break;
    case "size-asc": list.sort((a, b) => a.size - b.size); break;
    case "date-desc": list.sort((a, b) => itemDate(b) - itemDate(a) || a.name.localeCompare(b.name)); break;
    case "date-asc": list.sort((a, b) => itemDate(a) - itemDate(b) || a.name.localeCompare(b.name)); break;
    case "dim-desc": list.sort((a, b) => itemDim(b) - itemDim(a) || a.name.localeCompare(b.name)); break;
    case "duration-desc": list.sort((a, b) => (b.duration || 0) - (a.duration || 0) || a.name.localeCompare(b.name)); break;
    default: list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return list;
}

function getFilteredItems() {
  return applySearchAndSort(getBaseListForFilter(filterType));
}

function updateCounts() {
  const visible = items.filter((i) => !hidden.has(i.id));
  const counts = { all: visible.length, image: 0, video: 0, gif: 0, audio: 0, favorites: 0, hidden: hidden.size, recent: getRecentItems().length };
  visible.forEach((i) => {
    if (counts[i.category] !== undefined) counts[i.category]++;
    if (i.favorite) counts.favorites++;
  });
  $$(".count").forEach((el) => {
    const key = el.dataset.count;
    if (key.startsWith("coll:")) return;
    el.textContent = counts[key] ?? 0;
  });
  collections.forEach((c) => {
    const el = collectionsNav.querySelector(`[data-count="coll:${c.id}"]`);
    if (el) el.textContent = c.itemIds.length;
  });
}

function persistFilterSort() {
  if (!settings.remember) return;
  settings.filterType = filterType;
  settings.sortMode = sortMode;
  saveSettings();
}

function metaSubtext(item) {
  const bits = [bytesToSize(item.size)];
  if (item.width) bits.push(`${item.width}x${item.height}`);
  if (item.duration) bits.push(formatDuration(item.duration));
  return bits.join(" - ");
}

function thumbHtml(item) {
  if (item.broken) return `<div class="thumb-broken">${ICONS.broken}<span>File missing or unreadable</span></div>`;
  if (item.category === "image" || item.category === "gif") {
    return `<img src="${item.url}" alt="${escapeHtml(item.name)}" loading="lazy" data-thumb-img="${escapeHtml(item.id)}">`;
  }
  if (item.category === "video") {
    return `<div class="thumb-video-wrap">
        <div class="poster-fallback">${ICONS.video}</div>
        <video muted loop playsinline preload="none" data-src="${item.url}"></video>
        <span class="play-badge">${ICONS.play}</span>
        ${item.duration ? `<span class="duration-badge">${formatDuration(item.duration)}</span>` : ""}
      </div>`;
  }
  if (item.category === "audio") return `<div class="thumb-generic">${ICONS.music}</div>`;
  return `<div class="thumb-generic">${ICONS.file}</div>`;
}

function removeActionIcon(item) {
  if (hidden.has(item.id)) return ICONS.unhide;
  return item.source === "local" ? ICONS.trash : ICONS.hide;
}
function removeActionLabel(item) {
  if (hidden.has(item.id)) return "Unhide";
  return item.source === "local" ? "Delete" : "Hide";
}

function cardTemplate(item) {
  if (viewMode === "list") {
    return `
    <article class="card" data-id="${escapeHtml(item.id)}" tabindex="0">
      <div class="thumb">${thumbHtml(item)}${item.category === "gif" ? '<span class="tag-badge">GIF</span>' : ""}</div>
      <div class="card-meta"><span class="list-col-name">${escapeHtml(item.name)}</span></div>
      <span class="list-col">${item.category}</span>
      <span class="list-col">${item.width ? item.width + "x" + item.height : "-"}</span>
      <span class="list-col">${bytesToSize(item.size)}</span>
      <span class="list-col">${item.duration ? formatDuration(item.duration) : "-"}</span>
      <div class="card-actions">
        <button class="fav-btn ${item.favorite ? "active" : ""}" data-action="favorite" aria-label="Toggle favorite">${item.favorite ? ICONS.starFilled : ICONS.starOutline}</button>
        <button data-action="info" aria-label="Details">${ICONS.info}</button>
        <button data-action="remove" aria-label="${removeActionLabel(item)}">${removeActionIcon(item)}</button>
      </div>
    </article>`;
  }
  return `
  <article class="card ${hidden.has(item.id) ? "hidden-flag" : ""}" data-id="${escapeHtml(item.id)}" tabindex="0">
    <div class="thumb">
      ${thumbHtml(item)}
      ${item.category === "gif" ? '<span class="tag-badge">GIF</span>' : ""}
    </div>
    <button class="fav-btn ${item.favorite ? "active" : ""}" data-action="favorite" aria-label="Toggle favorite">${item.favorite ? ICONS.starFilled : ICONS.starOutline}</button>
    <div class="card-actions">
      <button data-action="info" aria-label="Details">${ICONS.info}</button>
      <button data-action="collection" aria-label="Add to collection">${collectionIconSvg()}</button>
      <button data-action="download" aria-label="Download">${ICONS.download}</button>
      <button data-action="remove" aria-label="${removeActionLabel(item)}">${removeActionIcon(item)}</button>
    </div>
    <div class="card-meta">
      <span class="card-name">${escapeHtml(item.name)}</span>
      <span class="card-sub" data-sub="${escapeHtml(item.id)}">${metaSubtext(item)}</span>
    </div>
  </article>`;
}

const EMPTY_COPY = {
  favorites: ["No favorites yet", "Star the files you love from the gallery or the viewer, they will show up here."],
  recent: ["Nothing viewed yet", "Open something from the gallery and it will land in your recent history."],
  hidden: ["Nothing hidden", "Hide a file from the gallery or the viewer and it stays here until you restore it."],
  image: ["No images", "Nothing here matches Images right now."],
  gif: ["No GIFs", "Nothing here matches GIFs right now."],
  video: ["No videos", "Nothing here matches Videos right now."],
  audio: ["No audio", "Nothing here matches Audio right now."]
};

function render() {
  const filtered = getFilteredItems();
  updateCounts();

  galleryGrid.dataset.view = viewMode;
  emptyLibrary.classList.toggle("hidden", items.length !== 0);
  const showEmptyResults = items.length !== 0 && filtered.length === 0;
  emptyResults.classList.toggle("hidden", !showEmptyResults);
  galleryGrid.style.display = filtered.length ? "grid" : "none";

  if (showEmptyResults) {
    if (searchQuery) {
      emptyResultsTitle.textContent = "No matches";
      emptyResultsText.textContent = `Nothing matches "${searchQuery}" in this view. Try another term or filter.`;
    } else if (filterType.startsWith("coll:")) {
      emptyResultsTitle.textContent = "Empty collection";
      emptyResultsText.textContent = "Add files to this collection from the gallery or the viewer.";
    } else if (EMPTY_COPY[filterType]) {
      emptyResultsTitle.textContent = EMPTY_COPY[filterType][0];
      emptyResultsText.textContent = EMPTY_COPY[filterType][1];
    } else {
      emptyResultsTitle.textContent = "No matches";
      emptyResultsText.textContent = "Nothing matches your current search or filter. Try adjusting them.";
    }
  }

  if (!REPO) emptyLibraryText.textContent = "Drag and drop files here, or use Add files.";

  let html = "";
  if (viewMode === "list" && filtered.length) {
    html += `<div class="list-header"><span></span><span>Name</span><span>Type</span><span>Dimensions</span><span>Size</span><span>Duration</span></div>`;
  }
  html += filtered.map(cardTemplate).join("");
  galleryGrid.innerHTML = html;

  const totalSize = filtered.reduce((s, i) => s + i.size, 0);
  meterText.textContent = `${filtered.length} file${filtered.length === 1 ? "" : "s"} - ${bytesToSize(totalSize)}`;

  wireLazyMedia();
  updateSettingsStats();
}

const lazyObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    lazyObserver.unobserve(entry.target);
    resolveCardMeta(entry.target);
  });
}, { rootMargin: "200px" });

function wireLazyMedia() {
  galleryGrid.querySelectorAll(".card").forEach((card) => lazyObserver.observe(card));
  galleryGrid.querySelectorAll("[data-thumb-img]").forEach((img) => {
    img.addEventListener("error", () => markBroken(img.dataset.thumbImg), { once: true });
  });

  if (settings.autoplay) {
    galleryGrid.querySelectorAll(".thumb-video-wrap").forEach((wrap) => {
      const video = wrap.querySelector("video");
      wrap.addEventListener("mouseenter", () => {
        if (!video.src) video.src = video.dataset.src;
        video.play().catch(() => {});
        wrap.classList.add("playing");
      });
      wrap.addEventListener("mouseleave", () => {
        video.pause();
        wrap.classList.remove("playing");
      });
    });
  }
}

function markBroken(id) {
  const item = items.find((i) => i.id === id);
  if (!item || item.broken) return;
  item.broken = true;
  const card = galleryGrid.querySelector(`.card[data-id="${CSS.escape(id)}"] .thumb`);
  if (card) card.innerHTML = thumbHtml(item);
}

function resolveCardMeta(cardEl) {
  const id = cardEl.dataset.id;
  const item = items.find((i) => i.id === id);
  if (!item || item.width || item.broken) return;

  if (item.category === "image" || item.category === "gif") {
    const img = new Image();
    img.onload = () => { item.width = img.naturalWidth; item.height = img.naturalHeight; updateCardSub(item); };
    img.onerror = () => markBroken(id);
    img.src = item.url;
  } else if (item.category === "video") {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = item.url; video.muted = true; video.playsInline = true; video.preload = "metadata";
    video.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;";
    document.body.appendChild(video);
    video.addEventListener("loadeddata", () => {
      try { video.currentTime = Math.min(0.6, (video.duration || 1) / 3); }
      catch (e) { finishVideoMeta(item, video, cardEl); }
    });
    video.addEventListener("seeked", () => finishVideoMeta(item, video, cardEl));
    video.addEventListener("error", () => { video.remove(); markBroken(id); });
  }
}

function finishVideoMeta(item, video, cardEl) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    item.thumb = canvas.toDataURL("image/jpeg", 0.72);
  } catch (e) {  }
  item.width = video.videoWidth; item.height = video.videoHeight; item.duration = video.duration || 0;
  video.remove();
  updateCardSub(item);
  if (item.thumb && cardEl) {
    const poster = cardEl.querySelector(".poster-fallback");
    if (poster) poster.outerHTML = `<img class="poster" src="${item.thumb}" alt="">`;
  }
  if (item.duration && cardEl && !cardEl.querySelector(".duration-badge")) {
    const wrap = cardEl.querySelector(".thumb-video-wrap");
    if (wrap) wrap.insertAdjacentHTML("beforeend", `<span class="duration-badge">${formatDuration(item.duration)}</span>`);
  }
}

function updateCardSub(item) {
  if (viewMode !== "list") {
    const sub = galleryGrid.querySelector(`.card-sub[data-sub="${CSS.escape(item.id)}"]`);
    if (sub) sub.textContent = metaSubtext(item);
  }
  if (infoPanel.classList.contains("open") && infoPanel.dataset.itemId === item.id) openInfoPanel(item.id);
}

galleryGrid.addEventListener("click", (e) => {
  const actionBtn = e.target.closest("button[data-action]");
  const card = e.target.closest(".card");
  if (!card) return;
  const id = card.dataset.id;
  if (actionBtn) {
    e.stopPropagation();
    const action = actionBtn.dataset.action;
    if (action === "favorite") toggleFavorite(id);
    else if (action === "info") openInfoPanel(id);
    else if (action === "download") downloadItem(items.find((i) => i.id === id));
    else if (action === "remove") removeOrUnhide(id);
    else if (action === "collection") openCollectionPanel(id);
    return;
  }
  openLightbox(id);
});
galleryGrid.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const card = e.target.closest(".card");
    if (card) { e.preventDefault(); openLightbox(card.dataset.id); }
  }
});

function toggleFavorite(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  item.favorite ? favorites.add(id) : favorites.delete(id);
  saveFavorites();
  render();
  if (lightbox.classList.contains("open")) syncLightboxState();
  if (infoPanel.classList.contains("open") && infoPanel.dataset.itemId === id) openInfoPanel(id);
}

async function downloadItem(item) {
  if (!item) return;
  try {
    const res = await fetch(item.url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = item.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (e) { showToast("Download failed"); }
}

function unhideItem(id) {
  hidden.delete(id);
  saveHidden();
  render();
  if (lightbox.classList.contains("open")) syncLightboxState();
  showToast("File restored to your gallery");
}

async function removeOrUnhide(id) {
  if (hidden.has(id)) { unhideItem(id); return; }
  await removeItem(id);
}

async function removeItem(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const isLocal = item.source === "local";

  if (settings.confirmRemove) {
    const ok = await confirmDialog(
      isLocal ? "Delete this file?" : "Hide this file?",
      isLocal
        ? `"${item.name}" will be permanently removed from this browser's local library.`
        : `"${item.name}" will be hidden from your gallery on this device. It stays in the repository, use Settings to restore it.`,
      isLocal ? "Delete" : "Hide"
    );
    if (!ok) return;
  }

  if (isLocal) {
    await dbDelete(id);
    URL.revokeObjectURL(item.url);
    localItems = localItems.filter((i) => i.id !== id);
  } else {
    hidden.add(id);
    saveHidden();
  }
  mergeItems();

  if (lightbox.classList.contains("open")) {
    const current = currentLightboxList[currentLightboxIndex];
    if (current && current.id === id) closeLightbox();
  }
  if (infoPanel.classList.contains("open") && infoPanel.dataset.itemId === id) closePanel(infoPanel);

  render();
  showToast(isLocal ? "File deleted" : "File hidden");
}

function restoreHidden() {
  hidden.clear();
  saveHidden();
  render();
  showToast("Hidden files restored");
}

function infoPreviewHtml(item) {
  if (item.broken) return ICONS.broken;
  if (item.category === "image" || item.category === "gif") return `<img src="${item.url}" alt="">`;
  if (item.category === "video") return item.thumb ? `<img src="${item.thumb}" alt="">` : ICONS.video;
  if (item.category === "audio") return ICONS.music;
  return ICONS.file;
}
function openInfoPanel(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  infoPanel.dataset.itemId = id;
  infoBody.innerHTML = `
    <div class="info-preview">${infoPreviewHtml(item)}</div>
    <dl class="detail-list">
      <div><dt>Filename</dt><dd>${escapeHtml(item.name)}</dd></div>
      <div><dt>Extension</dt><dd>.${item.ext}</dd></div>
      <div><dt>Category</dt><dd>${capitalize(item.category)}</dd></div>
      <div><dt>Size</dt><dd>${bytesToSize(item.size)}</dd></div>
      ${item.width ? `<div><dt>Dimensions</dt><dd>${item.width} x ${item.height}px</dd></div>` : ""}
      ${item.duration ? `<div><dt>Duration</dt><dd>${formatDuration(item.duration)}</dd></div>` : ""}
      <div><dt>Source</dt><dd>${item.source === "local" ? "Local (this browser)" : "Repository"}</dd></div>
      <div><dt>Favorite</dt><dd>${item.favorite ? "Yes" : "No"}</dd></div>
      <div><dt>Hidden</dt><dd>${hidden.has(item.id) ? "Yes" : "No"}</dd></div>
    </dl>
    <div class="info-actions">
      <button class="btn" data-action="download">${ICONS.download} Download</button>
      <button class="btn danger" data-action="remove">${removeActionIcon(item)} ${removeActionLabel(item)}</button>
    </div>`;
  infoBody.querySelector('[data-action="download"]').addEventListener("click", () => downloadItem(item));
  infoBody.querySelector('[data-action="remove"]').addEventListener("click", () => removeOrUnhide(item.id));
  openPanel(infoPanel);
}

let collectionPanelItemId = null;
function openCollectionPanel(id) {
  collectionPanelItemId = id;
  renderCollectionPickList();
  openPanel(collectionPanel);
}
function renderCollectionPickList() {
  if (collections.length === 0) {
    collectionPickList.innerHTML = `<p class="collection-pick-empty">No collections yet. Create one above.</p>`;
    return;
  }
  collectionPickList.innerHTML = collections.map((c) => {
    const inColl = c.itemIds.includes(collectionPanelItemId);
    return `<div class="collection-pick-row">
      <span>${escapeHtml(c.name)}</span>
      <button class="${inColl ? "in" : ""}" data-toggle-coll="${c.id}">${inColl ? "Added" : "Add"}</button>
    </div>`;
  }).join("");
}
collectionPickList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toggle-coll]");
  if (!btn || !collectionPanelItemId) return;
  toggleItemInCollection(btn.dataset.toggleColl, collectionPanelItemId);
  renderCollectionPickList();
});
$("#createCollectionBtn").addEventListener("click", () => {
  const input = $("#collectionNameInput");
  const coll = createCollection(input.value);
  if (!coll) { showToast("Name your collection first"); return; }
  input.value = "";
  if (collectionPanelItemId) toggleItemInCollection(coll.id, collectionPanelItemId);
  renderCollectionPickList();
  showToast(`Created "${coll.name}"`);
});
$("#collectionNameInput").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#createCollectionBtn").click(); });
$("#newCollectionBtn").addEventListener("click", () => { collectionPanelItemId = null; renderCollectionPickList(); openPanel(collectionPanel); });
collectionsNav.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-collection]");
  if (removeBtn) {
    e.stopPropagation();
    confirmDialog("Delete this collection?", "The files themselves are untouched, only the collection grouping is removed.", "Delete").then((ok) => {
      if (ok) deleteCollection(removeBtn.dataset.removeCollection);
    });
    return;
  }
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  setFilter(chip.dataset.filter);
});

function stopCurrentMedia() {
  if (currentMediaEl && (currentMediaEl.tagName === "VIDEO" || currentMediaEl.tagName === "AUDIO")) {
    try { currentMediaEl.pause(); } catch (e) {  }
  }
}
function buildStageMedia(item) {
  if (item.broken) {
    const div = document.createElement("div");
    div.className = "generic-stage";
    div.innerHTML = `${ICONS.broken}<p>This file could not be loaded</p>`;
    return div;
  }
  if (item.category === "image" || item.category === "gif") {
    const img = document.createElement("img");
    img.src = item.url; img.alt = item.name;
    img.addEventListener("error", () => markBroken(item.id));
    return img;
  }
  if (item.category === "video") {
    const video = document.createElement("video");
    video.src = item.url; video.controls = true; video.autoplay = true; video.playsInline = true;
    video.addEventListener("error", () => markBroken(item.id));
    return video;
  }
  if (item.category === "audio") {
    const wrap = document.createElement("div");
    wrap.className = "audio-stage";
    wrap.innerHTML = ICONS.music;
    const audio = document.createElement("audio");
    audio.src = item.url; audio.controls = true; audio.autoplay = true;
    audio.addEventListener("error", () => markBroken(item.id));
    wrap.appendChild(audio);
    return wrap;
  }
  const div = document.createElement("div");
  div.className = "generic-stage";
  div.innerHTML = `${ICONS.file}<p>Preview not available for this file type</p>`;
  return div;
}
function openLightbox(id) {
  currentLightboxList = getFilteredItems();
  currentLightboxIndex = currentLightboxList.findIndex((i) => i.id === id);
  if (currentLightboxIndex === -1) return;
  hideMiniPlayer(true);
  renderLightbox();
  lightbox.classList.add("open");
  document.body.classList.add("no-scroll");
  addRecent(id);
  updateCounts();
}
function closeLightbox() {
  const item = currentLightboxList[currentLightboxIndex];
  const mediaTag = currentMediaEl && currentMediaEl.tagName;
  if (item && currentMediaEl && (mediaTag === "AUDIO" || mediaTag === "VIDEO") && !currentMediaEl.paused && !currentMediaEl.ended) {
    showMiniPlayer(item, currentMediaEl);
  } else {
    stopCurrentMedia();
  }
  lightbox.classList.remove("open");
  document.body.classList.remove("no-scroll");
  if (document.fullscreenElement === lightbox) document.exitFullscreen().catch(() => {});
  lbStage.innerHTML = "";
  currentMediaEl = null;
}
function renderLightbox() {
  const item = currentLightboxList[currentLightboxIndex];
  if (!item) return;
  lbFilename.textContent = item.name;
  lbIndex.textContent = `${currentLightboxIndex + 1} / ${currentLightboxList.length}`;
  lbStage.innerHTML = "";
  const mediaEl = buildStageMedia(item);
  lbStage.appendChild(mediaEl);
  currentMediaEl = (mediaEl.tagName === "IMG" || mediaEl.tagName === "VIDEO") ? mediaEl : mediaEl.querySelector("audio") || null;
  syncLightboxState();
  renderFilmstrip();
}
function syncLightboxState() {
  const item = currentLightboxList[currentLightboxIndex];
  if (!item) return;
  lbFavBtn.classList.toggle("active", item.favorite);
  lbFavBtn.innerHTML = item.favorite ? ICONS.starFilled : ICONS.starOutline;
  lbRemoveBtn.innerHTML = removeActionIcon(item);
  lbRemoveBtn.setAttribute("aria-label", removeActionLabel(item));
}
function renderFilmstrip() {
  lbFilmstrip.innerHTML = currentLightboxList.map((it, idx) => {
    let inner;
    if (it.category === "image" || it.category === "gif") inner = `<img src="${it.url}" alt="">`;
    else if (it.category === "video") inner = it.thumb ? `<img src="${it.thumb}" alt="">` : ICONS.video;
    else if (it.category === "audio") inner = ICONS.music;
    else inner = ICONS.file;
    return `<div class="lb-thumb ${idx === currentLightboxIndex ? "active" : ""}" data-idx="${idx}">${inner}</div>`;
  }).join("");
  const activeThumb = lbFilmstrip.querySelector(".lb-thumb.active");
  if (activeThumb) activeThumb.scrollIntoView({ block: "nearest", inline: "center" });
}
function lbNav(delta) {
  if (currentLightboxList.length === 0) return;
  stopCurrentMedia();
  currentLightboxIndex = (currentLightboxIndex + delta + currentLightboxList.length) % currentLightboxList.length;
  renderLightbox();
  addRecent(currentLightboxList[currentLightboxIndex].id);
}

lightbox.querySelector(".lb-prev").addEventListener("click", () => lbNav(-1));
lightbox.querySelector(".lb-next").addEventListener("click", () => lbNav(1));
lightbox.querySelector('[data-action="close"]').addEventListener("click", closeLightbox);
lightbox.querySelector('[data-action="favorite"]').addEventListener("click", () => {
  const item = currentLightboxList[currentLightboxIndex];
  if (item) toggleFavorite(item.id);
});
lightbox.querySelector('[data-action="download"]').addEventListener("click", () => {
  downloadItem(currentLightboxList[currentLightboxIndex]);
});
lightbox.querySelector('[data-action="remove"]').addEventListener("click", () => {
  const item = currentLightboxList[currentLightboxIndex];
  if (item) removeOrUnhide(item.id);
});
lightbox.querySelector('[data-action="info"]').addEventListener("click", () => {
  const item = currentLightboxList[currentLightboxIndex];
  if (item) openInfoPanel(item.id);
});
lightbox.querySelector('[data-action="collection"]').addEventListener("click", () => {
  const item = currentLightboxList[currentLightboxIndex];
  if (item) openCollectionPanel(item.id);
});
lightbox.querySelector('[data-action="fullscreen"]').addEventListener("click", toggleLightboxFullscreen);
lbFilmstrip.addEventListener("click", (e) => {
  const thumb = e.target.closest(".lb-thumb");
  if (!thumb) return;
  stopCurrentMedia();
  currentLightboxIndex = parseInt(thumb.dataset.idx, 10);
  renderLightbox();
  addRecent(currentLightboxList[currentLightboxIndex].id);
});

function toggleLightboxFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else lightbox.requestFullscreen().catch(() => showToast("Fullscreen isn't available here"));
}

let touchStartX = null;
lightbox.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
lightbox.addEventListener("touchend", (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) lbNav(dx > 0 ? -1 : 1);
  touchStartX = null;
}, { passive: true });

function showMiniPlayer(item, mediaEl) {
  miniItem = item;
  mediaEl.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;left:0;";
  document.body.appendChild(mediaEl);
  currentMediaEl = mediaEl;
  miniName.textContent = item.name;
  miniPlayer.classList.remove("hidden");
  updateMiniPlayPause();
  mediaEl.addEventListener("timeupdate", updateMiniScrub);
  mediaEl.addEventListener("play", updateMiniPlayPause);
  mediaEl.addEventListener("pause", updateMiniPlayPause);
  mediaEl.addEventListener("ended", () => hideMiniPlayer(true));
}
function updateMiniScrub() {
  if (!currentMediaEl || !currentMediaEl.duration) return;
  miniScrubFill.style.width = (currentMediaEl.currentTime / currentMediaEl.duration * 100) + "%";
}
function updateMiniPlayPause() {
  if (!currentMediaEl) return;
  miniPlayPauseBtn.innerHTML = currentMediaEl.paused ? ICONS.play : ICONS.pause;
}
function hideMiniPlayer(stop) {
  if (!miniItem) return;
  if (stop && currentMediaEl) {
    try { currentMediaEl.pause(); } catch (e) {  }
    currentMediaEl.remove();
    currentMediaEl = null;
  }
  miniPlayer.classList.add("hidden");
  miniItem = null;
}
miniPlayPauseBtn.addEventListener("click", () => {
  if (!currentMediaEl) return;
  if (currentMediaEl.paused) currentMediaEl.play().catch(() => {});
  else currentMediaEl.pause();
});
$("#miniCloseBtn").addEventListener("click", () => hideMiniPlayer(true));
$("#miniThumbBtn").addEventListener("click", () => {
  if (!miniItem) return;
  const resumeTime = currentMediaEl ? currentMediaEl.currentTime : 0;
  const wasStandalone = !items.some((i) => i === miniItem);
  hideMiniPlayer(true);
  openLightbox(miniItem.id);
  if (currentMediaEl && resumeTime) {
    currentMediaEl.addEventListener("loadedmetadata", () => { currentMediaEl.currentTime = resumeTime; }, { once: true });
  }
  void wasStandalone;
});

function openPanel(panel) {
  ALL_PANELS().forEach((p) => { if (p !== panel) p.classList.remove("open"); });
  panel.classList.add("open");
  scrim.classList.add("show");
}
function closePanel(panel) {
  panel.classList.remove("open");
  if (!ALL_PANELS().some((p) => p.classList.contains("open"))) scrim.classList.remove("show");
}
function closeAllPanels() { ALL_PANELS().forEach(closePanel); }
function panelOpen() { return ALL_PANELS().some((p) => p.classList.contains("open")); }

$("#settingsBtn").addEventListener("click", () => openPanel(settingsPanel));
$("#showShortcutsBtn").addEventListener("click", () => openPanel(shortcutsPanel));
$$(".panel-close").forEach((btn) => {
  const map = { info: infoPanel, settings: settingsPanel, collection: collectionPanel, shortcuts: shortcutsPanel };
  btn.addEventListener("click", () => closePanel(map[btn.dataset.panel]));
});
scrim.addEventListener("click", () => { closeAllPanels(); closeSidebar(); });

let searchDebounce;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchClearBtn.classList.toggle("show", !!searchInput.value);
  searchDebounce = setTimeout(() => {
    searchQuery = searchInput.value.trim();
    render();
    searchCount.textContent = searchQuery ? `${getFilteredItems().length} match${getFilteredItems().length === 1 ? "" : "es"}` : "";
  }, 150);
});
searchClearBtn.addEventListener("click", () => {
  searchInput.value = ""; searchQuery = "";
  searchClearBtn.classList.remove("show");
  searchCount.textContent = "";
  render();
  searchInput.focus();
});
sortSelect.addEventListener("change", () => { sortMode = sortSelect.value; persistFilterSort(); render(); });

function setFilter(type) {
  filterType = type;
  filterNav.querySelectorAll(".filter-chip").forEach((c) => c.classList.toggle("active", c.dataset.filter === type));
  collectionsNav.querySelectorAll(".filter-chip").forEach((c) => c.classList.toggle("active", c.dataset.filter === type));
  $$(".mtab[data-mfilter]").forEach((t) => t.classList.toggle("active", t.dataset.mfilter === type));
  persistFilterSort();
  render();
  closeSidebar();
}
filterNav.addEventListener("click", (e) => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  setFilter(chip.dataset.filter);
});
$$(".mtab[data-mfilter]").forEach((tab) => tab.addEventListener("click", () => setFilter(tab.dataset.mfilter)));
$("#mobileSearchBtn").addEventListener("click", () => { openSidebar(); searchInput.focus(); });
$("#mobileMoreBtn").addEventListener("click", () => openPanel(settingsPanel));

function setViewMode(mode) {
  viewMode = mode;
  settings.viewMode = mode;
  saveSettings();
  viewSwitch.querySelectorAll(".view-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === mode));
  render();
}
viewSwitch.addEventListener("click", (e) => {
  const btn = e.target.closest(".view-btn");
  if (btn) setViewMode(btn.dataset.view);
});

function openSidebar() { sidebar.classList.add("open"); scrim.classList.add("show"); }
function closeSidebar() { sidebar.classList.remove("open"); if (!panelOpen()) scrim.classList.remove("show"); }
$("#mobileMenuBtn").addEventListener("click", () => { sidebar.classList.contains("open") ? closeSidebar() : openSidebar(); });

$("#randomBtn").addEventListener("click", openRandomMedia);
function openRandomMedia() {
  const pool = getFilteredItems().filter((i) => !i.broken);
  if (pool.length === 0) { showToast("Nothing to shuffle here"); return; }
  let pick;
  if (pool.length === 1) pick = pool[0];
  else {
    do { pick = pool[Math.floor(Math.random() * pool.length)]; } while (pick.id === lastRandomId);
  }
  lastRandomId = pick.id;
  openLightbox(pick.id);
}

$("#fullscreenBtn").addEventListener("click", () => {
  document.getElementById("app").classList.toggle("fullscreen-mode");
});

$("#addFilesBtn").addEventListener("click", () => fileInput.click());
$("#emptyAddFilesBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) importFiles(fileInput.files);
  fileInput.value = "";
});

let dragCounter = 0;
window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes("Files")) return;
  dragCounter++;
  dragOverlay.classList.add("show");
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) dragOverlay.classList.remove("show");
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dragOverlay.classList.remove("show");
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
});

document.addEventListener("keydown", (e) => {
  const typing = e.target === searchInput || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";

  if (e.key === "Escape") {
    if (lightbox.classList.contains("open")) closeLightbox();
    else if (panelOpen()) closeAllPanels();
    else if (confirmModal.classList.contains("show")) closeConfirm(false);
    else if (sidebar.classList.contains("open")) closeSidebar();
    else if (document.getElementById("app").classList.contains("fullscreen-mode")) document.getElementById("app").classList.remove("fullscreen-mode");
    return;
  }
  if (typing) return;

  if (e.key === "/") { e.preventDefault(); searchInput.focus(); return; }
  if (e.key === "?") { e.preventDefault(); openPanel(shortcutsPanel); return; }
  if (e.key === "r" || e.key === "R") { openRandomMedia(); return; }

  if (!lightbox.classList.contains("open")) return;
  if (e.target.tagName === "VIDEO" || e.target.tagName === "AUDIO") return;

  if (e.key === "ArrowLeft") lbNav(-1);
  else if (e.key === "ArrowRight") lbNav(1);
  else if (e.key === " ") {
    e.preventDefault();
    if (currentMediaEl && (currentMediaEl.tagName === "VIDEO" || currentMediaEl.tagName === "AUDIO")) {
      currentMediaEl.paused ? currentMediaEl.play().catch(() => {}) : currentMediaEl.pause();
    }
  } else if (e.key === "i" || e.key === "I") {
    const item = currentLightboxList[currentLightboxIndex];
    if (item) openInfoPanel(item.id);
  } else if (e.key === "f") {
    const item = currentLightboxList[currentLightboxIndex];
    if (item) toggleFavorite(item.id);
  } else if (e.key === "F") {
    toggleLightboxFullscreen();
  }
});

function updateSettingsStats() {
  $("#hiddenCountText").textContent = `${hidden.size} hidden on this device`;
  $("#statRepoCount").textContent = `${repoItems.length} file${repoItems.length === 1 ? "" : "s"}`;
  $("#statLocalCount").textContent = `${localItems.length} file${localItems.length === 1 ? "" : "s"}`;
}
function applySettings() {
  document.documentElement.style.setProperty("--thumb-scale", settings.thumbScale);
  document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
  $$("#thumbSizeGroup .pill").forEach((p) => p.classList.toggle("active", parseFloat(p.dataset.scale) === settings.thumbScale));
  $("#toggleAutoplay").classList.toggle("on", settings.autoplay);
  $("#toggleMotion").classList.toggle("on", settings.reduceMotion);
  $("#toggleConfirmRemove").classList.toggle("on", settings.confirmRemove);
  $("#toggleRemember").classList.toggle("on", settings.remember);
  viewSwitch.querySelectorAll(".view-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === viewMode));
  sortSelect.value = sortMode;
}
$("#thumbSizeGroup").addEventListener("click", (e) => {
  const pill = e.target.closest(".pill");
  if (!pill) return;
  settings.thumbScale = parseFloat(pill.dataset.scale);
  saveSettings(); applySettings();
});
$("#toggleAutoplay").addEventListener("click", () => { settings.autoplay = !settings.autoplay; saveSettings(); applySettings(); render(); });
$("#toggleMotion").addEventListener("click", () => { settings.reduceMotion = !settings.reduceMotion; saveSettings(); applySettings(); });
$("#toggleConfirmRemove").addEventListener("click", () => { settings.confirmRemove = !settings.confirmRemove; saveSettings(); applySettings(); });
$("#toggleRemember").addEventListener("click", () => { settings.remember = !settings.remember; saveSettings(); applySettings(); });
$("#restoreHiddenBtn").addEventListener("click", restoreHidden);

$$('[data-clear]').forEach((btn) => {
  btn.addEventListener("click", async () => {
    const kind = btn.dataset.clear;
    const labels = { favorites: "favorites", recent: "recently viewed history", hidden: "hidden files", collections: "collections", all: "all Nigallery local data" };
    const ok = await confirmDialog(`Clear ${labels[kind]}?`, "This only affects this browser and cannot be undone.", "Clear");
    if (!ok) return;
    if (kind === "favorites" || kind === "all") { favorites.clear(); saveFavorites(); }
    if (kind === "recent" || kind === "all") { recentList = []; saveRecent(); }
    if (kind === "hidden" || kind === "all") { hidden.clear(); saveHidden(); }
    if (kind === "collections" || kind === "all") { collections = []; saveCollections(); renderCollectionsNav(); }
    if (kind === "all") {
      settings = Object.assign({}, DEFAULT_SETTINGS);
      saveSettings();
      viewMode = settings.viewMode; sortMode = settings.sortMode; filterType = settings.filterType;
      applySettings();
      setFilter(filterType);
    }
    render();
    showToast(`Cleared ${labels[kind]}`);
  });
});

async function init() {
  applySettings();
  renderCollectionsNav();
  filterNav.querySelectorAll(".filter-chip").forEach((c) => c.classList.toggle("active", c.dataset.filter === filterType));
  const [repo, local] = await Promise.all([fetchRepoItems(), loadLocalItems()]);
  repoItems = repo;
  localItems = local;
  mergeItems();
  render();
}
init();

})();
