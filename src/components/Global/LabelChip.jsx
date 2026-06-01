export function LabelChip({ label, dot = false }) {
  if (!label) return null;

  if (dot) {
    return (
      <span
        title={label.name}
        className="label-dot"
        style={{ '--lc': label.color }}
      />
    );
  }

  return (
    <span className="label-chip" style={{ '--lc': label.color }}>
      <span className="label-chip__dot" />
      {label.name}
    </span>
  );
}
