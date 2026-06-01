import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlank } from '../../providers/PlankProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { showToast } from '../../lib/toast';
import { relTime } from '../../helpers';
import { Icon, Avatar, AvatarStack, LabelChip, PriorityFlag, PRIORITY, Popover, PickerItem } from '../Global';

// ── Style constants ───────────────────────────────────────────
const S = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 8000,
    background: "oklch(0.2 0.02 264 / 0.42)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    overflowY: "auto",
    animation: "fade-in .15s",
  },
  modal: {
    width: "min(1100px, 100%)",
    background: "var(--bg)",
    borderRadius: "var(--r-xl)",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--border)",
    animation: "pop-in .2s ease-out",
    display: "flex",
    flexDirection: "column",
    maxHeight: "88vh",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 18px 12px",
    borderBottom: "1px solid var(--border)",
  },
  body: {
    display: "grid",
    gridTemplateColumns: "1fr 240px 260px",
    gap: 0,
    overflow: "hidden",
    flex: 1,
  },
  main: {
    padding: "16px 18px",
    overflowY: "auto",
  },
  sidebar: {
    borderLeft: "1px solid var(--border)",
    background: "var(--surface-2)",
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  titleInput: {
    width: "100%",
    border: "none",
    outline: "none",
    resize: "none",
    background: "transparent",
    fontSize: 20,
    fontWeight: 750,
    letterSpacing: "-0.02em",
    lineHeight: 1.25,
    marginBottom: 14,
    fontFamily: "inherit",
    overflow: "hidden",
  },
  descInput: {
    width: "100%",
    border: "1px solid var(--border)",
    outline: "none",
    resize: "none",
    background: "var(--surface)",
    fontSize: 13.5,
    lineHeight: 1.55,
    borderRadius: "var(--r-md)",
    padding: 10,
    marginBottom: 18,
  },
  aiPanel: {
    border: "1px solid var(--accent-soft-border)",
    background: "linear-gradient(180deg, var(--accent-soft), transparent)",
    borderRadius: "var(--r-md)",
    padding: 12,
    marginTop: 4,
  },
  subtaskRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "5px 6px",
    borderRadius: 7,
  },
  subtaskInput: {
    flex: 1,
    border: "1px solid var(--border)",
    borderRadius: 7,
    padding: "6px 9px",
    outline: "none",
    fontSize: 13,
    background: "var(--surface)",
  },
  commentList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  fieldRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "7px 0",
  },
  fieldLabel: {
    width: 84,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-faint)",
    paddingTop: 5,
  },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 9px",
    borderRadius: 7,
    color: "var(--c-red)",
    fontSize: 13,
    fontWeight: 600,
    width: "100%",
  },
};

