-- ============================================================
-- Plank — Link cards to projects
-- Run this in Supabase SQL Editor
-- ============================================================

alter table public.cards
  add column project_id uuid references public.projects(id) on delete cascade;

-- Index for fast per-project queries
create index cards_project_id_idx on public.cards(project_id);
