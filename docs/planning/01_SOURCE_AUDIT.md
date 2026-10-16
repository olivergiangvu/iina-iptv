# SOURCE AUDIT — IINA Channels v0.2.1

**Audit date:** 2026-10-16  
**Upstream:** https://github.com/DTTerastar/iina-plugin-channels  
**Pinned upstream commit:** `8e5e82137bde3d2016adc6a8158763f167add3e1` (2026-10-03)  
**Upstream version:** `0.2.1` / `ghVersion: 3`  
**License:** MIT, copyright 2026 Darrell Turner; preserve LICENSE and attribution  
**Audit method:** inspected the complete GitHub repository tree and all text/code files using the GitHub connector. No executable tests in macOS/IINA were conducted. Upstream screenshot was inventoried but not visually audited. This is **static source audit**, not runtime acceptance.

## A. Exact source inventory

| Path | Baseline size | What exists | Decision |
|---|---:|---|---|
| `Info.json` | 597 B | IINA plugin manifest, main entry, sidebar, permissions, M3U URL preference | MODIFY in implementation phase |
| `main.js` | 2,796 B | menu/sidebar/window wiring, curl fetch, player open, media title | SPLIT/MODIFY |
| `channels.html` | 5,930 B | HTML/CSS UI, channel search/group filtering, XMLTV Now/Next | REUSE UI patterns; REWORK data lifecycle |
| `m3u.js` | 2,663 B | M3U parser, URL-tvg lookup, XMLTV timestamp, self-check | REUSE parsing helpers after hardening |
| `pref.html` | 583 B | Plain M3U URL field | REPLACE with secure source and refresh settings |
| `README.md` | 2,585 B | Install, features, limitations | KEEP as upstream reference; rewrite fork readme |
| `LICENSE` | 1,071 B | MIT license | KEEP VERBATIM |
| `screenshot.png` | 92,393 B | UI screenshot asset | KEEP from GitHub fork; binary not fetched into planning pack |

No CI workflow, external dependencies, production fixtures, typed schema, automated integration tests, EPG cache, native Xtream auth, or catch-up resolver appears in the inspected repository tree.

## B. Code-level observations (source-derived)

### `Info.json`
- `entry: main.js`, `sidebarTab: Channels`, `preferencesPage: pref.html`, `preferenceDefaults.m3u_url: ""`.
- `permissions: ["network-request", "show-osd", "file-system"]`; `allowedDomains: ["*"]`.
- Does **not** define `globalEntry`. No central application-level refresh scheduler.
- Fork must change `identifier`, `ghRepo`, author attribution, version and update sequence **only after fork exists**; preserve upstream attribution/LICENSE.

### `main.js`
- `fetchText(url)` executes `/usr/bin/curl -fsSL --compressed --proto =http,https --max-time 60 -A iina-plugin-channels -- URL`.
- This allows HTTP(s) M3U/XMLTV and circumvents limitations the author encountered with ATS/CORS; requires `file-system` permission to execute curl.
- `show(view)` loads `channels.html`; each view's `load` fetches M3U, then the view requests guide URL separately.
- Standalone view **lazy loads once** when menu is opened; this already addresses an older eager-load bug. However sidebar and standalone retain separate datasets/fetch flows, as do different IINA player instances.
- `mpv.addHook('on_load', ...)` sets the media title for pending channel, `core.open(url)` gives playback to IINA. Good to retain, with a guarded channel-selection state.
- No concurrency de-duplication, freshness timestamps, cache, or cancellation policy.

### `channels.html`
- Search: lower-case words over channel name/group plus **current** programme title only.
- Channel group dropdown; builds up to 300 DOM rows per render. Other hits are hidden until user narrows selection.
- XMLTV is parsed in a WebView `DOMParser` into a full in-memory Map, sorted per channel; no file/persistent cache.
- `nowNext` uses a linear `findIndex` for each displayed channel; a 60-second `setInterval(render, 60000)` updates UI time labels only (not source EPG refresh).
- `guide` must be XMLTV text, with `tvg-id` exact matching; only the first comma-separated `url-tvg`/`x-tvg-url` is used.
- Current/next programme appears inline or in tooltip; **no multi-day grid, no archive navigation, no local EPG search**.
- Uses `textContent` rather than HTML insertion for channel/programme labels (preserve this XSS-safe pattern).

### `m3u.js`
- Parses `#EXTINF`, `group-title`, `tvg-id`, and following stream URL; bypasses `#` comment/option lines.
- Does not parse `tvg-logo`, `tvg-name`, catch-up tags, channel numbers, stream headers/DRM options, or per-channel archive metadata.
- `guideUrl(text)` examines playlist header `url-tvg`/`x-tvg-url`; no explicit EPG override setting.
- `xmltvTime` handles UTC offsets. Add invalid-value handling and DST/provider-timezone test fixtures.
- `node m3u.js` is a small built-in self-check (three fixtures + timestamp tests), not an integration test suite.

