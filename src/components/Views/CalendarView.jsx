import { useState, useMemo } from 'react';
import { usePlank } from '../../providers/PlankProvider';
import { useFilteredCards } from '../../hooks/useFilteredCards';
import { IconButton } from '../Global';

const S = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: 750,
    letterSpacing: "-0.02em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 1,
    background: "var(--border)",
    borderRadius: "var(--r-lg)",
    overflow: "hidden",
    border: "1px solid var(--border)",
    flex: 1,
    minHeight: 520,
  },
  dayHeader: {
    background: "var(--surface-2)",
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-faint)",
    letterSpacing: "0.03em",
  },
};

export function CalendarView({ filterFn, onOpen }) {
  const cards = useFilteredCards(filterFn);
  const { colById, updateCard } = usePlank();

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dragId, setDragId] = useState(null);

  const byDay = useMemo(() => {
    const m = {};
    cards.forEach((c) => {
      if (c.due) {
        const k = c.due.slice(0, 10);
        (m[k] = m[k] || []).push(c);
      }
    });
    return m;
  }, [cards]);

  const startDow    = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells       = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7) cells.push(null);
  const _td = new Date();
  const todayKey = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday   = () => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px", display: "flex", flexDirection: "column" }}>
      <div style={S.header}>
        <h2 style={S.monthTitle}>
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div style={{ display: "flex", gap: 4 }}>
          <IconButton name="chevronRight" style={{ transform: "rotate(180deg)" }} onClick={prevMonth} title="Previous" />
          <IconButton name="chevronRight" onClick={nextMonth} title="Next" />
        </div>
        <button
          onClick={goToday}
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--text-muted)",
            padding: "5px 10px",
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          Today
        </button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-faint)" }}>
          Drag cards between days to reschedule
        </span>
      </div>

      <div style={S.grid}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} style={S.dayHeader}>{d}</div>
        ))}
        {cells.map((date, i) => {
          const key      = date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : null;
          const dayCards = key ? byDay[key] || [] : [];
          const isToday  = key === todayKey;
          return (
            <div
              key={i}
              onDragOver={(e) => { if (dragId) e.preventDefault(); }}
              onDrop={() => {
                if (dragId && key) {
                  updateCard(dragId, { due: new Date(key + "T12:00:00").toISOString() });
                  setDragId(null);
                }
              }}
              style={{
                background: date ? "var(--surface)" : "var(--surface-2)",
                minHeight: 96,
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {date && (
                <div style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color:      isToday ? "var(--text-on-accent)" : "var(--text-muted)",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isToday ? "var(--accent)" : "transparent",
                }}>
                  {date.getDate()}
                </div>
              )}
              {dayCards.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onOpen(c.id)}
                  style={{
                    background:  `color-mix(in oklch, ${colById[c.columnId]?.accent} 12%, var(--surface))`,
                    borderLeft:  `3px solid ${colById[c.columnId]?.accent}`,
                    borderRadius: 5,
                    padding:     "4px 7px",
                    cursor:      "grab",
                    fontSize:    11.5,
                    fontWeight:  600,
                    lineHeight:  1.3,
                    whiteSpace:  "nowrap",
                    overflow:    "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
