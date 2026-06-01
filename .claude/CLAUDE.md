# Plank — Project Memory

## What is this?

Real-time collaborative Kanban board (like Linear/Jira) built with React + Vite + Supabase.
- Frontend: React 18, Vite 5, no UI library — pure custom CSS with CSS custom properties
- Backend: Supabase (PostgreSQL + Realtime + Storage)
- No TypeScript — plain JSX

## Quick Start

```bash
npm run dev      # dev server
npm run build    # production build
```

Requires `.env` file:
```
VITE_SUPABASE_URL=https://rhexumaeqqioeqykhjrg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

## Project Structure

```
src/
├── app.jsx                          # Root app + Workspace component
├── main.jsx                         # Entry point (createRoot)
├── styles.css                       # All CSS (design tokens, animations, layout)
├── tweaks-panel.jsx                 # TweaksPanel + useTweaks (floating settings panel)
│
├── components/
│   ├── Global/index.jsx             # Shared primitives: Icon, Avatar, AvatarStack,
│   │                                #   LabelChip, PriorityFlag, DueBadge, IconButton,
│   │                                #   Popover, PickerItem, PRIORITY, ICONS
│   ├── Layout/
│   │   ├── Sidebar.jsx              # Left sidebar (nav, boards list, presence)
│   │   ├── Topbar.jsx               # Top header (view switcher, filters, search)
│   │   └── ActivityFeed.jsx         # Right panel (live activity log)
│   ├── Board/
│   │   ├── Board.jsx                # Kanban board + drag-and-drop logic
│   │   └── Card.jsx                 # Single card (TypingDots, SubtaskProgress)
│   ├── Views/
│   │   ├── ListView.jsx             # List view with grouping
│   │   ├── CalendarView.jsx         # Monthly calendar with DnD reschedule
│   │   └── TimelineView.jsx         # Gantt-style timeline
│   └── Modals/
│       ├── CardModal.jsx            # Full card detail modal (edit, comments, AI)
│       ├── CommandPalette.jsx       # ⌘K command palette with fuzzy search
│       └── LiveCursors.jsx          # Simulated real-time bot cursors overlay
│
├── config/
│   └── data.js                      # Static seed data: MEMBERS, BOTS, LABELS,
│                                    #   COLUMNS, SEED_CARDS, SEED_ACTIVITY, daysFromNow
│
├── decorators/
│   └── card.js                      # transformCard(raw) — maps Supabase row → component shape
│
├── helpers/
│   └── index.js                     # relTime(iso), dueInfo(iso), fuzzy(needle, hay)
│
├── hooks/
│   └── useFilteredCards.js          # useFilteredCards(filterFn) — filtered cards from store
│
├── lib/
│   └── supabase.js                  # createClient(url, key) — single Supabase instance
│
├── providers/
│   ├── PlankProvider.jsx            # Main state: Supabase sync, Realtime subscriptions,
│   │                                #   all card actions (moveCard, addCard, updateCard…)
│   │                                #   exports: PlankProvider, usePlank, nextId
│   │                                #   exports: fetchAllCards, fetchCard, fetchActivity
│   └── PresenceProvider.jsx         # Simulated presence: bot cursors, typing indicators,
│                                    #   bot card actions (move/comment/subtask)
│                                    #   exports: PresenceProvider, usePresence
│
└── tweaks/
    └── index.jsx                    # Re-exports from tweaks-panel.jsx
