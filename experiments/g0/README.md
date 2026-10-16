# G0 — IINA runtime feasibility (synthetic only)

This **is not an IPTV release**. The official Channels root plugin is unchanged. The isolated `experiments/g0` plugin has its own identity `vn.olivergiang.iina-iptv-g0` and never contacts a provider, opens a stream, or touches Xtream VOD Unified/HomeDocker.

## Verified without Mac
- `coordinator.js` has offline Node tests: `node --test experiments/g0/tests/*.test.js` from repository root.
- A shared one-shot scheduler supports independent 12h Channels / 3h EPG intervals and manual-only `0`; allowed production interval values are 0/1/2/3/6/12/24h.
- Promise singleflight across competing refresh calls, no sub-hourly periodic fetch, bounded 1h failure retry.
- Fixture payload is artificial and persisted only under `@data/g0-fixture-cache.json`; **no real credentials or URLs**.

## Mac-only G0 checks (NOT RUN)
1. On a test Mac, `git clone` the fork, checkout `feat/g0-runtime-probe`; do **not** install this from the fork root, which remains upstream Channels.
2. Create a dev symlink for **only** `experiments/g0`: `/Applications/IINA.app/Contents/MacOS/iina-plugin link /ABSOLUTE/PATH/iina-iptv/experiments/g0` (or follow the official dev linking guide). Keep the original Channels plugin installed.
3. Quit then reopen IINA (avoid Reload All Plugins crash seen in Channels 0.2.1 on IINA 1.5.0).
4. Inspect **Window → Log Viewer**, select the global and per-player **IINA IPTV G0 Probe** subsystems; no provider data should exist in logs.
5. Open 3 player windows. Check the `[G0] player hello received` messages and `g0:status` in players. Trigger two refresh menu actions rapidly from different players; check `fetchCount` rises only once while pending.
6. Explicitly choose `G0: Run optional synthetic Keychain check` from **Plugin menu**; verify `Keychain PASS`. A test-only Keychain item is created; remove later using macOS Keychain Access if desired.
7. Run `G0: Print synthetic refresh status`, note cachedItems, lastSuccess and nextDue. Close/reopen IINA; ensure cache persists and startup doesn't redundantly fetch fresh data.
8. Record IINA baseline vs G0 CPU/RSS and network with matching idle and playback conditions. Do **not** enter provider credentials during G0.

## Important limitations
- The global-entry manifest field is `globalEntry` (official Development Guide); one older docs example incorrectly displays `global`.
- Reply routing using `global.postMessage(playerId, ...)` must be verified on IINA 1.5.x because documentation differs on string target semantics.
- IINA Keychain functions are documented as `utils.keyChainWrite/read`; actual Mac permission prompt and persistence remain untested.
- The G0 coordinator is intentionally a fixture, **not** the final refresh/data implementation. It has no Xtream connector, UI, EPG parsing or catch-up.
- Use synthetic data only. Never put provider URL or password in issues, logs, PR comments, exported preferences or fixtures.
