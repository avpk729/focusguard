// FocusGuard shared helpers — used by the popup, background worker, and tests.

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.FocusGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const DETOX_OPTIONS = [1, 5, 7];

  const SITE_DOMAINS = {
    twitter:   ["twitter.com", "x.com"],
    instagram: ["instagram.com"],
    reddit:    ["reddit.com"],
    youtube:   ["youtube.com"],
    facebook:  ["facebook.com"],
    tiktok:    ["tiktok.com"],
    snapchat:  ["snapchat.com"],
    twitch:    ["twitch.tv"],
    pinterest: ["pinterest.com"],
    linkedin:  ["linkedin.com"],
    tumblr:    ["tumblr.com"]
  };

  const DEFAULT_SETTINGS = {
    enabled: false,
    scheduleEnabled: false,
    scheduleStart: "09:00",
    scheduleEnd: "17:00",
    scheduleDays: [1, 2, 3, 4, 5],
    password: "",
    lockUntil: 0,
    detoxDays: 0,
    blockedSites: {
      twitter: true, instagram: true, reddit: true, youtube: true,
      facebook: true, tiktok: true, snapchat: true, twitch: true,
      pinterest: true, linkedin: true, tumblr: true
    }
  };

  function mergeSettings(stored) {
    const next = Object.assign({}, DEFAULT_SETTINGS, stored || {});
    next.blockedSites = Object.assign({}, DEFAULT_SETTINGS.blockedSites, (stored && stored.blockedSites) || {});
    next.lockUntil = Number(next.lockUntil) || 0;
    next.detoxDays = Number(next.detoxDays) || 0;
    return next;
  }

  function isDetoxLocked(s, now) {
    now = now == null ? Date.now() : now;
    return Boolean(s && s.lockUntil && now < s.lockUntil);
  }

  function remainingMs(s, now) {
    now = now == null ? Date.now() : now;
    if (!s || !s.lockUntil) return 0;
    return Math.max(0, s.lockUntil - now);
  }

  function formatRemaining(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    const parts = [];
    if (d) parts.push(d + "d");
    if (d || h) parts.push(h + "h");
    parts.push(m + "m");
    parts.push(String(sec).padStart(2, "0") + "s");
    return parts.join(" ");
  }

  function isValidDetoxDays(days) {
    return DETOX_OPTIONS.indexOf(Number(days)) !== -1;
  }

  function lockUntilFromDays(days, now) {
    now = now == null ? Date.now() : now;
    if (!isValidDetoxDays(days)) return 0;
    return now + Number(days) * MS_PER_DAY;
  }

  function isBlockingActive(s, nowDate) {
    if (!s) return false;
    nowDate = nowDate || new Date();
    if (isDetoxLocked(s, nowDate.getTime())) return true;
    if (!s.enabled) return false;
    if (!s.scheduleEnabled) return true;
    if (!Array.isArray(s.scheduleDays) || !s.scheduleDays.includes(nowDate.getDay())) return false;
    const cur = nowDate.getHours() * 60 + nowDate.getMinutes();
    const [sh, sm] = String(s.scheduleStart || "00:00").split(":").map(Number);
    const [eh, em] = String(s.scheduleEnd || "00:00").split(":").map(Number);
    return cur >= (sh * 60 + sm) && cur < (eh * 60 + em);
  }

  return {
    MS_PER_DAY,
    DETOX_OPTIONS,
    SITE_DOMAINS,
    DEFAULT_SETTINGS,
    mergeSettings,
    isDetoxLocked,
    remainingMs,
    formatRemaining,
    isValidDetoxDays,
    lockUntilFromDays,
    isBlockingActive
  };
});
