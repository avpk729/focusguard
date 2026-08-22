# Publishing FocusGuard to the Chrome Web Store

This guide gets FocusGuard from this repo onto the [Chrome Web Store](https://chrome.google.com/webstore).

Official docs: [Register](https://developer.chrome.com/docs/webstore/register) · [Publish](https://developer.chrome.com/docs/webstore/publish) · [Images](https://developer.chrome.com/docs/webstore/images)

## What you must do manually

These steps need your Google account and cannot be finished by an automated upload:

1. Pay the **one-time $5** Chrome Web Store developer registration fee
2. Create screenshots / promo images
3. Submit the listing in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole)

---

## 1. Register as a developer (~5 minutes + $5)

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with the Google account you want to publish under
3. Accept the developer agreement
4. Pay the **$5 one-time** registration fee (non-refundable, covers unlimited extensions)

Tip: use an email you check regularly — account email cannot be changed later.

---

## 2. Package the extension

From this project folder, create a ZIP that contains only the extension files (not `.git`, docs, or store helpers).

PowerShell (already prepared as `focus-guard-store.zip` if you ran the packaging script):

```powershell
Compress-Archive -Path manifest.json,shared.js,background.js,content.js,popup.html,popup.js,blocked.html,icons -DestinationPath focus-guard-store.zip -Force
```

Confirm the ZIP root contains `manifest.json` directly (not nested inside an extra folder).

---

## 3. Store listing copy (paste into the dashboard)

**Name:** FocusGuard

**Summary (≤132 chars):**
```
Block distracting sites on a schedule. Stay focused with optional password lock and timed detox.
```

**Description:**
```
FocusGuard helps you stay on task by blocking distracting websites during the hours you choose.

FEATURES
• Toggle blocking for Twitter/X, Instagram, Reddit, YouTube, Facebook, TikTok, Snapchat, Twitch, Pinterest, LinkedIn, and Tumblr
• Optional daily schedule with start time, end time, and weekdays
• Optional password so settings cannot be changed on impulse
• Optional 1-day, 5-day, or 7-day detox lock. Unlock stays off until the timer ends
• Works entirely on your device — no account and no tracking backend

HOW TO USE
1. Click the FocusGuard icon
2. Turn on blocking and pick the sites you want blocked
3. (Optional) Enable a schedule for study hours
4. (Optional) Set a password to lock changes
5. (Optional) Select a 1-day, 5-day, or 7-day detox. After the warning and OK, unlock stays off until the time is complete

When a blocked site is visited during active hours, FocusGuard redirects you to a focus reminder page instead.
```

**Category:** Productivity

**Language:** English

---

## 4. Images you need

| Asset | Size | Required? |
|-------|------|-----------|
| Store icon | 128×128 PNG (already in `icons/icon128.png`) | Yes |
| Screenshot(s) | **1280×800** or 640×400, at least 1 (up to 5) | Yes |
| Small promo | **440×280** | Yes |

How to capture a screenshot quickly:

1. Load the unpacked extension in Chrome
2. Open the popup (or blocked page)
3. Use a window resize / screenshot tool so the capture is exactly 1280×800
4. Show real UI: site toggles, schedule, and the blocked interstitial

Put finished assets in `store-assets/` locally (that folder is gitignored for large PNGs if you prefer).

---

## 5. Privacy policy URL

FocusGuard uses `storage` and host permissions, so a public privacy policy URL is required.

After GitHub Pages is enabled on this repo, use:

```
https://avpk729.github.io/focusguard/privacy-policy.html
```

(Or host the same `privacy-policy.html` anywhere public.)

Enable Pages: repo **Settings → Pages → Deploy from branch → `main` / root**.

---

## 6. Privacy tab — single purpose & permissions

**Single purpose:**
```
Help users stay focused by blocking selected distracting websites during scheduled hours.
```

**Permission justifications (paste per permission):**

| Permission | Justification |
|------------|---------------|
| `storage` | Save blocking preferences, schedule, optional password, and optional detox end time locally on the user’s device. |
| `alarms` | Re-evaluate schedule windows so blocking turns on/off at the configured times. |
| `declarativeNetRequest` | Redirect navigation to blocked sites to the extension’s focus page when blocking is active. |
| `declarativeNetRequestWithHostAccess` | Apply net-request rules on the user-selected site hosts listed in the manifest. |
| Host permissions (listed social sites) | Only these hosts can be blocked or show the interstitial; required for declarativeNetRequest matching and content-script fallback. |

**Data usage:**
- Does not collect user data
- Does not sell or transfer user data
- Does not use data for purposes unrelated to the extension’s single purpose
- Settings are stored locally via `chrome.storage`

---

## 7. Upload & submit

1. Dashboard → **New item** → upload `focus-guard-store.zip`
2. Fill **Store listing**, **Privacy**, and **Distribution** (Public / Unlisted / Private)
3. Add privacy policy URL and screenshots
4. **Submit for review**

Review often takes a few days to a couple of weeks. You can choose to publish automatically after approval or publish manually later.

---

## 8. Common rejection fixes

- Justify every permission narrowly (use the table above)
- Privacy policy URL must load without login
- Screenshots must show the real extension UI
- Do not request broader host permissions than needed
- Keep Manifest V3 only (already true for FocusGuard)
