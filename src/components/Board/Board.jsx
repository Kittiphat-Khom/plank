import './board.css';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlank } from '../../providers/PlankProvider';
import { usePresence } from '../../providers/PresenceProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { showToast } from '../../lib/toast';
import { Icon } from '../Global';
import { Card } from './Card';

// ── Column Header ─────────────────────────────────────────────
function ColumnHeader({ column, count, wipOver }) {
  return (
    <div className="col__header">
      <span className="col__accent-dot" style={{ background: column.accent }} />
      <span className="col__name">{column.name}</span>
      <span className="col__count">{count}</span>
      {column.wip && (
        <span
          title={`WIP limit: ${column.wip}`}
          className="col__wip"
          data-over={wipOver ? "true" : "false"}
        >
          WIP {count}/{column.wip}
        </span>
      )}
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────
function Column({ column, cardIds, byId, drag, target, onCardPointerDown, onOpenCard, onAddCard, syncing, flash, typing }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const inputRef = useRef();
  const isDropTarget = target?.col === column.id;

  useEffect(() => { if (adding && inputRef.current) inputRef.current.focus(); }, [adding]);

  const commit = () => {
    const t = draft.trim();
    if (t) onAddCard(column.id, t);
    setDraft("");
  };

  const visible = drag ? cardIds.filter((id) => id !== drag.cardId) : cardIds;
  const items   = [];
  visible.forEach((id, i) => {
    if (isDropTarget && target.index === i) items.push({ ph: true });
    items.push({ id });
  });
  if (isDropTarget && target.index >= visible.length) items.push({ ph: true });

  return (
    <section data-col-id={column.id} className="col">
      <ColumnHeader column={column} count={cardIds.length} wipOver={column.wip && cardIds.length > column.wip} />

      <div
        data-col-list
        className="col__list"
        data-drop-target={isDropTarget ? "true" : "false"}
      >
        {items.map((it) =>
          it.ph ? (
            <div
              key="ph"
              className="col__placeholder"
              style={{ height: drag.h }}
            />
          ) : (
            <Card
              key={it.id}
              card={byId[it.id]}
              onOpen={onOpenCard}
              syncing={!!syncing[it.id]}
              flashing={!!flash[it.id]}
              typingMembers={typing[it.id]}
              onPointerDown={(e) => onCardPointerDown(e, it.id, column.id)}
            />
          )
        )}

        {adding ? (
          <div className="col__add-wrap">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
                if (e.key === "Escape") { setAdding(false); setDraft(""); }
              }}
              onBlur={() => { commit(); setAdding(false); }}
              placeholder="What needs doing?"
              rows={2}
              className="col__add-textarea"
            />
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="col__add-btn">
            <Icon name="plus" size={15} /> Add card
          </button>
        )}
      </div>
    </section>
  );
}

