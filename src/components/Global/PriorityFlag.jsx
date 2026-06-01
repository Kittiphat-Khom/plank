export const PRIORITY = {
  urgent: { label: "Urgent", color: "var(--c-red)" },
  high:   { label: "High",   color: "var(--c-orange)" },
  med:    { label: "Medium", color: "var(--c-blue)" },
  low:    { label: "Low",    color: "var(--c-gray)" },
};

export function PriorityFlag({ level, withLabel = false }) {
  const p = PRIORITY[level] || PRIORITY.med;
  return (
    <span
      title={`${p.label} priority`}
      className="priority-flag"
      style={{ '--color-priority': p.color }}
    >
      <span className="priority-bars" data-level={level}>
        {[0, 1, 2].map((i) => <span key={i} className="priority-bar" />)}
      </span>
      {withLabel && <span className="priority-flag__label">{p.label}</span>}
    </span>
  );
}