// ── Field Row ─────────────────────────────────────────────────
function FieldRow({ label, children }) {
  return (
    <div style={{ paddingBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────
function SectionLabel({ icon, text, inline }) {
  return (
    <div style={{
      display: inline ? "inline-flex" : "flex",
      alignItems: "center",
      gap: 7,
      color: "var(--text-muted)",
      fontSize: 12.5,
      fontWeight: 700,
      letterSpacing: "0.01em",
    }}>
      <Icon name={icon} size={15} /> {text}
    </div>
  );
}

// ── Comment Composer ──────────────────────────────────────────
function CommentComposer({ onSubmit, projectMembers, disabled }) {
  const { MEMBERS } = usePlank();
  const mentionPool = projectMembers?.length ? projectMembers : [];
  const [text, setText]   = useState("");
  const [mention, setMention] = useState(null);
  const ref = useRef();
  const wrapRef = useRef();
  const [dropPos, setDropPos] = useState(null);

  const onChange = (e) => {
    const v = e.target.value;
    setText(v);
    const m = v.slice(0, e.target.selectionStart).match(/@(\w*)$/);
    if (m) {
      setMention({ query: m[1].toLowerCase(), start: e.target.selectionStart - m[1].length - 1 });
      if (wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect();
        setDropPos({ left: r.left + 37, bottom: window.innerHeight - r.top + 4 });
      }
    } else {
      setMention(null);
      setDropPos(null);
    }
  };

  const choose = (mem) => {
    const nv = `${text.slice(0, mention.start)}@${mem.handle} ${text.slice(ref.current.selectionStart)}`;
    setText(nv);
    setMention(null);
    requestAnimationFrame(() => ref.current.focus());
  };

  const matches = mention
    ? mentionPool.filter((m) => m.handle?.includes(mention.query) || m.name?.toLowerCase().includes(mention.query)).slice(0, 5)
    : [];

  const submit = () => { const t = text.trim(); if (t) { onSubmit(t); setText(""); } };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <Avatar member={MEMBERS[0]} size={28} />
        <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 8 }}>
          <textarea
            ref={ref}
            value={text}
            readOnly={disabled}
            onChange={disabled ? undefined : onChange}
            onKeyDown={(e) => { if (!disabled && e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
            placeholder={disabled ? "View only — no commenting" : "Write a comment…  use @ to mention, ⌘↵ to send"}
            rows={2}
            style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 13.5, lineHeight: 1.45, color: disabled ? "var(--text-faint)" : "inherit" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              onClick={submit}
              disabled={!text.trim() || disabled}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 650,
                transition: "background .15s",
                background: text.trim() ? "var(--accent)"       : "var(--surface-hover)",
                color:      text.trim() ? "var(--text-on-accent)" : "var(--text-faint)",
              }}
            >
              <Icon name="send" size={13} /> Comment
            </button>
          </div>
        </div>
      </div>
      {matches.length > 0 && dropPos && createPortal(
        <div style={{
          position: "fixed",
          left: dropPos.left,
          bottom: dropPos.bottom,
          zIndex: 99999,
          width: 300,
          background: "var(--surface)",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border)",
          padding: 5,
        }}>
          {matches.map((m) => (
            <PickerItem key={m.id} onClick={() => choose(m)}>
              <Avatar member={m} size={22} />
              <span>{m.name}</span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-faint)" }}>@{m.handle}</span>
            </PickerItem>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Comment Row ───────────────────────────────────────────────
function CommentRow({ comment, cardId }) {
  const { memberById, MEMBERS, deleteComment, currentUserId } = usePlank();
  const [hovered, setHovered] = useState(false);
  const author  = memberById[comment.author];
  const handles = MEMBERS.map((m) => m.handle);
  const parts   = comment.text.split(/(@\w+)/g);
  const canDelete = comment.author === currentUserId;

  return (
    <div
      style={{ display: "flex", gap: 9, animation: "slide-up .25s ease-out", position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar member={author} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 650 }}>{author?.name}</span>
          <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{relTime(comment.at)}</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 2, color: "var(--text)", textWrap: "pretty" }}>
          {parts.map((p, i) =>
            p[0] === "@" && handles.includes(p.slice(1))
              ? <span key={i} style={{ color: "var(--accent-text)", fontWeight: 650, background: "var(--accent-soft)", borderRadius: 4, padding: "0 3px" }}>{p}</span>
              : <span key={i}>{p}</span>
          )}
        </div>
      </div>
      {canDelete && hovered && (
        <button
          onClick={() => deleteComment(cardId, comment.id)}
          style={{ position: "absolute", top: 0, right: 0, color: "var(--c-red)", display: "flex", padding: 4, borderRadius: 6, background: "var(--surface)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in oklch, var(--c-red) 10%, transparent)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface)"}
        >
          <Icon name="trash" size={13} />
        </button>
      )}
    </div>
  );
}

// ── AI Panel ──────────────────────────────────────────────────
function AiPanel({ card, disabled }) {
  const { setSubtasks, nextId } = usePlank();
  const [busy, setBusy]     = useState(false);
  const [summary, setSummary] = useState("");
  const [mode, setMode]     = useState(null);

  const run = async (kind) => {
    if (disabled) return;
    setBusy(true); setMode(kind); setSummary("");
    const ctx = `Title: ${card.title}\nDescription: ${card.desc || "(none)"}\nLabels: ${card.labels.join(", ")}\nExisting subtasks: ${card.subtasks.map((s) => s.text).join("; ") || "none"}`;
    try {
      if (kind === "summary") {
        setSummary((await window.claude.complete(`You are a concise engineering PM. In 2-3 short sentences, summarize this task card.\n\n${ctx}`)).trim());
      } else {
        const res = await window.claude.complete(`You are an engineering tech lead. Break this task into 3-5 concrete subtasks. Return ONLY a JSON array of short strings.\n\n${ctx}`);
        let arr = [];
        try   { arr = JSON.parse(res.match(/\[[\s\S]*\]/)[0]); }
        catch { arr = res.split("\n").map((s) => s.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 5); }
        const newSubs = arr.map((t, i) => ({ id: nextId("st") + i, text: t, done: false }));
        setSubtasks(card.id, [...card.subtasks, ...newSubs]);
        setSummary(`Added ${newSubs.length} subtasks ✨`);
      }
    } catch {
      if (kind === "summary") {
        setSummary(`"${card.title}" has ${card.subtasks.filter((s) => s.done).length}/${card.subtasks.length} subtasks done. ${card.comments.length} comments.`);
      } else {
        const fb = ["Define acceptance criteria", "Implement core logic", "Add tests for edge cases", "Update docs"]
          .map((t, i) => ({ id: nextId("st") + i, text: t, done: false }));
        setSubtasks(card.id, [...card.subtasks, ...fb]);
        setSummary("Added 4 subtasks ✨");
      }
    }
    setBusy(false);
  };

  return (
    <div style={S.aiPanel}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <Icon name="sparkles" size={15} fill style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-text)" }}>Plank AI</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { kind: "summary",  idle: "Summarize card",    busy: "Thinking…" },
          { kind: "subtasks", idle: "Generate subtasks", busy: "Generating…" },
        ].map(({ kind, idle, busy: busyLabel }) => (
          <button
            key={kind}
            onClick={() => run(kind)}
            disabled={busy || disabled}
            style={{
              flex: 1,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: disabled ? "var(--text-faint)" : "var(--text)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {busy && mode === kind ? busyLabel : idle}
          </button>
        ))}
      </div>
      {summary && (
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: "var(--text)", textWrap: "pretty", animation: "fade-in .3s" }}>
          {summary}
        </div>
      )}
    </div>
  );
}

// ── Subtask Progress Bar ──────────────────────────────────────
function SubtaskProgressBar({ done, total }) {
  return (
    <div style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--border-strong)", overflow: "hidden", maxWidth: 160 }}>
      <div style={{
        height: "100%",
        width: `${(done / total) * 100}%`,
        background: done === total ? "var(--c-green)" : "var(--accent)",
        borderRadius: 99,
        transition: "width .3s",
      }} />
    </div>
  );
}

// ── Card Modal ────────────────────────────────────────────────
export function CardModal({ cardId, onClose, draft = false, onCreated }) {
  const perms = usePermissions();
  const plank = usePlank();
  const {
    state, MEMBERS, LABELS, COLUMNS,
    memberById, labelById, colById,
    addCard, updateCard, addComment, toggleSubtask, setSubtasks, moveCard, deleteCard, nextId,
    currentUserId, project,
  } = plank;

  const [projectMemberIds, setProjectMemberIds] = useState(null);
  useEffect(() => {
    if (!project?.id) return;
    import('../../lib/supabase').then(({ supabase: sb }) => {
      sb.from('project_members').select('member_id').eq('project_id', project.id).then(({ data }) => {
        const ids = new Set((data ?? []).map((r) => r.member_id));
        if (project.owner_id) ids.add(project.owner_id);
        setProjectMemberIds(ids);
      });
    });
  }, [project?.id]);

  const projectMembers = MEMBERS.filter((m) =>
    projectMemberIds === null || projectMemberIds.has(m.id)
  );

  // ── Draft state (create mode) ──────────────────────────────
  const [draftTitle,     setDraftTitle]     = useState('');
  const [draftDesc,      setDraftDesc]      = useState('');
  const [draftColId,     setDraftColId]     = useState('c_backlog');
  const [draftPriority,  setDraftPriority]  = useState('med');
  const [draftLabelIds,  setDraftLabelIds]  = useState([]);
  const [draftAssignIds, setDraftAssignIds] = useState([]);
  const [draftDue,       setDraftDue]       = useState('');
  const [draftPoints,    setDraftPoints]    = useState('');
  const [draftSubtasks,  setDraftSubtasks]  = useState([]);
  const [draftImages,    setDraftImages]    = useState([]);
  const [saving,         setSaving]         = useState(false);

  const imageInputRef2 = useRef();

  async function handleDraftCreate() {
    if (!draftTitle.trim() || saving) return;
    setSaving(true);
    const card = await addCard(draftColId, draftTitle.trim(), currentUserId, true);
    if (card) {
      const patch = {};
      if (draftDesc.trim())          patch.desc     = draftDesc.trim();
      if (draftPriority !== 'med')   patch.priority = draftPriority;
      if (draftDue)                  patch.due      = new Date(draftDue).toISOString();
      if (draftPoints)               patch.points   = +draftPoints;
      if (draftImages.length)        patch.images   = draftImages;
      if (Object.keys(patch).length) await updateCard(card.id, patch);
      onCreated?.(card.id);
    } else {
      setSaving(false);
    }
  }

  // ── Edit state ─────────────────────────────────────────────
  const card = draft ? null : state.byId[cardId];
  const [newSub, setNewSub]     = useState("");
  const [pop, setPop]           = useState(null);
  const requireEdit = (fn) => (...args) => {
    if (!perms.canEdit && !draft) { showToast('View only — request member access to edit', 'error'); return; }
    return fn(...args);
  };
  const [titleVal, setTitleVal] = useState(card?.title ?? "");

  const assignRef     = useRef();
  const labelRef      = useRef();
  const statusRef     = useRef();
  const imageInputRef = useRef();

  useEffect(() => { if (card) setTitleVal(card.title); }, [cardId]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !pop) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pop]);

if (!draft && !card) return null;

  // ── Derived (edit mode only) ───────────────────────────────
  const labels    = draft ? (LABELS || []).filter(l => draftLabelIds.includes(l.id))
                          : card.labels.map((id) => labelById[id]).filter(Boolean);
  const assignees = draft ? draftAssignIds.map(id => memberById[id]).filter(Boolean)
                          : card.assignees.map((id) => memberById[id]).filter(Boolean);
  const col       = draft ? (COLUMNS.find(c => c.id === draftColId) || COLUMNS[0])
                          : colById[card.columnId];
  const doneCount = draft ? 0 : card.subtasks.filter((s) => s.done).length;

  const toggleAssignee = draft
    ? (id) => setDraftAssignIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    : (id) => updateCard(card.id, { assignees: card.assignees.includes(id) ? card.assignees.filter((a) => a !== id) : [...card.assignees, id] });
  const toggleLabel = draft
    ? (id) => setDraftLabelIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    : (id) => updateCard(card.id, { labels: card.labels.includes(id) ? card.labels.filter((l) => l !== id) : [...card.labels, id] });
  const addSubtask    = draft
    ? () => { const t = newSub.trim(); if (!t) return; setDraftSubtasks(p => [...p, { id: Date.now(), text: t, done: false }]); setNewSub(""); }
    : () => { const t = newSub.trim(); if (!t) return; setSubtasks(card.id, [...card.subtasks, { id: nextId("st"), text: t, done: false }]); setNewSub(""); };
  const removeSubtask = draft
    ? (sid) => setDraftSubtasks(p => p.filter(s => s.id !== sid))
    : (sid) => setSubtasks(card.id, card.subtasks.filter((s) => s.id !== sid));

  const subtasks = draft ? draftSubtasks : card.subtasks;

  return createPortal(
    <div onClick={onClose} style={S.backdrop}>
      <div onClick={(e) => e.stopPropagation()} style={S.modal}>

{/* Header */}
        <div style={S.modalHeader}>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>{draft ? "New task" : card.key}</span>
          <div style={{ display: "flex", gap: 5 }}>{labels.map((l) => <LabelChip key={l.id} label={l} />)}</div>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", width: 30, height: 30, borderRadius: 8, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Viewer banner */}
        {!perms.canEdit && !draft && (
          <div style={{ margin: '0 0 8px', padding: '8px 14px', background: 'color-mix(in oklch, var(--c-amber) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--c-amber) 25%, transparent)', borderRadius: 8, fontSize: 12.5, color: 'var(--c-amber)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="eye" size={13} /> View only — you need member access to edit
          </div>
        )}

        {/* Body */}
        <div style={S.body} className="modal-grid">

          {/* Main column */}
          <div style={S.main}>
            {draft && <><div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Title</div></>}
            <textarea
              value={draft ? draftTitle : titleVal}
              readOnly={!perms.canEdit && !draft}
              onChange={(e) => draft ? setDraftTitle(e.target.value) : (perms.canEdit && setTitleVal(e.target.value))}
              onBlur={draft ? undefined : () => perms.canEdit && updateCard(card.id, { title: titleVal.trim() || card.title })}
              placeholder={draft ? "Task title…" : undefined}
              rows={1}
              style={{ ...S.titleInput, ...(draft ? { border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 12px', marginBottom: 16, background: 'var(--surface)', overflow: 'hidden', fontSize: 18 } : {}) }}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; if (draft) el.focus(); } }}
            />

            <SectionLabel icon="list" text="Description" />
            <div style={{ height: 8 }} />
            <textarea
              value={draft ? draftDesc : undefined}
              defaultValue={draft ? undefined : card.desc}
              readOnly={!perms.canEdit && !draft}
              onChange={draft ? (e) => setDraftDesc(e.target.value) : undefined}
              onBlur={draft ? undefined : (e) => perms.canEdit && updateCard(card.id, { desc: e.target.value })}
              placeholder="Add a more detailed description…"
              rows={2}
              style={S.descInput}
            />


            <AiPanel card={card} disabled={draft} />

            {/* Subtasks */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                <SectionLabel icon="check" text="Subtasks" inline />
                {subtasks.length > 0 && (
                  <>
                    <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>
                      {doneCount}/{subtasks.length}
                    </span>
                    <SubtaskProgressBar done={doneCount} total={subtasks.length} />
                  </>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {subtasks.map((s) => (
                  <div
                    key={s.id}
                    className="subtask-row"
                    style={S.subtaskRow}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <button
                      onClick={() => toggleSubtask(card.id, s.id)}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border:     s.done ? "none" : "1.6px solid var(--border-strong)",
                        background: s.done ? "var(--c-green)" : "transparent",
                        color: "var(--text-on-accent)",
                        transition: "all .15s",
                      }}
                    >
                      {s.done && <Icon name="check" size={12} stroke={3} />}
                    </button>
                    <span style={{ fontSize: 13.5, flex: 1, color: s.done ? "var(--text-faint)" : "var(--text)", textDecoration: s.done ? "line-through" : "none" }}>
                      {s.text}
                    </span>
                    <button
                      onClick={() => removeSubtask(s.id)}
                      className="subtask-del"
                      style={{ opacity: 0, color: "var(--text-faint)", width: 22, height: 22, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 7, marginTop: 6 }}>
                <input
                  value={newSub}
                  readOnly={!perms.canEdit && !draft}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && perms.canEdit && addSubtask()}
                  placeholder={perms.canEdit || draft ? "Add a subtask…" : "View only"}
                  style={S.subtaskInput}
                />
              </div>
            </div>

          </div>

          {/* Sidebar column */}
          <div style={S.sidebar} className="modal-sidebar">

            {/* Images */}
            <FieldRow label="Images">
              <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => {
                  Array.from(e.target.files || []).forEach((file) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (draft) {
                        setDraftImages((prev) => [...prev, ev.target.result]);
                      } else if (card?.id) {
                        updateCard(card.id, { images: [...(card.images || []), ev.target.result] });
                      }
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }}
              />
              <button
                onClick={requireEdit(() => imageInputRef.current.click())}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "6px 9px", borderRadius: 7, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}
              >
                <Icon name="attach" size={14} /> Add image
              </button>
              {(draft ? draftImages : card?.images ?? []).length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                  {(draft ? draftImages : card.images).map((src, i) => (
                    <div key={i} style={{ position: "relative", borderRadius: "var(--r-md)", overflow: "hidden", aspectRatio: "4/3" }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <button
                        onClick={() => draft
                          ? setDraftImages((prev) => prev.filter((_, j) => j !== i))
                          : updateCard(card.id, { images: card.images.filter((_, j) => j !== i) })
                        }
                        style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: 4, background: "oklch(0 0 0 / 0.55)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </FieldRow>

            {/* Status */}
            <FieldRow label="Status">
              <button
                ref={statusRef}
                onClick={requireEdit(() => setPop(pop === "status" ? null : "status"))}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "6px 9px", borderRadius: 7, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 600 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 3, background: col.accent }} /> {col.name}
                <Icon name="chevronDown" size={14} style={{ marginLeft: "auto", color: "var(--text-faint)" }} />
              </button>
              <Popover anchorRef={statusRef} open={pop === "status"} onClose={() => setPop(null)} width={200}>
                {COLUMNS.map((c) => (
                  <PickerItem key={c.id} active={c.id === (draft ? draftColId : card.columnId)} onClick={() => { draft ? (setDraftColId(c.id), setPop(null)) : (moveCard(card.id, c.id, 0, currentUserId), setPop(null)); }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: c.accent }} /> {c.name}
                  </PickerItem>
                ))}
              </Popover>
            </FieldRow>

            {/* Assignees */}
            <FieldRow label="Assignees">
              <button
                ref={assignRef}
                onClick={requireEdit(() => setPop(pop === "assign" ? null : "assign"))}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "5px 8px", borderRadius: 7, background: "var(--surface)", border: "1px solid var(--border)", minHeight: 32 }}
              >
                {assignees.length
                  ? <AvatarStack members={assignees} size={24} max={4} />
                  : <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>Unassigned</span>
                }
                <Icon name="plus" size={14} style={{ marginLeft: "auto", color: "var(--text-faint)" }} />
              </button>
              <Popover anchorRef={assignRef} open={pop === "assign"} onClose={() => setPop(null)} width={220}>
                {projectMembers.map((m) => (
                  <PickerItem key={m.id} active={draft ? draftAssignIds.includes(m.id) : card.assignees.includes(m.id)} onClick={() => toggleAssignee(m.id)}>
                    <Avatar member={m} size={22} /> {m.name}
                  </PickerItem>
                ))}
              </Popover>
            </FieldRow>

            {/* Labels */}
            <FieldRow label="Labels">
              <button
                ref={labelRef}
                onClick={requireEdit(() => setPop(pop === "label" ? null : "label"))}
                style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, width: "100%", padding: "6px 8px", borderRadius: 7, background: "var(--surface)", border: "1px solid var(--border)", minHeight: 32 }}
              >
                {labels.length
                  ? labels.map((l) => <LabelChip key={l.id} label={l} />)
                  : <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>None</span>
                }
                <Icon name="plus" size={14} style={{ marginLeft: "auto", color: "var(--text-faint)" }} />
              </button>
              <Popover anchorRef={labelRef} open={pop === "label"} onClose={() => setPop(null)} width={210}>
                {LABELS.map((l) => (
                  <PickerItem key={l.id} active={draft ? draftLabelIds.includes(l.id) : card.labels.includes(l.id)} onClick={() => toggleLabel(l.id)}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: l.color }} /> {l.name}
                  </PickerItem>
                ))}
              </Popover>
            </FieldRow>

            {/* Priority */}
            <FieldRow label="Priority">
              <div style={{ display: "flex", gap: 4 }}>
                {["low", "med", "high", "urgent"].map((p) => (
                  <button
                    key={p}
                    onClick={requireEdit(() => draft ? setDraftPriority(p) : updateCard(card.id, { priority: p }))}
                    title={PRIORITY[p].label}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      borderRadius: 6,
                      display: "flex",
                      justifyContent: "center",
                      border:      (draft ? draftPriority : card.priority) === p ? `1.5px solid ${PRIORITY[p].color}` : "1px solid var(--border)",
                      background:  (draft ? draftPriority : card.priority) === p ? `color-mix(in oklch, ${PRIORITY[p].color} 12%, var(--surface))` : "var(--surface)",
                    }}
                  >
                    <PriorityFlag level={p} />
                  </button>
                ))}
              </div>
            </FieldRow>

            {/* Due date */}
            <FieldRow label="Due date">
              <input type="date"
                value={draft ? draftDue : undefined}
                defaultValue={draft ? undefined : (card.due ? card.due.slice(0, 10) : "")}
                readOnly={!perms.canEdit && !draft}
                onChange={(e) => { if (!perms.canEdit && !draft) return; draft ? setDraftDue(e.target.value) : updateCard(card.id, { due: e.target.value ? new Date(e.target.value).toISOString() : null }); }}
                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 9px", outline: "none", fontSize: 13, background: "var(--surface)", color: "var(--text)", pointerEvents: (!perms.canEdit && !draft) ? 'none' : 'auto' }}
              />
            </FieldRow>


          </div>

          {/* Comments column */}
          <div style={{ borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".07em" }}>Activity & comments</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
              {!draft && <CommentComposer onSubmit={(t) => addComment(card.id, t, currentUserId)} projectMembers={projectMembers} disabled={!perms.canEdit} />}
              {!draft && card.comments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[...card.comments].reverse().map((c) => <CommentRow key={c.id} comment={c} cardId={card.id} />)}
                </div>
              )}
              {draft && <p style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center", marginTop: 24 }}>Comments available after creating the task</p>}
            </div>
          </div>

        </div>
        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div>
            {!draft && (
              <button
                onClick={requireEdit(() => { deleteCard(card.id); onClose(); })}
                style={S.deleteBtn}
                onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in oklch, var(--c-red) 10%, transparent)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <Icon name="trash" size={15} /> Delete card
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
          {draft && (
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
          )}
          <button
            onClick={draft ? handleDraftCreate : onClose}
            disabled={draft && (!draftTitle.trim() || saving)}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, opacity: draft && (!draftTitle.trim() || saving) ? 0.5 : 1 }}
          >
            {saving
              ? <svg width="13" height="13" viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg>
              : <Icon name="check" size={13} stroke={2.5} />
            }
            {draft ? 'Create task' : 'Done'}
          </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
