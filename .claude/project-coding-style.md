# Plank — Project Coding Style

## Philosophy

- **One concern per file** — component, hook, helper, decorator แยกกัน
- **One file per responsibility** — ไม่ยัดทุกอย่างไว้ที่เดียว
- **Organize by type** — `components/`, `hooks/`, `helpers/`, `decorators/`, `providers/`, `lib/`
- **No TypeScript** — plain JSX, ใช้ JSDoc เมื่อจำเป็น

---

## File Naming

| ประเภท | รูปแบบ | ตัวอย่าง |
|--------|--------|---------|
| Component | `PascalCase.jsx` | `CardModal.jsx`, `Sidebar.jsx` |
| Hook | `useCamelCase.js` | `useFilteredCards.js`, `useAuth.js` |
| Helper/Util | `camelCase.js` | `time.js`, `validate.js` |
| Decorator | `camelCase.js` | `card.js`, `user.js` |
| Provider | `PascalCaseProvider.jsx` | `PlankProvider.jsx` |
| Index re-export | `index.js` / `index.jsx` | `components/Global/index.jsx` |

---

## Folder Structure Pattern

```
src/
├── components/
│   ├── Global/       ← shared primitives ใช้ได้ทั่วทั้ง app
│   ├── Layout/       ← chrome, shell, navigation
│   ├── Board/        ← feature-specific components
│   ├── Views/        ← page-level views
│   └── Modals/       ← dialogs, overlays, palettes
├── config/           ← static data, constants, app config
├── decorators/       ← transform API response → component shape
├── helpers/          ← pure utility functions (no React)
├── hooks/            ← custom React hooks
├── lib/              ← third-party client instances (supabase, axios)
├── providers/        ← Context providers + business logic
└── tweaks/           ← isolated feature module
```

---

## Component Style

### ✅ Good — focused, single responsibility

```jsx
// components/Global/Avatar.jsx
export function Avatar({ member, size = 26, ring = false, idle = false }) {
  if (!member) return null;
  return (
    <div style={{ width: size, height: size, ... }}>
      {member.initials}
    </div>
  );
}
```

### ❌ Avoid — everything in one giant file

```jsx
// ❌ components/UI.jsx  ← ยัด Avatar, Icon, Button, Modal ไว้ที่เดียว
```

---

## Imports

### ลำดับ imports (บนลงล่าง)

```js
// 1. React / external libraries
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// 2. Providers / Context
import { usePlank } from '../../providers/PlankProvider';
import { usePresence } from '../../providers/PresenceProvider';

// 3. Components
import { Icon, Avatar, Popover } from '../Global';

// 4. Hooks
import { useFilteredCards } from '../../hooks/useFilteredCards';

// 5. Helpers / Utils
import { relTime, dueInfo } from '../../helpers';

// 6. Config / Data
import { BOTS } from '../../config/data';
```

### Path rules

- ใช้ relative path เสมอ (`../../providers/...`)
- ไม่ใช้ absolute path หรือ alias ถ้าไม่ได้ตั้งค่าไว้
- `Global` components import จาก `'../Global'` (ผ่าน index)

---

## Decorators Pattern

แยก "API/DB data shape" ออกจาก "component data shape":

```js
// decorators/card.js
export function transformCard(raw) {
  return {
    id: raw.id,
    desc: raw.description,      // rename
    columnId: raw.column_id,    // camelCase
    labels: raw.card_labels.map(l => l.label_id),  // flatten junction
    // ...
  };
}
```

**Rule:** Component ไม่ควรรู้จัก DB column names — ให้ decorator จัดการ

---

## Helpers Pattern

Pure functions เท่านั้น — ไม่มี side effects, ไม่ import React:

```js
// helpers/index.js
export function relTime(iso) { ... }    // string → string
export function dueInfo(iso) { ... }    // string → { tone, text, days }
export function fuzzy(needle, hay) { ... } // string, string → number
```

---

## Hooks Pattern

```js
// hooks/useFilteredCards.js
import { useMemo } from 'react';
import { usePlank } from '../providers/PlankProvider';

export function useFilteredCards(filterFn) {
  const { state, COLUMNS } = usePlank();
  return useMemo(() => {
    // ...derived state logic
  }, [state.cardsByCol, state.byId, filterFn]);
}
```

