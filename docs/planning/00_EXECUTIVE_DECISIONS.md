# IINA IPTV — DECISION ONE-PAGER

**Design baseline:** 16 October 2026 · Planning only · Source commit `8e5e82137bde3d2016adc6a8158763f167add3e1`.

## Mission
A lightweight, macOS-first **Live TV management UI inside IINA**, using native IINA/mpv as player and preserving the owner's already-working native PiP/subtitles.

## Scope locked

1. Xtream/M3U Live Channel playback through IINA native.
2. Compact Now/Next + full EPG timeline/day guide.
3. Independent Channels/EPG startup, 1/2/3/6/12/24-hour scheduled and manual refresh; manual-only option.
4. Catch-up playback using provider-hosted archive (when genuinely available).
5. Channel/EPG local search across names, groups, programme titles/descriptions and time context.

**Excluded:** ALL VOD, Xtream VOD Unified integration, server/proxy/Docker, transcode, DVR, new PiP/subtitle engine, cross-device sync, Trakt/metadata.

## Strategic choices

| Decision | Why |
|---|---|
| Fork Channels 0.2.1 | Already implements M3U, sidebar and XMLTV Now/Next |
| One `globalEntry` | Prevent duplicate downloads/timers across IINA windows |
| Main entry only for UI and native playback | Do not touch proven IINA decoding/PiP |
| Keychain for Xtream secrets | Plain preference URLs are unsafe for credential-bearing playlists |
| Local normalized cache and search | Fast views/search, zero per-keystroke HTTP |
| Full EPG rendered in visible windows | Avoid DOM blow-up; still account for cost of downloading XMLTV |
| No new runtime services | Zero HomeDocker resource and production blast radius |
| Small release gates | Avoid v0.6-style redesign/rebuild churn |

## Implementation slices, after planning approval

- **R0:** global scheduler + source/credential/cache feasibility proof.
- **v0.1:** Channels + Xtream Live + native IINA playback.
- **v0.2:** EPG grid + independent scheduled/startup/manual refresh.
- **v0.3:** Catch-up + advanced search.
- **v1.0:** performance hardening and reproducible packaging, no new features.

## First blockers

- **Remote fork verified:** `olivergiangvu/iina-iptv`, pinned to upstream commit `8e5e82137bde3d2016adc6a8158763f167add3e1`. Planning documents are in a docs-only branch pending review.
- Need test on installed Mac for `globalEntry`, Keychain and multiwindow messaging.
- Need provider-backed archive/timezone fixtures before claiming Catch-up works.
- No tests or code changes have occurred; all release gates are NOT RUN.

## Deliverable index

`01_SOURCE_AUDIT.md` → 8 upstream paths, code risks and reuse mapping.
`02_TECHNICAL_SPEC.md` → architecture, five modules, data contracts, dependency and performance plan.
`03_ACCEPTANCE_GATES.md` → 59 gates, grouped G0–G4, pending actual test execution.
`04_FORK_HANDOFF.md` → fork / repo isolation / handoff.