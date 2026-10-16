# TECHNICAL SPECIFICATION — IINA IPTV (Live TV Only)

**Document status:** DESIGN BASELINE / REVIEW READY, **not approved implementation**  
**Version:** TS-0.1, 2026-10-16  
**Target platform:** macOS, IINA 1.5.x initially, direct player playback  
**Origin:** fork of `DTTerastar/iina-plugin-channels` pinned at `8e5e82137bde3d2016adc6a8158763f167add3e1`  
**Scope owner requirements:** 5 functional modules: Live Playback; EPG Viewer; Channels/EPG Refresh; Catch-up; Advanced Channel/EPG Search.

## 0. Product charter — invariant decisions

- **LIVE TV ONLY.** No Movies, Series, VOD catalog, TMDB/IMDb, AIOMetadata, Trakt, CrossWatch, Jellyfin facade, recording server, or VOD bridge integration, now or in planned roadmap.
- Playback is **native IINA/mpv**, already validated with IPTVnator as external player. Do not implement a new renderer, transcoder, AVPlayer wrapper, PiP overlay, subtitle compositor, or audio engine.
- Owner confirms **IINA native PiP with subtitle works well**. Treat as a **non-regression invariant**, not a development track.
- macOS-first, zero extra Docker containers, zero new server service, no auto-started launch daemon/agent, no modification to running Xtream VOD Unified v0.6.0 or its SQLite/env/nginx configuration.
- No Electron/React/Vue frontend. Plain IINA Plugin JavaScriptCore + WebView HTML/CSS/JS, minimal modules, no new package/runtime dependency unless justified by a measured defect.
- One provider/account baseline with Xtream-native support; retain M3U input inherited from Channels. Multiple-provider aggregation and cross-device sync are not P0.
- Preserve MIT copyright and license; change plugin identifier and `ghRepo` only in an actual fork.

## 1. Target architecture

```text
  Xtream provider (player_api.php, live.ts / m3u8, xmltv.php, archive)
  M3U/XMLTV source (existing support)
                   |
                   v
       IINA plugin GLOBAL ENTRY (once per IINA app)
       +-------------------------------------------+
       | Credential access (Keychain)              |
       | Provider adapters: Xtream / M3U           |
       | ChannelCatalog + EPGCache (@data)         |
       | RefreshCoordinator (independent policies) |
       | NormalizedSearchIndex                     |
       | CatchupResolver                           |
       | Request de-dup + backoff + diagnostics     |
       +---------------------+---------------------+
                             | messages (data only)
                 +-----------+-----------+
                 |                       |
                 v                       v
       PLAYER MAIN ENTRY         PLAYER MAIN ENTRY
       Sidebar / EPG Window      Sidebar / EPG Window
       selection -> core.open    selection -> core.open
                 |                       |
                 v                       v
                 IINA / mpv native decoding & Native PiP

  No separate daemon, proxy, transcoder or Docker stack.
```

**Critical entry split:** `globalEntry` hosts ONE scheduler/cache instance per application. Each `main.js` controls only its player and owns UI bridge. UI never fetches playlist/guide directly; it requests data via messages and receives bounded subsets. Do not rely on `global.createPlayerInstance` to auto-open new players in v0.1 because recent IINA reports a screen-sleep behavior with plugin-created players; standard player-flow regression to be proven separately. The entry message protocol, global-to-player targeting, and `globalEntry` manifest field must be verified on the installed IINA release before feature coding.

### Proposed source tree (design only; NOT created)

```text
Info.json                  // new identity, globalEntry + main entry
main.js                    // only player commands, sidebar/window messaging
global.js                  // once-per-app coordinator + client messages
pref.html                  // source selection, refresh settings, status
ui/sidebar.html            // virtual channel browser, Now/Next
ui/epg.html                // grid, catchup actions, search
lib/model.js               // stable channel/programme contract
lib/m3u.js                 // reuse and harden upstream parser
lib/xtream.js              // live-only provider adapter
lib/xmltv.js               // bounded parse, time and id mapping
lib/cache.js               // @data storage, limits, atomicity strategy
lib/refresh.js             // singleflight timers, startup and retry
lib/catchup.js             // per-provider archive URL generation
lib/search.js              // local cross-channel/EPG index
lib/security.js            // url validation, keychain refs, redaction
tests/fixtures/*           // synthetic, no credentials
```

