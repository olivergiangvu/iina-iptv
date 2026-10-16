'use strict';

function createCoordinator(options) {
  "use strict";
  const types = ["channels", "epg"];
  const allowed = [0, 1, 2, 3, 6, 12, 24];
  const minRetryMs = 3600000;
  const intervals = Object.assign({ channels: 12, epg: 3 }, options.intervalsHours || {});
  for (const type of types) {
    if (!allowed.includes(intervals[type])) throw new Error("Invalid refresh interval");
  }
  const now = options.now;
  const setTimer = options.setTimer;
  const clearTimer = options.clearTimer;
  const fetchDataset = options.fetchDataset;
  const persist = options.persist || (() => {});
  const loaded = options.restore || {};
  const records = {};
  const counts = { channels: 0, epg: 0 };
  const pending = new Map();
  const timers = new Map();
  let started = false;
  for (const type of types) {
    const item = loaded[type] || {};
    records[type] = {
      lastSuccess: Number.isFinite(item.lastSuccess) && item.lastSuccess > 0 ? item.lastSuccess : 0,
      lastFailure: Number.isFinite(item.lastFailure) && item.lastFailure > 0 ? item.lastFailure : 0,
      data: Array.isArray(item.data) ? item.data.slice(0, 10) : []
    };
  }
  function check(type) {
    if (!types.includes(type)) throw new Error("Unknown dataset");
  }
  function dueAt(type) {
    const entry = records[type];
    const interval = intervals[type] * 3600000;
    if (interval === 0) return Infinity;
    const nextSuccess = entry.lastSuccess ? entry.lastSuccess + interval : now();
    const nextRetry = entry.lastFailure && entry.lastFailure >= entry.lastSuccess
      ? entry.lastFailure + minRetryMs : 0;
    return Math.max(nextSuccess, nextRetry);
  }
  function unschedule(type) {
    if (timers.has(type)) {
      clearTimer(timers.get(type));
      timers.delete(type);
    }
  }
  function schedule(type) {
    unschedule(type);
    if (!started || intervals[type] === 0 || pending.has(type)) return;
    const delay = Math.max(0, dueAt(type) - now());
    const handle = setTimer(() => {
      timers.delete(type);
      refresh(type, false).catch(() => {});
    }, delay);
    timers.set(type, handle);
  }
  function snapshot() {
    const result = {};
    for (const type of types) {
      const entry = records[type];
      result[type] = {
        lastSuccess: entry.lastSuccess,
        lastFailure: entry.lastFailure,
        cachedItems: entry.data.length,
        fetchCount: counts[type],
        inFlight: pending.has(type),
        intervalHours: intervals[type],
        nextDue: intervals[type] ? dueAt(type) : null
      };
    }
    return result;
  }
  function refresh(type, force) {
    check(type);
    if (pending.has(type)) return pending.get(type);
    if (!force && (intervals[type] === 0 || now() < dueAt(type))) {
      return Promise.resolve({ skipped: true, type });
    }
    unschedule(type);
    counts[type] += 1;
    const promise = Promise.resolve()
      .then(() => fetchDataset(type))
      .then((value) => {
        if (!Array.isArray(value)) throw new Error("Invalid synthetic dataset");
        records[type] = { lastSuccess: now(), lastFailure: 0, data: value.slice(0, 10) };
        try {
          persist({
            channels: records.channels,
            epg: records.epg
          });
        } catch (_) {
          // Failure to persist does not invalidate the in-memory fixture result.
        }
        return { skipped: false, type };
      })
      .catch(() => {
        records[type].lastFailure = Math.max(1, now());
        return Promise.reject(new Error("Fixture refresh failed"));
      })
      .finally(() => {
        pending.delete(type);
        schedule(type);
      });
    pending.set(type, promise);
    return promise;
  }
  function start() {
    if (started) return;
    started = true;
    for (const type of types) {
      if (intervals[type] === 0) continue;
      if (now() >= dueAt(type)) refresh(type, false).catch(() => {});
      else schedule(type);
    }
  }
  function stop() {
    started = false;
    for (const type of types) unschedule(type);
  }
  return { start, stop, refresh, snapshot };
}

module.exports = { createCoordinator };
