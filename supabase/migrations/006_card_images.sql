-- ============================================================
-- Plank — Card image attachments (multiple images per card)
-- Run this in Supabase SQL Editor
-- ============================================================

alter table public.cards
  add column if not exists images jsonb not null default '[]'::jsonb;
