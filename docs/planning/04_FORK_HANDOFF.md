# FORK / REPOSITORY HANDOFF — IINA IPTV

## Status: Fork VERIFIED / Planning review stage

- **Repository:** https://github.com/olivergiangvu/iina-iptv
- **Upstream:** https://github.com/DTTerastar/iina-plugin-channels
- **Pinned main baseline:** `8e5e82137bde3d2016adc6a8158763f167add3e1` (version 0.2.1).
- **Planning branch:** `docs/planning-baseline-0.1`
- **Documentation directory:** `docs/planning/`
- **Production, application code and runtime:** unchanged; acceptance tests not yet run.

### Next PR sequence — proposed, not implemented

1. `feat/lifecycle-cache` — verify globalEntry, Keychain, cache and multi-window requests.
2. `feat/live` — Xtream/M3U channel UI and native IINA playback.
3. `feat/epg-refresh` — full EPG, startup/scheduled/manual refresh.
4. `feat/catchup-search` — provider archive support and advanced local search.

### Invariant safety rules

- Keep LICENSE and attribution intact; new plugin `identifier` must differ from `net.terastar.iina-channels` before installation, and `ghRepo` must point to actual fork, not guessed repository.
- Avoid writing into `olivergiangvu/xtream-vod-bridge`: that repo and production remain unchanged.
- Never push provider URLs containing username/password, plugin preferences, logs or local cached guide data.
- Preserve current installed Channels plugin as rollback until the new fork is independently testable.
- Preserve the pinned upstream SHA and **re-audit future upstream differences before implementing**.

### Planning pack contents

- `01_SOURCE_AUDIT.md` — complete upstream tree/text audit, findings and reuse/modify/new matrix.
- `02_TECHNICAL_SPEC.md` — exact 5-module scope, architecture, data contracts, refresh and security policies, milestone dependencies.
- `03_ACCEPTANCE_GATES.md` — test scenarios and measurable release-gate plan. All results **NOT RUN**.
- `04_FORK_HANDOFF.md` — this handoff and repository separation instructions.

### Stop conditions

Do not start feature coding unless: fork confirmed, scope approved, correct `globalEntry` behavior checked, source credential strategy and true provider catch-up profile identified, and G0 launch/resource measurement plan agreed. The spec is intentionally stricter than quick scripting to avoid v0.6-style change proliferation.