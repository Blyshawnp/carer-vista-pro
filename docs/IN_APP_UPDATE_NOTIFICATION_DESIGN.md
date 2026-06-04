# In-App Update Notification Design

Last updated: June 4, 2026

This document defines a lightweight app-controlled update notice and "What's new" pattern for Carer Vista Pro. It does not force Play Store or App Store updates. Store-managed automatic updates remain controlled by users, devices, and app-store behavior.

## Goals

- Let users know when a newer app/web version is available.
- Show concise release notes without spamming users.
- Support public PWA, future Android wrapper, and future iOS wrapper.
- Allow stronger critical update notices while preserving emergency access.
- Keep update copy privacy-safe and non-alarming.

## Non-Goals

- Do not force Play Store updates for everyone.
- Do not force App Store updates.
- Do not block emergency access.
- Do not duplicate app-store billing, auth, setup, notification, upload, or document systems.
- Do not expose internal deployment or security details to regular users.

## Version Manifest

Recommended static or server-backed manifest:

```json
{
  "latestVersion": "1.0.1",
  "minimumSupportedVersion": "1.0.0",
  "critical": false,
  "releaseDate": "2026-06-04",
  "platforms": {
    "web": {
      "latestVersion": "1.0.1",
      "updateUrl": "/"
    },
    "android": {
      "latestVersion": "1.0.1",
      "updateUrl": "https://play.google.com/store/apps/details?id=com.carervistapro.app"
    },
    "ios": {
      "latestVersion": "1.0.1",
      "updateUrl": "https://apps.apple.com/app/id000000000"
    }
  },
  "notes": [
    "Improved notification category settings.",
    "Added release readiness documentation.",
    "Updated app-store packaging guidance."
  ]
}
```

Possible storage locations:

- Static file: `/app-version.json`.
- Public storage object in `app-assets`.
- Database/admin setting.
- API route backed by server-side config.

## Current App Version

Store current version in one of:

- `package.json` version.
- A generated app config file.
- Native wrapper version config.
- Environment variable exposed as a public version string.

Do not expose commit history, private repository URLs, deployment secrets, or environment details in user-facing version payloads.

## Startup Check

Suggested behavior:

1. On authenticated app startup, fetch the version manifest with `cache: "no-store"` or short cache.
2. Compare current version with latest version for the active platform.
3. If latest is newer and user has not dismissed that exact version, show a small banner.
4. If `critical` is true or current version is below `minimumSupportedVersion`, show a stronger modal/banner.
5. Never block emergency access.
6. Store dismissed version in localStorage or user preference.

## Banner Copy

Default notice:

```text
Update available
Version 1.0.1 is available.

[What's new] [Update now] [Later]
```

Critical notice:

```text
Important update available
This update includes important reliability fixes. Please update soon.

[What's new] [Update now] [Later]
```

Do not use language that implies emergency dispatch, guaranteed push delivery, guaranteed medical safety, or forced app-store installation.

## What's New Modal

Recommended content:

- Version number.
- Release date.
- 3 to 6 bullet points.
- Link to Help/About release notes if present.
- "Update now" action.
- "Close" or "Later" action.

Show once after version changes. Store a dismissed version key such as:

- `carer-vista-pro:update-dismissed-version`
- `carer-vista-pro:whats-new-seen-version`

## Critical Update Behavior

Critical updates may:

- Use stronger visual priority.
- Reappear after a shorter dismissal interval.
- Ask admins to update before continuing non-emergency admin workflows.
- Link directly to Play Store/App Store/native update page when packaged.

Critical updates must not:

- Block emergency information.
- Block emergency button access.
- Hide active shift safety information.
- Claim that updates are automatic or guaranteed.

## PWA Update Behavior

For current PWA:

- "Update now" can reload the page.
- If a service worker update is waiting, the future implementation can prompt it to activate.
- If no service worker update is waiting, reload and browser cache behavior applies.
- Users may need to close/reopen installed PWA windows on some devices.

## Future Android Native Behavior

Options:

- Link to Play Store listing.
- Use Play Core In-App Updates if Capacitor/native wrapper supports it.
- Flexible update for normal releases.
- Immediate update only for severe reliability/security issues.
- Android notification channel for update notices may be added if useful.

Store behavior:

- Google Play auto updates are controlled by users/devices/Play Store settings.
- The app cannot force all devices to auto-update.

## Future iOS Native Behavior

Options:

- Link to App Store listing.
- Show "What's new" from the version manifest.
- Use native app version values for comparison.

Store behavior:

- iOS updates go through the App Store.
- Auto updates are controlled by users/devices/App Store behavior.
- Do not promise automatic forced updates.

## Admin Controls

If admin-managed version manifests are added later:

- Restrict editing to platform admins.
- Validate semantic versions.
- Validate HTTPS update URLs.
- Require release notes before publishing.
- Add audit log with actor, timestamp, old values, and new values.
- Keep notes privacy-safe.

## Help/About Link

Recommended Help/About entry:

```text
Release notes
View the latest app updates and known rollout notes.
```

The link can open:

- A static release notes page.
- The current version manifest rendered in-app.
- A public docs page.

Do not expose developer-only signing, secrets, billing implementation, or deployment instructions to caregivers or clients.

## Test Plan

- [ ] Manifest fetch succeeds.
- [ ] Missing manifest fails silently.
- [ ] Older current version shows update banner.
- [ ] Current version equal to latest shows no banner.
- [ ] Dismissed version does not show repeatedly.
- [ ] Newer version after dismissal shows again.
- [ ] Critical update shows stronger notice.
- [ ] Emergency access remains available.
- [ ] "What's new" opens and closes.
- [ ] "Update now" works for PWA reload.
- [ ] Android update URL opens Play Store when packaged.
- [ ] iOS update URL opens App Store when packaged.

## Future Implementation Checklist

- [ ] Decide manifest source.
- [ ] Add current app version source.
- [ ] Add startup version check.
- [ ] Add update banner/modal.
- [ ] Add release notes display.
- [ ] Add dismissal storage.
- [ ] Add critical update visual state.
- [ ] Add Help/About release notes link.
- [ ] Test PWA, Android wrapper, and iOS wrapper behavior separately.
