# App Store Update Release Guide

Last updated: June 4, 2026

This guide describes how to prepare public Carer Vista Pro app-store updates after a native Android or iOS wrapper exists. It does not implement native billing. It does not replace Google Play, Apple App Store, privacy, legal, payroll, tax, healthcare, or security review.

## Release Principles

- Web/PWA production must be stable before packaging native updates.
- Native app-store releases should not introduce duplicate auth, setup, upload, notification, billing, or document systems.
- No secrets may be embedded in native app bundles.
- Store review notes must accurately describe the app as care coordination and recordkeeping, not medical advice or emergency dispatch.
- Emergency access must remain available even when update prompts are shown.

## Version Planning

Maintain a release record with:

- Web app commit hash.
- Native wrapper commit hash if separate.
- Database migration list.
- Supabase project/environment.
- Android `versionName`.
- Android `versionCode`.
- iOS version number.
- iOS build number.
- Release notes.
- Known risks.
- Rollback/recovery plan.

## Google Play Update Workflow

1. Confirm production web deployment is stable.
2. Confirm all Supabase migrations are applied.
3. Confirm Play Console Data Safety still matches the app.
4. Build signed Android App Bundle (`.aab`).
5. Open Play Console.
6. Choose the app.
7. Go to the target release track.
8. Create a new release.
9. Upload the app bundle.
10. Add release notes.
11. Review warnings, permissions, Data Safety, account deletion, and policy declarations.
12. Save and review release.
13. Roll out to internal testing.
14. Promote to closed testing if needed.
15. Roll out to production with staged percentage.

Google Play releases are prepared in Play Console by creating a release, uploading an app bundle, adding release notes, reviewing, then rolling out.

## Google Play Rollout Strategy

- Internal testing: 100% of internal testers.
- Closed testing: selected agency/admin/caregiver/client testers.
- Production staged rollout:
  - Start at 5% or 10%.
  - Monitor crash reports, Vercel logs, Supabase logs, support messages, login/setup success, push subscription success, and document access.
  - Increase to 25%, 50%, then 100% after confidence.
  - Pause rollout if critical regression appears.

## Google Play Update Behavior

- Auto updates are controlled by user/device/Play Store settings.
- The app cannot force all users to update automatically.
- An app-controlled update banner can direct users to the Play Store listing.
- Play Core In-App Updates can be considered later if the native wrapper supports it.
- Immediate update flows should be reserved for severe issues and must not block emergency access.

## Google Play Release Notes Template

```text
What's new:
- Improved notification settings and diagnostics.
- Added release readiness documentation.
- Improved document and photo reliability.

Notes:
- This app supports care coordination and recordkeeping.
- It is not emergency dispatch or medical advice.
```

## Google Play Pre-Submission Checklist

- [ ] AAB uploaded.
- [ ] VersionCode increased.
- [ ] VersionName matches release plan.
- [ ] App signing status verified.
- [ ] Release notes entered.
- [ ] Data Safety reviewed.
- [ ] Privacy policy URL works.
- [ ] Account deletion URL works.
- [ ] Support contact works.
- [ ] Screenshots current.
- [ ] Test account credentials available.
- [ ] No unsupported medical claims.
- [ ] No emergency-service claims.
- [ ] Subscription/paywall declarations complete if applicable.
- [ ] Sensitive permissions are justified.

## Apple App Store Update Workflow

1. Confirm production web deployment is stable.
2. Confirm all Supabase migrations are applied.
3. Confirm Apple privacy details still match the app.
4. Increment app version and build number.
5. Archive/upload a new build from Xcode or wrapper tooling.
6. Open App Store Connect.
7. Create a new app version if required.
8. Select the uploaded build.
9. Update release notes and metadata.
10. Update screenshots if UI changed materially.
11. Review privacy details and review notes.
12. Submit for review.
13. Use manual release or phased release after approval.

App Store Connect requires a new app version with an incremental version number and a new uploaded build for updates.

## Apple Phased Release

- Apple supports phased release over 7 days for eligible updates.
- Phased release can be paused.
- Auto updates are controlled by users/devices/App Store behavior.
- iOS updates still go through the App Store.
- There is no rollback to an old App Store version without submitting a new version.

## Apple Review Notes Template

```text
Carer Vista Pro is a care coordination and recordkeeping app for organizations, caregivers, clients, and family users.

It is not medical advice, clinical documentation, emergency dispatch, or a replacement for calling emergency services.

Test account:
Email: [review test email]
Password: [provided securely outside repo]

Key paths to test:
- Login
- Setup/onboarding
- Schedule
- Shift detail
- Documents
- Notifications
- Account deletion request
```

## Apple Pre-Submission Checklist

- [ ] Apple Developer account active.
- [ ] Bundle ID correct.
- [ ] Version number increased.
- [ ] Build number increased.
- [ ] Build uploaded.
- [ ] TestFlight smoke test passes.
- [ ] Privacy nutrition labels reviewed.
- [ ] Screenshots current.
- [ ] Support URL works.
- [ ] Privacy policy URL works.
- [ ] Account deletion/support path works.
- [ ] Review notes include test account.
- [ ] No unsupported medical claims.
- [ ] No emergency-service claims.
- [ ] In-app purchase requirements reviewed if subscriptions are sold in native app.

## App Store Billing Notes

- Do not implement native app store billing unless native wrapper code exists and the policy design is approved.
- If digital subscriptions or paid platform features are sold inside native apps, Google Play Billing or Apple In-App Purchase may be required.
- If payments are for real-world caregiver services rather than digital platform access, policy classification must be reviewed carefully.
- Billing copy must not imply payroll, tax, legal, accounting, or medical compliance services.

## Update Incident Response

If a bad app-store release ships:

- Pause staged rollout if available.
- Fix forward with a new build/version.
- For web/PWA regressions, deploy a Vercel fix if the native wrapper loads the production web app.
- Notify affected admins if needed through safe in-app notification copy.
- Do not expose sensitive incident detail in push payloads.
- Document root cause and prevention.

## Release Archive Checklist

- [ ] Release notes saved.
- [ ] Store screenshots archived.
- [ ] Data Safety/privacy answers archived.
- [ ] Build numbers recorded.
- [ ] Commit hashes recorded.
- [ ] Migration list recorded.
- [ ] Smoke test results recorded.
- [ ] Rollout dates and percentages recorded.