No files above, apart from upstream originals, exist as deliverable code. This is a proposed directory structure.

## 2. Canonical data contracts

### Channel

```text
Channel {
  id: string,                 // <source_id>:<stream_id> OR stable M3U ID
  sourceId: string,
  name: string,
  aliases: string[],          // if explicitly present or user-provided; no guessed aliases
  groupId: string | null,
  groupName: string,
  channelNumber: number|null,
  logoUrl: string|null,
  epgId: string|null,
  streamRef: string,          // opaque identifier; not a credentialed URL in UI/cache
  catchup: { advertised: boolean, archiveDays: number|null,
             profile: string|null },
  updatedAt: timestamp
}
```

### Programme

```text
Programme {
  id: string, channelId: string, sourceEpgId: string,
  startUtcMs: number, endUtcMs: number,
  title: string, description: string|null,
  category: string[]|null,
  source: "xmltv"|"xtream-short-epg"|"xtream-table",
  archiveHint: boolean|null
}
```

### Source / cache / errors

```text
Source { id, type: "xtream"|"m3u", baseUrl, displayName,
         credentialRef: "keychain:<sourceId>", enabled: boolean }
CacheManifest { schema, sourceId, channelsFetchedAt, epgFetchedAt,
                channelCount, epgRangeUtc, checksum, state: "fresh"|"stale"|"empty" }
SourceError { code, sourceId, scope, retryable, userMessage }
```

**Invariants:** UTC canonical timestamps; timezone conversion only in UI/archive adapters. Never persist stream URLs containing provider secrets in index/telemetry. Stable channel IDs independent of display name, with exact EPG match as default and visible diagnostics when unresolved. No silent incorrect cross-channel guide substitution.

## 3. Functional module M1 — Channel Playback (P0)

### Required
- Add/test an Xtream Codes account using authorized provider URL, username/password; read live categories and live streams only (`get_live_categories`, `get_live_streams`). No VOD API calls.
- Import direct M3U playlist as an alternative; retain `group-title`, `tvg-id`, channel names, and current direct-stream support.
- Group/category browsing, channel name/logo, search shortcut, channel selection, channel change.
- Resolve the stream URL only at play time; open with `iina.core.open()`; respect provider-supported TS/HLS formats and redirects.
- Preserve IINA-native audio, subtitles, hardware decode and existing PiP behavior; don't force mpv codec/subtitle options globally.
- User-visible failures: authentication denied, source unavailable, invalid stream, timeouts; channel list remains available from cache.

### Boundaries
- No concurrent preview players. No prefetching video. No transcoding, channel recording or silent CDN probing.
- Do not promise every source codec works on every hardware; player/support tests are the ground truth.
- Provider credentials embedded in path/query of Xtream direct stream URLs can be visible to the local playback stack and provider/CDN. Keychain protects storage **not complete in-process/transport secrecy**. Never log full URL.

### Mapping
- Reuse: `core.open`, `mpv.addHook('on_load')`, HTML safe `textContent`, basic group list.
- Modify: `parseM3U`, source handling, pending selection and status.
- New: Xtream live API connector, canonical channels, per-source runtime URL resolver, Keychain, guarded redirect handling.

## 4. Functional module M2 — EPG Viewer (P0)

### Required UX
- **Compact sidebar:** programme Now/Next, start-end, current progress, optional description, stale-data indicator.
- **Full EPG standalone window:** channel/time grid, date/hour navigation across feed's actual retention range; current-time marker; programme detail panel.
- Past programmes appear with "Watch replay" action only when catch-up capability and archive window validate; future entries are non-playable.
- XMLTV import: timestamp offsets, channel ID mapping, title/description; support playlist-declared guide and optional explicit EPG URL override.
- Xtream-specific `get_short_epg`/`get_simple_data_table` fallback is conditional on provider support. Different providers may omit or encode fields differently; use synthetic fixtures and validate real provider data.
- Display timezone follows macOS locale. Persist UTC values; handle DST/no timezone and malformed entries explicitly.

