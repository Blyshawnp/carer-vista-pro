begin;

alter table public.clients
  add column if not exists photo_url text null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-photos',
  'client-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins upload client photos" on storage.objects;
create policy "admins upload client photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-photos'
  and exists (
    select 1
    from public.profiles p
    join public.clients c
      on c.organization_id = p.organization_id
     and c.id::text = (storage.foldername(name))[2]
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "permitted users read client photos" on storage.objects;
create policy "permitted users read client photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
      and (
        p.role in ('admin', 'client')
        or exists (
          select 1
          from public.client_user_assignments a
          where a.organization_id = p.organization_id
            and a.client_id::text = (storage.foldername(name))[2]
            and a.user_id = auth.uid()
            and a.is_active = true
        )
      )
  )
);

drop policy if exists "admins update client photos" on storage.objects;
create policy "admins update client photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'client-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.organization_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'client-photos'
  and exists (
    select 1
    from public.profiles p
    join public.clients c
      on c.organization_id = p.organization_id
     and c.id::text = (storage.foldername(name))[2]
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "admins delete client photos" on storage.objects;
create policy "admins delete client photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "admins upload team avatars" on storage.objects;
create policy "admins upload team avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.profiles actor
    join public.profiles target
      on target.organization_id = actor.organization_id
     and target.id::text = (storage.foldername(name))[1]
    where actor.id = auth.uid()
      and actor.role = 'admin'
  )
);

drop policy if exists "admins update team avatars" on storage.objects;
create policy "admins update team avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.profiles actor
    join public.profiles target
      on target.organization_id = actor.organization_id
     and target.id::text = (storage.foldername(name))[1]
    where actor.id = auth.uid()
      and actor.role = 'admin'
  )
)
with check (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.profiles actor
    join public.profiles target
      on target.organization_id = actor.organization_id
     and target.id::text = (storage.foldername(name))[1]
    where actor.id = auth.uid()
      and actor.role = 'admin'
  )
);

commit;
