// FocusGuard content script — in-page enforcement.
// Runs at document_start inside social sites. Catches anything the
// network-level rules miss (e.g. x.com), and handles single-page-app
// navigation where the page never fully reloads.

const SITE_DOMAINS = self.FocusGuard.SITE_DOMAINS;
const isBlockingActive = self.FocusGuard.isBlockingActive;

function hostToKey(host) {
  host = host.toLowerCase();
  for (const [key, domains] of Object.entries(SITE_DOMAINS)) {
    for (const d of domains) {
      if (host === d || host.endsWith("." + d)) return key;
    }
  }
  return null;
}

function check() {
  const key = hostToKey(location.hostname);
  if (!key) return;

  Promise.all([
    chrome.storage.sync.get("settings"),
    chrome.storage.local.get(["lockUntil", "detoxDays"])
  ]).then(([{ settings }, local]) => {
    const s = self.FocusGuard.mergeSettings(settings);
    const localUntil = Number(local.lockUntil) || 0;
    if (localUntil > (s.lockUntil || 0)) {
      s.lockUntil = localUntil;
      s.detoxDays = Number(local.detoxDays) || s.detoxDays;
    }
    if (!s.blockedSites || !s.blockedSites[key]) return;
    if (!isBlockingActive(s)) return;

    const url = chrome.runtime.getURL("blocked.html");
    if (location.href !== url) {
      try { window.stop(); } catch (e) {}
      location.replace(url);
    }
  }).catch(() => {});
}

check();

let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    check();
  }
}, 800);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) check();
});
