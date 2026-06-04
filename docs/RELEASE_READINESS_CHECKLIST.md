# Carer Vista Pro Public Release Readiness Checklist

Last updated: June 4, 2026

Use this checklist before public launch, agency onboarding, Vercel production deployment, app store submission, native packaging, or billing rollout. This is a verification checklist, not a substitute for attorney review, tax/payroll review, healthcare compliance review, app-store policy review, or production security review.

## 1. Git and Deployment

- [ ] Current branch is `main`.
- [ ] `git status` is clean before deployment.
- [ ] `npm run build` passes locally.
- [ ] Production Vercel deployment completes successfully.
- [ ] Latest commit is deployed to the intended public Vercel project.
- [ ] Production environment variables are verified in Vercel.
- [ ] Production URLs are set correctly.
- [ ] Supabase Auth site URL and redirect URLs match production.
- [ ] Custom domain is verified.
- [ ] No `.env` files are committed.
- [ ] `supabase/.temp` is not committed.
- [ ] Supabase service role key is used only server-side.
- [ ] Browser bundles do not expose server-only secrets.
- [ ] Public support, privacy, terms, and deletion URLs are reachable.
- [ ] Deployment rollback plan is documented.

## 2. Supabase Database

- [ ] All migrations are applied with `supabase db push`.
- [ ] No `supabase db reset` is used against production.
- [ ] RLS is enabled on user, organization, client, shift, task, document, invoice, billing, and notification tables.
- [ ] RLS policies are verified for admin, organization admin, caregiver, client, and family roles.
- [ ] Organization scoping prevents cross-agency and cross-client access.
- [ ] Agency/company mode tables are scoped by organization.
- [ ] Personal/family mode behavior remains scoped.
- [ ] Client-directed care mode behavior remains scoped.
- [ ] Solo caregiver mode behavior remains scoped.
- [ ] Storage metadata tables match the application queries.
- [ ] `profiles.organization_id` is present for every active user.
- [ ] Setup/onboarding completion fields are present and populated.
- [ ] Notification preferences and tutorial fields are present.
- [ ] Invoice, year-end, audit, correction, and dispute tables preserve history.
- [ ] Billing/paywall tables are present if the feature is enabled.
- [ ] Seed or test data is removed or clearly marked as test data.
- [ ] Backup/export process is documented.

## 3. Supabase Storage

Verify each bucket exists with the expected public/private setting:

- [ ] `avatars` exists and is private.
- [ ] `pet-photos` exists and is private.
- [ ] `client-photos` exists and is private.
- [ ] `client-files` exists and is private.
- [ ] `documents` exists and is private.
- [ ] `app-assets` exists and contains only non-sensitive public app/branding assets.

For each bucket:

- [ ] Upload works for allowed users.
- [ ] View/display works for allowed users.
- [ ] Delete works only where allowed.
- [ ] Signed URLs work for private files.
- [ ] Unauthorized users cannot fetch private files.
- [ ] No sensitive files are stored in `app-assets`.
- [ ] Organization custom logo/app assets are non-sensitive.
- [ ] Old public URL values still resolve through the signed URL path when possible.

## 4. Authentication and Onboarding

- [ ] Login works.
- [ ] Logout works.
- [ ] Forgot password works.
- [ ] Reset password works.
- [ ] Email change works.
- [ ] Password change works.
- [ ] Public signup path works if enabled.
- [ ] Setup wizard completes without looping.
- [ ] Public app organization modes save correctly.
- [ ] Agency/company mode setup creates the expected organization records.
- [ ] Personal/family mode setup creates the expected records.
- [ ] Client-directed care mode setup creates the expected records.
- [ ] Solo caregiver mode setup creates the expected records.
- [ ] Invite flow works for caregivers, clients, and family users.
- [ ] No setup loop occurs after login.
- [ ] Tutorial shows after first login/setup completion.
- [ ] Tutorial can be skipped.
- [ ] Tutorial can be restarted from Help.
- [ ] Tutorial does not block emergency access.
- [ ] Onboarding checklist can be dismissed.
- [ ] Missing intro video is skipped without runtime errors.