```

## Database Schema (Supabase)

Tables in `public` schema:
- `members` — id (text PK), name, handle, color, initials, is_you
- `board_columns` — id (text PK), name, accent, wip_limit, position
- `labels` — id (text PK), name, color
- `cards` — id (uuid PK), key, title, description, column_id, points, due, priority, cover_url, created_by, position (float8), created_at, updated_at
- `card_labels` — (card_id, label_id) composite PK
- `card_assignees` — (card_id, member_id) composite PK
- `subtasks` — id (uuid PK), card_id, text, done, position
- `comments` — id (uuid PK), card_id, author_id, text, created_at
- `activity` — id (uuid PK), who, verb, target, detail, created_at

Realtime enabled on: `cards`, `card_labels`, `card_assignees`, `subtasks`, `comments`, `activity`

SQL files:
- `supabase/migrations/001_init.sql` — full schema + RLS + Realtime
- `supabase/seed.sql` — seed members, columns, labels, cards, assignees, labels, subtasks, comments, activity

## Card Data Shape (component-side)

```js
{
  id: string,          // UUID from DB
  key: string,         // "PLK-128"
  title: string,
  desc: string,        // maps to DB "description"
  columnId: string,    // maps to DB "column_id"
  labels: string[],    // array of label IDs
  assignees: string[], // array of member IDs
  points: number | null,
  due: string | null,  // ISO string
  priority: "low" | "med" | "high" | "urgent",
  cover: string | null, // maps to DB "cover_url" (base64 or Storage URL)
  createdBy: string,
  position: number,
  subtasks: [{ id, text, done }],
  comments: [{ id, author, text, at }],  // "author" maps to DB "author_id"
}
```

## Key Conventions

### Imports — use absolute-from-src paths
```js
import { usePlank }   from '../../providers/PlankProvider';
import { usePresence } from '../../providers/PresenceProvider';
import { Icon, Avatar } from '../Global';
import { dueInfo, relTime } from '../../helpers';
import { BOTS } from '../../config/data';
```

### Static IDs
- Member IDs: `u_you`, `u_pim`, `u_tee`, `u_june`, `u_max`, `u_noi`
- Column IDs: `c_backlog`, `c_todo`, `c_progress`, `c_review`, `c_done`
- Label IDs: `l_feat`, `l_bug`, `l_chore`, `l_design`, `l_infra`, `l_perf`, `l_docs`
- "Current user" is always `u_you`

### usePlank() returns
```js
{
  state: { byId, cardsByCol, activity, syncing, ghosted },
  loading: boolean,
  MEMBERS, LABELS, COLUMNS,
  memberById, labelById, colById,
  moveCard(cardId, toCol, toIndex, by?)    // async, writes to Supabase
  addCard(toCol, title, by?, atTop?)       // async, returns card
  updateCard(cardId, patch)               // async, patch uses component field names
  deleteCard(cardId)                      // async
  addComment(cardId, text, by?)           // async
  toggleSubtask(cardId, subtaskId)        // async
  setSubtasks(cardId, subtasks[])         // async, replaces all
  logActivity(who, verb, target, detail)  // async
  reset()                                 // reloads from Supabase
  nextId(prefix)                          // generates temp string ID
}
```

### usePresence() returns
```js
{
  onlineMembers: Member[],  // u_you + all BOTS
  idle: Set<memberId>,      // members currently "away"
  typing: { [cardId]: memberId[] },
  flash: { [cardId]: number },
  cursorsRef: React.Ref,    // { [botId]: { x, y, tx, ty, name, color, active } }
  memberById,
  flashCard(cardId),
}
```

## Styling System

All colors are CSS custom properties defined in `src/styles.css`:
- `--bg`, `--bg-sunken`, `--surface`, `--surface-2`, `--surface-hover`
- `--border`, `--border-strong`
- `--text`, `--text-muted`, `--text-faint`, `--text-on-accent`
- `--accent`, `--accent-hover`, `--accent-soft`, `--accent-soft-border`, `--accent-text`
- `--c-red`, `--c-orange`, `--c-amber`, `--c-green`, `--c-teal`, `--c-blue`, `--c-purple`, `--c-pink`, `--c-gray`
- `--r-sm`, `--r-md`, `--r-lg`, `--r-xl` (border radii)
- `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-drag`
- `--gap`, `--card-pad`, `--col-w`, `--topbar-h`, `--sidebar-w`

Dark mode: `data-theme="dark"` on `<html>`
Dense mode: `data-density="dense"` on `<html>`
Accent color: overridden via JS `root.style.setProperty(...)` in `applyTheme()`

## Language Rule

**All user-facing text must be in English.** No Thai strings in JSX, error messages, placeholders, labels, or comments. This project is English-only.

## What's NOT done yet

- [ ] Supabase Auth (users are hardcoded, "you" = `u_you`)
- [ ] Image upload to Supabase Storage (currently saves base64 to DB cover_url)
- [ ] Supabase Storage bucket `card-covers` setup
- [ ] RLS policies tied to real auth
- [ ] Bot simulation should be replaced with real WebSocket presence when Auth is added