### Performance
- Render only visible grid cells/time slice (virtualized rows + time window). No full EPG DOM on every view.
- Fetch/download full XMLTV once per refresh TTL if required by provider; **lazy UI rendering does not magically reduce full XMLTV download cost**.
- Cap source size and decoded programme count according to benchmark/fixture limits; reject or degrade gracefully rather than crash IINA.
- Gzipped `.xml.gz` is **NOT supported in upstream**; supporting it must be an explicit tested acceptance condition, not an assumed property of `curl --compressed` (HTTP content encoding differs from `.gz` file content).

### Mapping
- Reuse: XMLTV offset parser and DOM label handling; `sidebar` and `standaloneWindow` API.
- Modify: guide parser/index, Now/Next lookup, mapping/diagnostics.
- New: Full EPG grid, on-demand detail UI, cache format, XMLTV size guard, gzip decoding path (if approved).

## 5. Functional module M3 — Channel / EPG Refresh (P0)

Two independent data pipelines, sharing one coordinator:

| Setting | Allowed schedule | Proposed default |
|---|---|---|
| Refresh channels | Manual only, 1h, 2h, 3h, 6h, 12h, 24h | 12h |
| Refresh EPG | Manual only, 1h, 2h, 3h, 6h, 12h, 24h | 3h |
| At IINA launch | Off / refresh stale / force refresh | On, stale-only |
| Manual actions | Channels / EPG / All | Available |

- **Minimum automatic cadence is hourly** (not every minute); do not create OS background agents. The schedule runs while IINA is running, including app idle; suspended/sleeping macOS simply catches up on wake/resume when due.
- At IINA startup: show last-known cached state immediately, then revalidate expired data once (if enabled). Force-on-every-launch optional user selection, but de-duplicated if a request is active.
- Refresh scheduler time = `last_success_at + interval`, not `last_attempt_at`; on failure preserve last success and apply capped backoff with jitter, never request storms.
- Channel and EPG refreshes do not automatically trigger each other; if channel IDs change, invalidate affected mappings, not entire cache unless necessary.
- Single-flight per `(sourceId, dataset)` globally. One download regardless of count of views/windows. Abort/defer when shutting down; manual refresh should not overlap an in-progress identical fetch.
- If cache unusable, show explicit empty/error status; do not silently show old guide as fresh.
- UI status: last successful update, source, age, next due, active spinner and last error.
- Request deadlines, response-size bounds, ETag/Last-Modified when supported, and connection lifecycle should be defined/tested before performance release.
- Do not save plaintext source credentials in plugin preferences. Use IINA's `utils.keyChainWrite` and `utils.keyChainRead`, referencing only source IDs in preferences/cache.

### Cache strategy
- `@data/` stores bounded channel/EPG JSON + schema version and metadata. It contains no unredacted auth URLs or playback tokens.
- Prefer reduced/normalized programme data over raw unbounded XMLTV; playlist and EPG should be independently invalidatable.
- Cache must remain usable offline/stale; schema migration is versioned and rollback-safe. Define write integrity/atomicity method in implementation spike; file API does not by itself guarantee transactional updates.
- No extra SQLite/Redis or local HTTP server in v0.1–v1.0 unless measurements prove necessary (change request required).

## 6. Functional module M4 — Catch-up Playback (P0)

- Detect capabilities from Xtream (`tv_archive`, `tv_archive_duration`, EPG archive hints), only display replay where actual archive is eligible.
- Map selected programme UTC start/end to the provider's required timezone and API format **without silently treating provider local time as UTC**.
- Support profile-specific timeshift URL generation; Xtream deployments vary (`/timeshift/...`, `.ts`/`.m3u8`, provider-specific paths). Do not hardcode one template as universal.
- Resolve playback URL at selection time; pass to `core.open()`. IINA handles seek/audio/subs/PiP as with normal media.
- Off-by-one-hour DST, midnight crossing, expiry, future programme, zero duration, unavailable archive, 401/403/404 and TS/HLS variants must be tested.
- No recording/DVR/timeshift buffer maintained by plugin. "Catch-up" means **provider-hosted archive playback**, not retroactive live rewind if provider lacks archive.

