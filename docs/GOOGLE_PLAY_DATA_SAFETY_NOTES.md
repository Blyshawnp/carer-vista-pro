# Google Play Data Safety Notes

*Last Updated: May 31, 2026*

> [!IMPORTANT]
> **Notice:** These notes and the associated Privacy Policy should be reviewed by a qualified attorney before submitting the Data Safety Form or deploying the application to the Google Play Store.

To comply with Google Play's Data Safety policies, the declarations in your Google Play Console must align with the collection and sharing behaviors implemented in the Carer Vista Pro codebase. Use these guidelines to fill out the Play Store Data Safety form.

---

## 1. Data Collected & Declared

You must declare that the application collects the following data categories:

### A. Personal Information
* **Name & Email Address:** Collected for user authentication, account identification, and communications.
* **Phone Number:** Collected optionally for coordinate updates.
* **User IDs:** Unique identifiers generated to map profiles.

### B. Health & Fitness (Care Data)
* **Health / Care-Related Info:** Emergency contacts, medical device locations, allergy severity, and medication coordinates. Declare this as "collected" and used for care coordination and safety references.

### C. Location
* **Precise Location (GPS):** Location coordinates are queried only at the exact moments of checking in and out of shifts to verify geofences.
  * *Note:* Declare that the app collects precise location, but **do not** declare continuous background location tracking, as the app only captures location on-demand during shift actions.

### D. Messages
* **In-App Messages:** Internal text conversations between organization members are stored in the database.

### E. Photos and Videos (Files)
* **Photos & Files:** Support for profile avatars, client documents, incident reports, and pet photos.

### F. Financial Information
* **Payment Info / Billing history:** Invoice records, pay estimates, hours worked, bonuses, and payment statuses logged manually by administrators.

### G. App Activity & Diagnostics
* **App Activity:** Interaction events logged in audit trails.
* **Device / Other IDs:** Browser cookies, push notification tokens, and system session logs.

---

## 2. Data Sharing Declarations

* **Service Providers:** Declare that data is shared with secure infrastructure service providers (such as Supabase for database and auth, Vercel for web hosting, and browser push notification services) strictly to operate the app.
* **No Selling of Data:** You must declare that Carer Vista Pro **does not sell** personal or sensitive user data to third parties.

---

## 3. Account Deletion Path & URL

Google Play requires that users have an easy, transparent path to request account and data deletion both in-app and on the web:
* **In-App Deletion Path:** Users navigate to **Help &rarr; Request Account Deletion** (maps to the `/account/delete` route) and submit the deletion request form.
* **Web Deletion Request URL:** Provide a dedicated contact/deletion request link on your public-facing website where users can submit their names and email addresses to initiate deletion.
* **Retention Statement:** Explain that while profiles are removed, transactional billing metadata, historical check-in timestamps, and safety audit logs are retained for legitimate recordkeeping, tax audits, and compliance purposes.

---

## 4. Updates & Maintenance
* Re-evaluate your Data Safety declarations whenever you add new third-party analytics, payment integrations, or additional tracking capabilities.
