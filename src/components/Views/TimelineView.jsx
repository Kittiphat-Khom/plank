import { usePlank } from '../../providers/PlankProvider';
import { useFilteredCards } from '../../hooks/useFilteredCards';
import { Avatar } from '../Global';

const DAY_W = 30;
const WEEKS  = 8;
const TOTAL_DAYS = WEEKS * 7;
const DAY_MS = 86400000;

function getStartDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - 7);
  return { today, start };
}

export function TimelineView({ filterFn, onOpen }) {
  const cards = useFilteredCards(filterFn).filter((c) => c.due);
  const { memberById, colById, COLUMNS } = usePlank();

  const { today, start } = getStartDate();
  const lanes  = COLUMNS.map((col) => ({ col, cards: cards.filter((c) => c.columnId === col.id) }));
  const xFor   = (iso) => ((new Date(iso).setHours(0, 0, 0, 0) - start.getTime()) / DAY_MS) * DAY_W;
  const todayX = 200 + ((today.getTime() - start.getTime()) / DAY_MS) * DAY_W;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "16px 0 24px" }}>
      <div style={{ minWidth: TOTAL_DAYS * DAY_W + 240, padding: "0 24px" }}>


        <div style={{ display: "flex", marginLeft: 200, position: "sticky", top: 0, zIndex: 2, background: "var(--bg)" }}>
          {Array.from({ length: WEEKS }).map((_, w) => {
            const d = new Date(start.getTime() + w * 7 * DAY_MS);
            return (
              <div
                key={w}
                style={{
                  width: DAY_W * 7,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--text-faint)",
                  padding: "4px 6px",
                  borderLeft: "1px solid var(--border)",
                }}
              >
                {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            );
          })}
        </div>

        <div style={{ position: "relative" }}>

          <div style={{ position: "absolute", left: todayX, top: 0, bottom: 0, width: 2, background: "var(--accent)", zIndex: 1, opacity: 0.7 }}>
            <span style={{ position: "absolute", top: -2, left: -18, fontSize: 9.5, fontWeight: 700, color: "var(--accent)", background: "var(--bg)", padding: "0 3px" }}>
              today
            </span>
          </div>


          {lanes.map((lane) => (
            <div key={lane.col.id} style={{ display: "flex", alignItems: "stretch", borderTop: "1px solid var(--border)", minHeight: 44 }}>

              <div style={{
                width: 200,
                flexShrink: 0,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 7,
                position: "sticky",
                left: 0,
                background: "var(--bg)",
                zIndex: 1,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: lane.col.accent }} />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{lane.col.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{lane.cards.length}</span>
              </div>


              <div style={{ flex: 1, position: "relative", padding: "6px 0" }}>
                {lane.cards.map((c) => {
                  const end  = xFor(c.due);
                  const w    = Math.max(70, (c.points || 3) * DAY_W * 0.9);
                  const left = Math.max(0, end - w);
                  return (
                    <div
                      key={c.id}
                      onClick={() => onOpen(c.id)}
                      title={c.title}
                      style={{
                        position: "relative",
                        marginBottom: 4,
                        marginLeft: left,
                        width: w,
                        height: 26,
                        borderRadius: 7,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 8px",
                        overflow: "hidden",
                        background: `color-mix(in oklch, ${colById[c.columnId]?.accent} 16%, var(--surface))`,
                        border:     `1px solid color-mix(in oklch, ${colById[c.columnId]?.accent} 40%, transparent)`,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)" }}>
                        {c.title}
                      </span>
                      {c.assignees[0] && (
                        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                          <Avatar member={memberById[c.assignees[0]]} size={18} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {!lane.cards.length && (
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", padding: "8px 4px" }}>—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
