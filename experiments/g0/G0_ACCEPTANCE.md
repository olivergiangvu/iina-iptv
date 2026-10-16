# G0 — Acceptance Evidence and Blockers

**Stage:** Draft / macOS runtime NOT VERIFIED. **PR target:** `docs/planning-baseline-0.1`. **Safe boundary:** no provider credentials, no network calls, no user media, no modifications to existing Channels or VOD runtime.

## Static/API findings — source-backed

- `Info.json.globalEntry` is documented in IINA Development Guide; note the separate older Global Entry page incorrectly shows `global`. We use **globalEntry** (must still confirm launch on IINA 1.5.0).
- IINA's `iina.global` supports a global instance and player-specific event messages. **Caveat:** [IINA #5560](https://github.com/iina/iina/issues/5560) reported a global/main messaging problem, and [#6449](https://github.com/iina/iina/issues/6449) mentions label/target routing limitations. Targeting is therefore a **Mac-only gate**, not assumed proven.
- `iina.utils.keyChainWrite/read` is documented; these are called only by an explicit test menu action using `IINA_G0_TEST_ONLY` and a clearly labeled synthetic account. Never use real provider credentials in G0.
- `iina.file` supports `@data/`. The sandbox uses only one synthetic JSON file and has no network permission.
- `iina.core` / `iina.mpv` are never touched by the probe, preserving native PiP/subtitles.

## Machine-checkable controls

- `node --test experiments/g0/tests/coordinator.test.js`
- Fixture test cases: coalescing concurrent requests, fresh startup scheduling, 1h error backoff, rejection of sub-hourly intervals.
- GitHub Actions workflow (read-only `contents`, no npm install) can run these checks on pull requests; check the actual job status before claiming a Node PASS.
- A separate in-session JavaScript self-check was PASS for coordinator logic before commit. This does **not** establish IINA or Node runtime correctness.

## Manual Mac runbook (all NOT RUN)

1. Clone the repo; checkout `feat/g0-runtime-probe`. Do not install from GitHub root `main`; link the isolated `experiments/g0` folder using IINA CLI:
   `/Applications/IINA.app/Contents/MacOS/iina-plugin link /ABS/PATH/iina-iptv/experiments/g0`.
2. Quit/restart IINA. In **Window → Log Viewer**, check the `global - IINA IPTV G0 Probe` subsystem appears once. If missing, mark **BLOCKED**, keep current Channels untouched.
3. Open three playback windows; check `[G0] player hello received` for each. The player instances should receive `[G0] global status ...`. If not, capture anonymized logs and mark **BLOCKED** (potential message-routing issue).
4. In different windows, press the G0 synthetic Channels refresh option quickly. Print global status and verify only one `fetchCount` increment while both requests overlap.
5. Explicitly run synthetic Keychain check; verify only `PASS`/`FAIL` appears (never password). Remove the synthetic entry from Keychain Access later if desired.
6. Restart IINA, compare `lastSuccess` before/after and verify fresh cache does not refetch.
7. On same stream, capture IINA `ps` RSS/CPU baseline vs G0 and test Native PiP subtitles for regression. Record IINA version, macOS version, stream type and test conditions.
8. Unlink the dev probe, restart IINA; confirm Channels still works. **Do not deploy, merge, or publish.**

## Gate state

| Gate | State | Reason |
|---|---|---|
| G0-01 fork provenance | PASS | exact upstream SHA and MIT license retained |
| G0-02 isolation | PASS | separate fork, branch, isolated experiment folder |
| G0-03 live-only scope | PASS | no VOD/Movies/Series in probe |
| G0-04 plugin identifier | STATIC PASS | unique ID in isolated manifest; Mac install not yet verified |
| G0-05 secrets handling | STATIC PASS | synthetic Keychain-only action; no real URLs/password |
| G0-06 global/cache/Keychain | BLOCKED pending Mac | docs and mock tests cannot replace runtime evidence |
| G0-07 CPU/RSS/network baseline | NOT RUN | target Mac evidence required |
| G0-08 scope sign-off | PASS for planning scope | previous five-module scope accepted; PR review pending |

**No gate should be upgraded to a runtime PASS from static inspection or mock test results alone.**
