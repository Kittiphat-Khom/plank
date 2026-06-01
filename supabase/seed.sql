-- ============================================================
-- Plank — seed data
-- Run AFTER 001_init.sql
-- ============================================================

-- ── members ──────────────────────────────────────────────────
insert into public.members (id, name, handle, color, initials, is_you, role) values
  ('u_you',  'You',           'you',  'var(--accent)',   'YO', true,  'owner'),
  ('u_pim',  'Pim Sirilak',   'pim',  'var(--c-pink)',   'PS', false, 'admin'),
  ('u_tee',  'Tee Watcharin', 'tee',  'var(--c-teal)',   'TW', false, 'member'),
  ('u_june', 'June Aroon',    'june', 'var(--c-amber)',  'JA', false, 'member'),
  ('u_max',  'Max Devlin',    'max',  'var(--c-green)',  'MD', false, 'member'),
  ('u_noi',  'Noi Kanya',     'noi',  'var(--c-purple)', 'NK', false, 'viewer');

-- ── board_columns ─────────────────────────────────────────────
insert into public.board_columns (id, name, accent, wip_limit, position) values
  ('c_backlog',  'Backlog',     'var(--c-gray)',   null, 0),
  ('c_todo',     'To Do',       'var(--c-blue)',   null, 1),
  ('c_progress', 'In Progress', 'var(--c-amber)',  4,    2),
  ('c_review',   'In Review',   'var(--c-purple)', 3,    3),
  ('c_done',     'Done',        'var(--c-green)',  null, 4);

-- ── labels ───────────────────────────────────────────────────
insert into public.labels (id, name, color) values
  ('l_feat',   'Feature',     'var(--c-blue)'),
  ('l_bug',    'Bug',         'var(--c-red)'),
  ('l_chore',  'Chore',       'var(--c-gray)'),
  ('l_design', 'Design',      'var(--c-purple)'),
  ('l_infra',  'Infra',       'var(--c-teal)'),
  ('l_perf',   'Performance', 'var(--c-amber)'),
  ('l_docs',   'Docs',        'var(--c-green)');

-- ── cards (with positions spaced by 1000 for easy reordering) ─
insert into public.cards (id, key, title, description, column_id, points, due, priority, created_by, position) values
  -- Backlog
  ('00000000-0000-0000-0000-000000000001', 'PLK-142', 'Offline mode: queue mutations & sync on reconnect',
   'Persist optimistic mutations to IndexedDB and replay when the socket reconnects.',
   'c_backlog', 8, null, 'med', 'u_max', 1000),

  ('00000000-0000-0000-0000-000000000002', 'PLK-138', 'Dark theme audit for contrast (WCAG AA)',
   '', 'c_backlog', 3, now() + interval '9 days', 'low', 'u_pim', 2000),

  ('00000000-0000-0000-0000-000000000003', 'PLK-151', 'Migrate analytics events to v2 schema',
   '', 'c_backlog', 5, null, 'low', 'u_you', 3000),

  ('00000000-0000-0000-0000-000000000004', 'PLK-160', 'Spike: virtualized board for 1k+ cards',
   'Investigate windowing so scroll stays at 60fps with very large boards.',
   'c_backlog', 5, null, 'med', 'u_tee', 4000),

  -- To Do
  ('00000000-0000-0000-0000-000000000005', 'PLK-128', 'Card drag-and-drop: cross-column reordering',
   'Pointer-based DnD with placeholder + auto-scroll. Must hold 60fps with 200 cards.',
   'c_todo', 8, now() + interval '2 days', 'high', 'u_you', 1000),

  ('00000000-0000-0000-0000-000000000006', 'PLK-133', '@mention autocomplete in comments',
   '', 'c_todo', 3, now() + interval '4 days', 'med', 'u_june', 2000),

  ('00000000-0000-0000-0000-000000000007', 'PLK-145', 'Keyboard shortcuts overlay (press ?)',
   '', 'c_todo', 2, null, 'low', 'u_noi', 3000),

  ('00000000-0000-0000-0000-000000000008', 'PLK-147', 'Fix flicker when two users drag same card',
   '', 'c_todo', 3, now() + interval '1 day', 'high', 'u_max', 4000),

  -- In Progress
  ('00000000-0000-0000-0000-000000000009', 'PLK-119', 'WebSocket presence channel + live cursors',
   'Broadcast cursor position + selection at 30Hz, throttled. Show avatars of online members.',
   'c_progress', 8, now(), 'urgent', 'u_you', 1000),

  ('00000000-0000-0000-0000-000000000010', 'PLK-124', 'Optimistic move with server reconciliation',
   'Apply move locally, rollback gracefully if the server rejects.',
   'c_progress', 5, now() + interval '1 day', 'high', 'u_june', 2000),

  ('00000000-0000-0000-0000-000000000011', 'PLK-130', 'Command palette (⌘K) — fuzzy search & actions',
   '', 'c_progress', 5, now() + interval '3 days', 'med', 'u_noi', 3000),

  -- In Review
  ('00000000-0000-0000-0000-000000000012', 'PLK-108', 'Board filters: assignee, label, due date',
   '', 'c_review', 5, null, 'med', 'u_pim', 1000),

  ('00000000-0000-0000-0000-000000000013', 'PLK-115', 'Calendar view drag to reschedule',
   '', 'c_review', 5, now() + interval '2 days', 'med', 'u_max', 2000),

  -- Done
  ('00000000-0000-0000-0000-000000000014', 'PLK-095', 'Realtime activity feed',
   '', 'c_done', 3, null, 'med', 'u_you', 1000),

  ('00000000-0000-0000-0000-000000000015', 'PLK-101', 'Avatar component + presence dots',
   '', 'c_done', 2, null, 'low', 'u_pim', 2000),

  ('00000000-0000-0000-0000-000000000016', 'PLK-088', 'Set up Yjs CRDT document',
   '', 'c_done', 8, null, 'high', 'u_tee', 3000),

  ('00000000-0000-0000-0000-000000000017', 'PLK-091', 'Design tokens + theme switcher',
   '', 'c_done', 3, null, 'low', 'u_noi', 4000);

