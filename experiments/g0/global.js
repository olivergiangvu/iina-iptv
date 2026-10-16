'use strict';
// G0 GLOBAL ENTRY: synthetic data only; NO global -> player postMessage.
// IINA v1.5.0's JavascriptAPIGlobalController.postMessage can trap when the
// target player plugin has not yet completed PlayerCore.loadPlugins().
const bus = iina.global;
const { createCoordinator } = require("./coordinator.js");
const storePath = "@data/g0-fixture-cache.json";
function restore() {
  try {
    return iina.file.exists(storePath) ? JSON.parse(iina.file.read(storePath)) : {};
  } catch (_) { return {}; }
}
const fixture = createCoordinator({
  now: () => Date.now(),
  setTimer: (fn, delay) => setTimeout(fn, delay),
  clearTimer: (handle) => clearTimeout(handle),
  restore: restore(),
  intervalsHours: { channels: 12, epg: 3 },
  fetchDataset: (type) => new Promise((resolve) => {
    setTimeout(() => resolve([{ id: "G0-FIXTURE-" + type }]), 350);
  }),
  persist: (state) => iina.file.write(storePath, JSON.stringify(state))
});
bus.onMessage("g0:ping", () => {
  iina.console.log("[G0] global PING received (one-way, no reply)");
});
bus.onMessage("g0:refresh", (data) => {
  const type = data && data.type;
  if (type !== "channels" && type !== "epg") return;
  const before = fixture.snapshot()[type].fetchCount;
  fixture.refresh(type, true).then(() => {
    const after = fixture.snapshot()[type].fetchCount;
    iina.console.log("[G0] " + type + " refresh complete, before=" + before + " after=" + after);
  }).catch(() => {
    iina.console.log("[G0] synthetic refresh FAILED; no provider data used");
  });
});
iina.menu.addItem(iina.menu.item("G0: Print synthetic refresh status", () => {
  iina.console.log("[G0] status " + JSON.stringify(fixture.snapshot()));
}));
iina.menu.addItem(iina.menu.item("G0: Run optional synthetic Keychain check", () => {
  const service = "g0-synthetic-smoke";
  const account = "fixture-not-a-real-user";
  const dummy = "IINA_G0_TEST_ONLY";
  try {
    const wrote = iina.utils.keyChainWrite(service, account, dummy);
    const read = iina.utils.keyChainRead(service, account);
    iina.console.log("[G0] Keychain " + (wrote && read === dummy ? "PASS" : "FAIL"));
  } catch (_) {
    iina.console.log("[G0] Keychain FAIL");
  }
}));
iina.console.log("[G0] global probe loaded (one-way test mode)");
fixture.start();