**Unknown/needs fixture:** actual Xtream provider archive profile and archive timezone. Do not pronounce feature "working" from metadata flags alone.

## 7. Functional module M5 — Advanced Local Search (P0)

One local search index over the loaded Channel Catalog and cached EPG:

- Channel name (full, prefix, token and substring), explicit aliases, channel number, group/category, `tvg-id`.
- Programme title, description where present, Now/Next, past archive programmes and upcoming programmes.
- Default search unifies channel/programme results with result type, channel, airing time and action (`Play live`, `Watch replay`, `Show programme`).
- Vietnamese diacritic-insensitive normalization, case folding and whitespace/token normalization; don't destroy original presentation strings.
- Filters: Channels / Programmes / On now / Upcoming / Past with replay eligibility / Group; only index the actual EPG retention range.
- Rank direct channel name/exact match before fuzzy content match, restrict result count and use view virtualization; debounced input ~150–250ms.
- Zero per-keystroke network requests; no AI/external metadata or remote search service.
- Rebuild only changed segments after data refresh rather than reconstructing for every UI re-render.

## 8. Cross-cutting engineering decisions

### IINA plugin API
- `globalEntry` file hosts cache/scheduling/network orchestration. `main.js` hosts `core.open` and mpv-specific event/hooks; `iina.global` messaging mediates global/main communication.
- `iina.standaloneWindow` for EPG grid, `iina.sidebar` for channels/NowNext, `iina.file` sandbox for data, Keychain for secrets.
- Avoid creating a new IINA player through `global.createPlayerInstance` in the minimum viable path; IINA issue #6449 reports display sleep behavior with plugin-created players as of 2026-10-05. Test any alternative separately.
- `iina.http` for HTTPS API if compatible; HTTP-provider fallback may use carefully validated `curl` as upstream does. Test ATS/CORS/redirect behavior. Raw credentialed URLs must never be sent to WebView except where unavoidable; prefer opaque IDs + main/global resolver.
- IINA plugin docs have an inconsistent `"global"` example; official plugin `iina/plugin-online-media` confirms `"globalEntry"` manifest key.

### Security / privacy
- Trust only explicitly configured Xtream/M3U source origins; validate scheme, endpoint host and redirect policy for all derived playlist/guide URLs. Prefer HTTPS; if user chooses HTTP, show transport warning.
- No credentials in git, analytics, diagnostic exports, screenshots, debug console, error messages or persisted EPG data. Manual tests must use synthetic credentials.
- Wildcard `allowedDomains: ["*"]` is inherited and may be necessary for arbitrary stream URLs; treat as a permission risk and enforce strict own app-level URL validation for fetch/exec.
- No secrets in CLI arguments if avoidable. Upstream `curl`/`core.open` mechanisms may still expose URLs locally; record the residual risk and test feasible mitigation before signing security gate.
- No scripts/eval/HTML injection from provider data. Preserve DOM `textContent` pattern.

### Release management
- No changes to production server. No auto-update or production deployment as part of this planning phase.
- Source-only work in own GitHub fork after owner explicitly creates it; feature branch and a PR per module/gate. Pin upstream SHA and preserve LICENSE.
- Module boundaries allow canary testing on a macOS dev profile; each release has tagged commit, source diff, test log and rollback instructions.
- Any scope changes (favorites, multi-provider, Apple TV, backend proxy, recording) require new written change request; never quietly bundle with a current milestone.

## 9. Release slicing / dependencies

