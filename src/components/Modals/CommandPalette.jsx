import { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlank } from '../../providers/PlankProvider';
import { fuzzy } from '../../helpers';
import { Icon } from '../Global';

const S = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9800,
    background: "oklch(0.2 0.02 264 / 0.35)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "12vh",
    animation: "fade-in .12s",
  },
  panel: {
    width: "min(620px, 92%)",
    background: "var(--surface)",
    borderRadius: "var(--r-xl)",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--border)",
    overflow: "hidden",
    animation: "pop-in .16s ease-out",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "15px 18px",
    borderBottom: "1px solid var(--border)",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 15.5,
    fontWeight: 500,
  },
  list: {
    maxHeight: 380,
    overflowY: "auto",
    padding: 8,
  },
  emptyState: {
    padding: "26px",
    textAlign: "center",
    color: "var(--text-faint)",
    fontSize: 13.5,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "9px 16px",
    borderTop: "1px solid var(--border)",
    fontSize: 11.5,
    color: "var(--text-faint)",
  },
};

function ResultItem({ item, selected, onMouseMove, onClick, colById }) {
  const isCard = item.kind === "card";
  return (
    <button
      data-i={item._idx}
      onMouseMove={onMouseMove}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        padding: "9px 11px",
        borderRadius: 9,
        textAlign: "left",
        background:  selected ? "var(--accent-soft)" : "transparent",
        transition: "background .1s",
      }}
    >
      <span style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: isCard ? "var(--surface-hover)" : "var(--accent-soft)",
        color:      isCard ? "var(--text-muted)"    : "var(--accent-text)",
      }}>
        <Icon name={isCard ? "kanban" : (item.icon || "command")} size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title}
        </div>
        {isCard && (
          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {item.key} · {colById[item.card.columnId]?.name}
          </div>
        )}
        {!isCard && item.hint && (
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{item.hint}</div>
        )}
      </div>
      {!isCard && item.shortcut && (
        <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)", background: "var(--surface-hover)", padding: "2px 6px", borderRadius: 5 }}>
          {item.shortcut}
        </span>
      )}
      {selected && <Icon name="arrowRight" size={15} style={{ color: "var(--accent)" }} />}
    </button>
  );
}

export function CommandPalette({ open, onClose, actions, onOpenCard }) {
  const { state, colById } = usePlank();
  const [q, setQ]     = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef();
  const listRef  = useRef();

  useEffect(() => {
    if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const cards = useMemo(() => Object.values(state.byId), [state.byId]);

  const items = useMemo(() => {
    const acts      = actions.map((a) => ({ ...a, kind: "action" }));
    const cardItems = cards.map((c) => ({ id: c.id, kind: "card", title: c.title, key: c.key, card: c }));
    if (!q.trim()) return [...acts, ...cardItems.slice(0, 6)];
    const scored = [];
    acts.forEach((a)      => { const s = fuzzy(q, a.title + " " + (a.hint || ""));   if (s >= 0) scored.push({ item: a, s: s + 5 }); });
    cardItems.forEach((c) => { const s = Math.max(fuzzy(q, c.title), fuzzy(q, c.key) + 8); if (s >= 0) scored.push({ item: c, s }); });
    return scored.sort((a, b) => b.s - a.s).slice(0, 12).map((x) => x.item);
  }, [q, actions, cards]);

  useEffect(() => { setSel(0); }, [q]);

  const run = (it) => {
    if (!it) return;
    it.kind === "action" ? it.run() : onOpenCard(it.id);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if      (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)); }
      else if (e.key === "ArrowUp")   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
      else if (e.key === "Enter")     { e.preventDefault(); run(items[sel]); }
      else if (e.key === "Escape")    { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items, sel]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  return createPortal(
    <div onClick={onClose} style={S.backdrop}>
      <div onClick={(e) => e.stopPropagation()} style={S.panel}>
        <div style={S.searchRow}>
          <Icon name="search" size={18} style={{ color: "var(--text-faint)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks or type a command…"
            style={S.input}
          />
          <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", background: "var(--surface-hover)", padding: "2px 6px", borderRadius: 5 }}>
            ESC
          </span>
        </div>

        <div ref={listRef} style={S.list}>
          {items.length === 0 && <div style={S.emptyState}>No results for "{q}"</div>}
          {items.map((it, i) => (
            <ResultItem
              key={it.kind + it.id + i}
              item={{ ...it, _idx: i }}
              selected={sel === i}
              onMouseMove={() => setSel(i)}
              onClick={() => run(it)}
              colById={colById}
            />
          ))}
        </div>

        <div style={S.footer}>
          <span><b className="mono">↑↓</b> navigate</span>
          <span><b className="mono">↵</b> select</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="sparkles" size={12} /> Plank command bar
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
