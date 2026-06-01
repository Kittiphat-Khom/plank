export function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export const MEMBERS = [];

export const BOTS = [];

export const LABELS = [
  { id: "l_feat",   name: "Feature",     color: "var(--c-blue)" },
  { id: "l_bug",    name: "Bug",         color: "var(--c-red)" },
  { id: "l_chore",  name: "Chore",       color: "var(--c-gray)" },
  { id: "l_design", name: "Design",      color: "var(--c-purple)" },
  { id: "l_infra",  name: "Infra",       color: "var(--c-teal)" },
  { id: "l_perf",   name: "Performance", color: "var(--c-amber)" },
  { id: "l_docs",   name: "Docs",        color: "var(--c-green)" },
];

export const COLUMNS = [
  { id: "c_info",     name: "Info",        accent: "var(--c-teal)" },
  { id: "c_backlog",  name: "Backlog",     accent: "var(--c-gray)" },
  { id: "c_todo",     name: "To Do",       accent: "var(--c-blue)" },
  { id: "c_progress", name: "In Progress", accent: "var(--c-amber)",  wip: 4 },
  { id: "c_review",   name: "In Review",   accent: "var(--c-purple)", wip: 3 },
  { id: "c_done",     name: "Done",        accent: "var(--c-green)" },
];

