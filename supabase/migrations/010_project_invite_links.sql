-- ============================================================
-- Plank — Project invite links
-- ============================================================

create table public.project_invite_links (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  token       uuid        not null unique default gen_random_uuid(),
  role        text        not null default 'member'
                          check (role in ('owner', 'admin', 'member', 'viewer')),
  created_by  text        references public.members(id),
  created_at  timestamptz not null default now()
);

alter  table public.project_invite_links enable row level security;
create policy "allow all" on public.project_invite_links for all using (true) with check (true);
grant  select, insert, update, delete on public.project_invite_links to anon, authenticated;