### `pref.html`
- Stores a complete `m3u_url` in plain plugin preference. URLs can embed username/password or bearer tokens.
- No independent Channel/EPG refresh intervals or manual/startup policy controls.

## C. Source risks and required remedies

| ID | Severity | Finding | Remedy / explicit gate |
|---|---|---|---|
| A-01 | HIGH | Per-view/per-player playlist and EPG fetch duplication | Single global coordinator; one in-flight fetch per provider/data type; multiwindow test |
| A-02 | HIGH | Credential-bearing URL in plain preferences and potentially subprocess arguments | Keychain for credentials; sanitize/redact UI/errors/logs; document direct URL exposure limitations |
| A-03 | HIGH | No TTL/cache/bounds; full XMLTV DOM parse in each view | Central TTL cache, bounded parsing, persist reduced data, stale-while-revalidate, measure big feed |
| A-04 | HIGH | No Xtream API/channel archive mapping | Dedicated Xtream source adapter and provider-specific archive resolver |
| A-05 | MEDIUM | Only 300 displayed rows, not virtualized | Virtual scrolling or windowed list; keyboard navigation tests |
| A-06 | MEDIUM | XMLTV no gzip-file support, first guide URL only, exact `tvg-id` | XMLTV mapping/fallback/diagnostics, test compressed feed before supporting it |
| A-07 | MEDIUM | Search excludes future/past programme and description | Unified local normalized search index + scoped EPG search |
| A-08 | MEDIUM | No source contract / test fixtures / automated release gates | Add fixtures and no-network unit tests; human IINA smoke tests |
| A-09 | MEDIUM | Wide wildcard domains and shell capability | Enforce scheme/URL/redirect checks; no arbitrary command/hostname taken from untrusted feed |
| A-10 | LOW | Status/errors are UI-local, incomplete failure recovery | User-friendly last-updated, stale badge, manual retry, prior-cache fallback |
| A-11 | MEDIUM | Native PiP behavior belongs to IINA and is already good for owner | Do not write overlay/subtitle/PiP code; non-regression check only |

## D. Reuse / modification / new code mapping

| Functional area | Reuse exactly | Modify | New implementation |
|---|---|---|---|
| Playback | `core.open`, `mpv on_load`, IINA native track/PiP | Pending-selection, errors, URL validation | Xtream URL resolver incl. TS/HLS provider profile |
| Channel catalog | Group/search UI, `parseM3U` basics | Channel normalization; logo, ID, ordering | Xtream live categories/streams connector; unified channel model |
| EPG Viewer | `xmltvTime`, XMLTV title/description parse; sidebar UI | EPG mapping, data cache, Now/Next efficiency | Full grid, time/date navigation, on-demand EPG detail |
| Refresh | Existing manual ↻ UI idea | Stop view-owned fetch, add status | Global coordinator; separate channel/EPG timers; freshness policy; de-dup/backoff |
| Catch-up | IINA `core.open` | EPG programme action and time handling | Archive capability detection; provider-specific timeshift URL resolver |
| Advanced search | Channel group/name filter | Token normalization, ranking | Programme title/description index; past/current/future and archive filters |
| Credentials/config | Existing settings page structure | Remove plain secret-bearing URL; make preferences non-secret | Keychain handling, secure credential lifecycle and redaction |

## E. API facts verified separately

- IINA's global entry uses `globalEntry` in `Info.json` (confirmed by IINA's Development Guide and its official `iina/plugin-online-media` plugin; a separate documentation example uses `global`, which is inconsistent and should not be copied).
- Main entries are per-player; global entry is once per application. Global/main message passing is officially supported.
- `iina.file` supports sandboxed `@data/` text storage; `iina.utils.keyChainWrite/keyChainRead` supports system Keychain.
- `iina.standaloneWindow` allows WebView UI, but WebView JS exchanges data via `postMessage` with entry JS.
- `iina.http` is officially supported; upstream's `curl` fallback for HTTP/CORS must be tested against real Xtream providers, not assumed harmless.

## F. Verified external references

1. https://github.com/DTTerastar/iina-plugin-channels/tree/8e5e82137bde3d2016adc6a8158763f167add3e1
2. https://docs.iina.io/pages/getting-started.html
3. https://docs.iina.io/pages/dev-guide.html
4. https://docs.iina.io/pages/global-entry.html
5. https://docs.iina.io/interfaces/IINA.API.Global
6. https://docs.iina.io/interfaces/IINA.API.Utils
7. https://docs.iina.io/interfaces/IINA.API.File
8. https://github.com/iina/plugin-online-media/blob/main/Info.json

**Audit conclusion:** A small, reusable UI/parsing starter, **not** an existing full IPTV app. Do not ship changes before global lifecycle, secret storage, EPG resource limits and provider catch-up profiles are specified and tested.