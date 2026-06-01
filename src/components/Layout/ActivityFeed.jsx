import { usePlank } from '../../providers/PlankProvider';
import { relTime } from '../../helpers';
import { Icon, IconButton, Avatar } from '../Global';

const VERB_COLOR = {
  moved:       "var(--c-blue)",
  created:     "var(--c-green)",
  commented:   "var(--c-purple)",
  completed:   "var(--c-green)",
  deleted:     "var(--c-red)",
};

const S = {
  aside: {
    flexShrink: 0,
    background: "var(--bg-sunken)",
    overflow: "hidden",
    transition: "width .22s ease",
    display: "flex",
    flexDirection: "column",
  },
  inner: {
    width: 300,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 16px",
    borderBottom: "1px solid var(--border)",
  },
  title: {
    fontWeight: 700,
    fontSize: 13.5,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--c-green)",
    animation: "pulse-ring 2s infinite",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 14px",
  },
  row: {
    display: "flex",
    gap: 10,
    padding: "8px 0",
    animation: "slide-up .3s",
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowText: {
    fontSize: 12.5,
    lineHeight: 1.45,
    color: "var(--text)",
  },
  rowTime: {
    fontSize: 11,
    color: "var(--text-faint)",
    marginTop: 1,
  },
};

export function ActivityFeed({ open, onClose, onClear }) {
  const { state, memberById, clearActivity } = usePlank();

  return (
    <aside
      className="activity-col"
      style={{
        ...S.aside,
        width: open ? 300 : 0,
        borderLeft: open ? "1px solid var(--border)" : "none",
      }}
    >
      <div style={S.inner}>
        <div style={S.header}>
          <Icon name="timeline" size={16} />
          <span style={S.title}>Activity</span>
          <span style={S.liveIndicator} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <IconButton name="trash" size={15} onClick={onClear} title="Clear activity" />
            <IconButton name="close" size={16} onClick={onClose} title="Close" />
          </div>
        </div>

        <div style={S.list}>
          {state.activity.map((a) => {
            const who = memberById[a.who];
            const vk  = a.verb.split(" ")[0];
            return (
              <div key={a.id} style={S.row}>
                <Avatar member={who} size={26} />
                <div style={S.rowContent}>
                  <div style={S.rowText}>
                    <b style={{ fontWeight: 700 }}>{who?.name.split(" ")[0]}</b>{" "}
                    <span style={{ color: "var(--text-muted)" }}>{a.verb}</span>{" "}
                    <span
                      className="mono"
                      style={{ fontSize: 11, fontWeight: 600, color: VERB_COLOR[vk] || "var(--text)" }}
                    >
                      {a.target}
                    </span>{" "}
                    {a.detail && <span style={{ color: "var(--text-muted)" }}>{a.detail}</span>}
                  </div>
                  <div style={S.rowTime}>{relTime(a.at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
