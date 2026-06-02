# PWA Push Notification Release & Reliability Guide

This document outlines the current Progressive Web App (PWA) push notification requirements, structural causes of message delays, and technical recommendations to optimize delivery speed and reliability.

---

## 1. Current PWA Push Notification Requirements

For web push notifications to function inside a PWA, all of the following conditions must be met:
* **Production HTTPS Domain**: The application must be served over a secure, validated SSL certificate (`https://`). Localhost is the only exception for development.
* **Valid Web App Manifest**: The `manifest.json` file must declare proper application details, icons, and `gcm_sender_id` credentials if needed.
* **Active Service Worker**: The browser must successfully register and run a service worker file (`sw.js`).
* **Push Permission Granted**: The browser or OS prompt must have explicit user permission to send alerts.
* **Stored Subscription**: The browser generates a unique endpoint and cryptography keys (P256DH, auth keys) which must be securely stored in the Supabase database.
* **VAPID Keys Configured**: Secure Voluntarily Application Server Identification (VAPID) public/private key pairs must be set up on the backend.
* **iOS Installed App Constraint**: To receive web pushes on an iPhone or iPad (since iOS 16.4+), **the user must install the app to their Home Screen** (via Share → Add to Home Screen). Standard browser tabs in Safari/Chrome will not support background pushes.
* **Android Permission**: Android Chrome/PWA users must accept standard notification access prompts.

---

## 2. Why PWA Notifications May Be Delayed or Fail

Web push leverages browser-based push service brokers (Apple Push Notification service for Safari/iOS, Firebase Cloud Messaging for Chrome/Android). Unlike native wrappers, PWA background delivery is prone to specific limitations:
* **OS Battery Optimization**: Modern mobile operating systems actively sleep or throttle service workers of background PWA apps to conserve battery life.
* **App Not Opened Recently**: Mobile operating systems will suspend background notifications for PWAs that have not been launched or interacted with for several days.
* **Service Worker Update Stale**: If the PWA updates but the service worker fails to refresh, existing notifications might fail due to schema mismatches.
* **Browser Throttling**: Browsers restrict service worker wake-up frequency, which can delay consecutive, non-urgent alerts.
* **Invalid/Expired Subscriptions**: If a user uninstalls the PWA or resets browser settings, the endpoint is invalidated by the push service broker, but the backend is not aware until a send is attempted.
* **Network Interruption**: Temporary cellular signal drops block the delivery of active payloads until connection is fully restored.
* **Privacy Payload Blocks**: If notification payloads contain highly detailed personal data, the browser or OS privacy managers might suppress rendering of the alert card.

---

## 3. Technical Enhancements & Best Practices

To make notifications faster and more robust, implement the following structures:

### A. Subscription Lifecycle & Health Checks
* **Platform & Metadata Tracking**: Store device platforms, operating system versions, user agents, and active/inactive status parameters in your push subscriptions table.
* **Periodic Refresh Checks**: Trigger a background check (`PwaHealthCheck`) on app mount or login to verify registration status, update `last_seen_at` times, and send updated endpoints to the server.
* **Dead Endpoint Deactivation**: Automatically mark endpoints as inactive in your database when Apple APNs or Google FCM brokers return a `404 Not Found` or `410 Gone` response during a send attempt.

### B. Reliable Server-Side Senders
* **Server-Side Queue & Retry**: Do not send push requests synchronously in HTTP request loops. Route notification dispatches through a queued background processor. Retry temporary failures (e.g. `503 Service Unavailable`) using exponential backoff.
* **Keep Payloads Small and Safe**: Send concise, privacy-safe notifications (e.g., "New message received" or "Shift starting soon") rather than including sensitive medical notes or personal records. This minimizes delivery overhead and blocks.
* **In-App Fallback Center**: Always keep an in-app notification list panel. If the native push fails to show, the user can immediately see all system messages upon opening the app.
* **Email/SMS Fallbacks**: For critical alerts (e.g., missed geofenced clock-ins or emergency updates), implement SMS or email fallbacks to dispatch notifications if a push is not clicked or acknowledged within X minutes.

---

## 4. Native App Recommendation

For critical medical care networks, native apps provide superior reliability:
* **Native Advantage**: Native apps use direct APNs (iOS) and FCM (Android) integrations that bypass PWA battery and service worker sleeping restrictions completely.
* **Recommendation**: While PWA web push is incredibly useful for everyday alerts, **critical emergency care notifications must not rely solely on web push**. Consider native shells or wraps for high-risk care coordination.

---

## 5. Release Checklist

Ensure you have thoroughly executed this list before deployment:
- [ ] Verify standard Safari installed-PWA push on iOS 16.4+.
- [ ] Verify Chrome/Edge installed-PWA push on Android.
- [ ] Verify desktop browser notification alerts.
- [ ] Test notification delivery when the PWA is completely closed.
- [ ] Test notification delivery after rebooting the phone.
- [ ] Test notification delivery after 24 hours of device inactivity.
- [ ] Verify that deactivating a permission in browser settings is safely handled.
- [ ] Verify click routing (clicking a notification opens the specific target path in PWA standalone mode).
- [ ] Verify sound settings volume and playback behavior when PWA is in background.

---

## 6. User-Facing Troubleshooting Guide

Provide the following guidance to your organization's users:

### iPhone & iPad Users:
1. Open the app in **Safari**.
2. Tap the **Share** button in Safari (box with up arrow).
3. Scroll down and select **Add to Home Screen**.
4. Launch the newly created app from your home screen.
5. Go to **Me → Notifications** and tap **Enable on this device**. Accept the native prompt.
6. Tap **Send test notification** to confirm setup is working.

### Android & Chrome Users:
1. Tap the Chrome menu (three dots in upper right).
2. Select **Install app** or **Add to Home Screen**.
3. Launch the app, navigate to **Account & Settings**, and permit notification prompts.
4. Verify notifications are not blocked in Chrome application settings.

### What to do if notifications still do not appear:
* **Check Do Not Disturb**: Make sure Focus Mode or Do Not Disturb is disabled on your phone.
* **System Settings**: Go to iPhone Settings → Notifications → Select standard app icon, and check that notifications are enabled.
* **Battery Settings**: On Android, verify that battery saver mode is not aggressively sleeping the app.
