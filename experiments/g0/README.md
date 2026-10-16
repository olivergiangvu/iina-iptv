# G0 — IINA runtime feasibility (synthetic only)

This **is not an IPTV release**. The official Channels root plugin is unchanged. The isolated `experiments/g0` plugin has its own identity `vn.olivergiang.iina-iptv-g0` and never contacts a provider, opens a stream, or touches Xtream VOD Unified/HomeDocker.

## Verified without Mac
- `coordinator.js` has offline Node tests: `node --test experiments/g0/tests/*.test.js` from repository root.
- A shared one-shot scheduler supports independent 12h Channels / 3h EPG intervals and manual-only `0`; allowed production interval values are 0/1/2/3/6/12/24h.
- Promise singleflight across competing refresh calls, no sub-hourly periodic fetch, bounded 1h failure retry.
- Fixture payload is artificial and persisted only under `@data/g0-fixture-cache.json`; **no real credentials or URLs**.

## CRASH SAFETY (IINA 1.5.0)

**Known incident:** previous G0 version crashed IINA at startup on 2026-10-16 via a synchronous Global→Player reply during `PlayerCore.loadPlugins()`. The current revision removes that entire reply path. **Do not run the original probe again.**

**Recover and update while IINA is quit:**

```sh
/Applications/IINA.app/Contents/MacOS/iina-plugin unlink "$HOME/iina-iptv/experiments/g0"
cd "$HOME/iina-iptv"
git switch feat/g0-runtime-probe
git pull --ff-only
node --test experiments/g0/tests/*.test.js
/Applications/IINA.app/Contents/MacOS/iina-plugin link "$HOME/iina-iptv/experiments/g0"
```

## Mac-only G0 check — one controlled restart (NOT RUN)

1. Before relinking, confirm IINA launches without G0. If IINA fails without G0, stop and isolate other causes.
2. After updating + local tests and linking, **quit/reopen IINA once**. If it crashes, immediately unlink G0 again and stop.
3. In **Window → Log Viewer**, locate `global - IINA IPTV G0 Probe`; expect `[G0] global probe loaded (one-way test mode)`.
4. With one player open, choose **Plugin → G0: Ping Global (no reply)**; expect `[G0] global PING received`. There is intentionally no Global→Player status or result reply.
5. Optional: in two distinct player windows, click **G0: Request synthetic Channels refresh** rapidly (within 350ms). In the **global** log compare the `before`/`after` counters; `fetchCount` should increment at most once for overlapping requests. Use the global **Print synthetic refresh status** menu for final count.
6. Optional synthetic Keychain check uses dummy value only. **Never enter provider credentials during G0**.
7. Record IINA macOS version, RSS/CPU, and check existing playback/PiP for regressions. Unlink the probe when complete.

## Important limitations
- The global-entry manifest field is `globalEntry` (official Development Guide); one older docs example incorrectly displays `global`.
- Targeted `global.postMessage(playerId, ...)` is **disabled** after a verified startup crash; do not re-enable it in G0.
- IINA Keychain functions are documented as `utils.keyChainWrite/read`; actual Mac permission prompt and persistence remain untested.
- The G0 coordinator is intentionally a fixture, **not** the final refresh/data implementation. It has no Xtream connector, UI, EPG parsing or catch-up.
- Use synthetic data only. Never put provider URL or password in issues, logs, PR comments, exported preferences or fixtures.
