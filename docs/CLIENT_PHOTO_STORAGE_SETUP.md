# Client Photo Storage Setup

Bucket: `client-photos`

Recommended visibility: private.

Database column: `public.clients.photo_url text`. The app stores the storage path, not a public URL.

Path format: `organization_id/client_id/random-file-name.ext`

Display behavior: server code creates signed URLs through `src/lib/client-photos.ts`. Do not use `getPublicUrl` for this bucket.

Upload roles:

- Organization/agency admins can upload/update client photos in their organization.
- Personal/family admins can upload/update when the organization mode allows them to manage clients.
- Agency client users do not get caregiver or client photo management unless admin policy grants it.

View roles:

- Organization admins can view clients in their organization.
- Assigned caregivers, family, and clients can view photos only when the assignment allows viewing that client.

Run `supabase/migrations/20260602100000_client_photo_storage.sql` to create the column, bucket config, and policies. No rows are deleted or reset.
