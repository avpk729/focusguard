// FocusGuard Background Service Worker
// Dynamic, per-site blocking driven by user toggles.

importScripts("shared.js");

const {
  SITE_DOMAINS,
  DEFAULT_SETTINGS,
  mergeSettings,
  isDetoxLocked,
  isBlockingActive
} = self.FocusGuard;

async function readSettings() {
  const [{ settings }, local] = await Promise.all([
    chrome.storage.sync.get("settings"),
    chrome.storage.local.get(["lockUntil", "detoxDays"])
  ]);
  const s = mergeSettings(settings || DEFAULT_SETTINGS);
  const localUntil = Number(local.lockUntil) || 0;
  if (localUntil > (s.lockUntil || 0)) {
    s.lockUntil = localUntil;
    s.detoxDays = Number(local.detoxDays) || s.detoxDays;
  }
  return s;
}

async function persistSettings(s) {
  await chrome.storage.sync.set({ settings: s });
  await chrome.storage.local.set({
    lockUntil: s.lockUntil || 0,
    detoxDays: s.detoxDays || 0
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get("settings");
  if (!stored.settings) {
    await persistSettings(DEFAULT_SETTINGS);
  } else {
    await persistSettings(mergeSettings(stored.settings));
  }
  await syncRules();
  setupAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncRules();
  setupAlarms();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "scheduleCheck" || alarm.name === "detoxUnlock") {
    await syncRules();
  }
});

function setupAlarms(s) {
  chrome.alarms.create("scheduleCheck", { periodInMinutes: 1 });
  if (s && s.lockUntil && s.lockUntil > Date.now()) {
    chrome.alarms.create("detoxUnlock", { when: s.lockUntil });
  } else {
    chrome.alarms.clear("detoxUnlock");
  }
}

// Restore a wiped lock from the local backup so a detox cannot be cleared in storage.
async function restoreDetoxIfNeeded(nextSettings) {
  const local = await chrome.storage.local.get(["lockUntil", "detoxDays"]);
  const localUntil = Number(local.lockUntil) || 0;
  if (!localUntil || Date.now() >= localUntil) return nextSettings;

  const s = mergeSettings(nextSettings);
  if ((s.lockUntil || 0) < localUntil) {
    s.lockUntil = localUntil;
    s.detoxDays = Number(local.detoxDays) || s.detoxDays;
    s.enabled = true;
    await chrome.storage.sync.set({ settings: s });
    return s;
  }
  return s;
}

// Build the dynamic rule list from current settings, then apply it.
async function syncRules() {
  let s = await readSettings();

  if (isDetoxLocked(s) && !s.enabled) {
    s.enabled = true;
    await persistSettings(s);
  }

  setupAlarms(s);

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);

  let addRules = [];
  if (isBlockingActive(s)) {
    let id = 1;
    for (const [key, domains] of Object.entries(SITE_DOMAINS)) {
      if (!s.blockedSites[key]) continue;
      addRules.push({
        id: id++,
        priority: 1,
        action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: { requestDomains: domains, resourceTypes: ["main_frame"] }
      });
    }
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeIds,
      addRules: addRules
    });
  } catch (e) {
    console.error("FocusGuard: rule sync error", e);
  }
}

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync" || !changes.settings) return;
  await restoreDetoxIfNeeded(changes.settings.newValue || {});
  await syncRules();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SYNC_RULES") {
    syncRules().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "GET_STATUS") {
    readSettings().then((s) => {
      sendResponse({ active: isBlockingActive(s), settings: s });
    });
    return true;
  }
  if (msg.type === "START_DETOX") {
    startDetox(msg).then((result) => sendResponse(result));
    return true;
  }
});

async function startDetox({ password, days }) {
  const { isValidDetoxDays, lockUntilFromDays } = self.FocusGuard;
  if (!isValidDetoxDays(days)) {
    return { ok: false, error: "Select 1, 5, or 7 days." };
  }
  const pw = String(password || "").trim();
  if (!pw) {
    return { ok: false, error: "Set a password first." };
  }

  const s = await readSettings();
  if (isDetoxLocked(s)) {
    return { ok: false, error: "A detox is already active." };
  }

  s.password = pw;
  s.detoxDays = Number(days);
  s.lockUntil = lockUntilFromDays(days);
  s.enabled = true;
  await persistSettings(s);
  await syncRules();
  return { ok: true, settings: s };
}
