-- ============================================================
-- Plank — Add position column to projects for drag ordering
-- ============================================================

alter table public.projects add column if not exists position float8;

-- Backfill existing rows with order based on created_at
update public.projects
set position = sub.rn
from (
  select id, row_number() over (order by created_at) as rn
  from public.projects
) sub
where public.projects.id = sub.id;
