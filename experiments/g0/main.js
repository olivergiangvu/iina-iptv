'use strict';
// G0 PLAYER ENTRY (crash-safe): no messages while PlayerCore.loadPlugins() is constructing.
// IMPORTANT: IINA v1.5.0 can SIGTRAP if global replies synchronously during plugin evaluation.
// Zero network, playback or PiP calls. Every child -> global message is user-initiated.
const bus = iina.global;
function sendAction(event, payload) {
  // Menu callbacks run after plugin initialization, unlike top-level evaluation.
  bus.postMessage(event, payload);
}
iina.menu.addItem(iina.menu.item("G0: Ping Global (no reply)", () => {
  sendAction("g0:ping", { kind: "manual" });
}));
iina.menu.addItem(iina.menu.item("G0: Request synthetic Channels refresh", () => {
  sendAction("g0:refresh", { type: "channels" });
}));
iina.menu.addItem(iina.menu.item("G0: Request synthetic EPG refresh", () => {
  sendAction("g0:refresh", { type: "epg" });
}));
// Do NOT add a startup g0:hello here. Do NOT implement a global -> child reply.