-- ── card_assignees ────────────────────────────────────────────
insert into public.card_assignees (card_id, member_id) values
  ('00000000-0000-0000-0000-000000000001', 'u_max'),
  ('00000000-0000-0000-0000-000000000002', 'u_pim'),
  ('00000000-0000-0000-0000-000000000004', 'u_tee'),
  ('00000000-0000-0000-0000-000000000005', 'u_you'),
  ('00000000-0000-0000-0000-000000000006', 'u_june'),
  ('00000000-0000-0000-0000-000000000007', 'u_noi'),
  ('00000000-0000-0000-0000-000000000008', 'u_max'),
  ('00000000-0000-0000-0000-000000000009', 'u_you'),
  ('00000000-0000-0000-0000-000000000009', 'u_tee'),
  ('00000000-0000-0000-0000-000000000010', 'u_june'),
  ('00000000-0000-0000-0000-000000000011', 'u_noi'),
  ('00000000-0000-0000-0000-000000000012', 'u_pim'),
  ('00000000-0000-0000-0000-000000000013', 'u_max'),
  ('00000000-0000-0000-0000-000000000014', 'u_you'),
  ('00000000-0000-0000-0000-000000000015', 'u_pim'),
  ('00000000-0000-0000-0000-000000000016', 'u_tee'),
  ('00000000-0000-0000-0000-000000000017', 'u_noi');

-- ── card_labels ───────────────────────────────────────────────
insert into public.card_labels (card_id, label_id) values
  ('00000000-0000-0000-0000-000000000001', 'l_feat'),
  ('00000000-0000-0000-0000-000000000001', 'l_infra'),
  ('00000000-0000-0000-0000-000000000002', 'l_design'),
  ('00000000-0000-0000-0000-000000000003', 'l_chore'),
  ('00000000-0000-0000-0000-000000000003', 'l_infra'),
  ('00000000-0000-0000-0000-000000000004', 'l_perf'),
  ('00000000-0000-0000-0000-000000000005', 'l_feat'),
  ('00000000-0000-0000-0000-000000000006', 'l_feat'),
  ('00000000-0000-0000-0000-000000000007', 'l_feat'),
  ('00000000-0000-0000-0000-000000000007', 'l_docs'),
  ('00000000-0000-0000-0000-000000000008', 'l_bug'),
  ('00000000-0000-0000-0000-000000000009', 'l_feat'),
  ('00000000-0000-0000-0000-000000000009', 'l_infra'),
  ('00000000-0000-0000-0000-000000000010', 'l_feat'),
  ('00000000-0000-0000-0000-000000000011', 'l_feat'),
  ('00000000-0000-0000-0000-000000000012', 'l_feat'),
  ('00000000-0000-0000-0000-000000000013', 'l_feat'),
  ('00000000-0000-0000-0000-000000000013', 'l_design'),
  ('00000000-0000-0000-0000-000000000014', 'l_feat'),
  ('00000000-0000-0000-0000-000000000015', 'l_design'),
  ('00000000-0000-0000-0000-000000000016', 'l_infra'),
  ('00000000-0000-0000-0000-000000000017', 'l_design'),
  ('00000000-0000-0000-0000-000000000017', 'l_chore');

-- ── subtasks ──────────────────────────────────────────────────
insert into public.subtasks (card_id, text, done, position) values
  ('00000000-0000-0000-0000-000000000001', 'Mutation queue schema',       false, 0),
  ('00000000-0000-0000-0000-000000000001', 'Reconnect handler',           false, 1),
  ('00000000-0000-0000-0000-000000000005', 'Pointer capture + ghost',     true,  0),
  ('00000000-0000-0000-0000-000000000005', 'Drop indicator',              false, 1),
  ('00000000-0000-0000-0000-000000000005', 'Auto-scroll edges',           false, 2),
  ('00000000-0000-0000-0000-000000000009', 'Presence join/leave',         true,  0),
  ('00000000-0000-0000-0000-000000000009', 'Cursor broadcast (throttled)',true,  1),
  ('00000000-0000-0000-0000-000000000009', 'Smooth interpolation',        false, 2),
  ('00000000-0000-0000-0000-000000000011', 'Fuzzy matcher',               true,  0),
  ('00000000-0000-0000-0000-000000000011', 'Action registry',             false, 1);

-- ── comments ─────────────────────────────────────────────────
insert into public.comments (card_id, author_id, text, created_at) values
  ('00000000-0000-0000-0000-000000000005', 'u_tee',
   'Let''s avoid layout thrash — transform only on the ghost.',
   now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000009', 'u_you',
   'Interpolating cursor positions over ~80ms feels buttery.',
   now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000009', 'u_pim',
   'Love it 🎉 the avatars stacking is so clean',
   now()),
  ('00000000-0000-0000-0000-000000000012', 'u_tee',
   'Approved — just rebase on main 🙏',
   now());

-- ── activity ──────────────────────────────────────────────────
insert into public.activity (who, verb, target, detail, created_at) values
  ('u_pim', 'moved',        'PLK-108', 'to In Review',  now()),
  ('u_tee', 'commented on', 'PLK-119', '',              now()),
  ('u_max', 'completed',    'PLK-101', '',              now());
