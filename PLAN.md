# Plank — Supabase Integration Plan

## Status
- [x] Frontend ported to Vite + React (ES modules)
- [x] Card cover image UI (file upload → base64, local only)
- [ ] Supabase backend integration

---

## Step 1 — Supabase Project Setup
1. Create project at supabase.com (Asia-Pacific region)
2. Settings → API → copy `Project URL` + `anon public key`
3. Create `.env` file in project root:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

---

## Step 2 — SQL Schema (run in Supabase SQL Editor)

Tables needed:
- `members` — users/team members
- `board_columns` — kanban columns (Backlog, Todo, etc.)
- `labels` — card labels
- `cards` — main card table
- `card_labels` — junction table (card ↔ label)
- `card_assignees` — junction table (card ↔ member)
- `subtasks` — per card
- `comments` — per card
- `activity` — activity feed

File to create: `supabase/migrations/001_init.sql`

Key decisions:
- Use `uuid` primary keys
- `cards.position` float for ordering within column (no re-index needed)
- `cards.cover_url` stores Supabase Storage URL (not base64)
- Enable RLS on all tables
- Realtime enabled on `cards`, `subtasks`, `comments`, `activity`

---

## Step 3 — Seed Data (run after migration)

File: `supabase/seed.sql`
- Insert 6 members (Pim, Tee, June, Max, Noi + placeholder for "you")
- Insert 5 columns
- Insert 7 labels
- Insert ~16 seed cards with subtasks/comments

---

## Step 4 — Install Supabase Client

```bash
npm install @supabase/supabase-js
```

Create `src/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Step 5 — Port `src/store.jsx`

Replace localStorage logic with Supabase calls:

| Action | Before | After |
|--------|--------|-------|
| Load data | `localStorage.getItem` | `supabase.from('cards').select(...)` |
| Move card | local reducer | `supabase.from('cards').update({ column_id, position })` |
| Add card | local reducer | `supabase.from('cards').insert(...)` |
| Update card | local reducer | `supabase.from('cards').update(...).eq('id', id)` |
| Delete card | local reducer | `supabase.from('cards').delete().eq('id', id)` |
| Add comment | local reducer | `supabase.from('comments').insert(...)` |
| Activity | local reducer | `supabase.from('activity').insert(...)` |

Keep local React state as cache — sync from Supabase on mount.

---

## Step 6 — Realtime Subscriptions (in `src/store.jsx`)

```js
// Subscribe to all card changes
supabase
  .channel('cards')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, 
    (payload) => dispatch({ type: 'SYNC_CARD', payload })
  )
  .subscribe()
```

Subscribe to: `cards`, `subtasks`, `comments`, `activity`

This replaces the simulated bots in `src/realtime.jsx` with real updates from other users.

---

## Step 7 — Image Upload → Supabase Storage

Replace base64 cover with Storage URL:

```js
// Upload file to Supabase Storage
const { data } = await supabase.storage
  .from('card-covers')
  .upload(`${cardId}/${file.name}`, file, { upsert: true })

const url = supabase.storage.from('card-covers').getPublicUrl(data.path).data.publicUrl
updateCard(cardId, { cover_url: url })
```

Changes needed in `src/cardmodal.jsx`:
- `onCoverFile` → upload to Storage, get URL → `updateCard`
- Remove FileReader / base64 logic

---

## Step 8 — Auth (optional, later)

Supabase Auth to identify "you" (the logged-in user):
- Replace hardcoded `"u_you"` with actual user ID
- RLS policies: users can only edit their own cards

Can be skipped for now and added later without breaking existing code.

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/supabase.js` | NEW — Supabase client |
| `src/store.jsx` | Replace localStorage → Supabase queries + Realtime |
| `src/realtime.jsx` | Remove bot simulation, keep cursor/presence (or remove entirely) |
| `src/cardmodal.jsx` | Cover upload → Supabase Storage |
| `supabase/migrations/001_init.sql` | NEW — full schema |
| `supabase/seed.sql` | NEW — seed data |
| `.env` | NEW — credentials (never commit) |
| `.gitignore` | Add `.env` |

---

## Order to Execute

1. Finish creating Supabase project → get URL + anon key
2. Write + run `001_init.sql` in SQL Editor
3. Run `seed.sql`
4. `npm install @supabase/supabase-js`
5. Create `.env` + `src/supabase.js`
6. Port `store.jsx`
7. Port `cardmodal.jsx` cover upload
8. Test realtime with 2 browser tabs
