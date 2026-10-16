'use strict';
// G0 GLOBAL ENTRY: synthetic data only; zero provider/network requests.
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
function respond(playerId, name, data) {
  if (playerId !== undefined && playerId !== null) {
    bus.postMessage(playerId, name, data);
  } else {
    // API runtimes may not supply a player identifier; broadcast only fixture status.
    bus.postMessage(null, name, data);
  }
}
bus.onMessage("g0:hello", (_data, playerId) => {
  iina.console.log("[G0] player hello received");
  respond(playerId, "g0:status", fixture.snapshot());
});
bus.onMessage("g0:refresh", (data, playerId) => {
  const type = data && data.type;
  if (type !== "channels" && type !== "epg") return;
  fixture.refresh(type, true)
    .then(() => respond(playerId, "g0:result", { ok: true, type }))
    .catch(() => respond(playerId, "g0:result", { ok: false, type }));
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
fixture.start();