## 5. Roles and Permissions

- [ ] Admin can manage allowed organization records.
- [ ] Organization admin can manage allowed agency records.
- [ ] Caregiver can view assigned shifts and allowed client information.
- [ ] Client can view/manage only allowed client-side records.
- [ ] Family can view only allowed family records.
- [ ] Agency/company mode permissions are verified.
- [ ] Personal/family mode permissions are verified.
- [ ] Client-directed care mode permissions are verified.
- [ ] Solo caregiver mode permissions are verified.
- [ ] No role can access unrelated data by URL guessing.
- [ ] Read-only users do not see edit/delete actions.
- [ ] Public app agency clients cannot manage caregiver photos unless explicitly allowed.
- [ ] Server APIs enforce role checks, not just UI hiding.

## 6. Clients and Care Recipients

- [ ] Create client/care recipient.
- [ ] View client/care recipient without entering edit mode.
- [ ] Edit client/care recipient with allowed role.
- [ ] Profile photo upload works.
- [ ] Profile photo displays through signed URL or fallback.
- [ ] Emergency info is visible to allowed users.
- [ ] Home info is visible to allowed users.
- [ ] Pets are visible from the client profile.
- [ ] Documents are visible from the client profile.
- [ ] Emergency guide is visible where implemented.
- [ ] Geofence/address validation works.
- [ ] Structured and fallback addresses display correctly.
- [ ] Sensitive home access details are not exposed to unrelated users.
- [ ] Agency client assignment restrictions are enforced.

## 7. Pets

- [ ] Add pet.
- [ ] Edit pet.
- [ ] Remove pet where allowed.
- [ ] Upload pet photo.
- [ ] Choose pet preset avatar if allowed.
- [ ] Pet photo/preset displays without broken image icons.
- [ ] Pet photo preview opens where implemented.
- [ ] Pet appears from client profile.
- [ ] Pet summary appears before accepting a shift where applicable.
- [ ] Pet wording is neutral.
- [ ] Duplicate pet sections are not shown on shift screens.
- [ ] Allergy/safety reminder is visible without exposing private notes to unauthorized users.

## 8. Documents and Print Approval

- [ ] Upload documents from allowed screens.
- [ ] View documents from client profile.
- [ ] View relevant documents from shift detail.
- [ ] Document count matches document list.
- [ ] Documents are not hidden only inside edit mode.
- [ ] Private document access uses signed/authenticated URLs.
- [ ] Request print approval works.
- [ ] Admin/client can approve print request.
- [ ] Admin/client can deny print request with reason.
- [ ] Approved users can print approved documents.
- [ ] Unapproved users cannot print restricted documents.
- [ ] Mobile print flow is usable.
- [ ] Print view is clean and supports Save as PDF.
- [ ] Print approval notification reaches the correct client/admin.

## 9. Scheduling and Shifts

- [ ] Create shift.
- [ ] Edit shift.
- [ ] Delete/cancel shift with correct permissions.
- [ ] Agency cancellation request flow works where enabled.
- [ ] Cancellation fee settings are applied only where configured.
- [ ] Force assign works for admins.
- [ ] Force accept works only where allowed.
- [ ] Caregiver can accept shift.
- [ ] Caregiver can decline or request removal.
- [ ] 48-hour warning appears where required.
- [ ] Trade/coverage request works if enabled.
- [ ] Bulk select shifts works.
- [ ] Add tasks to selected shifts works.
- [ ] Export one shift to calendar.
- [ ] Export selected shifts to calendar.
- [ ] Export all my shifts to calendar.
- [ ] Shift tracking number appears only at bottom of shift detail.
- [ ] Shift tracking number auto-fills disputes/reports/corrections.
- [ ] Duplicate shift summary boxes are removed.

## 10. Tasks

