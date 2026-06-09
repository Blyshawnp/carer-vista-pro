-- ==============================================================================
-- PREVIEW / REPAIR SCRIPT FOR PUBLIC APP INVITES & MEMBERSHIPS
-- ==============================================================================
-- This script helps identify and fix users who accepted an invitation but got
-- stuck in a setup loop, resulting in missing profiles, organization memberships,
-- or client assignments.
--
-- This script is READ-ONLY for previewing first. 
-- To apply fixes, uncomment the INSERT/UPDATE transactions at the bottom.
-- ==============================================================================

-- 1. PREVIEW: Find accepted invitations that lack organization memberships
SELECT 
    i.id AS invitation_id,
    i.email AS invited_email,
    i.role AS invited_role,
    i.organization_id AS target_org_id,
    i.client_ids AS target_client_ids,
    u.id AS auth_user_id,
    p.id AS profile_id,
    m.id AS membership_id
FROM public.invitations i
-- Join auth users by email
JOIN auth.users u ON LOWER(u.email) = LOWER(i.email)
-- Left join profiles
LEFT JOIN public.profiles p ON p.id = u.id
-- Left join memberships
LEFT JOIN public.organization_memberships m ON m.user_id = u.id AND m.organization_id = i.organization_id
WHERE i.status = 'accepted'
  AND (p.id IS NULL OR m.id IS NULL);


-- 2. PREVIEW: Find accepted client/caregiver invitations that lack client assignments
SELECT 
    i.id AS invitation_id,
    i.email AS invited_email,
    i.role AS invited_role,
    u.id AS auth_user_id,
    i.client_ids AS target_client_ids,
    (
        SELECT COUNT(*) 
        FROM public.client_user_assignments cua 
        WHERE cua.user_id = u.id
    ) AS existing_assignments_count
FROM public.invitations i
JOIN auth.users u ON LOWER(u.email) = LOWER(i.email)
WHERE i.status = 'accepted'
  AND i.client_ids IS NOT NULL 
  AND cardinality(i.client_ids) > 0
  AND NOT EXISTS (
      SELECT 1 
      FROM public.client_user_assignments cua 
      WHERE cua.user_id = u.id
  );


-- ==============================================================================
-- REPAIR TRANSACTION (EXECUTE ONLY AFTER VERIFYING PREVIEW RESULTS)
-- ==============================================================================
/*
BEGIN;

-- A. Create missing profiles for accepted invitees
INSERT INTO public.profiles (id, full_name, role, organization_id, email)
SELECT 
    u.id, 
    COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)), 
    i.role, 
    i.organization_id, 
    u.email
FROM public.invitations i
JOIN auth.users u ON LOWER(u.email) = LOWER(i.email)
LEFT JOIN public.profiles p ON p.id = u.id
WHERE i.status = 'accepted'
  AND p.id IS NULL;

-- B. Create missing organization memberships for accepted invitees
INSERT INTO public.organization_memberships (organization_id, user_id, role)
SELECT 
    i.organization_id, 
    u.id, 
    i.role
FROM public.invitations i
JOIN auth.users u ON LOWER(u.email) = LOWER(i.email)
LEFT JOIN public.organization_memberships m ON m.user_id = u.id AND m.organization_id = i.organization_id
WHERE i.status = 'accepted'
  AND m.id IS NULL;

-- C. Create missing client assignments for accepted invitees
-- This iterates over client_ids array and inserts assignments if missing
INSERT INTO public.client_user_assignments (client_id, user_id, role)
SELECT 
    c.client_id,
    u.id,
    i.role
FROM public.invitations i
JOIN auth.users u ON LOWER(u.email) = LOWER(i.email)
-- Unnest the client_ids array to rows
CROSS JOIN LATERAL unnest(i.client_ids) AS c(client_id)
WHERE i.status = 'accepted'
  AND i.client_ids IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM public.client_user_assignments cua 
      WHERE cua.client_id = c.client_id AND cua.user_id = u.id
  );

COMMIT;
*/
