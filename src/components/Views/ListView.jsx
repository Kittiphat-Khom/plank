import { useMemo, useState } from 'react';
import { usePlank } from '../../providers/PlankProvider';
import { usePresence } from '../../providers/PresenceProvider';
import { useFilteredCards } from '../../hooks/useFilteredCards';
import { dueInfo } from '../../helpers';
import { LabelChip, DueBadge, AvatarStack, PriorityFlag, PRIORITY } from '../Global';


function ListRow({ card, onOpen }) {
  const { memberById, labelById, colById } = usePlank();
  const { flash } = usePresence();

  const assignees = card.assignees.map((id) => memberById[id]).filter(Boolean);
  const labels    = card.labels.map((id) => labelById[id]).filter(Boolean);
  const col       = colById[card.columnId];
  const isFlashing = !!flash[card.id];

  return (
    <div
      onClick={() => onOpen(card.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 14px",
        borderRadius: 9,
        cursor: "pointer",
        border: "1px solid var(--border)",
        background:  isFlashing ? "var(--accent-soft)" : "var(--surface)",
        animation:   isFlashing ? "flash-bg 1.2s" : "none",
        transition: "background .2s, border-color .15s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-strong)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
    >
      <PriorityFlag level={card.priority} />
      <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", width: 58, flexShrink: 0 }}>
        {card.key}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {card.title}
      </span>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {labels.slice(0, 2).map((l) => <LabelChip key={l.id} label={l} />)}
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", flexShrink: 0, width: 96 }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: col.accent }} />
        {col.name}
      </span>
      <div style={{ width: 70, flexShrink: 0 }}>
        {card.due && <DueBadge iso={card.due} />}
      </div>
      <div style={{ width: 78, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
        {assignees.length > 0 && <AvatarStack members={assignees} size={24} max={3} />}
      </div>
    </div>
  );
}


function GroupHeader({ label, color, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "0 4px" }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>{count}</span>
    </div>
  );
}


const SORT_OPTIONS = [
  { id: "due",     label: "Due date" },
  { id: "created", label: "Created" },
];

function sortCards(cards, sortBy) {
  return [...cards].sort((a, b) => {
    if (sortBy === "due") {

      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    }

    return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
  });
}

export function ListView({ filterFn, groupBy, onOpen }) {
  const cards = useFilteredCards(filterFn);
  const { memberById, labelById } = usePlank();
  const [sortBy, setSortBy] = useState("due");

  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All tasks", color: "var(--text-faint)", cards }];
    }
    const map = new Map();
    const push = (k, label, color, card) => {
      if (!map.has(k)) map.set(k, { key: k, label, color, cards: [] });
      map.get(k).cards.push(card);
    };
    cards.forEach((c) => {
      if (groupBy === "assignee") {
        if (!c.assignees.length) push("none", "Unassigned", "var(--text-faint)", c);
        else c.assignees.forEach((a) => push(a, memberById[a]?.name, memberById[a]?.color, c));
      } else if (groupBy === "label") {
        if (!c.labels.length) push("none", "No label", "var(--text-faint)", c);
        else c.labels.forEach((l) => push(l, labelById[l]?.name, labelById[l]?.color, c));
      } else if (groupBy === "priority") {
        const p = PRIORITY[c.priority];
        push(c.priority, p.label, p.color, c);
      } else if (groupBy === "due") {
        const info = dueInfo(c.due);
        const k    = !info ? "none"
          : info.tone === "over"   ? "over"
          : info.days <= 1         ? "soon"
          : info.days <= 7         ? "week"
          : "later";
        const LABELS = { none: "No date", over: "Overdue", soon: "Due soon", week: "This week", later: "Later" };
        push(k, LABELS[k], "var(--text-faint)", c);
      }
    });
    return [...map.values()];
  }, [cards, groupBy, memberById, labelById]);

  const sortedGroups = useMemo(() =>
    groups.map((g) => ({ ...g, cards: sortCards(g.cards, sortBy) })),
  [groups, sortBy]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 40px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>


        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 500 }}>Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              style={{
                fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                border: "1px solid",
                borderColor: sortBy === opt.id ? "var(--accent)" : "var(--border)",
                background: sortBy === opt.id ? "var(--accent-soft)" : "transparent",
                color: sortBy === opt.id ? "var(--accent-text)" : "var(--text-faint)",
                cursor: "pointer", transition: "all .12s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {sortedGroups.map((g) => (
          <div key={g.key}>
            <GroupHeader label={g.label} color={g.color} count={g.cards.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {g.cards.map((c) => <ListRow key={c.id + g.key} card={c} onOpen={onOpen} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
