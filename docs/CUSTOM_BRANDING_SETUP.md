# Custom Branding & White-Labeling Setup Guide

Welcome to the Carer Vista Pro Custom Branding and White-Labeling setup guide. This document provides clear, factual instructions for organizations, agencies, and administrators to customize their platform identity while maintaining core platform integrity.

---

## 1. What Custom Branding Changes
When custom white-label branding is enabled for your organization, it customizes several major user interface accents:
* **Company Header Logo**: The primary Carer Vista Pro header logo is replaced with your organization's custom logo on the main application interface.
* **Custom Brand Name**: The application header displays your organization's brand name in place of standard text identifiers.
* **Curated Accent Colors**: Major button backgrounds, active navigation indicators, and visual accents transition to your organization's primary and accent brand colors.
* **Local UI Accents**: Visual highlights, theme-accents, and active state highlights align with the defined palette.

---

## 2. What Custom Branding Does Not Change
White-labeling is a visual identity wrapper. It does **not** modify or transfer ownership of the underlying software:
* **Platform Identity Footer**: All pages, help files, legal policies, and terms sections retain the standard platform identity: `"Powered by Carer Vista Pro"`.
* **Software Ownership**: Your organization does not own the software or the codebase. The application remains licensed, operated, and maintained by Carer Vista Pro.
* **System Settings**: Database names, core API endpoints, and system alerts are uniform and not rebranded.
* **Global Access Boundaries**: Security models, access controls, and core databases are managed centrally.

---

## 3. Custom Branding Setup Instructions

### System Settings & Feature Flags
To enable custom branding, the following parameters must be configured in your organization profile (managed under **Me → Organization Settings**):
* **Plan Gate Validation**: The organization's subscription tier must support the custom branding entitlement (`plan_allows_custom_branding = true`).
* **Branding Activation Switch**: The setting `enable_custom_branding` must be set to `true`.
* **White-Label Details**:
  * **Brand Name**: Enter your preferred organization name under `custom_brand_name`.
  * **Primary Brand Color**: Set your primary theme color using a standard hexadecimal value (e.g., `#0D6587`).
  * **Accent Brand Color**: Set your secondary accent color (e.g., `#D35400`).
  * **Company Logo URL**: Provide the secure URL of your hosted company logo.

---

## 4. Logo and Asset Guidelines

To ensure the user interface remains readable and professional, prepare your image assets according to the following specifications:

| Asset Type | Recommended Dimensions | Max File Size | Accepted File Formats | Usage Location |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Logo** | `180px` width × `45px` height | `500 KB` | `PNG`, `SVG`, `WEBP` | App main header, sidebar, login portal |
| **Square Icon** | `192px` width × `192px` height | `250 KB` | `PNG` | Service worker PWA home screen icon |
| **Large Icon** | `512px` width × `512px` height | `500 KB` | `PNG` | PWA splash screens and app load screens |

### Important Asset Rules:
* **Transparency**: Use transparent backgrounds (`.png` or `.svg`) rather than solid white boxes to blend naturally with the application's default cream backgrounds.
* **Contrast**: Ensure your logo has sufficient contrast against light background panels (`#fdfcf7`) and dark-themed navigation bars.
* **Secure Protocols**: All asset URLs **must** begin with `https://`. Insecure `http://` paths will be blocked by browsers due to Mixed Content policies.

---

## 5. Hosting and Storage Configuration

To upload your custom logos and icons:
1. **Supabase Storage Bucket**: Upload your image files to the `app-assets` Supabase storage bucket under your organization's asset directory.
2. **Access Control**: Ensure the bucket or the uploaded file permissions are set to **Public** so the application can retrieve and render the assets.
3. **URL Copying**: Copy the generated public URL of the asset and paste it into the **Company Logo URL** or **Company Icon URL** field inside your Organization Settings.

---

## 6. Troubleshooting Custom Branding

If your company logo or custom colors are not displaying:
* **Plan Restriction Warning**: Verify that your organization is not on a basic or free plan tier. If `plan_allows_custom_branding` is false, white-label configurations will be bypassed.
* **SSL Insecurity**: Inspect your browser console for mixed content blocks. Ensure the URL is served securely via `https://`.
* **CORS Blockage**: If the logo is hosted on a third-party server (external to Supabase), ensure that server sends proper Cross-Origin Resource Sharing (CORS) headers allowing access from the Carer Vista Pro domain.
* **Cache Stale State**: PWAs heavily cache static assets. If changes do not show immediately, perform a hard reload or clear the PWA application storage in your browser settings.
* **High Contrast Mode Override**: To preserve mandatory accessibility standards, custom branding colors are automatically disabled when a user selects the **High contrast** personal theme.
