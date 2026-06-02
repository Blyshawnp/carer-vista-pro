begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-photos',
  'pet-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins and clients upload pet photos" on storage.objects;
create policy "admins and clients upload pet photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-photos'
  and exists (
    select 1
    from public.profiles p
    join public.clients c
      on c.organization_id = p.organization_id
     and c.id::text = (storage.foldername(name))[2]
    where p.id = auth.uid()
      and p.role in ('admin', 'client')
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "permitted users read pet photos" on storage.objects;
create policy "permitted users read pet photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-photos'
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

drop policy if exists "admins and clients update pet photos" on storage.objects;
create policy "admins and clients update pet photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pet-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'client')
      and p.organization_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'pet-photos'
  and exists (
    select 1
    from public.profiles p
    join public.clients c
      on c.organization_id = p.organization_id
     and c.id::text = (storage.foldername(name))[2]
    where p.id = auth.uid()
      and p.role in ('admin', 'client')
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "admins and clients delete pet photos" on storage.objects;
create policy "admins and clients delete pet photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'client')
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);

commit;
