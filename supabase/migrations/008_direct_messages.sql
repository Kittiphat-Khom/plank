-- ============================================================
-- Plank — Direct messages (Inbox)
-- ============================================================

create table public.direct_messages (
  id         uuid        primary key default gen_random_uuid(),
  from_id    text        not null references public.members(id),
  to_id      text        not null references public.members(id),
  text       text        not null check (length(text) > 0),
  created_at timestamptz not null default now()
);

-- RLS
alter  table public.direct_messages enable row level security;
create policy "allow all" on public.direct_messages for all using (true) with check (true);
grant  select, insert, update, delete on public.direct_messages to anon, authenticated;

-- Realtime
alter publication supabase_realtime add table public.direct_messages;
