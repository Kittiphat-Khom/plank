-- ============================================================
-- Plank — Projects table
-- ============================================================

create table public.projects (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text        not null default '',
  key         text        not null check (length(key) between 2 and 6),
  color       text        not null default 'var(--accent)',
  owner_id    text        not null references public.members(id),
  created_at  timestamptz not null default now()
);

-- RLS
alter  table public.projects enable row level security;
create policy "allow all" on public.projects for all using (true) with check (true);
grant  select, insert, update, delete on public.projects to anon, authenticated;