**Rule:**
- ชื่อขึ้นต้นด้วย `use`
- return ค่าที่ใช้งานได้ทันที
- ไม่ควร call hooks อื่นซ้อนกันลึกเกิน 2 ชั้น

---

## Provider Pattern

Provider = Context + Business Logic + Side Effects

```jsx
// providers/PlankProvider.jsx
export function PlankProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, emptyState);

  // Side effect: load initial data
  useEffect(() => { fetchAllCards().then(...) }, []);

  // Side effect: realtime subscription
  useEffect(() => {
    const channel = supabase.channel(...).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Actions (exposed via context)
  const moveCard = useCallback(async (...) => { ... }, [...]);

  return <PlankCtx.Provider value={value}>{children}</PlankCtx.Provider>;
}

export function usePlank() {
  return useContext(PlankCtx);
}
```

**Rule:**
- Export ทั้ง `Provider` component และ `useXxx` hook จากไฟล์เดียวกัน
- Actions เป็น `useCallback` เสมอ
- State mutation → dispatch → reducer (immutable)

---

## State Management Rules

```js
// ✅ Immutable update
return { ...state, byId: { ...state.byId, [cardId]: { ...card, ...patch } } };

// ❌ Mutation
state.byId[cardId] = { ...card, ...patch };
```

- ใช้ `useReducer` สำหรับ complex state
- ใช้ `useState` สำหรับ local UI state (open/close, input value)
- ใช้ `useRef` สำหรับ mutable values ที่ไม่ต้องการ re-render (drag state, cursor positions)

---

## Async Actions Pattern

Optimistic update → async DB write → realtime sync:

```js
const moveCard = useCallback(async (cardId, toCol, toIndex) => {
  // 1. Optimistic local update (instant UI)
  dispatch({ type: 'MOVE_CARD', cardId, toCol, toIndex });

  // 2. Async DB write
  await supabase.from('cards').update({ column_id: toCol }).eq('id', cardId);

  // 3. Realtime subscription will sync other clients automatically
}, [...]);
```

---

## Styling Rules

- **ไม่ใช้ CSS class names** สำหรับ component styling — ใช้ inline `style` prop
- **ใช้ CSS custom properties** เสมอ — ไม่ hardcode สี, spacing, radius
- **CSS classes** ใช้สำหรับ utility/animation ที่ต้องการ pseudo-selector เท่านั้น

```jsx
// ✅ Use CSS variables
style={{ color: "var(--text-muted)", background: "var(--surface)", borderRadius: "var(--r-md)" }}

// ❌ Hardcode values
style={{ color: "#666", background: "#fff", borderRadius: "9px" }}
```

---

## Naming Conventions

| สิ่งที่ | Convention | ตัวอย่าง |
|--------|-----------|---------|
| Component | PascalCase | `CardModal`, `ActivityFeed` |
| Hook | `useCamelCase` | `usePlank`, `useFilteredCards` |
| Helper function | `camelCase` | `relTime`, `dueInfo`, `fuzzy` |
| Constant/config | `UPPER_SNAKE_CASE` | `PRIORITY`, `ICONS`, `BOTS` |
| CSS variable | `--kebab-case` | `--accent`, `--text-muted` |
| Event handler | `onEventName` | `onClose`, `onCardPointerDown` |
| Boolean prop | `is/has/show` | `isOpen`, `hasFilter`, `showCursors` |

---

## Do / Don't Summary

| ✅ Do | ❌ Don't |
|-------|---------|
| แยกไฟล์ตาม responsibility | ยัดทุกอย่างในไฟล์เดียว |
| ใช้ CSS variables | hardcode colors/spacing |
| Immutable state update | mutate state โดยตรง |
| Optimistic UI update | รอ DB ก่อนอัพเดท UI |
| Export named function | export default ทุกไฟล์ (ยกเว้น app.jsx, main.jsx) |
| `useCallback` สำหรับ actions | สร้าง function ใหม่ทุก render |
| `stateRef` สำหรับ async closures | อ่าน stale state จาก closure |
