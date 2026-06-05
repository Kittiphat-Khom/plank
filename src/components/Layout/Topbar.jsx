import './topbar.css';
import { useState, useRef } from 'react';
import { usePlank } from '../../providers/PlankProvider';
import { usePresence } from '../../providers/PresenceProvider';
import { Icon, AvatarStack, LabelChip, PriorityFlag, PRIORITY, IconButton, Avatar, Popover, PickerItem } from '../Global';

const VIEWS = [
  { id: "kanban",   label: "Board",    icon: "kanban" },
  { id: "list",     label: "List",     icon: "list" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "timeline", label: "Timeline", icon: "timeline" },
];

const GROUP_OPTS = [
  ["none",     "No grouping"],
  ["assignee", "Assignee"],
  ["label",    "Label"],
  ["priority", "Priority"],
  ["due",      "Due date"],
];

const DUE_OPTS = [
  ["any",     "Any time"],
  ["overdue", "Overdue"],
  ["today",   "Due today"],
  ["week",    "Next 7 days"],
];

// ── View Switcher ─────────────────────────────────────────────
function ViewSwitcher({ view, setView }) {
  return (
    <div className="view-switcher">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => setView(v.id)}
          title={v.label}
          data-active={view === v.id ? "true" : undefined}
          className="view-switcher__btn"
        >
          <Icon name={v.icon} size={15} />
          <span className="view-label">{v.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Filter Popover ────────────────────────────────────────────
function FilterPopover({ filters, setFilters }) {
  const { projectMembers, LABELS } = usePlank();
  const ref   = useRef();
  const [open, setOpen] = useState(false);

  const count = filters.assignees.size + filters.labels.size + filters.priority.size + (filters.due !== "any" ? 1 : 0);

  const toggleSet = (key, id) => setFilters((f) => {
    const ns = new Set(f[key]);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    return { ...f, [key]: ns };
  });

  return (
    <>
      <button
        ref={ref}
        onClick={() => setOpen(!open)}
        data-active={count > 0 ? "true" : undefined}
        className="filter-btn"
      >
        <Icon name="filter" size={14} fill={count > 0} />
        Filter
        {count > 0 && (
          <span className="filter-btn__badge">{count}</span>
        )}
      </button>

      <Popover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={250}>
        <div className="filter-popover">
          <div className="filter-section-label">Assignee</div>
          {projectMembers.map((m) => (
            <PickerItem key={m.id} active={filters.assignees.has(m.id)} onClick={() => toggleSet("assignees", m.id)}>
              <Avatar member={m} size={20} /> {m.name}
            </PickerItem>
          ))}

          <div className="filter-section-label">Label</div>
          <div className="filter-label-row">
            {LABELS.map((l) => (
              <button
                key={l.id}
                className="filter-label-btn"
                style={{ opacity: filters.labels.size && !filters.labels.has(l.id) ? 0.4 : 1 }}
                onClick={() => toggleSet("labels", l.id)}
              >
                <LabelChip label={l} />
              </button>
            ))}
          </div>

          <div className="filter-section-label">Priority</div>
          <div className="filter-priority-row">
            {["urgent", "high", "med", "low"].map((p) => (
              <button
                key={p}
                className="filter-priority-btn"
                data-active={filters.priority.has(p) ? "true" : undefined}
                style={{ '--pc': PRIORITY[p].color }}
                onClick={() => toggleSet("priority", p)}
              >
                <PriorityFlag level={p} />
              </button>
            ))}
          </div>

          <div className="filter-section-label">Due</div>
          <div className="filter-due-list">
            {DUE_OPTS.map(([k, lbl]) => (
              <PickerItem key={k} active={filters.due === k} onClick={() => setFilters((f) => ({ ...f, due: k }))}>
                {lbl}
              </PickerItem>
            ))}
          </div>

          {count > 0 && (
            <button
              className="filter-clear-btn"
              onClick={() => setFilters({ assignees: new Set(), labels: new Set(), priority: new Set(), due: "any" })}
            >
              Clear all filters
            </button>
          )}
        </div>
      </Popover>
    </>
  );
}

// ── Topbar ────────────────────────────────────────────────────
export function Topbar({ view, setView, filters, setFilters, groupBy, setGroupBy, onOpenCmd, onToggleActivity, activityOpen, onToggleMenu, onNewCard, onShare, isGuest, onSignIn }) {
  const presence = usePresence();
  const { project } = usePlank();
  const groupRef = useRef();
  const [groupOpen, setGroupOpen] = useState(false);

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onToggleMenu} aria-label="Open menu">
        <Icon name="list" size={18} />
      </button>

      <div className="topbar__title-group">
        <div className="topbar__title-row">
          <h1 className="topbar__title">{project?.name ?? '—'}</h1>
        </div>
      </div>

      <div className="topbar__view-wrap">
        <ViewSwitcher view={view} setView={setView} />
      </div>

      <div className="topbar__spacer" />

      <button onClick={onOpenCmd} className="topbar__search">
        <Icon name="search" size={14} />
        <span className="topbar__search-label">Search…</span>
      </button>

      {view === "list" && (
        <>
          <button
            ref={groupRef}
            onClick={() => setGroupOpen(!groupOpen)}
            className="group-btn"
          >
            <Icon name="grid" size={14} />
            Group: {GROUP_OPTS.find((g) => g[0] === groupBy)[1]}
          </button>
          <Popover anchorRef={groupRef} open={groupOpen} onClose={() => setGroupOpen(false)} width={180}>
            {GROUP_OPTS.map(([k, lbl]) => (
              <PickerItem key={k} active={groupBy === k} onClick={() => { setGroupBy(k); setGroupOpen(false); }}>
                {lbl}
              </PickerItem>
            ))}
          </Popover>
        </>
      )}

      <FilterPopover filters={filters} setFilters={setFilters} />

      <div className="topbar__divider" />

      <IconButton name="bell" title="Activity feed" active={activityOpen} onClick={onToggleActivity} />

      {isGuest && (
        <button
          onClick={onSignIn}
          className="topbar__guest-btn"
          title="Sign in to edit this workspace"
        >
          Guest viewer
        </button>
      )}

      <button onClick={onShare} className="topbar__share-btn" title="Invite members">
        <Icon name="user" size={14} />
        <span>Share</span>
      </button>

      <button onClick={onNewCard} className="topbar__new-btn">
        <Icon name="plus" size={15} stroke={2.5} />
        <span className="new-label">New</span>
      </button>
    </header>
  );
}
