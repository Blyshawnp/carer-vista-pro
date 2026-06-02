# Paywall & Feature Gating Implementation Plan

This document outlines the architectural plan for placing premium, enterprise, and agency-level features behind subscription paywalls using Google Play and Apple App Store in-app purchase and subscription networks.

---

## 1. Feature Gating Model

The application features are classified into specific accessibility tiers. The gating system will restrict or unlock these modules based on the organization's active entitlement:

### Tier 1: Free / Basic Features
* Standard scheduling and shift lists.
* Caregiver check-in/checkout coordinates and basic geofence tracking.
* Standard per-shift checklists.
* 1-on-1 direct messaging.

### Tier 2: Premium Organization / Agency Features
* **Custom Branding & White-Labeling**: Custom company logos, colors, and organization names.
* **Advanced Invoicing**: Formatted invoice printing, custom client-facing billing rates, and adjustment panels.
* **Year-End Summaries**: Generation, archiving, correction requests, and mobile-friendly print tools for EOY summaries.
* **Document Workflows**: Uploading, categorizing, and managing medical/contract files with print approvals and read acknowledgment receipts.
* **Holiday Pay & Complex Pay Rules**: Automated payroll overrides, holiday multipliers, and advanced bonus allocations.
* **Agency Mode Tools**: Shift cancellation request pipelines, custom cancellation fee policies, automated break check enforcement, and multi-caregiver bulk scheduling actions.

---

## 2. Recommended Database Schema Design

To ensure secure billing and entitlement enforcement, the database layer must track purchases, products, and subscription histories. The following SQL structure is recommended:

```sql
-- 1. Subscription Plans Table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text NOT NULL UNIQUE, -- 'basic', 'premium', 'agency'
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Entitlements Map Table
CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL REFERENCES public.plans(key) ON DELETE CASCADE,
  feature_key text NOT NULL, -- 'custom_branding', 'year_end_summaries', 'holiday_pay'
  is_enabled boolean NOT NULL DEFAULT true,
  UNIQUE(plan_key, feature_key)
);

-- 3. Organization Subscriptions Table
CREATE TABLE public.organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_key text NOT NULL REFERENCES public.plans(key),
  status text NOT NULL, -- 'active', 'trialing', 'grace_period', 'expired', 'canceled'
  billing_provider text NOT NULL, -- 'google_play', 'apple_app_store', 'stripe_or_web', 'manual'
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Store Receipt / Purchase Records Table
CREATE TABLE public.app_store_purchase_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchaser_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  product_id text NOT NULL, -- App Store or Play Console Product ID
  transaction_id text NOT NULL UNIQUE, -- Store unique Transaction ID
  original_transaction_id text NULL,
  purchase_token text NULL, -- Required for Google Play server verification
  receipt_payload text NULL, -- Raw receipt payload (secure backup)
  billing_provider text NOT NULL, -- 'google_play', 'apple_app_store'
  status text NOT NULL, -- 'valid', 'refunded', 'revoked'
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 3. Entitlement Verification Architecture

Security controls must be applied at both the frontend and backend levels. Never trust the client alone to enforce access limits:

### A. Backend Enforcement (Secure Layer)
* **REST APIs & Server Actions**: Every action (e.g. creating custom brand settings, generating a year-end summary, approving print logs) must check the caller organization's subscription status before executing the write.
* **RLS Policies**: Row Level Security (RLS) rules can check if the organization has the proper plan key before allowing select, insert, or update operations:
  ```sql
  CREATE POLICY "Premium features access check"
  ON public.shift_removal_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_subscriptions s
      WHERE s.organization_id = current_org_id()
      AND s.plan_key IN ('premium', 'agency')
      AND s.status IN ('active', 'trialing', 'grace_period')
    )
  );
  ```

### B. Frontend Enforcement (Presentation Layer)
* **UI Lock Indicators**: Locked features must be greyed out or shown with lock icons rather than being hidden completely. This increases visibility and encourages upgrades.
* **Upgrade Modals**: Clicking on a locked feature should trigger an upgrade modal highlighting the benefits of the premium tier.
* **No Storage Reliance**: Never store subscription status in insecure local storage or browser cookies as the source of truth for paid access. Always evaluate the profile data on mount.
