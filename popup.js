// FocusGuard Popup Script

const {
  DETOX_OPTIONS,
  isDetoxLocked,
  remainingMs,
  formatRemaining,
  isBlockingActive,
  mergeSettings
} = FocusGuard;

const SITES = [
  { key: "twitter",   label: "Twitter/X" },
  { key: "instagram", label: "Instagram" },
  { key: "reddit",    label: "Reddit" },
  { key: "youtube",   label: "YouTube" },
  { key: "facebook",  label: "Facebook" },
  { key: "tiktok",    label: "TikTok" },
  { key: "snapchat",  label: "Snapchat" },
  { key: "twitch",    label: "Twitch" },
  { key: "pinterest", label: "Pinterest" },
  { key: "linkedin",  label: "LinkedIn" },
  { key: "tumblr",    label: "Tumblr" },
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

let settings = null;
let unlocked = false;
let selectedDetoxDays = 0;
let pendingPassword = "";
let timerId = null;

// ─── INIT ───────────────────────────────────────────────────────────────
async function init() {
  const resp = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  settings = mergeSettings(resp.settings);

  renderSiteGrid();
  renderDays();
  renderDetoxOptions();
  applySettingsToUI();
  refreshLockState();
}

function applySettingsToUI() {
  document.getElementById("masterToggle").checked = settings.enabled;
  document.getElementById("scheduleToggle").checked = settings.scheduleEnabled;
  document.getElementById("startTime").value = settings.scheduleStart;
  document.getElementById("endTime").value = settings.scheduleEnd;

  const active = isBlockingActive(settings);
  const pill = document.getElementById("statusPill");
  pill.textContent = active ? "ACTIVE" : "INACTIVE";
  pill.className = "status-pill " + (active ? "active" : "inactive");

  const sub = document.getElementById("toggleSub");
  if (isDetoxLocked(settings)) {
    sub.textContent = settings.detoxDays
      ? `${settings.detoxDays}-day detox is active`
      : "Timed detox is active";
  } else if (!settings.enabled) {
    sub.textContent = "Click to start blocking";
  } else if (settings.scheduleEnabled) {
    sub.textContent = `Active ${settings.scheduleStart}–${settings.scheduleEnd}`;
  } else {
    sub.textContent = "Blocking all day";
  }

  const pwHint = document.getElementById("pwHint");
  if (isDetoxLocked(settings)) {
    pwHint.textContent = "🔒 Timed detox is active — unlock is delayed";
  } else if (settings.password) {
    pwHint.textContent = "🔒 Password is set";
  } else {
    pwHint.textContent = "No password set — changes are unprotected";
  }

  const detoxHint = document.getElementById("detoxHint");
  if (isDetoxLocked(settings)) {
    detoxHint.textContent = "A detox is running. Settings stay locked until the timer ends.";
  } else if (selectedDetoxDays) {
    detoxHint.textContent = `${selectedDetoxDays}-day detox selected. Enter a password and press OK.`;
  } else {
    detoxHint.textContent = "Select a length, then enter a password and press OK.";
  }

  document.querySelectorAll(".detox-btn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.days) === selectedDetoxDays);
  });
}

function refreshLockState() {
  if (isDetoxLocked(settings) || (settings.password && !unlocked)) {
    showLockOverlay();
    updateLockOverlay();
    startTimer();
  } else {
    hideLockOverlay();
    stopTimer();
  }
}

// ─── SITE GRID ───────────────────────────────────────────────────────────
function renderSiteGrid() {
  const grid = document.getElementById("siteGrid");
  grid.innerHTML = "";
  SITES.forEach(site => {
    const chip = document.createElement("button");
    chip.className = "site-chip" + (settings.blockedSites[site.key] ? " blocked" : "");
    chip.innerHTML = `<span class="dot"></span>${site.label}`;
    chip.addEventListener("click", () => toggleSite(site.key, chip));
    grid.appendChild(chip);
  });
}

