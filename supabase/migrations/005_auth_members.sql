-- ============================================================
-- Plank — Real auth users + project members
-- Run this in Supabase SQL Editor
-- ============================================================

-- Link members to Supabase Auth users
alter table public.members
  add column if not exists auth_id uuid unique;

-- Project membership table
create table public.project_members (
  project_id  uuid  not null references public.projects(id) on delete cascade,
  member_id   text  not null references public.members(id) on delete cascade,
  role        text  not null default 'member'
                    check (role in ('owner', 'admin', 'member', 'viewer')),
  invited_by  text  references public.members(id),
  joined_at   timestamptz not null default now(),
  primary key (project_id, member_id)
);

alter  table public.project_members enable row level security;
create policy "allow all" on public.project_members for all using (true) with check (true);
grant  select, insert, update, delete on public.project_members to anon, authenticated;
