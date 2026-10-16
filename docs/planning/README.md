# IINA IPTV — Planning Baseline

**Date:** 2026-10-16  
**Source:** DTTerastar/iina-plugin-channels 0.2.1, pinned commit `8e5e82137bde3d2016adc6a8158763f167add3e1`  
**Planning result:** Static source audit, technical specification and release acceptance gates prepared for review (not implementation approval).  
**Remote fork:** VERIFIED — `olivergiangvu/iina-iptv` fork at pinned upstream commit. Planning documents are on a docs-only branch.  
**Code changes:** NONE. **Production changes:** NONE. **Tests executed:** NONE (other than read-only upstream/source inspection).

## Five in-scope modules

1. IPTV Channel Playback via IINA native/mpv.
2. EPG Viewer (Now/Next + full guide).
3. Channel and EPG automatic startup/scheduled/manual refresh, independent minimum hourly schedule.
4. Provider-based Catch-up playback.
5. Advanced channel and EPG search, all local.

## Outside scope

Movies/Series/VOD of any kind; integration with Xtream VOD Unified; metadata/Trakt/Jellyfin; transcoding; server proxy; Docker deployment; PiP/subtitle rendering; recording.

## Read in order

1. `docs/01_SOURCE_AUDIT.md`
2. `docs/02_TECHNICAL_SPEC.md`
3. `docs/03_ACCEPTANCE_GATES.md`
4. `docs/04_FORK_HANDOFF.md`