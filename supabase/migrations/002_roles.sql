-- ============================================================
-- Plank — Role system
-- Run AFTER 001_init.sql
-- ============================================================

-- Add role column to members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
  CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

-- Set initial roles
UPDATE public.members SET role = 'owner'  WHERE id = 'u_you';
UPDATE public.members SET role = 'admin'  WHERE id = 'u_pim';
UPDATE public.members SET role = 'member' WHERE id IN ('u_tee', 'u_june', 'u_max', 'u_noi');
