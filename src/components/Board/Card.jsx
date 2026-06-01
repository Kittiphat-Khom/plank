import './card.css';
import { usePlank } from '../../providers/PlankProvider';
import { LabelChip, PriorityFlag, DueBadge, Icon, AvatarStack } from '../Global';

function SubtaskProgress({ subtasks }) {
  if (!subtasks?.length) return null;
  const done     = subtasks.filter((s) => s.done).length;
  const pct      = Math.round((done / subtasks.length) * 100);
  const complete = done === subtasks.length;
  return (
    <span
      title={`${done}/${subtasks.length} subtasks`}
      className="subtask-progress"
      data-complete={complete ? "true" : "false"}
    >
      <span className="subtask-progress__bar">
        <span className="subtask-progress__fill" style={{ width: `${pct}%` }} />
      </span>
      {done}/{subtasks.length}
    </span>
  );
}

export function TypingDots() {
  return (
    <span className="typing-dots">
      {[0, 1, 2].map((i) => <span key={i} className="typing-dot" />)}
    </span>
  );
}

export function Card({ card, onOpen, ghost, syncing, flashing, typingMembers, onPointerDown }) {
  const { memberById, labelById } = usePlank();

  const labels    = card.labels.map((id) => labelById[id]).filter(Boolean);
  const assignees = card.assignees.map((id) => memberById[id]).filter(Boolean);
  const showMeta  = card.points != null || card.due || card.subtasks.length > 0
    || card.comments.length > 0 || card.priority === "urgent" || card.priority === "high";

  return (
    <div
      data-card-id={card.id}
      data-ghost={ghost ? "true" : undefined}
      data-flashing={flashing ? "true" : undefined}
      data-priority={card.priority || "med"}
      onPointerDown={onPointerDown}
      onClick={() => { if (!ghost) onOpen(card.id); }}
      className="card"
    >
      {card.cover && (
        <div className="card__cover">
          <img src={card.cover} alt="" />
        </div>
      )}

      {labels.length > 0 && (
        <div className="card__labels">
          {labels.map((l) => <LabelChip key={l.id} label={l} />)}
        </div>
      )}

      <div className="card__title-row">
        {card.priority && (
          <span className="card__title-flag">
            <PriorityFlag level={card.priority} />
          </span>
        )}
        <div className="card__title">{card.title}</div>
      </div>

      {typingMembers?.length > 0 && (
        <div className="card__typing">
          <TypingDots />
          {memberById[typingMembers[0]]?.name.split(" ")[0]} is typing…
        </div>
      )}

      {showMeta && (
        <div className="card__meta">
          {card.due && <DueBadge iso={card.due} />}
          <SubtaskProgress subtasks={card.subtasks} />
          {card.comments.length > 0 && (
            <span className="card__comment-count">
              <Icon name="comment" size={13} stroke={2} />
              {card.comments.length}
            </span>
          )}
          {card.points != null && (
            <span title="Story points" className="card__points">
              {card.points}
            </span>
          )}
        </div>
      )}

      <div className="card__footer">
        <span className="mono card__key">{card.key}</span>
        <div className="card__assignees">
          {assignees.length > 0 && <AvatarStack members={assignees} size={22} max={3} />}
        </div>
      </div>

      {syncing && (
        <div title="Syncing…" className="card__sync">
          <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--accent-soft-border)" strokeWidth="3" />
            <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