- [ ] Required tasks display and can be completed.
- [ ] Optional tasks display and can be completed.
- [ ] PRN/if-needed tasks display and can be marked.
- [ ] PRN unchecked does not warn as missed.
- [ ] Needs follow-up PRN status notifies the right users.
- [ ] Time-of-day metadata is preserved when tasks are copied to shifts.
- [ ] Exact scheduled time is preserved.
- [ ] Task sort order is preserved.
- [ ] Default tasks apply only on selected days.
- [ ] Task categories display without raw enum labels.
- [ ] Bulk add tasks avoids duplicates where expected.
- [ ] Existing future/incomplete task timing repair is verified.

## 11. Check-In and Check-Out

- [ ] Check in works.
- [ ] Check out works.
- [ ] Incomplete required tasks show checkout warning/blocking behavior.
- [ ] Optional tasks do not block checkout.
- [ ] PRN behavior matches settings.
- [ ] Break/lunch works if enabled.
- [ ] Geofence check works if enabled.
- [ ] Outside-geofence reason is captured.
- [ ] Time correction request works.
- [ ] Admin correction reason is required.
- [ ] Audit trail records actor, timestamp, and reason.
- [ ] Auto checkout behavior is verified.

## 12. Emergency

- [ ] Top emergency button is visible.
- [ ] Emergency information card is present only once where useful.
- [ ] Emergency guide is linked from the emergency card if available.
- [ ] Duplicate emergency sections are removed.
- [ ] Emergency icon is the correct red emergency icon.
- [ ] Emergency disclaimer is reachable.
- [ ] Terms state the app is not a substitute for 911/emergency services.
- [ ] Public marketing/app-store text does not claim emergency dispatch.
- [ ] Emergency access is not blocked by tutorial/onboarding UI.

## 13. Notifications

- [ ] In-app notifications appear.
- [ ] Push enable flow waits for an active service worker.
- [ ] Browser permission is re-checked after Allow.
- [ ] Test push arrives on supported devices.
- [ ] Test push diagnostics explain failures.
- [ ] Android Chrome push test passes.
- [ ] Android installed PWA push test passes.
- [ ] iPhone installed Home Screen PWA push test passes.
- [ ] iPhone browser tab limitation is documented.
- [ ] Notification categories are configurable.
- [ ] In-app sound/tone settings work after user interaction.
- [ ] Quiet hours work if configured.
- [ ] Urgent override behavior is verified.
- [ ] Notification privacy-safe body setting is respected.
- [ ] Push payloads contain no sensitive details when privacy-safe mode is enabled.
- [ ] App does not claim "sent" without diagnostics when delivery cannot be confirmed.
- [ ] Native notification channel/category plan is documented for app store packaging.

## 14. PWA and Install

- [ ] `manifest.json` is valid.
- [ ] Icons load.
- [ ] Maskable icon is valid.
- [ ] iPhone home screen icon appears correctly.
- [ ] Android icon appears correctly.
- [ ] Install prompt suppression works after "Do not show again".
- [ ] Install prompt suppression works after "Do not show for 24 hours".
- [ ] Manual install button is available from Settings.
- [ ] Installed standalone mode is detected.
- [ ] Basic offline shell behavior works.
- [ ] Service worker update does not break push subscription.
- [ ] Public install copy is accurate and does not overpromise offline or push behavior.

## 15. Profile Photos and Avatars

- [ ] User avatar upload works.
- [ ] Admin can upload caregiver avatar.
- [ ] Client/care recipient photo upload works.
- [ ] Pet photo upload works.
- [ ] Avatar preset picker opens from change photo flow.
- [ ] Preset avatars load from `public/avatar-presets`.
- [ ] Vecteezy attribution is present.
- [ ] Image preview modal works where implemented.
- [ ] Uploaded private avatars use signed URLs.
- [ ] Missing images show fallback initials or preset fallback.
- [ ] No broken image icons are visible.

## 16. Invoices, Payroll, and Year-End

