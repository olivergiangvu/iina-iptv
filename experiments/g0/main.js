'use strict';
// G0 PLAYER ENTRY: no playback hooks, no video/URL/EPG access.
const bus = iina.global;
bus.onMessage("g0:status", (value) => {
  const clean = {
    channels: value && value.channels ? value.channels : null,
    epg: value && value.epg ? value.epg : null
  };
  iina.console.log("[G0] global status " + JSON.stringify(clean));
});
bus.onMessage("g0:result", (value) => {
  iina.console.log("[G0] synthetic request " + (value && value.ok ? "PASS" : "FAIL"));
});
iina.menu.addItem(iina.menu.item("G0: Request synthetic Channels refresh", () => {
  bus.postMessage("g0:refresh", { type: "channels" });
}));
iina.menu.addItem(iina.menu.item("G0: Request synthetic EPG refresh", () => {
  bus.postMessage("g0:refresh", { type: "epg" });
}));
bus.postMessage("g0:hello", {});
