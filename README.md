# Oscar Watchlist 2027 — Android PWA

A zero-backend, mobile-first movie watchlist in plain HTML, CSS, and JavaScript. Contains the 28 user-supplied titles in their initial priority order. Each device has its own independent rankings and watched statuses.

## Files

- `index.html`: App page.
- `styles.css`: Responsive dark interface.
- `data.js`: Initial movie dataset. Used **only on a brand-new install** (not reapplied to existing data).
- `app.js`: Ranking, filtering, editing, sharing, JSON backup/restore, localStorage persistence.
- `manifest.webmanifest`, `sw.js`, `icons/`: PWA install and offline assets.

## Test locally

From this folder run:

```sh
python -m http.server 8765
```

Visit `http://localhost:8765/`. `file://` opening is not suitable for service workers. Test on a real Android phone over a deployed HTTPS URL for installation and native sharing.

## Deploy for free (Cloudflare Pages)

1. Log in to Cloudflare. Open **Workers & Pages → Create → Pages** and choose a static site/direct upload option.
2. Upload the **contents of this folder**, including the `icons` directory (or connect a repository containing these files).
3. Open the HTTPS URL on an Android phone using Chrome. Use Chrome's menu → **Add to Home screen** / **Install app**. Repeat on the second phone.
4. On each phone, open the installed app once while online to allow the service worker to cache files. Each phone's movie state is independent.

GitHub Pages also works as long as the whole folder is hosted under one HTTPS path.

## Practical usage

- **Drag the grid handle** on a movie card to reorder, or tap its small up/down arrows. To change rankings, set the view filter to **All**. Filters do not modify rankings.
- **Category selection** has independent orderings. The first ordering of every category is inherited from the original All Movies priority.
- **Edit** a movie to add a release year, synopsis, names for acting/directing categories, rating, or availability details. Custom categories can also be added.
- **Settings → Export JSON** creates a device-local backup. **Import JSON** validates and previews a file before replacing the phone's current data; save a backup first.
- **Share** a movie with Android's native Share Sheet. The recipient opens the shared URL and confirms import. The link contains only movie metadata, **never rankings or watched status**. If necessary, use **Settings → Import shared movie** to paste a link.
- **Trailer** opens a YouTube search; the device may route it to the YouTube app.
- **Available now** means both marked Available and not yet Watched. Availability is never automatically revised.

## Important data behavior

All movie data is stored in browser `localStorage` for this site's origin, keyed as `oscar-watchlist-2027-v1`. Clearing Chrome/Android website data or changing the deployment origin can erase access to it. Use JSON export before changing devices or sites.

New releases of the app must **not change** the storage key or replace a saved state with `SEED_MOVIES`. Update `sw.js` cache version when publishing changed app files; localStorage will remain separate from cached app code. If introducing breaking storage schema changes, write a migration first.

The 28 initial movies have **no release years or synopses** supplied, so those fields are intentionally blank. IMDb scores, availability details, and named category contenders are preserved from the submitted list, including apparent spelling mistakes. “Best Movie” is represented as **Best Picture**. “Other Interesting” is a custom ninth category. Names are *potential contenders*, not claims of official nominations.

## Limitations

- Native Android link handling varies by browser and installed PWA configuration; shared links always work as a regular web import page under the same origin. If installed-PWA routing differs, use the copy/paste import fallback.
- Offline app use works after the app shell is cached; YouTube and sending messages still require their own network/apps.
- The mobile web platform can evict localStorage; no automatic backups or cross-device sync are provided.
- Movie metadata is manually maintained, not validated against IMDb or official Oscars information.
