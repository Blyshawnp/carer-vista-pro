begin;

alter table public.invitations
  alter column email drop not null;

commit;
