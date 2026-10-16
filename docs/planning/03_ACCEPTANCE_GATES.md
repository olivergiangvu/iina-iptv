# RELEASE GATES & TEST PLAN — IINA IPTV

**Status:** SPECIFICATION ONLY — all test outcomes currently **NOT RUN**  
**Baseline:** Channels 0.2.1 / commit `8e5e82137bde3d2016adc6a8158763f167add3e1`  
**Environment:** macOS IINA 1.5.x baseline / Xtream test provider / synthetic M3U/XMLTV fixtures / no extra Docker.

## Gate convention

- **PASS** requires reproducible command/manual steps + output/screenshot or non-sensitive structured log. Code review alone does not count.
- **BLOCKED** requires an issue with mitigation, not a silent skip.
- **N/A** allowed only for an unsupported source capability (e.g. provider has no catch-up) and must be accompanied by a separate provider fixture exercising that capability.
- No feature release if critical Security, Playback, Multiwindow or Rollback gate fails.
- Record test date, macOS version, IINA version, plugin git SHA, provider test profile (redacted), fixture checksum, baseline/candidate resource measurements.

## G0 — Source / fork / security readiness (before implementation)

| ID | Test | Expected acceptance |
|---|---|---|
| G0-01 | Upstream provenance | Fork/working copy references original repo and pinned upstream SHA; MIT LICENSE unmodified |
| G0-02 | Repository separation | Own isolated `iina-iptv` repository; no modifications to Xtream VOD Unified repo/production |
| G0-03 | Code boundary | README explicitly says Live TV only; no VOD/API integration plan |
| G0-04 | Manifest identity | Unique plugin identifier; no collision with Channels or other installed IINA plugins |
| G0-05 | Secrets workflow | Keychain reference designed; no secrets in `Info.json`, preferences defaults, repo or test fixtures |
| G0-06 | API feasibility | `globalEntry`, messages, `file @data`, Keychain verified on actual IINA build |
| G0-07 | Resource baseline | Capture no-plugin IINA CPU/RSS/startup/network baseline using same test stream |
| G0-08 | Scope sign-off | Five modules + explicit exclusions and fixed release dependencies accepted |

## G1 — Playback / channel catalog (v0.1)

| ID | Scenario | Expected |
|---|---|---|
| P-01 | Valid Xtream login | Only live categories/live streams loaded, no VOD endpoints called |
| P-02 | Invalid credentials | Informative non-secret error, cached list still navigable |
| P-03 | M3U playlist containing groups and tvg-id | Stable channel IDs, groups and names displayed correctly |
| P-04 | 1,000 / 5,000 channels | Responsive scroll/search; no main-thread freeze; controlled memory |
| P-05 | Click 10 channels sequentially | Correct channel opens, title/selection correct; no competing streams |
| P-06 | TS and HLS known-good channels | IINA plays where baseline player does; no forced transcode |
| P-07 | Multiple audio/subtitle tracks | IINA native selection remains functional |
| P-08 | Native PiP with subtitles | Same playback and subtitle behavior as baseline IINA on matched stream |
| P-09 | Provider offline while cache exists | Stale channel catalog displayed with visible status, no crash |
| P-10 | Secrets in path/query | UI, cache, console/debug report do not reveal credentials; document residual local playback URL exposure |

## G2 — EPG / refresh (v0.2)

| ID | Scenario | Expected |
|---|---|---|
| E-01 | XMLTV basic | Accurate EPG mapping, Now/Next and detail for matched IDs |
| E-02 | XMLTV EPG IDs absent/mismatched | Clear no-guide status, no incorrect programme cross-mapping |
| E-03 | Offset, DST, midnight rollover | UTC interval stored correctly, displayed in macOS timezone |
| E-04 | Full EPG guide range | Date/time navigation constrained to actual available schedule, fast lazy rendering |
| E-05 | Huge / malformed XMLTV | Bounded parse, error message, last good cache retained, no IINA crash |
| E-06 | `.xml.gz` feed | Supported only if decompression implementation explicitly passes real compressed fixture; otherwise clearly reject |
| R-01 | Launch IINA with fresh cache | Immediate cached UI, no stale-only refresh request |
| R-02 | Launch IINA with stale cache | Exactly one channel refresh and/or one EPG refresh for expired dataset(s) |
| R-03 | Config intervals | Channel and EPG independently select Manual/1/2/3/6/12/24 h |
| R-04 | Scheduled refresh at 1h | Exactly one due refresh while app is running; none below one hour |
| R-05 | Manual Channels / EPG / All | Correct selected dataset(s) refreshed, independent of TTL |
| R-06 | 3 simultaneous IINA player windows | At most one in-flight request per `(source,dataset)` globally |
| R-07 | Manual click during running scheduled request | Coalesces; no duplicate network fetch |
| R-08 | Network timeout / 429 / HTTP 500 | Bounded retry/backoff; old cache maintained; no infinite loop |
| R-09 | Sleep/wake or IINA reopen | No timer storm; one due refresh after resumption |
| R-10 | Error/refresh status | Last-success timestamp, staleness, next-due and error shown accurately |