| Milestone | Code changes permitted | Dependency | Exit gate |
|---|---|---|---|
| **Planning gate** (this document) | None | Source audit + spec | Owner approves boundaries, upstream fork created |
| **R0 — Lifecycle & safe source spike** | Global entry, cache contract, secured test source | Planning gate | 1 scheduler, no leaked secrets, no duplicate fetch |
| **v0.1 — Live Playback** | Xtream/M3U catalog and IINA open | R0 | Live/codec/audio/sub/PiP smoke tests PASS |
| **v0.2 — EPG + Refresh** | full EPG, two refresh pipelines, cache | v0.1 | hourly schedule, startup/manual, multiwindow, full grid PASS |
| **v0.3 — Catch-up + Search** | archive profile and unified index | v0.2 | programme-to-archive and local search PASS |
| **v1.0 — Hardening** | bugfix, performance and packaging only | v0.3 | no regressions, budgets met, reproducible artifact |

Do not assume full EPG and replay work just because stream playback works. Distinct provider fixtures and end-to-end tests required.

## 10. Observability & resource budgets (targets, not measured results)

Metrics captured locally in test builds without credentials: active request counts per dataset, cache hit/miss, last success/age, playlist/channel/programme counts, parse/render durations, timeout/error counts. No Prometheus/daemon.

**Benchmark matrix:** IINA alone playing same channel vs IINA + plugin; idle/app startup/EPG grid/search/PiP. Use same Mac and same playback stream; measure median and peak over repeated sessions.

Provisional engineering thresholds to ratify from baseline:
- New HomeDocker RAM/CPU: **0** (architecture hard requirement).
- Duplicate source requests for same dataset in two or three player windows during one refresh window: **0**.
- Idle plugin-triggered network calls with fresh cache: **0** until TTL expires.
- Scheduled refresh less frequent than 1h: **forbidden**.
- Cached channel list appears without synchronous network wait; UI search never calls network.
- 1,000-channel search remains visibly interactive; 5,000-channel stress test must not lock UI (quantify p95 after Mac benchmarks).
- No new forced transcode/codec override; PiP + subtitles remains at least as functional as same stream before plugin.
- Peak plugin-induced memory delta and startup delay: **measure first in R0**, then set numerical release caps; don't fabricate fixed numbers without device/EPG sizes.

## 11. Open design questions — do not block source audit, but must close before code release

| ID | Decision required | Default hypothesis | Closing evidence |
|---|---|---|---|
| D-01 | Target IINA/macOS exact build | IINA 1.5.x on macOS 27 | Local smoke test + plugin version |
| D-02 | At-startup refresh default | stale-only (configurable force) | UX approval |
| D-03 | Xtream archive URL/timezone variant | provider profile detection, no universal URL | Redacted provider API fixtures + playback sample |
| D-04 | Plain HTTP Xtream API | allow on explicit opt-in, prefer HTTPS | Real-provider connection test |
| D-05 | XMLTV size/gzip handling | cap and tested decompression path | Synthetic 5/20/50 MB feeds |
| D-06 | Native IINA global/main message targeting | one coordinator; normal player open | Multiwindow local test |
| D-07 | Cache storage write safety | versioned @data JSON | interruption/rollback tests |

## 12. Authoritative references

- Upstream: https://github.com/DTTerastar/iina-plugin-channels/tree/8e5e82137bde3d2016adc6a8158763f167add3e1
- IINA developer guide: https://docs.iina.io/pages/dev-guide.html
- IINA global API: https://docs.iina.io/interfaces/IINA.API.Global
- IINA file API: https://docs.iina.io/interfaces/IINA.API.File
- IINA Keychain API: https://docs.iina.io/interfaces/IINA.API.Utils
- Official plugin `globalEntry` example: https://github.com/iina/plugin-online-media/blob/main/Info.json
- Xtream live stream field reference (third-party documentation, not a formal upstream specification): https://github.com/worldofiptvcom/xtream-codes-api/blob/master/docs/player-api/live-streams.md
- Xtream EPG endpoint examples (third-party): https://github.com/worldofiptvcom/xtream-codes-api-documentation/blob/master/XTREAM_CODES_API_DOCUMENTATION.md

**No code, server config, repo contents, credentials or production services were changed by creating this specification.**