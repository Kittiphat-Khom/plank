import './members.css';
import { createPortal } from 'react-dom';
import { usePlank } from '../../providers/PlankProvider';
import { usePermissions, ROLE_LABEL, ROLE_COLOR, ALL_ROLES } from '../../hooks/usePermissions';
import { Avatar, Icon } from '../Global';


function RoleControl({ member, perms, onRoleChange }) {
  const role = member.role || 'member';
  const isMe = member.id === 'u_you';
  const canEdit = !isMe && perms.canManageMembers && perms.canAssignRole(role);

  if (!canEdit) {
    return (
      <span className="role-badge" style={{ '--role-color': ROLE_COLOR[role] }}>
        {ROLE_LABEL[role]}
      </span>
    );
  }

  return (
    <select
      className="role-select"
      value={role}
      style={{ '--role-color': ROLE_COLOR[role] }}
      onChange={(e) => onRoleChange(member.id, e.target.value)}
    >
      {perms.assignableRoles.map((r) => (
        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
      ))}
    </select>
  );
}


function MemberRow({ member, perms, onRoleChange }) {
  return (
    <div className="member-row">
      <Avatar member={member} size={34} />
      <div className="member-row__info">
        <span className="member-row__name">
          {member.name}
          {member.you && <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}> (you)</span>}
        </span>
        <span className="member-row__handle">@{member.handle}</span>
      </div>
      <RoleControl member={member} perms={perms} onRoleChange={onRoleChange} />
    </div>
  );
}


export function MembersPanel({ onClose }) {
  const { MEMBERS, updateMemberRole } = usePlank();
  const perms = usePermissions();

  const me     = MEMBERS.find((m) => m.id === 'u_you');
  const others = MEMBERS.filter((m) => m.id !== 'u_you');

  const handleRoleChange = async (memberId, newRole) => {
    await updateMemberRole(memberId, newRole);
  };

  return createPortal(
    <div className="members-backdrop" onClick={onClose}>
      <div className="members-panel" onClick={(e) => e.stopPropagation()}>
        <div className="members-panel__header">
          <span className="members-panel__title">Workspace members</span>
          <button className="members-panel__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="members-panel__body">
          <div className="members-panel__section-label">You</div>
          {me && <MemberRow member={me} perms={perms} onRoleChange={handleRoleChange} />}

          {others.length > 0 && (
            <>
              <div className="members-panel__section-label" style={{ marginTop: 8 }}>Team</div>
              {others.map((m) => (
                <MemberRow key={m.id} member={m} perms={perms} onRoleChange={handleRoleChange} />
              ))}
            </>
          )}
        </div>


        <div className="members-panel__legend">
          {ALL_ROLES.map((r) => (
            <div key={r} className="legend-item">
              <span className="legend-dot" style={{ background: ROLE_COLOR[r] }} />
              {ROLE_LABEL[r]}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