- [ ] Invoice generation works.
- [ ] Payment recording works.
- [ ] Balance updates after payment.
- [ ] Invoice adjustment line can be added.
- [ ] Invoice dispute/correction workflow works.
- [ ] Caregiver pay summary is accurate.
- [ ] Year-end summary generation works.
- [ ] Year-end summary can be voided/deleted by admin with `CONFIRM`.
- [ ] Original totals are preserved when corrections are made.
- [ ] Audit trail captures actor, reason, timestamp, and original values.
- [ ] Public app agency responsibility wording is present.
- [ ] No unsupported payroll, tax, legal, or accounting claims are made.
- [ ] Worker classification responsibility is assigned to the organization/client.
- [ ] W-2/1099 support wording is reviewed by qualified counsel if shown.

## 17. Public Billing, Paywall, and Custom Branding

- [ ] Organization mode is selected and saved.
- [ ] Custom branding can be enabled only for allowed plans.
- [ ] Custom logo upload uses `app-assets` only for non-sensitive branding.
- [ ] Brand colors apply without breaking accessibility.
- [ ] "Powered by Carer Vista Pro" remains visible where required.
- [ ] Plan/feature gating is documented.
- [ ] Paywall behavior is documented if implemented.
- [ ] Billing setup docs are reviewed.
- [ ] App store billing docs are reviewed.
- [ ] Google Play billing policy impact is reviewed.
- [ ] Apple App Store billing policy impact is reviewed.
- [ ] Subscription/paywall test accounts are prepared if billing is enabled.
- [ ] Agency/client-facing billing disclaimers are reviewed.

## 18. Legal, Privacy, and Help

- [ ] Terms are reachable.
- [ ] Privacy policy is reachable.
- [ ] Emergency disclaimer is reachable.
- [ ] Billing/pay disclaimer is reachable.
- [ ] Data deletion process is documented.
- [ ] Account deletion URL is reachable.
- [ ] Google Play Data Safety notes are prepared.
- [ ] Photo/document privacy is documented.
- [ ] Push notification disclaimer is documented.
- [ ] Intro video and tutorial stored settings are disclosed.
- [ ] Custom branding ownership disclaimer is present.
- [ ] Agency responsibility for payroll/tax/legal compliance is clear.
- [ ] No unsupported medical claims are made.
- [ ] No emergency-service claims are made.
- [ ] Attorney review is completed before public launch.

## 19. Spanish and I18n

- [ ] Navigation labels are translated.
- [ ] Dashboard labels are translated.
- [ ] Schedule labels are translated.
- [ ] Shift detail labels are translated.
- [ ] Task labels and PRN statuses are translated.
- [ ] Client labels are translated.
- [ ] Pet labels are translated.
- [ ] Document labels are translated.
- [ ] Emergency labels are translated.
- [ ] Invoice/settings/help/legal titles are translated where supported.
- [ ] Public setup/organization mode labels are translated where supported.
- [ ] No raw enum labels or underscores are visible.
- [ ] User-entered data is not translated.

## 20. Accessibility and Mobile

- [ ] Text contrast is readable.
- [ ] Tap targets are large enough.
- [ ] Buttons have accessible names.
- [ ] Images have alt text or decorative handling.
- [ ] Keyboard navigation basics work.
- [ ] Modal close actions are reachable.
- [ ] Mobile layout works on small phones.
- [ ] Tablet layout is acceptable.
- [ ] Bottom nav does not cover content.
- [ ] Print views are usable on mobile.
- [ ] Public signup/setup flows are usable on small screens.

## 21. Performance and Logging

- [ ] No huge client payloads are sent unnecessarily.
- [ ] Images are optimized or constrained.
- [ ] Signed URL generation does not cause excessive reloads.
- [ ] Errors are logged safely.
- [ ] No secrets appear in console logs.
- [ ] No sensitive info appears in push payloads.
- [ ] Vercel logs are reviewed after smoke testing.
- [ ] Supabase logs are reviewed after smoke testing.
- [ ] Public launch monitoring plan is documented.
- [ ] Error reporting process is documented.

## 22. Browser and Device Test Matrix

- [ ] Android Chrome.
- [ ] Android installed PWA.
- [ ] iPhone Safari.
- [ ] iPhone Home Screen PWA.
- [ ] Desktop Chrome.
- [ ] Desktop Edge.
- [ ] Small phone screen.
- [ ] Tablet if possible.
- [ ] Slow network/basic offline behavior.
- [ ] Public signup/setup on mobile.
- [ ] Agency admin workflow on desktop.