// ── Board ─────────────────────────────────────────────────────
export function Board({ onOpenCard, filterFn }) {
  const { state, COLUMNS, moveCard, addCard, currentUserId } = usePlank();
  const presence = usePresence();
  const perms = usePermissions();

  const boardRef  = useRef();
  const ghostRef  = useRef();
  const dragRef   = useRef(null);
  const targetRef = useRef(null);
  const scrollRAF = useRef(0);
  const edgeVel   = useRef(0);

  const [drag, setDrag]     = useState(null);
  const [target, setTarget] = useState(null);

  const filteredByCol = useMemo(() => {
    const out = {};
    COLUMNS.forEach((c) => {
      out[c.id] = state.cardsByCol[c.id].filter((id) => !filterFn || filterFn(state.byId[id]));
    });
    return out;
  }, [state.cardsByCol, state.byId, filterFn]);

  const computeTarget = useCallback((cx, cy) => {
    const cols = boardRef.current.querySelectorAll("[data-col-id]");
    let colEl  = null;
    for (const el of cols) {
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right) { colEl = el; break; }
    }
    if (!colEl) {
      let bestD = Infinity;
      for (const el of cols) {
        const r = el.getBoundingClientRect();
        const d = Math.min(Math.abs(cx - r.left), Math.abs(cx - r.right));
        if (d < bestD) { bestD = d; colEl = el; }
      }
    }
    if (!colEl) return null;

    const list  = colEl.querySelector("[data-col-list]");
    const cards = [...list.querySelectorAll("[data-card-id]")];
    let index   = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (cy < r.top + r.height / 2) { index = i; break; }
    }
    return { col: colEl.getAttribute("data-col-id"), index };
  }, []);

  const onPointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    const cx = e.clientX, cy = e.clientY;
    d.lastX = cx; d.lastY = cy;

    if (!d.started) {
      if (Math.abs(cx - d.startX) + Math.abs(cy - d.startY) < 5) return;
      d.started = true;
      const rect = d.el.getBoundingClientRect();
      d.w = rect.width; d.h = rect.height;
      d.offX = d.startX - rect.left; d.offY = d.startY - rect.top;
      setDrag({ cardId: d.cardId, w: rect.width, h: rect.height });
      document.body.style.cursor = "grabbing";
    }

    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate(${cx - d.offX}px, ${cy - d.offY}px)`;
    }

    const t    = computeTarget(cx, cy);
    const prev = targetRef.current;
    if (!prev || !t || prev.col !== t.col || prev.index !== t.index) {
      targetRef.current = t;
      setTarget(t);
    }

    if (boardRef.current) {
      const br   = boardRef.current.getBoundingClientRect();
      const edge = 90;
      edgeVel.current =
        cx < br.left + edge  ? -Math.min(18, (br.left + edge - cx) / 4) :
        cx > br.right - edge ?  Math.min(18, (cx - (br.right - edge)) / 4) :
        0;
    }
  }, [computeTarget]);

  useEffect(() => {
    if (!drag) return;
    const step = () => {
      if (edgeVel.current && boardRef.current) boardRef.current.scrollLeft += edgeVel.current;
      scrollRAF.current = requestAnimationFrame(step);
    };
    scrollRAF.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(scrollRAF.current);
  }, [drag]);

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    document.body.style.cursor = "";
    edgeVel.current = 0;
    if (d?.started) {
      const t = targetRef.current;
      if (t) moveCard(d.cardId, t.col, t.index, currentUserId);
    }
    dragRef.current   = null;
    targetRef.current = null;
    setDrag(null);
    setTarget(null);
  }, [onPointerMove, moveCard]);

  const onCardPointerDown = useCallback((e, cardId, colId) => {
    if (!perms.canEdit) { showToast('You need member access to move cards', 'error'); return; }
    if (e.button !== 0 || e.target.closest("button, a, input, textarea")) return;
    dragRef.current = {
      cardId, colId,
      el: e.currentTarget,
      startX: e.clientX, startY: e.clientY,
      started: false,
      lastX: e.clientX, lastY: e.clientY,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }, [onPointerMove, endDrag]);

  const ghostCard = drag ? state.byId[drag.cardId] : null;

  return (
    <div ref={boardRef} className="board">
      {COLUMNS.map((col) => (
        <Column
          key={col.id}
          column={col}
          cardIds={filteredByCol[col.id]}
          byId={state.byId}
          drag={drag}
          target={target}
          onCardPointerDown={onCardPointerDown}
          onOpenCard={onOpenCard}
          onAddCard={addCard}
          syncing={state.syncing}
          flash={presence.flash}
          typing={presence.typing}
        />
      ))}

      {drag && ghostCard && createPortal(
        <div ref={ghostRef} className="board__ghost" style={{ width: drag.w }}>
          <Card card={ghostCard} ghost onOpen={() => {}} onPointerDown={() => {}} syncing={false} />
        </div>,
        document.body
      )}
    </div>
  );
}
