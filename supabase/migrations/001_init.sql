-- ============================================================
-- Plank — initial schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── members ──────────────────────────────────────────────────
create table public.members (
  id          text primary key,          -- e.g. "u_you", "u_pim"
  name        text        not null,
  handle      text        not null unique,
  color       text        not null,      -- CSS var or oklch value
  initials    text        not null,
  is_you      boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- ── board_columns ─────────────────────────────────────────────
create table public.board_columns (
  id          text primary key,          -- e.g. "c_todo"
  name        text        not null,
  accent      text        not null,      -- CSS var color
  wip_limit   integer,                   -- null = no limit
  position    integer     not null       -- display order
);

-- ── labels ───────────────────────────────────────────────────
create table public.labels (
  id          text primary key,          -- e.g. "l_feat"
  name        text        not null,
  color       text        not null
);

-- ── cards ────────────────────────────────────────────────────
create table public.cards (
  id          uuid        primary key default gen_random_uuid(),
  key         text        not null unique,  -- e.g. "PLK-128"
  title       text        not null,
  description text        not null default '',
  column_id   text        not null references public.board_columns(id) on delete restrict,
  points      integer,
  due         timestamptz,
  priority    text        not null default 'med'
                          check (priority in ('low', 'med', 'high', 'urgent')),
  cover_url   text,                      -- Supabase Storage public URL
  images      jsonb       not null default '[]',
  created_by  text        not null references public.members(id),
  position    float8      not null default 0,  -- ordering within column
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ── card_labels ───────────────────────────────────────────────
create table public.card_labels (
  card_id     uuid  not null references public.cards(id) on delete cascade,
  label_id    text  not null references public.labels(id) on delete cascade,
  primary key (card_id, label_id)
);

-- ── card_assignees ────────────────────────────────────────────
create table public.card_assignees (
  card_id     uuid  not null references public.cards(id) on delete cascade,
  member_id   text  not null references public.members(id) on delete cascade,
  primary key (card_id, member_id)
);

-- ── subtasks ──────────────────────────────────────────────────
create table public.subtasks (
  id          uuid        primary key default gen_random_uuid(),
  card_id     uuid        not null references public.cards(id) on delete cascade,
  text        text        not null,
  done        boolean     not null default false,
  position    integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- ── comments ──────────────────────────────────────────────────
create table public.comments (
  id          uuid        primary key default gen_random_uuid(),
  card_id     uuid        not null references public.cards(id) on delete cascade,
  author_id   text        not null references public.members(id),
  text        text        not null,
  created_at  timestamptz not null default now()
);

-- ── activity ──────────────────────────────────────────────────
create table public.activity (
  id          uuid        primary key default gen_random_uuid(),
  who         text        not null references public.members(id),
  verb        text        not null,   -- "moved", "created", "commented on"
  target      text        not null,   -- card key e.g. "PLK-128"
  detail      text        not null default '',
  created_at  timestamptz not null default now()
);

-- ── indexes ───────────────────────────────────────────────────
create index idx_cards_column   on public.cards(column_id, position);
create index idx_subtasks_card  on public.subtasks(card_id, position);
create index idx_comments_card  on public.comments(card_id, created_at desc);
create index idx_activity_time  on public.activity(created_at desc);

-- ── Row Level Security ────────────────────────────────────────
-- Enable RLS on all tables
alter table public.members         enable row level security;
alter table public.board_columns   enable row level security;
alter table public.labels          enable row level security;
alter table public.cards           enable row level security;
alter table public.card_labels     enable row level security;
alter table public.card_assignees  enable row level security;
alter table public.subtasks        enable row level security;
alter table public.comments        enable row level security;
alter table public.activity        enable row level security;

-- Grant table-level access to anon role (required for Supabase REST API)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Open policies for now (no auth yet) — tighten when Auth is added
create policy "allow all" on public.members         for all using (true) with check (true);
create policy "allow all" on public.board_columns   for all using (true) with check (true);
create policy "allow all" on public.labels          for all using (true) with check (true);
create policy "allow all" on public.cards           for all using (true) with check (true);
create policy "allow all" on public.card_labels     for all using (true) with check (true);
create policy "allow all" on public.card_assignees  for all using (true) with check (true);
create policy "allow all" on public.subtasks        for all using (true) with check (true);
create policy "allow all" on public.comments        for all using (true) with check (true);
create policy "allow all" on public.activity        for all using (true) with check (true);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable realtime for live collaboration
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.card_labels;
alter publication supabase_realtime add table public.card_assignees;
alter publication supabase_realtime add table public.subtasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.activity;
