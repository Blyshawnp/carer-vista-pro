# App Store Billing Integration Guide

This guide provides technical instructions for wrapping the Carer Vista Pro Progressive Web App (PWA) in native shells and implementing subscription paywalls using Google Play Billing and Apple App Store StoreKit.

---

## 1. The PWA App Store Limitation
A standard Progressive Web App (PWA) running in a mobile web browser cannot directly interact with native iOS App Store (StoreKit) or Google Play Billing APIs. 
To publish on the stores and use native billing, you must package the PWA using a native shell or wrapper:
* **Recommended Wrappers**: Capacitor (Ionic), Apache Cordova, or specialized PWA wrappers (e.g. PWABuilder).
* **Capacitor Integration**: Equip your Capacitor shell with plugins such as `cordova-plugin-purchase` or Capacitor's native Purchase wrappers to expose Apple/Google API endpoints directly to the application Javascript.

---

## 2. Google Play Billing (Android)

To implement subscriptions on Android devices:
1. **Integration Library**: Expose the Play Billing Library in your Android wrapper wrapper project.
2. **Server-Side Validation**:
   * Collect the `purchaseToken`, `subscriptionId`, and `packageName` from the mobile client upon purchase completion.
   * Send this token to your backend. The backend must query the **Google Play Developer API** using the `Purchases.subscriptions.get` endpoint to verify purchase authenticity.
3. **Real-Time Developer Notifications (RTDN)**:
   * Configure a **Google Cloud Pub/Sub** topic to listen to subscription state events sent directly by Google Play.
   * Your backend endpoint must process these pub/sub webhooks to catch subscription cancellations, expirations, and renewals immediately.
4. **Product ID Mapping**:
   * Define Android product IDs (e.g., `pro.carervista.premium_org_monthly`) inside Google Play Console.
   * Map these IDs in your database configuration to internal plan categories (`premium`, `agency`).

---

## 3. Apple App Store Billing (iOS)

To implement subscriptions on Apple iOS devices:
1. **StoreKit Native Integration**: Enable the StoreKit capability inside Xcode for your wrapped iOS application.
2. **Server-to-Server App Store API**:
   * Retrieve the App Store receipt or the `transactionId` from the client.
   * Validate this transaction server-side using the App Store Server API (or App Store Server Notifications V2).
   * Update the database state for the purchaser's organization accordingly.
3. **App Store Server Notifications**:
   * Provide a secure HTTP POST endpoint in your API gateway for Apple's server-to-server notifications.
   * Process event types such as `SUBSCRIBED`, `DID_RENEW`, `EXPIRED`, `REFUND`, and `GRACE_PERIOD_EXPIRED`.

---

## 4. Cross-Platform Organization Subscription Management

Because Carer Vista Pro is a B2B platform, subscriptions are tied to the **Organization**, not the individual device:
* **Purchaser Association**: The user purchasing the subscription must hold an `admin` role in their organization. The purchase record in `app_store_purchase_records` links the individual store transaction to their `organization_id`.
* **Centralized Entitlements**: Once a store receipt is validated and saved, the backend sets the organization's subscription status to `active`. Every user inside that organization instantly gains access to the premium features, regardless of their device or platform (iOS, Android, or Web PWA).
* **Subscription Lifecycle Scenarios**:
  * **Expiration/Cancellation**: If a subscription is canceled, the backend must keep the status `active` until the end of the billing period (`current_period_end`). After that, set the status to `expired` and fall back to the basic plan tier.
  * **Grace Period**: Apple and Google support billing grace periods (e.g., 16 days). Allow standard usage while billing attempts are retried, keeping status as `grace_period`.
  * **Refunds/Revocations**: Instantly deactivate entitlements if a chargeback or store refund is received.
  * **Upgrades/Downgrades**: When an admin upgrades, map the new Store product ID to the higher plan key and automatically adjust the billing periods via store alignment protocols.

---

## 5. Architectural Security Warnings
* **Official Store Documentation**: Always refer directly to the latest Apple Developer and Google Play Console documentation before shipping. App Store review rules, StoreKit requirements, and billing APIs undergo frequent updates.
* **No localStorage Reliance**: Never store premium state flags (e.g., `isPremium = true`) in the local browser database. These can be easily manipulated by users. Always verify the subscription server-side on every write operation.
* **Legal and Tax Review**: Ensure you have reviewed in-app purchase revenue cuts (usually 15% to 30%), international tax withholding requirements, and legal consumer refund rules.

---

## 6. Future Implementation Checklist

To implement paywalls in the future, follow this sequence:
- [ ] Choose and configure the native wrapper shell (Capacitor recommended).
- [ ] Set up developer accounts with Apple Developer Program and Google Play Console.
- [ ] Create subscription products, define pricing matrix, and list Store IDs.
- [ ] Add the Store Product IDs to the application environment configuration.
- [ ] Integrate native in-app purchase plugins inside Capacitor to trigger Apple/Google pay sheets.
- [ ] Set up secure validation APIs on the Node.js backend.
- [ ] Create HTTP webhook endpoints to consume server-to-server notifications from Apple and Google Cloud Pub/Sub.
- [ ] Verify the organization entitlement gate logic checks in every secure action.
- [ ] Execute transaction tests using Apple sandbox accounts and Google licensing testers.
- [ ] Implement cancellation, grace period, and refund flows.
- [ ] Draft client-facing support documentation for billing inquiries.