let _id = 0;
const cid = () => `card_${(++_id).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function mkCard(o) {
  return {
    id: cid(),
    key: o.key,
    title: o.title,
    desc: o.desc || "",
    columnId: o.columnId,
    labels: o.labels || [],
    assignees: o.assignees || [],
    points: o.points ?? null,
    due: o.due ?? null,
    priority: o.priority || "med",
    subtasks: (o.subtasks || []).map((s, i) => ({ id: `st_${_id}_${i}`, text: s.text, done: s.done })),
    comments: (o.comments || []).map((c, i) => ({ id: `cm_${_id}_${i}`, ...c })),
    cover: o.cover || null,
    createdBy: o.createdBy || "u_you",
  };
}

export const SEED_CARDS = [
  mkCard({ key: "PLK-142", columnId: "c_backlog", title: "Offline mode: queue mutations & sync on reconnect",
    labels: ["l_feat", "l_infra"], assignees: ["u_max"], points: 8, priority: "med",
    desc: "Persist optimistic mutations to IndexedDB and replay when the socket reconnects.",
    subtasks: [{ text: "Mutation queue schema", done: false }, { text: "Reconnect handler", done: false }] }),
  mkCard({ key: "PLK-138", columnId: "c_backlog", title: "Dark theme audit for contrast (WCAG AA)",
    labels: ["l_design"], assignees: ["u_pim"], points: 3, priority: "low", due: daysFromNow(9) }),
  mkCard({ key: "PLK-151", columnId: "c_backlog", title: "Migrate analytics events to v2 schema",
    labels: ["l_chore", "l_infra"], assignees: [], points: 5, priority: "low" }),
  mkCard({ key: "PLK-160", columnId: "c_backlog", title: "Spike: virtualized board for 1k+ cards",
    labels: ["l_perf"], assignees: ["u_tee"], points: 5, priority: "med",
    desc: "Investigate windowing so scroll stays at 60fps with very large boards." }),

  mkCard({ key: "PLK-128", columnId: "c_todo", title: "Card drag-and-drop: cross-column reordering",
    labels: ["l_feat"], assignees: ["u_you"], points: 8, priority: "high", due: daysFromNow(2),
    desc: "Pointer-based DnD with placeholder + auto-scroll. Must hold 60fps with 200 cards.",
    subtasks: [{ text: "Pointer capture + ghost", done: true }, { text: "Drop indicator", done: false }, { text: "Auto-scroll edges", done: false }],
    comments: [{ author: "u_tee", text: "Let's avoid layout thrash — transform only on the ghost.", at: daysFromNow(-1) }] }),
  mkCard({ key: "PLK-133", columnId: "c_todo", title: "@mention autocomplete in comments",
    labels: ["l_feat"], assignees: ["u_june"], points: 3, priority: "med", due: daysFromNow(4) }),
  mkCard({ key: "PLK-145", columnId: "c_todo", title: "Keyboard shortcuts overlay (press ?)",
    labels: ["l_feat", "l_docs"], assignees: ["u_noi"], points: 2, priority: "low" }),
  mkCard({ key: "PLK-147", columnId: "c_todo", title: "Fix flicker when two users drag same card",
    labels: ["l_bug"], assignees: ["u_max"], points: 3, priority: "high", due: daysFromNow(1) }),

  mkCard({ key: "PLK-119", columnId: "c_progress", title: "WebSocket presence channel + live cursors",
    labels: ["l_feat", "l_infra"], assignees: ["u_you", "u_tee"], points: 8, priority: "urgent", due: daysFromNow(0),
    desc: "Broadcast cursor position + selection at 30Hz, throttled. Show avatars of online members.",
    subtasks: [{ text: "Presence join/leave", done: true }, { text: "Cursor broadcast (throttled)", done: true }, { text: "Smooth interpolation", done: false }],
    comments: [{ author: "u_you", text: "Interpolating cursor positions over ~80ms feels buttery.", at: daysFromNow(-1) },
               { author: "u_pim", text: "Love it 🎉 the avatars stacking is so clean", at: daysFromNow(0) }] }),
  mkCard({ key: "PLK-124", columnId: "c_progress", title: "Optimistic move with server reconciliation",
    labels: ["l_feat"], assignees: ["u_june"], points: 5, priority: "high", due: daysFromNow(1),
    desc: "Apply move locally, rollback gracefully if the server rejects." }),
  mkCard({ key: "PLK-130", columnId: "c_progress", title: "Command palette (⌘K) — fuzzy search & actions",
    labels: ["l_feat"], assignees: ["u_noi"], points: 5, priority: "med", due: daysFromNow(3),
    subtasks: [{ text: "Fuzzy matcher", done: true }, { text: "Action registry", done: false }] }),

  mkCard({ key: "PLK-108", columnId: "c_review", title: "Board filters: assignee, label, due date",
    labels: ["l_feat"], assignees: ["u_pim"], points: 5, priority: "med",
    comments: [{ author: "u_tee", text: "Approved — just rebase on main 🙏", at: daysFromNow(0) }] }),
  mkCard({ key: "PLK-115", columnId: "c_review", title: "Calendar view drag to reschedule",
    labels: ["l_feat", "l_design"], assignees: ["u_max"], points: 5, priority: "med", due: daysFromNow(2) }),

  mkCard({ key: "PLK-095", columnId: "c_done", title: "Realtime activity feed",
    labels: ["l_feat"], assignees: ["u_you"], points: 3, priority: "med" }),
  mkCard({ key: "PLK-101", columnId: "c_done", title: "Avatar component + presence dots",
    labels: ["l_design"], assignees: ["u_pim"], points: 2, priority: "low" }),
  mkCard({ key: "PLK-088", columnId: "c_done", title: "Set up Yjs CRDT document",
    labels: ["l_infra"], assignees: ["u_tee"], points: 8, priority: "high" }),
  mkCard({ key: "PLK-091", columnId: "c_done", title: "Design tokens + theme switcher",
    labels: ["l_design", "l_chore"], assignees: ["u_noi"], points: 3, priority: "low" }),
];

export const SEED_ACTIVITY = [
  { id: "a1", who: "u_pim", verb: "moved", target: "PLK-108", detail: "to In Review", at: daysFromNow(0) },
  { id: "a2", who: "u_tee", verb: "commented on", target: "PLK-119", detail: "", at: daysFromNow(0) },
  { id: "a3", who: "u_max", verb: "completed", target: "PLK-101", detail: "", at: daysFromNow(0) },
];
