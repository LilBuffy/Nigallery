# Nigallery 2.0

A fucking **local-first media browser** built with **HTML, CSS, and Vanilla JavaScript.**

No backend. No database. No accounts. Just your media and a UI that actually respects it.

## Project status

**ACTIVE / STILL ALIVE, NOW WITH LESS WINDOWS EXPLORER 2009 ENERGY**

CLICK ME: https://lilbuffy.github.io/Nigallery/

YOUR ANTIVIRUS MIGHT THINK THIS IS A DANGEROUS WEBSITE, BUT I SWEAR I'M NOT A HACKER.

Drop images, GIFs, videos, or audio into `media/`, push, and the gallery finds them on its own. No manifest file to regenerate, no build step, no Node.js needed to run the site.

## What's new in 2.0

* Full desktop app layout: sidebar, toolbar, search, sort, and a real gallery area
* Four gallery views (large, standard, compact, list), remembered per browser
* Search across filename, extension, and media type, with a live match count
* Expanded sorting: name, newest/oldest added, size, dimensions, duration
* Recently viewed history, capped and cleanable
* Local collections, group whatever media you want without touching the server
* A properly redesigned lightbox: filmstrip, index counter, fullscreen, swipe, keyboard shortcuts
* A small persistent mini player so audio and video keep going after you close the viewer
* Random media button that respects your current filter
* Fullscreen gallery mode for just looking at your stuff
* A real mobile experience: bottom tab bar, slide-out filters, touch-friendly viewer
* Broken or missing file handling that doesn't just show a dead gray box
* A proper settings panel: appearance, behavior, and one-click local data clearing

## Tech stack

* HTML
* CSS
* Vanilla JavaScript
* GitHub Pages, for hosting

That's it. No frameworks, no npm install, no 46 dependencies to display a picture.

## How media loading actually works

Nigallery does not use a committed manifest file. On GitHub Pages, the page calls GitHub's own API (`/repos/:owner/:repo/contents/media`) at load time to list whatever is in your `media` folder right now. Add or remove files, push, refresh: that's the whole workflow. There is no generator to run and nothing to keep in sync.

If you're running Nigallery somewhere that isn't `*.github.io` (a local server, another static host), that API call is skipped and the gallery just shows whatever you add locally through drag and drop or Add files.

## Favorites, hidden files, recently viewed, and collections

All of this lives in `localStorage` and IndexedDB, entirely on your device.

* None of it is sent to GitHub
* None of it is visible to other visitors
* None of it changes the actual files in the repository
* Only your browser knows about it

Hide is not delete. A hidden repository file just disappears from your own view on this device. Bring it back any time from Settings, or from the Hidden filter.

Files you add through drag and drop or Add files are stored locally in this browser (IndexedDB), not uploaded anywhere. Delete them and they are actually gone.

## Media support

* Images: JPG, JPEG, PNG, WebP, AVIF, BMP, SVG
* GIF
* Video: MP4, WebM, MOV, OGV, M4V
* Audio: MP3, WAV, M4A, FLAC, OGG

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus search |
| `Esc` | Close viewer, panel, or sidebar |
| `Left` / `Right` | Previous / next media |
| `Space` | Play or pause the open video or audio |
| `F` | Toggle favorite (in the viewer) |
| `I` | Open details (in the viewer) |
| `Shift F` | Fullscreen the viewer |
| `R` | Random media |
| `?` | Show the shortcuts panel |

## Deployment

Push to a repo, enable GitHub Pages, drop files into `media/`. Nothing else to configure. Works from any static host too, the GitHub media-listing feature just won't activate off `*.github.io`.

## Browser compatibility

Any modern evergreen browser (Chrome, Firefox, Safari, Edge). Needs `IndexedDB` and `localStorage` for local files, favorites, hidden state, recently viewed, and collections to work. Everything else degrades gracefully if either is unavailable.

## Project personality disclaimer

This is a personal project born out of pure boredom, now redesigned into something that doesn't look like a random gallery demo. It's still allowed to be a little chaotic. That's the brand.