## G3 — Catch-up / advanced search (v0.3)

| ID | Scenario | Expected |
|---|---|---|
| C-01 | Stream marked `tv_archive=0` | No replay action shown |
| C-02 | Programme outside `tv_archive_duration` | Replay disabled with explanation |
| C-03 | Past programme within archive | Correct provider URL and corresponding archive content opens in IINA |
| C-04 | Provider archive `.ts` / `.m3u8` | Each supported provider profile verified separately |
| C-05 | Midnight/DST/timezone | Correct archive start and duration; no off-by-hours |
| C-06 | Provider returns 401/403/404 | Friendly error, no wrong live fallback represented as replay |
| C-07 | Replay PiP with subtitle | Native IINA behavior unchanged for a compatible archive stream |
| S-01 | Search channel name / partial / group | Relevant channels found and ranked ahead of incidental programme text |
| S-02 | Search `tvg-id`/number/explicit aliases | Matches when source fields exist, not invented |
| S-03 | Search Now/Next programme title | Returns channel/time and live action |
| S-04 | Search future programme title/description | Returns schedule and detail; no invalid play action |
| S-05 | Search past programme in archive | Returns replay action only when eligible |
| S-06 | Accent/case insensitive Vietnamese | E.g., `thoi su` matches `Thời sự` where present |
| S-07 | Type rapidly (20 queries) | No per-keystroke network calls; UI debounce, latest result wins |
| S-08 | Refresh EPG while search open | Search index updated incrementally; no frozen/duplicate results |

## G4 — Performance & release safety (v1.0)

| ID | Gate | Expected |
|---|---|---|
| F-01 | Server footprint | Zero new HomeDocker services, ports, CPU/RAM overhead |
| F-02 | Playback comparison | IINA stream baseline and with plugin: same codec/track/PiP behavior |
| F-03 | Idle request audit | No provider fetch before TTL when cached; no polling loops at minute cadence |
| F-04 | EPG startup and memory | Baseline and candidate measured with small/large fixtures; caps approved by evidence |
| F-05 | Search/UI performance | Measured p50/p95 for 1k/5k channels, guide scroll and query |
| F-06 | Multiwindow churn | Open/close 10 windows: no orphan timers or runaway memory |
| F-07 | Source regression | Upstream M3U channel basic flow still passes |
| F-08 | Reproducibility | Released plugin artifact maps to exact git SHA (no post-acceptance hotfix) |
| F-09 | Rollback | Reinstall previous tagged plugin and restore previous compatible cache/config |
| F-10 | Privacy | Source URL/token redaction in diagnostics and release reports |

## Synthetic fixture matrix to create **in later coding phase**

| Fixture ID | Sample shape | Purpose |
|---|---|---|
| X-LIVE-01 | Xtream categories and 6 live streams, mixed TV archive flags | Connector and stable IDs |
| X-LIVE-02 | Provider responses denied/malformed/missing fields | Error handling |
| X-EPG-01 | 3 channels, 24h XMLTV with timezone offsets | EPG matching + layout |
| X-EPG-02 | Two programmes cross midnight & DST | Catch-up time resolution |
| X-EPG-03 | 1,000/5,000 channels; 5/20/50 MB XMLTV | Resource stress |
| X-EPG-04 | Plain XML, HTTP gzip content-encoding and `.xml.gz` payload | Compression differentiation |
| X-CATCH-01 | Archived and non-archived channels, 2 provider URL profiles | Replay capability |
| X-SEARCH-01 | Vietnamese diacritics, duplicate programme titles, channel alias | Ranking/normalization |
| X-RACE-01 | Two windows + manual refresh + scheduled refresh | Singleflight coordination |

Fixture data must be artificial and not contain any live provider credential, real bearer URL or private user data.

## Mandatory release evidence form

```text
Release tag/commit: ________
Mac model / macOS / IINA version: ________
Fixtures IDs + SHA256: ________
Provider profile (redacted): ________
Gate results: G0 __ / G1 __ / G2 __ / G3 __ / G4 __
Baseline IINA RSS / idle CPU / PiP: ________
Candidate delta RSS / idle CPU / PiP: ________
Unresolved HIGH/Critical issues: ________
Exact release artifact SHA256: ________
Rollback tested: YES / NO
Approval: ________
```

**Current status:** all gates NOT RUN. Audit and document creation do not constitute a PASS.