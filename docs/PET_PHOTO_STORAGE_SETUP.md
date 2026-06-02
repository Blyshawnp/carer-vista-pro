# Pet Photo Storage Setup

Pet photos use the private Supabase Storage bucket `pet-photos`.

## Bucket

- Name: `pet-photos`
- Public: `false`
- Max file size: 10 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Object path format: `<organization_id>/<client_id>/<uuid>.<ext>`

## Policies

Apply migration `20260602090000_pet_photo_storage.sql`.

The policies allow:

- Admin/client users to upload, update, and delete pet photos for clients in their organization.
- Admin/client users to view organization pet photos.
- Assigned caregivers, family users, and client-linked users to view pet photos for clients they are actively assigned to.

The app stores the storage object path in `client_pets.photo_url` for new uploads and creates signed URLs at render time. Existing URL values are preserved.

## Verify

1. In Supabase Dashboard, open Storage and confirm `pet-photos` exists and is private.
2. Confirm the four storage policies exist on `storage.objects`.
3. Upload a pet photo as an admin/client user.
4. Confirm the object appears under `<organization_id>/<client_id>/`.
5. Confirm `client_pets.photo_url` stores the object path, not a signed URL.
6. Open the client profile and shift home-access view as a permitted user and confirm the photo renders.

## Troubleshooting

- Upload fails: confirm the user is `admin` or `client`, the client belongs to the same organization, and the file is an allowed image under 10 MB.
- Image does not render: confirm the object path in `client_pets.photo_url` matches the storage object path and that the viewer has row access to the pet.
- Caregiver/family cannot view: confirm the user has an active `client_user_assignments` row for that client and the pet is visible under app rules.