## 23. Native Packaging Readiness

- [ ] Android package name is selected.
- [ ] Android signing key strategy is documented.
- [ ] `versionCode` and `versionName` strategy is documented.
- [ ] Adaptive icon is verified.
- [ ] App icon border/cropping is fixed.
- [ ] Native notification channel strategy is documented.
- [ ] Native notification category strategy is documented.
- [ ] In-app update strategy is documented.
- [ ] Apple bundle ID is reserved for future iOS packaging.
- [ ] iOS icon set is verified.
- [ ] TestFlight plan is documented.
- [ ] Deep link/universal link strategy is documented if packaging.
- [ ] Native wrapper privacy disclosures are reviewed.
- [ ] App store billing requirements are reviewed if subscriptions are sold in-app.

## 24. Final Launch Checklist

- [ ] Production env vars verified.
- [ ] Domain verified.
- [ ] Supabase Auth URLs verified.
- [ ] Redirect URLs verified.
- [ ] SMTP/email sending verified.
- [ ] VAPID public/private/subject verified.
- [ ] Storage buckets verified.
- [ ] RLS verified.
- [ ] App icons verified.
- [ ] Screenshots captured.
- [ ] Privacy policy URL verified.
- [ ] Support email/contact path verified.
- [ ] Account deletion path verified.
- [ ] Monitoring plan documented.
- [ ] Backup/export plan documented.
- [ ] Launch support owner assigned.
- [ ] Incident response owner assigned.
- [ ] Final smoke test completed.
- [ ] Legal/compliance owner signs off.
- [ ] Product/release owner signs off.

## Public App Store Release Checklist

### Google Play Console

- [ ] Google Play Console developer account is ready.
- [ ] App name, short description, and full description are reviewed.
- [ ] App category is selected.
- [ ] Screenshots are captured for required device classes.
- [ ] Feature graphic is prepared if required.
- [ ] Privacy policy URL is public and reachable.
- [ ] Account deletion URL is public and reachable.
- [ ] Support email is public and monitored.
- [ ] Test account credentials for review are prepared.
- [ ] Data Safety form is completed from current app behavior.
- [ ] Data collection disclosures include account, role, client, care, pet, document, location-at-check-in/out, notification, billing, and technical metadata as applicable.
- [ ] Data sharing disclosures match hosting, database, email, push, and analytics providers.
- [ ] Security practices disclose encryption in transit.
- [ ] Account deletion path is documented in app and listing.
- [ ] No unsupported medical claims are present.
- [ ] No emergency-service claims are present.
- [ ] Push notification behavior and limitations are described accurately.
- [ ] Subscriptions/paywall details are configured if implemented.
- [ ] Native app store billing requirements are followed if digital subscriptions are sold in the app.

### Apple App Store and TestFlight Future Packaging

- [ ] Apple Developer account is ready if iOS packaging is planned.
- [ ] Bundle ID is reserved.
- [ ] App privacy nutrition labels are drafted.
- [ ] TestFlight test plan is documented.
- [ ] Review notes explain that the app is care coordination and recordkeeping, not medical advice or emergency dispatch.
- [ ] Reviewer test account is prepared.
- [ ] Push notification capability is configured if native push is used.
- [ ] Background mode usage is reviewed and minimized.
- [ ] In-app purchase requirements are reviewed if subscriptions are sold in-app.
- [ ] Native wrapper requirements are documented.

### Native Wrapper Requirements

- [ ] Native shell does not expose service role keys.
- [ ] Native notification channels/categories map to Messages, Shift updates, Urgent/emergency alerts, Documents and print approvals, Payments and invoices, Schedule requests, Feedback/commendations, and Reminders.
- [ ] OS-level notification sound expectations are documented separately from PWA in-app tones.
- [ ] App icon and splash assets are verified.
- [ ] Versioning and release notes are documented.
- [ ] Store review privacy, support, and deletion URLs match production.
