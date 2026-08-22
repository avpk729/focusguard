const test = require("node:test");
const assert = require("node:assert/strict");
const fg = require("./shared.js");

test("mergeSettings adds detox fields to old settings", () => {
  const merged = fg.mergeSettings({ enabled: true, password: "x" });
  assert.equal(merged.enabled, true);
  assert.equal(merged.password, "x");
  assert.equal(merged.lockUntil, 0);
  assert.equal(merged.detoxDays, 0);
  assert.equal(merged.blockedSites.youtube, true);
});

test("isDetoxLocked is true only before lockUntil", () => {
  const now = 1_700_000_000_000;
  assert.equal(fg.isDetoxLocked({ lockUntil: now + 1000 }, now), true);
  assert.equal(fg.isDetoxLocked({ lockUntil: now }, now), false);
  assert.equal(fg.isDetoxLocked({ lockUntil: 0 }, now), false);
  assert.equal(fg.isDetoxLocked({}, now), false);
});

test("formatRemaining shows days hours minutes seconds", () => {
  assert.equal(fg.formatRemaining(0), "0m 00s");
  assert.equal(fg.formatRemaining(5_000), "0m 05s");
  assert.equal(fg.formatRemaining(65_000), "1m 05s");
  assert.equal(fg.formatRemaining(3665_000), "1h 1m 05s");
  assert.equal(fg.formatRemaining(90_065_000), "1d 1h 1m 05s");
});

test("lockUntilFromDays accepts 1, 5, and 7 only", () => {
  const now = 1_000_000;
  assert.equal(fg.lockUntilFromDays(1, now), now + fg.MS_PER_DAY);
  assert.equal(fg.lockUntilFromDays(5, now), now + 5 * fg.MS_PER_DAY);
  assert.equal(fg.lockUntilFromDays(7, now), now + 7 * fg.MS_PER_DAY);
  assert.equal(fg.lockUntilFromDays(3, now), 0);
  assert.equal(fg.isValidDetoxDays(1), true);
  assert.equal(fg.isValidDetoxDays(2), false);
});

test("isBlockingActive stays on during a detox even if disabled", () => {
  const now = new Date("2026-08-22T12:00:00");
  const s = fg.mergeSettings({
    enabled: false,
    scheduleEnabled: true,
    scheduleDays: [0],
    scheduleStart: "09:00",
    scheduleEnd: "10:00",
    lockUntil: now.getTime() + 60_000
  });
  assert.equal(fg.isBlockingActive(s, now), true);
});

test("isBlockingActive uses the weekday schedule when detox is off", () => {
  const saturday = new Date("2026-08-22T12:00:00"); // Saturday
  const monday = new Date("2026-08-24T12:00:00");
  const s = fg.mergeSettings({
    enabled: true,
    scheduleEnabled: true,
    scheduleDays: [1],
    scheduleStart: "09:00",
    scheduleEnd: "17:00",
    lockUntil: 0
  });
  assert.equal(fg.isBlockingActive(s, saturday), false);
  assert.equal(fg.isBlockingActive(s, monday), true);
});
