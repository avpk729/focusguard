# FocusGuard

Block distracting sites during study hours. Get back to work.

FocusGuard is a Chrome extension (Manifest V3) that blocks social and entertainment sites on a schedule so you can stay focused.

## Features

- **One-click blocking** for Twitter/X, Instagram, Reddit, YouTube, Facebook, TikTok, Snapchat, Twitch, Pinterest, LinkedIn, and Tumblr
- **Schedules** — set start/end times and which days of the week blocking is active
- **Password lock** — protect settings so you cannot casually disable blocking
- **Timed detox** — lock FocusGuard for 1, 5, or 7 days. The unlock button stays off until the timer ends
- **Local-only** — settings stay in your browser; nothing is sent to a server

## Timed detox

1. Select the weekdays for your study schedule.
2. Select a 1-day, 5-day, or 7-day detox.
3. Enter a password and press **OK**.
4. Read the warning. If you continue, FocusGuard starts the lock.
5. The popup shows a countdown. The **Unlock** button becomes active only when the time is complete. You still need the password.

During a detox, blocking stays on for the selected sites, even outside the study schedule. You cannot cancel the lock from the popup.

## Install (developer / local)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

## Tests

```bash
node --test shared.test.js
```

## Chrome Web Store

See [PUBLISHING.md](./PUBLISHING.md) for the checklist to publish this extension.

## Privacy

FocusGuard does not collect or transmit personal data. See the [privacy policy](./privacy-policy.html).

## License

MIT