function toggleSite(key, chip) {
  settings.blockedSites[key] = !settings.blockedSites[key];
  chip.classList.toggle("blocked", settings.blockedSites[key]);
  chip.querySelector(".dot").style.background = settings.blockedSites[key]
    ? "var(--accent)" : "var(--muted)";
  save("Sites updated");
}

// ─── DAYS ────────────────────────────────────────────────────────────────
function renderDays() {
  const row = document.getElementById("daysRow");
  row.innerHTML = "";
  DAYS.forEach((d, i) => {
    const btn = document.createElement("button");
    btn.className = "day-btn" + (settings.scheduleDays.includes(i) ? " active" : "");
    btn.textContent = d;
    btn.addEventListener("click", () => {
      const idx = settings.scheduleDays.indexOf(i);
      if (idx === -1) settings.scheduleDays.push(i);
      else settings.scheduleDays.splice(idx, 1);
      btn.classList.toggle("active", settings.scheduleDays.includes(i));
      save("Schedule updated");
    });
    row.appendChild(btn);
  });
}

function renderDetoxOptions() {
  const row = document.getElementById("detoxRow");
  row.innerHTML = "";
  DETOX_OPTIONS.forEach(days => {
    const btn = document.createElement("button");
    btn.className = "detox-btn";
    btn.dataset.days = String(days);
    btn.textContent = days === 1 ? "1 day" : days + " days";
    btn.addEventListener("click", () => {
      selectedDetoxDays = selectedDetoxDays === days ? 0 : days;
      applySettingsToUI();
    });
    row.appendChild(btn);
  });
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────
document.getElementById("masterToggle").addEventListener("change", e => {
  settings.enabled = e.target.checked;
  save(settings.enabled ? "Blocking ON 🛡" : "Blocking OFF");
  applySettingsToUI();
});

document.getElementById("scheduleToggle").addEventListener("change", e => {
  settings.scheduleEnabled = e.target.checked;
  save("Schedule " + (settings.scheduleEnabled ? "enabled" : "disabled"));
  applySettingsToUI();
});

document.getElementById("startTime").addEventListener("change", e => {
  settings.scheduleStart = e.target.value;
  save("Schedule updated");
  applySettingsToUI();
});

document.getElementById("endTime").addEventListener("change", e => {
  settings.scheduleEnd = e.target.value;
  save("Schedule updated");
  applySettingsToUI();
});

// PASSWORD / DETOX START
document.getElementById("pwSaveBtn").addEventListener("click", () => {
  const val = document.getElementById("pwInput").value.trim() || settings.password;
  if (!val) { showToast("Enter a password first"); return; }

  if (selectedDetoxDays) {
    pendingPassword = val;
    showWarnOverlay(selectedDetoxDays);
    return;
  }

  settings.password = val;
  document.getElementById("pwInput").value = "";
  unlocked = true;
  save("Password set 🔒");
  applySettingsToUI();
});

document.getElementById("pwClearBtn").addEventListener("click", () => {
  if (isDetoxLocked(settings)) {
    showToast("Detox lock is still active");
    return;
  }
  settings.password = "";
  settings.detoxDays = 0;
  settings.lockUntil = 0;
  unlocked = false;
  selectedDetoxDays = 0;
  save("Password cleared");
  applySettingsToUI();
  refreshLockState();
});

document.getElementById("warnCancelBtn").addEventListener("click", hideWarnOverlay);
document.getElementById("warnConfirmBtn").addEventListener("click", confirmDetox);

async function confirmDetox() {
  const days = selectedDetoxDays;
  const password = pendingPassword;
  hideWarnOverlay();

  const result = await chrome.runtime.sendMessage({
    type: "START_DETOX",
    password,
    days
  });

  if (!result || !result.ok) {
    showToast((result && result.error) || "Could not start detox");
    return;
  }

  settings = mergeSettings(result.settings);
  document.getElementById("pwInput").value = "";
  pendingPassword = "";
  unlocked = false;
  showToast(days + "-day detox started");
  applySettingsToUI();
  refreshLockState();
}

// UNLOCK
document.getElementById("unlockBtn").addEventListener("click", tryUnlock);
document.getElementById("unlockInput").addEventListener("keydown", e => {
  if (e.key === "Enter") tryUnlock();
});

function tryUnlock() {
  if (isDetoxLocked(settings)) {
    document.getElementById("unlockError").textContent = "Unlock is not available yet.";
    document.getElementById("unlockError").style.display = "block";
    return;
  }
  const val = document.getElementById("unlockInput").value;
  if (val === settings.password) {
    unlocked = true;
    if (settings.lockUntil && Date.now() >= settings.lockUntil) {
      settings.lockUntil = 0;
      settings.detoxDays = 0;
      save();
    }
    hideLockOverlay();
    document.getElementById("unlockError").style.display = "none";
    document.getElementById("unlockInput").value = "";
    stopTimer();
    applySettingsToUI();
  } else {
    document.getElementById("unlockError").textContent = "Wrong password!";
    document.getElementById("unlockError").style.display = "block";
    document.getElementById("unlockInput").value = "";
    document.getElementById("unlockInput").focus();
  }
}

// ─── LOCK / WARN UI ──────────────────────────────────────────────────────
function showLockOverlay() {
  document.getElementById("lockOverlay").classList.add("show");
}

function hideLockOverlay() {
  document.getElementById("lockOverlay").classList.remove("show");
}

function showWarnOverlay(days) {
  const label = days === 1 ? "1 day" : days + " days";
  document.getElementById("warnText").textContent =
    `If you start a ${label} detox, you cannot unlock FocusGuard until the time is complete. You cannot cancel this lock. Do you want to continue?`;
  document.getElementById("warnOverlay").classList.add("show");
}

function hideWarnOverlay() {
  document.getElementById("warnOverlay").classList.remove("show");
}

function updateLockOverlay() {
  const locked = isDetoxLocked(settings);
  const timerEl = document.getElementById("lockTimer");
  const unlockBtn = document.getElementById("unlockBtn");
  const unlockInput = document.getElementById("unlockInput");
  const lockSub = document.getElementById("lockSub");

  if (locked) {
    const left = remainingMs(settings);
    timerEl.hidden = false;
    document.getElementById("timerValue").textContent = formatRemaining(left);
    document.getElementById("timerUntil").textContent =
      "Available " + new Date(settings.lockUntil).toLocaleString();
    lockSub.textContent = "A timed detox is active. The unlock button stays off until the timer ends.";
    unlockBtn.disabled = true;
    unlockInput.disabled = true;
  } else {
    timerEl.hidden = true;
    lockSub.textContent = "Enter password to modify settings";
    unlockBtn.disabled = false;
    unlockInput.disabled = false;
    if (settings.password && !unlocked) {
      lockSub.textContent = settings.detoxDays
        ? "Detox time is complete. Enter the password to unlock."
        : "Enter password to modify settings";
    }
  }
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    if (!settings) return;
    if (isDetoxLocked(settings)) {
      updateLockOverlay();
      return;
    }
    updateLockOverlay();
    if (settings.password && !unlocked) {
      document.getElementById("unlockInput").focus();
    } else if (!settings.password) {
      hideLockOverlay();
      stopTimer();
    }
    applySettingsToUI();
  }, 1000);
  updateLockOverlay();
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

// ─── UTILS ───────────────────────────────────────────────────────────────
async function save(msg) {
  if (isDetoxLocked(settings) && !unlocked) {
    showToast("Detox lock is still active");
    return;
  }
  await chrome.storage.sync.set({ settings });
  await chrome.storage.local.set({
    lockUntil: settings.lockUntil || 0,
    detoxDays: settings.detoxDays || 0
  });
  await chrome.runtime.sendMessage({ type: "SYNC_RULES" });
  if (msg) showToast(msg);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

// ─── START ───────────────────────────────────────────────────────────────
init();
