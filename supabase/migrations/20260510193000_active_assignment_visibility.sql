begin;

drop policy if exists "assigned users view client assignments" on public.client_user_assignments;
create policy "assigned users view client assignments"
on public.client_user_assignments
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or (
      user_id = auth.uid()
      and is_active = true
    )
  )
);

notify pgrst, 'reload schema';

commit;
